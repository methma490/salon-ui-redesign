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
  const descColor = dark ? 'text-white/80' : 'text-[#64748B]';
  const eyebrowColor = dark ? 'text-[#F8B4F7]' : 'text-[#7C3AED]';

  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow ? (
        <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE]/80 border border-[#DDD6FE] px-3.5 py-1 text-xs font-semibold">
          <span className="size-1.5 rounded-full bg-[#7C3AED]" />
          <span className={eyebrowColor}>{eyebrow}</span>
        </div>
      ) : null}
      <h2
        className={`text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.65rem] leading-[1.15] ${
          dark ? 'text-white' : 'text-[#0F172A]'
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-base sm:text-lg leading-relaxed ${descColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
