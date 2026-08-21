ALTER TABLE public.users
  DROP CONSTRAINT users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role = ANY (ARRAY[
      'admin', 'provider', 'medical_biller', 'coder', 'front_desk', 'staff', 'patient',
      'insurance', 'employer'
    ]::text[]));
