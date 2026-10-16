type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  dark?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  dark = false,
}: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  const descColor = dark ? 'text-slate-300' : 'text-slate-600';
  const eyebrowBg = dark ? 'bg-violet-950 border-violet-800/60 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700';

  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow ? (
        <div className={`mb-3.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold ${eyebrowBg}`}>
          <span className="size-1.5 rounded-full bg-violet-600" />
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2
        className={`text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.65rem] leading-[1.15] ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-3.5 text-base sm:text-lg leading-relaxed ${descColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
