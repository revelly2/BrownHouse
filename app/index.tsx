// ============================================================================
// Index — Entry Redirect
// Routes to auth or dashboard based on session & role
// ============================================================================

import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import { Colors } from "../constants/colors";

export default function Index() {
  const { session, role, loading, initialized } = useAuth();

  // Show loading spinner while initializing
  if (!initialized || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Not authenticated → go to login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Role-based redirect
  if (role === "admin" || role === "trainer") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(client)/dashboard" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
});
