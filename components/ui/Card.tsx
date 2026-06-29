// ============================================================================
// Card Component — Premium Elevated Surface
// ============================================================================

import React, { PropsWithChildren } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/colors";

interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
  variant?: "default" | "elevated" | "outlined";
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
    borderRadius: Radius.lg,
    overflow: "hidden",
  },

  // ---- Variants ----
  default: {
    backgroundColor: Colors.light.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    backgroundColor: Colors.light.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  outlined: {
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
