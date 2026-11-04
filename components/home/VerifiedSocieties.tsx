import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, ShieldCheck, Star, BadgeCheck, AlertTriangle, 
  MapPin, Shield, TrendingUp, Award, ArrowRight 
} from 'lucide-react';

interface SocietyItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores: { legal: number; growth: number; overall: number; };
  featuredImage?: string;
  activeAlertCount: number;
  isVerifiedByHighrise: boolean;
  developerName?: string;
}

export default function VerifiedSocieties({
  societies, loading
}: {
  societies: SocietyItem[]; loading: boolean;
}) {
  const getNocLabel = (status: string) => {
    if (status === 'approved') return { text: 'NOC Approved', bg: 'bg-[#10b981]' };
    if (status === 'pending' || status === 'under_review') return { text: 'NOC Pending', bg: 'bg-[#f59e0b]' };
    if (status === 'illegal' || status === 'disputed' || status === 'cancelled') return { text: 'High Risk', bg: 'bg-[#ef4444]' };
    return { text: 'Under Review', bg: 'bg-[#f59e0b]' };
  };

  const getScoreColor = (s: number) => {
    if (s >= 75) return 'text-[#10b981]';
    if (s >= 50) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const heroSociety = societies[0];
  const miniSocieties = societies.slice(1, 5);

  return (
    <section className="relative py-20 bg-gradient-to-br from-[#f8fcfd] via-[#eef7fa] to-[#e6f4f8] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#029bba]/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-[#004063]/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#029bba]/20 shadow-sm mb-5">
            <div className="w-6 h-6 rounded-lg bg-[#029bba] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#004063]">
              Verified Societies
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-[#004063] mb-4 tracking-tight">
            Pakistan&apos;s Most <span className="text-[#029bba]">Trusted</span> Housing
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Every society scored on 6 dimensions — Legal, Growth, Infrastructure, Possession, Livability.
            <strong className="text-[#004063]"> No more guesswork.</strong>
          </p>
        </div>

        {loading ? (
          <div className="animate-pulse bg-white/50 h-96 rounded-3xl" />
        ) : !heroSociety ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#001f2b]">Societies Coming Soon</h3>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-10">
            {/* HERO CARD */}
            <Link href={`/tools/verify-society/${heroSociety.slug}`}>
              <div className="group bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-[#029bba]/50 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col hover:-translate-y-1">
                <div className="relative h-80 lg:h-96 overflow-hidden bg-gray-100">
                  <Image
                    src={heroSociety.featuredImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200'}
                    alt={heroSociety.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001f2b]/90 via-[#001f2b]/20 to-transparent" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#029bba] text-white text-xs font-bold shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-white" /> Top Rated
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getNocLabel(heroSociety.nocStatus).bg} text-white text-xs font-bold shadow-lg`}>
                      <BadgeCheck className="w-3.5 h-3.5" /> {getNocLabel(heroSociety.nocStatus).text}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-2xl md:text-3xl mb-1 group-hover:text-[#06b6d4] transition-colors">{heroSociety.name}</h3>
                      <p className="text-white/80 text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {heroSociety.areaName}, {heroSociety.city}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-xl text-center">
                      <div className={`text-3xl font-extrabold ${getScoreColor(heroSociety.scores.overall)} leading-none`}>{heroSociety.scores.overall}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">/100 Score</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { label: 'Legal', value: heroSociety.scores.legal, icon: <Shield className="w-3.5 h-3.5" /> },
                      { label: 'Growth', value: heroSociety.scores.growth, icon: <TrendingUp className="w-3.5 h-3.5" /> },
                      { label: 'Overall', value: heroSociety.scores.overall, icon: <Award className="w-3.5 h-3.5" /> },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-center gap-1 mb-1.5">
                          <span className={getScoreColor(s.value)}>{s.icon}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</span>
                        </div>
                        <div className={`text-xl font-extrabold ${getScoreColor(s.value)}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-auto w-full py-3 rounded-xl bg-[#029bba]/10 text-[#029bba] font-bold group-hover:bg-[#029bba] group-hover:text-white transition-all flex items-center justify-center gap-2">
                    View Intelligence Report <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Link>

            {/* MINI CARDS */}
            <div className="grid grid-cols-2 gap-4">
              {miniSocieties.map((society) => (
                <Link key={society._id} href={`/tools/verify-society/${society.slug}`}>
                  <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#029bba]/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:-translate-y-1">
                    <div className="relative h-32 overflow-hidden bg-gray-100">
                      <Image src={society.featuredImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600'} alt={society.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#001f2b]/80 to-transparent" />
                      <div className="absolute top-2 right-2 bg-white rounded-lg px-2 py-1 shadow-md">
                        <div className={`text-sm font-extrabold ${getScoreColor(society.scores.overall)} leading-none`}>{society.scores.overall}</div>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-bold text-[#001f2b] text-sm leading-tight mb-1 group-hover:text-[#029bba] transition-colors">{society.name}</h4>
                      <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {society.city}
                      </p>
                      <div className="mt-auto text-[11px] font-bold text-[#029bba] flex items-center gap-1 group-hover:gap-2 transition-all">
                        Report <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/societies">
            <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto">
              <Building2 className="w-5 h-5" /> Browse All Verified Societies <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}