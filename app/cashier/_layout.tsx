// ============================================================================
// Cashier Tab Layout — Glassmorphic Bottom Tab Navigation
// ============================================================================

import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { Icon, IconName } from "../../components/ui/Icon";
import { DesktopSidebar, useIsDesktop } from "../../components/navigation/ResponsiveTabBar";
import { useAuth } from "../../lib/auth";

const TAB_ICONS: Record<string, { icon: IconName; label: string }> = {
  dashboard: { icon: "clipboard-check", label: "Cashier" },
  sales: { icon: "course-up", label: "Sales Data" },
  products: { icon: "checklist", label: "Products" },
  logs: { icon: "notebook", label: "System Logs" },
  users: { icon: "running-2", label: "Members" },
  equipment: { icon: "dumbbells", label: "Equipment" },
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

export default function CashierLayout() {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { session, initialized } = useAuth();

  useEffect(() => {
    if (initialized && !session) {
      router.replace("/(auth)/login");
    }
  }, [session, initialized]);

  return (
    <Tabs
      sceneContainerStyle={{ 
        flex: 1,
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
          { bottom: insets.bottom > 0 ? insets.bottom : 24 },
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Cashier",
          tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales Data",
          tabBarIcon: ({ focused }) => <TabIcon name="sales" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ focused }) => <TabIcon name="products" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "System Logs",
          tabBarIcon: ({ focused }) => <TabIcon name="logs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Members",
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: "Equipment",
          tabBarIcon: ({ focused }) => <TabIcon name="equipment" focused={focused} />,
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
