-- Migration 00018: Add push_token to profiles and allow users to delete their own notifications

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Enable DELETE policy on notifications if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can delete own notifications'
    ) THEN
        CREATE POLICY "Users can delete own notifications"
            ON public.notifications FOR DELETE
            USING (auth.uid() = client_id);
    END IF;
END $$;
