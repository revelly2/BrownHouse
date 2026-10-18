// ============================================================================
// Input Component — Styled Text Input with Apple Design Aesthetics
// ============================================================================

import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : undefined,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : undefined,
            rightIcon ? { paddingRight: 0 } : undefined,
            style,
          ]}
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconRight}
            activeOpacity={0.65}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.xs + 2,
    letterSpacing: Typography.letterSpacing.normal,
    fontFamily: Typography.fontFamily.sans,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderTopColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    ...Platform.select({
      web: {
        transition: "border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
      } as any,
    }),
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(251, 191, 36, 0.2)",
      } as any,
    }),
  },
  inputWrapperError: {
    borderColor: Colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.18)",
      } as any,
    }),
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
    outlineStyle: "none" as any,
    fontFamily: Typography.fontFamily.sans,
    letterSpacing: Typography.letterSpacing.normal,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  error: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    fontWeight: "500",
    letterSpacing: Typography.letterSpacing.wide,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    fontWeight: "400",
    letterSpacing: Typography.letterSpacing.wide,
  },
});
