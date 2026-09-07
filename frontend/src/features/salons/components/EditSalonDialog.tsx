import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateSalon } from '@/features/salons/hooks/useSalons';
import type { SalonDetails } from '@/features/salons/types/salon.types';

interface EditSalonDialogProps {
  salon: Pick<SalonDetails, 'id' | 'name' | 'email' | 'phone'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSalonDialog({ salon, open, onOpenChange }: EditSalonDialogProps) {
  const updateSalon = useUpdateSalon(salon.id);
  const [name, setName] = useState(salon.name);
  const [email, setEmail] = useState(salon.email ?? '');
  const [phone, setPhone] = useState(salon.phone ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(salon.name);
    setEmail(salon.email ?? '');
    setPhone(salon.phone ?? '');
  }, [salon]);

  const handleSave = async () => {
    setError('');
    try {
      await updateSalon.mutateAsync({
        name,
        email: email || undefined,
        phone: phone || undefined,
      });
      onOpenChange(false);
    } catch {
      setError('Failed to update salon.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Salon</DialogTitle>
          <DialogDescription>
            Update salon contact information. Code cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Salon Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={updateSalon.isPending}>
            {updateSalon.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
