-- ============================================================================
-- AI Gym Equipment Reservation & Personalized Workout System
-- Supabase PostgreSQL DDL Migration Script
-- Version: 1.0.0
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name    TEXT,
    last_name     TEXT,
    phone_number  TEXT,
    joined_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_picture_url TEXT,
    height_cm     NUMERIC(5, 2),
    weight_kg     NUMERIC(5, 2),
    fitness_goal  TEXT,
    role          TEXT NOT NULL DEFAULT 'client'
                  CHECK (role IN ('admin', 'trainer', 'client')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users with fitness-specific fields.';

-- ============================================================================
-- 2. EQUIPMENT
-- ============================================================================
CREATE TABLE public.equipment (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('cardio', 'strength')),
    brand         TEXT,
    model_number  TEXT,
    description   TEXT,
    image_url     TEXT,
    muscle_group  TEXT,
    status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'maintenance', 'occupied')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.equipment IS 'Catalog of gym machines and equipment with real-time status tracking.';

CREATE INDEX idx_equipment_status ON public.equipment(status);
CREATE INDEX idx_equipment_type ON public.equipment(type);
CREATE INDEX idx_equipment_muscle_group ON public.equipment(muscle_group);

-- ============================================================================
-- 3. EXERCISES
-- ============================================================================
CREATE TABLE public.exercises (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    muscle_group  TEXT NOT NULL,
    description   TEXT,
    tutorial_url  TEXT,
    equipment_id  UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.exercises IS 'Exercise library with muscle group classification and optional equipment mapping.';

CREATE INDEX idx_exercises_muscle_group ON public.exercises(muscle_group);
CREATE INDEX idx_exercises_equipment_id ON public.exercises(equipment_id);

-- ============================================================================
-- 4. RESERVATIONS
-- ============================================================================
CREATE TABLE public.reservations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    equipment_id      UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    reservation_date  DATE NOT NULL,
    start_time        TIME NOT NULL,
    end_time          TIME NOT NULL,
    status            TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reservation_time CHECK (start_time < end_time)
);

COMMENT ON TABLE public.reservations IS 'Equipment reservation records with time slot validation.';

CREATE INDEX idx_reservations_client_id ON public.reservations(client_id);
CREATE INDEX idx_reservations_equipment_id ON public.reservations(equipment_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);

-- ============================================================================
-- 5. MAINTENANCE LOG
-- ============================================================================
CREATE TABLE public.maintenance_log (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    equipment_id  UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    log_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'fixed')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.maintenance_log IS 'Equipment maintenance records created by staff.';

CREATE INDEX idx_maintenance_log_equipment_id ON public.maintenance_log(equipment_id);
CREATE INDEX idx_maintenance_log_status ON public.maintenance_log(status);

-- ============================================================================
-- 6. WORKOUT PLANS
-- ============================================================================
CREATE TABLE public.workout_plans (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creation_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    goal             TEXT NOT NULL,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'advanced')),
    description      TEXT,
    fitt_frequency   TEXT,
    fitt_intensity   TEXT,
    fitt_time        TEXT,
    fitt_type        TEXT,
    is_ai_generated  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workout_plans IS 'Personalized workout plans with FITT principle parameters.';

CREATE INDEX idx_workout_plans_client_id ON public.workout_plans(client_id);

