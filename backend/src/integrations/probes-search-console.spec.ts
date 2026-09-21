import { runProbe } from './probes';

/**
 * Only the paths that return before any network call are exercised here, so
 * the suite never contacts Google. Token and permission failures are covered
 * by the pure helpers in search-console-auth.spec.ts.
 */
describe('google_search_console probe: configuration errors', () => {
  it('asks for an auth method when none is chosen', async () => {
    const r = await runProbe('google_search_console', { siteUrl: 'sc-domain:ladakhvacation.in' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Choose an auth method/);
  });

  it('names the wrong file when an OAuth client JSON is pasted as a key', async () => {
    const r = await runProbe('google_search_console', {
      authMethod: 'service_account',
      serviceAccountKey: JSON.stringify({ web: { client_id: 'x' } }),
      siteUrl: 'sc-domain:ladakhvacation.in',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/OAuth client file/);
  });

  it('lists missing OAuth fields', async () => {
    const r = await runProbe('google_search_console', {
      authMethod: 'oauth',
      clientId: 'x',
      siteUrl: 'sc-domain:ladakhvacation.in',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/clientSecret, refreshToken are missing/);
  });

  it('never throws, so the result can always be stored on the row', async () => {
    await expect(runProbe('google_search_console', {})).resolves.toHaveProperty('ok', false);
  });
});
