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
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { router } from "expo-router";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Colors, Spacing, Typography, Radius } from "../../constants/colors";
import { WorkoutPlan, CompletedSession } from "../../lib/types";
import { ToastManager } from "../../components/ui/Toast";
import { Play, Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";

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
    emoji: "🎯",
    subtitle: "We'll tailor the plan around this.",
    options: [
      { label: "Build Muscle", emoji: "💪" },
      { label: "Lose Weight", emoji: "🔥" },
      { label: "Improve Endurance", emoji: "🏃" },
      { label: "Increase Strength", emoji: "🏋️" },
      { label: "Stay Active", emoji: "⚡" },
    ],
  },
  {
    key: "level",
    question: "What's your experience level?",
    emoji: "📊",
    subtitle: "Be honest — we'll match the intensity to you.",
    options: [
      { label: "Beginner", emoji: "🌱" },
      { label: "Intermediate", emoji: "⚡" },
      { label: "Advanced", emoji: "🔱" },
    ],
  },
  {
    key: "daysPerWeek",
    question: "How many days per week can you train?",
    emoji: "📅",
    subtitle: "Consistency beats perfection.",
    options: [
      { label: "2 days", emoji: "2️⃣" },
      { label: "3 days", emoji: "3️⃣" },
      { label: "4 days", emoji: "4️⃣" },
      { label: "5 days", emoji: "5️⃣" },
      { label: "6 days", emoji: "6️⃣" },
    ],
  },
  {
    key: "sessionLength",
    question: "How long is each session?",
    emoji: "⏱️",
    subtitle: "Choose what fits your schedule.",
    options: [
      { label: "30 minutes", emoji: "🕧" },
      { label: "45 minutes", emoji: "🕧" },
      { label: "1 hour", emoji: "🕐" },
      { label: "1.5 hours", emoji: "🕑" },
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
  // AI Plan Generator
  // ─────────────────────────────────────────────

  const generateAIPlan = async (preferences?: WizardAnswers) => {
    setGenerating(true);
    const showAlert = (title: string, msg: string) => {
      const type = title.toLowerCase().includes("error") ? "error" : "success";
      ToastManager.show(title, msg, type);
    };

    try {
      console.log("[AI] Calling edge function with preferences:", preferences);

      // Use supabase.functions.invoke — it handles auth tokens automatically
      const { data: plan, error: fnError } = await supabase.functions.invoke(
        "ai-recommendation",
        {
          body: preferences ? { preferences } : {},
        }
      );

      console.log("[AI] Response:", plan, "Error:", fnError);

      if (fnError) {
        showAlert("Error", fnError.message ?? "Edge function call failed.");
        return;
      }

      if (plan && plan.exercises) {
        const clientId = profile?.id ?? user?.id;
        if (!clientId) {
          showAlert("Error", "No user profile found. Please sign in again.");
          return;
        }

        const { data: planData, error: planError } = await supabase
          .from("workout_plans")
          .insert({
            client_id: clientId,
            goal: plan.goal,
            difficulty_level: plan.difficulty.toLowerCase(),
            description: plan.plan_name,
            fitt_frequency: plan.fitt.frequency,
            fitt_intensity: plan.fitt.intensity,
            fitt_time: plan.fitt.time,
            fitt_type: plan.fitt.type,
            is_ai_generated: true,
          })
          .select()
          .single();

        if (planError || !planData) {
          console.log("[AI] DB insert error:", planError);
          showAlert("Error", planError?.message ?? "Failed to save workout plan.");
          return;
        }

        const { data: dbExercises } = await supabase.from("exercises").select("id, name");
        if (dbExercises) {
          const detailsToInsert = plan.exercises
            .map((aiEx: any, index: number) => {
              const matchedEx = dbExercises.find(
                (dbEx: any) => dbEx.name.toLowerCase() === aiEx.name.toLowerCase()
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
        showAlert("✅ Success", "AI workout plan generated!");
        fetchData();
      } else {
        showAlert("Error", plan?.error ?? "Failed to generate plan. Check AI API key in Supabase.");
      }
    } catch (err: any) {
      console.error("[AI] Exception:", err);
      showAlert("Error", "Failed to connect to AI service: " + (err?.message ?? "Unknown error"));
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
        contentContainerStyle={styles.content}
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
        <Card variant="glassElevated" style={styles.aiCard}>
          <Text style={styles.aiTitle}>Build Your Workout Plan</Text>
          <Text style={styles.aiDescription}>
            Answer a few quick questions and we'll build a personalized FITT
            plan for you — or let AI generate one from your profile.
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.createPlanBtn}
              onPress={openWizard}
              activeOpacity={0.85}
            >
              <Text style={styles.createPlanEmoji}>✨</Text>
              <Text style={styles.createPlanText}>{generating ? "Generating..." : "AI Generate"}</Text>
            </TouchableOpacity>
            <Button
              title="Manual Plan"
              variant="primary"
              size="md"
              onPress={() => router.push("/client/workout-form")}
              style={{ flex: 1 }}
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
            <Card variant="outlined">
              <Text style={styles.emptyText}>
                No plans yet. Tap ✨ Create Plan or AI Generate to get started!
              </Text>
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
                      <Badge label="AI" variant="info" size="sm" />
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
                <Text style={styles.savingEmoji}>💾</Text>
                <Text style={styles.savingTitle}>Creating your plan…</Text>
                <Text style={styles.savingSubtitle}>Just a moment!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.wizardEmoji}>{currentStep?.emoji}</Text>
                <Text style={styles.wizardQuestion}>{currentStep?.question}</Text>
                <Text style={styles.wizardSubtitle}>{currentStep?.subtitle}</Text>

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
                        <Text style={styles.wizardOptionEmoji}>{opt.emoji}</Text>
                        <Text
                          style={[
                            styles.wizardOptionLabel,
                            isSelected && styles.wizardOptionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Text style={styles.wizardCheck}>✓</Text>
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
    marginBottom: Spacing.lg,
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
