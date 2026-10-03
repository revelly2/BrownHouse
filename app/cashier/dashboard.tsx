// ============================================================================
// Cashier Dashboard — Responsive Grid Layout (Premium Dark with Impeccable Polish)
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
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Radius, Colors, Typography, Spacing } from "../../constants/colors";
import { getLocalDateString } from "../../lib/utils";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ToastManager } from "../../components/ui/Toast";
import { LineChart } from "react-native-chart-kit";

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

interface CashierStats {
  totalRevenue: number;
  activeMemberships: number;
  expiringSoon: number;
}

interface PaymentLog {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  payment_date: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface ClientMembership {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "cancelled";
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url: string | null;
  };
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function CashierScreen() {
  const { profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;

  const [stats, setStats] = useState<CashierStats>({
    totalRevenue: 0,
    activeMemberships: 0,
    expiringSoon: 0,
  });
  
  const [recentPayments, setRecentPayments] = useState<PaymentLog[]>([]);
  const [activeMembershipsList, setActiveMembershipsList] = useState<ClientMembership[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("12 months");
  
  // App Settings & Membership
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [standardPlan, setStandardPlan] = useState<any>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  
  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductAmount, setCustomProductAmount] = useState("");
  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: string} | null>(null);

  // Member Details State
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<ClientMembership | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchStats = async () => {
    const now = new Date().toISOString();
    await supabase
      .from("client_memberships")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("end_date", now);

    const [paymentsRes, activeRes, expiringRes, recentPayRes, memRes, usersRes, settingsRes, planRes, allActiveMembershipsRes, productsRes] = await Promise.all([
      supabase.from("payments").select("amount").eq("status", "completed"),
      supabase.from("client_memberships").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("client_memberships").select("*", { count: "exact", head: true }).eq("status", "active").lt("end_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("payments").select("id, amount, payment_method, payment_type, payment_date, profiles!client_id(first_name, last_name)").order("payment_date", { ascending: false }).limit(8),
      supabase.from("client_memberships").select("*, profile:profiles(*)").order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("*").eq("role", "client"),
      supabase.from("app_settings").select("currency").eq("id", "global").single(),
      supabase.from("memberships").select("*").eq("name", "Standard 30 Days").single(),
      supabase.from("client_memberships").select("client_id").eq("status", "active"),
      supabase.from("products").select("*").order("name"),
    ]);

    if (paymentsRes.error) console.error("Payments Error:", paymentsRes.error);
    if (activeRes.error) console.error("Active Mem Error:", activeRes.error);
    if (expiringRes.error) console.error("Expiring Error:", expiringRes.error);
    if (recentPayRes.error) console.error("Recent Pay Error:", recentPayRes.error);
    if (memRes.error) console.error("Mem List Error:", memRes.error);
    if (usersRes.error) console.error("Users Error:", usersRes.error);

    const totalRev = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalRevenue: totalRev,
      activeMemberships: activeRes.count ?? 0,
      expiringSoon: expiringRes.count ?? 0,
    });

    if (recentPayRes.data) setRecentPayments(recentPayRes.data as any[]);
    if (memRes.data) setActiveMembershipsList(memRes.data as any[]);
    
    if (usersRes.data && allActiveMembershipsRes.data) {
      const activeClientIds = new Set(allActiveMembershipsRes.data.map(m => m.client_id));
      const filteredClients = usersRes.data.filter(u => !activeClientIds.has(u.id));
      setUsers(filteredClients);
    } else if (usersRes.data) {
      setUsers(usersRes.data);
    }
    
    if (settingsRes.data) {
      setCurrencySymbol(settingsRes.data.currency === "USD" ? "$" : "₱");
    }
    
    if (planRes.data) {
      setStandardPlan(planRes.data);
    } else {
      // Fallback if not exists yet
      setStandardPlan({ name: "Standard 30 Days", price: 50.0, duration_days: 30 });
    }

    if (productsRes && productsRes.data) {
      setProducts(productsRes.data);
    } else {
      // Fallback predefined products if table doesn't exist yet
      setProducts([
        { id: '1', name: 'Bottled Water', price: 20 },
        { id: '2', name: 'Energy Drink', price: 60 },
        { id: '3', name: 'Protein Shake', price: 120 },
        { id: '4', name: 'Gym Towel', price: 150 },
        { id: '5', name: 'Locker Padlock', price: 100 }
      ]);
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

  const createMembership = async () => {
    if (!selectedUser) return;
    setUpdating(true);

    const { data: existing } = await supabase
      .from("client_memberships")
      .select("id")
      .eq("client_id", selectedUser.id)
      .eq("status", "active")
      .maybeSingle();
      
    if (existing) {
      ToastManager.show("Error", "User already has an active membership.", "error");
      setUpdating(false);
      return;
    }

    let { data: planData } = await supabase
      .from("memberships")
      .select("id, price")
      .eq("name", "Standard 30 Days")
      .single();

    if (!planData) {
      const { data: newPlan } = await supabase
        .from("memberships")
        .insert({ name: "Standard 30 Days", price: 50.0, duration_days: 30 })
        .select()
        .single();
      planData = newPlan;
    }

    if (!planData) {
      ToastManager.show("Error", "Could not create membership plan.", "error");
      setUpdating(false);
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const { error } = await supabase.from("client_memberships").insert({
      client_id: selectedUser.id,
      membership_id: planData.id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: "active",
    });

    if (error) {
      ToastManager.show("Error", error.message, "error");
    } else {
      await supabase.from("payments").insert({
        client_id: selectedUser.id,
        cashier_id: profile?.id,
        amount: planData.price,
        payment_method: "cash",
        payment_type: "membership",
        status: "completed",
      });
      ToastManager.show("Success", "Membership & Payment successful!", "success");
      setModalVisible(false);
      setSearchQuery("");
      setSelectedUser(null);
      fetchStats();
    }
    setUpdating(false);
  };

  const terminateMembership = async (membershipId: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("client_memberships")
      .update({ status: "cancelled", end_date: new Date().toISOString() })
      .eq("id", membershipId);
      
    if (error) {
      ToastManager.show("Error", error.message, "error");
    } else {
      ToastManager.show("Success", "Membership terminated.", "success");
      fetchStats();
    }
    setUpdating(false);
  };

  const addToCart = (item: { id: string, name: string, price: number }) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const addCustomProduct = () => {
    if (!customProductName.trim() || !customProductAmount.trim()) return;
    const price = parseFloat(customProductAmount);
    if (isNaN(price)) return;
    addToCart({ id: `custom-${Date.now()}`, name: customProductName, price });
    setCustomProductName("");
    setCustomProductAmount("");
  };

  const recordProductSale = async () => {
    if (cart.length === 0) {
      ToastManager.show("Error", "Cart is empty.", "error");
      return;
    }
    setUpdating(true);
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // We insert a payment record using the cashier's profile ID as the client_id to satisfy the NOT NULL constraint for walk-in sales
    const { error } = await supabase.from("payments").insert({
      client_id: profile?.id,
      cashier_id: profile?.id,
      amount: totalAmount,
      payment_method: "cash",
      payment_type: "product",
      status: "completed",
    });

    if (error) {
      ToastManager.show("Error", error.message, "error");
    } else {
      ToastManager.show("Success", "Sale recorded!", "success");
      setReceiptData({ items: [...cart], total: totalAmount, date: new Date().toISOString() });
      setCart([]);
      fetchStats();
    }
    setUpdating(false);
  };

  const printReceipt = () => {
    if (Platform.OS === 'web' && receiptData) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; padding: 20px; width: 300px; margin: 0 auto; color: #000; }
                h2 { text-align: center; margin-bottom: 5px; }
                p { text-align: center; margin-top: 0; font-size: 12px; }
                .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; }
                @media print {
                  @page { margin: 0; }
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              <h2>BROWNHOUSE GYM</h2>
              <p>Official Receipt</p>
              <p>Date: ${new Date(receiptData.date).toLocaleString()}</p>
              <div class="divider"></div>
              ${receiptData.items.map(item => `
                <div class="item">
                  <span>${item.qty}x ${item.name}</span>
                  <span>${currencySymbol}${(item.price * item.qty).toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="divider"></div>
              <div class="total">
                <span>TOTAL:</span>
                <span>${currencySymbol}${receiptData.total.toFixed(2)}</span>
              </div>
              <p style="margin-top: 20px;">Thank you for your purchase!</p>
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } else {
      ToastManager.show("Notice", "Printing is supported on the web version.", "info");
    }
  };

  const getGraphData = () => {
    switch(activeFilter) {
      case "12 months": return { labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"], data: [1200, 1900, 1500, 2200, 3100, stats.totalRevenue || 4050] };
      case "30 days": return { labels: ["1", "6", "12", "18", "24", "30"], data: [100, 150, 200, 180, 250, 450] };
      case "7 days": return { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: [50, 80, 60, 120, 90, 150, 110] };
      case "24 hours": return { labels: ["0h", "4h", "8h", "12h", "16h", "20h"], data: [10, 5, 25, 40, 35, 60] };
      default: return { labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"], data: [1200, 1900, 1500, 2200, 3100, 4050] };
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.first_name?.toLowerCase().includes(q) ?? false) ||
      (u.last_name?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

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
        <Text style={styles.pageTitle}>Cashier</Text>
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
        </View>
      </FadeInView>

      {/* Main Grid */}
      <View style={[styles.mainGrid, !isDesktop && styles.mainGridMobile]}>
        
        {/* LEFT COLUMN */}
        <View style={styles.leftColumn}>
          
          {/* Quick Actions */}
          <FadeInView delay={100} style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>Sales Management</Text>
            <View style={[styles.cardsRow, !isDesktop && styles.cardsRowMobile]}>
              <TouchableCard style={[styles.actionCard, { flex: 1 }]} onPress={() => { setModalVisible(true); setSearchQuery(""); }}>
                <Card style={styles.actionCardInner}>
                  <View style={styles.actionCardIcon}>
                    <Icon name="clipboard" size={20} color={Colors.text} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Sell Membership</Text>
                    <Text style={styles.actionCardDesc}>Renew or create new membership</Text>
                  </View>
                </Card>
              </TouchableCard>
              
              <TouchableCard style={[styles.actionCard, { flex: 1 }]} onPress={() => setProductModalVisible(true)}>
                <Card style={styles.actionCardInner}>
                  <View style={styles.actionCardIcon}>
                    <Icon name="checklist" size={20} color={Colors.text} />
                  </View>
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Record Product Sale</Text>
                    <Text style={styles.actionCardDesc}>Water, supplements, etc.</Text>
                  </View>
                </Card>
              </TouchableCard>
            </View>
          </FadeInView>

          {/* Memberships List */}
          <FadeInView delay={200} style={styles.sectionGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Members with Memberships</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: Spacing.md }}>
              {activeMembershipsList.map((membership) => {
                const daysLeft = Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const prof = membership.profile;
                return (
                  <TouchableCard key={membership.id} onPress={() => setSelectedMemberDetails(membership)}>
                    <Card style={styles.membershipCard}>
                      <View style={styles.membershipCardLeft}>
                        <View style={styles.membershipCardAvatar}>
                          {prof?.profile_picture_url ? (
                            <Image 
                              source={{ uri: prof.profile_picture_url }} 
                              style={{ width: '100%', height: '100%', borderRadius: 20 }} 
                            />
                          ) : (
                            <Text style={styles.membershipCardAvatarText}>{prof?.first_name?.charAt(0) || "U"}</Text>
                          )}
                        </View>
                        <View>
                          <Text style={styles.membershipCardName}>
                            {prof?.first_name} {prof?.last_name}
                          </Text>
                          <Text style={styles.membershipCardDate}>Ends: {new Date(membership.end_date).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={styles.membershipCardRight}>
                        {membership.status === 'active' ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                            <View style={[styles.trendPill, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                               <Text style={[styles.trendText, { color: Colors.success }]}>
                                {daysLeft > 0 ? `${daysLeft} days left` : "Expires today"}
                               </Text>
                            </View>
                            <TouchableOpacity 
                              onPress={() => terminateMembership(membership.id)}
                              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm }}
                            >
                               <Text style={{ color: Colors.error, fontSize: 11, fontWeight: "700" }}>Terminate</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={[styles.trendPill, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                             <Text style={[styles.trendText, { color: Colors.error }]}>Expired</Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  </TouchableCard>
                );
              })}
              {activeMembershipsList.length === 0 && (
                <Text style={styles.emptyText}>No active memberships found.</Text>
              )}
            </View>
          </FadeInView>

        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightColumn}>
          
          {/* Top Stats Summary */}
          <FadeInView delay={150} style={styles.statsSummary}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{currencySymbol}{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <View style={styles.trendPill}>
                  <Icon name="trending-up" size={12} color={Colors.success} />
                  <Text style={styles.trendText}>+12.4%</Text>
                </View>
              </View>
              
              <View style={{ marginTop: Spacing.md, marginHorizontal: -10, paddingBottom: Spacing.sm }}>
                <LineChart
                  data={{
                    labels: getGraphData().labels,
                    datasets: [{ data: getGraphData().data }]
                  }}
                  width={300}
                  height={170}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={false}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: Colors.surfaceElevated,
                    backgroundGradientTo: Colors.surfaceElevated,
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: (opacity = 1) => Colors.primary,
                    labelColor: (opacity = 1) => Colors.textSecondary,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.primary },
                    propsForLabels: { fontSize: 11, dx: -5, dy: 5 }
                  }}
                  bezier
                  style={{ borderRadius: 16, paddingRight: 0, paddingBottom: 10 }}
                />
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active Memberships</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.activeMemberships.toLocaleString()}</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expiring Soon (7 days)</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.expiringSoon.toLocaleString()}</Text>
                {stats.expiringSoon > 0 && (
                  <View style={[styles.trendPill, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                    <Text style={[styles.trendText, { color: Colors.error }]}>Action needed</Text>
                  </View>
                )}
              </View>
            </View>
          </FadeInView>

          {/* Recent Logs */}
          <FadeInView delay={250} style={styles.logsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionTitleSmall}>System Logs</Text>
                <PulseDot />
              </View>
              <TouchableOpacity onPress={() => router.push("/cashier/logs")}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.logsList}>
              {recentPayments.map((payment) => (
                <View key={payment.id} style={styles.logRow}>
                  <View style={[styles.logIndicator, { backgroundColor: Colors.success }]} />
                  <View style={styles.logInfo}>
                    {payment.payment_type === 'product' || !payment.profiles ? (
                      <Text style={styles.logText}>
                        <Text style={styles.logHighlight}>Product sale</Text> recorded for {currencySymbol}{Number(payment.amount).toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={styles.logText}>
                        <Text style={styles.logHighlight}>{payment.profiles?.first_name} {payment.profiles?.last_name}</Text> paid {currencySymbol}{Number(payment.amount).toFixed(2)} for membership
                      </Text>
                    )}
                    <Text style={styles.logTime}>{new Date(payment.payment_date).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
              
              {recentPayments.length === 0 && (
                <Text style={styles.emptyText}>No recent payments.</Text>
              )}
            </View>
          </FadeInView>
          
        </View>

      </View>
      <View style={{ height: Spacing['4xl'] }} />

      {/* Modal for adding membership */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Client to Sell Membership</Text>
            
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={{ marginBottom: Spacing.md }}
            />
            
            <ScrollView style={styles.userList}>
              {filteredUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.userSelectItem,
                    selectedUser?.id === u.id && styles.userSelectItemSelected,
                  ]}
                  onPress={() => setSelectedUser(u)}
                >
                  <Text style={styles.userSelectText}>
                    {u.first_name} {u.last_name}
                  </Text>
                  {u.email && (
                    <Text style={styles.userSelectEmail}>{u.email}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => { setModalVisible(false); setSearchQuery(""); }}
                style={styles.modalBtn}
              />
              <Button
                title={updating ? "Processing..." : `Sell 30 Days (${currencySymbol}${standardPlan?.price || 50})`}
                onPress={createMembership}
                disabled={!selectedUser || updating}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for member details */}
      <Modal visible={!!selectedMemberDetails} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450 }]}>
            {selectedMemberDetails && (
              <>
                <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(251, 191, 36, 0.1)", justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: "rgba(251, 191, 36, 0.3)" }}>
                    <Text style={{ fontSize: 32, fontWeight: "700", color: Colors.primary }}>
                      {selectedMemberDetails.profile?.first_name?.charAt(0) || "U"}
                    </Text>
                  </View>
                  <Text style={{ marginBottom: 4, fontSize: 20, fontWeight: '700', color: Colors.text }}>
                    {selectedMemberDetails.profile?.first_name} {selectedMemberDetails.profile?.last_name}
                  </Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
                    {selectedMemberDetails.profile?.email}
                  </Text>
                </View>

                <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Membership Details
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                    <Text style={{ color: Colors.textSecondary }}>Status</Text>
                    <Text style={{ color: selectedMemberDetails.status === 'active' ? Colors.success : Colors.error, fontWeight: '600', textTransform: 'capitalize' }}>
                      {selectedMemberDetails.status}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                    <Text style={{ color: Colors.textSecondary }}>Start Date</Text>
                    <Text style={{ color: Colors.text, fontWeight: '500' }}>
                      {new Date(selectedMemberDetails.start_date).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: Colors.textSecondary }}>End Date</Text>
                    <Text style={{ color: Colors.text, fontWeight: '500' }}>
                      {new Date(selectedMemberDetails.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="Close"
                    variant="outline"
                    onPress={() => setSelectedMemberDetails(null)}
                    style={styles.modalBtn}
                  />
                  {selectedMemberDetails.status === 'active' && (
                    <Button
                      title={updating ? "Terminating..." : "Terminate"}
                      variant="primary"
                      onPress={async () => {
                        await terminateMembership(selectedMemberDetails.id);
                        setSelectedMemberDetails(null);
                      }}
                      disabled={updating}
                      style={[styles.modalBtn, { backgroundColor: Colors.error, borderColor: Colors.error }]}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal for recording product sale */}
      <Modal visible={productModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 600 }]}>
            
            {receiptData ? (
              // Receipt View
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(16, 185, 129, 0.1)", justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Icon name="clipboard-check" size={32} color={Colors.success} />
                </View>
                <Text style={[styles.modalTitle, { marginBottom: Spacing.sm }]}>Sale Completed</Text>
                <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.text, marginBottom: Spacing.xl }}>
                  {currencySymbol}{receiptData.total.toFixed(2)}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: Spacing.md, width: '100%' }}>
                  <Button
                    title="Done"
                    variant="outline"
                    onPress={() => {
                      setReceiptData(null);
                      setProductModalVisible(false);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Print Receipt"
                    variant="primary"
                    onPress={printReceipt}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              // POS View
              <>
                <Text style={styles.modalTitle}>Point of Sale (POS)</Text>
                
                <View style={{ flexDirection: "row", gap: Spacing.xl, ...Platform.select({ default: { flexDirection: "column" } as any }) }}>
                  
                  {/* Left Column - Catalog */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: Spacing.sm }}>
                      Quick Add
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg }}>
                      {products.map((p) => (
                        <TouchableOpacity 
                          key={p.id}
                          style={{
                            backgroundColor: "rgba(255,255,255,0.05)", 
                            borderWidth: 1, 
                            borderColor: Colors.borderLight,
                            paddingHorizontal: 12, 
                            paddingVertical: 8, 
                            borderRadius: Radius.sm
                          }}
                          onPress={() => addToCart(p)}
                        >
                          <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "500" }}>{p.name}</Text>
                          <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: "700" }}>{currencySymbol}{p.price}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: Spacing.sm }}>
                      Custom Product
                    </Text>
                    <Input
                      placeholder="Product Name"
                      value={customProductName}
                      onChangeText={setCustomProductName}
                      containerStyle={{ marginBottom: Spacing.sm }}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Input
                        placeholder="0.00"
                        value={customProductAmount}
                        onChangeText={setCustomProductAmount}
                        keyboardType="numeric"
                        containerStyle={{ flex: 1 }}
                      />
                      <TouchableOpacity 
                        style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: Radius.md }}
                        onPress={addCustomProduct}
                      >
                        <Text style={{ color: Colors.text, fontWeight: "600" }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Right Column - Cart */}
                  <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, minHeight: 250 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: Spacing.md }}>Current Sale</Text>
                    
                    <ScrollView style={{ flex: 1, marginBottom: Spacing.md }}>
                      {cart.length === 0 ? (
                        <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl, fontSize: 13 }}>Cart is empty</Text>
                      ) : (
                        cart.map((item, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}>
                            <View>
                              <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "500" }}>{item.name}</Text>
                              <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>{item.qty} x {currencySymbol}{item.price.toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                              <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "700" }}>{currencySymbol}{(item.price * item.qty).toFixed(2)}</Text>
                              <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                                <Text style={{ color: Colors.error, fontSize: 12, fontWeight: "600" }}>X</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </ScrollView>

                    <View style={{ paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "700" }}>Total</Text>
                      <Text style={{ color: Colors.primary, fontSize: 18, fontWeight: "800" }}>
                        {currencySymbol}{cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.modalActions}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        onPress={() => { setProductModalVisible(false); setCart([]); setCustomProductName(""); setCustomProductAmount(""); }}
                        style={styles.modalBtn}
                      />
                      <Button
                        title={updating ? "Processing..." : "Charge"}
                        onPress={recordProductSale}
                        disabled={cart.length === 0 || updating}
                        style={styles.modalBtn}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: Spacing.xl, paddingTop: Spacing["2xl"], paddingBottom: 120, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing["3xl"], flexWrap: 'wrap', gap: Spacing.md },
  pageTitle: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  
  filterSegment: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: 2, borderWidth: 1, borderColor: Colors.borderLight },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.surface, ...Platform.select({ web: { boxShadow: "0px 1px 2px rgba(0,0,0,0.2)" } as any }) },
  segmentText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.text },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: Colors.text },

  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing["3xl"] },
  mainGridMobile: { flexDirection: 'column' },
  leftColumn: { flex: 1, minWidth: 0, gap: Spacing["4xl"] },
  rightColumn: { width: 320, gap: Spacing["4xl"], ...Platform.select({ default: { width: '100%' }, web: { width: 320 } }) },
  
  sectionGroup: { gap: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  sectionTitleSmall: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  viewAllText: { fontSize: 12, fontWeight: "600", color: Colors.primary },

  cardsRow: { flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' },
  cardsRowMobile: { flexDirection: 'column' },
  actionCard: {},
  actionCardInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, height: "100%" },
  actionCardIcon: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  actionCardText: { flex: 1 },
  actionCardTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  actionCardDesc: { fontSize: 12, color: Colors.textSecondary },

  membershipCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight },
  membershipCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  membershipCardRight: {},
  membershipCardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(251, 191, 36, 0.1)", borderWidth: 1, borderColor: "rgba(251, 191, 36, 0.3)", justifyContent: 'center', alignItems: 'center' },
  membershipCardAvatarText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  membershipCardName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  membershipCardDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  statsSummary: { gap: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statItem: { gap: 6 },
  statLabel: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  statValue: { fontSize: 32, fontWeight: "800", color: Colors.text, letterSpacing: -1 },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: "rgba(251, 191, 36, 0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  trendText: { fontSize: 11, fontWeight: "700", color: Colors.success },

  logsSection: { flex: 1 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, ...Platform.select({ web: { boxShadow: `0px 0px 8px ${Colors.success}` } as any }) },
  logsList: { gap: Spacing.lg, marginTop: Spacing.sm },
  logRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  logIndicator: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  logInfo: { flex: 1 },
  logText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  logHighlight: { fontWeight: "700", color: Colors.text },
  logTime: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.xl, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  modalContent: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xl, padding: Spacing.xl, width: "100%", maxWidth: 400, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: Typography.fontSize.lg, fontWeight: "700", marginBottom: Spacing.lg, textAlign: "center" },
  userList: { flexGrow: 1, marginBottom: Spacing.lg },
  userSelectItem: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  userSelectItemSelected: { borderColor: Colors.primary, backgroundColor: "rgba(251, 191, 36, 0.1)" },
  userSelectText: { color: Colors.text, fontSize: Typography.fontSize.md, fontWeight: "600" },
  userSelectEmail: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  modalBtn: { flex: 1 },
});
