import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
};

export function FeatureCard({ icon: Icon, title, description, href }: FeatureCardProps) {
  const inner = (
    <>
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-burgundy-soft text-burgundy">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="font-serif text-xl text-black">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      {href ? (
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-burgundy">
          Learn more
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    'card-shadow flex h-full flex-col rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg';

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
