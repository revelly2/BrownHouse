// ============================================================================
// Client Tab Layout — Swiss Glassmorphic Navigation
// ============================================================================

import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Radius } from "../../constants/colors";
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
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: Typography.fontFamily.sans,
    marginTop: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapFocused: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },
});
