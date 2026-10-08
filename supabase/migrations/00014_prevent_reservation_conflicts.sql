-- ============================================================================
-- 00014: Prevent Equipment Double-Booking & Allow Schedule Visibility
-- ============================================================================

-- 1. Allow all authenticated users to view reservations so clients can see
-- which equipment slots are occupied/booked and prevent double-booking.
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view reservations" ON public.reservations;

CREATE POLICY "Users can view reservations"
    ON public.reservations FOR SELECT
    USING (true);

-- 2. Trigger function to prevent overlapping confirmed reservations
-- If an equipment already has a confirmed reservation on the same date whose
-- time range intersects with the new/updated reservation, raise an exception.
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Only enforce conflict checks for confirmed reservations
    IF NEW.status = 'confirmed' THEN
        IF EXISTS (
            SELECT 1 FROM public.reservations
            WHERE equipment_id = NEW.equipment_id
              AND reservation_date = NEW.reservation_date
              AND status = 'confirmed'
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND (NEW.start_time < end_time AND NEW.end_time > start_time)
        ) THEN
            RAISE EXCEPTION 'Equipment is already reserved or in use for this time slot (time overlap detected).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_reservation_overlap ON public.reservations;
CREATE TRIGGER trg_prevent_reservation_overlap
    BEFORE INSERT OR UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_reservation_overlap();

-- 3. Ensure reservations table is in supabase_realtime and has REPLICA IDENTITY FULL
-- for instant, reliable real-time event delivery across clients
ALTER TABLE public.reservations REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'reservations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
    END IF;
END $$;

