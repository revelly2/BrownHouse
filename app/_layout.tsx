// ============================================================================
// Root Layout — Auth Guard + Role-Based Routing
// ============================================================================

import React from "react";
import { LogBox, Platform, StyleSheet } from "react-native";

// Ignore known react-native-chart-kit warning on native
LogBox.ignoreLogs(["Unknown event handler property `onPressIn`"]);

// Completely suppress it on Web so Expo's error overlay doesn't catch it
if (Platform.OS === "web") {
  // Lock viewport meta and enforce fixed screen fit on Web & mobile Expo
  if (typeof document !== "undefined") {
    document.body.style.backgroundColor = "#000000";

    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no"
    );

    const style = document.createElement("style");
    style.id = "expo-fixed-screen-styles";
    style.innerHTML = `
      html, body {
        height: 100% !important;
        width: 100% !important;
        max-width: 100vw !important;
        max-height: 100dvh !important;
        min-height: 100% !important;
        overflow: hidden !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overscroll-behavior: none !important;
        -webkit-overscroll-behavior: none !important;
        touch-action: pan-y !important;
        -webkit-user-select: none !important;
        user-select: none !important;
      }

      #root {
        height: 100% !important;
        width: 100% !important;
        max-width: 100vw !important;
        max-height: 100dvh !important;
        overflow: hidden !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        flex: 1 !important;
        flex-direction: column !important;
        overscroll-behavior: none !important;
        -webkit-overscroll-behavior: none !important;
      }

      /* Allow scrolling only within intended scroll views */
      div[style*="overflow-y: auto"],
      div[style*="overflow-y: scroll"],
      div[style*="overflow: auto"],
      div[style*="overflow: scroll"] {
        overscroll-behavior: contain !important;
        -webkit-overscroll-behavior: contain !important;
        touch-action: pan-y !important;
        user-select: auto !important;
      }

      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }

      div[aria-hidden="true"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" && 
      (args[0].includes("Unknown event handler property") || args[0].includes("Invalid DOM property"))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

import { Stack, ThemeProvider, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth";
import { Colors } from "../constants/colors";
import { ToastProvider } from "../components/ui/Toast";
import { NotificationListener } from "../components/NotificationListener";

import { AnimatedBackground } from "../components/ui/AnimatedBackground";

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.rootContainer}>
      <AuthProvider>
        <StatusBar style="light" />
        <AnimatedBackground>
          <ThemeProvider value={customTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
              <Stack.Screen name="client" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="admin" options={{ animation: "slide_from_right" }} />
            </Stack>
          </ThemeProvider>
        </AnimatedBackground>
        <NotificationListener />
        <ToastProvider />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#0a0a0c",
  },
});
