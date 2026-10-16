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
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors shadow-xs">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="font-bold text-lg text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#64748B]">{description}</p>
      {href ? (
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#7C3AED] group-hover:translate-x-0.5 transition-all">
          Learn more
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    'group glass-card flex h-full flex-col rounded-2xl border border-[#FCE7F3] bg-white/95 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#DDD6FE] hover:shadow-xl hover:shadow-purple-900/5';

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
