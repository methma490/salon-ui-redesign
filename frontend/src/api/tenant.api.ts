import api from '@/api/axios';

// --- Branches ---
export interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isMain: boolean;
  status: string;
}

// --- Employees ---
export interface Employee {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  branchId: string;
  branchName: string;
  userId: string | null;
  status: string;
}

// --- Customers ---
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

// --- Services ---
export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
}

// --- Products ---
export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  sellingPrice: number;
  costPrice: number;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
}

export interface StockLevel {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
}

// --- Sales ---
export interface SaleListItem {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
}

export interface DashboardData {
  todaySales: { total: number; count: number };
  monthlySales: { total: number; count: number };
  totalCustomers: number;
  lowStockProducts: Array<{
    branchId: string;
    productId: string;
    productName: string;
    quantity: number;
  }>;
  topServices: Array<{ id: string; name: string; saleCount: number; revenue: number }>;
}

export const tenantApi = {
  features: () => api.get<string[]>('/tenant/features').then((r) => r.data),

  branches: {
    list: () => api.get<Branch[]>('/tenant/branches').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Branch>('/tenant/branches', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Branch>(`/tenant/branches/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Branch>(`/tenant/branches/${id}/status`, { status }).then((r) => r.data),
  },

  employees: {
    list: (params?: Record<string, string>) =>
      api.get<Employee[]>('/tenant/employees', { params }).then((r) => r.data),
    get: (id: string) => api.get<Employee>(`/tenant/employees/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Employee>('/tenant/employees', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Employee>(`/tenant/employees/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Employee>(`/tenant/employees/${id}/status`, { status }).then((r) => r.data),
  },

  customers: {
    list: (params?: Record<string, string>) =>
      api.get<Customer[]>('/tenant/customers', { params }).then((r) => r.data),
    search: (params?: Record<string, string>) =>
      api.get<Customer[]>('/tenant/customers/search', { params }).then((r) => r.data),
    get: (id: string) => api.get<Customer>(`/tenant/customers/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Customer>('/tenant/customers', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Customer>(`/tenant/customers/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Customer>(`/tenant/customers/${id}/status`, { status }).then((r) => r.data),
  },

  serviceCategories: {
    list: () => api.get<ServiceCategory[]>('/tenant/service-categories').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/service-categories', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/service-categories/${id}`, data).then((r) => r.data),
  },

  services: {
    list: (categoryId?: string) =>
      api.get<Service[]>('/tenant/services', { params: { categoryId } }).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/services', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/services/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch(`/tenant/services/${id}/status`, { status }).then((r) => r.data),
  },

  productCategories: {
    list: () => api.get<ProductCategory[]>('/tenant/product-categories').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/product-categories', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/product-categories/${id}`, data).then((r) => r.data),
  },

  products: {
    list: (categoryId?: string) =>
      api.get<Product[]>('/tenant/products', { params: { categoryId } }).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/products', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/products/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch(`/tenant/products/${id}/status`, { status }).then((r) => r.data),
  },

  stock: {
    list: (branchId?: string) =>
      api.get<StockLevel[]>('/tenant/stock', { params: { branchId } }).then((r) => r.data),
    stockIn: (data: Record<string, unknown>) =>
      api.post('/tenant/stock/in', data).then((r) => r.data),
    adjustment: (data: Record<string, unknown>) =>
      api.post('/tenant/stock/adjustment', data).then((r) => r.data),
    movements: (params?: Record<string, string>) =>
      api.get<StockMovement[]>('/tenant/stock/movements', { params }).then((r) => r.data),
  },

  pos: {
    createSale: (data: Record<string, unknown>) =>
      api.post('/tenant/pos/sales', data).then((r) => r.data),
  },

  sales: {
    list: (params?: Record<string, string>) =>
      api.get<SaleListItem[]>('/tenant/sales', { params }).then((r) => r.data),
    get: (id: string) => api.get(`/tenant/sales/${id}`).then((r) => r.data),
  },

  dashboard: {
    get: (branchId?: string) =>
      api.get<DashboardData>('/tenant/dashboard', { params: { branchId } }).then((r) => r.data),
  },

  reports: {
    dailySales: (params: Record<string, string>) =>
      api.get('/tenant/reports/daily-sales', { params }).then((r) => r.data),
    branchSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/branch-sales', { params }).then((r) => r.data),
    serviceSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/service-sales', { params }).then((r) => r.data),
    productSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/product-sales', { params }).then((r) => r.data),
    employeePerformance: (params: Record<string, string>) =>
      api.get('/tenant/reports/employee-performance', { params }).then((r) => r.data),
    lowStock: (params?: Record<string, string>) =>
      api.get('/tenant/reports/low-stock', { params }).then((r) => r.data),
  },
};
