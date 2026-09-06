export type MedicalVendor = 'Epic' | 'athenahealth' | 'Oracle Health / Cerner' | 'eClinicalWorks' | 'Generic FHIR R4';
export type ConnectorStatus = 'not_connected' | 'testing' | 'connected' | 'error';

export interface MedicalConnectorConfig {
  vendor: MedicalVendor;
  baseUrl: string;
  clientId?: string;
  scopes: string[];
}

export const DEFAULT_SMART_SCOPES = ['openid','fhirUser','launch/patient','patient/*.read','encounter/*.read'];

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

export function capabilityUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/metadata`;
}

export function sanitizeScopes(scopes: string[]) {
  return [...new Set(scopes.map((s) => s.trim()).filter(Boolean))];
}
