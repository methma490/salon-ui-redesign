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
  const descColor = dark ? 'text-white/80' : 'text-muted';
  const eyebrowColor = dark ? 'text-gold' : 'text-burgundy';

  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {eyebrow ? (
        <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${eyebrowColor}`}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-serif text-3xl leading-tight sm:text-4xl ${dark ? 'text-white' : 'text-black'}`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-base leading-relaxed ${descColor}`}>{description}</p>
      ) : null}
    </div>
  );
}
