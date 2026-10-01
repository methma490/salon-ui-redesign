import Link from 'next/link';
import { Scissors } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-black">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burgundy text-white">
        <Scissors className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="font-serif text-lg leading-none tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
