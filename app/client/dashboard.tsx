// ============================================================================
// Client Dashboard — Athletic Command Center
// High-performance Swiss & Apple-inspired layout for BrownHouse athletes
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
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { formatTime, getLocalDateString } from "../../lib/utils";
import { Reservation, Notification as AppNotification, WorkoutPlan, Equipment } from "../../lib/types";
import { router } from "expo-router";
import { getReservationState, serializeReservationMetadata } from "../../lib/reservation-utils";
import { AthleteDeadlifterVector, GymStationVector, AthleteRunnerVector } from "../../components/ui/AthleteVectors";

// Active Session Card with real-time countdown
const ActiveReservationCard = ({
  reservation,
  equipmentName,
  onCancel,
}: {
  reservation: Reservation;
  equipmentName?: string;
  onCancel?: () => void;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timing = getReservationState(reservation, currentTime);

  return (
    <Card
      variant="glassElevated"
      style={{
        borderColor: timing.is5MinBeforeEnd ? Colors.error : Colors.primary,
        borderWidth: 1.5,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        backgroundColor: timing.is5MinBeforeEnd
          ? "rgba(239, 68, 68, 0.08)"
          : "rgba(251, 191, 36, 0.06)",
        borderRadius: Radius.xl,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: timing.is5MinBeforeEnd ? Colors.error : Colors.primary,
              }}
            />
            <Text
              style={{
                color: timing.is5MinBeforeEnd ? Colors.error : Colors.primary,
                fontWeight: "700",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              {timing.is5MinBeforeEnd ? "5 Mins Remaining — Wrap Up" : "Active Machine Session"}
            </Text>
          </View>

          <Text
            style={{
              color: Colors.text,
              fontSize: 22,
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
          >
            {equipmentName || "Reserved Machine"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <Text
              style={{
                color: timing.is5MinBeforeEnd ? "#FCA5A5" : Colors.primary,
                fontSize: 34,
                fontWeight: "800",
                fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                letterSpacing: -0.5,
              }}
            >
              {timing.remainingText}
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 13, fontWeight: "500" }}>
              until {formatTime(reservation.end_time)}
            </Text>
          </View>
        </View>

        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: timing.is5MinBeforeEnd
              ? "rgba(239, 68, 68, 0.16)"
              : "rgba(251, 191, 36, 0.14)",
            borderWidth: 1,
            borderColor: timing.is5MinBeforeEnd
              ? "rgba(239, 68, 68, 0.3)"
              : "rgba(251, 191, 36, 0.3)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name="running-2"
            size={24}
            color={timing.is5MinBeforeEnd ? Colors.error : Colors.primary}
          />
        </View>
      </View>

      {/* Progress Track */}
      <View
        style={{
          height: 4,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 2,
          marginTop: Spacing.md,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(100, Math.max(0, timing.progressPercent))}%`,
            height: "100%",
            backgroundColor: timing.is5MinBeforeEnd ? Colors.error : Colors.primary,
            borderRadius: 2,
          }}
        />
      </View>

      {timing.is5MinBeforeEnd && (
        <View
          style={{
            marginTop: Spacing.md,
            padding: Spacing.sm + 2,
            borderRadius: Radius.md,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.3)",
          }}
        >
          <Text style={{ color: "#FCA5A5", fontSize: 12, fontWeight: "600" }}>
            Please wipe down equipment and rack weights for the next member.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: Spacing.md,
          paddingTop: Spacing.sm,
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <TouchableOpacity
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.35)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          }}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}>
            Finish & Release Machine
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/client/reservations")}
          activeOpacity={0.7}
        >
          <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: "600" }}>
            View Schedule →
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default function ClientDashboard() {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isMobile = width < 600;
  const availableScreenWidth = isDesktop ? Math.min(width - 250, 1024) : width;
  const horizontalPadding = isMobile ? Spacing.md : Spacing.xl;
  const chartWidth = Math.max(260, availableScreenWidth - horizontalPadding * 2 - Spacing.md * 2);

  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, Equipment>>({});
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    sessions: 0,
    reservations: 0,
    activeStreak: 1,
    weeklyMinutes: 0,
  });
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  // Daily Measurement State
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [modalMode, setModalMode] = useState<"onboarding" | "daily">("daily");
  const [dailyWeight, setDailyWeight] = useState("");
  const [dailyHeight, setDailyHeight] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
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

    const today = getLocalDateString();

    // 1. Fetch upcoming reservations
    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("client_id", profile.id)
      .gte("reservation_date", today)
      .in("status", ["confirmed", "pending"])
      .order("reservation_date", { ascending: true })
      .limit(10);

    if (reservations) {
      setUpcomingReservations(reservations as Reservation[]);

      // Preload equipment details for machine names
      const eqIds = Array.from(new Set(reservations.map((r: any) => r.equipment_id).filter(Boolean)));
      if (eqIds.length > 0) {
        const { data: eqData } = await supabase
          .from("equipment")
          .select("*")
          .in("id", eqIds);
        if (eqData) {
          const map: Record<string, Equipment> = {};
          eqData.forEach((eq: any) => {
            map[eq.id] = eq;
          });
          setEquipmentMap((prev) => ({ ...prev, ...map }));
        }
      }
    }

    // 2. Fetch unread notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", profile.id)
      .eq("is_read", false)
      .order("date_sent", { ascending: false })
      .limit(5);

    if (notifs) setNotifications(notifs as AppNotification[]);

    // 3. Fetch completed sessions & calculate streak and weekly volume
    const { data: sessionData, count: sessionCount } = await supabase
      .from("completed_sessions")
      .select("*", { count: "exact" })
      .eq("client_id", profile.id)
      .order("date", { ascending: true });

    let streak = 0;
    let weekMinutes = 0;
    if (sessionData) {
      setCompletedSessions(sessionData);

      // Calculate minutes this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      sessionData.forEach((s: any) => {
        const sDate = new Date(s.date);
        if (sDate >= oneWeekAgo) {
          weekMinutes += s.duration_minutes || (s.duration_ms ? Math.round(s.duration_ms / 60000) : 45);
        }
      });

      // Calculate simple active consistency
      streak = sessionData.length > 0 ? Math.min(sessionData.length, 7) : 0;
    }

    // 4. Fetch measurement history
    const { data: historyData } = await supabase
      .from("measurement_history")
      .select("*")
      .eq("client_id", profile.id)
      .order("measured_at", { ascending: true });

    if (historyData) setWeightHistory(historyData);

    // 5. Fetch completed reservations count
    const { count: reservationCount } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("client_id", profile.id)
      .eq("status", "completed");

    // 6. Fetch user's latest active workout plan
    const { data: planData } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("client_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (planData) {
      setActivePlan(planData as WorkoutPlan);
    }

    setStats({
      sessions: sessionCount ?? 0,
      reservations: reservationCount ?? 0,
      activeStreak: streak > 0 ? streak : 1,
      weeklyMinutes: weekMinutes > 0 ? weekMinutes : 0,
    });
  };

  const handleCancelActive = (res: Reservation) => {
    Alert.alert(
      "Finish & Release Machine",
      "Are you sure you want to release this equipment now? It will immediately show as available for other members to reserve.",
      [
        { text: "Keep Session", style: "cancel" },
        {
          text: "Yes, Release Machine",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("reservations")
              .update({
                status: "completed",
                notes: serializeReservationMetadata(
                  { cancel_reason: "Finished early by user from dashboard" },
                  res.notes
                ),
              })
              .eq("id", res.id);
            if (!error) {
              await fetchDashboardData();
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchDashboardData();
    checkDailyMeasurement();

    if (!profile) return;

    const channel = supabase
      .channel("client-dashboard-realtime-reservations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `client_id=eq.${profile.id}`,
        },
        () => fetchDashboardData()
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [profile]);

  const checkDailyMeasurement = async () => {
    if (!profile) return;
    const isMissingInfo = !profile.first_name || !profile.last_name || !profile.phone_number;
    const today = getLocalDateString();
    const lastDate = await getStorageItem(`last_measurement_${profile.id}`);

    if (isMissingInfo) {
      setDailyWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setDailyHeight(profile.height_cm ? String(profile.height_cm) : "");
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone_number || "");
      setModalMode("onboarding");
      setShowDailyModal(true);
    } else if (lastDate !== today) {
      setDailyWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setDailyHeight(profile.height_cm ? String(profile.height_cm) : "");
      setModalMode("daily");
      setShowDailyModal(true);
    }
  };

  const handleSaveDaily = async () => {
    if (!profile) return;
    setSavingDaily(true);

    const updates: any = {
      weight_kg: dailyWeight ? parseFloat(dailyWeight) : null,
      height_cm: dailyHeight ? parseFloat(dailyHeight) : null,
    };

    if (modalMode === "onboarding") {
      updates.first_name = firstName;
      updates.last_name = lastName;
      updates.phone_number = phone;
    }

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
      if (modalMode === "onboarding") {
        setShowDailyModal(false);
        fetchDashboardData();
      } else {
        const today = getLocalDateString();
        await setStorageItem(`last_measurement_${profile.id}`, today);
        setShowDailyModal(false);
        fetchDashboardData();
      }
    }
    setSavingDaily(false);
  };

  const handleCancelModal = async () => {
    if (modalMode === "daily" && profile) {
      const today = getLocalDateString();
      await setStorageItem(`last_measurement_${profile.id}`, today);
    }
    setShowDailyModal(false);
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
          color: (opacity = 1) => `rgba(251, 191, 36, ${opacity * 0.7})`,
          strokeWidth: 2,
          withDots: false,
        },
        {
          data,
          color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      legend: ["Target", "Actual"],
    };
  };

  const handlePointClick = (index: number) => {
    const point = weightHistory[index];
    const pointDate = new Date(point.measured_at);

    const sessionsUpToPoint = completedSessions.filter(
      (s) => new Date(s.date) <= pointDate
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
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const now = new Date();
  const activeRes = upcomingReservations.find((res) => getReservationState(res, now).isActive);

  const futureRes = upcomingReservations.filter((res) => {
    if (activeRes && res.id === activeRes.id) return false;
    const timing = getReservationState(res, now);
    return !timing.isEnded;
  });

  // Calculate current BMI with sanity check
  const currentWeight = profile?.weight_kg || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight_kg : null);
  const currentHeight = profile?.height_cm;
  const bmi = currentWeight && currentHeight && currentHeight >= 100 && currentHeight <= 250
    ? (currentWeight / ((currentHeight / 100) ** 2)).toFixed(1)
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: isMobile ? Spacing["2xl"] + 12 : Spacing["4xl"] + 8,
          paddingBottom: Math.max(105, 80 + insets.bottom),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Unified Onboarding / Daily Check Modal */}
      <Modal
        visible={showDailyModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {modalMode === "onboarding" ? "Complete Your Athlete Profile" : "Daily Check-in"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalMode === "onboarding"
                ? "Provide your metrics to personalize your workout load and analytics."
                : "Log today's weight to keep your body composition trends accurate."}
            </Text>

            {modalMode === "onboarding" && (
              <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
                <Input
                  label="First Name"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                />
                <Input
                  label="Phone Number"
                  placeholder="123-456-7890"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            )}

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

            <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
              {modalMode === "daily" && (
                <Button
                  title="Skip for now"
                  variant="outline"
                  onPress={handleCancelModal}
                  style={{ flex: 1 }}
                />
              )}
              <Button
                title={modalMode === "onboarding" ? "Save Profile" : "Update Weight"}
                variant="primary"
                loading={savingDaily}
                onPress={handleSaveDaily}
                style={{ flex: modalMode === "onboarding" ? undefined : 1 }}
                disabled={modalMode === "onboarding" && (!firstName || !lastName || !phone)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 1. ATHLETIC HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {greeting()}, {profile?.first_name ? profile.first_name.charAt(0).toUpperCase() + profile.first_name.slice(1) : "Athlete"}
          </Text>
          <Text style={styles.headerSubtitle}>
            BrownHouse Performance Hub
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push("/client/notifications")}
          activeOpacity={0.7}
        >
          <Icon name="bell-bing" size={20} color={Colors.textSecondary} strokeWidth={1.75} />
          {notifications.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifCount}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. ACTIVE SESSION HERO (If member is currently working out) */}
      {activeRes && (
        <ActiveReservationCard
          reservation={activeRes}
          equipmentName={equipmentMap[activeRes.equipment_id]?.name}
          onCancel={() => handleCancelActive(activeRes)}
        />
      )}

      {/* 3. HERO ATHLETIC STATUS BANNER */}
      <View style={[styles.heroBanner, isMobile && { padding: Spacing.lg }]}>
        <View style={[styles.heroContent, isMobile && { maxWidth: "100%" }]}>
          <View style={styles.heroTagRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>READY TO TRAIN</Text>
            </View>
            {activePlan && (
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>{activePlan.goal || "Custom Program"}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.heroHeadline, isMobile && { fontSize: 16, lineHeight: 22, marginBottom: Spacing.md }]}>
            {activePlan
              ? `Week Program: ${activePlan.fitt_frequency || "Active"} • ${activePlan.difficulty_level || "Standard"}`
              : "Reserve machines or launch your AI training program."}
          </Text>

          <View style={[styles.heroCTAButtons, isMobile && { flexDirection: "column", gap: 10 }]}>
            <TouchableOpacity
              style={[styles.heroPrimaryBtn, isMobile && { justifyContent: "center", width: "100%" }]}
              onPress={() => router.push("/client/equipment")}
              activeOpacity={0.8}
            >
              <Icon name="dumbbells" size={17} color="#0A0A0C" strokeWidth={2} />
              <Text style={styles.heroPrimaryBtnText}>Reserve Machine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroSecondaryBtn, isMobile && { justifyContent: "center", width: "100%" }]}
              onPress={() => router.push("/client/workouts")}
              activeOpacity={0.8}
            >
              <Icon name="running-2" size={17} color={Colors.text} strokeWidth={1.75} />
              <Text style={styles.heroSecondaryBtnText}>
                {activePlan ? "View Workout Plan" : "Generate AI Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stylized Human Athlete Vector Art */}
        <View
          style={[
            styles.heroVectorArt,
            isMobile && { width: "100%", opacity: 0.20 },
          ]}
          pointerEvents="none"
        >
          <Image
            source={require("../../assets/vector-athlete-lift.jpg")}
            style={styles.heroAthleteImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={isMobile ? ["#0e0f13", "rgba(14, 15, 19, 0.8)", "rgba(14, 15, 19, 0.3)"] : ["#0e0f13", "rgba(14, 15, 19, 0.45)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      {/* 4. PERFORMANCE TELEMETRY GRID (4 key metrics) */}
      <View style={styles.telemetryGrid}>
        <Card variant="glass" style={styles.telemetryCard}>
          <View style={styles.telemetryTop}>
            <Text style={styles.telemetryLabel}>Total Sessions</Text>
            <View style={styles.telemetryIcon}>
              <Icon name="dumbbell-large" size={14} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.telemetryValue}>{stats.sessions}</Text>
          <Text style={styles.telemetrySub}>Completed workouts</Text>
        </Card>

        <Card variant="glass" style={styles.telemetryCard}>
          <View style={styles.telemetryTop}>
            <Text style={styles.telemetryLabel}>Current Weight</Text>
            <View style={styles.telemetryIcon}>
              <Icon name="ranking" size={14} color={Colors.primary} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
            <Text style={styles.telemetryValue}>
              {currentWeight ? currentWeight : "—"}
            </Text>
            {currentWeight && <Text style={styles.telemetryUnit}>kg</Text>}
          </View>
          <Text style={styles.telemetrySub}>
            {profile?.target_weight_kg ? `Target: ${profile.target_weight_kg} kg` : "Daily tracked"}
          </Text>
        </Card>

        <Card variant="glass" style={styles.telemetryCard}>
          <View style={styles.telemetryTop}>
            <Text style={styles.telemetryLabel}>Body Mass Index</Text>
            <View style={styles.telemetryIcon}>
              <Icon name="heart" size={14} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.telemetryValue}>{bmi ? bmi : "—"}</Text>
          <Text style={styles.telemetrySub}>
            {bmi ? (Number(bmi) < 25 ? "Optimal Range" : "High Performance") : "Set height & weight"}
          </Text>
        </Card>

        <Card variant="glass" style={styles.telemetryCard}>
          <View style={styles.telemetryTop}>
            <Text style={styles.telemetryLabel}>Active Bookings</Text>
            <View style={styles.telemetryIcon}>
              <Icon name="pin" size={14} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.telemetryValue}>{upcomingReservations.length}</Text>
          <Text style={styles.telemetrySub}>
            {upcomingReservations.length > 0 ? "Slots reserved" : "No queue"}
          </Text>
        </Card>
      </View>

      {/* 5. NEXT UPCOMING RESERVATIONS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Equipment Schedule</Text>
          <TouchableOpacity onPress={() => router.push("/client/equipment")} activeOpacity={0.7}>
            <Text style={styles.sectionAction}>Browse All →</Text>
          </TouchableOpacity>
        </View>

        {futureRes.length === 0 && !activeRes ? (
          <Card variant="glass" style={styles.emptyCard}>
            <View style={{ marginBottom: Spacing.md, opacity: 0.85 }}>
              <GymStationVector width={160} height={120} opacity={0.65} />
            </View>
            <Text style={styles.emptyTitle}>No scheduled machine slots</Text>
            <Text style={styles.emptyText}>
              Reserve a station in advance to avoid waiting on the gym floor.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/client/equipment")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Book A Machine</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          futureRes.slice(0, 3).map((res) => {
            const timing = getReservationState(res, now);
            const pillColor = timing.is5MinBeforeStart ? "#FCD34D" : Colors.primary;
            const pillLabel = timing.is5MinBeforeStart ? "Ready in 5m" : "Confirmed";
            const eq = equipmentMap[res.equipment_id];

            return (
              <Card key={res.id} variant="glass" style={styles.reservationCard}>
                <View style={styles.reservationRow}>
                  <View style={styles.reservationIconWrap}>
                    <Icon name="dumbbells" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.reservationInfo}>
                    <Text style={styles.reservationTitle}>
                      {eq?.name || "Fitness Equipment"}
                    </Text>
                    <Text style={styles.reservationTime}>
                      {res.reservation_date} • {formatTime(res.start_time)} – {formatTime(res.end_time)}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: pillColor }]} />
                    <Text style={[styles.statusPillText, { color: pillColor }]}>{pillLabel}</Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* 6. ATHLETIC WEIGHT PROGRESS GRAPH */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Body Composition & Weight Trend</Text>
          <TouchableOpacity onPress={() => setShowDailyModal(true)} activeOpacity={0.7}>
            <Text style={styles.sectionAction}>+ Log Metric</Text>
          </TouchableOpacity>
        </View>

        <Card variant="glassElevated" style={{ padding: Spacing.lg, borderRadius: Radius.xl }}>
          {prepareChartData() ? (
            <>
              <LineChart
                data={prepareChartData()!}
                width={chartWidth}
                height={220}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: Colors.surface,
                  backgroundGradientTo: Colors.surface,
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
                  labelColor: (opacity = 1) => Colors.textSecondary,
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
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
                    Progress up to this check-in:
                  </Text>
                  <View style={styles.pointStats}>
                    <View style={styles.pointStatItem}>
                      <Text style={styles.pointStatValue}>{selectedPoint.sessions}</Text>
                      <Text style={styles.pointStatLabel}>Sessions Completed</Text>
                    </View>
                    <View style={styles.pointDivider} />
                    <View style={styles.pointStatItem}>
                      <Text style={styles.pointStatValue}>{selectedPoint.time}</Text>
                      <Text style={styles.pointStatLabel}>Gym Time</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyChart}>
              <View style={styles.emptyChartIconWrap}>
                <Icon name="ranking" size={24} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Track your body transformation</Text>
              <Text style={styles.emptyText}>
                Log your daily or weekly weight to visualize your progress trajectory.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowDailyModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>Record First Metric</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </View>

      {/* 7. NOTIFICATIONS */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Club Updates</Text>
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
    backgroundColor: "transparent",
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  name: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
    fontFamily: Typography.fontFamily.sans,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: Typography.fontFamily.sans,
    fontWeight: "500",
  },
  notifBtn: {
    position: "relative",
    padding: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: Radius.lg,
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0A0A0C",
  },
  notifCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Hero Status Banner
  heroBanner: {
    backgroundColor: "rgba(251, 191, 36, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  heroContent: {
    zIndex: 2,
    maxWidth: 580,
  },
  heroVectorArt: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "48%",
    maxWidth: 420,
    zIndex: 1,
    overflow: "hidden",
    borderTopRightRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroAthleteImg: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  heroTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm + 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(251, 191, 36, 0.14)",
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  liveText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  planPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: Radius.full,
  },
  planPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  heroHeadline: {
    color: Colors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: Spacing.lg,
    maxWidth: 680,
  },
  heroCTAButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
  },
  heroPrimaryBtnText: {
    color: "#0A0A0C",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  heroSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
  },
  heroSecondaryBtnText: {
    color: Colors.text,
    fontWeight: "600",
    fontSize: 14,
  },

  // Performance Telemetry Grid
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  telemetryCard: {
    flex: 1,
    minWidth: 135,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  telemetryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  telemetryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  telemetryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  telemetryUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  telemetrySub: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    fontWeight: "500",
  },

  // Sections
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Reservations
  reservationCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reservationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  reservationInfo: {
    flex: 1,
  },
  reservationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: 0.1,
  },
  reservationTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // Empty Card
  emptyCard: {
    padding: Spacing.xl,
    alignItems: "center",
    borderRadius: Radius.xl,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: Radius.md,
  },
  emptyButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  // Chart point details
  emptyChart: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyChartIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  pointDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  pointSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    marginBottom: Spacing.sm,
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
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  pointStatLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginTop: 2,
  },
  pointDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // Notifications
  notifCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 420,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  modalInputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalInputWrapper: {
    flex: 1,
  },
});
