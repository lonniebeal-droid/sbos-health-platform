import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('App component wiring', () => {
  it('passes the active role into Jessie using the widget prop name', () => {
    const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('activeRole={currentRole}');
    expect(appSource).not.toContain('currentRole={currentRole}');
  });
});
