'use client';

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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 group-hover:bg-violet-700 group-hover:text-white transition-colors shadow-2xs">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-violet-700 transition-colors">
        {title}
      </h3>
      <p className="mt-1.5 flex-1 text-xs sm:text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      {href ? (
        <span className="mt-5 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-violet-700 group-hover:translate-x-0.5 transition-all">
          Explore
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className =
    'group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-150 hover:-translate-y-1 hover:border-violet-300 hover:shadow-md';

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
