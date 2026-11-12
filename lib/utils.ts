/**
 * Rough workout length in minutes: cardio uses its duration; strength uses
 * sets x (reps x 3 s) plus rest between sets and 1 minute to change machines.
 */
// shortcut: assumes 3 s per rep, so timed holds stored as reps (e.g. plank 30) run long; fine for an "≈" label
export const estimateWorkoutMinutes = (
  exercises: { sets?: number | null; reps?: number | null; rest_seconds?: number | null; duration_minutes?: number | null }[]
): number => {
  const seconds = exercises.reduce((total, ex) => {
    if (ex.duration_minutes) return total + ex.duration_minutes * 60;
    const sets = ex.sets ?? 0;
    return total + sets * (ex.reps ?? 0) * 3 + Math.max(sets - 1, 0) * (ex.rest_seconds ?? 0) + 60;
  }, 0);
  return Math.round(seconds / 60);
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const bmiCategory = (bmi: number) =>
  bmi < 18.5 ? "underweight" : bmi < 25 ? "healthy" : bmi < 30 ? "overweight" : "obese";

/**
 * Plain-language reading of the weight chart: overall change, weekly pace,
 * progress toward the target weight and current BMI range (WHO cut-offs).
 */
export const interpretWeightTrend = (
  entries: { weight_kg: number | string; measured_at: string }[],
  targetKg: number | null,
  heightCm: number | null
): { headline: string; details: string[] } | null => {
  if (entries.length === 0) return null;
  const first = Number(entries[0].weight_kg);
  const last = Number(entries[entries.length - 1].weight_kg);
  const since = shortDate(entries[0].measured_at);
  const details: string[] = [];

  let headline: string;
  let perWeek = 0;
  if (entries.length < 2) {
    headline = `One check-in so far (${last} kg). Log again next week to start seeing a trend.`;
  } else {
    const change = last - first;
    const days = Math.max(
      (new Date(entries[entries.length - 1].measured_at).getTime() - new Date(entries[0].measured_at).getTime()) / 864e5,
      1
    );
    perWeek = change / (days / 7);
    headline = Math.abs(change) < 0.5
      ? `Your weight has held steady at about ${last} kg since ${since} (${entries.length} check-ins).`
      : `You've ${change < 0 ? "lost" : "gained"} ${Math.abs(change).toFixed(1)} kg since ${since}, about ${Math.abs(perWeek).toFixed(1)} kg per week.`;
    if (perWeek < -1) {
      details.push("That's faster than the 0.5–1 kg per week usually advised; make sure you're eating enough to recover.");
    }
  }

  if (targetKg) {
    const remaining = last - targetKg;
    const towardTarget = remaining !== 0 && Math.sign(perWeek) === -Math.sign(remaining) && Math.abs(perWeek) >= 0.05;
    if (Math.abs(remaining) < 0.5) {
      details.push(`You've reached your target of ${targetKg} kg.`);
    } else if (towardTarget) {
      const weeks = Math.ceil(Math.abs(remaining / perWeek));
      details.push(`${Math.abs(remaining).toFixed(1)} kg to go to your ${targetKg} kg target; at this pace that's about ${weeks} week${weeks === 1 ? "" : "s"}.`);
    } else {
      const awayNote = Math.abs(perWeek) >= 0.05 ? "and moving away from it" : "with no movement toward it yet";
      details.push(`${Math.abs(remaining).toFixed(1)} kg from your ${targetKg} kg target, ${awayNote}.`);
    }
  } else {
    details.push("No target weight set. Add one on your Profile to track progress toward a goal.");
  }

  if (heightCm) {
    const bmi = last / Math.pow(heightCm / 100, 2);
    details.push(`Current BMI ${bmi.toFixed(1)} (${bmiCategory(bmi)} range).`);
  }

  return { headline, details };
};

export const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  }
  return timeStr;
};

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
