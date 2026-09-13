import React from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { Mail, CheckCircle, Send, Loader2, Sparkles, Search, Users, ShieldCheck } from 'lucide-react';

interface HomeNewsletterProps {
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubscribing: boolean;
  turnstileKey: number;
  setTurnstileToken: (val: string | null) => void;
}

export default function HomeNewsletter({
  email, setEmail, onSubmit, isSubscribing, turnstileKey, setTurnstileToken
}: HomeNewsletterProps) {
  return (
    <>
      {/* ── NEWSLETTER ── */}
      <section className="py-20 bg-gradient-to-br from-[#004063] to-[#001f2b] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#029bba]/20 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#06b6d4]/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
              <Mail className="w-4 h-4" /> Stay Updated
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              <span className="text-[#06b6d4]">Subscribe</span> to Our Newsletter
            </h2>
            <p className="text-white/70 max-w-xl mx-auto mb-8 text-lg">
              Get the latest real estate insights and property listings delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              {['Weekly market analysis', 'Exclusive property listings', 'Investment tips'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#06b6d4]" />
                  <span className="text-white/80 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-lg mx-auto bg-white/5 rounded-3xl p-8 backdrop-blur-md border border-white/15 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="newsletter-email" className="block text-sm font-bold text-white/90 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/20 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4] outline-none transition-colors font-medium"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-center">
                <Turnstile
                  key={turnstileKey}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                  options={{ theme: 'dark', size: 'normal' }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubscribing}
                className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#06b6d4] text-white font-bold transition-all shadow-lg hover:shadow-[#06b6d4]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubscribing ? <><Loader2 className="w-5 h-5 animate-spin" /> Subscribing...</> : <><Send className="w-5 h-5" /> Subscribe Now</>}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4" /> Start Your Journey Today
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-6 tracking-tight">
            Ready to Find Your <span className="text-[#029bba]">Dream Property?</span>
          </h2>
          <p className="text-gray-600 mb-10 text-lg">
            Join thousands of satisfied customers who found their perfect home or investment with Highrise.pk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/properties">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-bold transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Search className="w-5 h-5" /> Browse Properties
              </button>
            </Link>
            <Link href="/onboarding/business?role=agent">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-[#029bba] text-[#029bba] font-bold hover:bg-[#029bba] hover:text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" /> List Your Property
              </button>
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-10 flex items-center justify-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#029bba]" />
            Verified listings · Trusted developers · Secure platform
          </p>
        </div>
      </section>
    </>
  );
}