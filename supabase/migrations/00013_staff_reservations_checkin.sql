-- ============================================================================
-- 00013: Allow Admin / Staff to View, Check-in, and Cancel Equipment Reservations
-- ============================================================================

-- Ensure helper function exists for admin check
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

-- 1. Update SELECT policy on reservations so Admins can view all reservations
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;

CREATE POLICY "Users can view own reservations"
    ON public.reservations FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin());

-- 2. Update UPDATE policy on reservations so Admins can check-in or cancel reservations
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;

CREATE POLICY "Users can update own reservations"
    ON public.reservations FOR UPDATE
    USING (auth.uid() = client_id OR public.is_admin());
