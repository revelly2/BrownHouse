// ============================================================================
// EquipmentCard — Swiss Glassmorphic Design
// Displays equipment info with status and reserve action
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Equipment } from "../../lib/types";

interface EquipmentCardProps {
  equipment: Equipment;
  onReserve?: (equipment: Equipment) => void;
  onViewDetails?: (equipment: Equipment) => void;
}

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

export function EquipmentCard({
  equipment,
  onReserve,
  onViewDetails,
}: EquipmentCardProps) {
  const isAvailable = equipment.status === "available";

  return (
    <Card variant="glass" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {equipment.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {equipment.brand ?? "Unknown Brand"} · {equipment.model_number ?? ""}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusAccent(equipment.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusAccent(equipment.status) },
            ]}
          >
            {equipment.status}
          </Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoText}>
            {equipment.type === "cardio" ? "Cardio" : "Strength"}
          </Text>
        </View>
        {equipment.muscle_group && (
          <View style={styles.infoChip}>
            <Text style={styles.infoText}>{equipment.muscle_group}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {equipment.description && (
        <Text style={styles.description} numberOfLines={2}>
          {equipment.description}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onViewDetails?.(equipment)}
          style={styles.detailsLink}
        >
          <Text style={styles.detailsText}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.reserveBtn,
            isAvailable ? styles.reserveBtnActive : styles.reserveBtnDisabled,
          ]}
          disabled={!isAvailable}
          onPress={() => onReserve?.(equipment)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.reserveBtnText,
              isAvailable
                ? styles.reserveBtnTextActive
                : styles.reserveBtnTextDisabled,
            ]}
          >
            {isAvailable ? "Reserve" : "Unavailable"}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: "500",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  brand: {
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
  infoRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  infoText: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textTertiary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: Spacing.md,
  },
  detailsLink: {
    paddingVertical: Spacing.xs,
  },
  detailsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  reserveBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  reserveBtnActive: {
    backgroundColor: "rgba(230, 200, 79, 0.1)",
    borderColor: "rgba(230, 200, 79, 0.25)",
  },
  reserveBtnDisabled: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.06)",
    opacity: 0.5,
  },
  reserveBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "600",
  },
  reserveBtnTextActive: {
    color: Colors.primary,
  },
  reserveBtnTextDisabled: {
    color: Colors.light.textTertiary,
  },
});
