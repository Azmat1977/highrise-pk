/**
 * components/projects/TrustedDevelopersMarquee.tsx
 *
 * Enterprise infinite-scrolling marquee for trusted developers.
 * Renders corporate color monograms when logo images are missing.
 */

'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ProjectListing } from '@/types/projects';

interface TrustedDevelopersMarqueeProps {
  projects: ProjectListing[];
}

interface DeveloperItem {
  id: string;
  name: string;
  logoUrl: string | null;
  badge: string | null;
  initials: string;
  bgColor: string;
  textColor: string;
}

export function TrustedDevelopersMarquee({ projects }: TrustedDevelopersMarqueeProps) {
  // Extract unique developers from the current project list
  const uniqueDevelopers = useMemo(() => {
    const map = new Map<string, DeveloperItem>();
    
    projects.forEach(p => {
      if (p.developerName && p.developerName !== 'Developer') {
        const key = p.developerId || p.developerName;
        if (!map.has(key)) {
          const initials = p.developerName
            .split(' ')
            .map(w => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();

          map.set(key, {
            id: p.developerId || key,
            name: p.developerName,
            logoUrl: p.developerLogoUrl,
            badge: p.developerBadge,
            initials: initials || 'DEV',
            bgColor: 'bg-[#004063]/10',
            textColor: 'text-[#004063]',
          });
        }
      }
    });
    
    return Array.from(map.values());
  }, [projects]);

  // Fallback top Pakistani developers with authentic brand monograms & colors
  const FALLBACK_BUILDERS: DeveloperItem[] = [
    { id: 'dev-1', name: 'Bahria Town', logoUrl: null, badge: 'premium', initials: 'BT', bgColor: 'bg-[#004063]', textColor: 'text-white' },
    { id: 'dev-2', name: 'DHA Urban', logoUrl: null, badge: 'trusted', initials: 'DHA', bgColor: 'bg-emerald-700', textColor: 'text-white' },
    { id: 'dev-3', name: 'Emaar Pakistan', logoUrl: null, badge: 'premium', initials: 'EM', bgColor: 'bg-[#029bba]', textColor: 'text-white' },
    { id: 'dev-4', name: 'Imarat Group', logoUrl: null, badge: 'trusted', initials: 'IG', bgColor: 'bg-[#004063]', textColor: 'text-white' },
    { id: 'dev-5', name: 'Saifco Holdings', logoUrl: null, badge: 'emerging', initials: 'SH', bgColor: 'bg-amber-600', textColor: 'text-white' },
    { id: 'dev-6', name: 'Habib Rafiq (HRL)', logoUrl: null, badge: 'premium', initials: 'HRL', bgColor: 'bg-[#004063]', textColor: 'text-white' },
  ];

  const displayList = uniqueDevelopers.length >= 3 ? uniqueDevelopers : [...uniqueDevelopers, ...FALLBACK_BUILDERS];
  const marqueeItems = [...displayList, ...displayList, ...displayList];

  const getBadgeStyle = (badge: string | null) => {
    switch (badge?.toLowerCase()) {
      case 'premium':
        return { label: 'Premium Builder', color: 'text-[#029bba] bg-[#029bba]/10 border-[#029bba]/20' };
      case 'trusted':
        return { label: 'Verified Trusted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'emerging':
        return { label: 'Emerging Builder', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      default:
        return { label: 'Approved Builder', color: 'text-gray-600 bg-gray-100 border-gray-200' };
    }
  };

  return (
    <div className="w-full bg-white border-y border-gray-200 py-8 my-10 overflow-hidden relative rounded-2xl shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes infinite-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33333%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 35s linear infinite;
        }
        .animate-infinite-scroll:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Header */}
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#004063]/5 rounded-full border border-[#004063]/10 text-xs font-black text-[#004063] mb-1">
          <ShieldCheck className="w-4 h-4 text-[#029bba]" />
          <span>DEVELOPER DIRECTORY</span>
        </div>
        <h3 className="text-base md:text-lg font-black text-[#004063]">
          Projects by Pakistan&apos;s Most Trusted Builders
        </h3>
      </div>

      {/* Infinite Marquee */}
      <div className="flex w-[300%] sm:w-[200%] md:w-[150%] animate-infinite-scroll items-center">
        {marqueeItems.map((dev, idx) => {
          const badgeConfig = getBadgeStyle(dev.badge);
          const href = `/projects?builder=${encodeURIComponent(dev.name)}`;
          return (
            <Link
              key={`${dev.id}-${idx}`}
              href={href}
              className="flex flex-col items-center justify-center w-52 flex-shrink-0 group cursor-pointer px-3 no-underline"
              aria-label={`View projects by ${dev.name}`}
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center p-2 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 mb-2.5 bg-gray-50 border border-gray-200">
                {dev.logoUrl ? (
                  <Image
                    src={dev.logoUrl}
                    alt={dev.name}
                    width={64}
                    height={64}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className={`w-full h-full rounded-xl ${dev.bgColor} ${dev.textColor} flex items-center justify-center font-black text-lg tracking-wider shadow-inner`}>
                    {dev.initials}
                  </div>
                )}
              </div>

              <span className="text-xs font-black text-gray-800 truncate w-full text-center group-hover:text-[#029bba] transition-colors">
                {dev.name}
              </span>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${badgeConfig.color}`}>
                {badgeConfig.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}