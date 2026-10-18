// ============================================================================
// Badge Component — Apple-Style Status & Label Indicator
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/colors";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "secondary";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
  dot?: boolean;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; border: string; text: string; dot: string }
> = {
  success: {
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.25)",
    text: "#34D399",
    dot: "#10B981",
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
    text: "#FBBF24",
    dot: "#F59E0B",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#F87171",
    dot: "#EF4444",
  },
  info: {
    bg: "rgba(251, 191, 36, 0.12)",
    border: "rgba(251, 191, 36, 0.25)",
    text: "#FBBF24",
    dot: "#FBBF24",
  },
  neutral: {
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#A1A1AA",
    dot: "#71717A",
  },
  secondary: {
    bg: "rgba(217, 119, 6, 0.14)",
    border: "rgba(217, 119, 6, 0.28)",
    text: "#FBBF24",
    dot: "#F59E0B",
  },
};

export function Badge({
  label,
  variant = "neutral",
  size = "md",
  style,
  dot = false,
}: BadgeProps) {
  const scheme = variantStyles[variant] || variantStyles.neutral;

  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: scheme.dot }]} />}
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.textSm : styles.textMd,
          { color: scheme.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Map equipment/reservation status to badge variant
export function getStatusVariant(status: string): BadgeVariant {
  switch (status?.toLowerCase()) {
    case "available":
    case "completed":
    case "fixed":
    case "active":
      return "success";
    case "maintenance":
    case "pending":
      return "warning";
    case "occupied":
    case "cancelled":
    case "broken":
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
    borderWidth: 1,
  },
  sizeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  sizeMd: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: 5,
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
    fontFamily: Typography.fontFamily.sans,
    letterSpacing: Typography.letterSpacing.wide,
  },
  textSm: {
    fontSize: Typography.fontSize.xs - 1,
    lineHeight: 14,
  },
  textMd: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
});
