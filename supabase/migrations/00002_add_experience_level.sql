-- ============================================================================
-- Migration: Add experience_level to profiles
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS experience_level TEXT;

COMMENT ON COLUMN public.profiles.experience_level IS 'User self-reported experience level (e.g., Beginner, Intermediate, Professional)';
