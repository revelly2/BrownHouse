// ============================================================================
// Card Component — Premium Elevated Surface
// Supports: default, elevated, outlined, glass, glassElevated
// ============================================================================

import React, { PropsWithChildren } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/colors";

interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
  variant?: "default" | "elevated" | "outlined" | "glass" | "glassElevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  style,
  variant = "default",
  padding = "md",
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        padding !== "none" && styles[`padding_${padding}`],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl, // 17px
    overflow: "hidden",
  },

  // ---- Variants ----
  default: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  elevated: {
    backgroundColor: Colors.light.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  // ---- Glass variants are deprecated in Halid Treasury, mapping to solid ----
  glass: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  glassElevated: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  // ---- Padding ----
  padding_sm: {
    padding: Spacing.sm,
  },
  padding_md: {
    padding: Spacing.base,
  },
  padding_lg: {
    padding: Spacing.xl,
  },
});
