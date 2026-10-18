// ============================================================================
// EquipmentCard — Modern Athletic Glassmorphic Card
// Clear typography, high-contrast CTA, and clean status indicators
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Card } from "../ui/Card";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Equipment } from "../../lib/types";
import { parseEquipmentDetails } from "../../lib/equipment-utils";
import { Icon } from "../ui/Icon";

interface EquipmentCardProps {
  equipment: Equipment;
  onReserve?: (equipment: Equipment) => void;
  onViewDetails?: (equipment: Equipment) => void;
  activeSessionUntil?: string | null;
}

const getStatusTheme = (status: string) => {
  switch (status) {
    case "available":
      return {
        accent: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.25)",
      };
    case "maintenance":
      return {
        accent: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.25)",
      };
    case "occupied":
      return {
        accent: "#EF4444",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.25)",
      };
    default:
      return {
        accent: "#71717A",
        bg: "rgba(255, 255, 255, 0.06)",
        border: "rgba(255, 255, 255, 0.12)",
      };
  }
};

export function EquipmentCard({
  equipment,
  onReserve,
  onViewDetails,
  activeSessionUntil,
}: EquipmentCardProps) {
  const details = parseEquipmentDetails(equipment);
  const isMaintenance = equipment.status === "maintenance";
  const isOccupied = equipment.status === "occupied";
  const canReserve = !isMaintenance;
  const statusTheme = getStatusTheme(equipment.status);

  const statusLabel = isOccupied
    ? activeSessionUntil
      ? `In Use until ${activeSessionUntil}`
      : "In Use"
    : equipment.status === "available"
    ? "Available"
    : "Maintenance";

  return (
    <Card variant="glass" style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {equipment.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {equipment.brand || "Brand"} {equipment.model_number ? `· ${equipment.model_number}` : ""}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusTheme.bg, borderColor: statusTheme.border },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusTheme.accent }]} />
          <Text style={[styles.statusText, { color: statusTheme.accent }]}>
            {statusLabel}
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

        {equipment.muscle_group ? (
          <View style={styles.infoChip}>
            <Text style={styles.infoText}>{equipment.muscle_group}</Text>
          </View>
        ) : null}

        {details.location ? (
          <View style={[styles.infoChip, styles.locationChip]}>
            <Icon name="pin" size={12} color={Colors.primary} />
            <Text style={[styles.infoText, { color: Colors.primary }]}>
              {details.location}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {details.summary ? (
        <Text style={styles.description} numberOfLines={2}>
          {details.summary}
        </Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onViewDetails?.(equipment)}
          style={styles.detailsLink}
          activeOpacity={0.65}
        >
          <Text style={styles.detailsText}>View Details →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.reserveBtn,
            isMaintenance
              ? styles.reserveBtnDisabled
              : isOccupied
              ? styles.reserveBtnOccupied
              : styles.reserveBtnAvailable,
          ]}
          disabled={!canReserve}
          onPress={() => onReserve?.(equipment)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.reserveBtnText,
              isMaintenance
                ? styles.reserveBtnTextDisabled
                : isOccupied
                ? styles.reserveBtnTextOccupied
                : styles.reserveBtnTextAvailable,
            ]}
          >
            {isMaintenance ? "Unavailable" : isOccupied ? "Book Future Slot" : "Reserve"}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
    fontFamily: Typography.fontFamily.sans,
  },
  brand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: "500",
    fontFamily: Typography.fontFamily.sans,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
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
    letterSpacing: 0.2,
    fontFamily: Typography.fontFamily.sans,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  locationChip: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.22)",
  },
  infoText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "capitalize",
    fontFamily: Typography.fontFamily.sans,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: "rgba(255, 255, 255, 0.65)",
    lineHeight: 20,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.sans,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: Spacing.md,
  },
  detailsLink: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
    ...Platform.select({
      web: {
        cursor: "pointer",
      } as any,
    }),
  },
  detailsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
    letterSpacing: 0.1,
    fontFamily: Typography.fontFamily.sans,
  },
  reserveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "transform 0.15s ease, opacity 0.15s ease",
      } as any,
    }),
  },
  reserveBtnAvailable: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  reserveBtnOccupied: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  reserveBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    opacity: 0.45,
  },
  reserveBtnText: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: Typography.fontFamily.sans,
  },
  reserveBtnTextAvailable: {
    color: "#0A0A0C",
  },
  reserveBtnTextOccupied: {
    color: "#FFFFFF",
  },
  reserveBtnTextDisabled: {
    color: Colors.textTertiary,
  },
});
