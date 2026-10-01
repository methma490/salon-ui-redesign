import { CheckCircle2, Clock, Loader2, Scissors } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signupApi, type SignupOrderStatus } from '@/features/signup/api/signup.api';
import { websiteHomeUrl } from '@/config/website-url';

export default function SignupSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const [status, setStatus] = useState<SignupOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('Missing order reference');
      setLoading(false);
      return;
    }

    const finalize = async () => {
      try {
        await signupApi.confirmReturn(orderId);
        const result = await signupApi.getStatus(orderId);
        setStatus(result);
      } catch {
        setError('Unable to verify payment. Try logging in or contact support.');
      } finally {
        setLoading(false);
      }
    };

    void finalize();
  }, [orderId]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border/60">
        <a href={websiteHomeUrl()} className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-3.5 w-3.5" />
          </span>
          Dart Smart Salon
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirming your payment...</p>
          </div>
        )}

        {!loading && error && (
          <div className="w-full max-w-sm space-y-4 text-center">
            <p className="font-medium text-destructive">{error}</p>
            <Button asChild variant="outline" className="w-full">
              <a href={websiteHomeUrl()}>Back to home</a>
            </Button>
          </div>
        )}

        {!loading && !error && status && (
          <div className="w-full max-w-md space-y-6 text-center">
            {status.awaitingActivation ? (
              <Clock className="mx-auto h-16 w-16 text-primary" />
            ) : (
              <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {status.canLogin
                  ? "You're all set!"
                  : status.awaitingActivation
                    ? 'Payment received!'
                    : 'Processing payment'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {status.canLogin
                  ? `${status.salonName} is active. Sign in as ${status.adminEmail}.`
                  : status.awaitingActivation
                    ? `${status.salonName} is registered with the ${status.plan?.name ?? 'selected'} plan. A platform admin will activate your salon shortly — you'll receive access to all plan features once approved.`
                    : 'Payment is being confirmed. Please wait a moment.'}
              </p>
              {status.plan && (
                <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                  {status.plan.name} plan
                </span>
              )}
            </div>
            {status.canLogin ? (
              <Button asChild size="lg" className="w-full">
                <Link to="/salon/login">Go to Salon login</Link>
              </Button>
            ) : status.awaitingActivation ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Login will be enabled after super admin activation.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <a href={websiteHomeUrl()}>Back to home</a>
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/salon/login">Try salon login</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
