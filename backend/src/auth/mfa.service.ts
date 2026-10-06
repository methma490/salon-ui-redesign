import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  generateOtpauthUri,
  generateTotpSecret,
  verifyTotpCode,
} from '../common/utils/totp.util';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export interface MfaPendingTokenPayload {
  sub: string;
  email: string;
  userType: 'SUPER_ADMIN';
  purpose: 'SUPER_ADMIN_MFA_PENDING';
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates an ephemeral JWT token for Super Admin pending MFA verification.
   * Valid for 5 minutes.
   */
  async createPendingMfaToken(superAdminId: string, email: string): Promise<string> {
    const payload: MfaPendingTokenPayload = {
      sub: superAdminId,
      email,
      userType: 'SUPER_ADMIN',
      purpose: 'SUPER_ADMIN_MFA_PENDING',
    };

    const secret = this.configService.get<string>('jwt.accessSecret') || 'default-secret';
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: '5m',
    });
  }

  /**
   * Verifies and decodes a pending MFA session token.
   */
  async verifyPendingMfaToken(mfaSessionToken: string): Promise<MfaPendingTokenPayload> {
    try {
      const secret = this.configService.get<string>('jwt.accessSecret') || 'default-secret';
      const payload = await this.jwtService.verifyAsync<MfaPendingTokenPayload>(mfaSessionToken, {
        secret,
      });

      if (payload.purpose !== 'SUPER_ADMIN_MFA_PENDING' || payload.userType !== 'SUPER_ADMIN') {
        throw new UnauthorizedException('Invalid MFA session token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('MFA session has expired or is invalid. Please log in again.');
    }
  }

  /**
   * Generates a new TOTP secret, QR code, and backup recovery codes for Super Admin setup.
   */
  async generateMfaSetup(superAdminEmail: string): Promise<MfaSetupResult> {
    const secret = generateTotpSecret(20);
    const serviceName = 'Dart Salon Platform';
    const otpauthUrl = generateOtpauthUri({
      issuer: serviceName,
      label: superAdminEmail,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const recoveryCodes = this.generateRecoveryCodes(8);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      recoveryCodes,
    };
  }

  /**
   * Validates a TOTP code against a secret (RFC 6238).
   */
  verifyTotp(code: string, secret: string): boolean {
    return verifyTotpCode(code, secret, 1);
  }

  /**
   * Verifies a recovery code against stored recovery code hashes in the database.
   * If valid, marks the code as used.
   */
  async verifyAndConsumeRecoveryCode(superAdminId: string, plainCode: string): Promise<boolean> {
    const normalizedCode = plainCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalizedCode) return false;

    const availableCodes = await this.prisma.superAdminMfaRecoveryCode.findMany({
      where: {
        superAdminId,
        usedAt: null,
      },
    });

    for (const record of availableCodes) {
      const isMatch = await bcrypt.compare(normalizedCode, record.codeHash);
      if (isMatch) {
        await this.prisma.superAdminMfaRecoveryCode.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
        this.logger.warn(`Recovery code consumed for Super Admin [${superAdminId}]`);
        return true;
      }
    }

    return false;
  }

  /**
   * Saves new recovery codes for a Super Admin (deleting prior codes).
   */
  async saveRecoveryCodes(superAdminId: string, codes: string[]): Promise<void> {
    await this.prisma.superAdminMfaRecoveryCode.deleteMany({
      where: { superAdminId },
    });

    for (const code of codes) {
      const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const codeHash = await bcrypt.hash(normalized, 10);
      await this.prisma.superAdminMfaRecoveryCode.create({
        data: {
          superAdminId,
          codeHash,
        },
      });
    }
  }

  /**
   * Helper to generate random 8-character recovery codes (format: ABCD-EFGH)
   */
  generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      codes.push(formatted);
    }
    return codes;
  }
}
