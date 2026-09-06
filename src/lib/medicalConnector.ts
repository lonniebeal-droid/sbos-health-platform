export type MedicalVendor = 'Epic' | 'athenahealth' | 'Oracle Health / Cerner' | 'eClinicalWorks' | 'Generic FHIR R4';
export type ConnectorStatus = 'not_connected' | 'testing' | 'connected' | 'error';
export type X12Transaction = '270' | '271' | '837' | '276' | '277' | '835';

export interface MedicalConnectorConfig {
  vendor: MedicalVendor;
  baseUrl: string;
  clientId?: string;
  scopes: string[];
}

export const MEDICAL_VENDORS: MedicalVendor[] = ['Epic','athenahealth','Oracle Health / Cerner','eClinicalWorks','Generic FHIR R4'];
export const DEFAULT_SMART_SCOPES = ['openid','fhirUser','patient/Patient.read','patient/Appointment.read','patient/Encounter.read','patient/Coverage.read'];

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

export function capabilityUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/metadata`;
}

export function sanitizeScopes(scopes: string[]) {
  return [...new Set(scopes.map((s) => s.trim()).filter(Boolean))].sort();
}

export function syntheticX12(transaction: X12Transaction, traceId: string) {
  if (!/^SYN-[A-Za-z0-9-]{3,60}$/.test(traceId)) throw new Error('Synthetic trace ID must begin with SYN-');
  return { standard: 'X12' as const, mode: 'synthetic_only' as const, transaction, traceId, transmissionAuthorized: false as const };
}
