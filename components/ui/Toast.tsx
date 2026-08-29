// ============================================================================
// Toast Notification Component
// ============================================================================

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

type ToastType = "info" | "success" | "error";

interface ToastProps {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
}

class ToastEventManager {
  private listeners: ((toast: ToastProps) => void)[] = [];

  subscribe(listener: (toast: ToastProps) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  show(title: string, message: string, type: ToastType = "info", duration: number = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.forEach((l) => l({ id, title, message, type, duration }));
  }
}

export const ToastManager = new ToastEventManager();

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const unsubscribe = ToastManager.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      
      // Auto-remove
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration ?? 4000);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t, index) => (
        <ToastItem key={t.id} toast={t} index={index} />
      ))}
    </View>
  );
}

function ToastItem({ toast, index }: { toast: ToastProps; index: number }) {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(-20);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getTypeColor = () => {
    switch (toast.type) {
      case "success":
        return Colors.success;
      case "error":
        return Colors.error;
      default:
        return Colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
          borderColor: getTypeColor(),
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: getTypeColor() }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{toast.title}</Text>
        <Text style={styles.message}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    width: Dimensions.get("window").width * 0.9,
    maxWidth: 400,
    backgroundColor: "rgba(251, 191, 36, 0.15)", // yellow and transparent
    borderWidth: 1,
    borderRadius: Radius.lg,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: "blur(8px)",
  },
  indicator: {
    width: 4,
    height: "100%",
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 12 * Typography.lineHeight.normal,
  },
});
