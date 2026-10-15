// ============================================================================
// AI Service — Multi-Provider Engine (Google Gemini & Anthropic Claude Haiku)
// ============================================================================

import { supabase } from "./supabase";
import { Platform } from "react-native";

export type AIProvider = "gemini" | "claude";

export interface AISettingsConfig {
  provider: AIProvider;
  geminiModel: string;
  geminiApiKey: string;
  claudeModel: string;
  claudeApiKey: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

const STORAGE_KEY = "@brownhouse_ai_config";

const DEFAULT_AI_CONFIG: AISettingsConfig = {
  provider: "gemini",
  geminiModel: process.env.AI_MODEL || "gemini-flash-lite-latest",
  geminiApiKey: process.env.AI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  claudeModel: "claude-3-5-haiku-20241022",
  claudeApiKey: process.env.CLAUDE_API_KEY || process.env.EXPO_PUBLIC_CLAUDE_API_KEY || "",
  temperature: 0.7,
  maxTokens: 2048,
  enabled: true,
};

// In-memory cache for fast access
let cachedConfig: AISettingsConfig | null = null;

/**
 * Retrieve the current AI Configuration from Supabase app_settings or local storage
 */
export async function getAISettings(): Promise<AISettingsConfig> {
  if (cachedConfig) {
    return { ...cachedConfig };
  }

  let config: AISettingsConfig = { ...DEFAULT_AI_CONFIG };

  // Try fetching from Supabase app_settings
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .single();

    if (data) {
      if (typeof data.ai_features === "boolean") {
        config.enabled = data.ai_features;
      }
      // If ai_config jsonb column exists
      if (data.ai_config) {
        let parsed = data.ai_config;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        config = { ...config, ...parsed };
      }
    }
  } catch (err) {
    console.warn("[AIService] Failed to load from app_settings:", err);
  }

  // Fallback to local storage on web or memory
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const localStr = window.localStorage.getItem(STORAGE_KEY);
      if (localStr) {
        const localObj = JSON.parse(localStr);
        config = { ...config, ...localObj };
      }
    } catch {}
  }

  // Ensure default API keys from environment if empty
  if (!config.geminiApiKey && process.env.AI_API_KEY) {
    config.geminiApiKey = process.env.AI_API_KEY;
  }
  if (!config.claudeApiKey && process.env.CLAUDE_API_KEY) {
    config.claudeApiKey = process.env.CLAUDE_API_KEY;
  }

  cachedConfig = config;
  return { ...config };
}

/**
 * Save AI Configuration to Supabase app_settings and local storage
 */
export async function saveAISettings(
  updates: Partial<AISettingsConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getAISettings();
    const updated: AISettingsConfig = { ...current, ...updates };
    cachedConfig = updated;

    // Persist to web localStorage
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }

    // Attempt saving to Supabase app_settings
    try {
      // First try saving with ai_config column
      const { error: errWithConfig } = await supabase
        .from("app_settings")
        .update({
          ai_features: updated.enabled,
          ai_config: updated as any,
        })
        .eq("id", "global");

      if (errWithConfig) {
        // If ai_config column is missing in schema, update ai_features only
        await supabase
          .from("app_settings")
          .update({ ai_features: updated.enabled })
          .eq("id", "global");
      }
    } catch (dbErr) {
      console.warn("[AIService] Failed to sync to Supabase app_settings:", dbErr);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save AI configuration" };
  }
}

/**
 * Ping / Test an AI provider model with a quick hello prompt to test latency and connectivity
 */
