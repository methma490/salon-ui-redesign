import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Phone,
  RefreshCw,
  Send,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '@/api/tenant.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SendEbillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  customerName?: string | null;
  defaultPhone?: string | null;
}

function formatStatusBadge(status: 'NOT_SENT' | 'PENDING' | 'SENT' | 'FAILED') {
  switch (status) {
    case 'SENT':
      return {
        label: 'SMS Delivered / Sent',
        bg: '#ecfdf5',
        color: '#059669',
        border: '#a7f3d0',
        icon: <CheckCircle2 size={13} />,
      };
    case 'PENDING':
      return {
        label: 'SMS Pending',
        bg: '#fffbeb',
        color: '#d97706',
        border: '#fde68a',
        icon: <RefreshCw size={13} className="animate-spin" />,
      };
    case 'FAILED':
      return {
        label: 'SMS Failed',
        bg: '#fef2f2',
        color: '#dc2626',
        border: '#fecaca',
        icon: <XCircle size={13} />,
      };
    case 'NOT_SENT':
    default:
      return {
        label: 'SMS Not Sent',
        bg: '#f8fafc',
        color: '#64748b',
        border: '#e2e8f0',
        icon: null,
      };
  }
}

export default function SendEbillModal({
  open,
  onOpenChange,
  saleId,
  customerName,
  defaultPhone,
}: SendEbillModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const { data: enabledFeatures = [] } = useQuery<string[]>({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features.listEnabled,
    enabled: open,
  });

  const { data: invoiceLink, refetch: refetchLink } = useQuery({
    queryKey: ['invoice-link', saleId],
    queryFn: () => tenantApi.sales.getInvoiceLink(saleId),
    enabled: open,
  });

  // Sync phone input when invoiceLink or defaultPhone resolves
  const resolvedInitialPhone = invoiceLink?.customerPhone || defaultPhone || '';
  useEffect(() => {
    if (resolvedInitialPhone && !phoneInput) {
      setPhoneInput(resolvedInitialPhone);
    }
  }, [resolvedInitialPhone]);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPhoneInput(invoiceLink?.customerPhone || defaultPhone || '');
      setStatusMsg(null);
    }
  }, [open, saleId, defaultPhone]);

  const hasSmsFeature = enabledFeatures.includes('SMS_NOTIFICATIONS');
  const activePhone = phoneInput.trim();

  const smsMutation = useMutation({
    mutationFn: () => tenantApi.sales.resendEbillSms(saleId, activePhone),
    onSuccess: (res) => {
      setStatusMsg({
        type: res.success ? 'success' : 'error',
        text: res.message || (res.success ? 'eBill SMS sent successfully!' : 'SMS dispatch failed'),
      });
      void refetchLink();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to send SMS';
      setStatusMsg({ type: 'error', text: msg });
      void refetchLink();
    },
  });

  const handleCopyLink = () => {
    if (invoiceLink?.ebillUrl) {
      void navigator.clipboard.writeText(invoiceLink.ebillUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const smsStatusBadge = invoiceLink ? formatStatusBadge(invoiceLink.smsStatus) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="pos-ebill-dialog w-[calc(100%-1.5rem)] max-w-[460px] p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto box-border"
        style={{ margin: 'auto' }}
      >
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
            <Send size={18} className="text-sky-600 shrink-0" />
            <span>Send eBill SMS</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 mt-2 w-full box-border">
          {/* Customer Info Card */}
          <div className="w-full box-border bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col gap-2">
            {customerName && (
              <p className="m-0 text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {customerName}
              </p>
            )}

            <div className="flex flex-col gap-1 w-full box-border">
              <label
                htmlFor="ebill-phone-input"
                className="text-[11px] font-bold text-slate-500 uppercase tracking-wide"
              >
                Mobile Number for SMS:
              </label>
              <div className="relative flex items-center w-full box-border">
                <Phone
                  size={14}
                  className="absolute left-3 text-sky-600 pointer-events-none"
                />
                <input
                  id="ebill-phone-input"
                  type="tel"
                  placeholder="e.g. 0771234567 or +94771234567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full box-border pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
              {!activePhone && (
                <p className="m-0 text-[11px] text-red-500 font-medium leading-tight pt-0.5">
                  ⚠ No phone number found for this customer. Enter a number above to send SMS.
                </p>
              )}
            </div>
          </div>

          {/* SMS Status & eBill Link Card */}
          {invoiceLink && (
            <div className="w-full box-border bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-600">
                  SMS eBill Status:
                </span>
                {smsStatusBadge && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: smsStatusBadge.bg,
                      color: smsStatusBadge.color,
                      border: `1px solid ${smsStatusBadge.border}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {smsStatusBadge.icon} {smsStatusBadge.label}
                  </span>
                )}
              </div>

              {invoiceLink.smsSentAt && (
                <div className="text-[11px] text-slate-500">
                  Last Sent: {new Date(invoiceLink.smsSentAt).toLocaleString('en-LK')}
                  {invoiceLink.smsAttempts > 0 && ` (Attempts: ${invoiceLink.smsAttempts})`}
                </div>
              )}

              {invoiceLink.smsStatus === 'FAILED' && invoiceLink.smsFailureReason && (
                <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  Failure Reason: {invoiceLink.smsFailureReason}
                </div>
              )}

              {/* Copyable eBill URL */}
              {invoiceLink.ebillUrl && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1 pt-2.5 border-t border-dashed border-slate-200 w-full box-border">
                  <input
                    readOnly
                    value={invoiceLink.ebillUrl}
                    className="flex-1 min-w-0 box-border text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono select-all truncate"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="h-8 gap-1.5 text-xs font-semibold rounded-lg flex-1 sm:flex-initial"
                    >
                      <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(invoiceLink.ebillUrl, '_blank')}
                      className="h-8 w-8 p-0 rounded-lg shrink-0"
                      title="Open link in new tab"
                    >
                      <ExternalLink size={13} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          {statusMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: statusMsg.type === 'success' ? '#047857' : '#b91c1c',
                border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {statusMsg.text}
            </div>
          )}

          {/* SMS Action */}
          <div style={{ marginTop: 4 }}>
            {hasSmsFeature ? (
              <Button
                type="button"
                disabled={smsMutation.isPending || !activePhone}
                onClick={() => {
                  setStatusMsg(null);
                  smsMutation.mutate();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: activePhone ? '#0284c7' : '#94a3b8',
                  color: '#ffffff',
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 600,
                  width: '100%',
                  cursor: activePhone ? 'pointer' : 'not-allowed',
                }}
              >
                <Smartphone size={16} />
                {smsMutation.isPending
                  ? 'Dispatching SMS…'
                  : invoiceLink?.smsStatus === 'SENT'
                    ? 'Resend eBill SMS'
                    : 'Send eBill SMS'}
              </Button>
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Lock size={15} color="#eab308" /> SMS Feature (Plan Upgrade Required)
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                  Automated SMS e-bill receipts are exclusive to upgraded plans.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/salon/subscription');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    color: '#ffffff',
                    fontWeight: 600,
                    borderRadius: 6,
                    fontSize: 11,
                    height: 30,
                  }}
                >
                  Upgrade Plan to Enable SMS
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
