-- ============================================================================
-- Allow Admins to Create and Manage Reservations on Behalf of Clients
-- Fixes: "new row violates row-level security policy for table 'reservations'"
-- ============================================================================

-- 1. Update INSERT policy to allow Admins and Staff to insert reservations for any client
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;

CREATE POLICY "Users can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (
        auth.uid() = client_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'cashier', 'trainer')
        )
    );

-- 2. Ensure Admins can delete or manage any reservations
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;

CREATE POLICY "Admins can delete reservations"
    ON public.reservations FOR DELETE
    USING (
        auth.uid() = client_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'cashier')
        )
    );
