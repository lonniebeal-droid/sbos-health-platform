-- ====================================================================
-- SBOS — eligibility inquiry RPC (EDI 270/271 equivalent)
-- Migration: 20260725090000_eligibility_rpc.sql
--
-- Eligibility is inherently a cross-organization lookup: a payer/provider checks
-- coverage for a member whose patient/benefits rows live in the servicing org
-- (which RLS correctly blocks for direct SELECT). This SECURITY DEFINER function
-- performs that lookup under controlled, minimal-necessary disclosure: it returns
-- only a coverage summary (no full patient record), and only to authenticated
-- users whose role is insurance / admin / provider.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_eligibility(p_member_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.user_role;
  v_result JSONB;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('insurance', 'admin', 'provider') THEN
    RAISE EXCEPTION 'Not authorized for eligibility inquiry';
  END IF;

  SELECT jsonb_build_object(
    'status', 'ACTIVE_ELIGIBLE',
    'memberId', pt.insurance_member_id,
    'subscriberName', u.full_name,
    'planName', COALESCE(bp.plan_name, 'Unknown Plan'),
    'networkType', bp.network_type,
    'effectiveDate', to_char(COALESCE(bp.created_at, now()), 'YYYY-MM-DD'),
    'deductibleTotal', COALESCE(bp.individual_deductible, 0),
    'deductibleRemaining', GREATEST(0, COALESCE(bp.individual_deductible, 0) - COALESCE(bp.deductible_met, 0)),
    'outOfPocketMax', COALESCE(bp.out_of_pocket_max, 0),
    'outOfPocketMet', COALESCE(bp.out_of_pocket_met, 0),
    'copays', COALESCE(bp.copays, '{}'::jsonb)
  ) INTO v_result
  FROM public.patients pt
  LEFT JOIN public.users u ON u.id = pt.user_id
  LEFT JOIN public.benefits_plans bp ON bp.patient_id = pt.id
  WHERE pt.insurance_member_id = p_member_id
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('status', 'INACTIVE_NOT_FOUND', 'memberId', p_member_id);
  END IF;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_eligibility(TEXT) TO authenticated;
