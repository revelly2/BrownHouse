import { supabase } from "./supabase";
import { Reservation, ReservationMetadata } from "./types";

export type { ReservationMetadata };

/**
 * Safely parse reservation notes column, handling both JSON format and legacy flags
 */
export function parseReservationMetadata(notes: string | null | undefined): ReservationMetadata {
  const defaultMeta: ReservationMetadata = {
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    notified_5min_start: false,
    notified_5min_end: false,
    auto_cancelled: false,
    cancel_reason: null,
  };

  if (!notes || typeof notes !== "string") {
    return defaultMeta;
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object") {
      return {
        ...defaultMeta,
        ...parsed,
        // Support legacy arrival field
        checked_in: Boolean(parsed.checked_in ?? parsed.is_arrived ?? false),
        auto_cancelled: Boolean(parsed.auto_cancelled ?? false),
      };
    }
  } catch {
    // If notes is plain string, check for legacy keywords
    if (notes.includes('"is_arrived":true') || notes.includes('"checked_in":true')) {
      defaultMeta.checked_in = true;
    }
    if (notes.includes('"auto_cancelled":true')) {
      defaultMeta.auto_cancelled = true;
    }
  }

  return defaultMeta;
}

/**
 * Serializes updated metadata into JSON string for the notes column
 */
export function serializeReservationMetadata(
  updates: Partial<ReservationMetadata>,
  existingNotes?: string | null
): string {
  const existing = parseReservationMetadata(existingNotes);
  const merged: ReservationMetadata = {
    ...existing,
    ...updates,
  };
  return JSON.stringify(merged);
}

/**
 * Computes exact timing and lifecycle state for a given reservation
 */
export function getReservationState(reservation: Reservation, currentTime: Date = new Date()) {
  const metadata = parseReservationMetadata(reservation.notes);

  // Construct start and end Date objects in local time
  // reservation_date: "YYYY-MM-DD", start_time: "HH:MM:SS" or "HH:MM"
  const [year, month, day] = reservation.reservation_date.split("-").map(Number);
  const [startHour, startMin] = reservation.start_time.split(":").map(Number);
  const [endHour, endMin] = reservation.end_time.split(":").map(Number);

  const start = new Date(year, month - 1, day, startHour, startMin, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMin, 0, 0);

  const nowMs = currentTime.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();

  const isToday =
    currentTime.getFullYear() === year &&
    currentTime.getMonth() === month - 1 &&
    currentTime.getDate() === day;

  const isStarted = nowMs >= startMs && nowMs < endMs;
  const isEnded = nowMs >= endMs;
  const isCheckedIn = Boolean(metadata.checked_in);

  // Active means: confirmed, user checked in by staff, and within session window
  const isActive = reservation.status === "confirmed" && isCheckedIn && isStarted;

  // Awaiting check-in: confirmed, not yet checked in, and session hasn't ended
  const isAwaitingCheckIn = reservation.status === "confirmed" && !isCheckedIn && !isEnded;

  // Missed check-in / absent: start time reached or passed, but user never checked in at front desk
  const isMissedCheckIn = reservation.status === "confirmed" && !isCheckedIn && nowMs >= startMs;

  // Timing flags:
  // 5 minutes away from start (between start - 5min and start)
  const fiveMinBeforeStartMs = startMs - 5 * 60 * 1000;
  const is5MinBeforeStart =
    reservation.status === "confirmed" &&
    nowMs >= fiveMinBeforeStartMs &&
    nowMs < startMs;

  // 5 minutes away from end / return & fix equipment (between end - 5min and end)
  const fiveMinBeforeEndMs = endMs - 5 * 60 * 1000;
  const is5MinBeforeEnd =
    reservation.status === "confirmed" &&
    isCheckedIn &&
    nowMs >= fiveMinBeforeEndMs &&
    nowMs < endMs;

  const timeUntilStartMs = Math.max(0, startMs - nowMs);
  const timeRemainingMs = Math.max(0, endMs - nowMs);
  const totalDurationMs = Math.max(1000, endMs - startMs);
  const elapsedMs = Math.max(0, Math.min(totalDurationMs, nowMs - startMs));
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

  const formatRemaining = (diffMs: number) => {
    const totalSecs = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return {
    start,
    end,
    metadata,
    isToday,
    isStarted,
    isEnded,
    isCheckedIn,
    isActive,
    isAwaitingCheckIn,
    isMissedCheckIn,
    is5MinBeforeStart,
    is5MinBeforeEnd,
    timeUntilStartMs,
    timeRemainingMs,
    remainingText: formatRemaining(timeRemainingMs),
    untilStartText: formatRemaining(timeUntilStartMs),
    progressPercent,
  };
}

/**
 * Sends in-app notification to the client and triggers Realtime listener Toast
 */
export async function sendReservationNotification(
  clientId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      client_id: clientId,
      title,
      message,
      action_url: actionUrl ?? "/client/reservations",
      is_read: false,
    });
    if (error) {
      console.warn("Failed to insert notification:", error.message);
    }
  } catch (e) {
    console.warn("Error sending reservation notification:", e);
  }
}
