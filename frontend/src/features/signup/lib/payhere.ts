import type { PayHereCheckout } from '@/features/signup/api/signup.api';

const PAYHERE_CHECKOUT_FIELDS: Array<keyof Omit<PayHereCheckout, 'sandbox'>> = [
  'merchant_id',
  'return_url',
  'cancel_url',
  'notify_url',
  'order_id',
  'items',
  'amount',
  'currency',
  'hash',
  'first_name',
  'last_name',
  'email',
  'phone',
  'address',
  'city',
  'country',
];

function formatPayHereAmount(amount: string | number): string {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (Number.isNaN(num)) {
    return String(amount);
  }
  return num.toFixed(2);
}

/**
 * Redirect to PayHere hosted checkout via form POST (official integration method).
 * More reliable than the payhere.js SDK which can fail to load in SPAs.
 */
export function redirectToPayHereCheckout(checkout: PayHereCheckout): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.sandbox
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout';

  for (const key of PAYHERE_CHECKOUT_FIELDS) {
    const raw = checkout[key];
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = key === 'amount' ? formatPayHereAmount(raw) : String(raw);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (err && typeof err === 'object' && 'response' in err) {
    const resData = (err as { response?: { data?: { message?: string | string[]; code?: string } } }).response?.data;
    if (resData?.code === 'EMAIL_ALREADY_IN_USE') {
      return 'This email is already in use.';
    }
    const data = resData?.message;
    if (Array.isArray(data)) {
      return data.join(', ');
    }
    if (data) {
      return String(data);
    }
  }

  return fallback;
}
