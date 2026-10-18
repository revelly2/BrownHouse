// ============================================================================
// Button Component — Premium UI Primitive
// Supports variants: primary, secondary, outline, ghost, danger
// ============================================================================

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.68}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? Colors.primary : "#101319"}
        />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              icon ? { marginLeft: Spacing.sm } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg, // Apple 16px squircle
    borderWidth: 1,
    borderColor: "transparent",
    ...Platform.select({
      web: {
        transition: "all 120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        cursor: "pointer",
        userSelect: "none",
      } as any,
    }),
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.45,
    ...Platform.select({
      web: {
        cursor: "not-allowed",
      } as any,
    }),
  },

  // ---- Variants ----
  primary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderTopColor: "rgba(255, 255, 255, 0.35)", // Apple light catching top edge
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 16px -2px rgba(251, 191, 36, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
      } as any,
    }),
  },
  secondary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.18)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      } as any,
    }),
  },
  outline: {
    backgroundColor: "rgba(251, 191, 36, 0.05)",
    borderColor: "rgba(251, 191, 36, 0.45)",
    borderTopColor: "rgba(251, 191, 36, 0.6)",
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },

  // ---- Sizes ----
  size_sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    minHeight: 36,
    borderRadius: Radius.md,
  },
  size_md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 3,
    minHeight: 46,
  },
  size_lg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderRadius: Radius.xl,
  },

  // ---- Typography (Apple Optical Sizing & Tracking §15) ----
  text: {
    fontWeight: "700",
    letterSpacing: -0.2, // refined Apple tracking
  },
  text_primary: {
    color: "#0a0a0c", // Crisp contrast on primary amber
  },
  text_secondary: {
    color: "#FFFFFF",
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  text_danger: {
    color: "#FFFFFF",
  },

  // ---- Text Sizes ----
  textSize_sm: {
    fontSize: Typography.fontSize.sm,
    letterSpacing: -0.1,
  },
  textSize_md: {
    fontSize: Typography.fontSize.base,
    letterSpacing: -0.2,
  },
  textSize_lg: {
    fontSize: Typography.fontSize.md,
    letterSpacing: -0.3,
  },
});
