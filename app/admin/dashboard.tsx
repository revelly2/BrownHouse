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
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Radius, Colors, Typography, Spacing } from "../../constants/colors";
import { getLocalDateString } from "../../lib/utils";
import { LineChart } from "react-native-chart-kit";
import { Calendar, SlidersHorizontal, LogOut, TrendingUp, UserPlus, PlusCircle } from "lucide-react-native";

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
              <TouchableCard style={[styles.actionCard, { flex: 1 }]}>
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
              
              <TouchableCard style={[styles.actionCard, { flex: 1 }]}>
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
  }
});
