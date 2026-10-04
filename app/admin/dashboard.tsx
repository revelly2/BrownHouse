// ============================================================================
// Admin Dashboard — Responsive Grid Layout (Premium Dark with Impeccable Polish)
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Animated,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ToastManager } from "../../components/ui/Toast";
import { Radius, Colors, Typography, Spacing } from "../../constants/colors";
import { getLocalDateString } from "../../lib/utils";
import { LineChart } from "react-native-chart-kit";
import {
  Calendar,
  SlidersHorizontal,
  LogOut,
  TrendingUp,
  UserPlus,
  PlusCircle,
  X,
  Check,
  Upload,
  Clock,
  Dumbbell,
  Users,
  Search,
} from "lucide-react-native";

// --- Animated Components ---

const FadeInView = ({ children, delay = 0, style, ...props }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]} {...props}>
      {children}
    </Animated.View>
  );
};

const PulseDot = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.pulseDot, 
        { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }
      ]} 
    />
  );
};

const TouchableCard = ({ children, style, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable 
      onPressIn={handlePressIn} 
      onPressOut={handlePressOut}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// --- Interfaces ---

interface DashboardStats {
  totalUsers: number;
  totalEquipment: number;
  activeReservations: number;
  completedSessions: number;
  equipmentAvailable: number;
  equipmentMaintenance: number;
}

interface RecentBooking {
  id: string;
  reservation_date: string;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  profile_picture_url: string | null;
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEquipment: 0,
    activeReservations: 0,
    completedSessions: 0,
    equipmentAvailable: 0,
    equipmentMaintenance: 0,
  });
  
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentMembers, setRecentMembers] = useState<Profile[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [refreshing, setRefreshing] = useState(false);

  // --- Create Member Modal State ---
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberModalTab, setMemberModalTab] = useState<"single" | "csv">("single");
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberPassword, setMemberPassword] = useState("password123");
  const [memberRole, setMemberRole] = useState("client");
  const [memberCsvText, setMemberCsvText] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // --- Create Reservation Modal State ---
  const [resModalVisible, setResModalVisible] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [allEquipmentList, setAllEquipmentList] = useState<any[]>([]);
  const [resClientId, setResClientId] = useState("");
  const [resEquipId, setResEquipId] = useState("");
  const [resDate, setResDate] = useState(getLocalDateString(new Date()));
  const [resSlot, setResSlot] = useState<{ start: string; end: string } | null>(null);
  const [resNotes, setResNotes] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [resSubmitting, setResSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [equipSearch, setEquipSearch] = useState("");

  const timeSlots = [
    { start: "06:30", end: "07:30" },
    { start: "07:30", end: "08:30" },
    { start: "08:30", end: "09:30" },
    { start: "09:30", end: "10:30" },
    { start: "10:30", end: "11:30" },
    { start: "11:30", end: "12:30" },
    { start: "12:30", end: "13:30" },
    { start: "13:30", end: "14:30" },
    { start: "14:30", end: "15:30" },
    { start: "15:30", end: "16:30" },
    { start: "16:30", end: "17:30" },
    { start: "17:30", end: "18:30" },
    { start: "18:30", end: "19:30" },
    { start: "19:30", end: "20:30" },
  ];

  const openReservationModal = async () => {
    setResModalVisible(true);
    setResSlot(null);
    setResNotes("");
    setClientSearch("");
    setEquipSearch("");
    const todayStr = getLocalDateString(new Date());
    setResDate(todayStr);

    const [clientsRes, equipRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, role").order("first_name"),
      supabase.from("equipment").select("id, name, type, status").order("name"),
    ]);

    if (clientsRes.data) {
      setAllClients(clientsRes.data);
      if (clientsRes.data.length > 0) {
        setResClientId(clientsRes.data[0].id);
      }
    }
    if (equipRes.data) {
      setAllEquipmentList(equipRes.data);
      if (equipRes.data.length > 0) {
        setResEquipId(equipRes.data[0].id);
      }
    }
  };

  useEffect(() => {
    if (!resEquipId || !resDate || !resModalVisible) return;
    const fetchBooked = async () => {
      const { data } = await supabase
        .from("reservations")
        .select("start_time")
        .eq("equipment_id", resEquipId)
        .eq("reservation_date", resDate)
        .eq("status", "confirmed");
      if (data) {
        setBookedSlots(data.map((r) => r.start_time.slice(0, 5)));
      }
    };
    fetchBooked();
  }, [resEquipId, resDate, resModalVisible]);

  const handleCreateMember = async () => {
    if (!memberFirstName.trim() || !memberLastName.trim()) {
      ToastManager.show("Required", "Please provide first and last name.", "error");
      return;
    }
    if (!memberEmail.trim()) {
      ToastManager.show("Required", "Please provide a valid email address.", "error");
      return;
    }

    setMemberSubmitting(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await tempClient.auth.signUp({
        email: memberEmail.trim(),
        password: memberPassword.trim() || "password123",
        options: {
          data: {
            first_name: memberFirstName.trim(),
            last_name: memberLastName.trim(),
            role: memberRole,
          },
        },
      });

      if (error) {
        ToastManager.show("Error", error.message, "error");
        setMemberSubmitting(false);
        return;
      }

      if (data.user?.id && memberPhone.trim()) {
        await supabase
          .from("profiles")
          .update({ phone_number: memberPhone.trim() })
          .eq("id", data.user.id);
      }

      ToastManager.show(
        "Success",
        `Created member: ${memberFirstName} ${memberLastName}`,
        "success"
      );
      setMemberModalVisible(false);
      setMemberFirstName("");
      setMemberLastName("");
      setMemberEmail("");
      setMemberPhone("");
      setMemberPassword("password123");
      setMemberRole("client");
      fetchStats();
    } catch (e: any) {
      ToastManager.show("Error", e.message || "Failed to create member.", "error");
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleImportCsv = async () => {
    if (!memberCsvText.trim()) {
      ToastManager.show("Required", "Please paste CSV lines first.", "error");
      return;
    }

    setMemberSubmitting(true);
    const lines = memberCsvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let successCount = 0;
    let failCount = 0;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    for (const line of lines) {
      if (line.toLowerCase().startsWith("first_name") || line.toLowerCase().startsWith("firstname")) {
        continue;
      }
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const [fn, ln, em, ph, ro] = parts;
        try {
          const { data, error } = await tempClient.auth.signUp({
            email: em,
            password: "password123",
            options: {
              data: {
                first_name: fn,
                last_name: ln,
                role: ro || "client",
              },
            },
          });
          if (error) {
            failCount++;
          } else {
            successCount++;
            if (data.user?.id && ph) {
              await supabase
                .from("profiles")
                .update({ phone_number: ph })
                .eq("id", data.user.id);
            }
          }
        } catch {
          failCount++;
        }
      }
    }

    setMemberSubmitting(false);
    if (successCount > 0) {
      ToastManager.show(
        "Import Finished",
        `Added ${successCount} member${successCount > 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}.`,
        "success"
      );
      setMemberModalVisible(false);
      setMemberCsvText("");
      fetchStats();
    } else {
      ToastManager.show("Error", "Could not import rows. Check format: First,Last,Email", "error");
    }
  };

  const handleCreateReservation = async () => {
    if (!resClientId) {
      ToastManager.show("Required", "Please choose a member.", "error");
      return;
    }
    if (!resEquipId) {
      ToastManager.show("Required", "Please choose gym equipment.", "error");
      return;
    }
    if (!resDate) {
      ToastManager.show("Required", "Please select a date.", "error");
      return;
    }
    if (!resSlot) {
      ToastManager.show("Required", "Please select a time slot.", "error");
      return;
    }

    setResSubmitting(true);
    try {
      const { data: clash } = await supabase
        .from("reservations")
        .select("id")
        .eq("equipment_id", resEquipId)
        .eq("reservation_date", resDate)
        .eq("start_time", resSlot.start)
        .eq("status", "confirmed");

      if (clash && clash.length > 0) {
        ToastManager.show("Slot Taken", "This equipment is already booked for this slot.", "error");
        setResSubmitting(false);
        return;
      }

      const { error } = await supabase.from("reservations").insert({
        client_id: resClientId,
        equipment_id: resEquipId,
        reservation_date: resDate,
        start_time: resSlot.start,
        end_time: resSlot.end,
        status: "confirmed",
        notes: resNotes.trim() || "Manual booking by Admin",
      });

      if (error) {
        ToastManager.show("Error", error.message, "error");
      } else {
        ToastManager.show("Success", "Reservation confirmed!", "success");
        setResModalVisible(false);
        fetchStats();
      }
    } catch (e: any) {
      ToastManager.show("Error", e.message || "Failed to book reservation.", "error");
    } finally {
      setResSubmitting(false);
    }
  };

  const fetchStats = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const dateStr = getLocalDateString(sevenDaysAgo);

    const [users, equipment, reservations, sessions, recentRes, trendRes, recentMems] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("equipment").select("id, status, type"),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase
        .from("completed_sessions")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("reservations")
        .select("id, reservation_date, status, profiles(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("reservations")
        .select("reservation_date")
        .gte("reservation_date", dateStr),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, created_at")
        .order("created_at", { ascending: false })
        .limit(4)
    ]);

    const equipData = equipment.data ?? [];

    setStats({
      totalUsers: users.count ?? 0,
      totalEquipment: equipData.length,
      activeReservations: reservations.count ?? 0,
      completedSessions: sessions.count ?? 0,
      equipmentAvailable: equipData.filter((e) => e.status === "available").length,
      equipmentMaintenance: equipData.filter((e) => e.status === "maintenance").length,
    });

    if (recentRes.data) setRecentBookings(recentRes.data as any[]);
    if (recentMems.data) setRecentMembers(recentMems.data as any[]);

    if (trendRes.data) {
      const counts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = getLocalDateString(d);
        counts[dStr] = 0;
      }
      trendRes.data.forEach((r) => {
        if (counts[r.reservation_date] !== undefined) {
          counts[r.reservation_date]++;
        }
      });
      const sortedKeys = Object.keys(counts).sort();
      const labels = sortedKeys.map(d => {
        const dateObj = new Date(d);
        return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      });
      const data = sortedKeys.map(d => counts[d]);
      setWeeklyTrend({ labels, data });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const [activeFilter, setActiveFilter] = useState("12 months");

  const contentMaxWidth = 1400;
  const paddingHorizontal = Spacing.xl * 2; // 48
  const rightColumnWidth = 320;
  const columnGap = Spacing["3xl"]; // 40

  let calculatedChartWidth = width - paddingHorizontal;
  if (calculatedChartWidth > contentMaxWidth - paddingHorizontal) {
    calculatedChartWidth = contentMaxWidth - paddingHorizontal;
  }
  if (isDesktop) {
    calculatedChartWidth = calculatedChartWidth - rightColumnWidth - columnGap;
  }

  return (
    <>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Top Header Section */}
      <FadeInView delay={0} style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <View style={styles.headerActions}>
          <View style={styles.filterSegment}>
            {["12 months", "30 days", "7 days", "24 hours"].map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[styles.segmentBtn, activeFilter === filter && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, activeFilter === filter && styles.segmentTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.actionBtn}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.actionBtnText}>Aug 16, 2026 – Aug 16, 2027</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <SlidersHorizontal size={16} color={Colors.textSecondary} />
            <Text style={styles.actionBtnText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={signOut}>
            <LogOut size={16} color={Colors.error || "#EF4444"} />
            <Text style={[styles.actionBtnText, { color: Colors.error || "#EF4444" }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </FadeInView>

      {/* Main Grid */}
      <View style={[styles.mainGrid, !isDesktop && styles.mainGridMobile]}>
        
        {/* LEFT COLUMN */}
        <View style={styles.leftColumn}>
          
          {/* Chart Section */}
          <FadeInView delay={100} style={styles.chartContainer}>
            <Text style={styles.sectionTitleSmall}>Active Bookings (Trend)</Text>
            {calculatedChartWidth > 0 && weeklyTrend.data.length > 0 ? (
              <View style={{ marginTop: Spacing.xl }}>
                <LineChart
                  data={{
                    labels: weeklyTrend.labels,
                    datasets: [{ data: weeklyTrend.data }],
                  }}
                  width={calculatedChartWidth}
                  height={220}
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFrom: "transparent",
                    backgroundGradientTo: "transparent",
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(119, 129, 141, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: Colors.primaryDark,
                    },
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                />
              </View>
            ) : (
              <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: Colors.textTertiary }}>Loading chart...</Text>
              </View>
            )}
          </FadeInView>

          {/* Quick Actions */}
          <FadeInView delay={200} style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={[styles.cardsRow, !isDesktop && styles.cardsRowMobile]}>
              <TouchableCard
                style={[styles.actionCard, { flex: 1 }]}
                onPress={() => setMemberModalVisible(true)}
              >
                <Card style={styles.actionCardInner}>
                  <View style={styles.actionCardIcon}>
                    <UserPlus size={20} color={Colors.text} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Create your first member</Text>
                    <Text style={styles.actionCardDesc}>Add yourself or import from CSV</Text>
                  </View>
                </Card>
              </TouchableCard>
              
              <TouchableCard
                style={[styles.actionCard, { flex: 1 }]}
                onPress={openReservationModal}
              >
                <Card style={styles.actionCardInner}>
                  <View style={styles.actionCardIcon}>
                    <PlusCircle size={20} color={Colors.text} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Create a new reservation</Text>
                    <Text style={styles.actionCardDesc}>Manually book a session for a user</Text>
                  </View>
                </Card>
              </TouchableCard>
            </View>
          </FadeInView>

          {/* List of Members (Recent) */}
          <FadeInView delay={300} style={styles.sectionGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Members</Text>
              <TouchableOpacity onPress={() => router.push("/admin/users")}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.cardsRow, !isDesktop && styles.cardsRowMobile]}>
              {recentMembers.map((member) => (
                <Card key={member.id} style={styles.memberCard}>
                  <View style={styles.memberCardAvatar}>
                    {member.profile_picture_url ? (
                      <Image 
                        source={{ uri: member.profile_picture_url }} 
                        style={{ width: '100%', height: '100%', borderRadius: 24 }} 
                      />
                    ) : (
                      <Text style={styles.memberCardAvatarText}>{member.first_name.charAt(0) || "U"}</Text>
                    )}
                  </View>
                  <View style={styles.memberCardInfo}>
                    <Text style={styles.memberCardName} numberOfLines={1}>
                      {member.first_name} {member.last_name}
                    </Text>
                    <Text style={styles.memberCardDate}>Joined recently</Text>
                  </View>
                </Card>
              ))}
              {recentMembers.length === 0 && (
                <Text style={styles.emptyText}>No recent members</Text>
              )}
            </View>
          </FadeInView>

        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightColumn}>
          
          {/* Top Stats Summary */}
          <FadeInView delay={150} style={styles.statsSummary}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total members</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
                <View style={styles.trendPill}>
                  <TrendingUp size={12} color={Colors.success} />
                  <Text style={styles.trendText}>+9.2%</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active Reservations</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.activeReservations.toLocaleString()}</Text>
                <View style={styles.trendPill}>
                  <TrendingUp size={12} color={Colors.success} />
                  <Text style={styles.trendText}>+6.6%</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completed Sessions</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.completedSessions.toLocaleString()}</Text>
                <View style={styles.trendPill}>
                  <TrendingUp size={12} color={Colors.success} />
                  <Text style={styles.trendText}>+8.1%</Text>
                </View>
              </View>
            </View>
          </FadeInView>

          {/* Live Logs */}
          <FadeInView delay={250} style={styles.logsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionTitleSmall}>Live Logs</Text>
                <PulseDot />
              </View>
            </View>
            
            <View style={styles.logsList}>
              {/* Synthetic "System" log to feel alive */}
              <View style={styles.logRow}>
                <View style={[styles.logIndicator, { backgroundColor: Colors.info }]} />
                <View style={styles.logInfo}>
                  <Text style={styles.logText}>
                    <Text style={styles.logHighlight}>System</Text> Health check passed
                  </Text>
                  <Text style={styles.logTime}>Just now</Text>
                </View>
              </View>
              
              {recentBookings.map((booking, i) => (
                <View key={booking.id} style={styles.logRow}>
                  <View style={[
                    styles.logIndicator, 
                    { backgroundColor: booking.status === 'confirmed' ? Colors.success : Colors.warning }
                  ]} />
                  <View style={styles.logInfo}>
                    <Text style={styles.logText}>
                      <Text style={styles.logHighlight}>{booking.profiles?.first_name} {booking.profiles?.last_name}</Text> booked a session
                    </Text>
                    <Text style={styles.logTime}>{booking.reservation_date}</Text>
                  </View>
                </View>
              ))}
              
              {recentBookings.length === 0 && (
                <Text style={styles.emptyText}>No recent activity.</Text>
              )}
            </View>
          </FadeInView>
          
        </View>

      </View>
      <View style={{ height: Spacing['4xl'] }} />
    </ScrollView>

      {/* ========================================================================= */}
      {/* Create / Import Member Modal */}
      {/* ========================================================================= */}
      <Modal
        visible={memberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Member</Text>
                <Text style={styles.modalSubtitle}>Register a user or import via CSV</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMemberModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.modalTabs}>
              <TouchableOpacity
                style={[styles.modalTab, memberModalTab === "single" && styles.modalTabActive]}
                onPress={() => setMemberModalTab("single")}
              >
                <UserPlus size={16} color={memberModalTab === "single" ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.modalTabText, memberModalTab === "single" && styles.modalTabTextActive]}>
                  Single Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, memberModalTab === "csv" && styles.modalTabActive]}
                onPress={() => setMemberModalTab("csv")}
              >
                <Upload size={16} color={memberModalTab === "csv" ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.modalTabText, memberModalTab === "csv" && styles.modalTabTextActive]}>
                  Import CSV
                </Text>
              </TouchableOpacity>
            </View>

            {memberModalTab === "single" ? (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: Spacing.sm }}>
                  <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>First Name *</Text>
                      <Input
                        placeholder="John"
                        value={memberFirstName}
                        onChangeText={setMemberFirstName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Last Name *</Text>
                      <Input
                        placeholder="Doe"
                        value={memberLastName}
                        onChangeText={setMemberLastName}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <Input
                    placeholder="john.doe@example.com"
                    value={memberEmail}
                    onChangeText={setMemberEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <Input
                    placeholder="09123456789"
                    value={memberPhone}
                    onChangeText={setMemberPhone}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Temporary Password</Text>
                  <Input
                    placeholder="password123"
                    value={memberPassword}
                    onChangeText={setMemberPassword}
                    secureTextEntry
                  />

                  <Text style={styles.inputLabel}>System Role</Text>
                  <View style={styles.rolePickerRow}>
                    {["client", "trainer", "cashier", "admin"].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleChip, memberRole === r && styles.roleChipActive]}
                        onPress={() => setMemberRole(r)}
                      >
                        <Text style={[styles.roleChipText, memberRole === r && styles.roleChipTextActive]}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={{ gap: Spacing.md, marginVertical: Spacing.sm }}>
                <Text style={styles.csvHelperText}>
                  Paste rows below in the format:{"\n"}
                  <Text style={{ fontFamily: Platform.OS === "web" ? "monospace" : undefined, color: Colors.primary }}>
                    FirstName,LastName,Email,Phone,Role
                  </Text>
                </Text>
                <TextInput
                  style={styles.csvTextArea}
                  placeholder={`John,Doe,john@example.com,09123456789,client\nJane,Smith,jane@example.com,09876543210,client`}
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={6}
                  value={memberCsvText}
                  onChangeText={setMemberCsvText}
                />
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setMemberModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={memberSubmitting ? "Processing..." : memberModalTab === "single" ? "Create Member" : "Import CSV"}
                variant="primary"
                onPress={memberModalTab === "single" ? handleCreateMember : handleImportCsv}
                disabled={memberSubmitting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* Create Reservation Modal */}
      {/* ========================================================================= */}
      <Modal
        visible={resModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 620 }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Reservation</Text>
                <Text style={styles.modalSubtitle}>Book equipment session on behalf of a user</Text>
              </View>
              <TouchableOpacity
                onPress={() => setResModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: Spacing.md, paddingVertical: Spacing.xs }}>
                {/* 1. Member Picker */}
                <View>
                  <Text style={styles.inputLabel}>1. Select Member *</Text>
                  <Input
                    placeholder="Search member name..."
                    value={clientSearch}
                    onChangeText={setClientSearch}
                    containerStyle={{ marginBottom: Spacing.xs }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginTop: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {allClients
                        .filter((c) =>
                          `${c.first_name} ${c.last_name}`
                            .toLowerCase()
                            .includes(clientSearch.toLowerCase())
                        )
                        .slice(0, 15)
                        .map((c) => {
                          const isSel = resClientId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.memberSelectChip, isSel && styles.memberSelectChipActive]}
                              onPress={() => setResClientId(c.id)}
                            >
                              <Users size={12} color={isSel ? Colors.primaryDark : Colors.textSecondary} />
                              <Text style={[styles.memberSelectText, isSel && styles.memberSelectTextActive]}>
                                {c.first_name} {c.last_name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </ScrollView>
                </View>

                {/* 2. Equipment Picker */}
                <View>
                  <Text style={styles.inputLabel}>2. Select Equipment *</Text>
                  <Input
                    placeholder="Filter machines (e.g. Treadmill, Bench)..."
                    value={equipSearch}
                    onChangeText={setEquipSearch}
                    containerStyle={{ marginBottom: Spacing.xs }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginTop: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {allEquipmentList
                        .filter((e) => e.name.toLowerCase().includes(equipSearch.toLowerCase()))
                        .map((e) => {
                          const isSel = resEquipId === e.id;
                          return (
                            <TouchableOpacity
                              key={e.id}
                              style={[
                                styles.memberSelectChip,
                                isSel && styles.memberSelectChipActive,
                                e.status === "maintenance" && { opacity: 0.5 },
                              ]}
                              onPress={() => setResEquipId(e.id)}
                            >
                              <Dumbbell size={12} color={isSel ? Colors.primaryDark : Colors.textSecondary} />
                              <Text style={[styles.memberSelectText, isSel && styles.memberSelectTextActive]}>
                                {e.name} ({e.status})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </ScrollView>
                </View>

                {/* 3. Date & Time */}
                <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>3. Date (YYYY-MM-DD) *</Text>
                    <Input
                      placeholder="YYYY-MM-DD"
                      value={resDate}
                      onChangeText={setResDate}
                    />
                  </View>
                </View>

                {/* 4. Time Slot Grid */}
                <View>
                  <Text style={styles.inputLabel}>4. Select Time Slot *</Text>
                  <View style={styles.slotGrid}>
                    {timeSlots.map((slot) => {
                      const isBooked = bookedSlots.includes(slot.start);
                      const isSelected = resSlot?.start === slot.start;
                      return (
                        <TouchableOpacity
                          key={slot.start}
                          style={[
                            styles.slotBtn,
                            isSelected && styles.slotBtnSelected,
                            isBooked && styles.slotBtnBooked,
                          ]}
                          disabled={isBooked}
                          onPress={() => setResSlot(slot)}
                        >
                          <Clock
                            size={12}
                            color={
                              isBooked
                                ? Colors.textTertiary
                                : isSelected
                                ? Colors.primaryDark
                                : Colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.slotText,
                              isSelected && styles.slotTextSelected,
                              isBooked && styles.slotTextBooked,
                            ]}
                          >
                            {slot.start} - {slot.end}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 5. Notes */}
                <View>
                  <Text style={styles.inputLabel}>5. Notes (Optional)</Text>
                  <Input
                    placeholder="Walk-in, assisted session, trainer notes..."
                    value={resNotes}
                    onChangeText={setResNotes}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setResModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={resSubmitting ? "Booking..." : "Confirm Reservation"}
                variant="primary"
                onPress={handleCreateReservation}
                disabled={resSubmitting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing["2xl"],
    paddingBottom: 120,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  
  /* --- Header --- */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing["3xl"],
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
    ...Platform.select({
      web: {
        boxShadow: "0px 1px 2px rgba(0,0,0,0.2)",
      } as any,
    }),
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.text,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },

  /* --- Main Grid --- */
  mainGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing["3xl"],
  },
  mainGridMobile: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
    gap: Spacing["4xl"],
  },
  rightColumn: {
    width: 320,
    gap: Spacing["4xl"],
    ...Platform.select({
      default: {
        width: '100%',
      },
      web: {
        width: 320,
      }
    }),
  },
  
  /* --- Chart Section --- */
  chartContainer: {
    width: '100%',
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  /* --- Section Titles --- */
  sectionGroup: {
    gap: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  /* --- Quick Actions (Cards Row) --- */
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    flexWrap: 'wrap',
  },
  cardsRowMobile: {
    flexDirection: 'column',
  },
  actionCard: {
    // Handled by inline flex style in component
  },
  actionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: "100%",
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  actionCardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  /* --- Member Cards --- */
  memberCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  memberCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251, 191, 36, 0.1)", // Primary tinted
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCardAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  memberCardInfo: {
    flex: 1,
  },
  memberCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  memberCardDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* --- Top Stats --- */
  statsSummary: {
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statItem: {
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -1,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
  },

  /* --- Live Logs --- */
  logsSection: {
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    ...Platform.select({
      web: {
        boxShadow: `0px 0px 8px ${Colors.success}`,
      } as any,
    }),
  },
  logsList: {
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  logIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  logInfo: {
    flex: 1,
  },
  logText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  logHighlight: {
    fontWeight: "700",
    color: Colors.text,
  },
  logTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  /* --- Modals --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  modalTabActive: {
    backgroundColor: Colors.surface,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  modalTabTextActive: {
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  roleChipActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: Colors.primary,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  roleChipTextActive: {
    color: Colors.primary,
  },
  csvHelperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  csvTextArea: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  memberSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  memberSelectChipActive: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderColor: Colors.primary,
  },
  memberSelectText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  memberSelectTextActive: {
    color: Colors.primary,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  slotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  slotBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotBtnBooked: {
    opacity: 0.35,
    backgroundColor: Colors.surface,
  },
  slotText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  slotTextSelected: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  slotTextBooked: {
    color: Colors.textTertiary,
    textDecorationLine: "line-through",
  },
});
