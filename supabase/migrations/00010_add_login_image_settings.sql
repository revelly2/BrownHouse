-- ============================================================================
-- Add login_image_url to app_settings and create public_assets bucket
-- ============================================================================

-- 1. Add login_image_url column
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS login_image_url TEXT;

-- 2. Create Storage Bucket for public assets (like the login image)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies

-- Anyone can read public_assets
DROP POLICY IF EXISTS "Public access for public_assets" ON storage.objects;
CREATE POLICY "Public access for public_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public_assets');

-- Admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can manage public_assets" ON storage.objects;
CREATE POLICY "Admins can manage public_assets"
ON storage.objects FOR ALL
USING (bucket_id = 'public_assets' AND public.is_admin())
WITH CHECK (bucket_id = 'public_assets' AND public.is_admin());
