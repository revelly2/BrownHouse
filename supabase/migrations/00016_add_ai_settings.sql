-- ============================================================================
-- 00016_add_ai_settings.sql
-- Add ai_config JSONB column to app_settings for multi-provider AI (Gemini & Claude)
-- ============================================================================

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{
  "provider": "gemini",
  "geminiModel": "gemini-3.5-flash",
  "claudeModel": "claude-3-5-haiku-20241022",
  "temperature": 0.7,
  "maxTokens": 2048,
  "geminiApiKey": "",
  "claudeApiKey": "",
  "enabled": true
}'::jsonb;

COMMENT ON COLUMN public.app_settings.ai_config IS 'AI Engine parameters: provider (gemini|claude), models, API keys, temperature, and token limits.';
