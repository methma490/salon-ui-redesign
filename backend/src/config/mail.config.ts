import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  from: process.env.MAIL_FROM ?? 'Salon360 <noreply@salon360.local>',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  devLogResetLink: process.env.PASSWORD_RESET_DEV_LOG !== 'false',
}));
