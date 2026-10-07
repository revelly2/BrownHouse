// ============================================================================
// Admin & Cashier Reservations Management — Glassmorphic Design
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
  TextInput,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { formatTime } from "../../lib/utils";
import { Reservation } from "../../lib/types";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { GlassAlert, GlassAlertAction } from "../../components/ui/GlassAlert";
import {
  getReservationState,
  serializeReservationMetadata,
  sendReservationNotification,
} from "../../lib/reservation-utils";

interface ReservationDetail extends Reservation {
  profiles?: { first_name: string | null; last_name: string | null; email?: string | null };
  equipment?: { name: string; type: string };
}

type FilterTab = "needs_checkin" | "active" | "all" | "history";

export default function ReservationsManageScreen() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterTab, setFilterTab] = useState<FilterTab>("needs_checkin");
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment:equipment_id(name, type)")
      .order("reservation_date", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Fetch reservations error:", error.message);
      showAlert("Fetch Error", error.message);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const clientIds = [...new Set(data.map((r) => r.client_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", clientIds);

      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach((p) => {
          profileMap.set(p.id, p);
        });
      }

      const enrichedData = data.map((r) => ({
        ...r,
        profiles: profileMap.get(r.client_id) || {
          first_name: "Member",
          last_name: "",
          email: "",
        },
      }));

      setReservations(enrichedData as ReservationDetail[]);
    } else {
      setReservations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel("admin-reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchReservations()
      )
      .subscribe();

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

  // Cashier checks in the client when they arrive at the counter
  const handleCheckIn = async (item: ReservationDetail) => {
    const timing = getReservationState(item, currentTime);
    const equipmentName = item.equipment?.name || "Equipment";

    const updatedNotes = serializeReservationMetadata(
      {
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: profile?.role || "cashier",
      },
      item.notes
    );

    const { error } = await supabase
      .from("reservations")
      .update({ notes: updatedNotes })
      .eq("id", item.id);

    if (error) {
      showAlert("Error Checking In", error.message);
      return;
    }

    // Send notification to the client
    const statusMsg = timing.isStarted
      ? "Your session is now ACTIVE! Head to your equipment."
      : `Your session will activate at ${formatTime(item.start_time)}.`;

    await sendReservationNotification(
      item.client_id,
      "Checked In by Cashier!",
      `You are checked in for ${equipmentName}. ${statusMsg}`
    );

    showAlert("Success", `${item.profiles?.first_name || "Client"} has been checked in!`);
    fetchReservations();
  };

  // Cashier cancels reservation if the user is not present / no-show
  const handleCancelAbsent = (item: ReservationDetail) => {
    const clientName = `${item.profiles?.first_name ?? ""} ${item.profiles?.last_name ?? ""}`.trim() || "Client";
    const equipmentName = item.equipment?.name || "Equipment";

    const doCancel = async () => {
      const updatedNotes = serializeReservationMetadata(
        {
          cancel_reason: "Absent / Not checked in with cashier",
          auto_cancelled: true,
        },
        item.notes
      );

      const { error } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          notes: updatedNotes,
        })
        .eq("id", item.id);

      if (error) {
        showAlert("Error Cancelling", error.message);
        return;
      }

      await sendReservationNotification(
        item.client_id,
        "Reservation Cancelled",
        `Your reservation for ${equipmentName} was cancelled by the cashier because check-in was not completed on time.`
      );

      showAlert("Cancelled", `Reservation for ${clientName} marked as cancelled.`);
      fetchReservations();
    };

    showAlert(
      "Cancel Reservation (No-Show)",
      `Cancel reservation for ${clientName} on ${equipmentName}? Reason: User absent at cashier counter.`,
      [
        { text: "Keep Booking", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: doCancel },
      ]
    );
  };

  // Complete session
  const handleComplete = async (id: string) => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      showAlert("Error", error.message);
    } else {
      fetchReservations();
    }
  };

  // Filter calculations
  const filteredReservations = reservations.filter((r) => {
    const timing = getReservationState(r, currentTime);
    const clientName = `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.toLowerCase();
    const equipName = (r.equipment?.name ?? "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    if (q && !clientName.includes(q) && !equipName.includes(q)) {
      return false;
    }

    if (filterTab === "needs_checkin") {
      return r.status === "confirmed" && !timing.isCheckedIn && !timing.isEnded;
    }
    if (filterTab === "active") {
      return timing.isActive;
    }
    if (filterTab === "history") {
      return r.status === "completed" || r.status === "cancelled" || timing.isEnded;
    }
    return true; // "all"
  });

  const needsCheckinCount = reservations.filter((r) => {
    const timing = getReservationState(r, currentTime);
    return r.status === "confirmed" && !timing.isCheckedIn && !timing.isEnded;
  }).length;

  const activeCount = reservations.filter((r) => {
    const timing = getReservationState(r, currentTime);
    return timing.isActive;
  }).length;

  const renderItem = ({ item }: { item: ReservationDetail }) => {
    const timing = getReservationState(item, currentTime);
    const clientName = `${item.profiles?.first_name ?? ""} ${item.profiles?.last_name ?? ""}`.trim() || "Member";
    const equipmentName = item.equipment?.name ?? "Equipment";

    return (
      <Card
        variant="glass"
        style={[
          styles.card,
          timing.isActive ? styles.activeCard : undefined,
          timing.isMissedCheckIn ? styles.missedCard : undefined,
        ] as any}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.equipmentName}>
              {equipmentName} · {item.equipment?.type === "cardio" ? "Cardio" : "Strength"}
            </Text>
          </View>

          {/* Status Badge */}
          {timing.isActive ? (
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>ACTIVE SESSION</Text>
            </View>
          ) : (
            <View
              style={[
                styles.statusBadge,
                timing.isCheckedIn && styles.statusBadgeSuccess,
                timing.isMissedCheckIn && styles.statusBadgeDanger,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  timing.isCheckedIn && styles.statusTextSuccess,
                  timing.isMissedCheckIn && styles.statusTextDanger,
                ]}
              >
                {item.status === "completed"
                  ? "Completed"
                  : item.status === "cancelled"
                  ? "Cancelled"
                  : timing.isCheckedIn
                  ? "Checked In"
                  : timing.isMissedCheckIn
                  ? "Absent / Past Start"
                  : "Awaiting Check-in"}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
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
          {timing.isActive && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Remaining</Text>
                <Text style={[styles.detailValue, { color: Colors.primary, fontWeight: "700" }]}>
                  {timing.remainingText}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Check-in Context Alerts */}
        {timing.isMissedCheckIn && !timing.isCheckedIn && (
          <View style={styles.overdueAlert}>
            <Text style={styles.overdueAlertText}>
              ⚠️ User has NOT checked in at the counter. Session time has already started!
            </Text>
          </View>
        )}

        {timing.isCheckedIn && (
          <View style={styles.checkedInInfo}>
            <Text style={styles.checkedInInfoText}>
              ✓ Checked in by cashier {timing.metadata.checked_in_at ? `(${new Date(timing.metadata.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}
            </Text>
          </View>
        )}

        {/* Action Buttons for Cashier / Admin */}
        {item.status === "confirmed" && (
          <View style={styles.cardActions}>
            {/* If not checked in yet: Cashier can check them in OR cancel for no-show */}
            {!timing.isCheckedIn ? (
              <View style={styles.actionButtonGroup}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.checkInBtn]}
                  onPress={() => handleCheckIn(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.checkInBtnText}>✓ Check In Client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => handleCancelAbsent(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>✕ Cancel (No-Show)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* If checked in: Cashier can complete or cancel */
              <View style={styles.actionButtonGroup}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn]}
                  onPress={() => handleComplete(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.completeBtnText}>Complete Session</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => handleCancelAbsent(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Cashier & Admin</Text>
        <Text style={styles.title}>Equipment Bookings</Text>
        <Text style={styles.subtitle}>
          Check in arriving members & manage active workout stations
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, filterTab === "needs_checkin" && styles.tabActive]}
          onPress={() => setFilterTab("needs_checkin")}
        >
          <Text style={[styles.tabText, filterTab === "needs_checkin" && styles.tabTextActive]}>
            Needs Check-in {needsCheckinCount > 0 ? `(${needsCheckinCount})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterTab === "active" && styles.tabActive]}
          onPress={() => setFilterTab("active")}
        >
          <Text style={[styles.tabText, filterTab === "active" && styles.tabTextActive]}>
            Active Now {activeCount > 0 ? `(${activeCount})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterTab === "all" && styles.tabActive]}
          onPress={() => setFilterTab("all")}
        >
          <Text style={[styles.tabText, filterTab === "all" && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterTab === "history" && styles.tabActive]}
          onPress={() => setFilterTab("history")}
        >
          <Text style={[styles.tabText, filterTab === "history" && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by member name or equipment..."
          placeholderTextColor={Colors.light.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Reservation List */}
      <FlatList
        data={filteredReservations}
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
            <Text style={styles.emptyText}>
              {filterTab === "needs_checkin"
                ? "No pending check-ins right now"
                : filterTab === "active"
                ? "No active equipment sessions currently"
                : "No reservations found"}
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
    paddingBottom: Spacing.sm,
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: 8,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.light.text,
    fontSize: Typography.fontSize.sm,
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
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderWidth: 1.5,
  },
  missedCard: {
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  clientName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.light.text,
  },
  equipmentName: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusBadgeSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  statusBadgeDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  statusTextSuccess: {
    color: "#86EFAC",
  },
  statusTextDanger: {
    color: "#FCA5A5",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  activePillText: {
    fontSize: 10,
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
  overdueAlert: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: Spacing.sm,
  },
  overdueAlertText: {
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  checkedInInfo: {
    padding: Spacing.xs + 2,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(34, 197, 94, 0.06)",
    marginBottom: Spacing.sm,
  },
  checkedInInfoText: {
    fontSize: 11,
    color: "#86EFAC",
    fontWeight: "500",
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInBtn: {
    backgroundColor: "#16A34A",
  },
  checkInBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: Typography.fontSize.xs,
  },
  cancelBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  cancelBtnText: {
    color: "#FCA5A5",
    fontWeight: "600",
    fontSize: Typography.fontSize.xs,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
  },
  completeBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: Typography.fontSize.xs,
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