-- ============================================================================
-- 7. WORKOUT DETAILS
-- ============================================================================
CREATE TABLE public.workout_details (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id      UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    exercise_id  UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    sets         INTEGER NOT NULL DEFAULT 3,
    reps         INTEGER NOT NULL DEFAULT 10,
    rest_seconds INTEGER DEFAULT 60,
    ordering     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workout_details IS 'Individual exercises within a workout plan, ordered sequentially.';

CREATE INDEX idx_workout_details_plan_id ON public.workout_details(plan_id);
CREATE INDEX idx_workout_details_exercise_id ON public.workout_details(exercise_id);

-- ============================================================================
-- 8. COMPLETED SESSIONS
-- ============================================================================
CREATE TABLE public.completed_sessions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id              UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
    date                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes     INTEGER,
    performance_metrics  JSONB DEFAULT '{}'::jsonb,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.completed_sessions IS 'Logged workout sessions with flexible JSONB performance vectors.';
COMMENT ON COLUMN public.completed_sessions.performance_metrics IS 'Flexible JSON: { "calories_burned": 350, "avg_heart_rate": 142, "exercises_completed": 8, "satisfaction_rating": 4 }';

CREATE INDEX idx_completed_sessions_client_id ON public.completed_sessions(client_id);
CREATE INDEX idx_completed_sessions_date ON public.completed_sessions(date);

-- ============================================================================
-- 9. AI RECOMMENDATIONS
-- ============================================================================
CREATE TABLE public.ai_recommendations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recommended_text  TEXT NOT NULL,
    recommended_type  TEXT NOT NULL CHECK (recommended_type IN ('plan', 'exercise')),
    payload           JSONB DEFAULT '{}'::jsonb,
    date_generated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_recommendations IS 'AI-generated workout recommendations stored for audit and reuse.';

CREATE INDEX idx_ai_recommendations_client_id ON public.ai_recommendations(client_id);
CREATE INDEX idx_ai_recommendations_type ON public.ai_recommendations(recommended_type);

-- ============================================================================
-- 10. NOTIFICATIONS
-- ============================================================================
CREATE TABLE public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    date_sent   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    action_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'In-app notification inbox for users.';

CREATE INDEX idx_notifications_client_id ON public.notifications(client_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATED_AT AUTO-REFRESH TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_workout_plans_updated_at
    BEFORE UPDATE ON public.workout_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- PROFILES: Users can read/update their own profile; admins can read all
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (TRUE);

-- EQUIPMENT: Everyone can read; only admins can modify
CREATE POLICY "Equipment is publicly readable"
    ON public.equipment FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage equipment"
    ON public.equipment FOR ALL
    USING (public.is_admin());

-- EXERCISES: Everyone can read; only admins can modify
CREATE POLICY "Exercises are publicly readable"
    ON public.exercises FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage exercises"
    ON public.exercises FOR ALL
    USING (public.is_admin());

-- RESERVATIONS: Users see their own; admins see all
CREATE POLICY "Users can view own reservations"
    ON public.reservations FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Users can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own reservations"
    ON public.reservations FOR UPDATE
    USING (auth.uid() = client_id OR public.is_admin());

-- MAINTENANCE LOG: Admins only
CREATE POLICY "Admins can manage maintenance logs"
    ON public.maintenance_log FOR ALL
    USING (public.is_admin());

-- WORKOUT PLANS: Users see their own; admins see all
CREATE POLICY "Users can view own plans"
    ON public.workout_plans FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Users can create plans"
    ON public.workout_plans FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own plans"
    ON public.workout_plans FOR UPDATE
    USING (auth.uid() = client_id);

-- WORKOUT DETAILS: Visible if parent plan is visible
CREATE POLICY "Users can view own workout details"
    ON public.workout_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans
            WHERE id = plan_id AND (client_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Users can manage own workout details"
    ON public.workout_details FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans
            WHERE id = plan_id AND client_id = auth.uid()
        )
    );

-- COMPLETED SESSIONS: Users see their own; admins see all
CREATE POLICY "Users can view own sessions"
    ON public.completed_sessions FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "Users can log sessions"
    ON public.completed_sessions FOR INSERT
    WITH CHECK (auth.uid() = client_id);

-- AI RECOMMENDATIONS: Users see their own; admins see all
CREATE POLICY "Users can view own AI recommendations"
    ON public.ai_recommendations FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin());

CREATE POLICY "System can insert AI recommendations"
    ON public.ai_recommendations FOR INSERT
    WITH CHECK (TRUE);

