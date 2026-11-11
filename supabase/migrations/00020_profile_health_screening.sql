-- ============================================================================
-- 00020: Member age, gender and health screening for safer AI workout plans
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age BETWEEN 10 AND 100),
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    ADD COLUMN IF NOT EXISTS health_conditions TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS health_notes TEXT,
    -- Set when the member answers the health screening, even with "no conditions"; null = not filled in yet
    ADD COLUMN IF NOT EXISTS health_screened_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.health_conditions IS 'Current or past health conditions the member selected (e.g. heart disease).';
COMMENT ON COLUMN public.profiles.health_screened_at IS 'When the member completed the health screening; null means not filled in.';
