import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSalon, useFeatures } from '@/features/salons/hooks/useSalons';

export default function CreateSalonPage() {
  const navigate = useNavigate();
  const createSalon = useCreateSalon();
  const { data: features, isLoading: featuresLoading } = useFeatures();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleFeature = (code: string, checked: boolean) => {
    setSelectedFeatures((current) =>
      checked ? [...new Set([...current, code])] : current.filter((item) => item !== code),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!selectedFeatures.length) {
      setError('Select at least one feature.');
      return;
    }

    try {
      const result = await createSalon.mutateAsync({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        features: selectedFeatures,
        admin: {
          name: form.adminName,
          email: form.adminEmail,
          phone: form.adminPhone || undefined,
          password: form.adminPassword,
        },
      });
      navigate(`/super-admin/salons/${result.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'Failed to create salon.';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Salon</h1>
        <p className="text-sm text-muted-foreground">
          Create a tenant, main branch, features, and salon admin in one workflow.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Salon Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Salon Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Salon Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Salon Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuresLoading && (
              <p className="text-sm text-muted-foreground">Loading features...</p>
            )}
            {features?.map((feature) => (
              <div
                key={feature.code}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <Checkbox
                  id={`create-${feature.code}`}
                  checked={selectedFeatures.includes(feature.code)}
                  onCheckedChange={(checked) => toggleFeature(feature.code, checked === true)}
                />
                <div>
                  <Label htmlFor={`create-${feature.code}`}>{feature.name}</Label>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salon Admin</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Name *</Label>
              <Input
                id="adminName"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPhone">Admin Phone</Label>
              <Input
                id="adminPhone"
                value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Temporary Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                minLength={8}
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                required
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={createSalon.isPending}>
            {createSalon.isPending ? 'Creating...' : 'Create Salon'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/super-admin/salons">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
