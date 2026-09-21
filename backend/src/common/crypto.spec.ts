import { encryptSecret, decryptSecret } from './crypto';

describe('crypto: encryptSecret and decryptSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('encrypts and decrypts with a valid 64-character hex INTEGRATION_KEY', () => {
    process.env.INTEGRATION_KEY = 'a'.repeat(64);
    const plaintext = JSON.stringify({ clientEmail: 'test@example.com', privateKey: 'secret' });
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts with a raw non-hex INTEGRATION_KEY by hashing to 32 bytes', () => {
    process.env.INTEGRATION_KEY = 'my-custom-integration-key-string-12345';
    const plaintext = 'sample-secret-value';
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('falls back to JWT_SECRET when INTEGRATION_KEY is not set', () => {
    delete process.env.INTEGRATION_KEY;
    process.env.JWT_SECRET = 'jwt-test-secret-for-specs';
    const plaintext = JSON.stringify({ apiKey: 'sk-123456789' });
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('throws InternalServerErrorException when neither INTEGRATION_KEY nor JWT_SECRET is available', () => {
    delete process.env.INTEGRATION_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    expect(() => encryptSecret('test')).toThrow(/INTEGRATION_KEY or JWT_SECRET/);
  });
});
