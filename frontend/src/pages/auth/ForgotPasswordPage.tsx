import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/axios';
import { SUPER_ADMIN_LOGIN_PATH } from '@/config/auth-paths';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Portal = 'salon' | 'super-admin';

const portalConfig: Record<
  Portal,
  { title: string; description: string; loginPath: string; backLabel: string }
> = {
  salon: {
    title: 'Forgot password',
    description: 'Enter your salon admin email and we will send reset instructions.',
    loginPath: '/salon/login',
    backLabel: 'Back to salon login',
  },
  'super-admin': {
    title: 'Forgot password',
    description: 'Enter your super admin email and we will send reset instructions.',
    loginPath: SUPER_ADMIN_LOGIN_PATH,
    backLabel: 'Back to super admin login',
  },
};

export default function ForgotPasswordPage({ portal }: { portal: Portal }) {
  const config = portalConfig[portal];
  const [email, setEmail] = useState('');
  const [salonCode, setSalonCode] = useState('');
  const [showSalonCode, setShowSalonCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(
        email.trim(),
        portal,
        salonCode.trim().toUpperCase() || undefined,
      );
      setSent(true);
    } catch (err: unknown) {
      const requestError = err as {
        response?: { data?: { code?: string; message?: string } };
      };
      if (requestError.response?.data?.code === 'AMBIGUOUS_TENANT_RESET') {
        setShowSalonCode(true);
        setError('This email is associated with multiple salons. Please enter your Salon Code to reset your password.');
      } else if (requestError.response?.data?.message) {
        setError(requestError.response.data.message);
      } else {
        setError('Unable to process request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, check your inbox for a reset
                link. The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                In local development without SMTP, the reset link is printed in the backend server
                console.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to={config.loginPath}>{config.backLabel}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {portal === 'salon' && (
                showSalonCode ? (
                  <div className="space-y-2">
                    <Label htmlFor="salonCode">
                      Salon Code <span className="text-xs text-primary">(Required for shared email)</span>
                    </Label>
                    <Input
                      id="salonCode"
                      type="text"
                      value={salonCode}
                      onChange={(e) => setSalonCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SALON-ABC"
                      className="uppercase tracking-wider"
                      required
                    />
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSalonCode(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Belong to multiple salons? Enter salon code
                    </button>
                  </div>
                )
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to={config.loginPath} className="underline-offset-4 hover:underline">
                  {config.backLabel}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
