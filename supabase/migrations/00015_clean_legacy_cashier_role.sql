-- ============================================================================
-- Clean up legacy 'cashier' and 'trainer' roles
-- Updates all existing profiles to valid system roles ('admin' or 'client')
-- ============================================================================

-- 1. Migrate any remaining non-admin roles to 'client'
UPDATE public.profiles
SET role = 'client'
WHERE role NOT IN ('admin', 'client');

-- 2. Drop legacy role check constraints if present
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || r.conname;
    END LOOP;
END;
$$;

-- 3. Enforce strict constraint: only 'admin' or 'client'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'client'));
