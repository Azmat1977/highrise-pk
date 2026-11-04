import React from 'react';

interface PageSeoContentProps {
  title?: string;
  heading?: string;
  content?: string[];
  contained?: boolean;
  className?: string;
}

export default function PageSeoContent({
  title,
  heading,
  content = [],
  contained = true,
  className = '',
}: PageSeoContentProps) {
  if (!heading && content.length === 0) return null;

  return (
    <section className={`bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm ${className}`}>
      {heading && (
        <h2 className="text-xl font-bold tracking-tight text-[#001f2b] mb-4">
          {heading}
        </h2>
      )}

      <div className="space-y-4 text-sm leading-relaxed text-slate-600">
        {content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
