import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  UserRound,
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

interface AgentItem {
  slug?: string;
  displayName?: string;
  tagline?: string;
  agentType?: string;
  agencyName?: string;
  city?: string;
  specializations?: string[];
  verificationLevel?: string;
  ratings?: { averageRating?: number; totalReviews?: number };
  stats?: { activeListings?: number };
  documents?: { profilePhoto?: { url?: string } };
}

interface PartnerItem {
  _id: string;
  companyName?: string;
  logo?: { url: string };
}

interface DevelopersPartnersProps {
  developers: DeveloperItem[];
  agents: AgentItem[];
  trustedPartners: PartnerItem[];
  loadingDevelopers: boolean;
  loadingAgents: boolean;
  loadingPartners: boolean;
}

function StarRow({ rating, reviews }: { rating?: number; reviews?: number }) {
  if (typeof rating !== 'number' || rating <= 0) {
    return <span className="text-xs font-medium text-slate-400">No ratings yet</span>;
  }
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-slate-500">
        {rating.toFixed(1)}
        {typeof reviews === 'number' ? ` (${reviews})` : ''}
      </span>
    </div>
  );
}

export default function DevelopersPartners({
  developers,
  agents,
  trustedPartners,
  loadingDevelopers,
  loadingAgents,
  loadingPartners,
}: DevelopersPartnersProps) {
  const [activeTab, setActiveTab] = useState<'developers' | 'agents'>('developers');
  const isLoading = activeTab === 'developers' ? loadingDevelopers : loadingAgents;
  const visibleDevelopers = developers.slice(0, 6);
  const visibleAgents = agents.slice(0, 6);
  const hasItems = activeTab === 'developers' ? visibleDevelopers.length > 0 : visibleAgents.length > 0;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#029bba]/10 px-3 py-1 text-xs font-semibold text-[#007196]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Network</span>
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
              Top Developers &amp; <span className="text-[#029bba]">Agents</span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
              Work with verified builders and licensed agents whose track record is documented on
              Highrise.pk.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Developers and agents"
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'developers'}
              onClick={() => setActiveTab('developers')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'developers'
                  ? 'bg-white text-[#004063] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Developers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'agents'}
              onClick={() => setActiveTab('agents')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'agents'
                  ? 'bg-white text-[#004063] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserRound className="h-3.5 w-3.5" />
              Agents
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#029bba]" />
          </div>
        ) : hasItems ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === 'developers'
              ? visibleDevelopers.map((developer) => (
                  <Link
                    key={developer._id}
                    href={`/developers/${developer.slug || developer._id}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[#029bba]/50 hover:shadow-lg"
                  >
                    <div>
                      <div className="mb-4 flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5">
                          {developer.logo?.url ? (
                            <Image
                              src={developer.logo.url}
                              alt={developer.companyName}
                              width={56}
                              height={56}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate font-heading text-base font-bold text-slate-900 transition-colors group-hover:text-[#004063]">
                              {developer.companyName}
                            </h3>
                            {developer.isVerified && (
                              <BadgeCheck className="h-4 w-4 shrink-0 text-[#029bba]" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wider text-[#029bba]">
                            {developer.developerType || 'Developer'}
                          </p>
                          <div className="mt-1.5">
                            <StarRow rating={developer.rating} reviews={developer.reviewsCount} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 py-3">
                        <div className="border-r border-slate-200 text-center">
                          <p className="text-base font-bold text-slate-900">
                            {developer.completedProjectsCount ?? 0}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Completed
                          </p>
                        </div>
                        <div className="border-r border-slate-200 text-center">
                          <p className="text-base font-bold text-slate-900">
                            {developer.activeProjectsCount ?? 0}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Active
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-slate-900">
                            {developer.establishedYear ?? 'N/A'}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Since
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-[#029bba]" />
                        {developer.city || 'Pakistan'}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#004063] transition-colors group-hover:text-[#029bba]">
                        Profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))
              : visibleAgents.map((agent) => {
                  const href = `/agent/${agent.slug || ''}`;
                  const name = agent.displayName || 'Highrise Agent';
                  return (
                    <Link
                      key={agent.slug || name}
                      href={href}
                      className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[#029bba]/50 hover:shadow-lg"
                    >
                      <div>
                        <div className="mb-4 flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            {agent.documents?.profilePhoto?.url ? (
                              <Image
                                src={agent.documents.profilePhoto.url}
                                alt={name}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound className="h-6 w-6 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="truncate font-heading text-base font-bold text-slate-900 transition-colors group-hover:text-[#004063]">
                                {name}
                              </h3>
                              {agent.verificationLevel ? (
                                <BadgeCheck className="h-4 w-4 shrink-0 text-[#029bba]" />
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wider text-[#029bba]">
                              {agent.agentType || 'Agent'}
                              {agent.agencyName ? ` · ${agent.agencyName}` : ''}
                            </p>
                            <div className="mt-1.5">
                              <StarRow
                                rating={agent.ratings?.averageRating}
                                reviews={agent.ratings?.totalReviews}
                              />
                            </div>
                          </div>
                        </div>

                        {agent.specializations && agent.specializations.length > 0 ? (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {agent.specializations.slice(0, 3).map((specialization) => (
                              <span
                                key={specialization}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                              >
                                {specialization}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                            {agent.tagline || 'Verified property professional on Highrise.pk.'}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-[#029bba]" />
                          {agent.city || 'Pakistan'}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#004063] transition-colors group-hover:text-[#029bba]">
                          {typeof agent.stats?.activeListings === 'number'
                            ? `${agent.stats.activeListings} active`
                            : 'View profile'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            {activeTab === 'developers' ? (
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            ) : (
              <UserRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            )}
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'developers' ? 'No verified developers yet' : 'No verified agents yet'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Profiles appear here after verification is completed by our team.
            </p>
          </div>
        )}

        {trustedPartners.length > 0 && (
          <>
            <div className="mx-auto mb-6 mt-12 flex max-w-3xl items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#029bba]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Trusted Service Partners
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
            </div>

            <div className="relative w-full overflow-hidden">
              <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

              <div className="flex animate-partner-marquee items-center">
                {[0, 1].map((duplicate) => (
                  <div key={duplicate} className="flex items-center gap-4 px-2">
                    {trustedPartners.map((partner, index) => (
                      <div
                        key={`${duplicate}-${partner._id}-${index}`}
                        className="flex h-20 w-44 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm grayscale transition-all hover:grayscale-0"
                      >
                        {loadingPartners ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                        ) : partner.logo?.url ? (
                          <Image
                            src={partner.logo.url}
                            alt={partner.companyName || 'Partner'}
                            width={130}
                            height={52}
                            className="max-h-12 object-contain"
                          />
                        ) : (
                          <span className="text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-400">
                            {partner.companyName || 'Partner'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/developers"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#004063] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#029bba] sm:w-auto"
          >
            Browse All Developers
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/agents"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#004063] transition-colors hover:border-[#029bba] hover:text-[#029bba] sm:w-auto"
          >
            Browse All Agents
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
