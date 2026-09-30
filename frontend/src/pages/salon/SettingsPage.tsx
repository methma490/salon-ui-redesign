import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tenantApi, type PayrollSettings } from '@/api/tenant.api';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import {
  BRAND_COLOR_PRESETS,
  isValidHexColor,
  normalizeHexColor,
} from '@/lib/brand-theme';
import { resolveUploadUrl } from '@/lib/upload-url';
import { formatSriLankaDate } from '@/lib/sri-lanka-time';
import {
  FEATURE_MODULES,
  formatRoleLabel,
  moduleAccessFromRolePermissions,
  moduleAccessToPayload,
  type FeatureAccessLevel,
} from './settings-feature-modules';
import {
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsStatusBadge,
} from './salon-ops-ui';
import { toast } from 'sonner';
import './settings-page.css';

type SettingsTab = 'account' | 'business' | 'appearance' | 'subscription' | 'access' | 'payroll';

const FEATURE_ICONS: Record<string, string> = {
  CORE: '👥',
  MULTI_BRANCH: '🏢',
  CUSTOMERS: '🤝',
  APPOINTMENTS: '📅',
  SERVICES: '✂️',
  INVENTORY: '📦',
  POS: '💳',
  EXPENSES: '💰',
  PAYROLL: '💼',
};

function hasRoleManagementFeature(featureCodes: string[]): boolean {
  return (
    featureCodes.includes('STAFF_MANAGEMENT') || featureCodes.includes('ROLE_MANAGEMENT')
  );
}

const ACCESS_LABELS: Record<FeatureAccessLevel, { label: string; icon: string }> = {
  none: { label: 'No access', icon: '🚫' },
  view: { label: 'View only', icon: '👁' },
  manage: { label: 'Full access', icon: '✓' },
};

function formatDate(value: string | null | undefined) {
  return formatSriLankaDate(value);
}

