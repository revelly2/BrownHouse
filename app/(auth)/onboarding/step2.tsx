import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../../constants/colors";
import { Flame, Dumbbell, Activity, Zap } from "lucide-react-native";

const GOALS = [
  { id: "lose_weight", title: "Lose Weight", icon: Flame, desc: "Burn fat and get lean" },
  { id: "build_muscle", title: "Build Muscle", icon: Dumbbell, desc: "Gain mass and strength" },
  { id: "keep_fit", title: "Keep Fit", icon: Activity, desc: "Maintain overall health" },
  { id: "enhance_endurance", title: "Enhance Endurance", icon: Zap, desc: "Improve stamina" },
];

export default function Step2Screen() {
  const params = useLocalSearchParams();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!selectedGoal) {
      setError("Please select a fitness goal.");
      return;
    }
    setError(null);
    router.push({
      pathname: "/(auth)/onboarding/step3",
      params: { ...params, goal: selectedGoal },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 2 of 3</Text>
          <Text style={styles.title}>Fitness Goal</Text>
          <Text style={styles.subtitle}>
            What do you want to achieve with your workouts?
          </Text>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {GOALS.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            const IconComponent = goal.icon;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  isSelected && styles.goalCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedGoal(goal.id)}
              >
                <View style={styles.iconContainer}>
                  <IconComponent 
                    size={22} 
                    color={isSelected ? Colors.primary : Colors.textSecondary} 
                  />
                </View>
                <View style={styles.goalTextContainer}>
                  <Text style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}>
                    {goal.title}
                  </Text>
                  <Text style={[styles.goalDesc, isSelected && styles.goalDescSelected]}>
                    {goal.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Next Step"
          onPress={handleNext}
          fullWidth
          size="lg"
        />
      </View>
    </View>
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
    paddingBottom: 100, // Make room for footer
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
  form: {
    width: "100%",
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 24,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  goalTitleSelected: {
    color: Colors.primary,
  },
  goalDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  goalDescSelected: {
    color: Colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 34 : Spacing.xl,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
