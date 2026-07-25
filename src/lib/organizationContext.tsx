import React, { createContext, useContext, useState } from 'react';

export interface TenantOrg {
  id: string;
  name: string;
  type: 'health_system' | 'payer' | 'employer_group';
  badge: string;
  npiOrTaxId: string;
}

export const sampleOrganizations: TenantOrg[] = [
  { id: 'org_001', name: 'Bay Area Health System', type: 'health_system', badge: 'Regional Hospital Network', npiOrTaxId: 'NPI: 1882901230' },
  { id: 'org_002', name: 'SBOS Gold Premier PPO', type: 'payer', badge: 'Commercial Payer', npiOrTaxId: 'Tax ID: 94-8829101' },
  { id: 'org_003', name: 'Acme Technology Corp', type: 'employer_group', badge: 'Enterprise Sponsor', npiOrTaxId: 'Group: ACME-88390' },
  { id: 'org_004', name: 'Pacific Care Telehealth Network', type: 'health_system', badge: 'Virtual Clinic Network', npiOrTaxId: 'NPI: 1992010291' }
];

interface OrgContextType {
  currentOrg: TenantOrg;
  setCurrentOrg: (org: TenantOrg) => void;
  allOrgs: TenantOrg[];
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState<TenantOrg>(sampleOrganizations[0]);

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrg, allOrgs: sampleOrganizations }}>
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
