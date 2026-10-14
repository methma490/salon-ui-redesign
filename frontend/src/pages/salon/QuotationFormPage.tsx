import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tenantApi, type Customer, type Service } from '@/api/tenant.api';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import {
  FormError,
  FormSubmit,
  FormTextarea,
  getErrorMessage,
  OpsError,
  OpsLoading,
  OpsPageHeader,
  SimpleForm,
} from './salon-ops-ui';
import { formatMoneyAmount, formatMoneyLkr, moneyHeader } from '@/lib/money';
import { formatSriLankaDate, sriLankaTodayIso } from '@/lib/sri-lanka-time';
import './employees-page.css';

function todayIso() {
  return sriLankaTodayIso();
}

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type Line = {
  key: string;
  serviceId: string;
  name: string;
  masterPrice: number;
  quantity: string;
  quotationUnitPrice: string;
  employeeId: string;
};

export default function QuotationFormPage() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { branchId: ribbonBranchId } = useSalonBranch();

  const [error, setError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(customerSearch, 400, 2);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [branchId, setBranchId] = useState(() => (ribbonBranchId !== 'all' ? ribbonBranchId : ''));
  const [quotationDate, setQuotationDate] = useState(todayIso());
  const [validUntil, setValidUntil] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [servicePick, setServicePick] = useState('');

  useEffect(() => {
    if (!isEdit && ribbonBranchId && ribbonBranchId !== 'all' && !branchId) {
      setBranchId(ribbonBranchId);
    }
  }, [isEdit, ribbonBranchId, branchId]);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => tenantApi.services.list(),
  });

  const existingQuery = useQuery({
    queryKey: ['quotation', editId],
    queryFn: () => tenantApi.quotations.get(editId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!branches.length || branchId) return;
    const main = branches.find((b) => b.isMain) ?? branches[0];
    if (main) setBranchId(main.id);
  }, [branches, branchId]);

  useEffect(() => {
    const detail = existingQuery.data;
    if (!detail || !isEdit) return;
    setBranchId(detail.branchId);
    setQuotationDate(detail.quotationDate?.slice(0, 10) || todayIso());
    setValidUntil(detail.validUntil?.slice(0, 10) || '');
    setDiscountAmount(String(detail.discountAmount ?? 0));
    setCustomerNotes(detail.customerNotes || '');
    setInternalNotes(detail.internalNotes || '');
    setSelectedCustomer({
      id: detail.customerId,
      code: '',
      name: detail.customerName,
      phone: detail.customerPhone,
      email: null,
      birthday: null,
      notes: null,
      status: 'ACTIVE',
      createdAt: detail.createdAt,
    });
    setLines(
      detail.items.map((item, index) => ({
        key: item.id || `${item.serviceId}-${index}`,
        serviceId: item.serviceId || '',
        name: item.descriptionSnapshot,
        masterPrice: item.originalServicePrice,
        quantity: String(item.quantity),
        quotationUnitPrice: String(item.quotationUnitPrice),
        employeeId: item.employeeId || '',
      })),
    );
  }, [existingQuery.data, isEdit]);

  const customersQuery = useQuery({
    queryKey: ['quotation-customers-search', debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '20' };
      if (debouncedSearch) params.search = debouncedSearch;
      // Prefer search endpoint; fall back to list if needed
      try {
        return await tenantApi.customers.search(params);
      } catch {
        return tenantApi.customers.list(params);
      }
    },
    enabled: !selectedCustomer,
  });

  const customers = Array.isArray(customersQuery.data) ? customersQuery.data : [];

  const { data: performers = [] } = useQuery({
    queryKey: ['pos-performers', branchId],
    queryFn: async () => {
      const res = await tenantApi.pos.getPerformers({ branchId });
      return Array.isArray(res?.performers) ? res.performers : [];
    },
    enabled: !!branchId,
  });

  const branchName = branches.find((b) => b.id === branchId)?.name || '—';

  const totals = useMemo(() => {
    const subtotal = roundMoney(
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.quotationUnitPrice) || 0;
        return sum + qty * price;
      }, 0),
    );
    const discount = roundMoney(Number(discountAmount) || 0);
    return { subtotal, discount, total: roundMoney(Math.max(0, subtotal - discount)) };
  }, [lines, discountAmount]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? tenantApi.quotations.update(editId!, payload)
        : tenantApi.quotations.create(payload),
    onSuccess: (data: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['quotation', editId] });
      setPreviewOpen(false);
      navigate(`/salon/quotations/${data.id || editId}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const addService = (service: Service) => {
    setLines((prev) => [
      ...prev,
      {
        key: `${service.id}-${Date.now()}`,
        serviceId: service.id,
        name: service.name,
        masterPrice: service.price,
        quantity: '1',
        quotationUnitPrice: String(service.price),
        employeeId: '',
      },
    ]);
  };

  const buildPayload = () => ({
    branchId,
    customerId: selectedCustomer!.id,
    quotationDate,
    validUntil: validUntil || undefined,
    discountAmount: Number(discountAmount) || 0,
    customerNotes: customerNotes || undefined,
    internalNotes: internalNotes || undefined,
    status: (isEdit && existingQuery.data?.status === 'SENT' ? 'SENT' : 'DRAFT') as 'DRAFT' | 'SENT',
    items: lines.map((line) => ({
      serviceId: line.serviceId,
      quantity: Number(line.quantity),
      quotationUnitPrice: Number(line.quotationUnitPrice),
      employeeId: line.employeeId || undefined,
    })),
  });

  const openPreview = () => {
    setError(null);
    if (!branchId) {
      setError('Please select a branch');
      return;
    }
    if (!selectedCustomer) {
      setError('Please search and select a customer from the list');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one service');
      return;
    }
    if (lines.some((l) => !l.serviceId)) {
      setError('Each line must have a valid service');
      return;
    }
    setPreviewOpen(true);
  };

  if (isEdit && existingQuery.isLoading) return <OpsLoading />;
  if (isEdit && (existingQuery.isError || !existingQuery.data)) {
    return (
      <OpsError
        message={getErrorMessage(existingQuery.error)}
        onRetry={() => void existingQuery.refetch()}
      />
    );
  }

  if (isEdit && existingQuery.data && !['DRAFT', 'SENT'].includes(existingQuery.data.status)) {
    return (
      <div className="emp-page">
        <OpsPageHeader title="Cannot edit" subtitle="Only draft or sent quotations can be edited" />
        <Button asChild>
          <Link to={`/salon/quotations/${editId}`}>Back to quotation</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <OpsPageHeader
        title={isEdit ? `Edit ${existingQuery.data?.quotationNo || 'Quotation'}` : 'New Quotation'}
        subtitle="Select a customer, override prices if needed, then preview before saving"
        action={
          <Button asChild variant="outline">
            <Link to={isEdit ? `/salon/quotations/${editId}` : '/salon/quotations'}>Back</Link>
          </Button>
        }
      />

      <div className="emp-panel">
        <div className="emp-form-panel">
          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              openPreview();
            }}
          >
            <FormError message={error} />
            <div className="emp-form-grid">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchId || undefined} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quotation Date</Label>
                <Input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setQuotationDate(newDate);
                    if (validUntil && newDate && validUntil < newDate) {
                      setValidUntil(newDate);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  min={quotationDate}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount (LKR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2" style={{ marginTop: 16 }}>
              <Label>Customer</Label>
              {selectedCustomer ? (
                <div
                  className="emp-card"
                  style={{
                    marginBottom: 8,
                    padding: 12,
                    border: '1px solid var(--emp-border, #e2e8f0)',
                    borderRadius: 8,
                  }}
                >
                  <div className="emp-name-cell">{selectedCustomer.name}</div>
                  <div className="emp-code" style={{ marginTop: 4 }}>
                    Phone / WhatsApp: {selectedCustomer.phone || '—'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                  >
                    Change customer
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    type="search"
                    placeholder="Search by customer name or phone…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoComplete="off"
                  />
                  <p style={{ fontSize: 12, color: 'var(--emp-muted)', marginTop: 4 }}>
                    Type a name or phone, then click <strong>Select</strong> on a result.
                  </p>
                  {customersQuery.isLoading && (
                    <div className="emp-empty" style={{ marginTop: 8 }}>
                      Searching customers…
                    </div>
                  )}
                  {customersQuery.isError && (
                    <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>
                      Could not load customers: {getErrorMessage(customersQuery.error)}
                    </div>
                  )}
                  {!customersQuery.isLoading && !customersQuery.isError && (
                    <div
                      className="emp-table-wrap"
                      style={{
                        marginTop: 8,
                        maxHeight: 220,
                        overflow: 'auto',
                        border: '1px solid var(--emp-border, #e2e8f0)',
                        borderRadius: 8,
                      }}
                    >
                      {customers.length === 0 ? (
                        <div className="emp-empty" style={{ padding: 16 }}>
                          {debouncedSearch
                            ? `No customers found for “${debouncedSearch}”.`
                            : 'No customers yet. Add a customer first, then return here.'}
                        </div>
                      ) : (
                        <table className="emp-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Phone</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {customers.map((c) => (
                              <tr key={c.id}>
                                <td className="emp-name-cell">{c.name}</td>
                                <td>{c.phone || '—'}</td>
                                <td>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCustomer(c);
                                      setCustomerSearch('');
                                      setError(null);
                                    }}
                                  >
                                    Select
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h3 className="emp-form-panel-title">Services</h3>
              <Select
                value={servicePick || undefined}
                onValueChange={(id) => {
                  const svc = services.find((s) => s.id === id);
                  if (svc) addService(svc);
                  setServicePick('');
                }}
              >
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="Add service…" />
                </SelectTrigger>
                <SelectContent>
                  {services
                    .filter((s) => s.status === 'ACTIVE')
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {formatMoneyLkr(s.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="emp-table-wrap" style={{ marginTop: 12 }}>
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Qty</th>
                      <th>{moneyHeader('Master')}</th>
                      <th>{moneyHeader('Quote Price')}</th>
                      <th>Employee</th>
                      <th>{moneyHeader('Total')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="emp-empty">
                          No services added yet.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line) => {
                        const lineTotal = roundMoney(
                          (Number(line.quantity) || 0) * (Number(line.quotationUnitPrice) || 0),
                        );
                        return (
                          <tr key={line.key}>
                            <td className="emp-name-cell">{line.name}</td>
                            <td>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={line.quantity}
                                onChange={(e) =>
                                  setLines((prev) =>
                                    prev.map((l) =>
                                      l.key === line.key
                                        ? { ...l, quantity: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                                className="w-[80px]"
                              />
                            </td>
                            <td>{formatMoneyAmount(line.masterPrice)}</td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.quotationUnitPrice}
                                onChange={(e) =>
                                  setLines((prev) =>
                                    prev.map((l) =>
                                      l.key === line.key
                                        ? { ...l, quotationUnitPrice: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                                className="w-[110px]"
                              />
                            </td>
                            <td>
                              <Select
                                value={line.employeeId || undefined}
                                onValueChange={(v) =>
                                  setLines((prev) =>
                                    prev.map((l) =>
                                      l.key === line.key ? { ...l, employeeId: v } : l,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Optional" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Array.isArray(performers) ? performers : []).map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td>{formatMoneyAmount(lineTotal)}</td>
                            <td>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLines((prev) => prev.filter((l) => l.key !== line.key))
                                }
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="emp-stats" style={{ marginTop: 16 }}>
              <div className="emp-stat">
                <div className="emp-stat-value">{formatMoneyLkr(totals.subtotal)}</div>
                <div className="emp-stat-label">Subtotal</div>
              </div>
              <div className="emp-stat">
                <div className="emp-stat-value">{formatMoneyLkr(totals.discount)}</div>
                <div className="emp-stat-label">Discount</div>
              </div>
              <div className="emp-stat">
                <div className="emp-stat-value">{formatMoneyLkr(totals.total)}</div>
                <div className="emp-stat-label">Total</div>
              </div>
            </div>

            <div className="emp-form-grid" style={{ marginTop: 16 }}>
              <div className="space-y-2">
                <Label>Customer Notes</Label>
                <FormTextarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Internal Notes (never shown to customer)</Label>
                <FormTextarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Button type="button" variant="outline" onClick={openPreview}>
                Preview
              </Button>
              <FormSubmit pending={false}>Preview &amp; Save</FormSubmit>
            </div>
          </SimpleForm>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview quotation</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 13, color: 'var(--emp-muted)' }}>
            Review before saving. You can go back and edit anything, then save.
          </p>
          <FormError message={error} />
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 16,
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>{branchName}</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>
                <strong>Customer:</strong> {selectedCustomer?.name}
              </div>
              <div>
                <strong>Phone:</strong> {selectedCustomer?.phone || '—'}
              </div>
              <div>
                <strong>Date:</strong> {formatSriLankaDate(quotationDate)}
                {validUntil ? ` · Valid until ${formatSriLankaDate(validUntil)}` : ''}
              </div>
            </div>
            <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 6 }}>
                    Service
                  </th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 6 }}>
                    Qty
                  </th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 6 }}>
                    {moneyHeader('Price')}
                  </th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: 6 }}>
                    {moneyHeader('Total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTotal = roundMoney(
                    (Number(line.quantity) || 0) * (Number(line.quotationUnitPrice) || 0),
                  );
                  return (
                    <tr key={line.key}>
                      <td style={{ padding: 6 }}>{line.name}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{line.quantity}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>
                        {formatMoneyAmount(Number(line.quotationUnitPrice) || 0)}
                      </td>
                      <td style={{ padding: 6, textAlign: 'right' }}>
                        {formatMoneyAmount(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16 }}>
              Total: {formatMoneyLkr(totals.total)}
            </div>
            {customerNotes ? (
              <p style={{ marginTop: 8, fontSize: 13 }}>
                <strong>Notes:</strong> {customerNotes}
              </p>
            ) : null}
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Edit
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => {
                setError(null);
                saveMutation.mutate(buildPayload());
              }}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Save quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
