import { ArrowLeft, Scissors, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { signupApi } from '@/features/signup/api/signup.api';

export default function SignupCancelPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  useEffect(() => {
    if (orderId) {
      void signupApi.cancel(orderId);
    }
  }, [orderId]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border/60">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-3.5 w-3.5" />
          </span>
          Salon SaaS
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <XCircle className="mx-auto h-16 w-16 text-muted-foreground/60" />
          <div>
            <h1 className="text-2xl font-bold">Payment cancelled</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No charges were made.
              {orderId && (
                <>
                  <br />
                  <span className="text-xs">Ref: {orderId}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full gap-2">
              <Link to="/#pricing">
                <ArrowLeft className="h-4 w-4" />
                Choose a plan
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
