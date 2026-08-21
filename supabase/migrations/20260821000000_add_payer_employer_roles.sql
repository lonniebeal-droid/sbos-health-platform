-- SBOS HealthOS — proposed: widen users.role to allow payer/employer staff
-- Migration: 20260821000000_add_payer_employer_roles.sql
--
-- PROPOSED — NOT APPLIED to the live "SBOS HealthOS" project (ref
-- yqlvcmydledbkudstqfo) as of this commit. Written for review; apply only
-- after explicit confirmation.
--
-- Why: the live public.users.role CHECK constraint (users_role_check) only
-- allows admin | provider | medical_biller | coder | front_desk | staff |
-- patient (confirmed via introspection). It predates this app's payer- and
-- employer-facing UI (src/App.tsx renders the whole InsuranceHub claims
-- workspace when role = 'insurance', and a separate employer view when
-- role = 'employer') — today there is no way for a real live-authenticated
-- user to ever hold either value, so HealthOS's payer-facing product has no
-- real live login path yet. This migration is purely additive: it widens the
-- existing allow-list, it does not remove or reinterpret any value already
-- in use, so no existing row or code path is affected.

-- The repository schema stores role as public.user_role, which already has
-- insurance/employer. The previously inspected live schema used a text CHECK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      DROP CONSTRAINT users_role_check,
      ADD CONSTRAINT users_role_check
        CHECK (role = ANY (ARRAY[
          'admin', 'provider', 'medical_biller', 'coder', 'front_desk', 'staff', 'patient',
          'insurance', 'employer'
        ]::text[]));
  END IF;
END
$$;
