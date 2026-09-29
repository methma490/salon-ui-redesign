import { APP_NAME_FALLBACK } from '../../config/brand.constants';

/**
 * Always use the registered tenant salon name for customer-facing quotation branding.
 * Never fall back to the SaaS platform product name.
 */
export function resolveQuotationSalonBrand(
  registeredSalonName: string | null | undefined,
  platformName = APP_NAME_FALLBACK,
): string {
  const name = (registeredSalonName ?? '').trim();
  if (!name) {
    throw new Error('Registered salon name is required for quotations');
  }
  // Intentionally do not substitute platformName when name is missing beyond the throw above.
  void platformName;
  return name;
}

export function buildWhatsAppQuotationMessage(input: {
  customerName: string;
  quotationNo: string;
  salonName: string;
  totalAmount: number;
  publicUrl: string;
  currencyLabel?: string;
}): string {
  const salonName = resolveQuotationSalonBrand(input.salonName);
  const firstName = input.customerName.split(/\s+/)[0] || input.customerName;
  const currency = input.currencyLabel ?? 'LKR';
  return (
    `Hi ${firstName},\n\n` +
    `Your quotation ${input.quotationNo} from ${salonName} is ready.\n\n` +
    `Total: ${currency} ${Number(input.totalAmount).toLocaleString()}\n\n` +
    `View your quotation:\n${input.publicUrl}\n\n` +
    `Thank you,\n${salonName}`
  );
}

export function buildSmsQuotationMessage(input: {
  quotationNo: string;
  salonName: string;
  totalAmount: number;
  publicUrl: string;
  currencyLabel?: string;
}): string {
  const salonName = resolveQuotationSalonBrand(input.salonName);
  const currency = input.currencyLabel ?? 'LKR';
  return `${salonName}: Your quotation ${input.quotationNo} is ready. Total ${currency} ${Number(input.totalAmount).toLocaleString()}. View: ${input.publicUrl}`;
}

export function buildSmsQuotationCancelledMessage(input: {
  quotationNo: string;
  salonName: string;
  reason?: string | null;
}): string {
  const salonName = resolveQuotationSalonBrand(input.salonName);
  const reasonText = input.reason ? ` Reason: ${input.reason}.` : '';
  return `${salonName}: Your quotation ${input.quotationNo} has been cancelled.${reasonText}`;
}

export function buildWhatsAppQuotationCancelledMessage(input: {
  customerName: string;
  quotationNo: string;
  salonName: string;
  reason?: string | null;
}): string {
  const salonName = resolveQuotationSalonBrand(input.salonName);
  const firstName = input.customerName.split(/\s+/)[0] || input.customerName;
  const reasonText = input.reason ? `\nReason: ${input.reason}` : '';
  return (
    `Hi ${firstName},\n\n` +
    `Your quotation ${input.quotationNo} from ${salonName} has been cancelled.${reasonText}\n\n` +
    `Thank you,\n${salonName}`
  );
}

/** Shape public quotation payload — never include internal notes or tenant schema. */
export function toPublicQuotationView(input: {
  quotationNo: string;
  quotationDate: string;
  validUntil: string | null;
  customerName: string;
  customerNotes: string | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  canRespond: boolean;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  salon: {
    name: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  platformName?: string;
}) {
  const salonName = resolveQuotationSalonBrand(input.salon.name);
  return {
    quotationNo: input.quotationNo,
    quotationDate: input.quotationDate,
    validUntil: input.validUntil,
    customerName: input.customerName,
    customerNotes: input.customerNotes,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount,
    totalAmount: input.totalAmount,
    status: input.status,
    canRespond: input.canRespond,
    cancelReason: input.cancelReason ?? null,
    cancelledAt: input.cancelledAt ?? null,
    items: input.items,
    salon: {
      name: salonName,
      phone: input.salon.phone,
      email: input.salon.email,
      logoUrl: input.salon.logoUrl,
      primaryColor: input.salon.primaryColor,
    },
    platformAttribution: `Powered by ${input.platformName ?? APP_NAME_FALLBACK}`,
  };
}

export function messageUsesPlatformAsPrimaryBrand(
  message: string,
  salonName: string,
  platformName = APP_NAME_FALLBACK,
): boolean {
  const brand = resolveQuotationSalonBrand(salonName, platformName);
  if (brand === platformName) {
    // Registered salon name happens to equal platform name — not a leakage.
    return false;
  }
  const lower = message.toLowerCase();
  const platformLower = platformName.toLowerCase();
  // Primary brand patterns that must use salon name, not platform
  if (lower.includes(`from ${platformLower}`)) return true;
  if (lower.startsWith(`${platformLower}:`)) return true;
  return false;
}
