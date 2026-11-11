import React, { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { ToastManager } from "./ui/Toast";
import { GlassAlert } from "./ui/GlassAlert";
import { hasCompletedHealthScreening } from "../lib/health-profile";
import {
  registerForPushNotificationsAsync,
  sendLocalNotification,
  checkActiveSessionsAndNotify,
  checkMembershipStatusAndNotify,
} from "../lib/notifications";

export function NotificationListener() {
  const { profile } = useAuth();
  const sessionIntervalRef = useRef<any>(null);
  const [healthPromptVisible, setHealthPromptVisible] = useState(false);
  const healthPromptedForRef = useRef<string | null>(null);

  // Members who never filled in the health screening get a reminder once per app launch
  useEffect(() => {
    if (!profile?.id || profile.role !== "client" || hasCompletedHealthScreening(profile)) return;
    if (healthPromptedForRef.current === profile.id) return;
    healthPromptedForRef.current = profile.id;
    // Short delay so the dashboard is on screen before the alert appears
    const timer = setTimeout(() => setHealthPromptVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [profile?.id, profile?.role, profile?.health_screened_at]);

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

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <>
      <GlassAlert
        visible={healthPromptVisible}
        title="Complete your health details"
        message="Add your age, gender and any health history so your AI workout plans are safe for you. It takes about a minute."
        actions={[
          { text: "Later", style: "cancel", onPress: () => setHealthPromptVisible(false) },
          {
            text: "Fill in now",
            onPress: () => {
              setHealthPromptVisible(false);
              router.push({ pathname: "/client/profile", params: { health: "1" } });
            },
          },
        ]}
        onDismiss={() => setHealthPromptVisible(false)}
      />
      {Platform.OS === "web" ? null : <NotificationTapHandler />}
    </>
  );
}

// Handles taps on push/local banners, including the tap that cold-starts the app
function NotificationTapHandler() {
  const { profile } = useAuth();
  const response = Notifications.useLastNotificationResponse();
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !profile?.role) return;
    const id = response.notification.request.identifier;
    if (handledIdRef.current === id) return;
    handledIdRef.current = id;

    const data = response.notification.request.content.data;
    const rawUrl = data?.actionUrl || data?.action_url;
    const home = profile.role === "admin" ? "/admin/dashboard" : "/client/dashboard";
    // Only follow links inside the user's own area; an admin opening a /client link renders a blank screen
    const target =
      typeof rawUrl === "string" && rawUrl.startsWith(`/${profile.role}/`) ? rawUrl : home;

    // shortcut: fixed delay lets the index <Redirect> settle first; replace with a nav-ready check if taps still misroute
    const timer = setTimeout(() => {
      try {
        router.push(target as any);
      } catch (e) {
        console.warn("[Notifications] Route navigation error:", e);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [response, profile?.role]);

  return null;
}
