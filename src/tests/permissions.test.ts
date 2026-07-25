import { hasPermission } from '../lib/permissions';

// Simple lightweight test runner for SBOS permissions
export function runPermissionsTests(): boolean {
  let passed = true;

  // Test 1: Patient can read prescriptions, cannot write prescriptions
  const patientCanReadRx = hasPermission('patient', 'read', 'prescriptions');
  const patientCanWriteRx = hasPermission('patient', 'write', 'prescriptions');
  
  if (!patientCanReadRx || patientCanWriteRx) {
    console.error('Test 1 Failed: Patient RBAC rules invalid');
    passed = false;
  }

  // Test 2: Provider can sign prescriptions
  const providerCanSign = hasPermission('provider', 'sign', 'prescriptions');
  if (!providerCanSign) {
    console.error('Test 2 Failed: Provider sign prescription permission missing');
    passed = false;
  }

  // Test 3: Insurance can adjudicate claims
  const insuranceCanAdjudicate = hasPermission('insurance', 'adjudicate', 'claims');
  if (!insuranceCanAdjudicate) {
    console.error('Test 3 Failed: Insurance adjudicate claims permission missing');
    passed = false;
  }

  console.log('Permissions test suite completed:', passed ? 'ALL PASSED' : 'FAILED');
  return passed;
}
