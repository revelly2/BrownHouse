// ============================================================================
// Root Layout — Auth Guard + Role-Based Routing
// ============================================================================

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth";
import { Colors } from "../constants/colors";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        <Stack.Screen name="(client)" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(admin)" options={{ animation: "slide_from_right" }} />
      </Stack>
    </AuthProvider>
  );
}
