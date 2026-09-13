import { ArrowRight, BarChart3, Scissors, ShoppingCart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SALON_LOGIN_PATH } from '@/config/auth-paths';

const highlights = [
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Track clients, birthdays, and visit history across your salon.',
  },
  {
    icon: Scissors,
    title: 'Services & Staff',
    description: 'Manage service catalog, pricing, and employee performance.',
  },
  {
    icon: ShoppingCart,
    title: 'POS & Inventory',
    description: 'Complete sales with products, stock movements, and receipts.',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Daily sales, branch performance, and low-stock alerts.',
  },
];

export function MarketingHero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden border-b border-border">
      <img
        src="/signup-salon.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            Built for salons · Multi-branch ready
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            Run your salon on one{' '}
            <span className="text-emerald-300">smart platform</span>
          </h1>
          <p className="mt-6 text-lg text-white/85 md:text-xl">
            Choose a subscription plan that fits your salon. Start with customers and POS, scale to
            inventory, branches, and advanced reports.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 shadow-lg">
              <a href="#pricing">
                View Plans
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link to={SALON_LOGIN_PATH}>Login</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Features</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Everything your salon needs</h2>
        <p className="mt-3 text-muted-foreground">
          Modular features included in each plan — pay only for what you use.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <div
            key={item.title}
            className="marketing-card-shadow group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
