// ============================================================================
// Client Tab Layout — Swiss Glassmorphic Navigation
// ============================================================================

import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography } from "../../constants/colors";
import { Icon, IconName } from "../../components/ui/Icon";
import { DesktopSidebar, useIsDesktop } from "../../components/navigation/ResponsiveTabBar";
import { useAuth } from "../../lib/auth";

interface TabIconProps {
  name: string;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps) {
  const icons: Record<string, IconName> = {
    dashboard: "ranking",
    equipment: "dumbbells",
    reservations: "clipboard-check",
    workouts: "running-2",
    profile: "notebook",
  };

  const iconName = icons[name] || "ranking";
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Icon
        name={iconName}
        size={24}
        color={focused ? Colors.primary : Colors.light.textTertiary}
        strokeWidth={focused ? 2 : 1.5}
      />
    </View>
  );
}

export default function ClientLayout() {
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
      tabBar={isDesktop ? (props) => <DesktopSidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          flex: 1,
          backgroundColor: "transparent",
          marginLeft: isDesktop ? 250 : 0,
        },
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
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: "Equipment",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="equipment" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="reservations" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="workouts" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout-form"
        options={{
          href: null,
          title: "Manual Plan",
          tabBarItemStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Notifications",
          tabBarItemStyle: { display: 'none' }
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
    backgroundColor: "rgba(10, 10, 10, 0.65)",
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapFocused: {
    backgroundColor: "rgba(230, 200, 79, 0.1)",
  },
});
