import React, { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { ToastManager } from "./ui/Toast";
import {
  registerForPushNotificationsAsync,
  sendLocalNotification,
  checkActiveSessionsAndNotify,
  checkMembershipStatusAndNotify,
} from "../lib/notifications";

export function NotificationListener() {
  const { profile } = useAuth();
  const sessionIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!profile?.id) return;

    // 1. Register permissions, channels, and push token
    registerForPushNotificationsAsync(profile.id);

    // 2. Perform initial background checks for active sessions & memberships
    checkActiveSessionsAndNotify(profile.id);
    checkMembershipStatusAndNotify(profile.id);

    // 3. Periodic session ticker: checks every 30 seconds for upcoming 5-min start/end marks
    sessionIntervalRef.current = setInterval(() => {
      checkActiveSessionsAndNotify(profile.id);
    }, 30000);

    // 4. Supabase Realtime subscription for incoming notifications
    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `client_id=eq.${profile.id}`,
        },
        async (payload) => {
          const newNotif = payload.new;
          if (newNotif) {
            // Show in-app glassmorphic toast
            ToastManager.show(
              newNotif.title || "New Notification",
              newNotif.message || "",
              "info",
              5000
            );

            // Also trigger local device push banner & sound if on device
            await sendLocalNotification(
              newNotif.title || "Gym Notification",
              newNotif.message || "",
              {
                actionUrl: newNotif.action_url,
                id: newNotif.id,
              }
            );
          }
        }
      )
      .subscribe();

    // 5. Handle tapping on an Expo push/local notification banner
    let responseSubscription: Notifications.Subscription | null = null;
    if (Platform.OS !== "web") {
      try {
        responseSubscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            const targetUrl = data?.actionUrl || data?.action_url;
            if (targetUrl && typeof targetUrl === "string") {
              try {
                router.push(targetUrl as any);
              } catch (e) {
                console.warn("[Notifications] Route navigation error:", e);
              }
            }
          }
        );
      } catch (e) {
        console.warn("[Notifications] Listener subscription error:", e);
      }
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
      supabase.removeChannel(channel);
      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, [profile?.id]);

  return null;
}
