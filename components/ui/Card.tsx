// ============================================================================
// Card Component — Premium Elevated Surface
// Supports: default, elevated, outlined, glass, glassElevated
// ============================================================================

import React, { PropsWithChildren } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/colors";

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
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
    borderRadius: Radius.xl, // Apple squircle 22px
    overflow: "hidden",
  },

  // ---- Variants ----
  default: {
    backgroundColor: "rgba(24, 24, 28, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      } as any,
    }),
  },
  elevated: {
    backgroundColor: "rgba(32, 32, 38, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.22)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 14px 36px -8px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)",
      } as any,
    }),
  },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  // ---- Apple Frosted Translucent Materials (Apple Design §12) ----
  glass: {
    backgroundColor: "rgba(24, 24, 28, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.22)", // light catching the top material edge
    ...Platform.select({
      web: {
        backdropFilter: "blur(24px) saturate(190%)",
        WebkitBackdropFilter: "blur(24px) saturate(190%)",
        boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)",
      } as any,
    }),
  },
  glassElevated: {
    backgroundColor: "rgba(32, 32, 38, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderTopColor: "rgba(255, 255, 255, 0.28)", // bright top edge
    ...Platform.select({
      web: {
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        boxShadow: "0 20px 48px -10px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)",
      } as any,
    }),
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
