import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { tenantApi, type Customer, type CustomerBookingHistoryItem } from '@/api/tenant.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { formatMoneyAmount } from '@/lib/money';
import { FormError, getErrorMessage } from './salon-ops-ui';
import './employees-page.css';

const PHONE_REGEX = /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}$/;

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '');
  return clean.length >= 9 && clean.length <= 15 && PHONE_REGEX.test(phone.trim());
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  birthMonth: string;
  birthYear: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  birthDate: '',
  birthMonth: '',
  birthYear: '',
  notes: '',
};

function toCustomerPayload(form: CustomerForm) {
  const payload: Record<string, string> = {
    name: form.name.trim(),
    phone: form.phone.trim(),
  };
  const email = form.email.trim();
  const notes = form.notes.trim();
  if (email) payload.email = email;
  if (notes) payload.notes = notes;

  if (form.birthYear && form.birthMonth && form.birthDate) {
    const yyyy = form.birthYear.trim().padStart(4, '2000');
    const mm = form.birthMonth.trim().padStart(2, '01');
    const dd = form.birthDate.trim().padStart(2, '01');
    payload.birthday = `${yyyy}-${mm}-${dd}`;
  }
  return payload;
}

function customerToForm(cust: Customer): CustomerForm {
  let birthDate = '';
  let birthMonth = '';
  let birthYear = '';
  if (cust.birthday) {
    const raw = cust.birthday.slice(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3) {
      birthYear = parts[0];
      birthMonth = parts[1];
      birthDate = parts[2];
    }
  }
  return {
    name: cust.name || '',
    phone: cust.phone || '',
    email: cust.email || '',
    birthDate,
    birthMonth,
    birthYear,
    notes: cust.notes || '',
  };
}

function CustomerDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  form,
  setForm,
  onSubmit,
  isPending,
  formError,
  phoneError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  form: CustomerForm;
  setForm: (f: CustomerForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  formError?: string | null;
  phoneError?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500 font-normal">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <FormError message={formError || null} />

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-name" className="text-xs sm:text-sm font-semibold text-slate-800">
              Full name <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
                required
                className="h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,#0d5c3d)] focus-visible:border-[var(--brand-primary,#0d5c3d)]"
              />
            </div>
          </div>

          {/* Phone & Email in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label
                htmlFor="cust-phone"
                className="text-xs sm:text-sm font-semibold text-slate-800"
              >
                Phone <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="cust-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0771234567"
                  required
                  className="h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,#0d5c3d)] focus-visible:border-[var(--brand-primary,#0d5c3d)]"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-rose-500 font-medium mt-1 leading-tight">
                  {phoneError}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="cust-email"
                className="text-xs sm:text-sm font-semibold text-slate-800"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="cust-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Optional"
                  className="h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,#0d5c3d)] focus-visible:border-[var(--brand-primary,#0d5c3d)]"
                />
              </div>
            </div>
          </div>

          {/* Birthday with Date, Month, Year */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-semibold text-slate-800">Birthday</Label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {/* Date */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-600 block">Date</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={form.birthDate}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setForm({ ...form, birthDate: val });
                    }}
                    placeholder="DD"
                    maxLength={2}
                    className="h-11 pl-8 sm:pl-9 pr-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,#0d5c3d)] focus-visible:border-[var(--brand-primary,#0d5c3d)]"
                  />
                </div>
              </div>

              {/* Month */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-600 block">Month</span>
                <Select
                  value={form.birthMonth || undefined}
                  onValueChange={(val) => setForm({ ...form, birthMonth: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs sm:text-sm">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-600 block">Year</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={form.birthYear}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setForm({ ...form, birthYear: val });
                    }}
                    placeholder="YYYY"
                    maxLength={4}
                    className="h-11 pl-8 sm:pl-9 pr-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,#0d5c3d)] focus-visible:border-[var(--brand-primary,#0d5c3d)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-notes" className="text-xs sm:text-sm font-semibold text-slate-800">
              Notes
            </Label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <textarea
                id="cust-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
                rows={3}
                className="w-full min-h-[84px] pl-10 pr-3.5 pt-2.5 pb-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)] transition-colors"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerBookingHistoryDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['customer-booking-history', customer?.id],
    queryFn: () => (customer ? tenantApi.customers.bookingHistory(customer.id) : Promise.resolve([])),
    enabled: open && !!customer,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--brand-primary,#0d5c3d)]" />
            <span>Booking History — {customer?.name}</span>
            <span className="text-xs font-mono font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {customer?.code}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            <span className="ml-2 text-sm text-slate-500">Loading booking records...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No booking history</p>
            <p className="text-xs text-slate-400 mt-0.5">
              This customer hasn&apos;t completed any appointments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              Total {history.length} appointment{history.length === 1 ? '' : 's'} recorded
            </p>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {history.map((item: CustomerBookingHistoryItem) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {item.code}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.appointmentDate}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({item.startTime?.slice(0, 5)} - {item.endTime?.slice(0, 5)})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Branch: {item.branchName}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'CONFIRMED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        {formatMoneyAmount(item.totalPrice)}
                      </div>
                    </div>
                  </div>

                  {item.services && item.services.length > 0 && (
                    <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg">
                      <p className="text-[11px] font-semibold text-slate-600 mb-1">Booked Services:</p>
                      <div className="grid gap-1">
                        {item.services.map((svc) => (
                          <div
                            key={svc.id}
                            className="flex items-center justify-between text-xs text-slate-700"
                          >
                            <span>
                              {svc.name}{' '}
                              {svc.durationMinutes ? (
                                <span className="text-[11px] text-slate-400">
                                  ({svc.durationMinutes} min)
                                </span>
                              ) : null}
                            </span>
                            <span className="font-medium text-slate-900">
                              {formatMoneyAmount(svc.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-100 pt-1.5">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'C';
  return (
    <div className="h-9 w-9 rounded-full bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] border border-[var(--brand-border,#bbf7d0)] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
      {initial}
    </div>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(search, 400, 2);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editForm, setEditForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    return Object.keys(params).length ? params : undefined;
  }, [debouncedSearch, statusFilter]);

  const {
    data: customers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers', debouncedSearch, statusFilter],
    queryFn: () => tenantApi.customers.list(listParams),
    placeholderData: (previousData) => previousData,
  });

  const totalItems = customers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, page, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all';

  const createMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm(emptyForm);
      setFormError(null);
      setPhoneError(null);
      setCreateOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Customer Added',
        text: 'Customer has been created successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err);
      if (err?.response?.status === 409 || msg?.toLowerCase().includes('already exists')) {
        setPhoneError('A customer with this mobile number already exists (even with different prefixes 0 / +94 / 77).');
        setFormError('A customer with this mobile number already exists.');
      } else {
        setFormError(msg);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.customers.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditCustomer(null);
      setFormError(null);
      setPhoneError(null);
      Swal.fire({
        icon: 'success',
        title: 'Customer Updated',
        text: 'Customer details updated successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err);
      if (err?.response?.status === 409 || msg?.toLowerCase().includes('already exists')) {
        setPhoneError('A customer with this mobile number already exists (even with different prefixes 0 / +94 / 77).');
        setFormError('A customer with this mobile number already exists.');
      } else {
        setFormError(msg);
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.customers.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      Swal.fire({
        icon: 'success',
        title: variables.status === 'ACTIVE' ? 'Customer Activated' : 'Customer Deactivated',
        text:
          variables.status === 'ACTIVE'
            ? 'The customer is now active.'
            : 'The customer has been deactivated.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Status Update Failed',
        text: getErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.customers.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      Swal.fire({
        icon: 'success',
        title: 'Customer Deleted',
        text: 'Customer profile has been removed successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete Customer',
        text: getErrorMessage(err),
      });
    },
  });

  const handleToggleStatus = (cust: Customer) => {
    const nextStatus = cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Swal.fire({
      title: nextStatus === 'INACTIVE' ? 'Deactivate Customer?' : 'Activate Customer?',
      text: `Are you sure you want to ${nextStatus === 'INACTIVE' ? 'deactivate' : 'activate'} ${cust.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'INACTIVE' ? '#dc2626' : 'var(--brand-primary, #0d5c3d)',
      cancelButtonColor: '#6b7280',
      confirmButtonText: nextStatus === 'INACTIVE' ? 'Yes, deactivate' : 'Yes, activate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((res) => {
      if (res.isConfirmed) {
        statusMutation.mutate({ id: cust.id, status: nextStatus });
      }
    });
  };

  const handleDeleteCustomer = (cust: Customer) => {
    Swal.fire({
      title: 'Delete Customer?',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 15px; color: #475569; margin: 0 0 8px;">
            Are you sure you want to delete <strong>${cust.name}</strong> (${cust.code})?
          </p>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            This action cannot be undone. Customers with active appointments or sales records cannot be deleted.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(cust.id);
      }
    });
  };

  const openEdit = (cust: Customer) => {
    setFormError(null);
    setPhoneError(null);
    setEditCustomer(cust);
    setEditForm(customerToForm(cust));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPhoneError(null);

    if (!isValidPhone(form.phone)) {
      setPhoneError('Please enter a valid mobile number (e.g. 0771234567, +94771234567)');
      return;
    }

    createMutation.mutate(toCustomerPayload(form));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setFormError(null);
    setPhoneError(null);

    if (!isValidPhone(editForm.phone)) {
      setPhoneError('Please enter a valid mobile number (e.g. 0771234567, +94771234567)');
      return;
    }

    updateMutation.mutate({ id: editCustomer.id, data: toCustomerPayload(editForm) });
  };

  const isInitialLoading = isLoading && !customers.length && !debouncedSearch;

  if (isInitialLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError && !customers.length) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <h3 className="font-bold text-lg">Could not load customers</h3>
          <p className="mt-1 text-sm">{getErrorMessage(error)}</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-[var(--brand-primary,#0d5c3d)] text-white rounded-lg font-medium text-sm hover:bg-[var(--brand-hover,#0a4a31)] transition-colors"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Top Header without any unnecessary summary cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer profiles, contact info, and booking histories
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setPhoneError(null);
            setForm(emptyForm);
            setCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-[var(--brand-foreground,#ffffff)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter Toolbar with Search and Status Filter */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
            {isFetching && debouncedSearch ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            )}
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as 'all' | 'ACTIVE' | 'INACTIVE');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="ACTIVE">Active only</SelectItem>
                <SelectItem value="INACTIVE">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Customers List / Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {totalItems === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No customers found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search or status filter to find what you are looking for.'
                : 'Get started by adding your first customer.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CUSTOMER</th>
                    <th className="py-3 px-3">CODE</th>
                    <th className="py-3 px-3">MOBILE PHONE</th>
                    <th className="py-3 px-3">EMAIL</th>
                    <th className="py-3 px-3">BIRTHDAY</th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCustomers.map((cust) => {
                    const isActive = cust.status === 'ACTIVE';
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Avatar & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <CustomerAvatar name={cust.name} />
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {cust.name}
                              </div>
                              {cust.notes && (
                                <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                                  {cust.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="py-3.5 px-3 font-mono text-xs font-semibold text-slate-600">
                          {cust.code}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-3 font-medium text-slate-900 font-mono">
                          {cust.phone || '—'}
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-3 text-slate-600">
                          {cust.email || '—'}
                        </td>

                        {/* Birthday */}
                        <td className="py-3.5 px-3 text-slate-600">
                          {cust.birthday ? cust.birthday.slice(0, 10) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Booking History */}
                            <button
                              type="button"
                              onClick={() => setHistoryCustomer(cust)}
                              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="View Booking History"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span>History</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openEdit(cust)}
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Customer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Toggle Status */}
                            <button
                              type="button"
                              disabled={statusMutation.isPending}
                              onClick={() => handleToggleStatus(cust)}
                              className="h-8 w-8 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                              title={isActive ? 'Deactivate Customer' : 'Activate Customer'}
                            >
                              <span className="text-xs font-bold">{isActive ? 'Off' : 'On'}</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDeleteCustomer(cust)}
                              className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedCustomers.map((cust) => {
                const isActive = cust.status === 'ACTIVE';
                return (
                  <div key={cust.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CustomerAvatar name={cust.name} />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {cust.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {cust.code}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Phone
                        </span>
                        <span className="font-semibold text-slate-900 font-mono">{cust.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Birthday
                        </span>
                        <span className="text-slate-700">{cust.birthday ? cust.birthday.slice(0, 10) : '—'}</span>
                      </div>
                      {cust.email && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Email
                          </span>
                          <span className="text-slate-700 break-all block">{cust.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setHistoryCustomer(cust)}
                        className="h-8 px-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="View History"
                      >
                        <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">History</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(cust)}
                        className="h-8 px-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Edit Customer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() => handleToggleStatus(cust)}
                        className="h-8 px-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center transition-colors"
                        title={isActive ? 'Deactivate Customer' : 'Activate Customer'}
                      >
                        <span className="truncate">{isActive ? 'Deactivate' : 'Activate'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeleteCustomer(cust)}
                        className="h-8 px-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-white">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * pageSize, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalItems}</span> customers
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                          <button
                            type="button"
                            onClick={() => setPage(p)}
                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                              page === p
                                ? 'border border-[var(--brand-primary,#0d5c3d)] text-[var(--brand-primary,#0d5c3d)] bg-[var(--brand-soft,#f0fdf4)]'
                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Customer Dialog */}
      <CustomerDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormError(null);
            setPhoneError(null);
          }
          setCreateOpen(open);
        }}
        title="Create Customer"
        description="Add a new customer to your salon records."
        submitLabel="Create Customer"
        form={form}
        setForm={setForm}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
        formError={formError}
        phoneError={phoneError}
      />

      {/* Edit Customer Dialog */}
      <CustomerDialog
        open={editCustomer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCustomer(null);
            setFormError(null);
            setPhoneError(null);
          }
        }}
        title="Edit Customer"
        description="Update customer details in your salon records."
        submitLabel="Save Changes"
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleEditSubmit}
        isPending={updateMutation.isPending}
        formError={formError}
        phoneError={phoneError}
      />

      {/* Customer Booking History Dialog */}
      <CustomerBookingHistoryDialog
        customer={historyCustomer}
        open={historyCustomer !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryCustomer(null);
        }}
      />
    </div>
  );
}
