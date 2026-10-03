-- ============================================================================
-- Add apk_download_url to app_settings
-- ============================================================================

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS apk_download_url TEXT;
