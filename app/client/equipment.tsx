// ============================================================================
// Client Equipment Screen — Swiss Glassmorphic Browse
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
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
import {
  serializeReservationMetadata,
  getReservationState,
  doTimeIntervalsOverlap,
  timeStringToMinutes,
} from "../../lib/reservation-utils";

type FilterType = "all" | "cardio" | "strength";

interface EquipmentWithLiveStatus extends Equipment {
  _activeUntil?: string | null;
}

export default function EquipmentScreen() {
  const { profile } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentWithLiveStatus[]>([]);
  const [filtered, setFiltered] = useState<EquipmentWithLiveStatus[]>([]);
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
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithLiveStatus | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    {
      start: string;
      end: string;
      available: boolean;
      isCurrent?: boolean;
      reason?: string;
    }[]
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
    available?: boolean;
    isCurrent?: boolean;
    reason?: string;
  } | null>(null);
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return { dateStr, label, isToday: i === 0 };
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateString(new Date()));
  const [bookingLoading, setBookingLoading] = useState(false);

  const selectedEquipmentRef = useRef<EquipmentWithLiveStatus | null>(null);
  const selectedDateStrRef = useRef<string>(getLocalDateString(new Date()));
  const slotModalVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    selectedEquipmentRef.current = selectedEquipment;
    selectedDateStrRef.current = selectedDateStr;
    slotModalVisibleRef.current = slotModalVisible;
  }, [selectedEquipment, selectedDateStr, slotModalVisible]);

  const showAlert = (title: string, message: string, actions?: GlassAlertAction[]) => {
    setAlertConfig({ title, message, actions });
    setAlertVisible(true);
  };

  const refreshModalSlotsIfOpen = async () => {
    if (slotModalVisibleRef.current && selectedEquipmentRef.current) {
      await loadSlotsForDate(selectedEquipmentRef.current, selectedDateStrRef.current);
    }
  };

  const fetchEquipment = async () => {
    const todayStr = getLocalDateString(new Date());

    const [equipRes, reservationsRes] = await Promise.all([
      supabase.from("equipment").select("*").order("name"),
      supabase
        .from("reservations")
        .select("id, equipment_id, start_time, end_time, reservation_date, status, notes")
        .eq("reservation_date", todayStr)
        .eq("status", "confirmed"),
    ]);

    if (equipRes.data) {
      const now = new Date();
      const confirmedToday = (reservationsRes.data || []) as any[];

      const computedEquipment: EquipmentWithLiveStatus[] = (equipRes.data as Equipment[]).map((item) => {
        if (item.status === "maintenance") {
          return item;
        }

        // Check if there is an active reservation right now for this equipment
        const activeRes = confirmedToday.find((res) => {
          if (res.equipment_id !== item.id) return false;
          const timing = getReservationState(res, now);
          return timing.isActive;
        });

        if (activeRes) {
          const endStr = activeRes.end_time?.slice(0, 5) || "";
          const [eh, em] = endStr.split(":").map(Number);
          const suffix = eh >= 12 ? "PM" : "AM";
          const h12 = eh % 12 || 12;
          const formattedEnd = `${h12}:${String(em).padStart(2, "0")} ${suffix}`;

          return {
            ...item,
            status: "occupied",
            _activeUntil: formattedEnd,
          };
        }

        // If the equipment was set to occupied in the equipment table, preserve occupied state
        if (item.status === "occupied") {
          return {
            ...item,
            status: "occupied",
            _activeUntil: null,
          };
        }

        return {
          ...item,
          status: "available",
          _activeUntil: null,
        };
      });

      setEquipment(computedEquipment);
      setFiltered(computedEquipment);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();

    const onDataChanged = async () => {
      await fetchEquipment();
      await refreshModalSlotsIfOpen();
    };

    const equipChannel = supabase
      .channel("client-equipment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        onDataChanged
      )
      .subscribe();

    const resChannel = supabase
      .channel("client-reservations-equipment-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        onDataChanged
      )
      .subscribe();

    // Fast 2.5-second polling interval ensures real-time sync with zero manual refresh needed
    const interval = setInterval(() => {
      fetchEquipment();
      refreshModalSlotsIfOpen();
    }, 2500);

    return () => {
      supabase.removeChannel(equipChannel);
      supabase.removeChannel(resChannel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let result = equipment;

    if (filter !== "all") {
      result = result.filter((item) => item.type === filter);
    }

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

  const loadSlotsForDate = async (item: EquipmentWithLiveStatus, targetDateStr: string) => {
    const isToday = targetDateStr === getLocalDateString(new Date());

    const slots: {
      start: string;
      end: string;
      available: boolean;
      isCurrent?: boolean;
      reason?: string;
    }[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Standard 1-hour slots every 30 mins from 06:00 to 22:30 (allows reserving any future hour!)
    for (let i = 6; i <= 22; i++) {
      const h = String(i).padStart(2, "0");
      const nextH = String(i + 1).padStart(2, "0");
      // On the hour: e.g. 07:00 - 08:00
      slots.push({ start: `${h}:00`, end: `${nextH}:00`, available: true });
      // On the half hour: e.g. 07:30 - 08:30
      slots.push({ start: `${h}:30`, end: `${nextH}:30`, available: true });
    }

    // Fetch existing confirmed reservations for this equipment on this date
    const { data: res } = await supabase
      .from("reservations")
      .select("id, client_id, equipment_id, start_time, end_time, status, reservation_date, notes")
      .eq("equipment_id", item.id)
      .eq("reservation_date", targetDateStr)
      .eq("status", "confirmed");

    const bookedReservations = (res || []) as any[];

    for (const slot of slots) {
      // 1. Check interval overlap with ANY existing confirmed reservation
      const overlappingBooking = bookedReservations.find((b) =>
        doTimeIntervalsOverlap(slot.start, slot.end, b.start_time, b.end_time)
      );

      if (overlappingBooking) {
        slot.available = false;
        const bStart = overlappingBooking.start_time.slice(0, 5);
        const bEnd = overlappingBooking.end_time.slice(0, 5);
        slot.reason = `In Use / Reserved (${bStart} - ${bEnd})`;
      }

      // 2. Ongoing slot or past time evaluation for Today
      if (isToday) {
        const slotStartMin = timeStringToMinutes(slot.start);
        const slotEndMin = timeStringToMinutes(slot.end);
        const currentTotalMin = currentHour * 60 + currentMin;

        // If slot has already ended, disable it
        if (currentTotalMin >= slotEndMin) {
          slot.available = false;
          if (!slot.reason) slot.reason = "Past time";
        } else if (currentTotalMin >= slotStartMin && currentTotalMin < slotEndMin) {
          // Ongoing slot happening right now (e.g. 12:30 - 1:30 PM when it's 12:30 PM)
          // If not occupied by another booking, it is OPEN NOW and available to reserve!
          if (slot.available) {
            slot.isCurrent = true;
          }
        }
      }
    }

    setAvailableSlots(slots);
  };

  const handleReserve = async (item: EquipmentWithLiveStatus) => {
    if (!profile?.id) {
      showAlert("Notice", "You must be logged in to reserve equipment.");
      return;
    }

    const todayStr = getLocalDateString(new Date());
    setSelectedEquipment(item);
    setSelectedSlot(null);
    setSelectedDateStr(todayStr);
    setSlotModalVisible(true);
    await loadSlotsForDate(item, todayStr);
  };

  const handleDateChange = async (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedSlot(null);
    if (selectedEquipment) {
      await loadSlotsForDate(selectedEquipment, dateStr);
    }
  };

  const confirmReservation = async () => {
    if (!profile?.id || !selectedEquipment || !selectedSlot) return;

    if (!selectedSlot.available) {
      showAlert(
        "Slot Unavailable",
        selectedSlot.reason || "The selected time slot is already booked or unavailable."
      );
      return;
    }

    setBookingLoading(true);

    const bookingDateStr = selectedDateStr;

    // Double check conflict directly in database right before inserting
    const { data: existingBookings } = await supabase
      .from("reservations")
      .select("id, start_time, end_time")
      .eq("equipment_id", selectedEquipment.id)
      .eq("reservation_date", bookingDateStr)
      .eq("status", "confirmed");

    if (existingBookings) {
      const conflict = existingBookings.find((b) =>
        doTimeIntervalsOverlap(selectedSlot.start, selectedSlot.end, b.start_time, b.end_time)
      );

      if (conflict) {
        setBookingLoading(false);
        showAlert(
          "Slot Already Reserved",
          `This equipment is already reserved or in use from ${conflict.start_time.slice(0, 5)} to ${conflict.end_time.slice(0, 5)}. Please choose another time slot.`
        );
        await loadSlotsForDate(selectedEquipment, selectedDateStr);
        return;
      }
    }

    const initialNotes = serializeReservationMetadata({
      checked_in: false,
      checked_in_at: null,
      notified_5min_start: false,
      notified_5min_end: false,
    });

    const { error } = await supabase.from("reservations").insert({
      client_id: profile.id,
      equipment_id: selectedEquipment.id,
      reservation_date: bookingDateStr,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      status: "confirmed",
      notes: initialNotes,
    });

    setBookingLoading(false);

    if (error) {
      showAlert("Error", error.message);
    } else {
      setSlotModalVisible(false);
      await fetchEquipment();
      
      const startDateTime = new Date();
      const [sh, sm] = selectedSlot.start.split(':').map(Number);
      startDateTime.setHours(sh, sm, 0, 0);
      
      const endDateTime = new Date();
      const [eh, em] = selectedSlot.end.split(':').map(Number);
      endDateTime.setHours(eh, em, 0, 0);

      scheduleReservationNotifications(selectedEquipment.name, startDateTime, endDateTime);

      showAlert(
        "Reservation Confirmed",
        `Your reservation for ${selectedEquipment.name} on ${bookingDateStr} (${selectedSlot.start} - ${selectedSlot.end}) is confirmed!`,
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
            activeSessionUntil={item._activeUntil}
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

            {/* 7-Day Date Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateSwitchContainer}
            >
              {dateOptions.map((opt) => {
                const isActive = selectedDateStr === opt.dateStr;
                return (
                  <TouchableOpacity
                    key={opt.dateStr}
                    style={[
                      styles.dateSwitchBtn,
                      isActive && styles.dateSwitchBtnActive,
                    ]}
                    onPress={() => handleDateChange(opt.dateStr)}
                  >
                    <Text
                      style={[
                        styles.dateSwitchText,
                        isActive && styles.dateSwitchTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {Boolean(selectedEquipment?.status === "occupied" || selectedEquipment?._activeUntil) && (
              <View style={styles.inUseNotice}>
                <Text style={styles.inUseNoticeText}>
                  ⚠️ Currently in use{selectedEquipment?._activeUntil ? ` until ${selectedEquipment._activeUntil}` : ""}. Select an upcoming available slot below.
                </Text>
              </View>
            )}

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
                        slot.available && !isSelected && styles.slotChipAvailable,
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
                      {slot.available ? (
                        <Text
                          style={[
                            styles.slotOpenTag,
                            isSelected && { color: "#000", fontWeight: "800" },
                          ]}
                        >
                          {slot.isCurrent ? "● Open Now" : "● Open"}
                        </Text>
                      ) : slot.reason?.includes("In Use") ? (
                        <Text style={styles.slotBookedTag}>Occupied</Text>
                      ) : null}
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
                style={{ flex: 1 }}
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
  slotChipAvailable: {
    borderColor: "rgba(16, 185, 129, 0.35)",
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  slotChipDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "transparent",
  },
  slotChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotOpenTag: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 3,
    letterSpacing: 0.5,
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
  dateSwitchContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dateSwitchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  dateSwitchBtnActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: Colors.primary,
  },
  dateSwitchText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.textTertiary,
  },
  dateSwitchTextActive: {
    color: Colors.primary,
  },
  inUseNotice: {
    backgroundColor: "rgba(255, 184, 77, 0.12)",
    borderColor: "rgba(255, 184, 77, 0.3)",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inUseNoticeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning,
    fontWeight: "600",
    lineHeight: 18,
  },
  slotBookedTag: {
    fontSize: 9,
    color: Colors.error,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
