export type MedicalVendor = 'Epic' | 'athenahealth' | 'Oracle Health / Cerner' | 'eClinicalWorks' | 'Generic FHIR R4';
export type ConnectorStatus = 'not_connected' | 'testing' | 'connected' | 'error';
export type X12Transaction = '270' | '271' | '837' | '276' | '277' | '835';

export interface MedicalConnectorConfig {
  vendor: MedicalVendor;
  baseUrl: string;
  clientId?: string;
  scopes: string[];
}

export interface MedicalVendorProfile {
  vendor: MedicalVendor;
  requiresClientId: boolean;
}

export interface ConnectorValidationResult {
  ok: boolean;
  errors: string[];
  normalized?: MedicalConnectorConfig;
}

export const MEDICAL_VENDORS: MedicalVendor[] = ['Epic','athenahealth','Oracle Health / Cerner','eClinicalWorks','Generic FHIR R4'];
export const DEFAULT_SMART_SCOPES = ['openid','fhirUser','patient/Patient.read','patient/Appointment.read','patient/Encounter.read','patient/Coverage.read'];export const MEDICAL_VENDOR_PROFILES: Record<MedicalVendor, MedicalVendorProfile> = {
  Epic: { vendor: 'Epic', requiresClientId: true },
  athenahealth: { vendor: 'athenahealth', requiresClientId: true },
  'Oracle Health / Cerner': { vendor: 'Oracle Health / Cerner', requiresClientId: true },
  eClinicalWorks: { vendor: 'eClinicalWorks', requiresClientId: true },
  'Generic FHIR R4': { vendor: 'Generic FHIR R4', requiresClientId: false },
};

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function isValidHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function capabilityUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/metadata`;
}

export function smartConfigurationUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/.well-known/smart-configuration`;
}export function sanitizeScopes(scopes: string[]) {
  return [...new Set(scopes.map((s) => s.trim()).filter(Boolean))].sort();
}

export function validateConnectorConfig(config: MedicalConnectorConfig): ConnectorValidationResult {
  const errors: string[] = [];
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const clientId = config.clientId?.trim();
  const scopes = sanitizeScopes(config.scopes);

  if (!baseUrl) errors.push('FHIR base URL is required.');
  else if (!isValidHttpsUrl(baseUrl)) errors.push('FHIR base URL must be a valid HTTPS URL.');

  if (MEDICAL_VENDOR_PROFILES[config.vendor].requiresClientId && !clientId) {
    errors.push(`${config.vendor} requires a SMART client ID.`);
  }
  if (scopes.length === 0) errors.push('At least one SMART/FHIR scope is required.');
  if (errors.length) return { ok: false, errors };

  return { ok: true, errors: [], normalized: {
    vendor: config.vendor, baseUrl, clientId: clientId || undefined, scopes,
  }};
}

export function connectorDiscovery(config: MedicalConnectorConfig) {
  const validation = validateConnectorConfig(config);
  if (!validation.ok || !validation.normalized) return { ok: false as const, errors: validation.errors };
  return { ok: true as const, config: validation.normalized,
    capabilityUrl: capabilityUrl(validation.normalized.baseUrl),
    smartConfigurationUrl: smartConfigurationUrl(validation.normalized.baseUrl) };
}
export function syntheticX12(transaction: X12Transaction, traceId: string) {
  if (!/^SYN-[A-Za-z0-9-]{3,60}$/.test(traceId)) throw new Error('Synthetic trace ID must begin with SYN-');
  return { standard: 'X12' as const, mode: 'synthetic_only' as const, transaction, traceId, transmissionAuthorized: false as const };
}
