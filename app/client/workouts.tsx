// ============================================================================
// Workouts Screen — Plans, Sessions & Create Plan Wizard
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { router } from "expo-router";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { WorkoutPlan, CompletedSession } from "../../lib/types";
import { ToastManager } from "../../components/ui/Toast";
import { Play, Check, ChevronDown, ChevronUp, Trash2, Zap, Cpu, Sparkles, Bot } from "lucide-react-native";
import { getAISettings, generateWorkoutPlan, generateFITTFallbackPlan, AIProvider } from "../../lib/ai-service";
import { AthleteRunnerVector, KettlebellVector } from "../../components/ui/AthleteVectors";

// ─────────────────────────────────────────────
// Wizard config
// ─────────────────────────────────────────────

interface WizardAnswers {
  goal: string;
  level: string;
  daysPerWeek: string;
  sessionLength: string;
}

const WIZARD_STEPS = [
  {
    key: "goal",
    question: "What's your main fitness goal?",
    subtitle: "We'll tailor the plan around this.",
    options: [
      { label: "Build Muscle" },
      { label: "Lose Weight" },
      { label: "Improve Endurance" },
      { label: "Increase Strength" },
      { label: "Stay Active" },
    ],
  },
  {
    key: "level",
    question: "What's your experience level?",
    subtitle: "Be honest — we'll match the intensity to you.",
    options: [
      { label: "Beginner" },
      { label: "Intermediate" },
      { label: "Advanced" },
    ],
  },
  {
    key: "daysPerWeek",
    question: "How many days per week can you train?",
    subtitle: "Consistency beats perfection.",
    options: [
      { label: "2 days" },
      { label: "3 days" },
      { label: "4 days" },
      { label: "5 days" },
      { label: "6 days" },
    ],
  },
  {
    key: "sessionLength",
    question: "How long is each session?",
    subtitle: "Choose what fits your schedule.",
    options: [
      { label: "30 minutes" },
      { label: "45 minutes" },
      { label: "1 hour" },
      { label: "1.5 hours" },
    ],
  },
] as const;

// ─────────────────────────────────────────────
// FITT rule-based generator
// ─────────────────────────────────────────────

