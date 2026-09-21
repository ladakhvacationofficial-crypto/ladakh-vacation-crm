import {
  AUTH_OAUTH,
  AUTH_SERVICE_ACCOUNT,
  SearchConsoleAuthError,
  describeTokenError,
  parseServiceAccountKey,
  resolveAuthConfig,
} from './search-console-auth';

/** Structurally valid, cryptographically useless. Never a real key. */
const FAKE_PEM = '-----BEGIN PRIVATE KEY-----\nFAKEKEYFORTESTSONLY\n-----END PRIVATE KEY-----\n';
const EMAIL = 'gsc-reader@lv-test.iam.gserviceaccount.com';

const keyObject = (overrides: Record<string, unknown> = {}) => ({
  type: 'service_account',
  project_id: 'lv-test',
  client_email: EMAIL,
  private_key: FAKE_PEM,
  ...overrides,
});
const keyJson = (overrides: Record<string, unknown> = {}) => JSON.stringify(keyObject(overrides));

const oauthCreds = {
  clientId: 'client-id.apps.googleusercontent.com',
  clientSecret: 'secret',
  refreshToken: '1//refresh',
};

describe('parseServiceAccountKey', () => {
  it('extracts the email and PEM key from a valid key file', () => {
    const r = parseServiceAccountKey(keyJson());
    expect(r.clientEmail).toBe(EMAIL);
    expect(r.privateKey).toBe(FAKE_PEM);
  });

  it('accepts a paste whose line breaks were stripped by a single-line input', () => {
    const pretty = JSON.stringify(keyObject(), null, 2);
    expect(pretty).toContain('\n');
    const flattened = pretty.replace(/\n/g, '');
    expect(parseServiceAccountKey(flattened).clientEmail).toBe(EMAIL);
  });

  it('repairs a double-escaped private key into real line breaks', () => {
    const escaped = FAKE_PEM.replace(/\n/g, '\\n');
    const r = parseServiceAccountKey(keyJson({ private_key: escaped }));
    expect(r.privateKey).toContain('\n');
    expect(r.privateKey).not.toContain('\\n');
    expect(r.privateKey).toBe(FAKE_PEM);
  });

  it('names the mistake when an OAuth client file is pasted instead', () => {
    const web = JSON.stringify({ web: { client_id: 'x', client_secret: 'y' } });
    const installed = JSON.stringify({ installed: { client_id: 'x' } });
    expect(() => parseServiceAccountKey(web)).toThrow(/OAuth client file/);
    expect(() => parseServiceAccountKey(installed)).toThrow(/OAuth client file/);
  });

  it('rejects invalid JSON with an instruction, not a parser trace', () => {
    expect(() => parseServiceAccountKey('{not json')).toThrow(/not valid JSON/);
  });

  it('rejects an empty value', () => {
    expect(() => parseServiceAccountKey('')).toThrow(/empty/);
    expect(() => parseServiceAccountKey('   ')).toThrow(/empty/);
    expect(() => parseServiceAccountKey(undefined as any)).toThrow(/empty/);
  });

  it('rejects the wrong credential type', () => {
    expect(() => parseServiceAccountKey(keyJson({ type: 'authorized_user' }))).toThrow(
      /service_account/,
    );
  });

  it('rejects a key missing client_email or private_key', () => {
    expect(() => parseServiceAccountKey(keyJson({ client_email: '' }))).toThrow(/client_email/);
    expect(() => parseServiceAccountKey(keyJson({ private_key: '' }))).toThrow(/private_key/);
  });

  it('rejects a private_key that is not a PEM key', () => {
    expect(() => parseServiceAccountKey(keyJson({ private_key: 'hello' }))).toThrow(/PEM/);
  });

  it('throws SearchConsoleAuthError so callers can tell operator mistakes from bugs', () => {
    try {
      parseServiceAccountKey('{bad');
      fail('expected a throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SearchConsoleAuthError);
    }
  });
});

describe('resolveAuthConfig', () => {
  it('resolves a service account', () => {
    const c = resolveAuthConfig({ authMethod: AUTH_SERVICE_ACCOUNT, serviceAccountKey: keyJson() });
    expect(c.mode).toBe('service_account');
    if (c.mode === 'service_account') expect(c.clientEmail).toBe(EMAIL);
  });

  it('resolves OAuth', () => {
    const c = resolveAuthConfig({ authMethod: AUTH_OAUTH, ...oauthCreds });
    expect(c).toEqual({ mode: 'oauth', ...oauthCreds });
  });

  it('lists every missing OAuth field', () => {
    expect(() => resolveAuthConfig({ authMethod: AUTH_OAUTH, clientId: 'x' })).toThrow(
      /clientSecret, refreshToken are missing/,
    );
    expect(() =>
      resolveAuthConfig({ authMethod: AUTH_OAUTH, clientId: 'x', clientSecret: 'y' }),
    ).toThrow(/refreshToken is missing/);
  });

  it('requires the key when the method is service_account', () => {
    expect(() => resolveAuthConfig({ authMethod: AUTH_SERVICE_ACCOUNT })).toThrow(
      /no service account JSON key/,
    );
  });

  /**
   * Credential edits merge and a blank field keeps the old value, so a row that
   * moved between methods still holds the other method's fields. The explicit
   * choice must win in both directions.
   */
  it('uses OAuth when chosen, even with a stale service account key still stored', () => {
    const c = resolveAuthConfig({
      authMethod: AUTH_OAUTH,
      serviceAccountKey: keyJson(),
      ...oauthCreds,
    });
    expect(c.mode).toBe('oauth');
  });

  it('uses the service account when chosen, even with stale OAuth fields still stored', () => {
    const c = resolveAuthConfig({
      authMethod: AUTH_SERVICE_ACCOUNT,
      serviceAccountKey: keyJson(),
      ...oauthCreds,
    });
    expect(c.mode).toBe('service_account');
  });

  it('treats a legacy row with a refresh token and no method as OAuth', () => {
    expect(resolveAuthConfig({ ...oauthCreds }).mode).toBe('oauth');
  });

  it('asks for a method when there is nothing to go on', () => {
    expect(() => resolveAuthConfig({})).toThrow(/Choose an auth method/);
  });

  it('rejects an unknown method by name', () => {
    expect(() => resolveAuthConfig({ authMethod: 'api_key' })).toThrow(/Unknown auth method "api_key"/);
  });
});

describe('describeTokenError', () => {
  const oauth = { mode: 'oauth' as const, ...oauthCreds };
  const sa = { mode: 'service_account' as const, clientEmail: EMAIL, privateKey: FAKE_PEM };

  it('explains invalid_grant as the 7-day Testing expiry', () => {
    const msg = describeTokenError({ response: { data: { error: 'invalid_grant' } } }, oauth);
    expect(msg).toMatch(/7 days/);
    expect(msg).toMatch(/Production/);
  });

  it('also catches invalid_grant when it only appears in the message', () => {
    expect(describeTokenError(new Error('invalid_grant: Token has been expired'), oauth)).toMatch(
      /7 days/,
    );
  });

  it('points at the key file for a signing failure', () => {
    const msg = describeTokenError(new Error('error:1E08010C:DECODER routines::unsupported'), sa);
    expect(msg).toMatch(/Re-download the JSON key/);
  });

  it('falls back to the raw detail for anything else', () => {
    expect(describeTokenError(new Error('socket hang up'), oauth)).toMatch(/socket hang up/);
  });
});