function formatMoney(amount: number | string | undefined, currency = 'LKR') {
  const value = Number(amount ?? 0);
  return `${currency} ${value.toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;
}

const ROLE_ICONS: Record<string, string> = {
  SALON_ADMIN: '👑',
  CASHIER: '💳',
  STOCK_KEEPER: '📦',
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isSalonAdmin = user?.roles.includes('SALON_ADMIN') ?? false;

  const [activeTab, setActiveTab] = useState<SettingsTab>('access');
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [moduleAccessDrafts, setModuleAccessDrafts] = useState<
    Record<string, Record<string, FeatureAccessLevel>>
  >({});
  const [accountName, setAccountName] = useState('');
  const [salonForm, setSalonForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', code: '' });
  const [newRoleAccess, setNewRoleAccess] = useState<Record<string, FeatureAccessLevel>>({});
  const [payrollForm, setPayrollForm] = useState({
    employeeEpfRate: '',
    employerEpfRate: '',
    employerEtfRate: '',
    maxSalaryAdvancePercentage: '50',
  });
  const [customHex, setCustomHex] = useState('');
  const theme = useTenantTheme();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
  });

  const { data: appearanceSettings } = useQuery({
    queryKey: ['tenant-appearance'],
    queryFn: tenantApi.settings.getAppearance,
  });

  useEffect(() => {
    if (appearanceSettings?.primaryColor) {
      setCustomHex(appearanceSettings.primaryColor);
    }
  }, [appearanceSettings?.primaryColor]);

  const draftAppearanceColor = theme.previewColor ?? theme.primaryColor;

  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  const roleManagementEnabled =
    hasRoleManagementFeature(tenantFeatures) ||
    hasRoleManagementFeature((data?.features ?? []).map((f) => f.code));

  const payrollEnabled = tenantFeatures.includes('PAYROLL');

  const { data: payrollSettings } = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: tenantApi.payroll.getSettings,
    enabled: payrollEnabled,
  });

  useEffect(() => {
    if (payrollSettings) {
      setPayrollForm({
        employeeEpfRate: String(payrollSettings.employeeEpfRate),
        employerEpfRate: String(payrollSettings.employerEpfRate),
        employerEtfRate: String(payrollSettings.employerEtfRate),
        maxSalaryAdvancePercentage: String(payrollSettings.maxSalaryAdvancePercentage ?? 50),
      });
    }
  }, [payrollSettings]);

  const { data: accessControl, isLoading: accessLoading } = useQuery({
    queryKey: ['tenant-access-control'],
    queryFn: tenantApi.settings.getAccessControl,
    enabled: roleManagementEnabled,
  });

  const roleMgmtActive =
    roleManagementEnabled || accessControl?.roleManagementEnabled === true;

  useEffect(() => {
    if (!data) return;
    setAccountName(data.account.name);
    setSalonForm({
      name: data.salon.name,
      email: data.salon.email ?? '',
      phone: data.salon.phone ?? '',
    });
  }, [data]);

  const enabledFeatureCodes = useMemo(() => {
    const codes = new Set<string>(tenantFeatures);
    for (const feature of data?.features ?? []) {
      codes.add(feature.code);
    }
    for (const feature of accessControl?.enabledFeatures ?? []) {
      codes.add(feature.code);
    }
    return codes;
  }, [tenantFeatures, data?.features, accessControl?.enabledFeatures]);

  const planFeatureList = useMemo(() => {
    if (data?.features?.length) return data.features;
    if (accessControl?.enabledFeatures?.length) return accessControl.enabledFeatures;
    return [...enabledFeatureCodes].map((code) => ({
      code,
      name: code.replace(/_/g, ' '),
      description: null as string | null,
    }));
  }, [data?.features, accessControl?.enabledFeatures, enabledFeatureCodes]);

  const assignablePlanFeatures = useMemo(
    () =>
      planFeatureList.filter(
        (feature) =>
          FEATURE_MODULES.some((module) => module.code === feature.code) ||
          feature.code === 'STAFF_MANAGEMENT' ||
          feature.code === 'ROLE_MANAGEMENT' ||
          feature.code === 'REPORTS',
      ),
    [planFeatureList],
  );

  const visibleModules = useMemo(
    () =>
      FEATURE_MODULES.filter(
        (module) => module.alwaysOn || enabledFeatureCodes.has(module.code),
      ),
    [enabledFeatureCodes],
  );

  useEffect(() => {
    if (!accessControl) return;
    const accessDraftMap: Record<string, Record<string, FeatureAccessLevel>> = {};
    for (const role of accessControl.roles) {
      accessDraftMap[role.code] = moduleAccessFromRolePermissions(
        role.permissions.map((permission) => permission.code),
        visibleModules,
      );
    }
    setModuleAccessDrafts(accessDraftMap);
  }, [accessControl, visibleModules]);

  useEffect(() => {
    if (!accessControl || selectedRoleCode) return;
    if (accessControl.roles.length > 0) {
      const defaultRole =
        accessControl.roles.find((role) => role.code === 'CASHIER') ?? accessControl.roles[0];
      setSelectedRoleCode(defaultRole.code);
    }
  }, [accessControl, selectedRoleCode]);

  const invalidateAll = async () => {
    await refreshUser();
    void qc.invalidateQueries({ queryKey: ['tenant-settings'] });
    void qc.invalidateQueries({ queryKey: ['tenant-features'] });
    void qc.invalidateQueries({ queryKey: ['tenant-access-control'] });
  };

  const accountMutation = useMutation({
    mutationFn: tenantApi.settings.updateAccount,
    onSuccess: async () => {
      toast.success('Account updated successfully.');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const salonMutation = useMutation({
    mutationFn: tenantApi.settings.updateSalon,
    onSuccess: async () => {
      toast.success('Salon information updated successfully.');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logoMutation = useMutation({
    mutationFn: tenantApi.settings.uploadLogo,
    onSuccess: async () => {
      toast.success('Salon logo updated successfully.');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removeLogoMutation = useMutation({
    mutationFn: tenantApi.settings.removeLogo,
    onSuccess: async () => {
      toast.success('Salon logo removed.');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rolePermissionsMutation = useMutation({
    mutationFn: ({
      roleCode,
      moduleAccess,
    }: {
      roleCode: string;
      moduleAccess: Array<{ moduleCode: string; level: FeatureAccessLevel }>;
    }) => tenantApi.settings.updateRolePermissions(roleCode, moduleAccess),
    onSuccess: async () => {
      toast.success('Role permissions updated successfully.');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createRoleMutation = useMutation({
    mutationFn: tenantApi.settings.createRole,
    onSuccess: async (created) => {
      toast.success(`Role "${created.name}" created successfully.`);
      setCreateRoleOpen(false);
      setNewRoleForm({ name: '', description: '', code: '' });
      setNewRoleAccess({});
      setSelectedRoleCode(created.code);
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: tenantApi.settings.deleteRole,
    onSuccess: async (result) => {
      toast.success(`Role "${formatRoleLabel(result.roleCode)}" deleted.`);
      setSelectedRoleCode('');
      await invalidateAll();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const passwordMutation = useMutation({
    mutationFn: tenantApi.settings.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const payrollMutation = useMutation({
    mutationFn: (payload: Partial<PayrollSettings>) => tenantApi.payroll.updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-settings'] });
      toast.success('Payroll EPF / ETF settings saved.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const appearanceMutation = useMutation({
    mutationFn: (primaryColor: string) => tenantApi.settings.updateAppearance({ primaryColor }),
    onSuccess: (result) => {
      qc.setQueryData(['tenant-appearance'], result);
      theme.applySaved(result);
      setCustomHex(result.primaryColor);
      toast.success('Appearance updated successfully.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const resetAppearanceMutation = useMutation({
    mutationFn: () => tenantApi.settings.resetAppearance(),
    onSuccess: (result) => {
      qc.setQueryData(['tenant-appearance'], result);
      theme.applySaved(result);
      setCustomHex(result.primaryColor);
      toast.success('Appearance reset to default.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const selectedRoleDef = accessControl?.roles.find((role) => role.code === selectedRoleCode);
  const selectedModuleAccess = moduleAccessDrafts[selectedRoleCode] ?? {};
  const permissionsLocked = selectedRoleCode === 'SALON_ADMIN';

  const permissionsUnchanged = useMemo(() => {
    if (!selectedRoleDef) return true;
    const savedAccess = moduleAccessFromRolePermissions(
      selectedRoleDef.permissions.map((permission) => permission.code),
      visibleModules,
    );
    for (const module of visibleModules) {
      if ((savedAccess[module.code] ?? 'none') !== (selectedModuleAccess[module.code] ?? 'none')) {
        return false;
      }
    }
    return true;
  }, [selectedRoleDef, selectedModuleAccess, visibleModules]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    logoMutation.mutate(file);
    e.target.value = '';
  };

  const handleModuleAccessChange = (roleCode: string, moduleCode: string, level: FeatureAccessLevel) => {
    setModuleAccessDrafts((prev) => ({
      ...prev,
      [roleCode]: {
        ...(prev[roleCode] ?? {}),
        [moduleCode]: level,
      },
    }));
  };

  const saveRolePermissions = () => {
    if (!selectedRoleCode || permissionsLocked) return;
    rolePermissionsMutation.mutate({
      roleCode: selectedRoleCode,
      moduleAccess: moduleAccessToPayload(selectedModuleAccess, visibleModules),
    });
  };

  const openCreateRole = () => {
    const defaults: Record<string, FeatureAccessLevel> = {};
    for (const module of visibleModules) {
      defaults[module.code] = 'none';
    }
    setNewRoleAccess(defaults);
    setNewRoleForm({ name: '', description: '', code: '' });
    setCreateRoleOpen(true);
  };

  const submitCreateRole = () => {
    const name = newRoleForm.name.trim();
    if (!name) {
      toast.error('Role name is required.');
      return;
    }
    const moduleAccess = moduleAccessToPayload(newRoleAccess, visibleModules);
    if (moduleAccess.every((entry) => entry.level === 'none')) {
      toast.error('Grant at least one feature permission for the new role.');
      return;
    }
    createRoleMutation.mutate({
      name,
      description: newRoleForm.description.trim() || undefined,
      code: newRoleForm.code.trim() || undefined,
      moduleAccess,
    });
  };

  const canDeleteSelectedRole =
    isSalonAdmin &&
    selectedRoleDef &&
    selectedRoleDef.code !== 'SALON_ADMIN' &&
    selectedRoleDef.isSystem === false;

  if (isLoading) return <OpsLoading />;
  if (isError || !data) {
    return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const logoSrc = resolveUploadUrl(data.salon.logoUrl);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'access', label: 'Role Permissions' },
    { id: 'business', label: 'Business & Brand' },
    { id: 'appearance', label: 'Appearance' },
    ...(payrollEnabled ? [{ id: 'payroll' as const, label: 'Payroll' }] : []),
    { id: 'subscription', label: 'Subscription' },
    { id: 'account', label: 'Account & Security' },
  ];

  const appearanceDirty =
    normalizeHexColor(draftAppearanceColor) !== normalizeHexColor(theme.primaryColor);
  return (
    <div className="emp-page settings-shell">
      <header className="settings-hero">
        <div className="settings-hero-logo">
          {logoSrc ? (
            <img src={logoSrc} alt={`${data.salon.name} logo`} />
          ) : (
            <span>✂️</span>
          )}
        </div>
        <div className="settings-hero-text">
          <h1>{data.salon.name}</h1>
          <p>System settings · {data.salon.code}</p>
        </div>
        <div className="settings-hero-meta">
          <span className="settings-hero-pill">{data.subscription?.plan ?? 'No plan'}</span>
          <span className="settings-hero-pill">{data.salon.status}</span>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab ${activeTab === tab.id ? 'settings-tab-active' : ''}`}
            onClick={() => {
              if (activeTab === 'appearance' && tab.id !== 'appearance') {
                theme.setPreviewColor(null);
                setCustomHex(theme.primaryColor);
              }
              setActiveTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Role Permissions ── */}
      {activeTab === 'access' && (
        <section className="settings-panel">
          <div className="settings-panel-header settings-panel-header-row">
            <div>
              <h2>Role Permissions</h2>
              <p>
                {roleMgmtActive
                  ? isSalonAdmin
                    ? 'Your plan features are listed below. Assign each feature to roles, then set employee roles from the Employees page.'
                    : 'View role permissions configured for your salon.'
                  : 'Role creation and permission management is available on plans that include Role Management / Staff Management.'}
              </p>
            </div>
            {roleMgmtActive && isSalonAdmin && (
              <button type="button" className="emp-btn emp-btn-primary" onClick={openCreateRole}>
                + Create Role
              </button>
            )}
          </div>

          {!roleMgmtActive ? (
            <div className="settings-upgrade-panel">
              <div className="settings-upgrade-icon">🔐</div>
              <h3>Role Management is not on your plan</h3>
              <p>
                Upgrade to a plan with Role Management to create custom roles, configure permissions,
                and assign roles to employees.
              </p>
              <button
                type="button"
                className="emp-btn emp-btn-primary"
                onClick={() => setActiveTab('subscription')}
              >
                View subscription plans
              </button>
            </div>
          ) : (
            <>
              <div className="settings-plan-features-card">
                <div className="settings-plan-features-header">
                  <h3>Your plan features</h3>
                  <p>
                    {data.subscription?.plan
                      ? `${data.subscription.plan} — features you can assign to roles`
                      : 'Features included in your subscription'}
                  </p>
                </div>
                {visibleModules.length > 0 || assignablePlanFeatures.length > 0 ? (
                  <div className="settings-plan-chips">
                    {visibleModules.map((module) => (
                      <span
                        key={module.code}
                        className="settings-plan-chip"
                        title={module.description}
                      >
                        {FEATURE_ICONS[module.code] ?? '•'} {module.name}
                        {module.alwaysOn ? ' · Always on' : ''}
                      </span>
                    ))}
                    {assignablePlanFeatures
                      .filter(
                        (feature) =>
                          !FEATURE_MODULES.some((module) => module.code === feature.code),
                      )
                      .map((feature) => (
                        <span
                          key={feature.code}
                          className="settings-plan-chip"
                          title={feature.description ?? ''}
                        >
                          {feature.name}
                        </span>
                      ))}
                  </div>
                ) : (
                  <div className="settings-readonly">No plan features found for this salon.</div>
                )}
              </div>
              {isSalonAdmin && (
                <p className="settings-role-assign-hint">
                  Select a role on the left, then set None / View / Manage for each plan feature.
                  Salon Admin always keeps full access to every feature on your plan.
                </p>
              )}
            </>
          )}

          {roleMgmtActive && (accessLoading ? (
            <div className="settings-readonly">Loading role permissions…</div>
          ) : !accessControl ? (
            <div className="settings-readonly">Unable to load access control data.</div>
          ) : accessControl.roles.length === 0 ? (
            <div className="settings-access-empty">No roles found.</div>
          ) : (
            <div className="settings-access-layout">
              <div className="settings-user-list" role="listbox" aria-label="Salon roles">
                {accessControl.roles.map((role) => {
                  const active = role.code === selectedRoleCode;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`settings-user-card ${active ? 'settings-user-card-active' : ''}`}
                      onClick={() => setSelectedRoleCode(role.code)}
                    >
                      <div className="settings-user-avatar">{ROLE_ICONS[role.code] ?? '🔐'}</div>
                      <div className="settings-user-card-info">
                        <div className="settings-user-card-name">{role.name}</div>
                        {role.description && (
                          <div className="settings-user-card-email">{role.description}</div>
                        )}
                        <div className="settings-user-card-role">
                          {formatRoleLabel(role.code)}
                          {role.isSystem === false && (
                            <span className="settings-role-custom-badge">Custom</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="settings-access-detail">
                {selectedRoleDef ? (
                  <>
                    <div className="settings-access-detail-header">
                      <div>
                        <h3>{selectedRoleDef.name}</h3>
                        {selectedRoleDef.description && (
                          <div className="settings-access-detail-email">{selectedRoleDef.description}</div>
                        )}
                      </div>
                      {!permissionsUnchanged && isSalonAdmin && !permissionsLocked && (
                        <span className="settings-unsaved-badge">Unsaved changes</span>
                      )}
                    </div>

                    <div className="settings-perm-section">
                      <h4 className="settings-perm-section-title">
                        Assign plan features
                        {permissionsLocked && (
                          <span style={{ fontWeight: 500, textTransform: 'none', marginLeft: '0.5rem' }}>
                            (Salon Admin — full access to all plan features)
                          </span>
                        )}
                      </h4>
                      <div className="settings-perm-rows">
                        {visibleModules.map((module) => {
                          const access = permissionsLocked
                            ? 'manage'
                            : (selectedModuleAccess[module.code] ?? 'none');
                          const levels: FeatureAccessLevel[] = ['none', 'view', 'manage'];
                          const canEdit =
                            isSalonAdmin && !permissionsLocked && !rolePermissionsMutation.isPending;

                          return (
                            <div key={module.code} className="settings-perm-row">
                              <div className="settings-perm-row-info">
                                <div className="settings-perm-row-name">
                                  {FEATURE_ICONS[module.code] ?? '•'} {module.name}
                                </div>
                                <div className="settings-perm-row-desc">{module.description}</div>
                              </div>
                              <div
                                className="settings-perm-radio-group"
                                role="radiogroup"
                                aria-label={`${module.name} access level`}
                              >
                                {levels.map((level) => {
                                  const meta = ACCESS_LABELS[level];
                                  const isActive = access === level;
                                  return (
                                    <label
                                      key={level}
                                      className={`settings-perm-radio ${isActive ? 'settings-perm-radio-active' : ''} ${!canEdit ? 'settings-perm-radio-readonly' : ''}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`perm-${selectedRoleCode}-${module.code}`}
                                        value={level}
                                        checked={isActive}
                                        disabled={!canEdit}
                                        onChange={() =>
                                          handleModuleAccessChange(selectedRoleCode, module.code, level)
                                        }
                                      />
                                      <span className="settings-perm-radio-label">
                                        <span className="settings-perm-radio-icon">{meta.icon}</span>
                                        {meta.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isSalonAdmin && !permissionsLocked && (
                      <div className="settings-actions">
                        {canDeleteSelectedRole && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-secondary settings-btn-danger"
                            disabled={deleteRoleMutation.isPending}
                            onClick={() => {
                              if (
                                !selectedRoleCode ||
                                !window.confirm(
                                  `Delete role "${selectedRoleDef?.name}"? This cannot be undone.`,
                                )
                              ) {
                                return;
                              }
                              deleteRoleMutation.mutate(selectedRoleCode);
                            }}
                          >
                            {deleteRoleMutation.isPending ? 'Deleting…' : 'Delete Role'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="emp-btn emp-btn-primary"
                          disabled={
                            rolePermissionsMutation.isPending ||
                            permissionsUnchanged ||
                            !selectedRoleCode
                          }
                          onClick={saveRolePermissions}
                        >
                          {rolePermissionsMutation.isPending ? 'Saving…' : 'Save Role Permissions'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="settings-access-empty">Select a role to manage permissions.</div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {createRoleOpen && (
        <div
          className="settings-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setCreateRoleOpen(false)}
          role="presentation"
        >
          <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="create-role-title">
            <div className="settings-modal-header">
              <h3 id="create-role-title">Create custom role</h3>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setCreateRoleOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="settings-form-grid">
                <div className="settings-field settings-field-span-2">
                  <label htmlFor="new-role-name">Role name</label>
                  <input
                    id="new-role-name"
                    className="settings-input"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    placeholder="e.g. Receptionist"
                  />
                </div>
                <div className="settings-field settings-field-span-2">
                  <label htmlFor="new-role-desc">Description (optional)</label>
                  <input
                    id="new-role-desc"
                    className="settings-input"
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                    placeholder="What this role is for"
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="new-role-code">Code (optional)</label>
                  <input
                    id="new-role-code"
                    className="settings-input"
                    value={newRoleForm.code}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, code: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated from name"
                  />
                </div>
              </div>

              <h4 className="settings-perm-section-title" style={{ marginTop: '1.25rem' }}>
                Assign plan features
              </h4>
              <div className="settings-perm-rows">
                {visibleModules.map((module) => {
                  const access = newRoleAccess[module.code] ?? 'none';
                  const levels: FeatureAccessLevel[] = ['none', 'view', 'manage'];
                  return (
                    <div key={module.code} className="settings-perm-row">
                      <div className="settings-perm-row-info">
                        <div className="settings-perm-row-name">
                          {FEATURE_ICONS[module.code] ?? '•'} {module.name}
                        </div>
                      </div>
                      <div className="settings-perm-radio-group" role="radiogroup">
                        {levels.map((level) => {
                          const meta = ACCESS_LABELS[level];
                          const isActive = access === level;
                          return (
                            <label
                              key={level}
                              className={`settings-perm-radio ${isActive ? 'settings-perm-radio-active' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`new-role-${module.code}`}
                                value={level}
                                checked={isActive}
                                onChange={() =>
                                  setNewRoleAccess((prev) => ({ ...prev, [module.code]: level }))
                                }
                              />
                              <span className="settings-perm-radio-label">
                                <span className="settings-perm-radio-icon">{meta.icon}</span>
                                {meta.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="settings-modal-footer">
              <button
                type="button"
                className="emp-btn emp-btn-secondary"
                onClick={() => setCreateRoleOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="emp-btn emp-btn-primary"
                disabled={createRoleMutation.isPending}
                onClick={submitCreateRole}
              >
                {createRoleMutation.isPending ? 'Creating…' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      {activeTab === 'appearance' && (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <h2>Appearance</h2>
            <p>
              {isSalonAdmin
                ? 'Customize the primary brand color used across your salon workspace. Neutral backgrounds stay white.'
                : 'View-only — only Salon Admin can change appearance'}
            </p>
          </div>

          <div className="settings-appearance-layout">
            <div className="settings-appearance-controls">
              <div className="settings-field">
                <label>Brand color presets</label>
                <div className="settings-swatch-grid" role="listbox" aria-label="Brand color presets">
                  {BRAND_COLOR_PRESETS.map((preset) => {
                    const selected =
                      normalizeHexColor(draftAppearanceColor) ===
                      normalizeHexColor(preset.color);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`settings-swatch${selected ? ' is-selected' : ''}`}
                        disabled={!isSalonAdmin}
                        title={preset.label}
                        onClick={() => {
                          if (!isSalonAdmin) return;
                          theme.setPreviewColor(preset.color);
                          setCustomHex(preset.color);
                        }}
                      >
                        <span
                          className="settings-swatch-color"
                          style={{ background: preset.color }}
                        />
                        <span className="settings-swatch-label">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="settings-field">
                <label htmlFor="appearance-custom-hex">Custom color</label>
                <div className="settings-custom-color">
                  <input
                    type="color"
                    aria-label="Pick custom brand color"
                    value={
                      isValidHexColor(draftAppearanceColor)
                        ? draftAppearanceColor
                        : theme.defaultPrimaryColor
                    }
                    disabled={!isSalonAdmin}
                    onChange={(e) => {
                      const next = normalizeHexColor(e.target.value);
                      theme.setPreviewColor(next);
                      setCustomHex(next);
                    }}
                  />
                  <input
                    id="appearance-custom-hex"
                    className="settings-input"
                    value={customHex}
                    disabled={!isSalonAdmin}
                    placeholder="#0D5C3D"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCustomHex(raw);
                      if (isValidHexColor(raw)) {
                        theme.setPreviewColor(normalizeHexColor(raw));
                      }
                    }}
                  />
                </div>
                <p className="settings-field-hint">Use #RRGGBB format (example #2563EB).</p>
              </div>

              {isSalonAdmin && (
                <div className="settings-form-actions settings-appearance-actions">
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary"
                    disabled={
                      resetAppearanceMutation.isPending || appearanceMutation.isPending
                    }
                    onClick={() => {
                      theme.setPreviewColor(null);
                      setCustomHex(theme.primaryColor);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary"
                    disabled={
                      resetAppearanceMutation.isPending || appearanceMutation.isPending
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          'Reset brand color to the default forest green?',
                        )
                      ) {
                        resetAppearanceMutation.mutate();
                      }
                    }}
                  >
                    {resetAppearanceMutation.isPending ? 'Resetting…' : 'Reset to Default'}
                  </button>
                  <button
                    type="button"
                    className="emp-btn emp-btn-primary"
                    disabled={
                      !appearanceDirty ||
                      !isValidHexColor(draftAppearanceColor) ||
                      appearanceMutation.isPending
                    }
                    onClick={() =>
                      appearanceMutation.mutate(normalizeHexColor(draftAppearanceColor))
                    }
                  >
                    {appearanceMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="settings-appearance-preview">
              <div className="settings-preview-card">
                <div className="settings-preview-title">Live preview</div>
                <div className="settings-preview-nav">
                  <span className="is-active">Dashboard</span>
                  <span>POS</span>
                  <span>Customers</span>
                </div>
                <button
                  type="button"
                  className="settings-preview-btn"
                  style={{
                    background: draftAppearanceColor,
                    color: theme.palette.foreground,
                  }}
                >
                  Primary button
                </button>
                <div className="settings-preview-row">
                  <span
                    className="settings-preview-badge"
                    style={{
                      background: theme.palette.soft,
                      color: draftAppearanceColor,
                      borderColor: theme.palette.border,
                    }}
                  >
                    Brand badge
                  </span>
                  <span className="settings-preview-success">Success stays green</span>
                  <span className="settings-preview-error">Error stays red</span>
                </div>
                <input
                  className="settings-preview-input"
                  readOnly
                  value="Focus ring uses brand color"
                  style={{
                    borderColor: draftAppearanceColor,
                    boxShadow: `0 0 0 3px ${theme.palette.softStrong}`,
                  }}
                />
                <p className="settings-preview-hex">{draftAppearanceColor}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Business & Brand ── */}
      {activeTab === 'business' && (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <h2>Business & Branding</h2>
            <p>
              {isSalonAdmin
                ? 'Update salon name, logo, and contact details shown across the admin UI'
                : 'View-only — only Salon Admin can edit business information'}
            </p>
          </div>

          <div className="settings-logo-row">
            <div className="settings-logo-preview">
              {logoSrc ? (
                <img src={logoSrc} alt={`${data.salon.name} logo`} />
              ) : (
                <span className="settings-logo-placeholder">✂️</span>
              )}
            </div>
            {isSalonAdmin && (
              <div className="settings-logo-actions">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  disabled={logoMutation.isPending}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoMutation.isPending ? 'Uploading…' : 'Upload Logo'}
                </button>
                {logoSrc && (
                  <button
                    type="button"
                    className="emp-btn emp-btn-secondary"
                    disabled={removeLogoMutation.isPending}
                    onClick={() => {
                      removeLogoMutation.mutate();
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSalonAdmin) return;
              salonMutation.mutate({
                name: salonForm.name.trim(),
                email: salonForm.email.trim() || undefined,
                phone: salonForm.phone.trim() || undefined,
              });
            }}
          >
            <div className="settings-meta-row">
              <div className="settings-field">
                <label className="emp-label">Salon code</label>
                <div className="settings-readonly">{data.salon.code}</div>
              </div>
              <div className="settings-field">
                <label className="emp-label">Status</label>
                <div className="settings-readonly">
                  <OpsStatusBadge status={data.salon.status} />
                </div>
              </div>
            </div>

            <div className="settings-two-col">
              <div className="settings-field">
                <label className="emp-label" htmlFor="salon-name">
                  Salon name
                </label>
                <input
                  id="salon-name"
                  className="emp-input"
                  value={salonForm.name}
                  onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })}
                  disabled={!isSalonAdmin}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="salon-phone">
                  Business phone
                </label>
                <input
                  id="salon-phone"
                  className="emp-input"
                  value={salonForm.phone}
                  onChange={(e) => setSalonForm({ ...salonForm, phone: e.target.value })}
                  disabled={!isSalonAdmin}
                  placeholder="0771234567"
                />
              </div>
            </div>

            <div className="settings-field">
              <label className="emp-label" htmlFor="salon-email">
                Business email
              </label>
              <input
                id="salon-email"
                type="email"
                className="emp-input"
                value={salonForm.email}
                onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })}
                disabled={!isSalonAdmin}
                placeholder="salon@example.com"
              />
            </div>

            {isSalonAdmin && (
              <div className="settings-actions">
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  disabled={salonMutation.isPending}
                >
                  {salonMutation.isPending ? 'Saving…' : 'Save Business Info'}
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* ── Payroll ── */}
      {activeTab === 'payroll' && payrollEnabled && (
        <section className="settings-panel">
          <div className="settings-panel-header">
            <h2>Payroll & Statutory Settings</h2>
            <p>
              {isSalonAdmin
                ? 'Default statutory contribution percentages and salary advance limits used across payroll'
                : 'View-only — only Salon Admin can edit payroll rates'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSalonAdmin) return;
              payrollMutation.mutate({
                employeeEpfRate: Number(payrollForm.employeeEpfRate),
                employerEpfRate: Number(payrollForm.employerEpfRate),
                employerEtfRate: Number(payrollForm.employerEtfRate),
                maxSalaryAdvancePercentage: Number(payrollForm.maxSalaryAdvancePercentage),
              });
            }}
          >
            <div className="settings-form-grid">
              <div className="settings-field">
                <label className="emp-label" htmlFor="settings-emp-epf">
                  Employee EPF %
                </label>
                <input
                  id="settings-emp-epf"
                  className="settings-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payrollForm.employeeEpfRate}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, employeeEpfRate: e.target.value })
                  }
                  disabled={!isSalonAdmin}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="settings-er-epf">
                  Employer EPF %
                </label>
                <input
                  id="settings-er-epf"
                  className="settings-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payrollForm.employerEpfRate}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, employerEpfRate: e.target.value })
                  }
                  disabled={!isSalonAdmin}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="settings-er-etf">
                  Employer ETF %
                </label>
                <input
                  id="settings-er-etf"
                  className="settings-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payrollForm.employerEtfRate}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, employerEtfRate: e.target.value })
                  }
                  disabled={!isSalonAdmin}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="settings-max-advance">
                  Max Salary Advance Percentage (%)
                </label>
                <input
                  id="settings-max-advance"
                  className="settings-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payrollForm.maxSalaryAdvancePercentage}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      maxSalaryAdvancePercentage: e.target.value,
                    })
                  }
                  disabled={!isSalonAdmin}
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--emp-muted, #64748b)', marginTop: 4 }}>
                  Sets the maximum percentage of basic salary an employee can request as a salary advance.
                </p>
              </div>
            </div>

            {isSalonAdmin && (
              <div className="settings-actions">
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  disabled={payrollMutation.isPending}
                >
                  {payrollMutation.isPending ? 'Saving…' : 'Save Payroll Settings'}
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* ── Subscription ── */}
      {activeTab === 'subscription' && (
        <section className="settings-panel">
          <div className="settings-panel-header settings-panel-header-row">
            <div>
              <h2>Subscription & Features</h2>
              <p>Your active plan and enabled modules for this salon</p>
            </div>
            {isSalonAdmin && (
              <Link to="/salon/subscription" className="emp-link-btn">
                Manage billing →
              </Link>
            )}
          </div>

          {data.subscription ? (
            <div className="settings-plan-banner">
              <div className="settings-plan-banner-main">
                <p className="settings-plan-banner-name">{data.subscription.plan}</p>
                <div className="settings-plan-banner-price">
                  {formatMoney(data.subscription.price, data.subscription.currency)} / billing period
                </div>
                <div className="settings-plan-banner-meta">
                  <span>
                    <OpsStatusBadge status={data.subscription.status} />
                  </span>
                  <span>
                    {formatDate(data.subscription.startDate)} — {formatDate(data.subscription.endDate)}
                  </span>
                  <span>Code: {data.subscription.planCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-readonly" style={{ marginBottom: '1.25rem' }}>
              No active subscription found.
            </div>
          )}

          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>
            Enabled features
          </h3>
          {data.features.length > 0 ? (
            <div className="settings-feature-grid">
              {data.features.map((feature) => (
                <div key={feature.code} className="settings-feature-tile">
                  <span className="settings-feature-tile-icon">
                    {FEATURE_ICONS[feature.code] ?? '✓'}
                  </span>
                  <div>
                    <div className="settings-feature-tile-name">{feature.name}</div>
                    {feature.description && (
                      <div className="settings-feature-tile-desc">{feature.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-readonly">No features enabled yet.</div>
          )}
        </section>
      )}

      {/* ── Account & Security ── */}
      {activeTab === 'account' && (
        <div className="settings-two-col">
          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>My Account</h2>
              <p>Your login profile</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                accountMutation.mutate({ name: accountName.trim() });
              }}
            >
              <div className="settings-field">
                <label className="emp-label" htmlFor="account-name">
                  Display name
                </label>
                <input
                  id="account-name"
                  className="emp-input"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="emp-label">Email</label>
                <div className="settings-readonly">{data.account.email}</div>
              </div>
              <div className="settings-field">
                <label className="emp-label">Your roles</label>
                <div>
                  {data.account.roles.map((role) => (
                    <span key={role.code} className="settings-role-badge">
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="settings-actions">
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  disabled={accountMutation.isPending}
                >
                  {accountMutation.isPending ? 'Saving…' : 'Save Account'}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <h2>Change Password</h2>
              <p>Update your login password</p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="settings-field">
                <label className="emp-label" htmlFor="current-password">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  className="emp-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="emp-input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="settings-field">
                <label className="emp-label" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="emp-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="settings-actions">
                <button
                  type="submit"
                  className="emp-btn emp-btn-primary"
                  disabled={passwordMutation.isPending}
                >
                  {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
