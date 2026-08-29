import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../../constants/colors";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { Sprout, TrendingUp, Crown } from "lucide-react-native";

const LEVELS = [
  { id: "beginner", title: "Beginner", icon: Sprout, desc: "Just starting out" },
  { id: "intermediate", title: "Intermediate", icon: TrendingUp, desc: "Consistent for a few months" },
  { id: "professional", title: "Professional", icon: Crown, desc: "Advanced training and knowledge" },
];

export default function Step3Screen() {
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedLevel) {
      setError("Please select your experience level.");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      if (!session?.user) {
        Alert.alert(
          "Account Created",
          "Please verify your email address before signing in.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
        return;
      }

      let heightCm = parseFloat(params.height as string);
      let weightKg = parseFloat(params.weight as string);
      
      if (params.unit === "imperial") {
        heightCm = heightCm * 2.54;
        weightKg = weightKg * 0.453592;
      }

      const { error: updateError } = await supabase
         .from("profiles")
         .update({
           height_cm: heightCm,
           weight_kg: weightKg,
           fitness_goal: params.goal,
           experience_level: selectedLevel,
         })
         .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to save profile data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>Step 3 of 3</Text>
          <Text style={styles.title}>Experience Level</Text>
          <Text style={styles.subtitle}>
            Let us know your current fitness experience.
          </Text>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {LEVELS.map((level) => {
            const isSelected = selectedLevel === level.id;
            const IconComponent = level.icon;
            return (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelCard,
                  isSelected && styles.levelCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedLevel(level.id)}
              >
                <View style={styles.iconContainer}>
                  <IconComponent 
                    size={22} 
                    color={isSelected ? Colors.primary : Colors.textSecondary} 
                  />
                </View>
                <View style={styles.levelTextContainer}>
                  <Text style={[styles.levelTitle, isSelected && styles.levelTitleSelected]}>
                    {level.title}
                  </Text>
                  <Text style={[styles.levelDesc, isSelected && styles.levelDescSelected]}>
                    {level.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Complete Setup"
          onPress={handleComplete}
          loading={loading}
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
    paddingBottom: 100,
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
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  levelCardSelected: {
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
  levelTextContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  levelTitleSelected: {
    color: Colors.primary,
  },
  levelDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  levelDescSelected: {
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
