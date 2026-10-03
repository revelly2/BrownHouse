import React from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, Image } from "react-native";
import { Colors, Spacing, Radius } from "../../constants/colors";
import { useAuth } from "../../lib/auth";
import { Icon } from "../ui/Icon";

// A Custom Sidebar for Desktop/Web users
export function DesktopSidebar({ state, descriptors, navigation }: any) {
  const { signOut } = useAuth();
  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>BROWNHOUSE GYM</Text>
      </View>
      
      <View style={styles.navItemsContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          
          // Respect the href: null option (e.g. for hidden tabs like workout-form)
          if (
            options.href === null || 
            options.tabBarItemStyle?.display === 'none' ||
            options.tabBarButton === null
          ) {
            return null;
          }
          
          const isFocused = state.index === index;
          
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={[styles.sidebarItem, isFocused && styles.sidebarItemFocused]}
            >
              <View style={styles.iconContainer}>
                {options.tabBarIcon && options.tabBarIcon({ 
                  focused: isFocused, 
                  color: isFocused ? Colors.primary : Colors.textTertiary, 
                  size: 20 
                })}
              </View>
              <Text style={[styles.sidebarItemText, isFocused && styles.sidebarItemTextFocused]}>
                {label as string}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Icon name="log-out" size={20} color={Colors.error || "#EF4444"} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper to determine if the Desktop Sidebar is active (used by layouts to apply left margin)
export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= 1024;
}

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "rgba(10, 10, 12, 0.65)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.lg,
    zIndex: 100, // ensure it floats above content
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      },
    }),
  },
  logoContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing["4xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  navItemsContainer: {
    flex: 1,
    gap: Spacing.sm,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "transparent",
    gap: Spacing.md,
  },
  sidebarItemFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  iconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  sidebarItemTextFocused: {
    color: Colors.text,
  },
  bottomContainer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    marginTop: "auto",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    gap: Spacing.md,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error || "#EF4444",
  },
});
