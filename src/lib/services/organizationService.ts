// Organization service: business-facing operations over the organizations
// repository, returning the org-context TenantOrg view.

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from '../supabaseClient';
import { createRepositories } from '../repositories';
import type { TenantOrg } from '../organizationContext';
import type { OrganizationInsert } from '../db/database.types';

export function createOrganizationService(client: SupabaseClient) {
  const repos = createRepositories(client);
  return {
    listOrganizations(): Promise<TenantOrg[]> {
      return repos.organizations.listAsTenantOrgs();
    },
    createOrganization(payload: OrganizationInsert) {
      return repos.organizations.create(payload);
    },
  };
}

export type OrganizationService = ReturnType<typeof createOrganizationService>;

export function getOrganizationService(): OrganizationService {
  return createOrganizationService(requireSupabase());
}
