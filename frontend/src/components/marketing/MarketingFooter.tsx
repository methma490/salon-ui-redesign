import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { SALON_LOGIN_PATH } from '@/config/auth-paths';

export function MarketingFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </span>
            Salon SaaS
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Modern salon management software with POS, inventory, customers, and reports — built for
            salons in Sri Lanka and beyond.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Product</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#features" className="transition-colors hover:text-primary">
                Features
              </a>
            </li>
            <li>
              <a href="#pricing" className="transition-colors hover:text-primary">
                Pricing
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Access</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to={SALON_LOGIN_PATH} className="transition-colors hover:text-primary">
                Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Salon SaaS. All rights reserved.
      </div>
    </footer>
  );
}
