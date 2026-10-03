// ============================================================================
// Cashier Sales Tab — View all sales data
// ============================================================================

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { getLocalDateString } from "../../lib/utils";

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function SalesScreen() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, profiles!client_id(first_name, last_name)")
      .order("payment_date", { ascending: false });
      
    if (data) {
      setSales(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.typeText}>
          {item.payment_type === 'membership' ? 'Membership Sale' : 'Product Sale'}
        </Text>
        <Text style={styles.amountText}>₱{Number(item.amount).toFixed(2)}</Text>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.dateText}>
          {new Date(item.payment_date).toLocaleString()}
        </Text>
        {item.profiles && (
          <Text style={styles.clientText}>
            Client: {item.profiles.first_name} {item.profiles.last_name}
          </Text>
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales Data</Text>
        <Text style={styles.subtitle}>All recorded transactions</Text>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No sales recorded yet.</Text> : null
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
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.light.text,
  },
  amountText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.success,
  },
  cardDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  clientText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.textTertiary,
    marginTop: Spacing.xl,
  },
});
