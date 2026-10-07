// ============================================================================
// Admin Memberships & Billing Management — Glassmorphic Design
// Issue memberships, track revenue, manage subscriptions, and print receipts
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ToastManager } from "../../components/ui/Toast";
import { Icon } from "../../components/ui/Icon";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { ReceiptModal, MembershipReceiptData } from "../../components/membership/ReceiptModal";
import { ClientMembership, Membership, Payment, Profile } from "../../lib/types";

export default function MembershipsScreen() {
  const { profile } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"active" | "history" | "expiring">("active");

  // Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  
  const [plans, setPlans] = useState<Membership[]>([]);
  const [activeMemberships, setActiveMemberships] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Assign Membership Modal State
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchText, setClientSearchText] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [customAmount, setCustomAmount] = useState("");
  const [enrollNotes, setEnrollNotes] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Receipt Modal State
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<MembershipReceiptData | null>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      const now = new Date().toISOString();

      // Automatically expire overdue active memberships
      await supabase
        .from("client_memberships")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("end_date", now);

      const [settingsRes, plansRes, activeRes, paymentsRes, clientsRes] = await Promise.all([
        supabase.from("app_settings").select("currency").eq("id", "global").single(),
        supabase.from("memberships").select("*").eq("is_active", true).order("price"),
        supabase
          .from("client_memberships")
          .select("*, profile:profiles(*), membership:memberships(*)")
          .eq("status", "active")
          .order("end_date", { ascending: true }),
        supabase
          .from("payments")
          .select("*, profiles!client_id(*)")
          .order("payment_date", { ascending: false })
          .limit(100),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "client")
          .order("first_name", { ascending: true }),
      ]);

      if (settingsRes.data) {
        setCurrencySymbol(settingsRes.data.currency === "USD" ? "$" : "₱");
      }

      if (plansRes.data) {
        setPlans(plansRes.data as Membership[]);
        if (plansRes.data.length > 0 && !selectedPlanId) {
          setSelectedPlanId(plansRes.data[0].id);
          setCustomAmount(plansRes.data[0].price.toString());
        }
      }

      if (activeRes.data) {
        setActiveMemberships(activeRes.data);
      }

      if (paymentsRes.data) {
        setPayments(paymentsRes.data);
      }

      if (clientsRes.data) {
        const clientOnly = (clientsRes.data as Profile[]).filter(
          (c) => c.role === "client" && !c.email?.toLowerCase().includes("admin")
        );
        setClients(clientOnly);
      }
    } catch (err: any) {
      console.error("Error fetching memberships data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime listeners
    const channel = supabase
      .channel("admin_memberships_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_memberships" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Stats calculation
  const totalRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const activeCount = activeMemberships.length;

  const expiringSoonList = useMemo(() => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return activeMemberships.filter((m) => new Date(m.end_date) <= sevenDaysFromNow);
  }, [activeMemberships]);

  // Handle plan change in modal
  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setCustomAmount(plan.price.toString());
    }
  };

  // Open enrollment modal
  const openEnrollModal = (preselectedClientId?: string) => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    } else {
      setSelectedClientId("");
    }
    setClientSearchText("");
    setEnrollNotes("");
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
      setCustomAmount(plans[0].price.toString());
    }
    setEnrollModalVisible(true);
  };

  // Submit enrollment
  const handleAssignMembership = async () => {
    if (!selectedClientId) {
      ToastManager.show("Required", "Please select a member to enroll.", "error");
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) {
      ToastManager.show("Required", "Please select a valid membership plan.", "error");
      return;
    }

    const amountNum = parseFloat(customAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      ToastManager.show("Invalid Amount", "Please enter a valid payment amount.", "error");
      return;
    }

    setEnrolling(true);

    try {
      // 1. Calculate validity dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (plan.duration_days || 30));

      // 2. Insert into client_memberships
      const { data: memData, error: memError } = await supabase
        .from("client_memberships")
        .insert({
          client_id: selectedClientId,
          membership_id: plan.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (memError) throw memError;

      // 3. Insert into payments
      const { data: payData, error: payError } = await supabase
        .from("payments")
        .insert({
          client_id: selectedClientId,
          cashier_id: profile?.id,
          amount: amountNum,
          payment_method: paymentMethod,
          payment_type: "membership",
          reference_id: memData.id,
          status: "completed",
          notes: enrollNotes.trim() || `Enrolled in ${plan.name}`,
        })
        .select()
        .single();

      if (payError) throw payError;

      const client = clients.find((c) => c.id === selectedClientId);

      ToastManager.show(
        "Success",
        `Membership assigned to ${client ? `${client.first_name} ${client.last_name}` : "member"}!`,
        "success"
      );

      // Close enroll modal
      setEnrollModalVisible(false);

      // 4. Immediately prepare and show official receipt!
      setReceiptData({
        paymentId: payData.id,
        paymentDate: payData.payment_date,
        amount: amountNum,
        paymentMethod: paymentMethod,
        clientName: client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() : "Member",
        clientEmail: client?.email || null,
        clientPhone: client?.phone_number || null,
        planName: plan.name,
        durationDays: plan.duration_days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        adminName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Administrator",
        currencySymbol,
      });
      setReceiptModalVisible(true);

      // Refresh list
      fetchData();
    } catch (err: any) {
      ToastManager.show("Error", err.message || "Failed to assign membership.", "error");
    } finally {
      setEnrolling(false);
    }
  };

  // Terminate membership
  const handleTerminateMembership = (membershipId: string, clientName: string) => {
    const doTerminate = async () => {
      const { error } = await supabase
        .from("client_memberships")
        .update({ status: "cancelled", end_date: new Date().toISOString() })
        .eq("id", membershipId);

      if (error) {
        ToastManager.show("Error", error.message, "error");
      } else {
        ToastManager.show("Cancelled", `Membership cancelled for ${clientName}`, "info");
        fetchData();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to terminate the active membership for ${clientName}?`)) {
        doTerminate();
      }
    } else {
      Alert.alert(
        "Terminate Membership",
        `Are you sure you want to terminate membership for ${clientName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Terminate", style: "destructive", onPress: doTerminate },
        ]
      );
    }
  };

  // Open receipt for existing active member
  const viewReceiptForActiveMember = (memberItem: any) => {
    // Try to find the payment linked to this client_membership
    const matchingPayment = payments.find(
      (p) => p.reference_id === memberItem.id || (p.client_id === memberItem.client_id && p.payment_type === "membership")
    );

    const client = memberItem.profile;
    const plan = memberItem.membership;

    setReceiptData({
      paymentId: matchingPayment ? matchingPayment.id : memberItem.id,
      paymentDate: matchingPayment ? matchingPayment.payment_date : memberItem.created_at,
      amount: matchingPayment ? Number(matchingPayment.amount) : Number(plan?.price || 0),
      paymentMethod: matchingPayment ? matchingPayment.payment_method : "cash",
      clientName: client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() : "Member",
      clientEmail: client?.email || null,
      clientPhone: client?.phone_number || null,
      planName: plan?.name || "Gym Membership",
      durationDays: plan?.duration_days,
      startDate: memberItem.start_date,
      endDate: memberItem.end_date,
      adminName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Administrator",
      currencySymbol,
    });
    setReceiptModalVisible(true);
  };

  // Open receipt for historical payment
  const viewReceiptForPayment = (payment: any) => {
    const client = payment.profiles;
    setReceiptData({
      paymentId: payment.id,
      paymentDate: payment.payment_date,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      clientName: client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() : "Member",
      clientEmail: client?.email || null,
      clientPhone: client?.phone_number || null,
      planName: payment.notes || "Gym Membership",
      adminName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Administrator",
      currencySymbol,
    });
    setReceiptModalVisible(true);
  };

  // Currently selected client object
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Clients available for enrollment
  const availableClients = useMemo(() => {
    return clients.filter((c) => {
      if (c.role !== "client") return false;
      if (c.email?.toLowerCase().includes("admin")) return false;
      const q = clientSearchText.toLowerCase().trim();
      if (!q) return true;
      const name = `${c.first_name || ""} ${c.last_name || ""} ${c.email || ""} ${c.phone_number || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [clients, clientSearchText]);

  // Filtered lists according to current search query
  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeMemberships;
    const q = searchQuery.toLowerCase();
    return activeMemberships.filter((m) => {
      const name = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""} ${m.profile?.email || ""}`.toLowerCase();
      const plan = (m.membership?.name || "").toLowerCase();
      return name.includes(q) || plan.includes(q);
    });
  }, [activeMemberships, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter((p) => {
      const name = `${p.profiles?.first_name || ""} ${p.profiles?.last_name || ""} ${p.profiles?.email || ""}`.toLowerCase();
      const method = (p.payment_method || "").toLowerCase();
      const notes = (p.notes || "").toLowerCase();
      return name.includes(q) || method.includes(q) || notes.includes(q);
    });
  }, [payments, searchQuery]);

  const filteredExpiring = useMemo(() => {
    if (!searchQuery.trim()) return expiringSoonList;
    const q = searchQuery.toLowerCase();
    return expiringSoonList.filter((m) => {
      const name = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""} ${m.profile?.email || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [expiringSoonList, searchQuery]);

  // Helper to compute remaining days
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <View style={styles.container}>
      {/* Scrollable Container */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageSubtitle}>ADMINISTRATION & BILLING</Text>
            <Text style={styles.pageTitle}>Memberships & Billing</Text>
          </View>
          <Button
            title="+ Assign Membership"
            onPress={() => openEnrollModal()}
            style={styles.enrollButton}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsGrid}>
          {/* Revenue */}
          <Card variant="glass" style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="course-up" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statLabel}>TOTAL REVENUE</Text>
            <Text style={styles.statValue}>
              {currencySymbol}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Card>

          {/* Active Subscriptions */}
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
              <Icon name="clipboard-check" size={20} color={Colors.success || "#22C55E"} />
            </View>
            <Text style={styles.statLabel}>ACTIVE MEMBERS</Text>
            <Text style={styles.statValue}>{activeCount}</Text>
          </Card>

          {/* Expiring Soon */}
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Icon name="bell" size={20} color={Colors.warning || "#F59E0B"} />
            </View>
            <Text style={styles.statLabel}>EXPIRING SOON (&lt; 7 DAYS)</Text>
            <Text style={styles.statValue}>{expiringSoonList.length}</Text>
          </Card>
        </View>

        {/* Tab Selector & Search */}
        <View style={styles.controlsRow}>
          <View style={styles.tabNav}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]}
              onPress={() => setActiveTab("active")}
            >
              <Text style={[styles.tabButtonText, activeTab === "active" && styles.tabButtonTextActive]}>
                Active Plans ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text style={[styles.tabButtonText, activeTab === "history" && styles.tabButtonTextActive]}>
                Payment History ({payments.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "expiring" && styles.tabButtonActive]}
              onPress={() => setActiveTab("expiring")}
            >
              <Text style={[styles.tabButtonText, activeTab === "expiring" && styles.tabButtonTextActive]}>
                Expiring Soon ({expiringSoonList.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Input
              placeholder="Search member, plan, or method..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={styles.searchInputContainer}
            />
          </View>
        </View>

        {/* Tab Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading memberships data...</Text>
          </View>
        ) : (
          <>
            {/* VIEW 1: ACTIVE MEMBERS */}
            {activeTab === "active" && (
              <View style={styles.listSection}>
                {filteredActive.length === 0 ? (
                  <Card variant="glass" style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Active Memberships Found</Text>
                    <Text style={styles.emptySub}>
                      {searchQuery ? "Try refining your search terms." : "Click '+ Assign Membership' above to enroll a member."}
                    </Text>
                  </Card>
                ) : (
                  filteredActive.map((item) => {
                    const client = item.profile;
                    const plan = item.membership;
                    const daysLeft = getDaysRemaining(item.end_date);

                    return (
                      <Card key={item.id} variant="glass" style={styles.memberCard}>
                        <View style={styles.memberCardContent}>
                          {/* Avatar & Details */}
                          <View style={styles.memberMetaRow}>
                            <View style={styles.avatar}>
                              {client?.profile_picture_url ? (
                                <Image source={{ uri: client.profile_picture_url }} style={styles.avatarImg} />
                              ) : (
                                <Text style={styles.avatarText}>
                                  {((client?.first_name?.[0] || "") + (client?.last_name?.[0] || "")).toUpperCase() || "M"}
                                </Text>
                              )}
                            </View>

                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>
                                {client?.first_name} {client?.last_name}
                              </Text>
                              <Text style={styles.memberSub}>
                                {client?.email || client?.phone_number || "Gym Member"}
                              </Text>
                            </View>

                            {/* Status & Days Left Badge */}
                            <View style={styles.badgeCol}>
                              <Badge
                                variant={daysLeft <= 7 ? "warning" : "success"}
                                label={daysLeft <= 0 ? "Expired" : `${daysLeft} days left`}
                              />
                            </View>
                          </View>

                          {/* Plan Details Strip */}
                          <View style={styles.planStrip}>
                            <View style={styles.planMetaItem}>
                              <Text style={styles.planMetaLabel}>Plan</Text>
                              <Text style={styles.planMetaValue}>{plan?.name || "Standard Plan"}</Text>
                            </View>
                            <View style={styles.planMetaItem}>
                              <Text style={styles.planMetaLabel}>Start Date</Text>
                              <Text style={styles.planMetaValue}>
                                {new Date(item.start_date).toLocaleDateString()}
                              </Text>
                            </View>
                            <View style={styles.planMetaItem}>
                              <Text style={styles.planMetaLabel}>Expires On</Text>
                              <Text style={styles.planMetaValue}>
                                {new Date(item.end_date).toLocaleDateString()}
                              </Text>
                            </View>
                            <View style={styles.planMetaItem}>
                              <Text style={styles.planMetaLabel}>Fee</Text>
                              <Text style={styles.planMetaValue}>
                                {currencySymbol}{Number(plan?.price || 0).toFixed(2)}
                              </Text>
                            </View>
                          </View>

                          {/* Action Buttons */}
                          <View style={styles.cardActionsRow}>
                            <Button
                              title="📄 View Receipt"
                              variant="outline"
                              size="sm"
                              onPress={() => viewReceiptForActiveMember(item)}
                              style={styles.actionBtn}
                            />
                            <Button
                              title="Terminate"
                              variant="ghost"
                              size="sm"
                              onPress={() =>
                                handleTerminateMembership(
                                  item.id,
                                  `${client?.first_name || ""} ${client?.last_name || ""}`
                                )
                              }
                              style={{ ...styles.actionBtn, ...styles.terminateBtn }}
                            />
                          </View>
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            )}

            {/* VIEW 2: PAYMENT HISTORY & RECEIPTS */}
            {activeTab === "history" && (
              <View style={styles.listSection}>
                {filteredPayments.length === 0 ? (
                  <Card variant="glass" style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Payment Transactions Recorded</Text>
                    <Text style={styles.emptySub}>
                      Payments made for memberships will automatically appear here.
                    </Text>
                  </Card>
                ) : (
                  filteredPayments.map((p) => {
                    const client = p.profiles;
                    const formattedDate = new Date(p.payment_date).toLocaleString();

                    return (
                      <Card key={p.id} variant="glass" style={styles.paymentCard}>
                        <View style={styles.paymentCardRow}>
                          {/* Payment Left Icon & Info */}
                          <View style={styles.paymentLeft}>
                            <View style={styles.paymentIconBadge}>
                              <Icon name="course-up" size={18} color={Colors.primary} />
                            </View>
                            <View>
                              <Text style={styles.paymentClientName}>
                                {client ? `${client.first_name} ${client.last_name}` : "Member Payment"}
                              </Text>
                              <Text style={styles.paymentDate}>{formattedDate}</Text>
                              <Text style={styles.paymentNotes}>
                                Method: <Text style={{ textTransform: "capitalize" }}>{p.payment_method}</Text>
                                {p.notes ? ` • ${p.notes}` : ""}
                              </Text>
                            </View>
                          </View>

                          {/* Payment Right Amount & Receipt Button */}
                          <View style={styles.paymentRight}>
                            <Text style={styles.paymentAmount}>
                              {currencySymbol}{Number(p.amount).toFixed(2)}
                            </Text>
                            <View style={styles.paymentStatusBadge}>
                              <Text style={styles.paymentStatusText}>✓ Completed</Text>
                            </View>
                            <Button
                              title="📄 Receipt"
                              variant="outline"
                              size="sm"
                              onPress={() => viewReceiptForPayment(p)}
                              style={styles.paymentReceiptBtn}
                            />
                          </View>
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            )}

            {/* VIEW 3: EXPIRING SOON */}
            {activeTab === "expiring" && (
              <View style={styles.listSection}>
                {filteredExpiring.length === 0 ? (
                  <Card variant="glass" style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Memberships Expiring Soon</Text>
                    <Text style={styles.emptySub}>
                      All active memberships have more than 7 days remaining.
                    </Text>
                  </Card>
                ) : (
                  filteredExpiring.map((item) => {
                    const client = item.profile;
                    const plan = item.membership;
                    const daysLeft = getDaysRemaining(item.end_date);

                    return (
                      <Card key={item.id} variant="glass" style={styles.memberCard}>
                        <View style={styles.memberCardContent}>
                          <View style={styles.memberMetaRow}>
                            <View style={styles.avatar}>
                              {client?.profile_picture_url ? (
                                <Image source={{ uri: client.profile_picture_url }} style={styles.avatarImg} />
                              ) : (
                                <Text style={styles.avatarText}>
                                  {((client?.first_name?.[0] || "") + (client?.last_name?.[0] || "")).toUpperCase() || "M"}
                                </Text>
                              )}
                            </View>
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>
                                {client?.first_name} {client?.last_name}
                              </Text>
                              <Text style={styles.memberSub}>
                                Expires: {new Date(item.end_date).toLocaleDateString()}
                              </Text>
                            </View>
                            <Badge
                              variant="warning"
                              label={`${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                            />
                          </View>

                          <View style={styles.cardActionsRow}>
                            <Button
                              title="Renew Membership"
                              size="sm"
                              onPress={() => openEnrollModal(item.client_id)}
                              style={styles.actionBtn}
                            />
                            <Button
                              title="📄 View Receipt"
                              variant="outline"
                              size="sm"
                              onPress={() => viewReceiptForActiveMember(item)}
                              style={styles.actionBtn}
                            />
                          </View>
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* ASSIGN / ENROLL MEMBERSHIP MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={enrollModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEnrollModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubtitle}>MEMBERSHIP BILLING</Text>
                <Text style={styles.modalTitle}>Assign Gym Membership</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEnrollModalVisible(false)}
                style={styles.modalCloseIconBtn}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Step 1: Client Selection */}
              <Text style={styles.formSectionLabel}>1. SELECT GYM MEMBER</Text>
              {selectedClient ? (
                <View style={styles.selectedMemberCard}>
                  <View style={styles.selectedMemberAvatar}>
                    <Text style={styles.selectedMemberAvatarText}>
                      {(selectedClient.first_name?.[0] || "M").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Text style={styles.selectedMemberTag}>SELECTED MEMBER</Text>
                    <Text style={styles.selectedMemberName}>
                      {selectedClient.first_name} {selectedClient.last_name}
                    </Text>
                    <Text style={styles.selectedMemberEmail}>
                      {selectedClient.email || selectedClient.phone_number || "No contact info"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeMemberButton}
                    onPress={() => setSelectedClientId("")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeMemberText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.clientSelectionSection}>
                  <Input
                    placeholder="Filter members by name or email..."
                    value={clientSearchText}
                    onChangeText={setClientSearchText}
                    containerStyle={{ marginBottom: Spacing.xs }}
                  />

                  <ScrollView
                    nestedScrollEnabled
                    style={styles.clientPickerScroll}
                    contentContainerStyle={styles.clientPickerContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {availableClients.map((c) => {
                      const isSelected = selectedClientId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.clientChoice, isSelected && styles.clientChoiceSelected]}
                          onPress={() => setSelectedClientId(c.id)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.clientChoiceName, isSelected && styles.clientChoiceNameSelected]}>
                              {c.first_name} {c.last_name}
                            </Text>
                            <Text style={styles.clientChoiceEmail}>
                              {c.email || c.phone_number || "No contact info"}
                            </Text>
                          </View>
                          <View style={styles.selectMemberChip}>
                            <Text style={styles.selectMemberChipText}>Select</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {availableClients.length === 0 && (
                      <View style={styles.noClientsBox}>
                        <Text style={styles.noClientsNote}>
                          {clientSearchText.trim() ? "No members match your search." : "No gym members available."}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Step 2: Plan Selection */}
              <Text style={[styles.formSectionLabel, { marginTop: Spacing.lg }]}>2. MEMBERSHIP PLAN</Text>
              <View style={styles.planChoicesGrid}>
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.planCardChoice, isSelected && styles.planCardChoiceSelected]}
                      onPress={() => handlePlanSelect(p.id)}
                    >
                      <Text style={[styles.planChoiceTitle, isSelected && styles.planChoiceTitleSelected]}>
                        {p.name}
                      </Text>
                      <Text style={styles.planChoiceDuration}>{p.duration_days} Days Access</Text>
                      <Text style={[styles.planChoicePrice, isSelected && styles.planChoicePriceSelected]}>
                        {currencySymbol}{Number(p.price).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Step 3: Payment Details */}
              <Text style={[styles.formSectionLabel, { marginTop: Spacing.lg }]}>3. PAYMENT & RECEIPT</Text>
              <View style={styles.paymentMethodRow}>
                {(["cash", "card", "transfer"] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodChoiceBtn, isSelected && styles.methodChoiceBtnSelected]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[styles.methodChoiceText, isSelected && styles.methodChoiceTextSelected]}>
                        {method.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.amountInputRow}>
                <Input
                  label={`Amount Paid (${currencySymbol})`}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <Input
                label="Optional Reference / Notes"
                placeholder="e.g. Reference code, walk-in, promotion..."
                value={enrollNotes}
                onChangeText={setEnrollNotes}
                containerStyle={{ marginTop: Spacing.sm }}
              />

              <View style={styles.modalNotice}>
                <Text style={styles.modalNoticeText}>
                  ℹ Upon confirming, an Official Membership Receipt will be generated immediately for the member.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEnrollModalVisible(false)}
                disabled={enrolling}
              />
              <Button
                title={enrolling ? "Processing..." : "Confirm & Issue Receipt"}
                onPress={handleAssignMembership}
                loading={enrolling}
                style={{ flex: 1, marginLeft: Spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* OFFICIAL MEMBERSHIP RECEIPT MODAL */}
      {/* ========================================================================= */}
      <ReceiptModal
        visible={receiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        data={receiptData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"] + 8,
    paddingBottom: 120,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: Spacing.xl,
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  pageSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "300",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  enrollButton: {
    minWidth: 180,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    padding: Spacing.lg,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  tabNav: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: Radius.lg,
    padding: 4,
  },
  tabButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  tabButtonTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  searchWrapper: {
    minWidth: 260,
    flex: 1,
    maxWidth: 400,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  listSection: {
    gap: Spacing.md,
  },
  emptyCard: {
    padding: Spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  memberCard: {
    padding: Spacing.lg,
  },
  memberCardContent: {
    gap: Spacing.md,
  },
  memberMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  memberSub: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: "flex-end",
  },
  planStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  planMetaItem: {
    minWidth: 100,
  },
  planMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.textTertiary,
    letterSpacing: 0.5,
  },
  planMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  actionBtn: {
    minWidth: 130,
  },
  terminateBtn: {
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  paymentCard: {
    padding: Spacing.md,
  },
  paymentCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    minWidth: 240,
  },
  paymentIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentClientName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  paymentDate: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  paymentNotes: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.text,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  paymentStatusBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.success || "#22C55E",
  },
  paymentReceiptBtn: {
    marginTop: 4,
    minWidth: 90,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalDialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    backgroundColor: "rgba(20, 20, 24, 0.98)",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: Spacing.xl,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  modalSubtitle: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginTop: 2,
  },
  modalCloseIconBtn: {
    padding: 6,
  },
  modalCloseIcon: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.light.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  clientSelectionSection: {
    marginBottom: Spacing.xs,
  },
  clientPickerScroll: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: Radius.md,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  clientPickerContent: {
    padding: 6,
  },
  clientChoice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: 4,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  clientChoiceSelected: {
    backgroundColor: "rgba(251, 191, 36, 0.16)",
    borderColor: Colors.primary,
  },
  clientChoiceName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  clientChoiceNameSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
  clientChoiceEmail: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  selectMemberChip: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  selectMemberChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  selectedMemberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  selectedMemberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  selectedMemberAvatarText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  selectedMemberTag: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  selectedMemberName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  selectedMemberEmail: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  changeMemberButton: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  changeMemberText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.textSecondary,
  },
  noClientsBox: {
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  noClientsNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  planChoicesGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  planCardChoice: {
    flex: 1,
    minWidth: 130,
    padding: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  planCardChoiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  planChoiceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.text,
  },
  planChoiceTitleSelected: {
    color: Colors.primary,
  },
  planChoiceDuration: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  planChoicePrice: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.text,
    marginTop: Spacing.sm,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  planChoicePriceSelected: {
    color: Colors.primary,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  methodChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  methodChoiceBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(251, 191, 36, 0.18)",
  },
  methodChoiceText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  methodChoiceTextSelected: {
    color: Colors.primary,
  },
  amountInputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalNotice: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  modalNoticeText: {
    fontSize: 11,
    color: Colors.primary,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
});
