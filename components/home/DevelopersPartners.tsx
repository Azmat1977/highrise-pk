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

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '').charAt(0)}${(parts[parts.length - 1] ?? '').charAt(0)}`.toUpperCase();
}

/** "cnic_verified" → "Cnic Verified" */
function formatLabel(raw?: string): string {
  return (raw || '').replace(/_/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

const BADGE_PILL =
  'shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-[#004063]';

const STAT_BOX =
  'flex items-center justify-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3';

const CARD_CLASS =
  'group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#029bba]/50 hover:shadow-xl';

const CTA_BAR =
  'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#004063] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors group-hover:bg-[#029bba]';

function RatingStat({ rating, reviews }: { rating?: number; reviews?: number }) {
  const hasRating = typeof rating === 'number' && rating > 0;
  return (
    <div className={STAT_BOX}>
      <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />
      <div className="min-w-0 text-left">
        <p className="text-sm font-extrabold leading-tight text-slate-900">
          {hasRating ? `${rating!.toFixed(1)} / 5.0` : 'New'}
        </p>
        <p className="text-[10px] font-medium text-slate-500">
          {typeof reviews === 'number' && reviews > 0 ? `${reviews} reviews` : 'No ratings yet'}
        </p>
      </div>
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
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#029bba]/20 bg-[#029bba]/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007196]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Accredited Industry Partners</span>
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
              Top Developers ({developers.length})
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
              Certified Agents ({agents.length})
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
                    className={CARD_CLASS}
                  >
                    <div>
                      {/* Identity: navy initials tile + name + location + badge pill */}
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3.5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#004063] text-white shadow-md">
                            {developer.logo?.url ? (
                              <Image
                                src={developer.logo.url}
                                alt={developer.companyName}
                                width={56}
                                height={56}
                                className="h-full w-full bg-white object-contain p-1"
                              />
                            ) : (
                              <span className="text-base font-black tracking-tight">
                                {initialsOf(developer.companyName)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <h3 className="line-clamp-2 font-heading text-base font-extrabold leading-tight text-[#004063] transition-colors group-hover:text-[#029bba]">
                                {developer.companyName}
                              </h3>
                              {developer.isVerified && (
                                <BadgeCheck className="h-4 w-4 shrink-0 text-[#029bba]" />
                              )}
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
                              <span className="truncate">{developer.city || 'Pakistan'}</span>
                            </p>
                          </div>
                        </div>
                        <span className={BADGE_PILL}>
                          {developer.isVerified
                            ? 'Featured Developer'
                            : developer.developerType || 'Developer'}
                        </span>
                      </div>

                      {/* Stat boxes */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <RatingStat rating={developer.rating} reviews={developer.reviewsCount} />
                        <div className={STAT_BOX}>
                          <Briefcase className="h-5 w-5 shrink-0 text-[#004063]" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-extrabold leading-tight text-[#004063]">
                              {developer.activeProjectsCount ?? 0}{' '}
                              <span className="text-[#029bba]">Active</span>
                            </p>
                            <p className="text-[10px] font-medium text-slate-500">
                              Projects under dev
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className={CTA_BAR}>
                      Explore Projects
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))
              : visibleAgents.map((agent) => {
                  const href = `/agent/${agent.slug || ''}`;
                  const name = agent.displayName || 'Highrise Agent';
                  return (
                    <Link
                      key={agent.slug || name}
                      href={href}
                      className={CARD_CLASS}
                    >
                      <div>
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3.5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#004063] text-white shadow-md">
                              {agent.documents?.profilePhoto?.url ? (
                                <Image
                                  src={agent.documents.profilePhoto.url}
                                  alt={name}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-base font-black tracking-tight">
                                  {initialsOf(name)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <h3 className="line-clamp-2 font-heading text-base font-extrabold leading-tight text-[#004063] transition-colors group-hover:text-[#029bba]">
                                  {name}
                                </h3>
                                {agent.verificationLevel ? (
                                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#029bba]" />
                                ) : null}
                              </div>
                              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
                                <span className="truncate">
                                  {agent.city || 'Pakistan'}
                                  {agent.agencyName ? ` · ${agent.agencyName}` : ''}
                                </span>
                              </p>
                            </div>
                          </div>
                          <span className={BADGE_PILL}>
                            {agent.verificationLevel
                              ? formatLabel(agent.verificationLevel)
                              : agent.agentType || 'Agent'}
                          </span>
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

                        <div className="grid grid-cols-2 gap-2.5">
                          <RatingStat
                            rating={agent.ratings?.averageRating}
                            reviews={agent.ratings?.totalReviews}
                          />
                          <div className={STAT_BOX}>
                            <Briefcase className="h-5 w-5 shrink-0 text-[#004063]" />
                            <div className="min-w-0 text-left">
                              <p className="text-sm font-extrabold leading-tight text-[#004063]">
                                {agent.stats?.activeListings ?? 0}{' '}
                                <span className="text-[#029bba]">Active</span>
                              </p>
                              <p className="text-[10px] font-medium text-slate-500">
                                Listings live
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <span className={CTA_BAR}>
                        View Agent Profile
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#004063] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#029bba] hover:shadow-lg sm:w-auto"
          >
            Browse All Developers
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/agents"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#004063] transition-all hover:-translate-y-0.5 hover:border-[#029bba] hover:text-[#029bba] sm:w-auto"
          >
            Browse All Agents
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}