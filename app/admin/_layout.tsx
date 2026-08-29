// ============================================================================
// Admin Tab Layout — Glassmorphic Bottom Tab Navigation
// ============================================================================

import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, Radius } from "../../constants/colors";
import { Icon, IconName } from "../../components/ui/Icon";
import { DesktopSidebar, useIsDesktop } from "../../components/navigation/ResponsiveTabBar";

// Clean minimal icon set
const TAB_ICONS: Record<string, { icon: IconName; label: string }> = {
  dashboard: { icon: "ranking", label: "Overview" },
  users: { icon: "chat-square-2", label: "Users" },
  "equipment-manage": { icon: "dumbbells", label: "Equipment" },
  "reservations-manage": { icon: "clipboard-check", label: "Bookings" },
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

  return (
    <Tabs
      sceneContainerStyle={{ 
        backgroundColor: "transparent",
        marginLeft: isDesktop ? 250 : 0 
      }}
      tabBar={isDesktop ? (props) => <DesktopSidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          {
            bottom: insets.bottom > 0 ? insets.bottom : 24,
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 68,
    backgroundColor: "rgba(25, 27, 33, 0.65)",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 34,
    paddingBottom: 6,
    paddingTop: 8,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    ...Platform.select({
      web: {
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      },
    }),
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerFocused: {
    backgroundColor: "rgba(230, 200, 79, 0.1)",
  },
});
