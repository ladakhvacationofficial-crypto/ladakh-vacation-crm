import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

/**
 * Neon Object Storage is S3-compatible. This service wraps @aws-sdk/client-s3
 * configured against the Neon branch's storage endpoint, so uploads go to a
 * durable bucket rather than Render's ephemeral disk.
 *
 * Same behaviour as the Glitz original (which pointed at Supabase): every
 * upload returns a permanent PUBLIC link. That needs the bucket's access mode
 * to be `public_read` in the Neon console; a public_read object is read
 * anonymously at `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>` (Neon docs).
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