export async function testAIConnection(
  provider: AIProvider,
  apiKeyParam?: string,
  modelParam?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const config = await getAISettings();
  const apiKey = (apiKeyParam !== undefined ? apiKeyParam : provider === "gemini" ? config.geminiApiKey : config.claudeApiKey).trim();
  const model = modelParam || (provider === "gemini" ? config.geminiModel : config.claudeModel);

  if (!apiKey) {
    return {
      success: false,
      message: `Missing ${provider === "gemini" ? "Google Gemini" : "Anthropic Claude"} API Key. Please provide one.`,
      latencyMs: 0,
    };
  }

  const startTime = Date.now();

  try {
    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello! Respond with the single word: READY" }] }],
          generationConfig: { maxOutputTokens: 20, temperature: 0.1 },
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            message: `Quota limit reached on ${model}. Please switch to "gemini-flash-lite-latest" for the lowest consumption tier!`,
            latencyMs,
          };
        }
        const errorMsg = data?.error?.message || `HTTP ${response.status} Error`;
        return { success: false, message: errorMsg, latencyMs };
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return {
        success: true,
        message: `Connected successfully (${model})! Response: "${text}"`,
        latencyMs,
      };
    } else {
      // Anthropic Claude
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "dangerously-allow-browser": "true",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-20241022",
          max_tokens: 30,
          temperature: 0.1,
          messages: [{ role: "user", content: "Hello! Respond with the single word: READY" }],
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} Error`;
        return { success: false, message: errorMsg, latencyMs };
      }

      const text = data?.content?.[0]?.text?.trim() || "";
      return {
        success: true,
        message: `Connected successfully (${model})! Response: "${text}"`,
        latencyMs,
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: err.message || "Network error while connecting to AI provider.",
      latencyMs,
    };
  }
}

/**
 * Generate a personalized FITT Workout Plan using either Gemini or Claude Haiku
 */
export async function generateWorkoutPlan(
  profile: any,
  exercises: any[],
  recentPlans: string[] = [],
  preferences?: any,
  providerOverride?: AIProvider
): Promise<any> {
  const config = await getAISettings();
  const provider = providerOverride || config.provider || "gemini";

  const apiKey = (provider === "gemini" ? config.geminiApiKey : config.claudeApiKey).trim();
  let model = provider === "gemini" ? config.geminiModel : config.claudeModel;

  if (!apiKey) {
    throw new Error(
      `API Key for ${provider === "gemini" ? "Google Gemini" : "Anthropic Claude"} is missing. Please configure it in Admin AI Settings.`
    );
  }

  const exerciseNames = exercises.map((e) => e.name).join(", ");
  const bmi =
    profile.height_cm && profile.weight_kg
      ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
      : "unknown";

  const systemPrompt = `You are an expert fitness coach AI at BrownHouse Fitness. Generate a personalized workout plan using the FITT Principle (Frequency, Intensity, Time, Type).
Return ONLY a valid JSON object matching this exact schema:
{
  "plan_name": "string",
  "difficulty": "beginner" | "advanced",
  "goal": "string",
  "fitt": {
    "frequency": "string",
    "intensity": "string",
    "time": "string",
    "type": "string"
  },
  "exercises": [
    {
      "name": "string",
      "muscle_group": "string",
      "sets": number,
      "reps": number,
      "rest_seconds": number,
      "equipment_needed": null
    }
  ],
  "notes": "string",
  "ai_provider": "${provider}",
  "ai_model": "${model}"
}`;

  const recentPlansText =
    recentPlans.length > 0
      ? `\nIMPORTANT: The user recently finished: "${recentPlans.join('", "')}". Provide progression and fresh variations.`
      : "";

  const preferencesText = preferences
    ? `
=== STRICT USER PREFERENCES ===
- Target Frequency: ${preferences.daysPerWeek || "Any"}
- Target Duration: ${preferences.sessionLength || "Any"}
- Goal: ${preferences.goal || "Any"}
- Experience Level: ${preferences.level || "Any"}
===============================
`
    : "";

  const userPrompt = `Create a workout plan for:
- Member Name: ${profile.first_name} ${profile.last_name}
- Height: ${profile.height_cm ?? "not set"} cm
- Weight: ${profile.weight_kg ?? "not set"} kg
- BMI: ${bmi}
- Goal: ${profile.fitness_goal ?? "General Fitness"}
${recentPlansText}
${preferencesText}

Available gym exercises: ${exerciseNames}

