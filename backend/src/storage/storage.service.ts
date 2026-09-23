import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID, randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import * as path from 'path';

/**
 * Neon Object Storage is S3-compatible. This service wraps @aws-sdk/client-s3
 * configured against the Neon branch's storage endpoint, so uploads go to a
 * durable bucket rather than Render's ephemeral disk.
 *
 * Website media uploads return public links from a public_read bucket.
 * Operational documents use authenticated API downloads and encrypted objects;
 * they never return a plaintext public object URL.
 *
 * Env vars. The AWS_* names are exactly what `neon link` / the Neon console
 * give you, and what the AWS SDK reads by convention:
 *   AWS_ENDPOINT_URL_S3     – the branch's storage endpoint (https://...neon.tech)
 *   AWS_ACCESS_KEY_ID       – branch storage credential id (nak_live_...)
 *   AWS_SECRET_ACCESS_KEY   – branch storage credential secret
 *   AWS_REGION              – e.g. "ap-southeast-1"
 *   STORAGE_BUCKET          – bucket name, default "uploads"
 *
 * When the endpoint or keys are unset the service logs a warning but does NOT
 * crash the app: other modules continue to work and uploads throw at call time.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = (config.get<string>('AWS_ENDPOINT_URL_S3') ?? '').replace(/\/+$/, '');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucket = config.get<string>('STORAGE_BUCKET') ?? 'uploads';
    const region = config.get<string>('AWS_REGION') ?? 'ap-southeast-1';

    this.bucket = bucket;
    // Neon serves public_read objects at <endpoint>/<bucket>/<key>.
    this.publicBaseUrl = endpoint;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set: file uploads disabled. ' +
        'Copy them from the Neon project (Storage) into the environment to enable durable file storage.',
      );
      this.client = null;
      return;
    }

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // required: Neon uses path-style addressing
    });

    this.logger.log(`Storage configured → bucket "${bucket}" at ${endpoint}`);
  }

  /** True when credentials are configured and uploads will work. */
  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Upload a file buffer and return its public URL.
   *
   * @param buffer   Raw file bytes (from Multer's file.buffer)
   * @param originalName  Original filename — used to preserve the extension
   * @param folder   Logical folder inside the bucket, e.g. "hr-docs", "vouchers"
   * @returns        Public URL of the uploaded file
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    folder: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error(
        'Storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
      );
    }

    this.validateUpload(buffer, originalName);
    if (!/^[a-zA-Z0-9_-]+$/.test(folder)) throw new BadRequestException('Invalid storage folder.');
    const ext = path.extname(originalName) || '';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: this.guessMimeType(ext),
      }),
    );

    // Neon public_read URL pattern: <endpoint>/<bucket>/<key>
    const publicUrl = `${this.publicBaseUrl}/${this.bucket}/${key}`;

    this.logger.log(`Uploaded ${key} (${buffer.length} bytes)`);
    return publicUrl;
  }

  private documentKey(): Buffer {
    const secret = this.config.get<string>('STORAGE_ENCRYPTION_KEY') || this.config.get<string>('INTEGRATION_KEY');
    if (!secret) throw new BadRequestException('Set STORAGE_ENCRYPTION_KEY or INTEGRATION_KEY before uploading private documents.');
    return createHash('sha256').update(`ladakh-documents:v1:${secret}`).digest();
  }

  validateUpload(buffer: Buffer, name: string) {
    if (buffer.length === 0 || buffer.length > 12 * 1024 * 1024) throw new BadRequestException('Files must be between 1 byte and 12 MB.');
    if (!/\.(pdf|jpe?g|png|webp|docx?|xlsx?|csv)$/i.test(name)) throw new BadRequestException('Unsupported file type.');
  }

  async uploadPrivate(buffer: Buffer, name: string): Promise<string> {
    this.validateUpload(buffer, name);
    if (!this.client) throw new BadRequestException('Storage is not configured.');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.documentKey(), nonce);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const key = `private/${randomUUID()}.bin`;
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key,
      Body: Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]), ContentType: 'application/octet-stream' }));
    return `private:v1:${key}`;
  }

  async readPrivate(reference: string): Promise<Buffer> {
    if (!reference.startsWith('private:v1:private/')) throw new BadRequestException('Legacy attachment requires migration to protected storage.');
    if (!this.client) throw new BadRequestException('Storage is not configured.');
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: reference.slice('private:v1:'.length) }));
    if (!response.Body) throw new BadRequestException('Document is empty.');
    const body = Buffer.from(await response.Body.transformToByteArray());
    const decipher = createDecipheriv('aes-256-gcm', this.documentKey(), body.subarray(0,12));
    decipher.setAuthTag(body.subarray(12,28));
    return Buffer.concat([decipher.update(body.subarray(28)), decipher.final()]);
  }

  async remove(reference: string) {
    if (!this.client) throw new BadRequestException('Storage is not configured.');
    const prefix = `${this.publicBaseUrl}/${this.bucket}/`;
    const key = reference.startsWith('private:v1:private/') ? reference.slice('private:v1:'.length) :
      reference.startsWith(prefix) ? reference.slice(prefix.length) : null;
    if (!key || key.includes('..')) throw new BadRequestException('Unrecognized storage object.');
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private guessMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
