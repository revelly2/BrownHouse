// ============================================================================
// Notifications Screen — Swiss Glassmorphic with Realtime Sync
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Notification as AppNotification } from "../../lib/types";
import { ToastManager } from "../../components/ui/Toast";
import {
  Bell,
  Calendar,
  Award,
  Sparkles,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCheck,
  ChevronRight,
  Flame,
} from "lucide-react-native";

type FilterType = "all" | "unread" | "bookings" | "memberships" | "workouts";

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("client_id", profile.id)
        .order("date_sent", { ascending: false });

      if (data) setNotifications(data as AppNotification[]);
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!profile?.id) return;

    // Realtime subscription for instant updates
    const channel = supabase
      .channel(`notifications-screen-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `client_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAllAsRead = async () => {
    if (!profile) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("client_id", profile.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      ToastManager.show("All Read", "All notifications marked as read.", "success", 2500);
    } catch (e) {
      console.warn("Error marking all read:", e);
    }
  };

  const markItemAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.warn("Error marking read:", e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("Delete error:", error.message);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      ToastManager.show("Deleted", "Notification removed.", "info", 2000);
    } catch (e) {
      console.warn("Delete failed:", e);
    }
  };

  const clearAllNotifications = () => {
    if (notifications.length === 0) return;

    const doClear = async () => {
      if (!profile) return;
      try {
        await supabase
          .from("notifications")
          .delete()
          .eq("client_id", profile.id);

        setNotifications([]);
        ToastManager.show("Cleared", "All notifications cleared.", "info", 2500);
      } catch (e) {
        console.warn("Clear all failed:", e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete all notifications?")) {
        doClear();
      }
    } else {
      Alert.alert(
        "Clear All Notifications",
        "Are you sure you want to remove all notifications from your inbox?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear All", style: "destructive", onPress: doClear },
        ]
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotificationCategory = (n: AppNotification): "booking" | "membership" | "workout" | "alert" => {
    const text = `${n.title} ${n.message}`.toLowerCase();
    if (text.includes("membership") || text.includes("subscription") || text.includes("enrolled")) {
      return "membership";
    }
    if (text.includes("workout") || text.includes("ai") || text.includes("gemini") || text.includes("plan ready")) {
      return "workout";
    }
    if (text.includes("reservation") || text.includes("booking") || text.includes("session") || text.includes("minutes away") || text.includes("return equipment")) {
      return "booking";
    }
    return "alert";
  };

  const getCategoryMeta = (category: "booking" | "membership" | "workout" | "alert") => {
    switch (category) {
      case "membership":
        return {
          icon: Award,
          color: "#E6C84F",
          label: "Membership",
        };
      case "workout":
        return {
          icon: Sparkles,
          color: "#4ADE80",
          label: "Workout AI",
        };
      case "booking":
        return {
          icon: Calendar,
          color: "#60A5FA",
          label: "Session",
        };
      case "alert":
      default:
        return {
          icon: AlertTriangle,
          color: "#F87171",
          label: "Alert",
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "unread") return !n.is_read;
      if (activeFilter === "all") return true;
      const cat = getNotificationCategory(n);
      if (activeFilter === "bookings") return cat === "booking";
      if (activeFilter === "memberships") return cat === "membership";
      if (activeFilter === "workouts") return cat === "workout";
      return true;
    });
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const handleCardPress = async (item: AppNotification) => {
    if (!item.is_read) {
      await markItemAsRead(item.id);
    }
    if (item.action_url) {
      try {
        router.push(item.action_url as any);
      } catch (e) {
        console.warn("Navigation failed:", e);
      }
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const category = getNotificationCategory(item);
    const meta = getCategoryMeta(category);
    const IconComponent = meta.icon;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleCardPress(item)}
      >
        <Card
          variant="glass"
          style={[
            styles.card,
            !item.is_read && styles.unreadCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}30` },
                ]}
              >
                <IconComponent size={14} color={meta.color} />
              </View>
              <Text style={[styles.categoryBadge, { color: meta.color }]}>
                {meta.label}
              </Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>

            <View style={styles.headerRight}>
              <Text style={styles.date}>{formatRelativeTime(item.date_sent)}</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => deleteNotification(item.id)}
                style={styles.deleteBtn}
              >
                <Trash2 size={13} color="rgba(255, 255, 255, 0.4)" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message}>{item.message}</Text>

          {item.action_url && (
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>View details</Text>
              <ChevronRight size={12} color={Colors.primary} />
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.topActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllAsRead}
                style={styles.actionPill}
              >
                <CheckCheck size={13} color={Colors.primary} />
                <Text style={styles.actionPillText}>Read All</Text>
              </TouchableOpacity>
            )}

            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={clearAllNotifications}
                style={[styles.actionPill, styles.clearPill]}
              >
                <Trash2 size={12} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.clearPillText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.titleRow}>
          <div>
            <Text style={styles.headerLabel}>Live Updates & Alerts</Text>
            <Text style={styles.pageTitle}>Notifications</Text>
          </div>
          {unreadCount > 0 && (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: `Unread (${unreadCount})` },
              { id: "bookings", label: "Sessions" },
              { id: "memberships", label: "Memberships" },
              { id: "workouts", label: "Workouts" },
            ] as const
          ).map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setActiveFilter(chip.id)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Bell size={24} color="rgba(255, 255, 255, 0.3)" />
            </View>
            <Text style={styles.emptyText}>
              {activeFilter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              Booking alerts, session reminders, membership updates, and AI routines will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 4,
    paddingBottom: Spacing.sm,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: Colors.light.textTertiary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(230, 200, 79, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.25)",
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  clearPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  clearPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: Spacing.md,
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "300",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  unreadCountBadge: {
    backgroundColor: "rgba(230, 200, 79, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.3)",
    marginBottom: 4,
  },
  unreadCountText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterChipActive: {
    backgroundColor: "rgba(230, 200, 79, 0.15)",
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing["4xl"],
  },
  card: {
    marginBottom: Spacing.sm + 2,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    backgroundColor: "rgba(20, 20, 24, 0.65)",
  },
  unreadCard: {
    borderColor: "rgba(230, 200, 79, 0.35)",
    backgroundColor: "rgba(230, 200, 79, 0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  date: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 3,
  },
  title: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: "600",
    color: Colors.light.text,
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  unreadTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  message: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  actionText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.light.text,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },
});
