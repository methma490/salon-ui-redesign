import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  auditLogsApi,
  type GetAuditLogsParams,
  type SuperAdminAuditLogItem,
} from '@/features/super-admin/api/audit-logs.api';
import {
  AdminEmpty,
  AdminPageHero,
  AdminPagination,
  AdminPanel,
  AdminStatCard,
} from '@/pages/super-admin/billing/AdminBillingUi';
import { OpsError, OpsLoading } from '@/pages/salon/salon-ops-ui';

function JsonView({ data, label }: { data: any; label: string }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mt-2 rounded bg-muted/40 p-2.5 font-mono text-xs">
      <div className="mb-1 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
        {label}
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  let color = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('REMOVE')) {
    color = 'bg-red-500/10 text-red-500 border-red-500/20';
  } else if (action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('CONFIRM')) {
    color = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  } else if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('EXTEND')) {
    color = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {action}
    </span>
  );
}

function AuditLogRow({ log }: { log: SuperAdminAuditLogItem }) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = log.oldValue || log.newValue || log.metadata;

  return (
    <div className="border-b border-border/50 transition-colors hover:bg-muted/20">
      <div
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-0.5 text-muted-foreground hover:text-foreground"
            disabled={!hasDetails}
          >
            {hasDetails ? (
              expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="inline-block w-4" />
            )}
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={log.action} />
              <span className="font-semibold text-sm">{log.entityType}</span>
              {log.entityId && (
                <span className="font-mono text-xs text-muted-foreground">
                  ID: {log.entityId}
                </span>
              )}
              {log.tenantId && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  Tenant: {log.tenantId}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {log.adminUser?.name || log.adminUser?.email || log.adminUserId}
              </span>
              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
              {log.userAgent && (
                <span className="max-w-[200px] truncate" title={log.userAgent}>
                  UA: {log.userAgent}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right sm:self-center">
          <div className="text-xs font-medium">
            {new Date(log.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {new Date(log.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="bg-muted/10 px-6 py-4 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {log.oldValue && <JsonView data={log.oldValue} label="Before (Old Value)" />}
          {log.newValue && <JsonView data={log.newValue} label="After (New Value)" />}
          {log.metadata && <JsonView data={log.metadata} label="Metadata & Context" />}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params: GetAuditLogsParams = {
    page,
    limit: 20,
    search: search.trim() || undefined,
    action: actionFilter === 'ALL' ? undefined : actionFilter,
    entityType: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-audit-logs', params],
    queryFn: () => auditLogsApi.getAll(params),
  });

  const logs = data?.data ?? [];

  return (
    <div className="admin-page">
      <AdminPageHero
        title="Super Admin Audit Logs"
        subtitle="Platform-wide immutable security and administrative audit trail"
      />

      <section className="admin-stats" aria-label="Audit summary">
        <AdminStatCard label="Total Audit Events" value={data?.meta.total ?? 0} />
        <AdminStatCard label="Events On Page" value={logs.length} />
        <AdminStatCard label="Current Page" value={`${data?.meta.page ?? 1} of ${data?.meta.totalPages || 1}`} />
      </section>

      <AdminPanel
        title="Audit Event Log"
        description="Append-only record of all platform-level operations, configuration updates, and security events"
        filters={
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions, emails, IDs..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <div>
                <Select
                  value={actionFilter}
                  onValueChange={(val) => {
                    setActionFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actions</SelectItem>
                    <SelectItem value="SALON_">Salon Actions</SelectItem>
                    <SelectItem value="SUBSCRIPTION_">Subscription Actions</SelectItem>
                    <SelectItem value="PLAN_">Plan Actions</SelectItem>
                    <SelectItem value="PAYMENT_">Payment Actions</SelectItem>
                    <SelectItem value="FEATURE_">Feature Actions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={entityTypeFilter}
                  onValueChange={(val) => {
                    setEntityTypeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Entities</SelectItem>
                    <SelectItem value="Salon">Salon</SelectItem>
                    <SelectItem value="Subscription">Subscription</SelectItem>
                    <SelectItem value="Plan">Plan</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Feature">Feature / Add-on</SelectItem>
                    <SelectItem value="User">User / Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  title="Start Date"
                  className="w-full text-xs"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  title="End Date"
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Append-only platform log • Passwords, tokens & secrets redacted
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        }
        footer={<AdminPagination meta={data?.meta} page={page} onPageChange={setPage} />}
      >
        {isLoading ? (
          <OpsLoading />
        ) : isError ? (
          <OpsError message="Failed to load audit logs." onRetry={() => void refetch()} />
        ) : logs.length === 0 ? (
          <AdminEmpty message="No audit logs match your search and filter criteria." />
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {logs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
