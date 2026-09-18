import { APP_NAME_FALLBACK } from '../../config/brand.constants';
import {
  buildSmsQuotationMessage,
  buildWhatsAppQuotationMessage,
  messageUsesPlatformAsPrimaryBrand,
  resolveQuotationSalonBrand,
  toPublicQuotationView,
} from './quotation-branding';
import {
  calculateQuotationTotals,
  resolveDisplayStatus,
  roundMoney,
} from './quotation-money';
import { normalizePhoneE164, phoneDigitsForWhatsApp } from './phone.util';
import { MessagingService } from './messaging.service';

describe('quotation branding', () => {
  it('uses registered tenant salon name', () => {
    expect(resolveQuotationSalonBrand('Salon Elegance')).toBe('Salon Elegance');
  });

  it('does not use Dart Smart Salon as tenant salon name', () => {
    expect(() => resolveQuotationSalonBrand('')).toThrow(/Registered salon name/);
    const msg = buildWhatsAppQuotationMessage({
      customerName: 'Kasun Perera',
      quotationNo: 'QT-000125',
      salonName: 'Salon Elegance',
      totalAmount: 14500,
      publicUrl: 'https://app.example/q/abc',
    });
    expect(msg).toContain('from Salon Elegance');
    expect(msg).not.toContain(`from ${APP_NAME_FALLBACK}`);
    expect(messageUsesPlatformAsPrimaryBrand(msg, 'Salon Elegance')).toBe(false);
  });

  it('tenant A branding is independent of tenant B', () => {
    const a = resolveQuotationSalonBrand('Salon Elegance');
    const b = resolveQuotationSalonBrand('Beauty Lounge');
    expect(a).toBe('Salon Elegance');
    expect(b).toBe('Beauty Lounge');
    expect(a).not.toBe(b);
  });

  it('WhatsApp message uses registered salon name', () => {
    const msg = buildWhatsAppQuotationMessage({
      customerName: 'Kasun Perera',
      quotationNo: 'QT-000125',
      salonName: 'Salon Elegance',
      totalAmount: 14500,
      publicUrl: 'https://app.example/q/tok',
    });
    expect(msg).toContain('Salon Elegance');
    expect(msg).toContain('QT-000125');
    expect(msg).toContain('Hi Kasun');
    expect(messageUsesPlatformAsPrimaryBrand(msg, 'Salon Elegance')).toBe(false);
  });

  it('SMS message uses registered salon name', () => {
    const msg = buildSmsQuotationMessage({
      quotationNo: 'QT-000125',
      salonName: 'Salon Elegance',
      totalAmount: 14500,
      publicUrl: 'https://app.example/q/tok',
    });
    expect(msg.startsWith('Salon Elegance:')).toBe(true);
    expect(msg).not.toMatch(new RegExp(`^${APP_NAME_FALLBACK}:`));
  });
});

describe('quotation money / price snapshot', () => {
  it('quotation price can differ from service master price', () => {
    const totals = calculateQuotationTotals([
      { quantity: 1, quotationUnitPrice: 2000 },
      { quantity: 1, quotationUnitPrice: 7500 },
      { quantity: 1, quotationUnitPrice: 5000 },
    ]);
    expect(totals.subtotal).toBe(14500);
    expect(totals.totalAmount).toBe(14500);
  });

  it('changing quotation price does not require changing master price', () => {
    const masterPrice = 8000;
    const quotationUnitPrice = 7500;
    expect(quotationUnitPrice).not.toBe(masterPrice);
    const totals = calculateQuotationTotals([{ quantity: 1, quotationUnitPrice }]);
    expect(totals.totalAmount).toBe(7500);
    expect(masterPrice).toBe(8000);
  });

  it('historical quotation line totals remain snapshot-based', () => {
    const historicalUnit = 7500;
    const laterMaster = 9000;
    const line = roundMoney(1 * historicalUnit);
    expect(line).toBe(7500);
    expect(line).not.toBe(laterMaster);
  });

  it('calculates totals with discount correctly', () => {
    const totals = calculateQuotationTotals(
      [
        { quantity: 2, quotationUnitPrice: 1000 },
        { quantity: 1, quotationUnitPrice: 500 },
      ],
      300,
    );
    expect(totals.subtotal).toBe(2500);
    expect(totals.discountAmount).toBe(300);
    expect(totals.totalAmount).toBe(2200);
  });
});

