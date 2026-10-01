import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Phone,
  Plus,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Globe,
  Search,
  SlidersHorizontal,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  X,
  Users,
  Scissors,
  Package,
  Calendar,
  BarChart3,
  ChevronRight,
  ArrowRight,
  MapPin,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi, type Branch } from '@/api/tenant.api';
import { formatMoneyAmount } from '@/lib/money';
import {
  FormError,
  FormSubmit,
  getErrorMessage,
  SimpleForm,
  SimpleFormDialog,
} from './salon-ops-ui';
import './employees-page.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AddressAutocompleteInput,
  type OpenRouteAddressDetails,
  type ExtractedAddressDetails,
} from '@/components/common/AddressAutocompleteInput';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type BranchForm = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isCustomCode?: boolean;
};

const emptyForm: BranchForm = {
  code: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  latitude: null,
  longitude: null,
  isCustomCode: false,
};

function isValidPhoneNumber(phone: string): boolean {
  if (!phone || !phone.trim()) return true;
  const trimmed = phone.trim();
  const phonePattern = /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}$/;
  if (!phonePattern.test(trimmed)) {
    return false;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 9 && digitsOnly.length <= 15;
}

function generateLocalBranchCode(name: string, index = 1): string {
  if (!name || !name.trim()) {
    return `BR-${String(index).padStart(2, '0')}`;
  }
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const prefix = clean.length >= 3 ? clean.slice(0, 4) : 'BR';
  return `BR-${prefix}-${String(index).padStart(2, '0')}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function toBranchPayload(form: BranchForm, includeCode = true) {
  const payload: Record<string, unknown> = { name: form.name.trim() };
  if (includeCode && form.code.trim()) {
    payload.code = form.code.trim().toUpperCase();
  }
  const phone = form.phone.trim();
  const email = form.email.trim();
  const address = form.address.trim();

  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (address) payload.address = address;
  if (form.latitude != null && !isNaN(form.latitude)) {
    payload.latitude = Number(form.latitude);
  }
  if (form.longitude != null && !isNaN(form.longitude)) {
    payload.longitude = Number(form.longitude);
  }
  return payload;
}

function BranchStatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
          : 'bg-rose-50 text-rose-700 border border-rose-200/80'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />
      {status}
    </span>
  );
}

function OpenMapLink({ lat, lng, name }: { lat?: number | null; lng?: number | null; name?: string }) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <a
      href={osmUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline hover:text-emerald-700 transition-colors"
      title={`View ${name || 'branch'} coordinates on OpenStreetMap`}
      onClick={(e) => e.stopPropagation()}
    >
      <Globe className="h-3 w-3 text-emerald-600" />
      <span>
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </span>
      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
    </a>
  );
}

function BranchFormFields({
  form,
  setForm,
  mode,
  isMain = false,
}: {
  form: BranchForm;
  setForm: React.Dispatch<React.SetStateAction<BranchForm>>;
  mode: 'create' | 'edit';
  isMain?: boolean;
}) {
  const [isSuggestingCode, setIsSuggestingCode] = useState(false);

  const handleAutoSuggestCode = async (customName?: string) => {
    const targetName = customName !== undefined ? customName : form.name;
    setIsSuggestingCode(true);
    try {
      const res = await tenantApi.branches.suggestCode(targetName);
      if (res?.code) {
        setForm((prev) => ({ ...prev, code: res.code, isCustomCode: false }));
      }
    } catch {
      const fallback = generateLocalBranchCode(targetName);
      setForm((prev) => ({ ...prev, code: fallback, isCustomCode: false }));
    } finally {
      setIsSuggestingCode(false);
    }
  };

  const handleNameChange = (newName: string) => {
    if (!form.isCustomCode && mode === 'create') {
      const generated = generateLocalBranchCode(newName);
      setForm({ ...form, name: newName, code: generated });
    } else {
      setForm({ ...form, name: newName });
    }
  };

  const handlePlaceSelected = (place: OpenRouteAddressDetails | ExtractedAddressDetails) => {
    const lat = place.lat !== undefined ? place.lat : null;
    const lng = place.lng !== undefined ? place.lng : null;

    setForm((prev) => ({
      ...prev,
      address: place.formattedAddress || prev.address,
      latitude: lat,
      longitude: lng,
    }));
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="branch-name" className="text-xs font-semibold text-slate-700">
          Branch name *
        </Label>
        <Input
          id="branch-name"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Mount Lavinia Branch"
          required
          className="h-10 text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="branch-code" className="text-xs font-semibold text-slate-700">
            Branch Code *
          </Label>
          {!isMain && (
            <button
              type="button"
              onClick={() => handleAutoSuggestCode()}
              disabled={isSuggestingCode}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              <span>{isSuggestingCode ? 'Generating...' : 'Auto Generate'}</span>
            </button>
          )}
        </div>
        <div className="relative flex items-center">
          <Input
            id="branch-code"
            value={form.code}
            disabled={isMain}
            onChange={(e) =>
              setForm({
                ...form,
                code: e.target.value.toUpperCase(),
                isCustomCode: true,
              })
            }
            placeholder="e.g. BR02"
            required
            maxLength={50}
            className="font-mono h-10 text-sm"
          />
          {!isMain && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleAutoSuggestCode()}
              disabled={isSuggestingCode}
              className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Auto-generate branch code"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSuggestingCode ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isMain
            ? 'The primary branch code is locked to MAIN.'
            : 'Auto-generated code. You can freely edit or customize it.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branch-phone" className="text-xs font-semibold text-slate-700">
            Phone / Mobile
          </Label>
          <Input
            id="branch-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. 0776400863"
            className="h-10 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-email" className="text-xs font-semibold text-slate-700">
            Email
          </Label>
          <Input
            id="branch-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. branch@salon.com"
            className="h-10 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch-address" className="text-xs font-semibold text-slate-700">
          Branch Address
        </Label>
        <AddressAutocompleteInput
          id="branch-address"
          value={form.address}
          onChange={(address) => setForm((prev) => ({ ...prev, address }))}
          onPlaceSelect={handlePlaceSelected}
          placeholder="Search location, street, or landmark..."
          className="h-10 text-sm"
        />
      </div>
    </>
  );
}

// Side Drawer for Branch Details (Screenshot 2)
function BranchDetailsDrawer({
  branch,
  open,
  onClose,
  onEdit,
  onToggleStatus,
  isUpdating,
}: {
  branch: Branch | null;
  open: boolean;
  onClose: () => void;
  onEdit: (branch: Branch) => void;
  onToggleStatus: (branch: Branch) => void;
  isUpdating: boolean;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'operational'>('operational');

  // Real Queries for Operational Info
  const branchId = branch?.id;
  const { data: dashToday } = useQuery({
    queryKey: ['branch-drawer-dash-today', branchId],
    queryFn: () => tenantApi.dashboard.get(branchId, 'today'),
    enabled: open && Boolean(branchId) && activeTab === 'operational',
  });

  const { data: dashMonth } = useQuery({
    queryKey: ['branch-drawer-dash-month', branchId],
    queryFn: () => tenantApi.dashboard.get(branchId, 'month'),
    enabled: open && Boolean(branchId) && activeTab === 'operational',
  });

  const { data: branchEmployees = [] } = useQuery({
    queryKey: ['branch-drawer-employees', branchId],
    queryFn: () => tenantApi.employees.list({ branchId: branchId! }),
    enabled: open && Boolean(branchId) && activeTab === 'operational',
  });

  const { data: branchServices = [] } = useQuery({
    queryKey: ['branch-drawer-services', branchId],
    queryFn: () => tenantApi.services.list({ branchId: branchId! }),
    enabled: open && Boolean(branchId) && activeTab === 'operational',
  });

  const { data: customersList = [] } = useQuery({
    queryKey: ['branch-drawer-customers'],
    queryFn: () => tenantApi.customers.list(),
    enabled: open && Boolean(branchId) && activeTab === 'operational',
  });

  if (!open || !branch) return null;

  // Real computed metrics
  const totalEmployees = branchEmployees.length;
  const activeEmployees = branchEmployees.filter((e) => e.status === 'ACTIVE').length;
  const managerEmployees = branchEmployees.filter(
    (e) =>
      (e.designation && e.designation.toLowerCase().includes('manager')) ||
      (e.systemRoles && e.systemRoles.some((r) => r.toLowerCase().includes('manager')))
  ).length;
  const inactiveEmployees = branchEmployees.filter((e) => e.status === 'INACTIVE').length;

  const totalServices = branchServices.length;
  const activeServices = branchServices.filter((s) => s.status === 'ACTIVE').length;
  const inactiveServices = branchServices.filter((s) => s.status === 'INACTIVE').length;

  const totalProducts = dashMonth?.inventoryOverview?.totalProducts ?? 0;
  const lowStock = dashMonth?.inventoryOverview?.lowStock ?? 0;
  const outOfStock = dashMonth?.inventoryOverview?.outOfStock ?? 0;

  const totalCustomers = customersList.length;

  const apptsToday = dashToday?.appointmentOverview?.total ?? 0;
  const apptsThisMonth = dashMonth?.appointmentOverview?.total ?? 0;
  const apptsCompleted = dashMonth?.appointmentOverview?.completed ?? 0;
  const apptsCancelled = dashMonth?.appointmentOverview?.cancelled ?? 0;

  const todayRevenue = dashToday?.financials?.revenue ?? dashToday?.kpis?.periodRevenue ?? 0;
  const monthRevenue = dashMonth?.financials?.revenue ?? dashMonth?.kpis?.periodRevenue ?? 0;
  const monthOrdersCount = dashMonth?.recentOrders?.length ?? 0;
  const avgTransaction = monthOrdersCount > 0 ? Math.round(monthRevenue / monthOrdersCount) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[620px] bg-white shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between">
            <h2 className="text-xl font-bold text-slate-900">Branch details</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Branch Top Banner Info */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{branch.name}</h3>
                {branch.isMain && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    Main Branch
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-500 font-semibold mt-0.5">{branch.code}</p>
              {branch.address && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{branch.address}</span>
                  {branch.latitude != null && branch.longitude != null && (
                    <OpenMapLink lat={branch.latitude} lng={branch.longitude} name={branch.name} />
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 gap-8 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 transition-colors relative ${
                activeTab === 'settings'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settings
              {activeTab === 'settings' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('operational')}
              className={`py-3 transition-colors relative ${
                activeTab === 'operational'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operational Info
              {activeTab === 'operational' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
              )}
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'operational' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Staff & Team */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Staff & Team</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalEmployees}</span>
                        <span className="text-xs text-slate-500 font-medium">Total Employees</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{activeEmployees} Active Employees</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>{managerEmployees} Managers</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          <span>{inactiveEmployees} Inactive Employees</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/employees')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Staff</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 2. Services */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Services</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalServices}</span>
                        <span className="text-xs text-slate-500 font-medium">Total Services</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{activeServices} Active Services</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          <span>{inactiveServices} Inactive Services</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/services')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Services</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 3. Products & Inventory */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Package className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Products & Inventory</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalProducts}</span>
                        <span className="text-xs text-slate-500 font-medium">Total Products</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span>{lowStock} Low Stock Items</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span>{outOfStock} Out of Stock Items</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/stock')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Inventory</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 4. Customers */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Customers</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalCustomers}</span>
                        <span className="text-xs text-slate-500 font-medium">Total Customers</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>Registered Salon Clients</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/customers')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Customers</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 5. Appointments */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Appointments</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{apptsToday}</span>
                        <span className="text-xs text-slate-500 font-medium">Appointments Today</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{apptsThisMonth} This Month</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>{apptsCompleted} Completed</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span>{apptsCancelled} Cancelled</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/appointments')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Appointments</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 6. Sales / Revenue */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">Sales / Revenue</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                          LKR {formatMoneyAmount(todayRevenue)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Today's Sales</p>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>LKR {formatMoneyAmount(monthRevenue)} This Month</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>LKR {formatMoneyAmount(avgTransaction)} Average Transaction</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/salon/reports')}
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>View Sales Reports</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">General Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Branch Name</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{branch.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Branch Code</span>
                      <p className="font-mono font-semibold text-slate-900 mt-0.5">{branch.code}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Contact Phone</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{branch.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Contact Email</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{branch.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Status</span>
                      <div className="mt-1">
                        <BranchStatusBadge status={branch.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Created Date</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {formatDate(branch.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Location & Coordinates</h4>
                  <p className="text-xs text-slate-600">{branch.address || 'No address specified'}</p>
                  {branch.latitude != null && branch.longitude != null && (
                    <div className="pt-2">
                      <OpenMapLink lat={branch.latitude} lng={branch.longitude} name={branch.name} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Branch Actions</h4>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={() => onEdit(branch)}
                      className="justify-start gap-2 h-10 text-xs font-semibold"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Branch Details
                    </Button>
                    {!branch.isMain && (
                      <Button
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => onToggleStatus(branch)}
                        className={`justify-start gap-2 h-10 text-xs font-semibold ${
                          branch.status === 'ACTIVE'
                            ? 'text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <EyeOff className="h-4 w-4" />
                        {branch.status === 'ACTIVE'
                          ? 'Deactivate Branch (Block Appointments)'
                          : 'Reactivate Branch'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const {
    data: branches = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: features = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const canManageBranches = features.includes('MULTI_BRANCH');

  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editIsMain, setEditIsMain] = useState(false);
  const [editForm, setEditForm] = useState<BranchForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Drawer state for Screenshot 2
  const [drawerBranch, setDrawerBranch] = useState<Branch | null>(null);

  // Initialize auto-generated code when opening create dialog
  useEffect(() => {
    if (createOpen && !form.code) {
      tenantApi.branches
        .suggestCode()
        .then((res) => {
          if (res?.code) {
            setForm((prev) => ({ ...prev, code: res.code }));
          }
        })
        .catch(() => {
          setForm((prev) => ({ ...prev, code: generateLocalBranchCode('', branches.length + 1) }));
        });
    }
  }, [createOpen, branches.length, form.code]);

  const createMutation = useMutation({
    mutationFn: tenantApi.branches.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.branches.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setEditId(null);
      setFormError(null);
      if (drawerBranch?.id === updated.id) {
        setDrawerBranch(updated);
      }
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.branches.updateStatus(id, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      if (drawerBranch?.id === updated.id) {
        setDrawerBranch(updated);
      }
    },
  });

  const openEdit = (branch: Branch) => {
    setFormError(null);
    setEditId(branch.id);
    setEditIsMain(branch.isMain);
    setEditForm({
      code: branch.code,
      name: branch.name,
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || '',
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
      isCustomCode: true,
    });
  };

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const q = searchQuery.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.address && b.address.toLowerCase().includes(q)),
    );
  }, [branches, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <h3 className="text-lg font-bold text-destructive">Could not load branches</h3>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Branches</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage salon locations and branch details
          </p>
        </div>

        {canManageBranches ? (
          <Button
            className="w-full sm:w-auto gap-2 bg-[#026038] hover:bg-[#024e2d] text-white font-semibold rounded-lg px-4 h-10 shadow-xs transition-colors"
            onClick={() => {
              setFormError(null);
              setForm({
                ...emptyForm,
                code: generateLocalBranchCode('', branches.length + 1),
              });
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground bg-muted/20">
            Multi-branch management requires the <strong className="text-foreground">Platinum</strong> plan.
          </div>
        )}
      </div>

      {/* Main Table Card (Screenshot 3) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Card Header with Search & Filter */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All Branches</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {branches.length} branch{branches.length === 1 ? '' : 'es'} registered
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, code or phone..."
                className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200 rounded-lg focus-visible:bg-white"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-slate-200 text-slate-600 shrink-0 rounded-lg hover:bg-slate-50"
              title="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {filteredBranches.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No branches found matching your search.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/60 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[120px] font-semibold text-slate-600 text-xs pl-6">
                      Code
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Phone</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Main Branch</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Created Date</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 text-xs pr-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => {
                    const isMain = branch.isMain;
                    const isActive = branch.status === 'ACTIVE';

                    return (
                      <TableRow
                        key={branch.id}
                        className={`border-b border-slate-100/80 transition-colors hover:bg-slate-50/60 ${
                          !isActive ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* Code */}
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {branch.code}
                            </span>
                          </div>
                        </TableCell>

                        {/* Name + Address */}
                        <TableCell className="py-4 max-w-xs">
                          <div>
                            <p className="font-bold text-sm text-slate-900 leading-tight">
                              {branch.name}
                            </p>
                            {branch.address && (
                              <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{branch.address}</span>
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell className="py-4 text-xs font-medium text-slate-700">
                          {branch.phone || '—'}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          <BranchStatusBadge status={branch.status} />
                        </TableCell>

                        {/* Main Branch */}
                        <TableCell className="py-4">
                          {isMain ? (
                            <span className="px-3 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                              No
                            </span>
                          )}
                        </TableCell>

                        {/* Created Date */}
                        <TableCell className="py-4 text-xs text-slate-500 font-medium">
                          {formatDate(branch.createdAt)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => openEdit(branch)}
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              title="Edit branch"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* View Drawer */}
                            <button
                              onClick={() => setDrawerBranch(branch)}
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              title="View branch operational info"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Deactivate / Status Toggle */}
                            {!isMain && (
                              <button
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: branch.id,
                                    status: isActive ? 'INACTIVE' : 'ACTIVE',
                                  })
                                }
                                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
                                  isActive
                                    ? 'bg-amber-50/80 border-amber-200/80 text-amber-700 hover:bg-amber-100'
                                    : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100'
                                }`}
                                title={isActive ? 'Deactivate branch' : 'Activate branch'}
                              >
                                {isActive ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}

                            {/* Delete (non-main) */}
                            {!isMain && (
                              <button
                                disabled={statusMutation.isPending}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to deactivate ${branch.name}?`)) {
                                    statusMutation.mutate({
                                      id: branch.id,
                                      status: 'INACTIVE',
                                    });
                                  }
                                }}
                                className="h-8 w-8 rounded-lg border bg-rose-50/80 border-rose-200/80 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                title="Deactivate/Delete branch"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredBranches.map((branch) => {
                const isMain = branch.isMain;
                const isActive = branch.status === 'ACTIVE';

                return (
                  <div key={branch.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{branch.name}</p>
                          <p className="text-xs font-mono text-slate-500">{branch.code}</p>
                        </div>
                      </div>
                      <BranchStatusBadge status={branch.status} />
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pl-1">
                      {branch.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{branch.phone}</span>
                        </p>
                      )}
                      {branch.address && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{branch.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDrawerBranch(branch)}
                        className="gap-1.5 text-xs h-8 text-slate-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(branch)}
                          className="h-8 px-2.5 text-xs text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isMain && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({
                                id: branch.id,
                                status: isActive ? 'INACTIVE' : 'ACTIVE',
                              })
                            }
                            className={`h-8 px-2.5 text-xs ${
                              isActive ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                            }`}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer (Screenshot 3) */}
            <div className="p-4 sm:px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                Showing 1 to {filteredBranches.length} of {branches.length} branches
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-500"
                  disabled
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-[#026038] text-white hover:bg-[#024e2d] font-semibold text-xs"
                >
                  1
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-500"
                  disabled
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Branch Dialog */}
      <SimpleFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setFormError(null);
          setCreateOpen(open);
        }}
        title="Create Branch"
      >
        <SimpleForm
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (form.phone && !isValidPhoneNumber(form.phone)) {
              setFormError('Please enter a valid mobile or phone number (e.g. 0771234567, +94771234567)');
              return;
            }
            createMutation.mutate(toBranchPayload(form, true));
          }}
        >
          <FormError message={formError} />
          <BranchFormFields form={form} setForm={setForm} mode="create" />
          <FormSubmit pending={createMutation.isPending}>Create Branch</FormSubmit>
        </SimpleForm>
      </SimpleFormDialog>

      {/* Edit Branch Dialog */}
      <SimpleFormDialog
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            setFormError(null);
          }
        }}
        title="Edit Branch"
      >
        {editId && (
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              if (editForm.phone && !isValidPhoneNumber(editForm.phone)) {
                setFormError('Please enter a valid mobile or phone number (e.g. 0771234567, +94771234567)');
                return;
              }
              updateMutation.mutate({
                id: editId,
                data: toBranchPayload(editForm, !editIsMain),
              });
            }}
          >
            <FormError message={formError} />
            <BranchFormFields
              form={editForm}
              setForm={setEditForm}
              mode="edit"
              isMain={editIsMain}
            />
            <FormSubmit pending={updateMutation.isPending}>Save Changes</FormSubmit>
          </SimpleForm>
        )}
      </SimpleFormDialog>

      {/* Branch Details Slide-out Drawer */}
      <BranchDetailsDrawer
        branch={drawerBranch}
        open={drawerBranch !== null}
        onClose={() => setDrawerBranch(null)}
        onEdit={(b) => {
          setDrawerBranch(null);
          openEdit(b);
        }}
        onToggleStatus={(b) => {
          statusMutation.mutate({
            id: b.id,
            status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
          });
        }}
        isUpdating={statusMutation.isPending}
      />
    </div>
  );
}
