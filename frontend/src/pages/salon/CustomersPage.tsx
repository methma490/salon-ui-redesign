import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Scissors,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appAlert } from '@/lib/app-alerts';
import {
  tenantApi,
  type Customer,
  type CustomerBookingHistoryItem,
  type CustomerLoyaltyItem,
} from '@/api/tenant.api';
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
      <DialogContent className="w-[calc(100%-1rem)] max-w-[540px] p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl bg-white max-h-[90dvh] overflow-y-auto">
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
  const { data: history = [], isLoading, isError, error } = useQuery({
    queryKey: ['customer-booking-history', customer?.id],
    queryFn: () => (customer ? tenantApi.customers.bookingHistory(customer.id) : Promise.resolve([])),
    enabled: open && !!customer,
  });

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const sortedHistory = useMemo(
    () =>
      history
        .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
        .sort((a, b) => {
          const first = `${a.appointmentDate}T${a.startTime}`;
          const second = `${b.appointmentDate}T${b.startTime}`;
          return sortOrder === 'newest' ? second.localeCompare(first) : first.localeCompare(second);
        }),
    [history, sortOrder, statusFilter],
  );

  const formatTime = (time: string) => {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(2000, 0, 1, hours, minutes));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border border-white/70 bg-[#f8fbff] p-0 shadow-2xl sm:max-w-[850px] max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:flex max-sm:flex-col">
        <DialogHeader className="relative bg-[radial-gradient(circle_at_top_left,_#e4f3ff,_#f8fbff_58%,_#f4f8ff)] px-4 pb-4 pt-5 pr-14 text-left sm:px-8 sm:pr-[370px] sm:pb-4 sm:pt-6">
          <DialogTitle className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-blue-600 shadow-sm sm:h-14 sm:w-14">
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <span>Booking History — {customer?.name}</span>
          </DialogTitle>
          {!isLoading && !isError && (
            <p className="mt-1.5 text-sm font-semibold text-slate-500">
              Total {history.length} appointment{history.length === 1 ? '' : 's'} recorded
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:absolute sm:right-16 sm:top-6 sm:mt-0 sm:flex">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm sm:w-[142px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest')}>
              <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm sm:w-[142px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-8 sm:pb-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            <span className="ml-2 text-sm text-slate-500">Loading booking records...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-10 px-4 border border-rose-200 rounded-xl bg-rose-50/50">
            <p className="text-sm font-medium text-rose-700">Could not load booking history</p>
            <p className="text-xs text-rose-600 mt-0.5">{getErrorMessage(error)}</p>
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {statusFilter === 'ALL' ? 'No booking history' : 'No appointments found'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {statusFilter === 'ALL'
                ? 'This customer does not have any appointments yet.'
                : `There are no ${statusFilter.toLowerCase().replace('_', ' ')} appointments for this customer.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:max-h-[58vh] sm:space-y-2.5 sm:overflow-y-auto sm:pr-2">
              {sortedHistory.map((item: CustomerBookingHistoryItem) => {
                const date = new Date(`${item.appointmentDate}T00:00:00`);
                return (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_5px_16px_rgba(53,87,135,0.07)] transition-colors hover:border-blue-200 sm:grid-cols-[84px_minmax(0,1fr)] sm:p-3.5"
                >
                  <div className={`hidden min-h-[96px] flex-col items-center justify-center rounded-xl sm:flex ${item.status === 'COMPLETED' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <span className="text-4xl font-extrabold leading-none tracking-tight text-slate-950">
                      {String(date.getDate()).padStart(2, '0')}
                    </span>
                    <span className="mt-1 text-base font-extrabold uppercase text-slate-900">
                      {date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <span className="mt-2 text-xs font-bold uppercase text-slate-500">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>

                  <div className="min-w-0">
                  <div className="mb-2 flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {item.code}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="hidden items-center gap-1.5 text-sm font-semibold text-slate-600 sm:inline-flex">
                          <Clock3 className="h-4 w-4" />
                          {formatTime(item.startTime)} – {formatTime(item.endTime)}
                        </span>
                      </div>
                      <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500 sm:flex">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Branch: {item.branchName}</span>
                        <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />Stylist: {item.employeeName || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          item.status === 'COMPLETED'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : item.status === 'CONFIRMED'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : item.status === 'CANCELLED'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                      <div className="mt-1 text-base font-extrabold text-slate-950">
                        {formatMoneyAmount(item.totalPrice)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 space-y-1.5 text-xs font-medium text-slate-600 sm:hidden">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-blue-500" />
                      <span>{date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                      <span className="text-slate-300">|</span>
                      <span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                      <span className="truncate">{item.branchName}</span>
                    </div>
                    {item.employeeName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.employeeName}</span>
                      </div>
                    )}
                  </div>

                  {item.services && item.services.length > 0 && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-800"><Scissors className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[11px] font-bold text-slate-600">Booked Services</p>
                      <div className="grid gap-1">
                        {item.services.map((svc) => (
                          <div
                            key={svc.id}
                            className="flex items-center justify-between gap-3 text-sm text-slate-700"
                          >
                            <span className="min-w-0 truncate">
                              {svc.name}{' '}
                              {svc.durationMinutes ? (
                                <span className="text-[11px] text-slate-400">
                                  ({svc.durationMinutes} min)
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-900">
                              {formatMoneyAmount(svc.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                        </div>
                        <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs italic text-slate-500">
                      Note: {item.notes}
                    </p>
                  )}
                  </div>
                </div>
                );
              })}
          </div>
        )}
        </div>
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

function CustomerDetailAnalyticsModal({
  customerId,
  open,
  onOpenChange,
  datePreset,
  fromDate,
  toDate,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datePreset: string;
  fromDate: string;
  toDate: string;
}) {
  const [modalPreset, setModalPreset] = useState(datePreset);
  const [modalFrom, setModalFrom] = useState(fromDate);
  const [modalTo, setModalTo] = useState(toDate);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = { preset: modalPreset };
    if (modalPreset === 'custom') {
      if (modalFrom) params.from = modalFrom;
      if (modalTo) params.to = modalTo;
    }
    return params;
  }, [modalPreset, modalFrom, modalTo]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-detail-analytics', customerId, queryParams],
    queryFn: () => (customerId ? tenantApi.customers.detailAnalytics(customerId, queryParams) : null),
    enabled: Boolean(open && customerId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <CustomerAvatar name={data?.customer.name || 'Customer'} />
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {data?.customer.name || 'Customer Loyalty Analytics'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-semibold">{data?.customer.code}</span>
                  {data?.customer.phone && (
                    <>
                      <span>•</span>
                      <span>{data.customer.phone}</span>
                    </>
                  )}
                  {data?.customer.email && (
                    <>
                      <span>•</span>
                      <span>{data.customer.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Date filter */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Select value={modalPreset} onValueChange={setModalPreset}>
                <SelectTrigger className="h-8 text-xs w-36 rounded-lg border-slate-200">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {modalPreset === 'custom' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="date"
                    value={modalFrom}
                    onChange={(e) => setModalFrom(e.target.value)}
                    className="h-7 px-2 border border-slate-200 rounded text-xs"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={modalTo}
                    onChange={(e) => setModalTo(e.target.value)}
                    className="h-7 px-2 border border-slate-200 rounded text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            <p className="text-xs">Loading customer analytics...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-slate-500 text-xs">No analytics available</div>
        ) : (
          <div className="space-y-6 pt-3">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                  Total Visits
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {data.kpis.totalVisits}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Completed visits</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                  Services Taken
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {data.kpis.totalServicesTaken}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Service items only</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                  Total Spend
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  LKR {formatMoneyAmount(data.kpis.totalSpend)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Net salon purchases</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                  Avg Spend / Visit
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  LKR {formatMoneyAmount(data.kpis.averageSpendPerVisit)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Per visit average</span>
              </div>
            </div>

            {/* Loyalty Highlights: Favourite Service & Favourite Stylist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-900 uppercase block">
                    Favourite Service
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.favouriteService?.name || 'No services yet'}
                  </div>
                  {data.favouriteService && (
                    <span className="text-xs text-slate-600 mt-0.5 block">
                      Taken {data.favouriteService.count} times (LKR{' '}
                      {formatMoneyAmount(data.favouriteService.revenue)})
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-blue-900 uppercase block">
                    Favourite Stylist / Performer
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.favouriteEmployee?.name || 'No preferred stylist'}
                  </div>
                  {data.favouriteEmployee && (
                    <span className="text-xs text-slate-600 mt-0.5 block">
                      Served by them {data.favouriteEmployee.count} times
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Services Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Services Taken Breakdown
              </h4>
              {(!data?.topServices && !data?.favouriteServices) ||
              ((data.topServices || data.favouriteServices)?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center border rounded-xl border-dashed">
                  No service items completed in this period.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {((data.topServices || data.favouriteServices) ?? []).map((svc: any, idx: number) => (
                    <div key={svc.serviceId || idx} className="flex items-center justify-between p-3 text-xs">
                      <span className="font-semibold text-slate-900">{svc.serviceName || svc.name || 'Service'}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-600 font-medium">
                          {svc.count} {svc.count === 1 ? 'time' : 'times'}
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          LKR {formatMoneyAmount(svc.revenue ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Last Visit & Recent Visits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Completed Visits
                </h4>
                {data?.kpis?.lastVisit && (
                  <span className="text-xs text-slate-500">
                    Last Visit:{' '}
                    <strong className="text-slate-800">
                      {new Date(data.kpis.lastVisit).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                )}
              </div>

              {(!data?.recentVisits || data.recentVisits.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-4 text-center border rounded-xl border-dashed">
                  No completed sales visits recorded.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Invoice</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Branch</th>
                        <th className="py-2 px-3 text-right">Items</th>
                        <th className="py-2 px-3 text-right">Total (LKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recentVisits.map((v: any, idx: number) => (
                        <tr key={v.saleId || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {v.invoiceNumber || v.saleNumber || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {(v.completedAt || v.date)
                              ? new Date(v.completedAt || v.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{v.branchName || 'Main'}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{v.itemCount ?? 1}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            LKR {formatMoneyAmount(v.total ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'analytics' ? 'analytics' : 'customers';

  const handleTabChange = (nextTab: 'customers' | 'analytics') => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (nextTab === 'customers') {
        sp.delete('tab');
      } else {
        sp.set('tab', nextTab);
      }
      return sp;
    });
    setPage(1);
  };

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(search, 400, 2);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [analyticsCustomer, setAnalyticsCustomer] = useState<CustomerLoyaltyItem | Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editForm, setEditForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Loyalty Analytics Filters
  const [datePreset, setDatePreset] = useState<'all_time' | 'this_month' | 'last_30_days' | 'last_month' | 'custom'>('all_time');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<'totalSpend' | 'visits' | 'servicesTaken' | 'lastVisit'>('totalSpend');

  // Query for Clean CRUD tab: GET /tenant/customers
  const customerListParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    return Object.keys(params).length ? params : undefined;
  }, [debouncedSearch, statusFilter]);

  const {
    data: rawCustomerList = [],
    isLoading: isCrudLoading,
    isFetching: isCrudFetching,
    isError: isCrudError,
    error: crudError,
    refetch: refetchCrud,
  } = useQuery({
    queryKey: ['customers-crud-list', customerListParams],
    queryFn: () => tenantApi.customers.list(customerListParams),
    enabled: activeTab === 'customers',
    placeholderData: (previousData) => previousData,
  });

  const allCrudCustomers = useMemo(() => {
    return Array.isArray(rawCustomerList) ? rawCustomerList : [];
  }, [rawCustomerList]);

  const paginatedCrudCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allCrudCustomers.slice(start, start + pageSize);
  }, [allCrudCustomers, page, pageSize]);

  // Top Customers Summary Cards Query: GET /tenant/customers/top
  const topSummaryParams = useMemo(() => {
    const params: Record<string, string> = { preset: datePreset };
    if (datePreset === 'custom') {
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
    }
    return params;
  }, [datePreset, fromDate, toDate]);

  const { data: topSummary } = useQuery({
    queryKey: ['customers-top-summary', topSummaryParams],
    queryFn: () => tenantApi.customers.top(topSummaryParams),
    enabled: activeTab === 'analytics',
  });

  // Analytics Table Query: GET /tenant/customers/analytics
  const analyticsParams = useMemo(() => {
    const params: Record<string, string | number> = {
      preset: datePreset,
      sortBy,
      sortOrder: 'desc',
      page,
      limit: pageSize,
    };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    if (datePreset === 'custom') {
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
    }
    return params;
  }, [datePreset, sortBy, page, pageSize, debouncedSearch, statusFilter, fromDate, toDate]);

  const {
    data: analyticsResponse,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsFetching,
    isError: isAnalyticsError,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['customers-analytics', analyticsParams],
    queryFn: () => tenantApi.customers.analytics(analyticsParams),
    enabled: activeTab === 'analytics',
    placeholderData: (previousData) => previousData,
  });

  const analyticsCustomers: CustomerLoyaltyItem[] = analyticsResponse?.data ?? [];
  const analyticsTotal = analyticsResponse?.meta?.total ?? 0;
  const analyticsTotalPages = analyticsResponse?.meta?.totalPages ?? 1;

  const totalItems = activeTab === 'customers' ? allCrudCustomers.length : analyticsTotal;
  const totalPages = activeTab === 'customers' ? Math.ceil(allCrudCustomers.length / pageSize) || 1 : analyticsTotalPages;
  const isFetching = activeTab === 'customers' ? isCrudFetching : isAnalyticsFetching;
  const isLoading = activeTab === 'customers' ? isCrudLoading : isAnalyticsLoading;
  const isError = activeTab === 'customers' ? isCrudError : isAnalyticsError;
  const error = activeTab === 'customers' ? crudError : analyticsError;
  const refetch = activeTab === 'customers' ? refetchCrud : refetchAnalytics;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDatePreset('all_time');
    setSortBy('totalSpend');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search || statusFilter !== 'all' || datePreset !== 'all_time' || sortBy !== 'totalSpend');

  const createMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm(emptyForm);
      setFormError(null);
      setPhoneError(null);
      setCreateOpen(false);
      appAlert({
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
      appAlert({
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
      appAlert({
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
      appAlert({
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
      appAlert({
        icon: 'success',
        title: 'Customer Deleted',
        text: 'Customer profile has been removed successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      appAlert({
        icon: 'error',
        title: 'Cannot Delete Customer',
        text: getErrorMessage(err),
      });
    },
  });

  const handleToggleStatus = (cust: Customer) => {
    const nextStatus = cust.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    appAlert({
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
    appAlert({
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

  const isInitialLoading = isLoading && totalItems === 0 && !debouncedSearch;

  if (isInitialLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError && totalItems === 0) {
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
    <div className="w-full space-y-4">
      {/* Top Header Actions */}
      {activeTab === 'customers' && (
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setPhoneError(null);
              setForm(emptyForm);
              setCreateOpen(true);
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-3 sm:py-2.5 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-[var(--brand-foreground,#ffffff)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      )}

      {/* Tabs navigation: Customers vs Customer Analytics */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabChange('customers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'customers'
              ? 'border-[var(--brand-primary,#0d5c3d)] text-[var(--brand-primary,#0d5c3d)]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customers</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {allCrudCustomers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-[var(--brand-primary,#0d5c3d)] text-[var(--brand-primary,#0d5c3d)]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Customer Analytics</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            Insights
          </span>
        </button>
      </div>

      {/* Top Customer / Loyalty Summary Cards (Only in Analytics tab) */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Top by Visits */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Top by Visits
              </span>
              <div className="text-base font-bold text-slate-900 mt-1 truncate">
                {topSummary?.topByVisits?.customer?.name || 'No visits recorded'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                <span className="font-extrabold text-slate-900">
                  {topSummary?.topByVisits?.metric ?? 0}
                </span>{' '}
                completed visits
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Award className="h-5 w-5" />
            </div>
          </div>

          {/* Top by Services Taken */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Top by Services
              </span>
              <div className="text-base font-bold text-slate-900 mt-1 truncate">
                {topSummary?.topByServices?.customer?.name || 'No services recorded'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                <span className="font-extrabold text-emerald-700">
                  {topSummary?.topByServices?.metric ?? 0}
                </span>{' '}
                services taken
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Scissors className="h-5 w-5" />
            </div>
          </div>

          {/* Top by Spending */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Top by Spending
              </span>
              <div className="text-base font-bold text-slate-900 mt-1 truncate">
                {topSummary?.topBySpending?.customer?.name || 'No sales recorded'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                <span className="font-extrabold text-slate-900 font-mono">
                  LKR {formatMoneyAmount(topSummary?.topBySpending?.metric ?? 0)}
                </span>{' '}
                total spend
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] sm:min-w-[260px]">
            {isFetching && debouncedSearch ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            )}
            <input
              type="text"
              placeholder={
                activeTab === 'customers'
                  ? 'Search customers by name, phone, email...'
                  : 'Search customer analytics by name, phone...'
              }
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

          {/* Ranking & Date Filters (Only in Customer Analytics tab) */}
          {activeTab === 'analytics' && (
            <>
              {/* Ranking / Sort Selector */}
              <div className="w-full sm:w-48">
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <TrendingUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <SelectValue placeholder="Rank By" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalSpend">Top by Spending</SelectItem>
                    <SelectItem value="visits">Top by Visits</SelectItem>
                    <SelectItem value="servicesTaken">Top by Services Taken</SelectItem>
                    <SelectItem value="lastVisit">Recently Visited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Analytics Date Filter */}
              <div className="w-full sm:w-44">
                <Select
                  value={datePreset}
                  onValueChange={(v) => {
                    setDatePreset(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium bg-emerald-50/40 border-emerald-200/80 text-emerald-900">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <SelectValue placeholder="Analytics Period" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </>
          )}

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-36">
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
            <p className="text-sm font-semibold text-slate-800">
              {activeTab === 'customers' ? 'No customers found' : 'No customer activity found for this period.'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search, ranking or status filter to find what you are looking for.'
                : activeTab === 'customers'
                ? 'Get started by adding your first customer.'
                : 'Complete visits and sales transactions to start generating loyalty insights.'}
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
              {activeTab === 'customers' ? (
                /* Clean Customers CRUD Table */
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">CUSTOMER</th>
                      <th className="py-3 px-3">CODE</th>
                      <th className="py-3 px-3">PHONE</th>
                      <th className="py-3 px-3">EMAIL</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCrudCustomers.map((cust) => {
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
                          <td className="py-3.5 px-3 text-slate-600 truncate max-w-[150px]">
                            {cust.email || '—'}
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
              ) : (
                /* Customer Analytics Table */
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">CUSTOMER</th>
                      <th className="py-3 px-3 text-center" title="Completed visits count">
                        VISITS
                      </th>
                      <th className="py-3 px-3 text-center" title="Completed service items taken">
                        SERVICES TAKEN
                      </th>
                      <th className="py-3 px-3 text-right" title="Total net completed spend">
                        TOTAL SPEND
                      </th>
                      <th className="py-3 px-3 text-center" title="Date of latest completed visit">
                        LAST VISIT
                      </th>
                      <th className="py-3 px-3" title="Most frequent service">
                        FAVOURITE SERVICE
                      </th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticsCustomers.map((cust) => {
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
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {cust.code || cust.phone || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Analytics: Visits */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {cust.visitCount ?? 0}
                            </span>
                          </td>

                          {/* Analytics: Services Taken */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-extrabold text-emerald-700 text-xs">
                              {cust.servicesTaken ?? 0}
                            </span>
                          </td>

                          {/* Analytics: Total Spend */}
                          <td className="py-3.5 px-3 text-right">
                            <span className="font-bold text-slate-900 font-mono text-xs">
                              LKR {formatMoneyAmount(cust.totalSpend ?? 0)}
                            </span>
                          </td>

                          {/* Analytics: Last Visit */}
                          <td className="py-3.5 px-3 text-center text-[11px] text-slate-600">
                            {cust.lastVisit
                              ? new Date(cust.lastVisit).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit',
                                })
                              : '—'}
                          </td>

                          {/* Analytics: Favourite Service */}
                          <td className="py-3.5 px-3 max-w-[170px] truncate" title={cust.favouriteService?.name || '—'}>
                            {cust.favouriteService ? (
                              <div className="flex items-center gap-1 truncate text-slate-800 text-[11px]">
                                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                <span className="font-medium truncate">{cust.favouriteService.name}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  ({cust.favouriteService.count})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setAnalyticsCustomer(cust)}
                              className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="View Customer Analytics Detail"
                            >
                              <Award className="h-3.5 w-3.5 text-emerald-600" />
                              <span>View Analytics</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {activeTab === 'customers'
                ? /* Clean Customer Cards */
                  paginatedCrudCustomers.map((cust) => {
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
                              Email
                            </span>
                            <span className="text-slate-700 truncate block">{cust.email || '—'}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setHistoryCustomer(cust)}
                            className="h-10 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="View History"
                          >
                            <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">History</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(cust)}
                            className="h-10 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="Edit Customer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() => handleToggleStatus(cust)}
                            className="h-10 px-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center transition-colors"
                            title={isActive ? 'Deactivate Customer' : 'Activate Customer'}
                          >
                            <span className="truncate">{isActive ? 'Off' : 'On'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDeleteCustomer(cust)}
                            className="h-10 px-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                : /* Customer Analytics Mobile Cards */
                  analyticsCustomers.map((cust) => {
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
                                {cust.code || cust.phone || '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Loyalty Metrics Banner */}
                        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block tracking-wider">
                              Visits
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {cust.visitCount ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block tracking-wider">
                              Services
                            </span>
                            <span className="text-sm font-black text-emerald-800">
                              {cust.servicesTaken ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block tracking-wider">
                              Total Spend
                            </span>
                            <span className="text-sm font-black text-slate-900 font-mono">
                              LKR {formatMoneyAmount(cust.totalSpend ?? 0)}
                            </span>
                          </div>
                        </div>

                        {cust.favouriteService && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-slate-500 text-[11px]">Favourite:</span>
                            <span className="font-semibold truncate">{cust.favouriteService.name}</span>
                            <span className="text-slate-400 text-[10px] shrink-0">
                              ({cust.favouriteService.count})
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Last Visit
                            </span>
                            <span className="text-slate-700">
                              {cust.lastVisit
                                ? new Date(cust.lastVisit).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setAnalyticsCustomer(cust)}
                            className="h-9 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="View Customer Analytics"
                          >
                            <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>View Analytics</span>
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

      {/* Customer Loyalty Analytics Detail Dialog */}
      <CustomerDetailAnalyticsModal
        customerId={analyticsCustomer?.id ?? null}
        open={analyticsCustomer !== null}
        onOpenChange={(open) => {
          if (!open) setAnalyticsCustomer(null);
        }}
        datePreset={datePreset}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
}
