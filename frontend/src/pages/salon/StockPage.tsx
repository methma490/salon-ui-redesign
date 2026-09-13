import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMemo, useState } from 'react';

import { tenantApi } from '@/api/tenant.api';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from '@/components/ui/select';

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

import './employees-page.css';



type Tab = 'levels' | 'stock-in' | 'adjustment' | 'movements';



const LOW_STOCK_THRESHOLD = 5;



function qtyBadgeClass(qty: number) {

  if (qty <= 0) return 'emp-qty-badge emp-qty-badge-out';

  if (qty <= LOW_STOCK_THRESHOLD) return 'emp-qty-badge emp-qty-badge-low';

  return 'emp-qty-badge emp-qty-badge-ok';

}



function movementTypeClass(type: string) {

  const t = type.toUpperCase();

  if (t.includes('IN') || t === 'STOCK_IN') return 'emp-type-badge emp-type-in';

  if (t.includes('SALE')) return 'emp-type-badge emp-type-sale';

  if (t.includes('ADJUST')) return 'emp-type-badge emp-type-adjust';

  return 'emp-type-badge emp-type-out';

}



export default function StockPage() {

  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('levels');

  const [branchId, setBranchId] = useState<string>('all');

  const [formError, setFormError] = useState<string | null>(null);



  const { data: branches = [] } = useQuery({

    queryKey: ['branches'],

    queryFn: tenantApi.branches.list,

  });



  const { data: products = [] } = useQuery({

    queryKey: ['products'],

    queryFn: () => tenantApi.products.list(),

  });



  const {

    data: stockLevels = [],

    isLoading: levelsLoading,

    isError: levelsError,

    error: levelsQueryError,

    refetch: refetchLevels,

  } = useQuery({

    queryKey: ['stock-levels', branchId],

    queryFn: () => tenantApi.stock.list(branchId === 'all' ? undefined : branchId),

    enabled: tab === 'levels',

  });



  const {

    data: movements = [],

    isLoading: movementsLoading,

    isError: movementsError,

    error: movementsQueryError,

    refetch: refetchMovements,

  } = useQuery({

    queryKey: ['stock-movements', branchId],

    queryFn: () => tenantApi.stock.movements(branchId === 'all' ? undefined : { branchId }),

    enabled: tab === 'movements',

  });



  const [stockInForm, setStockInForm] = useState({

    branchId: '',

    productId: '',

    quantity: '',

    notes: '',

  });



  const [adjustForm, setAdjustForm] = useState({

    branchId: '',

    productId: '',

    quantity: '',

    notes: '',

  });



  const stockInMutation = useMutation({

    mutationFn: tenantApi.stock.stockIn,

    onSuccess: () => {

      qc.invalidateQueries({ queryKey: ['stock-levels'] });

      qc.invalidateQueries({ queryKey: ['stock-movements'] });

      setStockInForm({ branchId: '', productId: '', quantity: '', notes: '' });

      setFormError(null);

      setTab('levels');

    },

    onError: (err) => setFormError(getErrorMessage(err)),

  });



  const adjustMutation = useMutation({

    mutationFn: tenantApi.stock.adjustment,

    onSuccess: () => {

      qc.invalidateQueries({ queryKey: ['stock-levels'] });

      qc.invalidateQueries({ queryKey: ['stock-movements'] });

      setAdjustForm({ branchId: '', productId: '', quantity: '', notes: '' });

      setFormError(null);

      setTab('levels');

    },

    onError: (err) => setFormError(getErrorMessage(err)),

  });



  const stats = useMemo(() => {

    const low = stockLevels.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD).length;

    const totalQty = stockLevels.reduce((sum, s) => sum + s.quantity, 0);

    return {

      skus: stockLevels.length,

      totalQty,

      low,

    };

  }, [stockLevels]);



  const tabs: { id: Tab; label: string; icon: string }[] = [

    { id: 'levels', label: 'Stock Levels', icon: '📊' },

    { id: 'stock-in', label: 'Stock In', icon: '📥' },

    { id: 'adjustment', label: 'Adjustment', icon: '⚖️' },

    { id: 'movements', label: 'Movements', icon: '📋' },

  ];



  const listLoading = tab === 'levels' ? levelsLoading : tab === 'movements' ? movementsLoading : false;

  const listError =

    tab === 'levels' ? levelsError : tab === 'movements' ? movementsError : false;

  const listQueryError =

    tab === 'levels' ? levelsQueryError : tab === 'movements' ? movementsQueryError : null;



  if (listLoading && (tab === 'levels' || tab === 'movements')) return <OpsLoading />;

  if (listError && (tab === 'levels' || tab === 'movements'))

    return (

      <OpsError

        message={getErrorMessage(listQueryError)}

        onRetry={() => void (tab === 'levels' ? refetchLevels() : refetchMovements())}

      />

    );



  return (

    <div className="emp-page">

      <OpsPageHeader

        title="Inventory"

        subtitle="Track stock levels, receive stock, and review movement history"

      />



      {tab === 'levels' && (

        <div className="emp-stats">

          <div className="emp-stat">

            <div className="emp-stat-value">{stats.skus}</div>

            <div className="emp-stat-label">SKUs in stock</div>

          </div>

          <div className="emp-stat">

            <div className="emp-stat-value">{stats.totalQty}</div>

            <div className="emp-stat-label">Total units</div>

          </div>

          <div className="emp-stat">

            <div className="emp-stat-value">{stats.low}</div>

            <div className="emp-stat-label">Low stock</div>

          </div>

        </div>

      )}



      <div className="emp-tabs" role="tablist" aria-label="Inventory sections">

        {tabs.map((t) => (

          <button

            key={t.id}

            type="button"

            role="tab"

            aria-selected={tab === t.id}

            className={`emp-tab ${tab === t.id ? 'emp-tab-active' : ''}`}

            onClick={() => {

              setFormError(null);

              setTab(t.id);

            }}

          >

            {t.icon} {t.label}

          </button>

        ))}

      </div>



      {(tab === 'levels' || tab === 'movements') && (

        <div className="emp-toolbar">

          <div className="emp-toolbar-filters">

            <Select value={branchId} onValueChange={setBranchId}>

              <SelectTrigger className="emp-select w-full sm:w-[200px]">

                <SelectValue placeholder="All branches" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All Branches</SelectItem>

                {branches.map((b) => (

                  <SelectItem key={b.id} value={b.id}>

                    {b.name}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <span style={{ fontSize: '0.8125rem', color: 'var(--emp-muted)' }}>

            {tab === 'levels'

              ? `${stockLevels.length} record${stockLevels.length === 1 ? '' : 's'}`

              : `${movements.length} movement${movements.length === 1 ? '' : 's'}`}

          </span>

        </div>

      )}



      {tab === 'levels' && (

        <div className="emp-panel">

          <div className="emp-panel-header">

            <div>

              <h2 className="emp-panel-title">Current Stock Levels</h2>

              <p className="emp-panel-desc">Products with quantity at or below {LOW_STOCK_THRESHOLD} are flagged</p>

            </div>

          </div>



          {stockLevels.length === 0 ? (

            <div className="emp-empty">No stock records yet. Use Stock In to add inventory.</div>

          ) : (

            <>

              <div className="emp-cards">

                {stockLevels.map((item) => (

                  <article key={item.id} className="emp-card">

                    <div className="emp-card-top">

                      <div>

                        <div className="emp-name-cell">{item.productName}</div>

                        <div className="emp-code">{item.productCode}</div>

                      </div>

                      <span className={qtyBadgeClass(item.quantity)}>{item.quantity}</span>

                    </div>

                    <div className="emp-card-meta">

                      <span>

                        <strong>Branch:</strong> {item.branchName}

                      </span>

                    </div>

                  </article>

                ))}

              </div>



              <div className="emp-table-wrap">

                <table className="emp-table">

                  <thead>

                    <tr>

                      <th>Branch</th>

                      <th>Product</th>

                      <th>Code</th>

                      <th>Quantity</th>

                    </tr>

                  </thead>

                  <tbody>

                    {stockLevels.map((item) => (

                      <tr key={item.id}>

                        <td>{item.branchName}</td>

                        <td className="emp-name-cell">{item.productName}</td>

                        <td className="emp-code">{item.productCode}</td>

                        <td>

                          <span className={qtyBadgeClass(item.quantity)}>{item.quantity}</span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </>

          )}

        </div>

      )}



      {tab === 'stock-in' && (

        <div className="emp-panel">

          <div className="emp-form-panel">

            <h2 className="emp-form-panel-title">Stock In</h2>

            <p className="emp-form-panel-desc">Record new stock received at a branch.</p>

            <SimpleForm

              onSubmit={(e) => {

                e.preventDefault();

                setFormError(null);

                stockInMutation.mutate({

                  branchId: stockInForm.branchId,

                  productId: stockInForm.productId,

                  quantity: Number(stockInForm.quantity),

                  notes: stockInForm.notes || undefined,

                });

              }}

            >

              <FormError message={formError} />

              <div className="emp-form-grid">

                <div className="space-y-2">

                  <Label>Branch</Label>

                  <Select

                    value={stockInForm.branchId}

                    onValueChange={(v) => setStockInForm({ ...stockInForm, branchId: v })}

                  >

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

                  <Label>Product</Label>

                  <Select

                    value={stockInForm.productId}

                    onValueChange={(v) => setStockInForm({ ...stockInForm, productId: v })}

                  >

                    <SelectTrigger>

                      <SelectValue placeholder="Select product" />

                    </SelectTrigger>

                    <SelectContent>

                      {products.map((p) => (

                        <SelectItem key={p.id} value={p.id}>

                          {p.name}

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                </div>

                <div className="space-y-2">

                  <Label htmlFor="stock-in-qty">Quantity</Label>

                  <Input

                    id="stock-in-qty"

                    type="number"

                    min="0.01"

                    step="0.01"

                    value={stockInForm.quantity}

                    onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}

                    placeholder="0"

                    required

                  />

                </div>

                <div className="space-y-2">

                  <Label htmlFor="stock-in-notes">Notes</Label>

                  <FormTextarea

                    id="stock-in-notes"

                    value={stockInForm.notes}

                    onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}

                    placeholder="Optional"

                    rows={2}

                  />

                </div>

              </div>

              <FormSubmit

                pending={stockInMutation.isPending}

                disabled={!stockInForm.branchId || !stockInForm.productId}

              >

                Record Stock In

              </FormSubmit>

            </SimpleForm>

          </div>

        </div>

      )}



      {tab === 'adjustment' && (

        <div className="emp-panel">

          <div className="emp-form-panel">

            <h2 className="emp-form-panel-title">Stock Adjustment</h2>

            <p className="emp-form-panel-desc">

              Use positive values to increase stock, negative values to decrease (e.g. damage or

              correction).

            </p>

            <SimpleForm

              onSubmit={(e) => {

                e.preventDefault();

                setFormError(null);

                adjustMutation.mutate({

                  branchId: adjustForm.branchId,

                  productId: adjustForm.productId,

                  quantity: Number(adjustForm.quantity),

                  notes: adjustForm.notes || undefined,

                });

              }}

            >

              <FormError message={formError} />

              <div className="emp-form-grid">

                <div className="space-y-2">

                  <Label>Branch</Label>

                  <Select

                    value={adjustForm.branchId}

                    onValueChange={(v) => setAdjustForm({ ...adjustForm, branchId: v })}

                  >

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

                  <Label>Product</Label>

                  <Select

                    value={adjustForm.productId}

                    onValueChange={(v) => setAdjustForm({ ...adjustForm, productId: v })}

                  >

                    <SelectTrigger>

                      <SelectValue placeholder="Select product" />

                    </SelectTrigger>

                    <SelectContent>

                      {products.map((p) => (

                        <SelectItem key={p.id} value={p.id}>

                          {p.name}

                        </SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                </div>

                <div className="space-y-2">

                  <Label htmlFor="adjust-qty">Adjustment quantity</Label>

                  <Input

                    id="adjust-qty"

                    type="number"

                    step="0.01"

                    value={adjustForm.quantity}

                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}

                    placeholder="+ or −"

                    required

                  />

                </div>

                <div className="space-y-2">

                  <Label htmlFor="adjust-notes">Notes</Label>

                  <FormTextarea

                    id="adjust-notes"

                    value={adjustForm.notes}

                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}

                    placeholder="Reason for adjustment"

                    rows={2}

                  />

                </div>

              </div>

              <FormSubmit

                pending={adjustMutation.isPending}

                disabled={!adjustForm.branchId || !adjustForm.productId}

              >

                Apply Adjustment

              </FormSubmit>

            </SimpleForm>

          </div>

        </div>

      )}



      {tab === 'movements' && (

        <div className="emp-panel">

          <div className="emp-panel-header">

            <div>

              <h2 className="emp-panel-title">Movement History</h2>

              <p className="emp-panel-desc">All stock in, adjustments, and POS sales deductions</p>

            </div>

          </div>



          {movements.length === 0 ? (

            <div className="emp-empty">No movements recorded for this filter.</div>

          ) : (

            <>

              <div className="emp-cards">

                {movements.map((m) => (

                  <article key={m.id} className="emp-card">

                    <div className="emp-card-top">

                      <div>

                        <div className="emp-name-cell">{m.productName}</div>

                        <div className="emp-code">{new Date(m.createdAt).toLocaleString()}</div>

                      </div>

                      <span className={movementTypeClass(m.type)}>{m.type}</span>

                    </div>

                    <div className="emp-card-meta">

                      <span>

                        <strong>Branch:</strong> {m.branchName}

                      </span>

                      <span>

                        <strong>Qty:</strong> {m.quantity}

                      </span>

                      {m.notes && (

                        <span>

                          <strong>Notes:</strong> {m.notes}

                        </span>

                      )}

                    </div>

                  </article>

                ))}

              </div>



              <div className="emp-table-wrap">

                <table className="emp-table">

                  <thead>

                    <tr>

                      <th>Date</th>

                      <th>Branch</th>

                      <th>Product</th>

                      <th>Type</th>

                      <th>Quantity</th>

                      <th>Notes</th>

                    </tr>

                  </thead>

                  <tbody>

                    {movements.map((m) => (

                      <tr key={m.id}>

                        <td>{new Date(m.createdAt).toLocaleString()}</td>

                        <td>{m.branchName}</td>

                        <td className="emp-name-cell">{m.productName}</td>

                        <td>

                          <span className={movementTypeClass(m.type)}>{m.type}</span>

                        </td>

                        <td>{m.quantity}</td>

                        <td>{m.notes || '—'}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </>

          )}

        </div>

      )}

    </div>

  );

}

