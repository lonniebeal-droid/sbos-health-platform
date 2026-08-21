-- SBOS HealthOS — secure profile provisioning
--
-- Metadata submitted at signup is user controlled. It must not select a role
-- or tenant because those values drive RLS decisions.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    'patient',
    NULL
  );
  RETURN NEW;
END;
$$;

-- Trigger functions do not need public execute privileges. Existing staff and
-- tenant assignments are intentionally not rewritten by this migration; they
-- must be reviewed and managed through a trusted administrative path.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- RLS can restrict rows but not individual columns. Restrict client profile
-- changes to non-authorization fields so a user cannot promote themselves or
-- join a different tenant.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.users TO authenticated;
