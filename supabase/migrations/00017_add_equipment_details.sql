-- ============================================================================
-- Migration: Add extended equipment details columns
-- Allows storing instructions, safety notes, specifications, and gym location
-- ============================================================================

ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS safety_notes TEXT,
ADD COLUMN IF NOT EXISTS specs TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.equipment.instructions IS 'Step-by-step user instructions for operating the equipment.';
COMMENT ON COLUMN public.equipment.safety_notes IS 'Important safety guidelines, weight limits, and gym etiquette.';
COMMENT ON COLUMN public.equipment.specs IS 'Technical specifications (e.g., weight range, resistance levels, dimensions).';
COMMENT ON COLUMN public.equipment.location IS 'Gym zone or floor area where this equipment is positioned.';
