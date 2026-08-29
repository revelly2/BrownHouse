import React, { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { ToastManager } from "./ui/Toast";

export function NotificationListener() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `client_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new;
          if (newNotif) {
            ToastManager.show(
              newNotif.title || "New Notification",
              newNotif.message || "",
              "info",
              5000
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return null;
}
