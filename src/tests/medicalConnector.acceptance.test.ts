import { describe, expect, it } from 'vitest';
import {
  capabilityUrl,
  DEFAULT_SMART_SCOPES,
  MEDICAL_VENDORS,
  sanitizeScopes,
  syntheticX12,
} from '../lib/medicalConnector';

describe('HealthOS medical connector acceptance', () => {
  it('supports the approved doctor-office connector profiles', () => {
    expect(MEDICAL_VENDORS).toEqual(['Epic','athenahealth','Oracle Health / Cerner','eClinicalWorks','Generic FHIR R4']);
  });

  it('uses a FHIR CapabilityStatement preflight without patient data', () => {
    expect(capabilityUrl('https://sandbox.example/fhir/')).toBe('https://sandbox.example/fhir/metadata');
    expect(DEFAULT_SMART_SCOPES).toContain('patient/Encounter.read');
  });

  it('deduplicates least-privilege SMART scopes', () => {
    expect(sanitizeScopes(['openid','openid',' patient/Patient.read '])).toEqual(['openid','patient/Patient.read']);
  });

  it('never authorizes synthetic X12 transmission', () => {
    expect(syntheticX12('837','SYN-CLAIM-001')).toMatchObject({ transaction:'837', transmissionAuthorized:false, mode:'synthetic_only' });
    expect(() => syntheticX12('835','REAL-001')).toThrow(/SYN-/);
  });
});
