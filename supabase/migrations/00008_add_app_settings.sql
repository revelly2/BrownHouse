-- ============================================================================
-- App Settings Table (Global Configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id            TEXT PRIMARY KEY DEFAULT 'global',
    currency      TEXT NOT NULL DEFAULT 'PHP' CHECK (currency IN ('PHP', 'USD')),
    gym_capacity  INTEGER NOT NULL DEFAULT 50,
    ai_features   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_settings IS 'Global application settings (singleton pattern).';

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default row
INSERT INTO public.app_settings (id, currency, gym_capacity, ai_features)
VALUES ('global', 'PHP', 50, TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings viewable by everyone" ON public.app_settings;
CREATE POLICY "App settings viewable by everyone"
    ON public.app_settings FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings"
    ON public.app_settings FOR ALL
    USING (public.is_admin());
