// ============================================================================
// Client Equipment Screen — Swiss Glassmorphic Browse
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { EquipmentCard } from "../../components/equipment/EquipmentCard";
import { Equipment } from "../../lib/types";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { GlassAlert, GlassAlertAction } from "../../components/ui/GlassAlert";
import { scheduleReservationNotifications } from "../../lib/notifications";
import { getLocalDateString } from "../../lib/utils";

type FilterType = "all" | "cardio" | "strength";

export default function EquipmentScreen() {
  const { profile } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filtered, setFiltered] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    actions?: GlassAlertAction[];
  }>({ title: "", message: "" });

  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{start: string, end: string, available: boolean}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{start: string, end: string} | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const showAlert = (title: string, message: string, actions?: GlassAlertAction[]) => {
    setAlertConfig({ title, message, actions });
    setAlertVisible(true);
  };

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("name");

    if (data) {
      setEquipment(data as Equipment[]);
      setFiltered(data as Equipment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
    
    // Subscribe to realtime equipment changes
    const channel = supabase
      .channel("client-equipment")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        () => fetchEquipment()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let result = equipment;

    // Apply type filter
    if (filter !== "all") {
      result = result.filter((item) => item.type === filter);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand?.toLowerCase().includes(q) ?? false) ||
          (item.muscle_group?.toLowerCase().includes(q) ?? false)
      );
    }

    setFiltered(result);
  }, [search, filter, equipment]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEquipment();
    setRefreshing(false);
  };

  const handleReserve = async (item: Equipment) => {
    if (!profile?.id) {
      showAlert("Notice", "You must be logged in to reserve equipment.");
      return;
    }

    setSelectedEquipment(item);
    setSelectedSlot(null);
    
    // Generate 1-hour slots from 06:30 to 19:30
    const slots = [];
    for (let i = 6; i <= 19; i++) {
      const h = String(i).padStart(2, '0');
      const nextH = String(i + 1).padStart(2, '0');
      slots.push({ start: `${h}:30`, end: `${nextH}:30`, available: true });
    }
    
    setSlotModalVisible(true);

    const today = getLocalDateString();
    const { data: res } = await supabase
      .from("reservations")
      .select("start_time, status")
      .eq("equipment_id", item.id)
      .eq("reservation_date", today)
      .in("status", ["confirmed", "completed"]); 

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    if (res) {
      const bookedStartTimes = res.map(r => r.start_time.substring(0, 5));
      for (const slot of slots) {
        if (bookedStartTimes.includes(slot.start)) {
          slot.available = false;
        }
        
        // Also disable past slots
        const [sh, sm] = slot.start.split(':').map(Number);
        if (sh < currentHour || (sh === currentHour && sm <= currentMin)) {
          slot.available = false;
        }
      }
    }

    setAvailableSlots(slots);
  };

  const confirmReservation = async () => {
    if (!profile?.id || !selectedEquipment || !selectedSlot) return;

    setBookingLoading(true);
    const today = getLocalDateString();

    const { error } = await supabase.from("reservations").insert({
      client_id: profile.id,
      equipment_id: selectedEquipment.id,
      reservation_date: today,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      status: "confirmed",
    });

    setBookingLoading(false);

    if (error) {
      showAlert("Error", error.message);
    } else {
      setSlotModalVisible(false);
      
      const startDateTime = new Date();
      const [sh, sm] = selectedSlot.start.split(':').map(Number);
      startDateTime.setHours(sh, sm, 0, 0);
      
      const endDateTime = new Date();
      const [eh, em] = selectedSlot.end.split(':').map(Number);
      endDateTime.setHours(eh, em, 0, 0);

      scheduleReservationNotifications(selectedEquipment.name, startDateTime, endDateTime);

      showAlert(
        "Success",
        "Equipment reserved! Please arrive on time.",
        [
          { text: "View Bookings", onPress: () => router.push("/client/reservations") },
          { text: "OK", style: "cancel" },
        ]
      );
    }
  };

  const FilterChip = ({
    label,
    value,
  }: {
    label: string;
    value: FilterType;
  }) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setFilter(value)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterChipText,
            isActive && styles.filterChipTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Browse</Text>
        <Text style={styles.title}>Equipment</Text>
      </View>

      <View style={styles.searchSection}>
        <Input
          placeholder="Search by name, brand, or muscle..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: Spacing.md }}
        />
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip label="All" value="all" />
          <FilterChip label="Strength" value="strength" />
          <FilterChip label="Cardio" value="cardio" />
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EquipmentCard
            equipment={item}
            onReserve={handleReserve}
          />
        )}
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
            <Text style={styles.emptyText}>No equipment found.</Text>
          </View>
        }
      />

      <GlassAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onDismiss={() => setAlertVisible(false)}
      />

      <Modal
        visible={slotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Book {selectedEquipment?.name}
            </Text>
            <Text style={styles.modalSubtitle}>Today's Available Slots</Text>

            <ScrollView style={styles.slotsContainer}>
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot, index) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  const formatTime12Hour = (time: string) => {
                    const [h, m] = time.split(':').map(Number);
                    const suffix = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
                  };

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.slotChip,
                        !slot.available && styles.slotChipDisabled,
                        isSelected && styles.slotChipSelected,
                      ]}
                      disabled={!slot.available}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          !slot.available && styles.slotTextDisabled,
                          isSelected && styles.slotTextSelected,
                        ]}
                      >
                        {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSlotModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Confirm Booking"
                variant="primary"
                size="md"
                disabled={!selectedSlot}
                loading={bookingLoading}
                onPress={confirmReservation}
                containerStyle={{ flex: 1 }}
              />
            </View>
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
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  filterChipActive: {
    backgroundColor: "rgba(230, 200, 79, 0.1)",
    borderColor: "rgba(230, 200, 79, 0.25)",
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.dark.text,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.textTertiary,
    marginBottom: Spacing.lg,
  },
  slotsContainer: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  slotChip: {
    width: '48%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  slotChipDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "transparent",
  },
  slotChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    color: Colors.dark.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
  },
  slotTextDisabled: {
    color: Colors.dark.textTertiary,
    opacity: 0.5,
  },
  slotTextSelected: {
    color: "#000",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.dark.textSecondary,
    fontWeight: "600",
  },
});
