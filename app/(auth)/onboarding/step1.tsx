// ============================================================================
// Onboarding Step 1 — Body Metrics
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../../constants/colors";

export default function Step1Screen() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bmi = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return null;

    if (unit === "metric") {
      // height in cm, weight in kg
      const hMeters = h / 100;
      return (w / (hMeters * hMeters)).toFixed(1);
    } else {
      // height in inches, weight in lbs
      return ((w / (h * h)) * 703).toFixed(1);
    }
  }, [height, weight, unit]);

  const handleNext = () => {
    if (!height || !weight) {
      setError("Please enter your height and weight.");
      return;
    }
    setError(null);
    router.push({
      pathname: "/(auth)/onboarding/step2",
      params: { height, weight, unit },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 1 of 3</Text>
          <Text style={styles.title}>Body Metrics</Text>
          <Text style={styles.subtitle}>
            We need this to calculate your personalized workout plans.
          </Text>
        </View>

        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[
              styles.unitToggleBtn,
              unit === "metric" && styles.unitToggleBtnActive,
            ]}
            onPress={() => setUnit("metric")}
          >
            <Text
              style={[
                styles.unitToggleText,
                unit === "metric" && styles.unitToggleTextActive,
              ]}
            >
              Metric
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleBtn,
              unit === "imperial" && styles.unitToggleBtnActive,
            ]}
            onPress={() => setUnit("imperial")}
          >
            <Text
              style={[
                styles.unitToggleText,
                unit === "imperial" && styles.unitToggleTextActive,
              ]}
            >
              Imperial
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Input
            label={`Height (${unit === "metric" ? "cm" : "in"})`}
            placeholder={unit === "metric" ? "175" : "70"}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
          />

          <Input
            label={`Weight (${unit === "metric" ? "kg" : "lbs"})`}
            placeholder={unit === "metric" ? "70" : "150"}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />

          <View style={styles.bmiContainer}>
            <Text style={styles.bmiLabel}>Your BMI</Text>
            <Text style={styles.bmiValue}>{bmi || "--"}</Text>
          </View>

          <Button
            title="Next Step"
            onPress={handleNext}
            fullWidth
            size="lg"
            style={styles.nextButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  stepIndicator: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  unitToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.full,
  },
  unitToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  unitToggleText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  unitToggleTextActive: {
    color: "#16161A", // Dark text on gold background
  },
  form: {
    width: "100%",
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  bmiContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bmiLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  bmiValue: {
    color: Colors.primary,
    fontSize: Typography.fontSize["3xl"],
    fontWeight: "800",
  },
  nextButton: {
    marginTop: "auto",
  },
});
