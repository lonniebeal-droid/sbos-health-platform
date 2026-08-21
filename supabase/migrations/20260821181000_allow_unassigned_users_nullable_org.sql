-- Bug fix: users.organization_id was NOT NULL, but handle_new_user() (added in
-- secure_profile_provisioning_and_rls) inserts organization_id = NULL for every
-- new signup by design — a brand-new signup has no trusted org assignment yet.
-- As applied, that trigger would fail every real signup with a NOT NULL
-- violation. This was never exercised because the app has no signUp() call
-- yet (sign-in only), so it never surfaced in testing. Making organization_id
-- nullable is required for the "no self-assigned tenant" security model to
-- actually work, and matches how an "unassigned" account must be
-- representable until an admin assigns a real org.
ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
