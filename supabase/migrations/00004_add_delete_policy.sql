-- Add missing DELETE policy for workout_plans
CREATE POLICY "Users can delete own plans"
    ON public.workout_plans FOR DELETE
    USING (auth.uid() = client_id);
