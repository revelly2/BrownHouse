-- ============================================================================
-- 00019: Store the gym equipment each workout plan exercise uses
-- ============================================================================

ALTER TABLE public.workout_details
    ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_details_equipment_id ON public.workout_details(equipment_id);

COMMENT ON COLUMN public.workout_details.equipment_id IS 'Gym equipment recommended for this exercise (null = bodyweight or none listed).';
