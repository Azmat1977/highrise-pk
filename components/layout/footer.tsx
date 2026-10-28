// components/layout/footer.tsx
// ENTERPRISE FOOTER -- HIGHRISE.PK
// Design System v19 Compliant -- Brand tokens and central icon registry

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { icons } from '@/lib/design-system/icons';
import { colors } from '@/lib/design-system/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = '923335877106';

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerType = 'success' | 'error' | 'already';

interface FooterLink {
  label: string;
  href: string;
  icon?: React.ReactElement;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// ─── Footer Data ──────────────────────────────────────────────────────────────

const TOOLS_LINKS: FooterLink[] = [
  { label: 'Verify Society NOC', href: '/tools/verify-society', icon: <icons.ShieldCheck className="w-3.5 h-3.5" /> },
  { label: 'Fair Price Estimator', href: '/tools/price-estimator', icon: <icons.Banknote className="w-3.5 h-3.5" /> },
  { label: 'Construction Calculator', href: '/tools/construction-calculator', icon: <icons.Construction className="w-3.5 h-3.5" /> },
  { label: 'Home Loan Calculator', href: '/tools/home-loan-calculator', icon: <icons.Calculator className="w-3.5 h-3.5" /> },
  { label: 'Area Unit Converter', href: '/tools/area-unit-converter', icon: <icons.Ruler className="w-3.5 h-3.5" /> },
  { label: 'View All Tools', href: '/tools', icon: <icons.Sparkles className="w-3.5 h-3.5" /> },
];

const PROPERTIES_LINKS: FooterLink[] = [
  { label: 'Buy Property', href: '/properties?listingType=full_payment' },
  { label: 'Rent Property', href: '/properties?listingType=rent' },
  { label: 'New Projects', href: '/projects' },
  { label: 'Verified Societies', href: '/societies' },
  { label: 'On Installments', href: '/properties?listingType=installment' },
  { label: 'Verified Developers', href: '/developers' },
  { label: 'List Your Property', href: '/add-property' },
];

const COMPANY_LINKS: FooterLink[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Blog & Insights', href: '/blog' },
  { label: 'Careers', href: '/about#careers' },
  { label: 'Press Kit', href: '/about#press' },
];

const SUPPORT_LINKS: FooterLink[] = [
  { label: 'Help Center', href: '/contact#faq' },
  { label: 'Report Fraud', href: '/contact?type=report_fraud' },
  { label: 'Become a Developer', href: '/onboarding/business?role=developer' },
  { label: 'Become an Agent', href: '/onboarding/business?role=agent' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const Footer: React.FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: BannerType; message: string } | null>(null);

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleNewsletterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    if (!email.trim()) {
      setBanner({ type: 'error', message: 'Please enter your email' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setBanner({ type: 'error', message: 'Please enter a valid email' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: 'footer' }),
      });
      const data = await res.json();

      if (data.success) {
        setBanner({ type: 'success', message: 'Subscribed! Check your inbox.' });
        setEmail('');
      } else if (data.message?.toLowerCase().includes('already')) {
        setBanner({ type: 'already', message: 'You are already subscribed.' });
      } else {
        setBanner({ type: 'error', message: data.message || 'Failed to subscribe.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hi Highrise.pk team, I have a question about property in Pakistan.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const isActiveLink = (href: string): boolean => {
    const cleanHref = href.split('?')[0].split('#')[0];
    return router.pathname === cleanHref || router.asPath.startsWith(cleanHref);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <footer className="relative bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] text-white overflow-hidden">
      {/* Brand teal accent top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#029bba] to-transparent" />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative">

        {/* ─── MAIN FOOTER GRID ── */}
        <div className="container mx-auto px-4 pt-12 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">

            {/* ─── Brand + About (3 cols) ─── */}
            <div className="lg:col-span-3">
              <Link href="/" className="inline-flex items-center group mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Highrise.pk"
                  width={160}
                  height={56}
                  className="h-12 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105"
                />
              </Link>

              <p className="text-sm text-white/70 leading-relaxed mb-5">
                Pakistan&apos;s first <strong className="text-[#06b6d4]">property intelligence platform</strong>.
                Verify societies, check fair prices, and discover trusted developers -- all in one place.
              </p>

              {/* Social Icons */}
              <div className="mb-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-3">Follow Us</div>
                <div className="flex items-center gap-2">
                  <SocialButton
                    href="https://www.facebook.com/official.highrise.pk"
                    label="Facebook"
                    brandColor="#1877F2"
                    icon={<icons.Facebook className="w-4 h-4" />}
                  />
                  <SocialButton
                    href="https://www.instagram.com/officialhighrise.pk/"
                    label="Instagram"
                    brandColor="gradient-instagram"
                    icon={<icons.Instagram className="w-4 h-4" />}
                  />
                  <SocialButton
                    href="https://www.youtube.com/@officialhighrise"
                    label="YouTube"
                    brandColor="#FF0000"
                    icon={<icons.Youtube className="w-4 h-4" />}
                  />
                  <SocialButton
                    href="#"
                    label="Twitter (coming soon)"
                    brandColor="#000000"
                    icon={<icons.Twitter className="w-4 h-4" />}
                    disabled
                  />
                  <SocialButton
                    href="#"
                    label="LinkedIn (coming soon)"
                    brandColor="#0A66C2"
                    icon={<icons.Linkedin className="w-4 h-4" />}
                    disabled
                  />
                </div>
              </div>

              {/* WhatsApp Direct Button */}
              <button
                onClick={handleWhatsApp}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-semibold shadow-lg transition-colors"
              >
                <icons.MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </button>
            </div>

            {/* Tools (2 cols) */}
            <FooterLinksColumn
              title="Free Tools"
              icon={<icons.Sparkles className="w-4 h-4 text-[#06b6d4]" />}
              links={TOOLS_LINKS}
              isActiveLink={isActiveLink}
              highlightLast
            />

            {/* Properties (2 cols) */}
            <FooterLinksColumn
              title="Properties"
              icon={<icons.Home className="w-4 h-4 text-[#06b6d4]" />}
              links={PROPERTIES_LINKS}
              isActiveLink={isActiveLink}
            />

            {/* Company (2 cols) */}
            <FooterLinksColumn
              title="Company"
              icon={<icons.Building2 className="w-4 h-4 text-[#06b6d4]" />}
              links={COMPANY_LINKS}
              isActiveLink={isActiveLink}
            />

            {/* Newsletter (3 cols) */}
            <div className="lg:col-span-3">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <icons.Mail className="w-4 h-4 text-[#06b6d4]" />
                Stay Updated
              </h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                Weekly insights: market trends, new societies, risk alerts. <strong>No spam.</strong>
              </p>

              <form onSubmit={handleNewsletterSubmit} noValidate className="space-y-2">
                <div className="relative">
                  <icons.Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={submitting}
                    maxLength={200}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/40 focus:bg-white/10 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] hover:from-[#06b6d4] hover:to-[#029bba] text-white text-sm font-semibold transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><icons.Loader2 className="w-4 h-4 animate-spin" />Subscribing...</>
                  ) : (
                    <><icons.Send className="w-4 h-4" />Subscribe</>
                  )}
                </button>

                {banner && (
                  <div className={`mt-2 rounded-lg border-l-4 p-2 flex items-start gap-2 text-xs ${
                    banner.type === 'success' ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' :
                    banner.type === 'already' ? 'bg-[#029bba]/10 border-[#029bba] text-[#06b6d4]' :
                    'bg-[#ef4444]/10 border-[#ef4444] text-red-400'
                  }`}>
                    {banner.type === 'success' && <icons.CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                    {banner.type === 'already' && <icons.Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                    {banner.type === 'error' && <icons.XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                    <span className="flex-1 font-medium">{banner.message}</span>
                  </div>
                )}
              </form>

              <p className="text-[10px] text-white/40 mt-3 leading-relaxed">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-white/10 bg-[#001120]">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">

              {/* Left: Copyright */}
              <div className="text-white/60 text-center md:text-left">
                © 2016 Highrise.pk. All rights reserved.
              </div>

              {/* Center: Legal Links */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/60">
                <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
                <span className="text-white/20">|</span>
                <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
                <span className="text-white/20">|</span>
                <Link href="/privacy-policy#cookies" className="hover:text-white transition-colors">Cookies</Link>
                <span className="text-white/20">|</span>
                <Link href="/sitemap.xml" className="hover:text-white transition-colors">Sitemap</Link>
              </div>

              {/* Right: Language + Made With */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-white/60">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  title="Language selector (coming soon)"
                >
                  <icons.Globe className="w-3.5 h-3.5" />
                  <span>English</span>
                  <icons.ChevronDown className="w-3 h-3" />
                </button>
                <span className="text-white/20">|</span>
                <span className="inline-flex items-center gap-1">
                  Made with <icons.Heart className="w-3 h-3 text-[#ef4444] fill-current" /> in Pakistan
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── Sub-Component: Social Button ─────────────────────────────────────────────

interface SocialButtonProps {
  href: string;
  label: string;
  brandColor: string;
  icon: React.ReactElement;
  disabled?: boolean;
}

function SocialButton({ href, label, brandColor, icon, disabled }: SocialButtonProps): React.ReactElement {
  const isGradient = brandColor === 'gradient-instagram';

  const baseClasses = 'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200';

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        title={label}
        className={`${baseClasses} bg-white/5 border border-white/10 text-white/30 cursor-not-allowed`}
      >
        {icon}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`${baseClasses} bg-white/5 border border-white/10 text-white/70 hover:text-white hover:scale-110 hover:shadow-lg ${
        isGradient
          ? 'hover:bg-gradient-to-br hover:from-[#FEDA75] hover:via-[#FA7E1E] hover:to-[#D62976]'
          : ''
      }`}
      style={
        !isGradient
          ? {
              ['--hover-bg' as string]: brandColor,
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (!isGradient) {
          e.currentTarget.style.backgroundColor = brandColor;
          e.currentTarget.style.borderColor = brandColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isGradient) {
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.borderColor = '';
        }
      }}
    >
      {icon}
    </a>
  );
}

// ─── Sub-Component: Footer Links Column ───────────────────────────────────────

interface FooterLinksColumnProps {
  title: string;
  icon: React.ReactElement;
  links: FooterLink[];
  isActiveLink: (href: string) => boolean;
  highlightLast?: boolean;
}

function FooterLinksColumn({
  title,
  icon,
  links,
  isActiveLink,
  highlightLast,
}: FooterLinksColumnProps): React.ReactElement {
  return (
    <div className="lg:col-span-2">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link, idx) => {
          const isLast = highlightLast && idx === links.length - 1;
          const isActive = isActiveLink(link.href);

          return (
            <li key={link.href + idx}>
              <Link
                href={link.href}
                className={`group inline-flex items-center gap-1.5 text-sm transition-colors ${
                  isLast
                    ? 'text-[#06b6d4] font-semibold hover:text-white'
                    : isActive
                    ? 'text-white font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.icon && (
                  <span className={`flex-shrink-0 ${isLast ? 'text-[#06b6d4]' : 'text-white/40 group-hover:text-[#06b6d4]'}`}>
                    {link.icon}
                  </span>
                )}
                <span>{link.label}</span>
                {isLast && (
                  <icons.ArrowRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Footer;