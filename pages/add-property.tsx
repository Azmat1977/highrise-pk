// File: pages/add-property.tsx

import React, { useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { icons } from "@/lib/design-system/icons";
import AuthGateModal from "@/components/auth/AuthGateModal";
import PropertyListingForm from "@/components/property/forms/listing/PropertyListingForm";

const {
  Home,
  ChevronRight,
  Shield,
  HelpCircle,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
} = icons;

export default function AddPropertyPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const isSessionLoading = status === "loading";

  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const openEmailModal = useCallback(() => setEmailModalOpen(true), []);
  const closeEmailModal = useCallback(() => setEmailModalOpen(false), []);

  return (
    <>
      <Head>
        <title>List Your Property | Highrise.pk</title>
        <meta
          name="description"
          content="List your property on Highrise.pk — Pakistan's first verified, transparent real estate platform."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://highrise.pk/add-property" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ENTERPRISE 1440PX FUNCTIONAL CONTAINER SHELL */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5 space-y-4">
          
          {/* BREADCRUMBS & HEADER ZONE */}
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-[#004063] font-bold">Add Property</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
                  List Your Property
                </h1>
                <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Reach thousands of verified buyers instantly</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-600">100% Verified Portal</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#029bba]">SECP Registered</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  Verified Owners Only
                </span>
              </div>
            </div>
          </div>

          {/* MAIN FORM ZONE */}
          <div className="pb-8">
            {isSessionLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm font-semibold text-gray-500 shadow-sm">
                Checking your account session...
              </div>
            ) : isLoggedIn ? (
              <PropertyListingForm />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-lg font-bold text-[#004063]">
                  Sign in required to list a property
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Please sign in or create an account to access the property listing form.
                </p>
              </div>
            )}
          </div>

          <AuthGateModal
            isOpen={!isSessionLoading && !isLoggedIn}
            onClose={() => {
              void router.push("/");
            }}
            context="listing"
          />

          {/* SUPPORT SECTION */}
          <div className="pb-16 md:pb-20">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="grid lg:grid-cols-[1fr_1.2fr]">

                {/* Left — copy */}
                <div className="px-6 py-8 md:px-10 md:py-10 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-semibold mb-5">
                    <HelpCircle className="w-4 h-4" />
                    Expert Listing Support
                  </span>

                  <h2 className="text-2xl md:text-3xl font-bold text-[#004063] leading-tight mb-3">
                    Need help listing your property?
                  </h2>
                  <p className="text-[#666666] text-sm md:text-base leading-relaxed max-w-md mb-6">
                    Our team can help you choose the right listing type, guide you
                    through the form, and make sure your property goes live with
                    confidence.
                  </p>

                  <ul className="space-y-3 mb-7">
                    {[
                      "Quick help for owners, agents, and developers",
                      "Assistance with pricing, details, and listing flow",
                      "Fast support via call, WhatsApp, and email",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-[#333333]">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-[#333333] text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#029bba]" />
                      Mon – Sat: 9AM – 9PM
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-[#333333] text-xs font-medium">
                      <Users className="w-3.5 h-3.5 text-[#029bba]" />
                      Human support
                    </span>
                  </div>
                </div>

                {/* Right — action cards */}
                <div className="px-6 py-8 md:px-10 md:py-10 space-y-4">
                  {/* Call */}
                  <a
                    href="tel:+923335877106"
                    className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 px-5 py-4 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[#004063]">Call Us</p>
                        <p className="text-xs text-[#666666]">Speak with our support team</p>
                        <p className="text-sm font-bold text-blue-600 mt-0.5">+92 333 5877106</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-500 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/923335877106?text=Hi%20Highrise.pk%2C%20I%20need%20help%20with%20property%20listing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 px-5 py-4 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[#004063]">WhatsApp</p>
                        <p className="text-xs text-[#666666]">Get quick help instantly</p>
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">+92 333 5877106</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-500 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </a>

                  {/* Email */}
                  <button
                    type="button"
                    onClick={openEmailModal}
                    className="group w-full flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#029bba]/5 hover:border-[#029bba]/30 px-5 py-4 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[#004063]">Email</p>
                        <p className="text-xs text-[#666666]">For detailed queries and follow-up</p>
                        <p className="text-sm font-bold text-[#029bba] mt-0.5">support@highrise.pk</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#029bba] transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* Trust strip */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 md:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#004063]">100% Secure & Trusted</p>
                      <p className="text-xs text-[#666666]">Enterprise-grade data protection</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "SSL Secured", icon: "🔒" },
                      { label: "Verified Portal", icon: "✓" },
                      { label: "SECP Registered", icon: "📋" },
                    ].map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-[#333333]"
                      >
                        {b.icon} {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Contact via Email"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeEmailModal}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#004063]">Contact via Email</h3>
                  <p className="text-xs text-[#666666]">Choose how to reach support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEmailModal}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-1">
                  Support Email
                </p>
                <p className="text-base font-bold text-[#004063]">support@highrise.pk</p>
                <p className="text-xs text-[#666666] mt-1">
                  Best for detailed property listing questions and follow-up.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=support@highrise.pk&su=Property%20Listing%20Help"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeEmailModal}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] text-white font-semibold px-5 py-3 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  </svg>
                  Open in Gmail
                </a>

                <a
                  href="mailto:support@highrise.pk?subject=Property%20Listing%20Help"
                  onClick={closeEmailModal}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#333333] font-semibold px-5 py-3 transition-colors"
                >
                  Open in Mail App
                </a>

                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="w-full flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-[#666666] font-semibold px-5 py-3 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}