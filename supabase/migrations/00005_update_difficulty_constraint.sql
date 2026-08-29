ALTER TABLE public.workout_plans DROP CONSTRAINT IF EXISTS workout_plans_difficulty_level_check;
ALTER TABLE public.workout_plans ADD CONSTRAINT workout_plans_difficulty_level_check CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
