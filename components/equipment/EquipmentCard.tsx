// ============================================================================
// EquipmentCard Component
// Displays equipment info with real-time status and reserve action
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../ui/Card";
import { Badge, getStatusVariant } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { Equipment } from "../../lib/types";

interface EquipmentCardProps {
  equipment: Equipment;
  onReserve?: (equipment: Equipment) => void;
  onViewDetails?: (equipment: Equipment) => void;
}

export function EquipmentCard({
  equipment,
  onReserve,
  onViewDetails,
}: EquipmentCardProps) {
  const isAvailable = equipment.status === "available";
  const typeLabel = equipment.type === "cardio" ? "🏃 Cardio" : "💪 Strength";

  return (
    <Card variant="elevated" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {equipment.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {equipment.brand ?? "Unknown Brand"} • {equipment.model_number ?? ""}
          </Text>
        </View>
        <Badge
          label={equipment.status}
          variant={getStatusVariant(equipment.status)}
          dot
        />
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoText}>{typeLabel}</Text>
        </View>
        {equipment.muscle_group && (
          <View style={styles.infoChip}>
            <Text style={styles.infoText}>
              🎯 {equipment.muscle_group}
            </Text>
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

        <Button
          title={isAvailable ? "Reserve" : "Unavailable"}
          variant={isAvailable ? "primary" : "ghost"}
          size="sm"
          disabled={!isAvailable}
          onPress={() => onReserve?.(equipment)}
        />
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
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.light.text,
  },
  brand: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoChip: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingTop: Spacing.md,
  },
  detailsLink: {
    paddingVertical: Spacing.xs,
  },
  detailsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
});
