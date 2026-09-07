import { describe, expect, it } from 'vitest';
import {
  MEDICAL_VENDOR_PROFILES,
  connectorDiscovery,
  smartConfigurationUrl,
  validateConnectorConfig,
} from '../lib/medicalConnector';

describe('HealthOS connector fail-closed validation', () => {
  it('requires client IDs for named EHR vendors', () => {
    for (const vendor of ['Epic','athenahealth','Oracle Health / Cerner','eClinicalWorks'] as const) {
      expect(MEDICAL_VENDOR_PROFILES[vendor].requiresClientId).toBe(true);
    }
    expect(MEDICAL_VENDOR_PROFILES['Generic FHIR R4'].requiresClientId).toBe(false);
  });

  it('rejects empty or non-HTTPS FHIR endpoints', () => {
    expect(validateConnectorConfig({ vendor:'Epic', baseUrl:'', clientId:'x', scopes:['openid'] }).ok).toBe(false);
    expect(validateConnectorConfig({ vendor:'Epic', baseUrl:'http://example.test/fhir', clientId:'x', scopes:['openid'] }).ok).toBe(false);
  });
  it('requires client ID and at least one scope', () => {
    const result = validateConnectorConfig({ vendor:'Epic', baseUrl:'https://example.test/fhir', scopes:[] });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('client ID');
    expect(result.errors.join(' ')).toContain('scope');
  });

  it('normalizes config and constructs SMART discovery safely', () => {
    const result = connectorDiscovery({
      vendor:'athenahealth', baseUrl:' https://example.test/fhir/ ', clientId:' client-1 ',
      scopes:['openid',' patient/Patient.read ','openid'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.config.clientId).toBe('client-1');
    expect(result.config.scopes).toEqual(['openid','patient/Patient.read']);
    expect(result.capabilityUrl).toBe('https://example.test/fhir/metadata');
    expect(result.smartConfigurationUrl).toBe('https://example.test/fhir/.well-known/smart-configuration');
  });

  it('constructs SMART configuration URL directly', () => {
    expect(smartConfigurationUrl('https://example.test/fhir/')).toBe('https://example.test/fhir/.well-known/smart-configuration');
  });
});
