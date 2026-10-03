// ============================================================================
// Root Layout — Auth Guard + Role-Based Routing
// ============================================================================

import React from "react";
import { LogBox, Platform } from "react-native";

// Ignore known react-native-chart-kit warning on native
LogBox.ignoreLogs(["Unknown event handler property `onPressIn`"]);

// Completely suppress it on Web so Expo's error overlay doesn't catch it
if (Platform.OS === "web") {
  // Fix React Native Web overriding the [hidden] attribute with inline display:flex
  // This causes inactive tabs to overlap when the background is transparent.
  if (typeof document !== "undefined") {
    document.body.style.backgroundColor = "#000000";
    const style = document.createElement("style");
    style.innerHTML = `
      html, body, #root {
        height: 100%;
        width: 100%;
        display: flex;
        flex: 1;
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
    <SafeAreaProvider>
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
