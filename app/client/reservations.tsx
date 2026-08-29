// ============================================================================
// Reservations Screen — Swiss Glassmorphic Bookings
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
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Reservation } from "../../lib/types";
import { formatTime } from "../../lib/utils";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { GlassAlert, GlassAlertAction } from "../../components/ui/GlassAlert";

interface ReservationWithEquipment extends Reservation {
  equipment?: { name: string; type: string };
}

export default function ReservationsScreen() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    actions?: GlassAlertAction[];
  }>({ title: "", message: "" });

  const showAlert = (title: string, message: string, actions?: GlassAlertAction[]) => {
    setAlertConfig({ title, message, actions });
    setAlertVisible(true);
  };

  const fetchReservations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment:equipment_id(name, type)")
      .eq("client_id", profile.id)
      .order("reservation_date", { ascending: false });

    if (data) setReservations(data as ReservationWithEquipment[]);
    if (error) console.error("Failed to fetch reservations:", error.message);
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
    
    if (!profile) return;
    
    // Subscribe to realtime reservations changes for this user
    const channel = supabase
      .channel("client-reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `client_id=eq.${profile.id}` },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    // Auto-cancel no-shows and auto-complete finished sessions
    reservations.forEach(async (res) => {
      if (res.status === "confirmed") {
        const start = new Date(`${res.reservation_date}T${res.start_time}`);
        const end = new Date(`${res.reservation_date}T${res.end_time}`);
        const isArrived = res.notes?.includes('"is_arrived":true');

        if (!isArrived) {
          const threeMinsAfterStart = new Date(start.getTime() + 3 * 60 * 1000);
          if (currentTime > threeMinsAfterStart) {
            await supabase
              .from("reservations")
              .update({ status: "cancelled", notes: '{"auto_cancelled":true}' })
              .eq("id", res.id);
          }
        } else if (isArrived && currentTime >= end) {
          await supabase
            .from("reservations")
            .update({ status: "completed" })
            .eq("id", res.id);
        }
      }
    });
  }, [currentTime, reservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleCancel = async (reservation: ReservationWithEquipment) => {
    const doCancel = async () => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservation.id);

      if (error) {
        showAlert("Error", error.message);
      }
      // Success will be handled by realtime subscription
    };

    showAlert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: doCancel },
      ]
    );
  };

  const handleConfirmArrival = async (reservation: ReservationWithEquipment) => {
    const { error } = await supabase
      .from("reservations")
      .update({ notes: '{"is_arrived":true}' })
      .eq("id", reservation.id);

    if (error) {
      showAlert("Error", error.message);
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

  const renderItem = ({ item }: { item: ReservationWithEquipment }) => {
    const start = new Date(`${item.reservation_date}T${item.start_time}`);
    const end = new Date(`${item.reservation_date}T${item.end_time}`);
    const isArrived = item.notes?.includes('"is_arrived":true');
    const autoCancelled = item.notes?.includes('"auto_cancelled":true');

    const threeMinsAfterStart = new Date(start.getTime() + 3 * 60 * 1000);
    const isStarted = currentTime >= start && currentTime < end;
    
    const timeRemaining = Math.max(0, Math.floor((threeMinsAfterStart.getTime() - currentTime.getTime()) / 1000));
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    const timerText = `${mins}:${secs.toString().padStart(2, "0")}`;

    const showConfirmArrival = isStarted && !isArrived && item.status === "confirmed" && timeRemaining > 0;
    const showInProgress = isStarted && isArrived && item.status === "confirmed";
    const canCancel = currentTime < start && item.status === "confirmed";

    return (
      <Card variant="glass" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.equipmentName}>
            {item.equipment?.name ?? "Unknown Equipment"}
          </Text>
          <Text style={styles.equipmentType}>
            {item.equipment?.type === "cardio" ? "Cardio" : "Strength"}
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

      {canCancel && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
          </TouchableOpacity>
        </View>
      )}

      {showConfirmArrival && (
        <View style={styles.confirmArrivalContainer}>
          <Text style={styles.timerText}>Time remaining to confirm: {timerText}</Text>
          <TouchableOpacity
            style={styles.confirmArrivalBtn}
            onPress={() => handleConfirmArrival(item)}
          >
            <Text style={styles.confirmArrivalText}>I'm Here (Confirm Arrival)</Text>
          </TouchableOpacity>
        </View>
      )}

      {showInProgress && (
        <View style={styles.inProgressContainer}>
          <Text style={styles.inProgressText}>Workout In Progress</Text>
        </View>
      )}

      {autoCancelled && (
        <View style={styles.autoCancelContainer}>
          <Text style={styles.autoCancelText}>Auto-cancelled: No-show</Text>
        </View>
      )}
    </Card>
  );
  };

  const activeCount = reservations.filter((r) => r.status === "confirmed").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Schedule</Text>
        <Text style={styles.title}>My Bookings</Text>
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
            <Text style={styles.emptyHint}>
              Browse equipment to make your first booking.
            </Text>
          </View>
        }
      />

      <GlassAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onDismiss={() => setAlertVisible(false)}
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
  equipmentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  equipmentType: {
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
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
    alignItems: "flex-end",
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
    color: Colors.light.textSecondary,
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
  emptyHint: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  confirmArrivalContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  timerText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  confirmArrivalBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    width: '100%',
    alignItems: "center",
  },
  confirmArrivalText: {
    color: "#000",
    fontWeight: "700",
  },
  inProgressContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  inProgressText: {
    color: Colors.success,
    fontWeight: "600",
  },
  autoCancelContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.sm,
    alignItems: "center",
  },
  autoCancelText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "500",
  },
});
