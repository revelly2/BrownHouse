// ============================================================================
// Badge Component — Status & Label Indicator
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/colors";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
  dot?: boolean;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: "rgba(0, 217, 166, 0.12)", text: Colors.success, dot: Colors.success },
  warning: { bg: "rgba(255, 184, 77, 0.12)", text: Colors.warning, dot: Colors.warning },
  error: { bg: "rgba(255, 107, 107, 0.12)", text: Colors.error, dot: Colors.error },
  info: { bg: "rgba(108, 99, 255, 0.12)", text: Colors.primary, dot: Colors.primary },
  neutral: { bg: "rgba(107, 114, 128, 0.12)", text: Colors.light.textSecondary, dot: Colors.light.textSecondary },
};

export function Badge({ label, variant = "neutral", size = "md", style, dot = false }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        { backgroundColor: colors.bg },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: colors.dot }]} />}
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.textSm : styles.textMd,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Map equipment/reservation status to badge variant
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "available":
    case "completed":
    case "fixed":
      return "success";
    case "maintenance":
    case "pending":
      return "warning";
    case "occupied":
    case "cancelled":
      return "error";
    case "confirmed":
      return "info";
    default:
      return "neutral";
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.full,
  },
  sizeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  sizeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontWeight: "600",
    textTransform: "capitalize",
  },
  textSm: {
    fontSize: Typography.fontSize.xs,
  },
  textMd: {
    fontSize: Typography.fontSize.sm,
  },
});
