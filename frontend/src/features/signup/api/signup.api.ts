import api from '@/api/axios';

export interface SignupPayload {
  planId: string;
  salon: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  admin: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };
}

export interface PayHereCheckout {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface SignupCheckoutResponse {
  orderId: string;
  tenantId: string;
  subscriptionId: string;
  adminEmail: string;
  plan: {
    id: string;
    code: string;
    name: string;
    price: number;
    currency: string;
  };
  checkout: PayHereCheckout;
}

export interface SignupOrderStatus {
  orderId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  salonName: string;
  adminEmail: string;
  tenantStatus?: string;
  awaitingActivation?: boolean;
  canLogin: boolean;
  loginUrl: string;
  plan: { code: string; name: string };
  subscription: { status: string; startDate: string | null; endDate: string | null };
}

export const signupApi = {
  checkout: (payload: SignupPayload) =>
    api.post<SignupCheckoutResponse>('/public/signup', payload).then((r) => r.data),
  getStatus: (orderId: string) =>
    api.get<SignupOrderStatus>(`/public/signup/orders/${orderId}/status`).then((r) => r.data),
  confirmReturn: (orderId: string) =>
    api
      .post<{ success: boolean; adminEmail?: string }>(
        `/public/signup/orders/${orderId}/confirm-return`,
      )
      .then((r) => r.data),
  cancel: (orderId: string) =>
    api.post<{ success: boolean }>(`/public/signup/orders/${orderId}/cancel`).then((r) => r.data),
};
