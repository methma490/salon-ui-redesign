import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Lock, MessageSquare, Send, Smartphone } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SendEbillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  customerName?: string | null;
  defaultPhone?: string | null;
}

export default function SendEbillModal({
  open,
  onOpenChange,
  saleId,
  customerName,
  defaultPhone,
}: SendEbillModalProps) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(defaultPhone || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: enabledFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features.listEnabled,
    enabled: open,
  });

  const hasSmsFeature = enabledFeatures.includes('SMS_NOTIFICATIONS');

  const smsMutation = useMutation({
    mutationFn: (targetPhone: string) => tenantApi.sales.sendEbillSms(saleId, targetPhone),
    onSuccess: (res) => {
      setStatusMsg({ type: 'success', text: res.message || 'E-Bill sent via SMS successfully!' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to send SMS';
      setStatusMsg({ type: 'error', text: msg });
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: (targetPhone: string) => tenantApi.sales.sendEbillWhatsapp(saleId, targetPhone),
    onSuccess: (res) => {
      setStatusMsg({ type: 'success', text: 'WhatsApp link created!' });
      if (res.externalUrl) {
        window.open(res.externalUrl, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to generate WhatsApp link';
      setStatusMsg({ type: 'error', text: msg });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 460, borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <Send size={20} color="#0284c7" /> Send Customer Digital E-Bill
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          {customerName && (
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
              Customer: <strong style={{ color: '#0f172a' }}>{customerName}</strong>
            </p>
          )}

          <div>
            <Label style={{ marginBottom: 6, display: 'block', fontSize: 13 }}>Recipient Mobile Phone</Label>
            <Input
              placeholder="e.g. 0771234567 or +94771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </div>

          {statusMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                background: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* WhatsApp Option */}
            <Button
              type="button"
              variant="outline"
              disabled={whatsappMutation.isPending}
              onClick={() => {
                setStatusMsg(null);
                whatsappMutation.mutate(phone);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderColor: '#25D366',
                color: '#128C7E',
                height: 42,
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              <MessageSquare size={18} color="#25D366" />
              {whatsappMutation.isPending ? 'Generating WhatsApp link...' : 'Send via WhatsApp'}
            </Button>

            {/* SMS Option */}
            {hasSmsFeature ? (
              <Button
                type="button"
                disabled={smsMutation.isPending}
                onClick={() => {
                  setStatusMsg(null);
                  smsMutation.mutate(phone);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#0284c7',
                  color: '#ffffff',
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                <Smartphone size={18} />
                {smsMutation.isPending ? 'Sending SMS...' : 'Send via SMS'}
              </Button>
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13, fontWeight: 600 }}>
                  <Lock size={16} color="#eab308" /> SMS Feature (Plan Upgrade Required)
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                  Automated SMS e-bill receipts are exclusive to upgraded subscription plans.
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
                    marginTop: 4,
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
