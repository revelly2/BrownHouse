// ============================================================================
// Client Dashboard — Swiss Glassmorphic Home Screen
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Badge, getStatusVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ActivityGaugeMd } from "../../components/ui/ActivityGauge";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { formatTime, getLocalDateString } from "../../lib/utils";
import { Reservation, Notification as AppNotification } from "../../lib/types";
import { router } from "expo-router";

const ActiveReservationCard = ({ reservation }: { reservation: Reservation }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes, seconds] = reservation.end_time.split(":");
      const endDate = new Date();
      endDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || "0", 10));

      const diffMs = endDate.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeLeft("00:00");
        return;
      }

      const m = Math.floor(diffMs / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  return (
    <Card variant="glassElevated" style={{ borderColor: Colors.primary, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Active Now</Text>
          <Text style={{ color: Colors.text, fontSize: 32, fontWeight: '700', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
            {timeLeft}
          </Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            Time remaining until {formatTime(reservation.end_time)}
          </Text>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: "center", justifyContent: "center" }}>
          <Icon name="clock" size={24} color={Colors.primary} />
        </View>
      </View>
    </Card>
  );
};

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, reservations: 0 });
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  // Daily Measurement State
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyWeight, setDailyWeight] = useState("");
  const [dailyHeight, setDailyHeight] = useState("");
  const [savingDaily, setSavingDaily] = useState(false);

  const getStorageItem = async (key: string) => {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  };

  const setStorageItem = async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  };

  const fetchDashboardData = async () => {
    if (!profile) return;

    // Fetch upcoming reservations
    const today = getLocalDateString();
    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("client_id", profile.id)
      .gte("reservation_date", today)
      .in("status", ["confirmed", "pending"])
      .order("reservation_date", { ascending: true })
      .limit(10);

    if (reservations) setUpcomingReservations(reservations as Reservation[]);

    // Fetch unread notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", profile.id)
      .eq("is_read", false)
      .order("date_sent", { ascending: false })
      .limit(5);

    if (notifs) setNotifications(notifs as AppNotification[]);

    // Fetch stats
    const { data: sessionData, count: sessionCount } = await supabase
      .from("completed_sessions")
      .select("*", { count: "exact" })
      .eq("client_id", profile.id)
      .order("completed_at", { ascending: true });

    if (sessionData) setCompletedSessions(sessionData);

    // Fetch measurement history
    const { data: historyData } = await supabase
      .from("measurement_history")
      .select("*")
      .eq("client_id", profile.id)
      .order("measured_at", { ascending: true });
      
    if (historyData) setWeightHistory(historyData);

    const { count: reservationCount } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("client_id", profile.id)
      .eq("status", "completed");

    setStats({
      sessions: sessionCount ?? 0,
      reservations: reservationCount ?? 0,
    });
  };

  useEffect(() => {
    fetchDashboardData();
    checkDailyMeasurement();
  }, [profile]);

  const checkDailyMeasurement = async () => {
    if (!profile) return;
    const today = getLocalDateString();
    const lastDate = await getStorageItem(`last_measurement_${profile.id}`);
    
    if (lastDate !== today) {
      setDailyWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setDailyHeight(profile.height_cm ? String(profile.height_cm) : "");
      setShowDailyModal(true);
    }
  };

  const handleSaveDaily = async () => {
    if (!profile) return;
    setSavingDaily(true);
    const updates = {
      weight_kg: dailyWeight ? parseFloat(dailyWeight) : null,
      height_cm: dailyHeight ? parseFloat(dailyHeight) : null,
    };
    
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      if (updates.weight_kg) {
        await supabase.from("measurement_history").insert({
          client_id: profile.id,
          weight_kg: updates.weight_kg,
          height_cm: updates.height_cm,
        });
      }
      const today = getLocalDateString();
      await setStorageItem(`last_measurement_${profile.id}`, today);
      setShowDailyModal(false);
      fetchDashboardData(); // Refresh history
    }
    setSavingDaily(false);
  };

  const prepareChartData = () => {
    if (weightHistory.length === 0) return null;

    const labels = weightHistory.map((h) => {
      const date = new Date(h.measured_at);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = weightHistory.map((h) => h.weight_kg);
    const targetData = weightHistory.map(() => profile?.target_weight_kg ?? data[0]);

    return {
      labels,
      datasets: [
        {
          data: targetData,
          color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`, // Yellow
          strokeWidth: 2,
          withDots: false,
        },
        {
          data,
          color: (opacity = 1) => `rgba(230, 200, 79, ${opacity})`, // primary
          strokeWidth: 3,
        },
      ],
      legend: ["Target", "Actual"],
    };
  };

  const handlePointClick = (index: number) => {
    const point = weightHistory[index];
    const pointDate = new Date(point.measured_at);

    // Filter sessions up to this date
    const sessionsUpToPoint = completedSessions.filter(
      (s) => new Date(s.completed_at) <= pointDate
    );

    const totalTimeMs = sessionsUpToPoint.reduce(
      (sum, s) => sum + (s.duration_ms || 0),
      0
    );

    const hours = Math.floor(totalTimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    setSelectedPoint({
      date: pointDate.toLocaleDateString(),
      weight: point.weight_kg,
      sessions: sessionsUpToPoint.length,
      time: timeStr,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentHM = now.toTimeString().substring(0, 5); // "HH:MM"

  const activeRes = upcomingReservations.find(res => {
    return res.reservation_date === todayStr &&
           res.start_time.substring(0, 5) <= currentHM &&
           res.end_time.substring(0, 5) >= currentHM;
  });

  const futureRes = upcomingReservations.filter(res => {
    if (activeRes && res.id === activeRes.id) return false;
    return res.reservation_date > todayStr || (res.reservation_date === todayStr && res.start_time.substring(0, 5) > currentHM);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Daily Measurement Modal */}
      <Modal
        visible={showDailyModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}} // Force them to complete it
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Daily Check-In</Text>
            <Text style={styles.modalSubtitle}>
              Confirm or update your measurements to keep your metrics accurate.
            </Text>

            <View style={styles.modalInputRow}>
              <View style={styles.modalInputWrapper}>
                <Input
                  label="Weight (kg)"
                  value={dailyWeight}
                  onChangeText={setDailyWeight}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.modalInputWrapper}>
                <Input
                  label="Height (cm)"
                  value={dailyHeight}
                  onChangeText={setDailyHeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Button
              title="Save Measurements"
              variant="primary"
              size="lg"
              fullWidth
              loading={savingDaily}
              onPress={handleSaveDaily}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>{greeting()}</Text>
          <Text style={styles.name}>
            {profile?.first_name ?? "Member"} {profile?.last_name ?? ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push("/client/notifications")}
        >
          <Icon name="bell-bing" size={20} color={Colors.light.textSecondary} strokeWidth={2} />
          {notifications.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifCount}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Activity Gauge */}
      <View style={[styles.section, { alignItems: 'center' }]}>
        <ActivityGaugeMd 
          title={stats.sessions.toString()} 
          subtitle="Total Sessions" 
          data={[
            { label: "Upcoming", progress: Math.min((upcomingReservations.length / Math.max(stats.sessions + upcomingReservations.length, 5)), 1) },
            { label: "Completed", progress: Math.min((stats.reservations / Math.max(stats.sessions, 5)), 1) },
            { label: "Total Sessions", progress: 0.95 }
          ]} 
          baseColor={Colors.secondary} 
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card variant="glass" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.sessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </Card>
        <Card variant="glass" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.reservations}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </Card>
        <Card variant="glass" style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingReservations.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/client/equipment")}
            activeOpacity={0.7}
          >
            <View style={styles.actionDot}>
              <Text style={styles.actionDotText}>E</Text>
            </View>
            <Text style={styles.actionText}>Reserve Equipment</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/client/workouts")}
            activeOpacity={0.7}
          >
            <View style={styles.actionDot}>
              <Text style={styles.actionDotText}>W</Text>
            </View>
            <Text style={styles.actionText}>My Workouts</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal Progress</Text>
        <Card variant="glassElevated" style={{ padding: Spacing.md }}>
          {prepareChartData() ? (
            <>
              <LineChart
                data={prepareChartData()!}
                width={Dimensions.get("window").width - Spacing.xl * 2 - Spacing.md * 2}
                height={220}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: Colors.surface,
                  backgroundGradientTo: Colors.surface,
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => Colors.textSecondary,
                  propsForDots: {
                    r: "3",
                    strokeWidth: "1.5",
                    stroke: Colors.primary,
                  },
                }}
                bezier
                onDataPointClick={({ index }) => handlePointClick(index)}
                style={{
                  marginVertical: Spacing.sm,
                  borderRadius: Radius.md,
                }}
              />
              {selectedPoint && (
                <View style={styles.pointDetails}>
                  <Text style={styles.pointTitle}>
                    {selectedPoint.date} — {selectedPoint.weight} kg
                  </Text>
                  <Text style={styles.pointSub}>
                    Progress up to this day:
                  </Text>
                  <View style={styles.pointStats}>
                    <View style={styles.pointStatItem}>
                      <Text style={styles.pointStatValue}>{selectedPoint.sessions}</Text>
                      <Text style={styles.pointStatLabel}>Sessions</Text>
                    </View>
                    <View style={styles.pointDivider} />
                    <View style={styles.pointStatItem}>
                      <Text style={styles.pointStatValue}>{selectedPoint.time}</Text>
                      <Text style={styles.pointStatLabel}>Total Time</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartIcon}>—</Text>
              <Text style={styles.emptyText}>
                Record your weight daily to see your progress graph
              </Text>
            </View>
          )}
        </Card>
      </View>

      {/* Upcoming Reservations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Reservations</Text>

        {activeRes && <ActiveReservationCard reservation={activeRes} />}

        {futureRes.length === 0 && !activeRes ? (
          <Card variant="glass">
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No upcoming reservations. Book equipment to get started.
              </Text>
            </View>
          </Card>
        ) : (
          futureRes.map((res) => (
            <Card key={res.id} variant="glass" style={styles.reservationCard}>
              <View style={styles.reservationRow}>
                <View style={styles.reservationInfo}>
                  <Text style={styles.reservationDate}>{res.reservation_date}</Text>
                  <Text style={styles.reservationTime}>
                    {formatTime(res.start_time)} — {formatTime(res.end_time)}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: res.status === 'pending' ? Colors.secondary : Colors.primary }]} />
                  <Text style={styles.statusPillText}>{res.status}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {notifications.slice(0, 3).map((notif) => (
            <Card key={notif.id} variant="glass" style={styles.notifCard}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifMessage} numberOfLines={2}>
                {notif.message}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  name: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "300",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  notifBtn: {
    position: "relative",
    padding: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: Radius.lg,
  },
  notifBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  notifCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
  },
  statNumber: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "200",
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textTertiary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },

  // Quick Actions
  actionsColumn: {
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  actionDot: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(230, 200, 79, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionDotText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  actionArrow: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
  },

  // Reservations
  reservationCard: {
    marginBottom: Spacing.sm,
  },
  reservationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reservationInfo: {},
  reservationDate: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  reservationTime: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 2,
    fontWeight: "500",
  },
  statusPill: {
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
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "capitalize",
  },

  // Notifications
  notifCard: {
    marginBottom: Spacing.sm,
  },
  notifTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  notifMessage: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    lineHeight: 12 * Typography.lineHeight.normal,
  },

  // Empty States
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    textAlign: "center",
    fontWeight: "500",
  },
  emptyCard: {
    padding: Spacing.md,
    alignItems: "center",
  },
  emptyChart: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyChartIcon: {
    fontSize: 24,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.sm,
  },

  // Chart Point Details
  pointDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  pointTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  pointSub: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 4,
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  pointStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  pointStatItem: {
    alignItems: "center",
  },
  pointStatValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: "300",
    color: Colors.primary,
  },
  pointStatLabel: {
    fontSize: 10,
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginTop: 2,
  },
  pointDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.15)",
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "300",
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.sm * 1.5,
    fontWeight: "500",
  },
  modalInputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalInputWrapper: {
    flex: 1,
  },
});
