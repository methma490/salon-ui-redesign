export type GRNStatus = 'DRAFT' | 'RECEIVED' | 'CANCELLED';
export type GRNPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type SupplierPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
export type GRNPaymentOption = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
export type ChequeStatus = 'PENDING' | 'CLEARED' | 'BOUNCED';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  totalPurchases: number;
  totalPaid: number;
  currentOutstanding: number;
  grnsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GRNItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface GRNItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface GRNPaymentAllocation {
  id: string;
  allocatedAmount: number;
  createdAt: string;
  paymentId: string;
  paymentDate: string;
  paymentTotalAmount: number;
  paymentMethod: SupplierPaymentMethod;
  referenceNumber: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeStatus: ChequeStatus;
  clearedAt: string | null;
}

export interface GRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  branchId: string;
  branchName: string;
  supplierInvoiceNumber: string | null;
  grnDate: string;
  dueDate: string | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: GRNPaymentStatus;
  grnStatus: GRNStatus;
  notes: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount?: number;
  items?: GRNItem[];
  allocations?: GRNPaymentAllocation[];
}

export interface SupplierPaymentAllocationItem {
  id: string;
  allocatedAmount: number;
  grnId: string;
  grnNumber: string;
  supplierInvoiceNumber: string | null;
  grnDate: string;
  grnTotalAmount: number;
  grnPaidAmount: number;
  grnOutstandingAmount: number;
  grnPaymentStatus: GRNPaymentStatus;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  referenceNumber: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  chequeStatus: ChequeStatus;
  clearedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  allocatedTotal?: number;
  allocatedGrnNumbers?: string[];
  allocations?: SupplierPaymentAllocationItem[];
}

export interface SupplierOutstandingItem {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string | null;
  supplierEmail: string | null;
  branchId: string;
  branchName: string;
  supplierInvoiceNumber: string | null;
  grnDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: GRNPaymentStatus;
  daysOverdue: number;
}

export interface OutstandingSummary {
  totalOutstanding: number;
  totalUnpaid: number;
  totalPartiallyPaid: number;
  totalFullyPaid: number;
  suppliersWithOutstandingCount: number;
  openGrnsCount: number;
}

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateGRNInput {
  supplierId: string;
  branchId: string;
  supplierInvoiceNumber?: string;
  grnDate?: string;
  dueDate?: string;
  notes?: string;
  items: GRNItemInput[];
  discountAmount?: number;
  status?: 'DRAFT' | 'RECEIVED';
  paymentMethod?: GRNPaymentOption;
  paidAmount?: number;
  bankName?: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
}

export interface UpdateGRNInput {
  supplierId?: string;
  branchId?: string;
  supplierInvoiceNumber?: string;
  grnDate?: string;
  dueDate?: string;
  notes?: string;
  items?: GRNItemInput[];
  discountAmount?: number;
}

export interface ReceiveGRNInput {
  paymentMethod?: GRNPaymentOption;
  paidAmount?: number;
  bankName?: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  notes?: string;
}

export interface CreateSupplierPaymentInput {
  supplierId: string;
  paymentDate?: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  referenceNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  notes?: string;
  allocations?: Array<{ grnId: string; allocatedAmount: number }>;
}

export interface UpdateChequeStatusInput {
  status: 'CLEARED' | 'BOUNCED';
  clearedAt?: string;
  notes?: string;
}
