import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function SalonLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [salonCode, setSalonCode] = useState('');
  const [showSalonCode, setShowSalonCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = sessionStorage.getItem('auth_redirect_message');
    if (message) {
      setError(message);
      sessionStorage.removeItem('auth_redirect_message');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(
        email.trim().toLowerCase(),
        password,
        salonCode.trim().toUpperCase() || undefined,
      );
      if (user.roles.includes('SUPER_ADMIN')) {
        navigate('/super-admin/dashboard');
      } else if (user.tenantId) {
        navigate('/salon/dashboard');
      } else {
        setError('Invalid salon account');
      }
    } catch (err: unknown) {
      const requestError = err as {
        message?: string;
        response?: { data?: { code?: string; message?: string | string[] } };
      };
      const errorCode = requestError.response?.data?.code;
      const serverMessage = requestError.response?.data?.message;

      if (errorCode === 'AMBIGUOUS_TENANT_LOGIN') {
        setShowSalonCode(true);
        setError('This email is associated with multiple salons. Please enter your Salon Code to continue.');
      } else if (typeof serverMessage === 'string') {
        setError(serverMessage);
      } else if (!requestError.response) {
        setError('Cannot reach the server. Check that the backend is running, then try again.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-purple-900/5">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-primary">
            <span className="font-bold text-xl">✂</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Salon Admin Login</CardTitle>
          <CardDescription className="text-slate-500">Sign in to manage your salon</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yoursalon.com"
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-primary focus-visible:border-primary"
                required
              />
            </div>
            {showSalonCode ? (
              <div className="space-y-2">
                <Label htmlFor="salonCode" className="text-xs font-semibold text-slate-700">
                  Salon Code <span className="text-primary font-normal">(Required for this email)</span>
                </Label>
                <Input
                  id="salonCode"
                  type="text"
                  value={salonCode}
                  onChange={(e) => setSalonCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SALON-ABC"
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-primary focus-visible:border-primary uppercase tracking-wider"
                  required
                />
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSalonCode(true)}
                  className="text-xs text-slate-500 hover:text-primary transition-colors cursor-pointer"
                >
                  Belong to multiple salons? Enter salon code
                </button>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                <Link
                  to="/salon/forgot-password"
                  className="text-xs text-primary underline-offset-4 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-primary focus-visible:border-primary"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary text-white font-semibold shadow-md shadow-purple-500/25 hover:bg-primary/90 transition-all cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