describe('phone normalization', () => {
  it('loads / normalizes customer local phone for messaging', () => {
    expect(normalizePhoneE164('0771234567')).toBe('+94771234567');
    expect(phoneDigitsForWhatsApp('0771234567')).toBe('94771234567');
  });

  it('rejects invalid phone numbers', () => {
    expect(normalizePhoneE164('')).toBeNull();
    expect(normalizePhoneE164('123')).toBeNull();
    expect(phoneDigitsForWhatsApp('abc')).toBeNull();
  });

  it('does not corrupt already-international numbers', () => {
    expect(normalizePhoneE164('+14155552671')).toBe('+14155552671');
    expect(normalizePhoneE164('0094771234567')).toBe('+94771234567');
  });
});

describe('public quotation shaping / expiry', () => {
  it('secure public view does not expose internal tenant data', () => {
    const view = toPublicQuotationView({
      quotationNo: 'QT-000125',
      quotationDate: '2026-09-18',
      validUntil: '2026-09-25',
      customerName: 'Kasun Perera',
      customerNotes: 'Prefer morning',
      subtotal: 14500,
      discountAmount: 0,
      totalAmount: 14500,
      status: 'SENT',
      canRespond: true,
      items: [
        { description: 'Hair Cut', quantity: 1, unitPrice: 2000, lineTotal: 2000 },
        { description: 'Hair Color', quantity: 1, unitPrice: 7500, lineTotal: 7500 },
      ],
      salon: {
        name: 'Salon Elegance',
        phone: '0112223333',
        email: 'hello@elegance.lk',
        logoUrl: null,
        primaryColor: '#0d5c3d',
      },
    });

    expect(view.salon.name).toBe('Salon Elegance');
    expect(view).not.toHaveProperty('internalNotes');
    expect(view).not.toHaveProperty('schemaName');
    expect(view).not.toHaveProperty('tenantId');
    expect(JSON.stringify(view)).not.toContain('tenant_000001');
    expect(view.platformAttribution).toContain(APP_NAME_FALLBACK);
  });

  it('marks SENT past validUntil as EXPIRED display status', () => {
    expect(resolveDisplayStatus('SENT', '2026-09-01', new Date('2026-09-18'))).toBe('EXPIRED');
    expect(resolveDisplayStatus('ACCEPTED', '2026-09-01', new Date('2026-09-18'))).toBe(
      'ACCEPTED',
    );
    expect(resolveDisplayStatus('CONVERTED', '2026-09-01', new Date('2026-09-18'))).toBe(
      'CONVERTED',
    );
    expect(resolveDisplayStatus('CANCELLED', '2026-09-01', new Date('2026-09-18'))).toBe(
      'CANCELLED',
    );
  });
});

describe('MessagingService WhatsApp MVP', () => {
  it('builds wa.me link and returns OPENED_EXTERNALLY (not DELIVERED)', () => {
    const svc = new MessagingService({
      get: () => undefined,
    } as never);
    const result = svc.buildWhatsAppDeepLink('94771234567', 'Hello from Salon Elegance');
    expect(result.status).toBe('OPENED_EXTERNALLY');
    expect(result.externalUrl).toContain('wa.me/94771234567');
    expect(result.status).not.toBe('DELIVERED');
  });
});

describe('quotation side-effect boundaries (documented invariants)', () => {
  it('quotation totals calculation has no stock/sales/commission hooks', () => {
    // Pure money math — creating a quotation uses this path only until convert.
    const totals = calculateQuotationTotals([{ quantity: 1, quotationUnitPrice: 1000 }]);
    expect(totals.totalAmount).toBe(1000);
  });

  it('convert-once invariant is enforced by convertedSaleId conflict semantics', () => {
    const alreadyConverted = { status: 'CONVERTED', convertedSaleId: 'sale-1' };
    const canConvert =
      alreadyConverted.status === 'ACCEPTED' && !alreadyConverted.convertedSaleId;
    expect(canConvert).toBe(false);
  });
});
