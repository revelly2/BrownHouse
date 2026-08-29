import React from "react";
import { Stack } from "expo-router";
import { Colors } from "../../../constants/colors";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        headerTitle: "",
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Stack.Screen
        name="step1"
        options={{
          headerLeft: () => null, // No back button on first step
        }}
      />
      <Stack.Screen
        name="step2"
      />
      <Stack.Screen
        name="step3"
      />
    </Stack>
  );
}
