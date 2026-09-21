import { BadRequestException } from '@nestjs/common';
import { IndexNowService } from './indexnow.service';
import { encryptSecret } from '../common/crypto';

describe('IndexNowService', () => {
  let service: IndexNowService;
  let prismaMock: any;
  let originalFetch: any;
  let originalIntegrationKey: string | undefined;

  // encryptSecret needs a key. Glitz's own machine supplied one from a local
  // .env that is not part of the repo, so on a fresh checkout these tests
  // failed; the suite now brings its own throwaway key.
  beforeAll(() => {
    originalIntegrationKey = process.env.INTEGRATION_KEY;
    process.env.INTEGRATION_KEY = 'test-integration-key-for-indexnow-spec';
  });

  afterAll(() => {
    if (originalIntegrationKey === undefined) delete process.env.INTEGRATION_KEY;
    else process.env.INTEGRATION_KEY = originalIntegrationKey;
  });

  beforeEach(() => {
    originalFetch = global.fetch;
    prismaMock = {
      integration: {
        findFirst: jest.fn(),
      },
    };
    service = new IndexNowService(prismaMock);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.INDEXNOW_KEY;
    delete process.env.INDEXNOW_HOST;
  });

  it('throws BadRequestException when no integration is configured', async () => {
    prismaMock.integration.findFirst.mockResolvedValue(null);
    await expect(service.resolveCredentials()).rejects.toThrow(BadRequestException);
  });

  it('resolves encrypted credentials from database', async () => {
    const creds = {
      host: 'ladakhvacation.in',
      apiKey: '7c3f84e09f874a9db4814c327fb2714f',
      keyLocation: 'https://ladakhvacation.in/indexnow.txt',
    };
    prismaMock.integration.findFirst.mockResolvedValue({
      provider: 'indexnow',
      isActive: true,
      credentials: encryptSecret(JSON.stringify(creds)),
    });

    const resolved = await service.resolveCredentials();
    expect(resolved.host).toBe('ladakhvacation.in');
    expect(resolved.apiKey).toBe('7c3f84e09f874a9db4814c327fb2714f');
  });

  it('submits URLs and handles HTTP 200 OK', async () => {
    const creds = {
      host: 'ladakhvacation.in',
      apiKey: '7c3f84e09f874a9db4814c327fb2714f',
    };
    prismaMock.integration.findFirst.mockResolvedValue({
      provider: 'indexnow',
      isActive: true,
      credentials: encryptSecret(JSON.stringify(creds)),
    });

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
    });

    const res = await service.submitUrls(['/packages/classic-kashmir']);
    expect(res.ok).toBe(true);
    expect(res.submitted).toBe(1);
    expect(res.statusCode).toBe(200);
  });

  it('handles HTTP 202 Accepted response', async () => {
    const creds = {
      host: 'ladakhvacation.in',
      apiKey: '7c3f84e09f874a9db4814c327fb2714f',
    };
    prismaMock.integration.findFirst.mockResolvedValue({
      provider: 'indexnow',
      isActive: true,
      credentials: encryptSecret(JSON.stringify(creds)),
    });

    global.fetch = jest.fn().mockResolvedValue({
      status: 202,
      text: jest.fn().mockResolvedValue('Accepted'),
    });

    const res = await service.submitUrls(['https://ladakhvacation.in/guides/places-to-visit-in-kashmir']);
    expect(res.ok).toBe(true);
    expect(res.statusCode).toBe(202);
  });

  it('throws error when IndexNow returns 403 Forbidden', async () => {
    const creds = {
      host: 'ladakhvacation.in',
      apiKey: 'invalid-key',
    };
    prismaMock.integration.findFirst.mockResolvedValue({
      provider: 'indexnow',
      isActive: true,
      credentials: encryptSecret(JSON.stringify(creds)),
    });

    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      text: jest.fn().mockResolvedValue('Forbidden'),
    });

    await expect(service.submitUrls(['/destinations/kashmir'])).rejects.toThrow(BadRequestException);
  });
});
