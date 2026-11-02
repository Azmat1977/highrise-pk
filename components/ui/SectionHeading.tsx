import React from 'react';

interface SectionHeadingProps {
  id?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  tone?: 'default' | 'dark';
  align?: 'left' | 'center' | 'right';
}

export default function SectionHeading({
  id,
  as: Component = 'h2',
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  className = '',
  tone = 'default',
  align = 'center',
}: SectionHeadingProps) {
  const isDark = tone === 'dark';
  const alignClass =
    align === 'left'
      ? 'items-start text-left'
      : align === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';

  return (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      {eyebrow && (
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3 py-1 text-xs font-bold text-[#029bba]">
          {eyebrowIcon}
          <span>{eyebrow}</span>
        </div>
      )}

      {title && (
        <Component
          id={id}
          className={`text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl ${
            isDark ? 'text-white' : 'text-[#004063]'
          }`}
        >
          {title}
        </Component>
      )}

      {subtitle && (
        <p
          className={`mt-2 max-w-2xl text-sm font-semibold sm:text-base ${
            isDark ? 'text-slate-300' : 'text-[#3c6c85]'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}