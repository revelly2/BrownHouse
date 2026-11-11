// ============================================================================
// Health screening — shared options and the text the AI reads
// ============================================================================

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const HEALTH_CONDITION_OPTIONS = [
  "Heart disease or heart surgery",
  "High blood pressure",
  "Diabetes",
  "Asthma or breathing problems",
  "Joint, back or neck problem",
  "Recent injury or surgery",
  "Other",
];

// Members who have not answered the screening yet have no screened_at timestamp
export const hasCompletedHealthScreening = (profile: { health_screened_at?: string | null } | null) =>
  !!profile?.health_screened_at;

const genderLabel = (value: string | null | undefined) =>
  GENDER_OPTIONS.find((g) => g.value === value)?.label ?? null;

/** Human-readable health summary for the AI prompt; empty when the member has not been screened. */
export function healthPromptLines(profile: any): string {
  if (!hasCompletedHealthScreening(profile)) return "";

  const conditions: string[] = profile.health_conditions ?? [];
  const lines = [
    profile.age ? `- Age: ${profile.age} years` : null,
    genderLabel(profile.gender) ? `- Gender: ${genderLabel(profile.gender)}` : null,
    `- Health conditions (current or past): ${conditions.length ? conditions.join("; ") : "none reported"}`,
    profile.health_notes ? `- Health details from the member: ${profile.health_notes}` : null,
  ].filter(Boolean);

  return `\nHEALTH AND SAFETY (must be respected):\n${lines.join("\n")}\n- If any condition or age-related risk is listed, choose a lower intensity, avoid max-effort lifts and movements that stress the listed condition, add a rest day, and state the precautions and when to stop or see a doctor in "notes". Do not diagnose.`;
}

/** Whether the rule-based fallback should plan lower intensity and add precautions */
export const needsCautiousPlan = (profile: any) =>
  (profile?.health_conditions?.length ?? 0) > 0 || (profile?.age ?? 0) >= 60;
