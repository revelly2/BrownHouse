// ============================================================================
// Notifications Screen — Swiss Glassmorphic
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Notification as AppNotification } from "../../lib/types";

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", profile.id)
      .order("date_sent", { ascending: false });

    if (data) setNotifications(data as AppNotification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, [profile]);

  const markAllAsRead = async () => {
    if (!profile) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("client_id", profile.id)
      .eq("is_read", false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Card variant="glass" style={[styles.card, !item.is_read && styles.unreadCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!item.is_read && <View style={styles.unreadDot} />}
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.date_sent).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Updates</Text>
        <Text style={styles.pageTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>—</Text>
            </View>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    marginBottom: Spacing.lg,
  },
  backBtnText: {
    color: Colors.light.textTertiary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
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
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  card: {
    marginBottom: Spacing.sm,
  },
  unreadCard: {
    borderColor: "rgba(230, 200, 79, 0.3)",
    backgroundColor: "rgba(230, 200, 79, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  date: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: "500",
  },
  message: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 12 * Typography.lineHeight.normal,
  },
  empty: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyIconText: {
    fontSize: 22,
    color: Colors.light.textTertiary,
    fontWeight: "300",
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    fontWeight: "600",
  },
});
