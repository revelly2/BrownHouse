// ============================================================================
// Admin Reservations Management — Glassmorphic Design
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatTime } from "../../lib/utils";
import { Reservation } from "../../lib/types";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

interface ReservationDetail extends Reservation {
  profiles?: { first_name: string | null; last_name: string | null };
  equipment?: { name: string; type: string };
}

export default function ReservationsManageScreen() {
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = async () => {
    // 1. Fetch reservations without joining profiles to see if the join was filtering rows
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment:equipment_id(name, type)")
      .order("reservation_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error.message);
      if (Platform.OS === "web") window.alert(`Fetch Error: ${error.message}`);
      else Alert.alert("Fetch Error", error.message);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // 2. Fetch profiles separately
      const clientIds = [...new Set(data.map((r) => r.client_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", clientIds);

      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach((p) => {
          profileMap.set(p.id, p);
        });
      }

      const enrichedData = data.map((r) => ({
        ...r,
        profiles: profileMap.get(r.client_id) || { first_name: "Unknown", last_name: "Client" },
      }));
      
      setReservations(enrichedData as ReservationDetail[]);
    } else {
      setReservations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();

    // Subscribe to realtime changes (may be blocked by complex RLS)
    const channel = supabase
      .channel("admin-reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchReservations()
      )
      .subscribe();

    // Fallback polling every 5 seconds to ensure real-time feel for admins
    const pollInterval = setInterval(() => {
      fetchReservations();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) {
      if (Platform.OS === "web") window.alert(`Error: ${error.message}`);
      else Alert.alert("Error", error.message);
    } else {
      fetchReservations();
    }
  };

  const handleCancel = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Mark this reservation as cancelled?")) {
        updateStatus(id, "cancelled");
      }
    } else {
      Alert.alert(
        "Cancel Reservation",
        "Mark this reservation as cancelled?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes", onPress: () => updateStatus(id, "cancelled") },
        ]
      );
    }
  };

  const getStatusAccent = (status: string): string => {
    switch (status) {
      case "confirmed":
        return Colors.primary;
      case "completed":
        return Colors.success;
      case "cancelled":
        return Colors.error;
      default:
        return Colors.light.textTertiary;
    }
  };

  const renderItem = ({ item }: { item: ReservationDetail }) => {
    const clientName = item.profiles
      ? `${item.profiles.first_name ?? ""} ${item.profiles.last_name ?? ""}`
      : "Unknown";

    return (
      <Card variant="glass" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.clientName}>{clientName.trim()}</Text>
            <Text style={styles.equipmentName}>
              {item.equipment?.name ?? "Unknown Equipment"}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusAccent(item.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusAccent(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{item.reservation_date}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {formatTime(item.start_time)} — {formatTime(item.end_time)}
            </Text>
          </View>
        </View>

        {item.status === "confirmed" && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnComplete]}
              onPress={() => updateStatus(item.id, "completed")}
            >
              <Text style={styles.actionBtnCompleteText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnCancel]}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.actionBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const activeCount = reservations.filter((r) => r.status === "confirmed").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Admin</Text>
        <Text style={styles.title}>Reservation Manager</Text>
        <Text style={styles.subtitle}>
          {activeCount} active · {reservations.length} total
        </Text>
      </View>

      <FlatList
        data={reservations}
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
              <Text style={styles.emptyIconText}>—</Text>
            </View>
            <Text style={styles.emptyText}>No reservations yet</Text>
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
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "300",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    marginTop: 4,
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  cardInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  clientName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  equipmentName: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginTop: 3,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginHorizontal: Spacing.md,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.light.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionBtnComplete: {
    borderColor: "rgba(0, 217, 166, 0.2)",
    backgroundColor: "rgba(0, 217, 166, 0.08)",
  },
  actionBtnCompleteText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
    color: Colors.success,
  },
  actionBtnCancel: {
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "transparent",
  },
  actionBtnCancelText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
    color: Colors.light.textTertiary,
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
    fontWeight: "500",
  },
});
