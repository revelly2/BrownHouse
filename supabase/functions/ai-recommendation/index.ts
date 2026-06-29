// ============================================================================
// AI Recommendation Edge Function
// Supabase Deno Edge Function
// Generates personalized workout plans using the FITT Principle
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Type Definitions ----

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  role: string;
}

interface FITTParameters {
  frequency: string;
  intensity: string;
  time: string;
  type: string;
}

interface ExerciseRecommendation {
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  equipment_needed: string | null;
}

interface WorkoutPlanPayload {
  plan_name: string;
  difficulty: "beginner" | "advanced";
  goal: string;
  fitt: FITTParameters;
  exercises: ExerciseRecommendation[];
  notes: string;
  generated_at: string;
}

// ---- FITT Principle Rule-Based Engine (Deterministic Fallback) ----

function determineDifficulty(profile: UserProfile): "beginner" | "advanced" {
  const goal = (profile.fitness_goal ?? "").toLowerCase();
  if (
    goal.includes("advanced") ||
    goal.includes("muscle") ||
    goal.includes("strength")
  ) {
    return "advanced";
  }
  return "beginner";
}

function computeFITT(
  profile: UserProfile,
  difficulty: "beginner" | "advanced"
): FITTParameters {
  if (difficulty === "beginner") {
    return {
      frequency: "3 days/week",
      intensity: "Low to Moderate (50-65% max HR)",
      time: "30-40 min/session",
      type: "Full-body circuit with cardio warm-up",
    };
  }
  return {
    frequency: "5 days/week (Push/Pull/Legs split)",
    intensity: "Moderate to High (65-85% max HR)",
    time: "50-70 min/session",
    type: "Targeted muscle-group splits with progressive overload",
  };
}

interface ExerciseRow {
  name: string;
  muscle_group: string;
  description: string | null;
  equipment_id: string | null;
}

function buildFallbackPlan(
  profile: UserProfile,
  exercises: ExerciseRow[]
): WorkoutPlanPayload {
  const difficulty = determineDifficulty(profile);
  const fitt = computeFITT(profile, difficulty);
  const goal = profile.fitness_goal ?? "General Fitness";

  // Group exercises by muscle_group
  const grouped: Record<string, ExerciseRow[]> = {};
  for (const ex of exercises) {
    const mg = ex.muscle_group ?? "other";
    if (!grouped[mg]) grouped[mg] = [];
    grouped[mg].push(ex);
  }

  // Select 1-2 exercises per muscle group for a balanced plan
  const selected: ExerciseRecommendation[] = [];
  const setsReps =
    difficulty === "beginner"
      ? { sets: 3, reps: 12, rest: 60 }
      : { sets: 4, reps: 8, rest: 90 };

  const targetGroups =
    difficulty === "beginner"
      ? ["chest", "back", "legs", "core", "cardio"]
      : ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core"];

  for (const group of targetGroups) {
    const pool = grouped[group] ?? [];
    const pick = pool.slice(0, difficulty === "beginner" ? 1 : 2);
    for (const ex of pick) {
      selected.push({
        name: ex.name,
        muscle_group: ex.muscle_group,
        sets: group === "cardio" ? 1 : setsReps.sets,
        reps: group === "cardio" ? 1 : setsReps.reps,
        rest_seconds: group === "cardio" ? 0 : setsReps.rest,
        equipment_needed: null,
      });
    }
  }

  return {
    plan_name: `${difficulty === "beginner" ? "Foundation" : "Progressive"} Plan for ${profile.first_name}`,
    difficulty,
    goal,
    fitt,
    exercises: selected,
    notes: `Auto-generated plan based on your profile. BMI-aware adjustments applied. Goal: ${goal}.`,
    generated_at: new Date().toISOString(),
  };
}

// ---- AI API Integration (OpenAI-compatible) ----

async function generateWithAI(
  profile: UserProfile,
  exercises: ExerciseRow[]
): Promise<WorkoutPlanPayload | null> {
  const apiKey = Deno.env.get("AI_API_KEY");
  const apiUrl =
    Deno.env.get("AI_API_URL") ?? "https://api.openai.com/v1/chat/completions";
  const model = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";

  if (!apiKey) {
    console.log(
      "AI_API_KEY not configured — falling back to rule-based engine."
    );
    return null;
  }

  const exerciseNames = exercises.map((e) => e.name).join(", ");
  const bmi =
    profile.height_cm && profile.weight_kg
      ? (
          profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
        ).toFixed(1)
      : "unknown";

  const systemPrompt = `You are an expert fitness coach AI. Generate a personalized workout plan using the FITT Principle (Frequency, Intensity, Time, Type). Return ONLY valid JSON matching this exact schema:
{
  "plan_name": "string",
  "difficulty": "beginner" | "advanced",
  "goal": "string",
  "fitt": { "frequency": "string", "intensity": "string", "time": "string", "type": "string" },
  "exercises": [{ "name": "string", "muscle_group": "string", "sets": number, "reps": number, "rest_seconds": number, "equipment_needed": "string|null" }],
  "notes": "string",
  "generated_at": "ISO timestamp"
}`;

  const userPrompt = `Create a workout plan for this user:
- Name: ${profile.first_name} ${profile.last_name}
- Height: ${profile.height_cm ?? "not provided"} cm
- Weight: ${profile.weight_kg ?? "not provided"} kg
- BMI: ${bmi}
- Fitness Goal: ${profile.fitness_goal ?? "General fitness"}

Available exercises in our gym: ${exerciseNames}

Generate a balanced, safe plan using only the exercises listed above. Prioritize exercises matching the user's goal.`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error(`AI API responded with ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as WorkoutPlanPayload;
    parsed.generated_at = new Date().toISOString();
    return parsed;
  } catch (error) {
    console.error("AI generation failed:", error);
    return null;
  }
}

// ---- Main Handler ----

serve(async (req: Request) => {
  // CORS headers for mobile clients
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all exercises from the library
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("name, muscle_group, description, equipment_id");

    if (exError || !exercises) {
      return new Response(
        JSON.stringify({ error: "Failed to load exercises" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate plan — try AI first, fall back to rule-based
    let plan = await generateWithAI(profile as UserProfile, exercises);
    if (!plan) {
      console.log("Using deterministic fallback engine.");
      plan = buildFallbackPlan(profile as UserProfile, exercises);
    }

    // Persist the recommendation for audit
    await supabase.from("ai_recommendations").insert({
      client_id: user.id,
      recommended_text: plan.plan_name,
      recommended_type: "plan",
      payload: plan,
    });

    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