function generateFITT(answers: WizardAnswers) {
  const { goal, level, daysPerWeek, sessionLength } = answers;

  const frequency = daysPerWeek.replace(" days", " days/week");

  const intensityMap: Record<string, Record<string, string>> = {
    Beginner: {
      "Build Muscle": "Low–Medium",
      "Lose Weight": "Low–Medium",
      "Improve Endurance": "Low",
      "Increase Strength": "Medium",
      "Stay Active": "Low",
    },
    Intermediate: {
      "Build Muscle": "Medium–High",
      "Lose Weight": "Medium–High",
      "Improve Endurance": "Medium",
      "Increase Strength": "High",
      "Stay Active": "Medium",
    },
    Advanced: {
      "Build Muscle": "High",
      "Lose Weight": "High",
      "Improve Endurance": "High",
      "Increase Strength": "Very High",
      "Stay Active": "Medium–High",
    },
  };
  const intensity = intensityMap[level]?.[goal] ?? "Medium";
  const time = sessionLength;

  const typeMap: Record<string, string> = {
    "Build Muscle": "Hypertrophy / Strength",
    "Lose Weight": "HIIT / Cardio",
    "Improve Endurance": "Cardio / Aerobic",
    "Increase Strength": "Powerlifting / Strength",
    "Stay Active": "General Fitness",
  };
  const type = typeMap[goal] ?? "General Fitness";
  const description = `${goal} — ${level} Plan`;
  // Map wizard level to DB enum (only "beginner" | "advanced")
  const difficulty_level: "beginner" | "advanced" =
    level === "Beginner" ? "beginner" : "advanced";

  return { frequency, intensity, time, type, description, goal, difficulty_level };
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UIWorkoutPlan extends WorkoutPlan {
  workout_details?: {
    id: string;
    sets: number;
    reps: number;
    rest_seconds: number | null;
    exercise: {
      name: string;
      muscle_group: string;
    } | null;
  }[];
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function WorkoutsScreen() {
  const { profile, user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 600;
  const horizontalPadding = isMobile ? Spacing.md : Spacing.xl;
  const [plans, setPlans] = useState<UIWorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active session state
  const [activePlan, setActivePlan] = useState<UIWorkoutPlan | null>(null);
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const lastActionTimeRef = useRef<Date | null>(null);
  const [exerciseTimings, setExerciseTimings] = useState<Record<string, number>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // ── AI Engine Selection (Google Gemini) ──
  const selectedAiProvider: AIProvider = "gemini";

  // ── Wizard state ──
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<Partial<WizardAnswers>>({});
  const [saving, setSaving] = useState(false);

  // ─────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────

  const formatDurationMs = (ms: number) => {
    if (!ms || ms < 0) return "0sec";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}hr`);
    if (m > 0 || h > 0) parts.push(`${m}min`);
    parts.push(`${s}sec`);
    return parts.join(" ");
  };

  const fetchData = async () => {
    if (!profile) return;
    const [plansRes, sessionsRes] = await Promise.all([
      supabase
        .from("workout_plans")
        .select(`
          *,
          workout_details (
            id, sets, reps, rest_seconds,
            exercise:exercises ( name, muscle_group )
          )
        `)
        .eq("client_id", profile.id)
        .order("creation_date", { ascending: false })
        .limit(5),
      supabase
        .from("completed_sessions")
        .select("*")
        .eq("client_id", profile.id)
        .order("date", { ascending: false })
        .limit(10),
    ]);
    if (plansRes.data) setPlans(plansRes.data as UIWorkoutPlan[]);
    if (sessionsRes.data) setSessions(sessionsRes.data as CompletedSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ─────────────────────────────────────────────
  // AI Plan Generator (Google Gemini Engine)
  // ─────────────────────────────────────────────

  const generateAIPlan = async (preferences?: WizardAnswers) => {
    setGenerating(true);
    const showAlert = (title: string, msg: string) => {
      const type = title.toLowerCase().includes("error") ? "error" : "success";
      ToastManager.show(title, msg, type);
    };

    try {
      const { data: dbExercises } = await supabase.from("exercises").select("id, name, muscle_group");
      const recentPlanTitles = plans.map(p => p.description || p.goal);

      let plan: any = null;

      // 1. Attempt edge function call first
      try {
        const { data: edgeData, error: fnError } = await supabase.functions.invoke(
          "ai-recommendation",
          {
            body: {
              preferences,
              customProvider: selectedAiProvider,
            },
          }
        );
        if (!fnError && edgeData && edgeData.exercises) {
          plan = edgeData;
        }
      } catch (e) {
        console.warn("Edge function invocation failed, trying direct AI service:", e);
      }

      // 2. Direct service fallback if edge function isn't available locally
      if (!plan || !plan.exercises) {
        plan = await generateWorkoutPlan(
          profile,
          dbExercises || [],
          recentPlanTitles,
          preferences,
          selectedAiProvider
        );
      }

      if (plan && plan.exercises) {
        const clientId = profile?.id ?? user?.id;
        if (!clientId) {
          showAlert("Error", "No user profile found. Please sign in again.");
          return;
        }

        const planName = plan.plan_name?.includes("AI") 
          ? plan.plan_name 
          : `${plan.plan_name || plan.goal} (Gemini AI)`;

        const { data: planData, error: planError } = await supabase
          .from("workout_plans")
          .insert({
            client_id: clientId,
            goal: plan.goal || preferences?.goal || "Fitness",
            difficulty_level: (plan.difficulty || preferences?.level || "beginner").toLowerCase(),
            description: planName,
            fitt_frequency: plan.fitt?.frequency || "3-4 days/week",
            fitt_intensity: plan.fitt?.intensity || "Moderate",
            fitt_time: plan.fitt?.time || "45 minutes",
            fitt_type: plan.fitt?.type || "General Fitness",
            is_ai_generated: true,
          })
          .select()
          .single();

        if (planError || !planData) {
          showAlert("Error", planError?.message ?? "Failed to save workout plan.");
          return;
        }

        if (dbExercises) {
          const detailsToInsert = plan.exercises
            .map((aiEx: any, index: number) => {
              const matchedEx = dbExercises.find(
                (dbEx: any) => dbEx.name.toLowerCase() === aiEx.name.toLowerCase()
              ) || dbExercises.find(
                (dbEx: any) => dbEx.muscle_group?.toLowerCase() === (aiEx.muscle_group || "").toLowerCase()
              );
              if (!matchedEx) return null;
              return {
                plan_id: planData.id,
                exercise_id: matchedEx.id,
                sets: aiEx.sets ?? 3,
                reps: aiEx.reps ?? 10,
                rest_seconds: aiEx.rest_seconds ?? 60,
                ordering: index,
              };
            })
            .filter(Boolean);

          if (detailsToInsert.length > 0) {
            await supabase.from("workout_details").insert(detailsToInsert);
          }
        }

        showAlert("Success", "AI Plan generated with Google Gemini!");
        fetchData();
      } else {
        showAlert("Error", plan?.error ?? "Failed to generate plan exercises.");
      }
    } catch (err: any) {
      console.warn("[AI] Error encountered, activating intelligent FITT fallback:", err);
      try {
        const { data: dbExercises } = await supabase.from("exercises").select("id, name, muscle_group");
        const fallbackPlan = generateFITTFallbackPlan(profile, dbExercises || [], preferences, "Intelligent Engine");
        const clientId = profile?.id ?? user?.id;
        if (clientId) {
          const { data: planData } = await supabase.from("workout_plans").insert({
            client_id: clientId,
            goal: fallbackPlan.goal,
            difficulty_level: fallbackPlan.difficulty,
            description: fallbackPlan.plan_name,
            fitt_frequency: fallbackPlan.fitt.frequency,
            fitt_intensity: fallbackPlan.fitt.intensity,
            fitt_time: fallbackPlan.fitt.time,
            fitt_type: fallbackPlan.fitt.type,
            is_ai_generated: true,
          }).select().single();

          if (planData && dbExercises) {
            const detailsToInsert = fallbackPlan.exercises.map((ex: any, idx: number) => {
              const matched = dbExercises.find((d: any) => d.name.toLowerCase() === ex.name.toLowerCase());
              if (!matched) return null;
              return {
                plan_id: planData.id,
                exercise_id: matched.id,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                ordering: idx,
              };
            }).filter(Boolean);

            if (detailsToInsert.length > 0) {
              await supabase.from("workout_details").insert(detailsToInsert);
            }
          }
          showAlert("Plan Ready", "Generated using intelligent fitness engine (AI quota exhausted).");
          fetchData();
          return;
        }
      } catch (innerErr) {
        console.warn("[AI] Fallback error:", innerErr);
      }
      showAlert("Notice", "Could not generate plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ─────────────────────────────────────────────
  // Plan management
  // ─────────────────────────────────────────────

  const handleDeletePlan = (planId: string) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      );
      if (confirmed) performDeletePlan(planId);
    } else {
      Alert.alert(
        "Delete Plan",
        "Are you sure you want to delete this plan? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => performDeletePlan(planId) },
        ]
      );
    }
  };

  const performDeletePlan = async (planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
    if (error) {
      ToastManager.show("Error", "Delete failed: " + error.message, "error");
      fetchData();
    }
  };

  // ─────────────────────────────────────────────
  // Active session
  // ─────────────────────────────────────────────

  const startSession = (plan: UIWorkoutPlan) => {
    setActivePlan(plan);
    setCheckedExercises(new Set());
    setExerciseTimings({});
    const now = new Date();
    startTimeRef.current = now;
    lastActionTimeRef.current = now;
  };

  const toggleExercise = (detailId: string) => {
    const now = new Date();
    setCheckedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(detailId)) {
        next.delete(detailId);
        setExerciseTimings((prevT) => {
          const nextT = { ...prevT };
          delete nextT[detailId];
          return nextT;
        });
      } else {
        next.add(detailId);
        const timeTaken = lastActionTimeRef.current
          ? now.getTime() - lastActionTimeRef.current.getTime()
          : 0;
        setExerciseTimings((prevT) => ({ ...prevT, [detailId]: timeTaken }));
        lastActionTimeRef.current = now;
      }
      return next;
    });
  };

  const cancelSession = () => {
    setActivePlan(null);
    setCheckedExercises(new Set());
    setExerciseTimings({});
    startTimeRef.current = null;
    lastActionTimeRef.current = null;
  };

  const finishSession = async () => {
    if (!activePlan || !profile) return;
    setFinishing(true);
    const endTime = new Date();
    const durationMinutes = startTimeRef.current
      ? Math.max(1, Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000))
      : null;
    const durationMs = startTimeRef.current
      ? endTime.getTime() - startTimeRef.current.getTime()
      : null;
    const totalExercises = activePlan.workout_details?.length ?? 0;
    const completedCount = checkedExercises.size;
    const timingsByName: Record<string, number> = {};
    activePlan.workout_details?.forEach((d) => {
      if (exerciseTimings[d.id]) {
        timingsByName[d.exercise?.name ?? "Exercise"] = exerciseTimings[d.id];
      }
    });
    const { error } = await supabase.from("completed_sessions").insert({
      client_id: profile.id,
      plan_id: activePlan.id,
      duration_minutes: durationMinutes,
      notes: `Completed ${completedCount}/${totalExercises} exercises from "${activePlan.description ?? activePlan.goal}"`,
      performance_metrics: {
        exercises_completed: completedCount,
        exercises_total: totalExercises,
        duration_ms: durationMs,
        exercise_timings: timingsByName,
      },
    });
    if (error) {
      ToastManager.show("Error", error.message, "error");
    } else {
      ToastManager.show("Workout Complete!", "Session saved to your history.", "success");
      cancelSession();
      fetchData();
    }
    setFinishing(false);
  };

  // ─────────────────────────────────────────────
  // Wizard handlers
  // ─────────────────────────────────────────────

  const currentStep = WIZARD_STEPS[wizardStep];
  const stepKey = currentStep?.key as keyof WizardAnswers;

  const openWizard = () => {
    setWizardStep(0);
    setWizardAnswers({});
    setShowWizard(true);
  };

  const handleWizardOption = async (value: string) => {
    const updated = { ...wizardAnswers, [stepKey]: value };
    setWizardAnswers(updated);

    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep((s) => s + 1);
    } else {
      // All 4 answered — save the plan
      await savePlanFromWizard(updated as WizardAnswers);
    }
  };

  const savePlanFromWizard = async (answers: WizardAnswers) => {
    setShowWizard(false);
    setWizardStep(0);
    setWizardAnswers({});
    
    // Pass the wizard answers to the AI generator
    await generateAIPlan(answers);
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) setWizardStep((s) => s - 1);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setWizardStep(0);
    setWizardAnswers({});
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: isMobile ? Spacing["2xl"] + 12 : Spacing["4xl"],
            paddingBottom: Math.max(105, 80 + insets.bottom),
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Workouts</Text>
          <Text style={styles.subtitle}>
            {plans.length} plans • {sessions.length} sessions logged
          </Text>
        </View>

        {/* Create & AI Card */}
        <Card variant="glassElevated" style={[styles.aiCard, { position: "relative", overflow: "hidden" }, isMobile && { padding: Spacing.lg }]}>
          <View style={{ zIndex: 2, maxWidth: 640 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, flexWrap: 'wrap', gap: 8 }}>
              <Text style={styles.aiTitle}>Build Your Workout Plan</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(235, 94, 40, 0.12)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: Radius.full,
                borderWidth: 1,
                borderColor: 'rgba(235, 94, 40, 0.3)'
              }}>
                <Zap size={13} color={Colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary }}>
                  Gemini Flash-Lite Active
                </Text>
              </View>
            </View>

            <Text style={styles.aiDescription}>
              Answer a few quick questions to let Google Gemini AI generate a personalized FITT workout plan for you.
            </Text>

            <View style={[styles.btnRow, isMobile && { flexDirection: "column", gap: 10 }]}>
              <TouchableOpacity
                style={[styles.createPlanBtn, isMobile && { width: "100%", justifyContent: "center" }]}
                onPress={openWizard}
                activeOpacity={0.85}
                disabled={generating}
              >
                <Sparkles size={16} color="#0A0A0C" strokeWidth={2} />
                <Text style={styles.createPlanText}>
                  {generating ? "Generating Plan..." : "AI Generate Workout Plan"}
                </Text>
              </TouchableOpacity>
              <Button
                title="Manual Plan"
                variant="outline"
                size="md"
                onPress={() => router.push("/client/workout-form")}
                style={isMobile ? { width: "100%" } : { flex: 1 }}
              />
            </View>
          </View>

          {/* Stylized Human Athlete Training Vector Art */}
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: isMobile ? "100%" : "45%",
              maxWidth: 380,
              zIndex: 1,
              overflow: "hidden",
              borderTopRightRadius: Radius.xl,
              borderBottomRightRadius: Radius.xl,
            }}
            pointerEvents="none"
          >
            <Image
              source={require("../../assets/vector-athlete-cardio.jpg")}
              style={{ width: "100%", height: "100%", opacity: isMobile ? 0.22 : 0.88 }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={isMobile ? ["#18181c", "rgba(24, 24, 28, 0.8)", "rgba(24, 24, 28, 0.35)"] : ["#18181c", "rgba(24, 24, 28, 0.45)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Card>

        {/* Active Session */}
        {activePlan && (
          <Card variant="elevated" style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <Text style={styles.activeSessionTitle}>Today's Workout</Text>
              <Badge
                label={`${checkedExercises.size}/${activePlan.workout_details?.length ?? 0}`}
                variant={
                  checkedExercises.size === (activePlan.workout_details?.length ?? 0)
                    ? "success"
                    : "info"
                }
                size="sm"
              />
            </View>
            <Text style={styles.activeSessionPlan}>
              {activePlan.description ?? activePlan.goal}
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      activePlan.workout_details?.length
                        ? (checkedExercises.size / activePlan.workout_details.length) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <View style={styles.checklistContainer}>
              {activePlan.workout_details?.map((detail, index) => {
                const isChecked = checkedExercises.has(detail.id);
                return (
                  <TouchableOpacity
                    key={detail.id || index}
                    style={styles.checklistRow}
                    onPress={() => toggleExercise(detail.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.checklistInfo}>
                      <Text style={[styles.checklistName, isChecked && styles.checklistNameDone]}>
                        {detail.exercise?.name ?? "Exercise"}
                      </Text>
                      <Text style={styles.checklistMeta}>
                        {detail.exercise?.muscle_group ?? ""} • {detail.sets}x{detail.reps}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.sessionActions}>
              <Button
                title={finishing ? "Saving..." : "Finish Workout"}
                variant="primary"
                size="lg"
                fullWidth
                loading={finishing}
                disabled={checkedExercises.size === 0}
                onPress={finishSession}
              />
              <Button
                title="Cancel Session"
                variant="ghost"
                size="sm"
                onPress={cancelSession}
                style={styles.cancelButton}
              />
            </View>
          </Card>
        )}

        {/* Workout Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Plans</Text>
          {plans.length === 0 ? (
            <Card variant="glass" style={{ padding: Spacing.xl, alignItems: "center" }}>
              <View style={{ marginBottom: Spacing.md, opacity: 0.85 }}>
                <KettlebellVector width={88} height={88} opacity={0.65} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 4 }}>
                No active workout routine
              </Text>
              <Text style={[styles.emptyText, { maxWidth: 380, marginBottom: Spacing.md }]}>
                Design a custom strength regimen or generate a personalized routine with our AI Coach.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(251, 191, 36, 0.3)",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: Radius.md,
                }}
                onPress={openWizard}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: "700" }}>
                  Launch AI Wizard
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planGoal}>{plan.goal}</Text>
                    <Text style={styles.planDescription} numberOfLines={1}>
                      {plan.description}
                    </Text>
                  </View>
                  <View style={styles.planBadges}>
                    <Badge
                      label={plan.difficulty_level}
                      variant={plan.difficulty_level === "beginner" ? "success" : "warning"}
                      size="sm"
                    />
                    {plan.is_ai_generated && (
                      <Badge
                        label="Gemini AI"
                        variant="info"
                        size="sm"
                      />
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeletePlan(plan.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 color={Colors.error} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>

                {plan.fitt_frequency && (
                  <View style={styles.fittGrid}>
                    <View style={styles.fittItem}>
                      <Text style={styles.fittLabel}>Frequency</Text>
                      <Text style={styles.fittValue}>{plan.fitt_frequency}</Text>
                    </View>
                    <View style={styles.fittItem}>
                      <Text style={styles.fittLabel}>Intensity</Text>
                      <Text style={styles.fittValue}>{plan.fitt_intensity}</Text>
                    </View>
                    <View style={styles.fittItem}>
                      <Text style={styles.fittLabel}>Time</Text>
                      <Text style={styles.fittValue}>{plan.fitt_time}</Text>
                    </View>
                    <View style={styles.fittItem}>
                      <Text style={styles.fittLabel}>Type</Text>
                      <Text style={styles.fittValue}>{plan.fitt_type}</Text>
                    </View>
                  </View>
                )}

                {plan.workout_details && plan.workout_details.length > 0 && (
                  <View style={styles.exercisesList}>
                    <Text style={styles.exercisesTitle}>Exercises</Text>
                    {plan.workout_details.map((detail, index) => (
                      <View key={detail.id || index} style={styles.exerciseRow}>
                        <Text style={styles.exerciseIndex}>{index + 1}</Text>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>
                            {detail.exercise?.name ?? "Exercise"}
                          </Text>
                          <Text style={styles.exerciseMuscle}>
                            {detail.exercise?.muscle_group ?? ""}
                          </Text>
                        </View>
                        <Text style={styles.exerciseSetsReps}>
                          {detail.sets}x{detail.reps} ({detail.rest_seconds}s rest)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {!activePlan && plan.workout_details && plan.workout_details.length > 0 && (
                  <Button
                    title="Use This for Today"
                    variant="outline"
                    size="md"
                    fullWidth
                    onPress={() => startSession(plan)}
                    style={styles.useForTodayButton}
                  />
                )}
              </Card>
            ))
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.length === 0 ? (
            <Card variant="glass">
              <Text style={styles.emptyText}>No completed sessions yet.</Text>
            </Card>
          ) : (
            sessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              const metrics = (session.performance_metrics as Record<string, any>) ?? {};
              const exercisesDone = metrics.exercises_completed ?? 0;
              const exercisesTotal = metrics.exercises_total ?? 0;
              let displayDuration = "—";
              if (metrics.duration_ms != null) {
                displayDuration = formatDurationMs(metrics.duration_ms);
              } else if (session.duration_minutes != null) {
                displayDuration = `${session.duration_minutes} min`;
              }
              const sessionExerciseTimings = metrics.exercise_timings as
                | Record<string, number>
                | undefined;
              return (
                <TouchableOpacity
                  key={session.id}
                  activeOpacity={0.8}
                  onPress={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <Card variant="glass" style={styles.sessionCard}>
                    <View style={styles.sessionRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionDate}>
                          {new Date(session.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        {session.notes && (
                          <Text
                            style={styles.sessionNotes}
                            numberOfLines={isExpanded ? undefined : 1}
                          >
                            {session.notes}
                          </Text>
                        )}
                      </View>
                      <View style={styles.sessionBadgeArea}>
                        {displayDuration !== "—" && (
                          <Text style={styles.sessionDuration}>{displayDuration}</Text>
                        )}
                        <Text style={styles.expandArrow}>{isExpanded ? "▲" : "▼"}</Text>
                      </View>
                    </View>
                    {isExpanded && (
                      <View style={styles.sessionDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Total Time</Text>
                          <Text style={styles.detailValue}>{displayDuration}</Text>
                        </View>
                        {exercisesTotal > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Exercises</Text>
                            <Text style={styles.detailValue}>
                              {exercisesDone}/{exercisesTotal} completed
                            </Text>
                          </View>
                        )}
                        {sessionExerciseTimings &&
                          Object.keys(sessionExerciseTimings).length > 0 && (
                            <View style={styles.exercisesTimingsSection}>
                              <Text style={styles.exercisesTimingsTitle}>
                                Exercise Breakdown
                              </Text>
                              {Object.entries(sessionExerciseTimings).map(([name, timeMs]) => (
                                <View key={name} style={styles.timingRow}>
                                  <Text style={styles.timingName} numberOfLines={1}>
                                    {name}
                                  </Text>
                                  <Text style={styles.timingValue}>
                                    {formatDurationMs(timeMs)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ─── Create Plan Wizard Modal ─── */}
      <Modal
        visible={showWizard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeWizard}
      >
        <View style={styles.wizardContainer}>
          {/* Progress bar */}
          <View style={styles.progressWizardBg}>
            <View
              style={[
                styles.progressWizardFill,
                { width: `${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%` },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.wizardHeader}>
            <TouchableOpacity
              onPress={handleWizardBack}
              disabled={wizardStep === 0}
              style={[styles.wizardNavBtn, wizardStep === 0 && { opacity: 0 }]}
            >
              <Text style={styles.wizardNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.wizardStepIndicator}>
              {wizardStep + 1} of {WIZARD_STEPS.length}
            </Text>
            <TouchableOpacity onPress={closeWizard} style={styles.wizardNavBtn}>
              <Text style={styles.wizardCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.wizardContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Saving overlay */}
            {saving ? (
              <View style={styles.savingContainer}>
                <Sparkles size={32} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.savingTitle}>Creating your plan…</Text>
                <Text style={styles.savingSubtitle}>Just a moment!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.wizardQuestion}>{currentStep?.question}</Text>
                <Text style={styles.wizardSubtitle}>
                  Gemini AI Coach • {currentStep?.subtitle}
                </Text>

                <View style={styles.wizardOptions}>
                  {currentStep?.options.map((opt) => {
                    const isSelected = wizardAnswers[stepKey] === opt.label;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.wizardOption,
                          isSelected && styles.wizardOptionSelected,
                        ]}
                        onPress={() => handleWizardOption(opt.label)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.wizardOptionLabel,
                            isSelected && styles.wizardOptionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={Colors.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.wizardHint}>Tap an option to continue →</Text>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120, maxWidth: 1024, alignSelf: 'center', width: '100%' },

  header: { paddingTop: Spacing["4xl"], paddingBottom: Spacing.md },
  title: { fontSize: Typography.fontSize.xl, fontWeight: "800", color: Colors.light.text },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.light.textSecondary, marginTop: 4 },

  // ── Create & AI card ──
  aiCard: { marginBottom: Spacing.xl, padding: Spacing.xl },
  aiTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  aiDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing.md,
  },
  btnRow: { flexDirection: "row", gap: Spacing.sm },
  createPlanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: "rgba(230,200,79,0.4)",
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 44,
  },
  createPlanEmoji: { fontSize: 15 },
  createPlanText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: Typography.fontSize.base,
  },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },

  // ── Plan cards ──
  planCard: { marginBottom: Spacing.md },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  planInfo: { flex: 1, marginRight: Spacing.sm },
  planGoal: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.light.text,
  },
  planDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  planBadges: { flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  deleteBtn: { marginLeft: Spacing.sm },

  fittGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingTop: Spacing.md,
  },
  fittItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: 'transparent',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  fittLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fittValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.text,
    fontWeight: "500",
  },

  exercisesList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  exercisesTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    backgroundColor: 'transparent',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  exerciseIndex: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "bold",
    color: Colors.light.textSecondary,
    width: 20,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.light.text,
  },
  exerciseMuscle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
    textTransform: "capitalize",
  },
  exerciseSetsReps: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "500",
    color: Colors.light.textSecondary,
  },
  useForTodayButton: { marginTop: Spacing.md },

  // ── Session cards ──
  sessionCard: { marginBottom: Spacing.sm },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionDate: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.light.text,
  },
  sessionDuration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: Colors.primary,
    marginBottom: 2,
  },
  sessionNotes: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sessionBadgeArea: { alignItems: "flex-end", marginLeft: Spacing.md },
  expandArrow: { fontSize: 10, color: Colors.light.textTertiary },
  sessionDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs + 2,
  },
  detailLabel: { fontSize: Typography.fontSize.sm, color: Colors.light.textSecondary },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.light.text,
  },
  exercisesTimingsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  exercisesTimingsTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  timingName: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textTertiary,
    paddingRight: Spacing.md,
  },
  timingValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "500",
    color: Colors.light.text,
  },

  // ── Active session ──
  activeSessionCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  activeSessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  activeSessionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: "700",
    color: Colors.light.text,
  },
  activeSessionPlan: {
    fontSize: Typography.fontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 3,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  progressBarFill: { height: 6, backgroundColor: Colors.success, borderRadius: 3 },
  checklistContainer: { marginBottom: Spacing.lg },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.textTertiary,
    marginRight: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  checklistInfo: { flex: 1 },
  checklistName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.light.text,
  },
  checklistNameDone: { textDecorationLine: "line-through", color: Colors.light.textTertiary },
  checklistMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sessionActions: { alignItems: "center" },
  cancelButton: { marginTop: Spacing.sm },

  // ── Wizard modal ──
  wizardContainer: { flex: 1, backgroundColor: Colors.background },
  progressWizardBg: { height: 3, backgroundColor: Colors.border },
  progressWizardFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 99,
  },
  wizardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  wizardNavBtn: { padding: 4, minWidth: 32 },
  wizardNavText: {
    fontSize: 26,
    color: Colors.text,
    fontWeight: "300",
    lineHeight: 28,
  },
  wizardCloseText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "right",
  },
  wizardStepIndicator: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },
  wizardContent: {
    padding: Spacing.xl,
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing["5xl"],
  },
  savingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  savingEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  savingTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  savingSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  wizardEmoji: { fontSize: 52, textAlign: "center", marginBottom: Spacing.lg },
  wizardQuestion: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  wizardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  wizardOptions: { gap: Spacing.sm },
  wizardOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  wizardOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(230,200,79,0.1)",
  },
  wizardOptionEmoji: { fontSize: 22 },
  wizardOptionLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text,
  },
  wizardOptionLabelSelected: { color: Colors.primary },
  wizardCheck: { fontSize: 16, color: Colors.primary, fontWeight: "700" },
  wizardHint: {
    marginTop: Spacing.xl,
    textAlign: "center",
    color: Colors.textTertiary,
    fontSize: Typography.fontSize.xs,
  },
});
