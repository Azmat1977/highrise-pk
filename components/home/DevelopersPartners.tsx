import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, Award, BadgeCheck, Star, MapPin, 
  ArrowRight, Users, ShieldCheck, Loader2 
} from 'lucide-react';

interface DeveloperItem {
  _id: string;
  companyName: string;
  slug?: string;
  developerType?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  completedProjectsCount?: number;
  activeProjectsCount?: number;
  establishedYear?: number;
  isVerified?: boolean;
  logo?: { url: string };
}

interface PartnerItem {
  _id: string;
  companyName?: string;
  logo?: { url: string };
}

interface DevelopersPartnersProps {
  developers: DeveloperItem[];
  trustedPartners: PartnerItem[];
  loadingDevelopers: boolean;
  loadingPartners: boolean;
}

export default function DevelopersPartners({
  developers, trustedPartners, loadingDevelopers, loadingPartners
}: DevelopersPartnersProps) {
  return (
    <section className="relative py-20 bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#029bba]/10 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#06b6d4]/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#06b6d4]/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#029bba] to-[#06b6d4] flex items-center justify-center shadow-inner">
              <Award className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white">Verified Partners</span>
            <span className="text-[10px] font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-0.5 rounded-full border border-[#06b6d4]/20">
              Trusted Network
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Pakistan&apos;s Most <span className="text-[#06b6d4]">Trusted</span> Developers
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Top-rated and verified developers delivering quality housing societies, gated communities, and highrise projects across Pakistan.
          </p>
        </div>

        {/* Developer Grid */}
        {loadingDevelopers ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#06b6d4]" />
          </div>
        ) : developers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {developers.slice(0, 6).map((developer) => (
              <Link key={developer._id} href={`/developers/${developer.slug || developer._id}`}>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-500 cursor-pointer group h-full flex flex-col hover:-translate-y-1.5 hover:border-[#06b6d4]/50 hover:shadow-[0_20px_40px_rgba(6,182,212,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#06b6d4]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-start gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg p-2">
                      {developer.logo?.url ? (
                        <Image src={developer.logo.url} alt={developer.companyName} width={64} height={64} className="object-contain" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-[#06b6d4] transition-colors">{developer.companyName}</h3>
                        {developer.isVerified && <BadgeCheck className="w-4 h-4 text-[#06b6d4] flex-shrink-0" />}
                      </div>
                      <p className="text-[#06b6d4] text-xs font-bold uppercase tracking-wider mb-2">{developer.developerType}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < (developer.rating || 4) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                        ))}
                        <span className="text-white/50 text-xs ml-1 font-medium">({developer.reviewsCount || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6 relative z-10 border-y border-white/10 py-4">
                    {[
                      { value: developer.completedProjectsCount || 0, label: 'Completed' },
                      { value: developer.activeProjectsCount || 0, label: 'Active' },
                      { value: developer.establishedYear || 'N/A', label: 'Since' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className="text-xl font-bold text-white mb-0.5">{stat.value}</p>
                        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto relative z-10 flex items-center justify-between">
                    <p className="text-white/60 text-sm flex items-center gap-1.5 font-medium">
                      <MapPin className="w-4 h-4 text-[#06b6d4]" /> {developer.city || 'Pakistan'}
                    </p>
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#06b6d4] group-hover:border-[#06b6d4] transition-all duration-300 group-hover:scale-110">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {/* Elegant Divider */}
        <div className="flex items-center gap-4 max-w-3xl mx-auto mb-10">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/15" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Our Partner Network</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/15" />
        </div>

        {/* Partner Logos Marquee */}
        <div className="mb-14 relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#001f2b] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#001f2b] to-transparent z-10 pointer-events-none" />
          
          <div className="flex animate-partner-marquee">
            {[...Array(2)].map((_, dupIdx) => (
              <div key={dupIdx} className="flex items-center gap-6 px-3">
                {(loadingPartners ? Array(8).fill(null) : trustedPartners).map((partner, index) => (
                  <div
                    key={`partner-${dupIdx}-${index}`}
                    className="flex-shrink-0 w-44 h-24 bg-white rounded-2xl flex items-center justify-center p-5 shadow-lg hover:shadow-[#06b6d4]/20 transition-all duration-300 grayscale hover:grayscale-0 hover:scale-105"
                  >
                    {loadingPartners ? (
                      <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                    ) : partner?.logo?.url ? (
                      <Image src={partner.logo.url} alt={partner.companyName || 'Partner'} width={130} height={60} className="object-contain max-h-14" />
                    ) : (
                      <span className="text-gray-400 text-xs font-bold text-center leading-tight uppercase tracking-wide">{partner?.companyName || `Partner`}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/developers">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] text-white font-bold shadow-xl hover:shadow-[#06b6d4]/20 transition-all hover:-translate-y-0.5">
              <Users className="w-5 h-5" /> Browse All Developers <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/onboarding/business?role=developer">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold transition-all">
              <Building2 className="w-5 h-5" /> Become a Partner
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}