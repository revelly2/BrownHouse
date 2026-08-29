import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Image } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import { Colors } from "../constants/colors";

export default function Index() {
  const { session, role, loading, initialized } = useAuth();
  const pulseAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!initialized || loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [initialized, loading]);

  // Show loading spinner while initializing
  if (!initialized || loading) {
    return (
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // Not authenticated → go to login
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Role-based redirect
  if (role === "admin" || role === "trainer") {
    return <Redirect href="/admin/dashboard" />;
  }

  return <Redirect href="/client/dashboard" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'transparent',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
});
