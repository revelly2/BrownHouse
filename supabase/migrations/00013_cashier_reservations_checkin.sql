-- ============================================================================
-- 00013: Allow Cashier to View, Check-in, and Cancel Equipment Reservations
-- ============================================================================

-- Ensure helper function exists for admin or cashier check
CREATE OR REPLACE FUNCTION public.is_admin_or_cashier()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'cashier')
    );
$$;

-- 1. Update SELECT policy on reservations so Cashier and Admin can view all reservations
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;

CREATE POLICY "Users can view own reservations"
    ON public.reservations FOR SELECT
    USING (auth.uid() = client_id OR public.is_admin_or_cashier());

-- 2. Update UPDATE policy on reservations so Cashier and Admin can check-in or cancel reservations
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;

CREATE POLICY "Users can update own reservations"
    ON public.reservations FOR UPDATE
    USING (auth.uid() = client_id OR public.is_admin_or_cashier());
