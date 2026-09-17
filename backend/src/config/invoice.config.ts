import { registerAs } from '@nestjs/config';

export default registerAs('invoice', () => ({
  issuerName: process.env.INVOICE_ISSUER_NAME ?? 'Dart Smart Salon',
  issuerEmail: process.env.INVOICE_ISSUER_EMAIL ?? 'billing@dartsmartsalon.local',
  issuerAddress: process.env.INVOICE_ISSUER_ADDRESS ?? 'Colombo, Sri Lanka',
}));
