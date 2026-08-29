// ============================================================================
// Admin Users Management — Glassmorphic User List
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Profile } from "../../lib/types";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("joined_date", { ascending: false });

    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
    } else {
      const q = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            (u.first_name?.toLowerCase().includes(q) ?? false) ||
            (u.last_name?.toLowerCase().includes(q) ?? false) ||
            u.role.toLowerCase().includes(q)
        )
      );
    }
  }, [users, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "error" as const;
      case "trainer":
        return "warning" as const;
      default:
        return "info" as const;
    }
  };

  const getRoleAccent = (role: string): string => {
    switch (role) {
      case "admin":
        return Colors.error;
      case "trainer":
        return Colors.warning;
      default:
        return Colors.info;
    }
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <Card variant="glass" style={styles.card}>
      <View style={styles.cardRow}>
        <View
          style={[
            styles.avatar,
            { borderColor: getRoleAccent(item.role) },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: getRoleAccent(item.role) },
            ]}
          >
            {(item.first_name?.[0] ?? "U").toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.userName}>
            {item.first_name ?? ""} {item.last_name ?? ""}
          </Text>
          <Text style={styles.userMeta}>
            Joined {new Date(item.joined_date).toLocaleDateString()}
          </Text>
          {item.fitness_goal && (
            <Text style={styles.userGoal} numberOfLines={1}>
              Goal: {item.fitness_goal}
            </Text>
          )}
        </View>
        <Badge label={item.role} variant={getRoleVariant(item.role)} size="sm" />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Admin</Text>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          {filteredUsers.length} registered members
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by name or role..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        data={filteredUsers}
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
              <Text style={styles.emptyIconText}>?</Text>
            </View>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
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
    paddingBottom: Spacing.md,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
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
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  userMeta: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 2,
    fontWeight: "500",
  },
  userGoal: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 2,
    fontStyle: "italic",
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
    fontWeight: "500",
  },
});
