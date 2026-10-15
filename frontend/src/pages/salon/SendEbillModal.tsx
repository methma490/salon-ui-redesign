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
import { useState } from 'react';
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

  const hasSmsFeature = enabledFeatures.includes('SMS_NOTIFICATIONS');

  const smsMutation = useMutation({
    mutationFn: () => tenantApi.sales.resendEbillSms(saleId, ''),
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

  // Resolve phone: prefer what's saved in invoice link, then prop
  const customerPhone = invoiceLink?.customerPhone || defaultPhone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pos-ebill-dialog" style={{ maxWidth: 460, borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <Send size={20} color="#0284c7" /> Send eBill SMS
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          {/* Customer Info */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {customerName && (
              <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                {customerName}
              </p>
            )}
            {customerPhone ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 500,
                }}
              >
                <Phone size={13} /> {customerPhone}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>
                ⚠ No phone number found for this customer
              </p>
            )}
          </div>

          {/* SMS Status & eBill Link Card */}
          {invoiceLink && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
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
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Last Sent: {new Date(invoiceLink.smsSentAt).toLocaleString('en-LK')}
                  {invoiceLink.smsAttempts > 0 && ` (Attempts: ${invoiceLink.smsAttempts})`}
                </div>
              )}

              {invoiceLink.smsStatus === 'FAILED' && invoiceLink.smsFailureReason && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#dc2626',
                    background: '#fef2f2',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  Failure Reason: {invoiceLink.smsFailureReason}
                </div>
              )}

              {/* Copyable eBill URL */}
              {invoiceLink.ebillUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                    paddingTop: 8,
                    borderTop: '1px dashed #e2e8f0',
                  }}
                >
                  <input
                    readOnly
                    value={invoiceLink.ebillUrl}
                    style={{
                      flex: 1,
                      fontSize: 12,
                      padding: '6px 8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      color: '#0f172a',
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    style={{ height: 32, gap: 4, fontSize: 12 }}
                  >
                    <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(invoiceLink.ebillUrl, '_blank')}
                    style={{ height: 32, gap: 4, fontSize: 12 }}
                  >
                    <ExternalLink size={13} />
                  </Button>
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
                disabled={smsMutation.isPending || !customerPhone}
                onClick={() => {
                  setStatusMsg(null);
                  smsMutation.mutate();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: customerPhone ? '#0284c7' : '#94a3b8',
                  color: '#ffffff',
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 600,
                  width: '100%',
                  cursor: customerPhone ? 'pointer' : 'not-allowed',
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
