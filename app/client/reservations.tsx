// ============================================================================
// Reservations Screen — Swiss Glassmorphic Bookings
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Reservation } from "../../lib/types";
import { formatTime } from "../../lib/utils";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { GlassAlert, GlassAlertAction } from "../../components/ui/GlassAlert";
import {
  getReservationState,
  serializeReservationMetadata,
  sendReservationNotification,
} from "../../lib/reservation-utils";

interface ReservationWithEquipment extends Reservation {
  equipment?: { name: string; type: string };
}

export default function ReservationsScreen() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Set of reservation IDs already locally alerted to avoid re-triggering during the same session
  const processedNotifs = useRef<Set<string>>(new Set());

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
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `client_id=eq.${profile.id}`,
        },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Handle active session lifecycle: 5-min start reminder, 5-min return reminder, and session completion
  useEffect(() => {
    if (!profile) return;

    reservations.forEach(async (res) => {
      if (res.status !== "confirmed") return;

      const timing = getReservationState(res, currentTime);
      const equipmentName = res.equipment?.name || "Equipment";

      // 1. 5 minutes before start reminder
      const startKey = `${res.id}-start-5m`;
      if (timing.is5MinBeforeStart && !timing.metadata.notified_5min_start && !processedNotifs.current.has(startKey)) {
        processedNotifs.current.add(startKey);
        await sendReservationNotification(
          profile.id,
          "5 Minutes Away!",
          `Your reservation for ${equipmentName} starts in 5 minutes! Please head to the front desk counter to check in.`
        );
        const updatedNotes = serializeReservationMetadata(
          { notified_5min_start: true },
          res.notes
        );
        await supabase
          .from("reservations")
          .update({ notes: updatedNotes })
          .eq("id", res.id);
      }

      // 2. 5 minutes before end reminder (clean up, return, and fix equipment)
      const endKey = `${res.id}-end-5m`;
      if (timing.is5MinBeforeEnd && !timing.metadata.notified_5min_end && !processedNotifs.current.has(endKey)) {
        processedNotifs.current.add(endKey);
        await sendReservationNotification(
          profile.id,
          "5 Mins Left — Return Equipment",
          `5 minutes remaining on ${equipmentName}! Please prepare to wipe down, return, and rack the equipment in place.`
        );
        const updatedNotes = serializeReservationMetadata(
          { notified_5min_end: true },
          res.notes
        );
        await supabase
          .from("reservations")
          .update({ notes: updatedNotes })
          .eq("id", res.id);
      }

      // 3. Auto-complete session when end time arrives for checked-in user
      if (timing.isCheckedIn && timing.isEnded) {
        const completeKey = `${res.id}-completed`;
        if (!processedNotifs.current.has(completeKey)) {
          processedNotifs.current.add(completeKey);
          await supabase
            .from("reservations")
            .update({ status: "completed" })
            .eq("id", res.id);

          await sendReservationNotification(
            profile.id,
            "Session Completed",
            `Your reservation for ${equipmentName} is complete. Thank you for racking and returning the equipment!`
          );
        }
      }
    });
  }, [currentTime, reservations, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleCancel = async (reservation: ReservationWithEquipment) => {
    const doCancel = async () => {
      const { error } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          notes: serializeReservationMetadata(
            { cancel_reason: "Cancelled by user" },
            reservation.notes
          ),
        })
        .eq("id", reservation.id);

      if (error) {
        showAlert("Error", error.message);
      }
    };

    showAlert(
      "Cancel Reservation",
      "Are you sure you want to cancel this equipment reservation?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: doCancel },
      ]
    );
  };

  const renderItem = ({ item }: { item: ReservationWithEquipment }) => {
    const timing = getReservationState(item, currentTime);
    const equipmentName = item.equipment?.name ?? "Equipment";
    const equipmentType = item.equipment?.type === "cardio" ? "Cardio" : "Strength";

    // User can cancel if the start time is still in the future and reservation is confirmed
    const canCancel = item.status === "confirmed" && !timing.isStarted && !timing.isEnded;

    return (
      <Card
        variant="glass"
        style={[
          styles.card,
          timing.isActive ? styles.activeCard : undefined,
        ] as any}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.equipmentName}>{equipmentName}</Text>
            <Text style={styles.equipmentType}>{equipmentType}</Text>
          </View>

          {/* Status Badge */}
          {timing.isActive ? (
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>ACTIVE NOW</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status === "completed"
                        ? Colors.success
                        : item.status === "cancelled"
                        ? Colors.error
                        : timing.isCheckedIn
                        ? Colors.success
                        : timing.isMissedCheckIn
                        ? Colors.error
                        : Colors.secondary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "completed"
                        ? Colors.success
                        : item.status === "cancelled"
                        ? Colors.error
                        : timing.isCheckedIn
                        ? Colors.success
                        : timing.isMissedCheckIn
                        ? Colors.error
                        : Colors.secondary,
                  },
                ]}
              >
                {item.status === "completed"
                  ? "Completed"
                  : item.status === "cancelled"
                  ? "Cancelled"
                  : timing.isCheckedIn
                  ? "Checked In"
                  : timing.isMissedCheckIn
                  ? "Check-in Overdue"
                  : "Awaiting Check-in"}
              </Text>
            </View>
          )}
        </View>

        {/* Date and Time Details */}
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{item.reservation_date}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Slot</Text>
            <Text style={styles.detailValue}>
              {formatTime(item.start_time)} — {formatTime(item.end_time)}
            </Text>
          </View>
        </View>

        {/* ================= ACTIVE STATE (CHECKED-IN & IN-SESSION) ================= */}
        {timing.isActive && (
          <View style={styles.activeSection}>
            <View style={styles.countdownRow}>
              <View>
                <Text style={styles.countdownLabel}>Time Remaining</Text>
                <Text style={styles.countdownValue}>{timing.remainingText}</Text>
              </View>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownBadgeText}>
                  Ends at {formatTime(item.end_time)}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${timing.progressPercent}%`,
                    backgroundColor: timing.is5MinBeforeEnd ? Colors.error : Colors.primary,
                  },
                ]}
              />
            </View>

            {/* 5-minute wrap-up notice */}
            {timing.is5MinBeforeEnd ? (
              <View style={styles.wrapUpBanner}>
                <Text style={styles.wrapUpTitle}>⚠️ 5 Minutes Remaining</Text>
                <Text style={styles.wrapUpText}>
                  Please prepare to clean up, wipe down, and fix/rack the equipment in proper order for the next user.
                </Text>
              </View>
            ) : (
              <View style={styles.inUseBanner}>
                <Text style={styles.inUseText}>
                  Equipment is currently active and assigned to you. Enjoy your workout!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= AWAITING CHECK-IN OR NOT CHECKED IN ================= */}
        {item.status === "confirmed" && !timing.isCheckedIn && (
          <View style={styles.checkinNoticeContainer}>
            {timing.isMissedCheckIn ? (
              <View style={styles.overdueBanner}>
                <Text style={styles.overdueTitle}>⚠️ Reservation Time Started</Text>
                <Text style={styles.overdueText}>
                  You have not been checked in at the front desk. Please present yourself at the counter immediately to proceed, or your slot may be cancelled.
                </Text>
              </View>
            ) : timing.is5MinBeforeStart ? (
              <View style={styles.soonBanner}>
                <Text style={styles.soonTitle}>🔔 Starts in 5 Minutes</Text>
                <Text style={styles.soonText}>
                  Head over to the front desk counter to check in so your equipment session activates on time!
                </Text>
              </View>
            ) : (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingTitle}>Front Desk Check-in Required</Text>
                <Text style={styles.pendingText}>
                  Please present this booking to the front desk counter upon your arrival at the gym. Staff will check you in to activate your reservation.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Checked in early, awaiting start time */}
        {item.status === "confirmed" && timing.isCheckedIn && !timing.isStarted && !timing.isEnded && (
          <View style={styles.earlyCheckinContainer}>
            <Text style={styles.earlyCheckinTitle}>✓ Checked in by Staff</Text>
            <Text style={styles.earlyCheckinText}>
              Your reservation is ready. It will automatically become ACTIVE at {formatTime(item.start_time)}.
            </Text>
          </View>
        )}

        {/* Cancellation details */}
        {item.status === "cancelled" && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>
              {timing.metadata.cancel_reason
                ? `Cancelled: ${timing.metadata.cancel_reason}`
                : timing.metadata.auto_cancelled
                ? "Cancelled: Absent / No-show at front desk"
                : "Reservation Cancelled"}
            </Text>
          </View>
        )}

        {/* Completed notice */}
        {item.status === "completed" && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✓ Session completed successfully</Text>
          </View>
        )}

        {/* Cancel Action Button (only if before start time) */}
        {canCancel && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancel(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const activeCount = reservations.filter((r) => {
    const timing = getReservationState(r, currentTime);
    return timing.isActive;
  }).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Schedule</Text>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>
          {activeCount > 0 ? `${activeCount} session active now · ` : ""}
          {reservations.length} total bookings
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
              Browse equipment to reserve your first workout slot.
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
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: Spacing.md,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
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
    alignSelf: "center",
    width: "100%",
  },
  card: {
    marginBottom: Spacing.md,
  },
  activeCard: {
    borderColor: "rgba(251, 191, 36, 0.45)",
    borderWidth: 1.5,
    backgroundColor: "rgba(251, 191, 36, 0.05)",
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
    fontWeight: "600",
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
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
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

  /* Active session styling */
  activeSection: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.15)",
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: Spacing.sm,
  },
  countdownLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFF",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  countdownBadgeText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  inUseBanner: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  inUseText: {
    fontSize: 12,
    color: "#86EFAC",
    fontWeight: "500",
    textAlign: "center",
  },
  wrapUpBanner: {
    padding: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  wrapUpTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCA5A5",
    marginBottom: 2,
  },
  wrapUpText: {
    fontSize: 12,
    color: "#FECACA",
    lineHeight: 16,
  },

  /* Check-in notice banners */
  checkinNoticeContainer: {
    marginTop: Spacing.xs,
  },
  pendingBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.18)",
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  soonBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  soonTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCD34D",
    marginBottom: 4,
  },
  soonText: {
    fontSize: 12,
    color: "#FEF3C7",
    lineHeight: 16,
  },
  overdueBanner: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  overdueTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCA5A5",
    marginBottom: 4,
  },
  overdueText: {
    fontSize: 12,
    color: "#FECACA",
    lineHeight: 16,
  },
  earlyCheckinContainer: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  earlyCheckinTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#86EFAC",
    marginBottom: 2,
  },
  earlyCheckinText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  cancelledBanner: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  cancelledText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "500",
  },
  completedBanner: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(34, 197, 94, 0.06)",
  },
  completedText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "500",
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
    alignItems: "flex-end",
    marginTop: Spacing.sm,
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
});
