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
  Modal,
  TouchableOpacity,
  Image,
} from "react-native";
import { ToastManager } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
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
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [updating, setUpdating] = useState(false);

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

    const channel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setUsers((prev) =>
              prev.map((u) => (u.id === payload.new.id ? { ...u, ...payload.new } as Profile : u))
            );
          } else if (payload.eventType === "INSERT") {
            setUsers((prev) => [payload.new as Profile, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const updateRole = async (newRole: string) => {
    if (!selectedUser) return;
    setUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", selectedUser.id);
      
    setUpdating(false);
    if (error) {
      ToastManager.show("Error", error.message, "error");
    } else {
      ToastManager.show("Success", `User role updated to ${newRole}`, "success");
      setSelectedUser(null);
      fetchUsers(); // Refresh the list
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "error" as const;
      default:
        return "info" as const;
    }
  };

  const getRoleAccent = (role: string): string => {
    switch (role) {
      case "admin":
        return Colors.error;
      default:
        return Colors.info;
    }
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedUser(item)}>
      <Card variant="glass" style={styles.card}>
      <View style={styles.cardRow}>
        <View
          style={[
            styles.avatar,
            { borderColor: getRoleAccent(item.role) },
          ]}
        >
          {item.profile_picture_url ? (
            <Image 
              source={{ uri: item.profile_picture_url }} 
              style={{ width: '100%', height: '100%', borderRadius: 12 }} 
              resizeMode="cover" 
            />
          ) : (
            <Text
              style={[
                styles.avatarText,
                { color: getRoleAccent(item.role) },
              ]}
            >
              {(item.first_name?.[0] ?? "U").toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.userName}>
            {item.first_name ?? ""} {item.last_name ?? ""}
          </Text>
          {item.email && (
            <Text style={[styles.userMeta, { marginBottom: 2, color: Colors.textSecondary }]}>
              {item.email}
            </Text>
          )}
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
    </TouchableOpacity>
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

      {/* Role Update Modal */}
      <Modal
        visible={!!selectedUser}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalSubtitle}>
              Select a new role for {selectedUser?.first_name} {selectedUser?.last_name}
            </Text>

            <View style={styles.modalOptions}>
              {["admin", "client"].map((roleOption) => (
                <TouchableOpacity
                  key={roleOption}
                  style={[
                    styles.modalOptionBtn,
                    selectedUser?.role === roleOption && styles.modalOptionBtnActive,
                  ]}
                  onPress={() => updateRole(roleOption)}
                  disabled={updating || selectedUser?.role === roleOption}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedUser?.role === roleOption && styles.modalOptionTextActive,
                    ]}
                  >
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedUser?.role === "client" && (
                <TouchableOpacity
                  style={[styles.modalOptionBtn, { borderColor: Colors.primary, marginTop: Spacing.sm }]}
                  onPress={() => {
                    setSelectedUser(null);
                    router.push("/admin/memberships");
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: Colors.primary }]}>
                    💳 Manage Memberships & Billing
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: "#1C1C1E", // Dark card background
    width: "100%",
    maxWidth: 400,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  modalOptions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  modalOptionBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalOptionBtnActive: {
    backgroundColor: "rgba(230, 200, 79, 0.15)", // Primary slightly transparent
    borderColor: Colors.primary,
  },
  modalOptionText: {
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  modalOptionTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  modalCloseBtn: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modalCloseText: {
    color: Colors.textTertiary,
    fontWeight: "500",
  },
});
