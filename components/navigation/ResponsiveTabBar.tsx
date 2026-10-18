import React from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, Image } from "react-native";
import { Colors, Spacing, Radius, Typography } from "../../constants/colors";
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
    backgroundColor: "rgba(12, 12, 15, 0.72)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
    ...Platform.select({
      web: {
        backdropFilter: "blur(24px) saturate(190%)",
        WebkitBackdropFilter: "blur(24px) saturate(190%)",
      } as any,
    }),
  },
  logoContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing["3xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: Typography.letterSpacing.tight,
    fontFamily: Typography.fontFamily.sans,
  },
  navItemsContainer: {
    flex: 1,
    gap: 6,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "transparent",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
      } as any,
    }),
  },
  sidebarItemFocused: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderColor: "rgba(251, 191, 36, 0.22)",
    borderTopColor: "rgba(251, 191, 36, 0.32)",
  },
  iconContainer: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.sans,
    letterSpacing: Typography.letterSpacing.normal,
  },
  sidebarItemTextFocused: {
    color: Colors.primary,
    fontWeight: "600",
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
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.18)",
    gap: Spacing.md,
    ...Platform.select({
      web: {
        cursor: "pointer",
      } as any,
    }),
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error || "#EF4444",
    fontFamily: Typography.fontFamily.sans,
  },
});
