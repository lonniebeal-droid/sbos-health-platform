import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured } from './supabaseClient';
import { getOrganizationService } from './services/organizationService';

export interface TenantOrg {
  id: string;
  name: string;
  type: 'health_system' | 'payer' | 'employer_group';
  badge: string;
  npiOrTaxId: string;
}

// Fallback data used when Supabase is not configured or a load fails, so the UI
// always has something to render. When Supabase IS configured, real rows from
// the `organizations` table replace these at runtime.
export const sampleOrganizations: TenantOrg[] = [
  { id: 'org_001', name: 'Bay Area Health System', type: 'health_system', badge: 'Regional Hospital Network', npiOrTaxId: 'NPI: 1882901230' },
  { id: 'org_002', name: 'SBOS Gold Premier PPO', type: 'payer', badge: 'Commercial Payer', npiOrTaxId: 'Tax ID: 94-8829101' },
  { id: 'org_003', name: 'Acme Technology Corp', type: 'employer_group', badge: 'Enterprise Sponsor', npiOrTaxId: 'Group: ACME-88390' },
  { id: 'org_004', name: 'Pacific Care Telehealth Network', type: 'health_system', badge: 'Virtual Clinic Network', npiOrTaxId: 'NPI: 1992010291' },
];

export type OrgDataSource = 'supabase' | 'fallback';

interface OrgContextType {
  currentOrg: TenantOrg;
  setCurrentOrg: (org: TenantOrg) => void;
  allOrgs: TenantOrg[];
  loading: boolean;
  error: string | null;
  /** Where allOrgs came from — useful for surfacing "demo data" states. */
  source: OrgDataSource;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allOrgs, setAllOrgs] = useState<TenantOrg[]>(sampleOrganizations);
  const [currentOrg, setCurrentOrg] = useState<TenantOrg>(sampleOrganizations[0]);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<OrgDataSource>('fallback');

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      try {
        const orgs = await getOrganizationService().listOrganizations();
        if (cancelled) return;
        if (orgs.length > 0) {
          setAllOrgs(orgs);
          setCurrentOrg(orgs[0]);
          setSource('supabase');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load organizations');
        // Keep the fallback list already in state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrg, allOrgs, loading, error, source }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};
