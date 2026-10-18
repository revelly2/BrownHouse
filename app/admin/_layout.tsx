// ============================================================================
// Admin Tab Layout — Glassmorphic Bottom Tab Navigation
// ============================================================================

import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, Radius } from "../../constants/colors";
import { Icon, IconName } from "../../components/ui/Icon";
import { DesktopSidebar, useIsDesktop } from "../../components/navigation/ResponsiveTabBar";
import { useAuth } from "../../lib/auth";

// Clean minimal icon set
const TAB_ICONS: Record<string, { icon: IconName; label: string }> = {
  dashboard: { icon: "ranking", label: "Overview" },
  users: { icon: "chat-square-2", label: "Users" },
  memberships: { icon: "course-up", label: "Memberships" },
  "equipment-manage": { icon: "dumbbells", label: "Equipment" },
  "reservations-manage": { icon: "clipboard-check", label: "Bookings" },
  settings: { icon: "settings-3", label: "Settings" },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const config = TAB_ICONS[name] ?? { icon: "ranking", label: "" };
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Icon
        name={config.icon}
        size={22}
        color={focused ? Colors.primary : Colors.light.textTertiary}
        strokeWidth={focused ? 2 : 1.5}
      />
    </View>
  );
}

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { session, initialized } = useAuth();

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery")
      ) {
        router.replace("/(auth)/reset-password");
        return;
      }
    }

    if (initialized && !session) {
      router.replace("/(auth)/login");
    }
  }, [session, initialized]);

  return (
    <Tabs
      tabBar={isDesktop ? (props) => <DesktopSidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          flex: 1,
          backgroundColor: "transparent",
          marginLeft: isDesktop ? 250 : 0,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.45)",
        tabBarStyle: [
          styles.tabBar,
          {
            height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Overview",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="users" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="memberships"
        options={{
          title: "Memberships",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="memberships" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment-manage"
        options={{
          title: "Equipment",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="equipment-manage" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations-manage"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="reservations-manage" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11, 12, 16, 0.96)",
    borderTopWidth: 1,
    borderWidth: 0,
    borderColor: "transparent",
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 0,
    paddingTop: 8,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    ...Platform.select({
      web: {
        position: "fixed" as any,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      } as any,
    }),
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    fontFamily: Typography.fontFamily.sans,
    marginTop: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerFocused: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },
});
