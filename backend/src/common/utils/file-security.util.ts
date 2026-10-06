import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { basename, extname, normalize } from 'path';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export const DEFAULT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const DEFAULT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export const BLOCKED_EXTENSIONS = [
  '.exe',
  '.dll',
  '.so',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.ps1',
  '.php',
  '.phtml',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.html',
  '.htm',
  '.xhtml',
  '.jsp',
  '.asp',
  '.aspx',
  '.cgi',
  '.py',
  '.rb',
  '.pl',
  '.jar',
  '.vbs',
  '.scr',
];

/**
 * Validates file buffer magic bytes against expected MIME types.
 * Prevents executable/script files disguised with image extensions.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase();

  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      // FF D8 FF
      return hex.startsWith('ffd8ff');

    case 'image/png':
      // 89 50 4E 47 0D 0A 1A 0A
      return hex.startsWith('89504e470d0a1a0a');

    case 'image/webp':
      // RIFF .... WEBP
      return (
        hex.startsWith('52494646') &&
        buffer.length >= 12 &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );

    case 'image/gif':
      // GIF87a or GIF89a
      return hex.startsWith('474946383761') || hex.startsWith('474946383961');

    case 'application/pdf':
      // %PDF-
      return hex.startsWith('25504446');

    default:
      return false;
  }
}

/**
 * Validates uploaded file size, extension, MIME type, and magic bytes.
 */
export function validateUploadedFile(
  file: Express.Multer.File,
  options: FileValidationOptions = {},
): void {
  if (!file || !file.buffer) {
    throw new BadRequestException('No file provided or file buffer is empty');
  }

  const maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024; // 5MB default
  const allowedMimes = options.allowedMimeTypes ?? DEFAULT_IMAGE_MIME_TYPES;
  const allowedExts = options.allowedExtensions ?? DEFAULT_IMAGE_EXTENSIONS;

  if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
    throw new BadRequestException(
      `File size exceeds allowed limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
    );
  }

  const rawExt = extname(file.originalname || '').toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(rawExt)) {
    throw new BadRequestException('Executable or script file types are strictly prohibited');
  }

  if (allowedExts.length > 0 && !allowedExts.includes(rawExt)) {
    throw new BadRequestException(
      `Invalid file extension. Allowed extensions: ${allowedExts.join(', ')}`,
    );
  }

  const normalizedMime = (file.mimetype || '').toLowerCase().trim();
  if (allowedMimes.length > 0 && !allowedMimes.includes(normalizedMime)) {
    throw new BadRequestException(
      `Invalid file MIME type (${normalizedMime}). Allowed types: ${allowedMimes.join(', ')}`,
    );
  }

  // Magic byte inspection
  const isMagicValid = validateMagicBytes(file.buffer, normalizedMime);
  if (!isMagicValid) {
    throw new BadRequestException(
      'File content does not match its declared MIME type (invalid magic signature)',
    );
  }
}

/**
 * Generates a safe, cryptographically random filename with preserved safe extension.
 */
export function generateSafeFilename(originalFilename: string, fallbackExt = '.webp'): string {
  const ext = extname(originalFilename || '').toLowerCase();
  const safeExt = DEFAULT_IMAGE_EXTENSIONS.includes(ext) ? ext : fallbackExt;
  return `${randomUUID()}${safeExt}`;
}

/**
 * Checks for path traversal sequences in requested filenames or paths.
 */
export function isPathTraversalSafe(requestedPath: string): boolean {
  if (!requestedPath || typeof requestedPath !== 'string') {
    return false;
  }

  // Reject null bytes, backslashes in URL paths, and directory traversal sequences
  if (
    requestedPath.includes('\0') ||
    requestedPath.includes('..') ||
    requestedPath.includes('\\')
  ) {
    return false;
  }

  const safeBase = basename(requestedPath);
  return safeBase === normalize(requestedPath).replace(/^[/\\]+/, '');
}
