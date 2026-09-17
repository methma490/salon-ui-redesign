import {
  BarChart3,
  Building2,
  CalendarDays,
  Coins,
  Layers3,
  Package,
  Scissors,
  Shield,
  ShoppingCart,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCreateSalon, useFeatures } from '@/features/salons/hooks/useSalons';
import type { FeatureOption } from '@/features/salons/types/salon.types';
import '@/pages/salon/employees-page.css';
import '@/pages/super-admin/salons/create-salon-dialog.css';

const FEATURE_ICONS: Record<string, typeof Users> = {
  CUSTOMERS: Users,
  APPOINTMENTS: CalendarDays,
  SERVICES: Scissors,
  POS: ShoppingCart,
  INVENTORY: Package,
  REPORTS: BarChart3,
  STAFF_MANAGEMENT: Shield,
  EXPENSES: Coins,
  PAYROLL: Wallet,
  MULTI_BRANCH: Building2,
  ANALYTICS: Layers3,
};

interface CreateSalonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  name: '',
  email: '',
  phone: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
};

function FeatureIcon({ feature }: { feature: FeatureOption }) {
  const Icon = FEATURE_ICONS[feature.code] ?? Store;
  return <Icon className="h-3.5 w-3.5" aria-hidden />;
}

export function CreateSalonDialog({ open, onOpenChange }: CreateSalonDialogProps) {
  const navigate = useNavigate();
  const createSalon = useCreateSalon();
  const { data: features, isLoading: featuresLoading } = useFeatures();

  const [form, setForm] = useState(initialForm);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');

  const reset = () => {
    setForm(initialForm);
    setSelectedFeatures([]);
    setError('');
  };

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createSalon.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, createSalon.isPending]);

  const toggleFeature = (code: string, checked: boolean) => {
    setSelectedFeatures((current) =>
      checked ? [...new Set([...current, code])] : current.filter((item) => item !== code),
    );
  };

  const selectAllFeatures = () => {
    if (!features?.length) return;
    setSelectedFeatures(features.map((feature) => feature.code));
  };

  const clearFeatures = () => setSelectedFeatures([]);

  const validate = (): boolean => {
    setError('');

    if (!form.name.trim()) {
      setError('Salon name is required.');
      return false;
    }

    if (!selectedFeatures.length) {
      setError('Select at least one feature for this salon.');
      return false;
    }

    if (!form.adminName.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()) {
      setError('Admin name, email, and password are required.');
      return false;
    }

    if (form.adminPassword.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      const result = await createSalon.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        features: selectedFeatures,
        admin: {
          name: form.adminName.trim(),
          email: form.adminEmail.trim(),
          phone: form.adminPhone.trim() || undefined,
          password: form.adminPassword,
        },
      });
      onOpenChange(false);
      navigate(`/super-admin/salons/${result.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'Failed to create salon.';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="emp-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !createSalon.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        className="emp-modal emp-modal-form csd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-salon-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="emp-modal-header">
          <div className="emp-modal-header-text">
            <div className="emp-modal-title-row">
              <span className="emp-modal-icon" aria-hidden>
                <Store className="h-6 w-6 text-[#0d5c3d]" />
              </span>
              <div>
                <h2 id="create-salon-title">Create New Salon</h2>
                <p className="emp-modal-subtitle">
                  Tenant, branch, modules, and admin account — all in one form.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="emp-modal-close"
            aria-label="Close"
            disabled={createSalon.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form className="emp-modal-form-inner" onSubmit={(event) => void handleSubmit(event)}>
          <div className="emp-modal-body">
            {error && <p className="emp-form-error">{error}</p>}

            <div className="csd-layout">
              <section className="csd-panel">
                <div className="csd-panel-head">
                  <span className="csd-panel-icon" aria-hidden>
                    <Store className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="csd-panel-title">Salon information</h3>
                    <p className="csd-panel-desc">Tenant and main branch details</p>
                  </div>
                </div>
                <div className="emp-form-fields-grid">
                  <div className="emp-field emp-field-span-2">
                    <label className="emp-label" htmlFor="csd-name">
                      Salon name <span className="emp-required">*</span>
                    </label>
                    <input
                      id="csd-name"
                      className="emp-input"
                      placeholder="e.g. Glow Studio Colombo"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-email">
                      Salon email
                    </label>
                    <input
                      id="csd-email"
                      type="email"
                      className="emp-input"
                      placeholder="contact@salon.lk"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-phone">
                      Salon phone
                    </label>
                    <input
                      id="csd-phone"
                      className="emp-input"
                      placeholder="+94 77 123 4567"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="csd-panel">
                <div className="csd-panel-head">
                  <span className="csd-panel-icon" aria-hidden>
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="csd-panel-title">Salon admin</h3>
                    <p className="csd-panel-desc">First owner login credentials</p>
                  </div>
                </div>
                <div className="emp-form-fields-grid">
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-admin-name">
                      Full name <span className="emp-required">*</span>
                    </label>
                    <input
                      id="csd-admin-name"
                      className="emp-input"
                      placeholder="Salon owner name"
                      value={form.adminName}
                      onChange={(event) => setForm({ ...form, adminName: event.target.value })}
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-admin-email">
                      Email <span className="emp-required">*</span>
                    </label>
                    <input
                      id="csd-admin-email"
                      type="email"
                      className="emp-input"
                      placeholder="owner@salon.lk"
                      value={form.adminEmail}
                      onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-admin-phone">
                      Phone
                    </label>
                    <input
                      id="csd-admin-phone"
                      className="emp-input"
                      placeholder="+94 77 000 0000"
                      value={form.adminPhone}
                      onChange={(event) => setForm({ ...form, adminPhone: event.target.value })}
                    />
                  </div>
                  <div className="emp-field">
                    <label className="emp-label" htmlFor="csd-admin-password">
                      Temporary password <span className="emp-required">*</span>
                    </label>
                    <input
                      id="csd-admin-password"
                      type="password"
                      className="emp-input"
                      minLength={8}
                      placeholder="Min. 8 characters"
                      value={form.adminPassword}
                      onChange={(event) => setForm({ ...form, adminPassword: event.target.value })}
                    />
                    <p className="emp-field-hint">Share securely — owner can change after first login.</p>
                  </div>
                </div>
              </section>

              <section className="csd-panel csd-panel-full">
                <div className="csd-panel-head csd-panel-head-row">
                  <div className="csd-panel-head">
                    <span className="csd-panel-icon" aria-hidden>
                      <Layers3 className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="csd-panel-title">Enabled modules</h3>
                      <p className="csd-panel-desc">Features available from day one</p>
                    </div>
                  </div>
                  <div className="csd-feature-toolbar">
                    <span className="csd-feature-count">
                      {selectedFeatures.length} / {features?.length ?? 0}
                    </span>
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary emp-btn-sm"
                      onClick={selectAllFeatures}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="emp-btn emp-btn-secondary emp-btn-sm"
                      onClick={clearFeatures}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {featuresLoading ? (
                  <p className="csd-panel-desc">Loading features…</p>
                ) : (
                  <div className="csd-feature-grid">
                    {features?.map((feature) => (
                      <label key={feature.code} className="csd-feature-card">
                        <input
                          type="checkbox"
                          checked={selectedFeatures.includes(feature.code)}
                          onChange={(event) => toggleFeature(feature.code, event.target.checked)}
                        />
                        <span className="csd-feature-card-inner">
                          <span className="csd-feature-icon">
                            <FeatureIcon feature={feature} />
                          </span>
                          <span className="csd-feature-text">
                            <span className="csd-feature-name">{feature.name}</span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          <footer className="emp-modal-footer">
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              disabled={createSalon.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button type="submit" className="emp-btn emp-btn-primary" disabled={createSalon.isPending}>
              {createSalon.isPending ? 'Creating…' : 'Create Salon'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
