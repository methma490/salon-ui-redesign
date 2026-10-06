import { BadRequestException } from '@nestjs/common';
import {
  generateSafeFilename,
  isPathTraversalSafe,
  validateMagicBytes,
  validateUploadedFile,
} from './file-security.util';

describe('FileSecurityUtil', () => {
  // Valid PNG Header: 89 50 4E 47 0D 0A 1A 0A
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  // Valid JPEG Header: FF D8 FF E0
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

  // Valid WebP Header: RIFF .... WEBP
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  // Disguised PHP script
  const fakePngWithPhpScript = Buffer.from('<?php echo "evil"; ?>');

  // Disguised Windows Executable (MZ header)
  const fakePngWithExeHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00]);

  describe('validateMagicBytes', () => {
    it('accepts valid PNG buffer', () => {
      expect(validateMagicBytes(validPngBuffer, 'image/png')).toBe(true);
    });

    it('accepts valid JPEG buffer', () => {
      expect(validateMagicBytes(validJpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('accepts valid WebP buffer', () => {
      expect(validateMagicBytes(validWebpBuffer, 'image/webp')).toBe(true);
    });

    it('rejects disguised PHP script pretending to be image/png', () => {
      expect(validateMagicBytes(fakePngWithPhpScript, 'image/png')).toBe(false);
    });

    it('rejects disguised EXE binary pretending to be image/png', () => {
      expect(validateMagicBytes(fakePngWithExeHeader, 'image/png')).toBe(false);
    });
  });

  describe('validateUploadedFile', () => {
    it('accepts a valid image file within size limits', () => {
      const file = {
        originalname: 'salon-logo.png',
        mimetype: 'image/png',
        size: validPngBuffer.length,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      expect(() => validateUploadedFile(file)).not.toThrow();
    });

    it('rejects oversized file', () => {
      const file = {
        originalname: 'large.png',
        mimetype: 'image/png',
        size: 10 * 1024 * 1024,
        buffer: Buffer.alloc(10 * 1024 * 1024),
      } as Express.Multer.File;

      expect(() =>
        validateUploadedFile(file, { maxSizeBytes: 2 * 1024 * 1024 }),
      ).toThrow(BadRequestException);
    });

    it('rejects blocked executable extensions even if MIME is falsified', () => {
      const file = {
        originalname: 'malicious.php',
        mimetype: 'image/png',
        size: validPngBuffer.length,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      expect(() => validateUploadedFile(file)).toThrow(BadRequestException);
    });

    it('rejects disguised file when magic bytes do not match declared MIME', () => {
      const file = {
        originalname: 'innocent.png',
        mimetype: 'image/png',
        size: fakePngWithPhpScript.length,
        buffer: fakePngWithPhpScript,
      } as Express.Multer.File;

      expect(() => validateUploadedFile(file)).toThrow(BadRequestException);
    });
  });

  describe('isPathTraversalSafe', () => {
    it('accepts clean filenames', () => {
      expect(isPathTraversalSafe('logo.webp')).toBe(true);
      expect(isPathTraversalSafe('f84a5118-a626-4448-9366-419b486db0aa.png')).toBe(true);
    });

    it('rejects path traversal with parent directory sequences (..)', () => {
      expect(isPathTraversalSafe('../../../etc/passwd')).toBe(false);
      expect(isPathTraversalSafe('..\\..\\windows\\system32')).toBe(false);
      expect(isPathTraversalSafe('uploads/../secret.env')).toBe(false);
    });

    it('rejects null byte injection', () => {
      expect(isPathTraversalSafe('logo.png\0.php')).toBe(false);
    });
  });

  describe('generateSafeFilename', () => {
    it('produces unique randomized UUID filename preserving safe extension', () => {
      const name1 = generateSafeFilename('my photo.jpeg');
      const name2 = generateSafeFilename('my photo.jpeg');

      expect(name1).toMatch(/^[0-9a-f-]{36}\.jpeg$/);
      expect(name2).toMatch(/^[0-9a-f-]{36}\.jpeg$/);
      expect(name1).not.toEqual(name2);
    });
  });
});
