import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SALON_LOGIN_PATH } from '@/config/auth-paths';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Scissors className="h-4 w-4" />
          </span>
          <span>
            Salon <span className="text-primary">SaaS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <a
            href="#features"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground transition-colors hover:text-primary">
            Pricing
          </a>
          <a href="#contact" className="text-muted-foreground transition-colors hover:text-primary">
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:bg-accent hover:text-primary sm:inline-flex"
          >
            <Link to={SALON_LOGIN_PATH}>Login</Link>
          </Button>
          <Button asChild size="sm" className="shadow-sm">
            <a href="#pricing">Get Started</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
