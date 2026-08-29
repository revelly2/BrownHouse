-- ============================================================================
-- 6. MEASUREMENT HISTORY
-- ============================================================================
CREATE TABLE public.measurement_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    weight_kg     NUMERIC(5, 2) NOT NULL,
    height_cm     NUMERIC(5, 2),
    measured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.measurement_history IS 'Daily tracking of user measurements for progress graphing.';

CREATE INDEX idx_measurement_history_client_id ON public.measurement_history(client_id);
CREATE INDEX idx_measurement_history_measured_at ON public.measurement_history(measured_at);

-- Add target weight to profiles
ALTER TABLE public.profiles ADD COLUMN target_weight_kg NUMERIC(5, 2);
