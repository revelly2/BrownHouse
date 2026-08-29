import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";

export default function WorkoutFormScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    description: "",
    goal: "",
    difficulty_level: "beginner" as "beginner" | "advanced",
    frequency: "",
    intensity: "",
    time: "",
    type: "",
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.description || !form.goal) {
      if (Platform.OS === "web") {
        window.alert("Please provide a plan name and goal.");
      } else {
        Alert.alert("Missing Fields", "Please provide a plan name and goal.");
      }
      return;
    }

    const clientId = profile?.id ?? user?.id;
    if (!clientId) return;

    setSaving(true);
    const { error } = await supabase.from("workout_plans").insert({
      client_id: clientId,
      description: form.description,
      goal: form.goal,
      difficulty_level: form.difficulty_level,
      fitt_frequency: form.frequency,
      fitt_intensity: form.intensity,
      fitt_time: form.time,
      fitt_type: form.type,
      is_ai_generated: false,
    });
    setSaving(false);

    if (error) {
      if (Platform.OS === "web") {
        window.alert("Save failed: " + error.message);
      } else {
        Alert.alert("Save failed", error.message);
      }
      return;
    }

    router.replace("/client/workouts");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="glassElevated" style={styles.card}>
        <Text style={styles.title}>Manual Workout Plan</Text>
        <Text style={styles.subtitle}>Create a plan from scratch</Text>

        <Input
          label="Plan Name"
          placeholder="e.g. Summer Shred"
          value={form.description}
          onChangeText={(val) => updateForm("description", val)}
        />
        <Input
          label="Fitness Goal"
          placeholder="e.g. Build Muscle, Lose Weight"
          value={form.goal}
          onChangeText={(val) => updateForm("goal", val)}
        />

        <Text style={styles.sectionTitle}>Difficulty Level</Text>
        <View style={styles.levelRow}>
          <TouchableOpacity
            style={[styles.levelBtn, form.difficulty_level === "beginner" && styles.levelBtnActive]}
            onPress={() => updateForm("difficulty_level", "beginner")}
          >
            <Text style={[styles.levelBtnText, form.difficulty_level === "beginner" && styles.levelBtnTextActive]}>
              Beginner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.levelBtn, form.difficulty_level === "advanced" && styles.levelBtnActive]}
            onPress={() => updateForm("difficulty_level", "advanced")}
          >
            <Text style={[styles.levelBtnText, form.difficulty_level === "advanced" && styles.levelBtnTextActive]}>
              Advanced
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>FITT Parameters (Optional)</Text>
        <Input
          label="Frequency"
          placeholder="e.g. 3 days/week"
          value={form.frequency}
          onChangeText={(val) => updateForm("frequency", val)}
        />
        <Input
          label="Intensity"
          placeholder="e.g. Moderate"
          value={form.intensity}
          onChangeText={(val) => updateForm("intensity", val)}
        />
        <Input
          label="Time (Duration)"
          placeholder="e.g. 45 mins"
          value={form.time}
          onChangeText={(val) => updateForm("time", val)}
        />
        <Input
          label="Type"
          placeholder="e.g. HIIT, Strength Training"
          value={form.type}
          onChangeText={(val) => updateForm("type", val)}
        />

        <Button
          title="Save Plan"
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSave}
          style={{ marginTop: Spacing.xl }}
        />
        <Button
          title="Cancel"
          variant="outline"
          size="lg"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.md }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: Spacing["4xl"] + 8, paddingBottom: Spacing["4xl"] },
  card: { padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, marginBottom: Spacing.xs, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.md },
  levelRow: { flexDirection: "row", gap: Spacing.md },
  levelBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
  },
  levelBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "1A", // 10% opacity
  },
  levelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  levelBtnTextActive: {
    color: Colors.primary,
    fontWeight: "800",
  },
});
