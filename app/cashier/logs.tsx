// ============================================================================
// Cashier System Logs Tab
// ============================================================================

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { useFocusEffect } from "expo-router";

export default function LogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("₱");

  const fetchLogs = async () => {
    const [settingsRes, paymentsRes] = await Promise.all([
      supabase.from("app_settings").select("currency").eq("id", "global").single(),
      supabase
        .from("payments")
        .select("*, profiles!client_id(first_name, last_name)")
        .order("payment_date", { ascending: false })
    ]);

    if (settingsRes.data) {
      setCurrencySymbol(settingsRes.data.currency === "USD" ? "$" : "₱");
    }
      
    if (paymentsRes.data) {
      setLogs(paymentsRes.data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logRow}>
      <View style={[styles.logIndicator, { backgroundColor: item.payment_type === 'product' ? Colors.success : Colors.primary }]} />
      <View style={styles.logInfo}>
        {item.payment_type === 'product' || !item.profiles ? (
          <Text style={styles.logText}>
            <Text style={styles.logHighlight}>Product sale</Text> recorded for {currencySymbol}{Number(item.amount).toFixed(2)}
          </Text>
        ) : (
          <Text style={styles.logText}>
            <Text style={styles.logHighlight}>{item.profiles?.first_name} {item.profiles?.last_name}</Text> paid {currencySymbol}{Number(item.amount).toFixed(2)} for membership
          </Text>
        )}
        <Text style={styles.logTime}>{new Date(item.payment_date).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Logs</Text>
        <Text style={styles.subtitle}>Activity and transactions log</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No logs found.</Text> : null
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
    paddingBottom: Spacing.lg,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
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
    gap: Spacing.lg,
    paddingTop: Spacing.md
  },
  logRow: { 
    flexDirection: 'row', 
    gap: Spacing.md, 
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  logIndicator: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  logInfo: { flex: 1 },
  logText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  logHighlight: { fontWeight: "700", color: Colors.text },
  logTime: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.textTertiary,
    marginTop: Spacing.xl,
  },
});
