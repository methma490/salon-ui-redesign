import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  MfaDisableDto,
  MfaEnableDto,
  MfaRegenerateRecoveryCodesDto,
  MfaVerifyLoginDto,
} from './dto/mfa.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './interfaces/auth.interface';
import { PasswordResetService } from './password-reset.service';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const extractClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = extractClientIp(req);
    const result = await this.authService.login(dto, clientIp);

    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        mfaSetupRequired: result.mfaSetupRequired,
        mfaSessionToken: result.mfaSessionToken,
        user: result.user,
      };
    }

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return {
      mfaRequired: false,
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('mfa/login-verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyMfaLogin(
    @Body() dto: MfaVerifyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = extractClientIp(req);
    const result = await this.authService.verifyMfaLogin(dto, clientIp);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyMfaAlias(
    @Body() dto: MfaVerifyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verifyMfaLogin(dto, req, res);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async setupMfa(
    @Req() req: Request,
    @Body() body?: { mfaSessionToken?: string },
  ) {
    if (body?.mfaSessionToken) {
      return this.authService.setupMfaWithSessionToken(body.mfaSessionToken);
    }
    // If not using session token, check authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authentication token or MFA session token');
    }
    // Try resolving as pending MFA session token first or normal jwt
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      return await this.authService.setupMfaWithSessionToken(token);
    } catch {
      // Decode user from authenticated session
      const me = await this.authService.getProfile(
        (req as any).user?.id,
        (req as any).user?.userType,
      );
      if ((req as any).user?.userType !== 'SUPER_ADMIN') {
        throw new UnauthorizedException('Super Admin privilege required');
      }
      return this.authService.setupMfa(me.id);
    }
  }

  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async enableMfa(
    @Body() dto: MfaEnableDto & { mfaSessionToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientIp = extractClientIp(req);
    if (dto.mfaSessionToken) {
      const result = await this.authService.enableMfaWithSessionToken(
        dto.mfaSessionToken,
        dto,
        clientIp,
      );
      if (result.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      }
      return result;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authentication token or MFA session token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const result = await this.authService.enableMfaWithSessionToken(token, dto, clientIp);
      if (result.refreshToken) {
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
      }
      return result;
    } catch {
      const user = (req as any).user;
      if (!user || user.userType !== 'SUPER_ADMIN') {
        throw new UnauthorizedException('Super Admin privilege required');
      }
      return this.authService.enableMfa(user.id, dto, clientIp);
    }
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaDisableDto,
    @Req() req: Request,
  ) {
    const clientIp = extractClientIp(req);
    return this.authService.disableMfa(user.id, dto, clientIp);
  }

  @Post('mfa/recovery-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async regenerateRecoveryCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaRegenerateRecoveryCodesDto,
    @Req() req: Request,
  ) {
    const clientIp = extractClientIp(req);
    return this.authService.regenerateRecoveryCodes(user.id, dto, clientIp);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || dto?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.authService.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: LogoutDto,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || dto?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id, user.userType, user.schemaName || undefined);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const clientIp = extractClientIp(req);
    return this.passwordResetService.requestReset(dto.email, dto.portal ?? 'salon', clientIp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const clientIp = extractClientIp(req);
    return this.passwordResetService.resetPassword(dto.token, dto.password, clientIp);
  }
}
