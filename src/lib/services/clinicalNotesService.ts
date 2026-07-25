// Clinical notes service: persists signed BIRP notes and lists them. Resolves
// patient/provider/org ids from the signed-in provider's context (RLS-scoped).

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from '../supabaseClient';
import { createRepositories } from '../repositories';
import { createAuthService } from './authService';
import type { BIRPNote } from '../../types';
import type { ClinicalNoteRow } from '../db/database.types';

export function createClinicalNotesService(client: SupabaseClient) {
  const repos = createRepositories(client);
  const auth = createAuthService(client);
  return {
    list(): Promise<ClinicalNoteRow[]> {
      return repos.clinicalNotes.list();
    },
    /** Persist a signed BIRP note. Resolves ids from the provider's org context. */
    async saveBirp(
      birp: BIRPNote,
      opts?: { patientId?: string; providerId?: string },
    ): Promise<ClinicalNoteRow> {
      const profile = await auth.getCurrentProfile();
      let patientId = opts?.patientId ?? null;
      let providerId = opts?.providerId ?? null;
      if (!patientId) patientId = (await repos.patients.list())[0]?.id ?? null;
      if (!providerId) providerId = (await repos.providers.list())[0]?.id ?? null;
      return repos.clinicalNotes.create({
        patient_id: patientId,
        provider_id: providerId,
        organization_id: profile?.organization_id ?? null,
        note_type: 'BIRP',
        content: {
          behavior: birp.behavior,
          intervention: birp.intervention,
          response: birp.response,
          plan: birp.plan,
        },
        suggested_icd: birp.suggestedICD,
        suggested_cpt: birp.suggestedCPT,
        status: 'signed',
        signed_at: new Date().toISOString(),
      });
    },
  };
}

export type ClinicalNotesService = ReturnType<typeof createClinicalNotesService>;

export function getClinicalNotesService(): ClinicalNotesService {
  return createClinicalNotesService(requireSupabase());
}
