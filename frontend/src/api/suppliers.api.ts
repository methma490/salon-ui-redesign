import api from '@/api/axios';
import type { PaginatedResponse } from '@/api/tenant.api';
import type {
  CreateGRNInput,
  CreateSupplierInput,
  CreateSupplierPaymentInput,
  GRN,
  OutstandingSummary,
  ReceiveGRNInput,
  Supplier,
  SupplierOutstandingItem,
  SupplierPayment,
  UpdateChequeStatusInput,
  UpdateGRNInput,
  UpdateSupplierInput,
} from '@/types/supplier.types';

export const suppliersApi = {
  // --- Suppliers ---
  async getSuppliers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    all?: boolean | string;
  }): Promise<PaginatedResponse<Supplier> | Supplier[]> {
    const res = await api.get('/tenant/suppliers', { params });
    return res.data;
  },

  async getSupplier(id: string): Promise<Supplier> {
    const res = await api.get(`/tenant/suppliers/${id}`);
    return res.data;
  },

  async createSupplier(data: CreateSupplierInput): Promise<Supplier> {
    const res = await api.post('/tenant/suppliers', data);
    return res.data;
  },

  async updateSupplier(id: string, data: UpdateSupplierInput): Promise<Supplier> {
    const res = await api.patch(`/tenant/suppliers/${id}`, data);
    return res.data;
  },

  async updateSupplierStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<{ id: string; status: string; isActive: boolean }> {
    const res = await api.patch(`/tenant/suppliers/${id}/status`, { status });
    return res.data;
  },

  async deleteSupplier(id: string): Promise<{ id: string; success: boolean }> {
    const res = await api.delete(`/tenant/suppliers/${id}`);
    return res.data;
  },

  // --- GRN / Purchases ---
  async getGrns(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    branchId?: string;
    grnStatus?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaginatedResponse<GRN>> {
    const res = await api.get('/tenant/grns', { params });
    return res.data;
  },

  async getGrn(id: string): Promise<GRN> {
    const res = await api.get(`/tenant/grns/${id}`);
    return res.data;
  },

  async createGrn(data: CreateGRNInput): Promise<{ id: string; grnNumber: string; grnStatus: string; totalAmount: number; paidAmount: number; outstandingAmount: number; paymentStatus: string }> {
    const res = await api.post('/tenant/grns', data);
    return res.data;
  },

  async updateGrn(id: string, data: UpdateGRNInput): Promise<{ id: string; success: boolean }> {
    const res = await api.patch(`/tenant/grns/${id}`, data);
    return res.data;
  },

  async receiveGrn(id: string, data?: ReceiveGRNInput): Promise<{ id: string; grnNumber: string; grnStatus: string; paidAmount: number; outstandingAmount: number; paymentStatus: string }> {
    const res = await api.post(`/tenant/grns/${id}/receive`, data ?? {});
    return res.data;
  },

  async cancelGrn(id: string, reason?: string): Promise<{ id: string; grnNumber: string; status: string }> {
    const res = await api.post(`/tenant/grns/${id}/cancel`, { reason });
    return res.data;
  },

  // --- Supplier Payments ---
  async getSupplierPayments(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    paymentMethod?: string;
    chequeStatus?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaginatedResponse<SupplierPayment>> {
    const res = await api.get('/tenant/supplier-payments', { params });
    return res.data;
  },

  async getSupplierPayment(id: string): Promise<SupplierPayment> {
    const res = await api.get(`/tenant/supplier-payments/${id}`);
    return res.data;
  },

  async createSupplierPayment(data: CreateSupplierPaymentInput): Promise<{ id: string; amount: number; paymentMethod: string; chequeStatus: string; allocatedCount: number }> {
    const res = await api.post('/tenant/supplier-payments', data);
    return res.data;
  },

  async updateChequeStatus(id: string, data: UpdateChequeStatusInput): Promise<{ id: string; status: string; clearedAt?: string }> {
    const res = await api.patch(`/tenant/supplier-payments/${id}/cheque-status`, data);
    return res.data;
  },

  // --- Supplier Outstanding ---
  async getSupplierOutstanding(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaginatedResponse<SupplierOutstandingItem>> {
    const res = await api.get('/tenant/supplier-outstanding', { params });
    return res.data;
  },

  async getOutstandingSummary(): Promise<OutstandingSummary> {
    const res = await api.get('/tenant/supplier-outstanding-summary');
    return res.data;
  },
};
