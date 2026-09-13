import { registerAs } from '@nestjs/config';

export default registerAs('invoice', () => ({
  issuerName: process.env.INVOICE_ISSUER_NAME ?? 'Salon360',
  issuerEmail: process.env.INVOICE_ISSUER_EMAIL ?? 'billing@salon360.local',
  issuerAddress: process.env.INVOICE_ISSUER_ADDRESS ?? 'Colombo, Sri Lanka',
}));
