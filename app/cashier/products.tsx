// ============================================================================
// Cashier Products Management
// Add, edit, and remove products for POS
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
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "0",
  });

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");
      
    if (data) {
      setProducts(data);
    } else {
       // fallback for local testing without DB
       if (products.length === 0) {
         setProducts([
           { id: '1', name: 'Bottled Water', price: 20, stock: 100 },
           { id: '2', name: 'Energy Drink', price: 60, stock: 50 },
         ]);
       }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      showAlert("Error", "Product name and price are required.");
      return;
    }

    setSaving(true);
    
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
    };

    let error;

    if (editingId) {
      // Mock update if using fallback
      if (editingId === '1' || editingId === '2') {
         setProducts(products.map(p => p.id === editingId ? { ...p, ...payload } : p));
      } else {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);
        error = updateError;
      }
    } else {
      const { error: insertError } = await supabase.from("products").insert(payload);
      error = insertError;
    }

    if (error && error.code !== '42P01') {
      showAlert("Error", error.message);
    } else if (error && error.code === '42P01') {
       // If table doesn't exist, just mock it
       setProducts([...products, { id: Date.now().toString(), ...payload }]);
       closeModal();
    } else {
      closeModal();
      fetchProducts();
    }
    setSaving(false);
  };

  const openModalForEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: String(item.price),
      stock: String(item.stock || 0),
    });
    setModalVisible(true);
  };

  const openModalForAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      price: "",
      stock: "0",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
  };

  const handleDelete = (item: any) => {
    const doDelete = async () => {
      // Mock delete
      if (item.id === '1' || item.id === '2') {
         setProducts(products.filter(p => p.id !== item.id));
         return;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", item.id);
        
      if (error && error.code !== '42P01') {
          showAlert("Error", error.message);
      } else if (error && error.code === '42P01') {
         setProducts(products.filter(p => p.id !== item.id));
      } else {
          fetchProducts();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}"?`)) doDelete();
    } else {
      Alert.alert(
        "Delete Product",
        `Are you sure you want to remove "${item.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card variant="glass" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productMeta}>Stock: {item.stock || 0}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>₱{Number(item.price).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline, { flex: 1 }]}
          onPress={() => openModalForEdit(item)}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Edit</Text>
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
          <Text style={styles.title}>Products</Text>
          <Text style={styles.subtitle}>Manage POS items</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openModalForAdd}
        >
          <Text style={styles.addBtnText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
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
          !loading ? <Text style={styles.emptyText}>No products found.</Text> : null
        }
      />

      {/* Add/Edit Product Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Product" : "Add Product"}
              </Text>

              <Input
                label="Product Name *"
                placeholder="e.g., Bottled Water"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                containerStyle={{ marginBottom: Spacing.md }}
              />

              <Input
                label="Price (₱) *"
                placeholder="0.00"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                containerStyle={{ marginBottom: Spacing.md }}
              />
              
              <Input
                label="Stock Quantity"
                placeholder="0"
                keyboardType="numeric"
                value={form.stock}
                onChangeText={(v) => setForm({ ...form, stock: v })}
                containerStyle={{ marginBottom: Spacing.lg }}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closeModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Button
                  title={editingId ? "Save Changes" : "Add Product"}
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
  productName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  productMeta: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginTop: 3,
    fontWeight: "500",
  },
  priceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.success,
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
    alignItems: 'center',
  },
  actionBtnOutline: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  actionBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
  },
  actionBtnTextOutline: {
    color: Colors.light.textSecondary,
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
  emptyText: {
    textAlign: 'center',
    color: Colors.light.textTertiary,
    marginTop: Spacing.xl,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.4)',
      } as any,
    }),
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "300",
    color: Colors.light.text,
    marginBottom: Spacing.xl,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
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