-- NOTIFICATIONS: Users see their own
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = client_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================================
-- ENABLE REALTIME ON KEY TABLES
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- SEED DATA: Sample exercises
-- ============================================================================
INSERT INTO public.exercises (name, muscle_group, description, tutorial_url) VALUES
    ('Barbell Bench Press', 'chest', 'Compound pushing movement targeting the pectorals, anterior deltoids, and triceps.', 'https://example.com/bench-press'),
    ('Dumbbell Flyes', 'chest', 'Isolation movement for chest with a wide arc motion.', 'https://example.com/dumbbell-flyes'),
    ('Push-Ups', 'chest', 'Bodyweight push exercise for chest and triceps.', 'https://example.com/push-ups'),
    ('Lat Pulldown', 'back', 'Cable-based pulling movement targeting the latissimus dorsi.', 'https://example.com/lat-pulldown'),
    ('Seated Cable Row', 'back', 'Horizontal pulling exercise for mid-back thickness.', 'https://example.com/cable-row'),
    ('Deadlift', 'back', 'Compound lift engaging the entire posterior chain.', 'https://example.com/deadlift'),
    ('Overhead Press', 'shoulders', 'Vertical pressing movement for deltoid development.', 'https://example.com/overhead-press'),
    ('Lateral Raises', 'shoulders', 'Isolation exercise for the lateral deltoid head.', 'https://example.com/lateral-raises'),
    ('Barbell Curl', 'biceps', 'Bilateral curling movement for biceps brachii.', 'https://example.com/barbell-curl'),
    ('Tricep Pushdown', 'triceps', 'Cable isolation for the triceps brachii.', 'https://example.com/tricep-pushdown'),
    ('Barbell Squat', 'legs', 'Compound lower body movement targeting quads, glutes, and hamstrings.', 'https://example.com/squat'),
    ('Leg Press', 'legs', 'Machine-based compound exercise for the quadriceps.', 'https://example.com/leg-press'),
    ('Leg Curl', 'legs', 'Isolation movement for the hamstrings.', 'https://example.com/leg-curl'),
    ('Calf Raises', 'legs', 'Isolation exercise for the gastrocnemius and soleus.', 'https://example.com/calf-raises'),
    ('Treadmill Running', 'cardio', 'Cardiovascular endurance training on a treadmill.', 'https://example.com/treadmill'),
    ('Stationary Bike', 'cardio', 'Low-impact cardio exercise on a cycle ergometer.', 'https://example.com/stationary-bike'),
    ('Rowing Machine', 'cardio', 'Full-body cardiovascular exercise using a rowing ergometer.', 'https://example.com/rowing'),
    ('Plank', 'core', 'Isometric core strengthening exercise.', 'https://example.com/plank'),
    ('Cable Crunch', 'core', 'Weighted abdominal exercise using a cable machine.', 'https://example.com/cable-crunch'),
    ('Russian Twist', 'core', 'Rotational core exercise targeting the obliques.', 'https://example.com/russian-twist');

-- Seed equipment
INSERT INTO public.equipment (name, type, brand, model_number, description, muscle_group, status) VALUES
    ('Flat Bench Press Station', 'strength', 'Hammer Strength', 'HS-BP100', 'Olympic flat bench press with safety catches.', 'chest', 'available'),
    ('Adjustable Dumbbell Rack', 'strength', 'Rogue Fitness', 'RF-DR200', 'Full dumbbell set from 5-100 lbs.', 'chest', 'available'),
    ('Lat Pulldown Machine', 'strength', 'Life Fitness', 'LF-LP300', 'Plate-loaded lat pulldown with multiple grip options.', 'back', 'available'),
    ('Cable Row Station', 'strength', 'Cybex', 'CX-CR400', 'Seated cable row with adjustable height.', 'back', 'available'),
    ('Smith Machine', 'strength', 'Hammer Strength', 'HS-SM500', 'Guided barbell system for various compound lifts.', 'legs', 'available'),
    ('Leg Press Machine', 'strength', 'Cybex', 'CX-LP600', '45-degree plate-loaded leg press.', 'legs', 'available'),
    ('Leg Curl Machine', 'strength', 'Life Fitness', 'LF-LC700', 'Prone leg curl for hamstring isolation.', 'legs', 'available'),
    ('Treadmill', 'cardio', 'Precor', 'PC-TR800', 'Commercial-grade treadmill with incline and speed control.', 'cardio', 'available'),
    ('Stationary Bike', 'cardio', 'Peloton', 'PL-SB900', 'Indoor cycling bike with digital resistance.', 'cardio', 'available'),
    ('Rowing Machine', 'cardio', 'Concept2', 'C2-RM1000', 'Air resistance rower with performance monitor.', 'cardio', 'available'),
    ('Cable Crossover Station', 'strength', 'Life Fitness', 'LF-CC1100', 'Dual adjustable cable columns for versatile exercises.', 'chest', 'available'),
    ('Shoulder Press Machine', 'strength', 'Hammer Strength', 'HS-SP1200', 'Plate-loaded overhead press machine.', 'shoulders', 'available');
