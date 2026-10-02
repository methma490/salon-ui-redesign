import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly prefix: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('DO_SPACES_KEY')?.trim();
    const secret = this.configService.get<string>('DO_SPACES_SECRET')?.trim();
    this.bucket = this.configService.get<string>('DO_SPACES_BUCKET', 'dartcodes.data')?.trim();
    this.region = this.configService.get<string>('DO_SPACES_REGION', 'sgp1')?.trim();
    this.prefix = (this.configService.get<string>('DO_SPACES_PREFIX', 'saas_saloon') || 'saas_saloon')
      .trim()
      .replace(/^\/+|\/+$/g, '');

    const endpointEnv = this.configService.get<string>('DO_SPACES_ENDPOINT')?.trim();
    const usePathStyle = this.bucket.includes('.');

    if (key && secret) {
      // S3 client endpoint for DigitalOcean Spaces
      const s3Endpoint = `https://${this.region}.digitaloceanspaces.com`;
      this.s3Client = new S3Client({
        endpoint: s3Endpoint,
        region: this.region,
        credentials: {
          accessKeyId: key,
          secretAccessKey: secret,
        },
        forcePathStyle: usePathStyle,
      });

      // Public URL base
      if (usePathStyle) {
        this.publicBaseUrl = `${s3Endpoint}/${this.bucket}`;
      } else if (endpointEnv && endpointEnv.includes(this.bucket)) {
        this.publicBaseUrl = endpointEnv.replace(/\/+$/, '');
      } else {
        this.publicBaseUrl = `https://${this.bucket}.${this.region}.digitaloceanspaces.com`;
      }

      this.logger.log(`DigitalOcean Spaces storage initialized at ${this.publicBaseUrl}/${this.prefix}`);
    } else {
      this.logger.warn('DigitalOcean Spaces credentials not found. Falling back to local disk storage.');
      this.publicBaseUrl = '';
    }
  }

  /**
   * Upload an image buffer to DigitalOcean Spaces (or local disk fallback)
   */
  async uploadFile(
    buffer: Buffer,
    folder: string,
    filename: string,
    contentType = 'image/webp',
  ): Promise<string> {
    if (this.s3Client) {
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
      const key = `${this.prefix}/${cleanFolder}/${filename}`;
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read',
            CacheControl: 'max-age=31536000, public',
          }),
        );
        return `${this.publicBaseUrl}/${key}`;
      } catch (err) {
        this.logger.error(
          `Failed to upload to DigitalOcean Spaces (${key}): ${(err as Error).message}`,
          (err as Error).stack,
        );
        throw err;
      }
    }

    // Local disk fallback
    const uploadsDir = join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    const absolutePath = join(uploadsDir, filename);
    writeFileSync(absolutePath, buffer);
    return `/uploads/${folder}/${filename}`;
  }

  /**
   * Delete a file from DigitalOcean Spaces or local storage
   */
  async deleteFile(fileUrlOrPath: string | null | undefined): Promise<void> {
    if (!fileUrlOrPath) return;

    if (
      this.s3Client &&
      (fileUrlOrPath.startsWith('http://') || fileUrlOrPath.startsWith('https://'))
    ) {
      try {
        const url = new URL(fileUrlOrPath);
        const key = url.pathname.replace(/^\/+/, '');
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );
      } catch (err) {
        this.logger.warn(
          `Failed to delete file from DigitalOcean Spaces (${fileUrlOrPath}): ${(err as Error).message}`,
        );
      }
      return;
    }

    // Local file cleanup
    try {
      const localPath = join(process.cwd(), fileUrlOrPath.replace(/^\//, ''));
      if (existsSync(localPath)) {
        unlinkSync(localPath);
      }
    } catch {}
  }
}
