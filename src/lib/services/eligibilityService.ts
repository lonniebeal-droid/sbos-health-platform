// Eligibility service: wraps the check_eligibility RPC (EDI 270/271 equivalent),
// a controlled cross-org coverage lookup. Factory-based for testability.

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from '../supabaseClient';

export interface EligibilityResult {
  status: string;
  memberId: string;
  subscriberName?: string;
  planName?: string;
  networkType?: string;
  effectiveDate?: string;
  deductibleTotal?: number;
  deductibleRemaining?: number;
  outOfPocketMax?: number;
  outOfPocketMet?: number;
  copays?: {
    primaryCare?: number;
    specialist?: number;
    urgentCare?: number;
    emergencyRoom?: number;
    genericRx?: number;
  };
}

export function createEligibilityService(client: SupabaseClient) {
  return {
    async check(memberId: string): Promise<EligibilityResult> {
      const { data, error } = await client.rpc('check_eligibility', { p_member_id: memberId });
      if (error) throw new Error(error.message);
      return data as EligibilityResult;
    },
  };
}

export type EligibilityService = ReturnType<typeof createEligibilityService>;

export function getEligibilityService(): EligibilityService {
  return createEligibilityService(requireSupabase());
}
