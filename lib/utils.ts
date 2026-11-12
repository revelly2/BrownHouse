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
