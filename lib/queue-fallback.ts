// ============================================================================
// Dynamic Queue & Fallback Logic
// Handles "Equipment Busy" events and suggests alternative exercises
// targeting the same muscle group using available equipment.
// ============================================================================

import { supabase } from "./supabase";

// ---- Type Definitions ----

export interface Equipment {
  id: string;
  name: string;
  type: string;
  muscle_group: string | null;
  status: "available" | "maintenance" | "occupied";
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  tutorial_url: string | null;
  equipment_id: string | null;
}

export interface FallbackSuggestion {
  exercise: Exercise;
  equipment: Equipment | null;
  reason: string;
}

export interface FallbackResult {
  original_equipment_id: string;
  original_exercise_id: string;
  target_muscle_group: string;
  suggestions: FallbackSuggestion[];
  timestamp: string;
}

// ---- Core Fallback Logic ----

/**
 * Given an exercise_id whose equipment just became unavailable,
 * find alternative exercises targeting the same muscle_group
 * that use currently available equipment (or require no equipment).
 */
export async function findFallbackExercises(
  exerciseId: string
): Promise<FallbackResult | null> {
  // 1. Fetch the original exercise to get its muscle_group
  const { data: originalExercise, error: exError } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment_id")
    .eq("id", exerciseId)
    .single();

  if (exError || !originalExercise) {
    console.error("Failed to fetch original exercise:", exError?.message);
    return null;
  }

  const targetMuscleGroup = originalExercise.muscle_group;

  // 2. Query all exercises with the same muscle_group, excluding the original
  const { data: alternativeExercises, error: altError } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, description, tutorial_url, equipment_id")
    .eq("muscle_group", targetMuscleGroup)
    .neq("id", exerciseId);

  if (altError || !alternativeExercises) {
    console.error("Failed to fetch alternatives:", altError?.message);
    return null;
  }

  // 3. For exercises that require equipment, check current equipment availability
  const equipmentIds = alternativeExercises
    .map((ex) => ex.equipment_id)
    .filter((id): id is string => id !== null);

  let availableEquipmentMap: Map<string, Equipment> = new Map();

  if (equipmentIds.length > 0) {
    const { data: equipmentList, error: eqError } = await supabase
      .from("equipment")
      .select("id, name, type, muscle_group, status")
      .in("id", equipmentIds)
      .eq("status", "available");

    if (!eqError && equipmentList) {
      for (const eq of equipmentList) {
        availableEquipmentMap.set(eq.id, eq as Equipment);
      }
    }
  }

  // 4. Build ranked suggestion list
  const suggestions: FallbackSuggestion[] = [];

  for (const exercise of alternativeExercises) {
    // Bodyweight exercises (no equipment required) are always available
    if (!exercise.equipment_id) {
      suggestions.push({
        exercise: exercise as Exercise,
        equipment: null,
        reason: "No equipment required — bodyweight alternative",
      });
      continue;
    }

    // Check if the required equipment is available
    const equipment = availableEquipmentMap.get(exercise.equipment_id);
    if (equipment) {
      suggestions.push({
        exercise: exercise as Exercise,
        equipment,
        reason: `${equipment.name} is currently available`,
      });
    }
    // If equipment is not available, skip this exercise
  }

  // 5. Sort: bodyweight exercises first (always available), then by name
  suggestions.sort((a, b) => {
    if (!a.equipment && b.equipment) return -1;
    if (a.equipment && !b.equipment) return 1;
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return {
    original_equipment_id: originalExercise.equipment_id ?? "",
    original_exercise_id: exerciseId,
    target_muscle_group: targetMuscleGroup,
    suggestions,
    timestamp: new Date().toISOString(),
  };
}

// ---- Notification Helper ----

/**
 * Creates an in-app notification for a client about equipment becoming unavailable
 * and includes the fallback suggestions.
 */
export async function notifyClientWithFallbacks(
  clientId: string,
  equipmentName: string,
  fallback: FallbackResult
): Promise<void> {
  const altNames = fallback.suggestions
    .slice(0, 3)
    .map((s) => s.exercise.name)
    .join(", ");

  const message =
    fallback.suggestions.length > 0
      ? `The ${equipmentName} you reserved is currently unavailable. Try these alternatives targeting ${fallback.target_muscle_group}: ${altNames}.`
      : `The ${equipmentName} you reserved is currently unavailable. No alternatives are available at this time — please check back shortly.`;

  await supabase.from("notifications").insert({
    client_id: clientId,
    title: "Equipment Unavailable — Alternatives Found",
    message,
    is_read: false,
  });
}

// ---- Realtime Equipment Status Listener ----

/**
 * Subscribes to real-time equipment status changes.
 * When equipment becomes 'maintenance' or 'occupied', it:
 *   1. Finds all active reservations for that equipment
 *   2. Looks up the exercises associated with that equipment
 *   3. Generates fallback suggestions
 *   4. Notifies affected clients
 *
 * Call this once during app initialization (e.g., in a background service or admin panel).
 */
export function subscribeToEquipmentStatus(
  onFallbackGenerated?: (clientId: string, fallback: FallbackResult) => void
) {
  const channel = supabase
    .channel("equipment-status-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "equipment",
      },
      async (payload) => {
        const newRecord = payload.new as Equipment;
        const oldRecord = payload.old as Partial<Equipment>;

        // Only trigger when equipment transitions TO unavailable
        if (
          newRecord.status !== "available" &&
          oldRecord.status === "available"
        ) {
          console.log(
            `⚠️ Equipment "${newRecord.name}" (${newRecord.id}) became ${newRecord.status}`
          );

          // Find affected confirmed reservations for today
          const today = new Date().toISOString().split("T")[0];
          const { data: affectedReservations } = await supabase
            .from("reservations")
            .select("id, client_id, equipment_id")
            .eq("equipment_id", newRecord.id)
            .eq("reservation_date", today)
            .eq("status", "confirmed");

          if (!affectedReservations || affectedReservations.length === 0) {
            console.log("No active reservations affected.");
            return;
          }

          // Find exercises that use this equipment
          const { data: affectedExercises } = await supabase
            .from("exercises")
            .select("id")
            .eq("equipment_id", newRecord.id);

          if (!affectedExercises || affectedExercises.length === 0) {
            console.log("No exercises mapped to this equipment.");
            return;
          }

          // For each affected reservation → generate fallback and notify
          for (const reservation of affectedReservations) {
            for (const exercise of affectedExercises) {
              const fallback = await findFallbackExercises(exercise.id);
              if (fallback) {
                // Notify the client
                await notifyClientWithFallbacks(
                  reservation.client_id,
                  newRecord.name,
                  fallback
                );

                // Emit callback for UI updates
                onFallbackGenerated?.(reservation.client_id, fallback);
              }
            }
          }

          console.log(
            `✅ Notified ${affectedReservations.length} client(s) with fallback suggestions.`
          );
        }
      }
    )
    .subscribe((status) => {
      console.log(`Equipment status channel: ${status}`);
    });

  // Return unsubscribe function for cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}
