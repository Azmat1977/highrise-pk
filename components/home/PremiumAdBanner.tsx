import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PremiumAdBannerProps {
  imageUrl?: string;
  link?: string;
  sponsorName?: string;
  title?: string;
  subtitle?: string;
}

export default function PremiumAdBanner({
  imageUrl = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
  link = '/onboarding/business',
  sponsorName = 'Highrise Enterprise',
  title = 'Promote Your Project Here',
  subtitle = 'Reach thousands of verified buyers and investors across Pakistan daily.',
}: PremiumAdBannerProps) {
  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <Link href={link}>
          <div className="relative w-full h-32 md:h-40 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
            {/* Ad Image */}
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#001f2b]/90 via-[#001f2b]/60 to-transparent" />
            
            {/* Ad Tag */}
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/30">
                Sponsored
              </span>
            </div>

            {/* Ad Content */}
            <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-center">
              {sponsorName && (
                <span className="text-[#06b6d4] text-xs font-bold uppercase tracking-wider mb-1">
                  {sponsorName}
                </span>
              )}
              <h3 className="text-white text-lg md:text-2xl font-bold mb-1 group-hover:text-[#06b6d4] transition-colors">
                {title}
              </h3>
              <p className="text-white/80 text-xs md:text-sm max-w-lg hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}