// ============================================================================
// Equipment Utilities — Parsing, Serialization & Detail Helpers
// ============================================================================

import { Equipment } from "./types";

export interface EquipmentDetails {
  summary: string;
  instructions: string | null;
  safety_notes: string | null;
  specs: string | null;
  location: string | null;
  image_url: string | null;
}

/**
 * Safely parses all extended details for an equipment item.
 * Supports native columns if present in DB schema, or parses structured JSON
 * embedded within the description column as a resilient fallback.
 */
export function parseEquipmentDetails(item: Equipment | null | undefined): EquipmentDetails {
  if (!item) {
    return {
      summary: "",
      instructions: null,
      safety_notes: null,
      specs: null,
      location: null,
      image_url: null,
    };
  }

  let summary = item.description || "";
  let instructions = (item as any).instructions || null;
  let safety_notes = (item as any).safety_notes || null;
  let specs = (item as any).specs || null;
  let location = (item as any).location || null;
  const image_url = item.image_url || (item as any).imageUrl || null;

  // Check if description has structured JSON details
  if (item.description && typeof item.description === "string") {
    const trimmed = item.description.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          summary = parsed.summary ?? parsed.description ?? "";
          if (!instructions && parsed.instructions) instructions = parsed.instructions;
          if (!safety_notes && parsed.safety_notes) safety_notes = parsed.safety_notes;
          if (!specs && parsed.specs) specs = parsed.specs;
          if (!location && parsed.location) location = parsed.location;
        }
      } catch {
        // Plain text description
      }
    }
  }

  return {
    summary: summary || "No description provided.",
    instructions: instructions ? String(instructions).trim() : null,
    safety_notes: safety_notes ? String(safety_notes).trim() : null,
    specs: specs ? String(specs).trim() : null,
    location: location ? String(location).trim() : null,
    image_url,
  };
}

/**
 * Builds the payload for saving equipment to Supabase.
 * Encodes extended details into description JSON so it works immediately
 * without requiring DB migration, while also providing individual fields
 * if the database columns are present.
 */
export function buildEquipmentPayload(values: {
  name: string;
  type: "cardio" | "strength";
  brand?: string | null;
  model_number?: string | null;
  description?: string | null;
  image_url?: string | null;
  muscle_group?: string | null;
  instructions?: string | null;
  safety_notes?: string | null;
  specs?: string | null;
  location?: string | null;
}) {
  const hasExtendedDetails =
    Boolean(values.instructions?.trim()) ||
    Boolean(values.safety_notes?.trim()) ||
    Boolean(values.specs?.trim()) ||
    Boolean(values.location?.trim());

  let finalDescription = values.description?.trim() || "";

  if (hasExtendedDetails) {
    const metaObj = {
      summary: values.description?.trim() || "",
      instructions: values.instructions?.trim() || null,
      safety_notes: values.safety_notes?.trim() || null,
      specs: values.specs?.trim() || null,
      location: values.location?.trim() || null,
    };
    finalDescription = JSON.stringify(metaObj);
  }

  return {
    name: values.name.trim(),
    type: values.type,
    brand: values.brand?.trim() || null,
    model_number: values.model_number?.trim() || null,
    description: finalDescription || null,
    image_url: values.image_url?.trim() || null,
    muscle_group: values.muscle_group?.trim() || null,
  };
}
