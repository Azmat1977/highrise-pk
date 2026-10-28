/**
 * components/project-detail/ProjectAbout.tsx
 *
 * Highrise.pk — Project About Section (Wave 5B)
 *
 * Purpose:
 *   Short project description with Read More toggle.
 *   Auto-generates smart summary if description is too long.
 *
 * Features:
 *   → Sanitized HTML rendering (isomorphic-dompurify)
 *   → Auto-truncate at 400 chars (with word boundary)
 *   → "Read More" / "Read Less" toggle
 *   → Tagline in italic teal
 *   → Strip leading h1/h2 to avoid duplicate project name
 *
 * Rules:
 *   → Tailwind only
 *   → Lucide React icons only
 *   → Mobile-first
 *   → Guest-first
 *
 * SECURITY:
 *   → All HTML sanitized via isomorphic-dompurify
 *   → Allowed tags: p, br, strong, em, ul, ol, li, h3, h4
 *   → Allowed attrs: href, target, rel
 *   → No dangerous tags (script, iframe, style, etc.)
 *
 * SEO:
 *   → Semantic <section> with h2
 *   → Full description available for crawlers (via aria-expanded content)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

import type { ProjectDetailData } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectAboutProps {
  project: ProjectDetailData;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SHORT_DESC_MAX_CHARS = 400;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize HTML content — safe subset of tags/attrs
 */
function sanitizeHtml(input: string): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Strip HTML tags to get plain text length
 */
function getPlainTextLength(html: string): number {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length;
}

/**
 * Remove leading h1/h2 tags (avoid duplicate project name)
 */
function stripLeadingHeading(html: string): string {
  return html.replace(/^\s*<h[12][^>]*>.*?<\/h[12]>\s*/i, '');
}

/**
 * Truncate HTML content preserving word boundaries
 * Returns text with fade gradient at the end (rendered via CSS)
 */
function getPreview(html: string, maxChars: number): string {
  const clean = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return html;

  const truncated = clean.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const cutoff    = lastSpace > 100 ? lastSpace : maxChars;
  return `<p>${clean.slice(0, cutoff)}...</p>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectAbout({ project }: ProjectAboutProps) {
  const [showFull, setShowFull] = useState(false);

  // ─── Sanitize + strip leading heading ───
  const safeHtml = useMemo(() => {
    const raw     = project.description ?? '';
    const cleaned = stripLeadingHeading(raw);
    return sanitizeHtml(cleaned);
  }, [project.description]);

  const plainLength     = getPlainTextLength(safeHtml);
  const needsTruncation = plainLength > SHORT_DESC_MAX_CHARS;
  const displayHtml     = showFull || !needsTruncation
    ? safeHtml
    : sanitizeHtml(getPreview(safeHtml, SHORT_DESC_MAX_CHARS));

  // Hide section if no description AND no shortDescription
  // (tagline is owned by hero identity block)
  if (!safeHtml && !project.shortDescription) return null;

  return (
    <section
      id="about"
      className="scroll-mt-24"
      aria-label={`About ${project.projectName}`}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── Header — matches ProjectOverview / BuildingHighlights ── */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#029bba]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                About {project.projectName}
              </h2>
              {project.shortDescription && safeHtml && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                  {project.shortDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6">

          {/* Tagline owned by hero identity block (repetition fix) */}

          {/* Description */}
          {safeHtml && (
            <>
              <div
                className="prose prose-gray max-w-none prose-p:leading-relaxed prose-p:text-gray-700 prose-p:mb-4 prose-a:text-[#029bba] prose-a:font-semibold prose-strong:text-gray-900 prose-ul:my-4 prose-li:my-1"
                dangerouslySetInnerHTML={{ __html: displayHtml }}
              />

              {/* Read More / Read Less Toggle */}
              {needsTruncation && (
                <button
                  onClick={() => setShowFull(v => !v)}
                  aria-expanded={showFull}
                  aria-label={showFull ? 'Show less description' : 'Show full description'}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2
                             bg-[#029bba]/5 border border-[#029bba]/20 rounded-xl
                             text-sm font-bold text-[#029bba]
                             hover:bg-[#029bba]/10 hover:border-[#029bba]/40
                             transition-all"
                >
                  {showFull ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Read Full Description
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Fallback: shortDescription becomes the body when no full description */}
          {!safeHtml && project.shortDescription && (
            <p className="text-gray-700 leading-relaxed">
              {project.shortDescription}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}