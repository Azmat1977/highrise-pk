import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Shield, DollarSign, Calculator, Maximize, 
  Sparkles, Star, Award, ArrowRight, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function IntelligenceTools() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const tools = [
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Verify Society / NOC',
      description: 'Check if a housing scheme is legally approved. See NOC status, authority, and risk alerts instantly.',
      href: '/tools/verify-society',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
      stats: '500+ Societies',
      industryFirst: true,
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title: 'Fair Price Estimator',
      description: 'Is the asking price fair? Get a data-driven price estimate for any property in Pakistan.',
      href: '/tools/price-estimator',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      stats: 'Statistical Analysis',
      industryFirst: true,
    },
    {
      icon: <Calculator className="w-7 h-7" />,
      title: 'Construction Calculator',
      description: 'Planning to build? Get cost estimates for 14 property types across 10 cities with live material rates.',
      href: '/tools/construction-calculator',
      image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
      stats: '14 Property Types',
      industryFirst: true,
    },
    {
      icon: <Calculator className="w-7 h-7" />,
      title: 'Home Loan Calculator',
      description: 'Compare 10 Pakistani banks side by side. Islamic (Diminishing Musharakah) + Conventional mortgages.',
      href: '/tools/home-loan-calculator',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
      stats: '10 Banks · Islamic + Conv.',
      industryFirst: true,
    },
    {
      icon: <Maximize className="w-7 h-7" />,
      title: 'Area Unit Converter',
      description: 'Convert Marla, Kanal, Sqft, Sqyd and 9 more units instantly. Includes 3 Marla standards.',
      href: '/tools/area-unit-converter',
      image: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=800&q=80',
      stats: '13 Units Supported',
      industryFirst: false,
      mostComprehensive: true,
    },
  ];

  // Auto-scroll logic (4 seconds, pauses on hover)
  useEffect(() => {
    if (isHovered || !scrollRef.current) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // If reached the end, scroll back to 0, otherwise scroll forward by one card width
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: clientWidth > 768 ? clientWidth / 3 : clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isHovered]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth;
      const scrollAmount = clientWidth > 768 ? clientWidth / 3 : clientWidth; // Scroll 1 card width
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      {/* Very faint background accent */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#029bba]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-bold tracking-wide mb-4 border border-[#029bba]/20">
              <Sparkles className="w-4 h-4" />
              Pakistan&apos;s First Intelligence Tools
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-3 tracking-tight">
              <span className="text-[#029bba]">Smart Tools</span> for Smart Buyers
            </h2>
            <p className="text-gray-600 max-w-xl text-lg">
              Don&apos;t rely on rumors. Use our data-driven tools to verify, estimate, and decide with confidence.
            </p>
          </div>

          {/* Custom Navigation Arrows */}
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#029bba] hover:text-[#029bba] hover:bg-[#029bba]/5 transition-all shadow-sm active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border-2 border-[#029bba] bg-[#029bba] flex items-center justify-center text-white hover:bg-[#027a94] hover:border-[#027a94] transition-all shadow-lg shadow-[#029bba]/20 active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div 
          className="relative -mx-4 px-4 pb-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-6 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for clean look
          >
            {tools.map((tool) => (
              <div 
                key={tool.title} 
                className="snap-start flex-shrink-0 w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <Link href={tool.href}>
                  <div className="group relative bg-white rounded-3xl border border-gray-200 hover:border-[#029bba]/40 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 overflow-hidden p-6 md:p-8 flex flex-col h-full cursor-pointer min-h-[380px]">
                    
                    {/* Contextual Faint Background Image */}
                    <Image
                      src={tool.image}
                      alt={tool.title}
                      fill
                      className="object-cover opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none grayscale"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />

                    {/* Top Row: Icon & Badge */}
                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-[#f8fcfd] border border-[#029bba]/15 flex items-center justify-center group-hover:bg-[#029bba] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-[#029bba]/30 flex-shrink-0">
                        <div className="text-[#029bba] group-hover:text-white transition-colors duration-500">
                          {tool.icon}
                        </div>
                      </div>
                      
                      {(tool.industryFirst || tool.mostComprehensive) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f8fcfd] text-[#029bba] border border-[#029bba]/15 shadow-sm text-right">
                          {tool.industryFirst ? <Star className="w-3 h-3 flex-shrink-0" /> : <Award className="w-3 h-3 flex-shrink-0" />}
                          {tool.industryFirst ? 'Industry-First' : 'Comprehensive'}
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="relative z-10 flex-1 flex flex-col">
                      <h3 className="text-xl md:text-2xl font-bold text-[#001f2b] mb-3 group-hover:text-[#029bba] transition-colors leading-tight">
                        {tool.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-8 flex-1">
                        {tool.description}
                      </p>

                      {/* Bottom Footer Row */}
                      <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-auto">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          {tool.stats}
                        </span>
                        <div className="inline-flex items-center gap-1 text-sm font-bold text-[#029bba] group-hover:gap-2 transition-all">
                          Try Free <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {/* Custom style to hide the scrollbar for webkit (Chrome/Safari) */}
          <style dangerouslySetInnerHTML={{__html: `
            div::-webkit-scrollbar {
              display: none;
            }
          `}} />
        </div>
      </div>
    </section>
  );
}