Rules:
1. ONLY select from the available gym exercises list above.
2. Match exercises to the user's goal and requested duration.
3. Return raw JSON without markdown code fences or backticks.`;

  let cleanJson = "";

  if (provider === "gemini") {
    // Priority order: user-configured model first, then lightweight low-consumption fallbacks
    const candidateModels = [
      model,
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let success = false;
    let lastError = "";

    for (const currentModel of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: config.temperature || 0.7,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            cleanJson = rawText;
            model = currentModel;
            success = true;
            break;
          }
        } else {
          const errData = await response.json().catch(() => null);
          lastError = errData?.error?.message || `HTTP ${response.status}`;
          console.warn(`[AI Service] Model ${currentModel} returned ${response.status}: ${lastError}. Trying next lightweight model...`);
        }
      } catch (e: any) {
        lastError = e?.message || "Network error";
      }
    }

    if (!success) {
      console.warn(`[AI Service] All Gemini models exceeded quota or failed: ${lastError}. Generating smart FITT fallback plan.`);
      return generateFITTFallbackPlan(profile, exercises, preferences, "Gemini Flash-Lite (Offline Engine)");
    }
  } else {
    // Anthropic Claude Haiku
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "dangerously-allow-browser": "true",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-20241022",
          max_tokens: config.maxTokens || 2048,
          temperature: config.temperature || 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.content?.[0]?.text;
        if (rawText) cleanJson = rawText;
      } else {
        const errorText = await response.text();
        console.warn(`[AI Service] Claude error (${response.status}): ${errorText}. Using fallback plan.`);
        return generateFITTFallbackPlan(profile, exercises, preferences, "Claude Haiku (Offline Engine)");
      }
    } catch (err: any) {
      console.warn(`[AI Service] Claude connection failed: ${err.message}. Using fallback plan.`);
      return generateFITTFallbackPlan(profile, exercises, preferences, "Claude Haiku (Offline Engine)");
    }
  }

  // Extract JSON payload
  const firstBrace = cleanJson.indexOf("{");
  const lastBrace = cleanJson.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleanJson);
    parsed.generated_at = new Date().toISOString();
    parsed.ai_provider = provider;
    parsed.ai_model = model;
    return parsed;
  } catch {
    return generateFITTFallbackPlan(profile, exercises, preferences, "Intelligent FITT Engine");
  }
}

/**
 * Intelligent deterministic FITT workout generator fallback
 * Used when API quotas are temporarily exhausted so the user is never blocked
 */
export function generateFITTFallbackPlan(
  profile: any,
  exercises: any[] = [],
  preferences?: any,
  sourceLabel: string = "FITT Intelligent Engine"
): any {
  const goal = preferences?.goal || profile?.fitness_goal || "General Fitness";
  const level = (preferences?.level || "Beginner").toLowerCase();
  const daysPerWeek = preferences?.daysPerWeek || "3 days";
  const sessionLength = preferences?.sessionLength || "45 minutes";

  const pool = exercises.length > 0 ? exercises : [
    { name: "Push Ups", muscle_group: "Chest" },
    { name: "Bodyweight Squats", muscle_group: "Legs" },
    { name: "Dumbbell Row", muscle_group: "Back" },
    { name: "Plank", muscle_group: "Core" },
    { name: "Dumbbell Shoulder Press", muscle_group: "Shoulders" },
    { name: "Lunges", muscle_group: "Legs" },
  ];

  const selectedEx = pool.slice(0, 5).map((ex) => ({
    name: ex.name,
    muscle_group: ex.muscle_group || "Full Body",
    sets: level === "advanced" ? 4 : 3,
    reps: goal.toLowerCase().includes("strength") ? 8 : 12,
    rest_seconds: level === "advanced" ? 45 : 60,
    equipment_needed: null,
  }));

  return {
    plan_name: `${goal} — ${level === "advanced" ? "Advanced" : "Foundation"} (${sourceLabel})`,
    difficulty: level === "advanced" ? "advanced" : "beginner",
    goal,
    fitt: {
      frequency: `${daysPerWeek}/week`,
      intensity: level === "advanced" ? "High" : "Moderate",
      time: sessionLength,
      type: "Strength & Conditioning",
    },
    exercises: selectedEx,
    notes: "Personalized based on your profile and fitness targets.",
    ai_provider: "gemini",
    ai_model: "gemini-flash-lite",
    generated_at: new Date().toISOString(),
    is_fallback: true,
  };
}
