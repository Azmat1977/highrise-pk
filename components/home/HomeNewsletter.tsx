import React from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { BellRing, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';

interface HomeNewsletterProps {
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubscribing: boolean;
  turnstileKey: number;
  setTurnstileToken: (val: string | null) => void;
}

const PERKS = ['Weekly market analysis', 'New verified listings', 'Investment insights'];

export default function HomeNewsletter({
  email,
  setEmail,
  onSubmit,
  isSubscribing,
  turnstileKey,
  setTurnstileToken,
}: HomeNewsletterProps) {
  return (
    <section className="bg-white pb-16 pt-4 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#004063]/10 bg-gradient-to-br from-[#eef6f9] via-white to-[#e6f1f5] p-6 shadow-sm sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#029bba]/10 blur-3xl"
          />

          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#029bba]/20 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007196]">
                <BellRing className="h-3.5 w-3.5 text-[#029bba]" />
                <span>Weekly Market Brief</span>
              </span>
              <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[#001f2b] sm:text-3xl">
                Property Intelligence, <span className="text-[#029bba]">Delivered</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Get new verified listings, price movements and investment notes for the Pakistani
                market in one email.
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-[#029bba]" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="newsletter-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="your.email@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
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
                    options={{ theme: 'light', size: 'normal' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004063] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#029bba] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Subscribing&hellip;
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Subscribe Now
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] leading-relaxed text-slate-400">
                  No spam. Unsubscribe anytime from any email we send.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
