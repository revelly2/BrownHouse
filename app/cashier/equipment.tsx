// ============================================================================
// Admin Equipment Management — Glassmorphic Design
// Add, edit, and toggle equipment status
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Equipment } from "../../lib/types";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function EquipmentManageScreen() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "strength" as "cardio" | "strength",
    brand: "",
    model_number: "",
    description: "",
    muscle_group: "",
  });

  const fetchEquipment = async () => {
    const { data } = await supabase
      .from("equipment")
      .select("*")
      .order("name");
    if (data) setEquipment(data as Equipment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEquipment();
    setRefreshing(false);
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showAlert("Error", "Equipment name is required.");
      return;
    }

    setSaving(true);
    
    const payload = {
      name: form.name,
      type: form.type,
      brand: form.brand || null,
      model_number: form.model_number || null,
      description: form.description || null,
      muscle_group: form.muscle_group || null,
    };

    let error;

    if (editingId) {
      const { error: updateError } = await supabase
        .from("equipment")
        .update(payload)
        .eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("equipment").insert({
        ...payload,
        status: "available",
      });
      error = insertError;
    }

    if (error) {
      showAlert("Error", error.message);
    } else {
      closeModal();
      fetchEquipment();
    }
    setSaving(false);
  };

  const openModalForEdit = (item: Equipment) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      type: item.type as "cardio" | "strength",
      brand: item.brand || "",
      model_number: item.model_number || "",
      description: item.description || "",
      muscle_group: item.muscle_group || "",
    });
    setModalVisible(true);
  };

  const openModalForAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "strength",
      brand: "",
      model_number: "",
      description: "",
      muscle_group: "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
  };

  const toggleStatus = async (item: Equipment) => {
    const nextStatus =
      item.status === "available" ? "maintenance" : "available";

    const { error } = await supabase
      .from("equipment")
      .update({ status: nextStatus })
      .eq("id", item.id);

    if (error) {
      showAlert("Error", error.message);
    } else {
      fetchEquipment();
    }
  };

  const handleDelete = (item: Equipment) => {
    const doDelete = async () => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", item.id);
      if (error) showAlert("Error", error.message);
      else fetchEquipment();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}"?`)) doDelete();
    } else {
      Alert.alert(
        "Delete Equipment",
        `Are you sure you want to remove "${item.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const getStatusAccent = (status: string): string => {
    switch (status) {
      case "available":
        return Colors.success;
      case "maintenance":
        return Colors.warning;
      case "occupied":
        return Colors.error;
      default:
        return Colors.light.textTertiary;
    }
  };

  const renderItem = ({ item }: { item: Equipment }) => (
    <Card variant="glass" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.equipmentName}>{item.name}</Text>
          <Text style={styles.equipmentMeta}>
            {item.brand ?? ""} {item.model_number ? `· ${item.model_number}` : ""}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusAccent(item.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusAccent(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      {/* Info chips */}
      <View style={styles.chipRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            {item.type === "cardio" ? "Cardio" : "Strength"}
          </Text>
        </View>
        {item.muscle_group && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>{item.muscle_group}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline, { flex: 1 }]}
          onPress={() => openModalForEdit(item)}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            item.status === "available"
              ? styles.actionBtnOutline
              : styles.actionBtnFilled,
            { flex: 1 }
          ]}
          onPress={() => toggleStatus(item)}
        >
          <Text
            style={[
              styles.actionBtnText,
              item.status === "available"
                ? styles.actionBtnTextOutline
                : styles.actionBtnTextFilled,
            ]}
          >
            {item.status === "available" ? "Maintenance" : "Available"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger, { flex: 1 }]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.actionBtnTextDanger}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Admin</Text>
          <Text style={styles.title}>Equipment Manager</Text>
          <Text style={styles.subtitle}>{equipment.length} machines</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openModalForAdd}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={equipment}
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
      />

      {/* Add Equipment Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Equipment" : "Add Equipment"}
              </Text>

              <Input
                label="Name *"
                placeholder="e.g., Flat Bench Press"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />

              <Text style={styles.typeLabel}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    form.type === "strength" && styles.typeChipActive,
                  ]}
                  onPress={() => setForm({ ...form, type: "strength" })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      form.type === "strength" && styles.typeChipTextActive,
                    ]}
                  >
                    Strength
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    form.type === "cardio" && styles.typeChipActive,
                  ]}
                  onPress={() => setForm({ ...form, type: "cardio" })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      form.type === "cardio" && styles.typeChipTextActive,
                    ]}
                  >
                    Cardio
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Brand"
                placeholder="e.g., Hammer Strength"
                value={form.brand}
                onChangeText={(v) => setForm({ ...form, brand: v })}
              />
              <Input
                label="Model Number"
                placeholder="e.g., HS-BP100"
                value={form.model_number}
                onChangeText={(v) => setForm({ ...form, model_number: v })}
              />
              <Input
                label="Muscle Group"
                placeholder="e.g., chest, back, legs"
                value={form.muscle_group}
                onChangeText={(v) => setForm({ ...form, muscle_group: v })}
              />
              <Input
                label="Description"
                placeholder="Equipment description..."
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closeModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Button
                  title={editingId ? "Save Changes" : "Add Equipment"}
                  variant="primary"
                  size="md"
                  loading={saving}
                  onPress={handleSave}
                />
              </View>
            </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: "rgba(230, 200, 79, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(230, 200, 79, 0.25)",
  },
  addBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  equipmentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  equipmentMeta: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    marginTop: 3,
    fontWeight: "500",
  },
  statusContainer: {
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
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  infoChipText: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionBtnOutline: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  actionBtnFilled: {
    borderColor: "rgba(0, 217, 166, 0.2)",
    backgroundColor: "rgba(0, 217, 166, 0.08)",
  },
  actionBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
  },
  actionBtnTextOutline: {
    color: Colors.light.textSecondary,
  },
  actionBtnTextFilled: {
    color: Colors.success,
  },
  actionBtnDanger: {
    borderColor: "rgba(255, 107, 107, 0.15)",
    backgroundColor: "rgba(255, 107, 107, 0.06)",
  },
  actionBtnTextDanger: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
    color: Colors.error,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderBottomWidth: 0,
    padding: Spacing.xl,
    maxHeight: "85%",
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
    marginBottom: Spacing.xl,
    letterSpacing: -0.3,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  typeChip: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
  },
  typeChipActive: {
    borderColor: "rgba(230, 200, 79, 0.3)",
    backgroundColor: "rgba(230, 200, 79, 0.08)",
  },
  typeChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    fontWeight: "500",
  },
  typeChipTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  modalCancelText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    fontWeight: "500",
  },
});
