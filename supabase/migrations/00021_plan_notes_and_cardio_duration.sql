-- ============================================================================
-- 00021: Keep the AI's personalized notes and give cardio exercises a duration
-- ============================================================================

-- Why the plan fits the member (age, BMI, health) plus precautions, written by the AI
ALTER TABLE public.workout_plans
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Minutes for cardio or timed exercises; null for sets x reps strength work
ALTER TABLE public.workout_details
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER CHECK (duration_minutes BETWEEN 1 AND 180);
