// components/developer/RoleUpgradeModal.tsx
// Highrise.pk -- Role Upgrade Gateway Modal
// Prompts normal users or agents to upgrade to Verified Developer account
// Strict Design System Lock: icons from @/lib/design-system/icons | Pure ASCII comments

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { icons } from '@/lib/design-system/icons';
import { typography } from '@/lib/design-system/typography';

interface RoleUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function RoleUpgradeModal({
  isOpen,
  onClose,
  featureName = 'Developer Portal and Project Listing features',
}: RoleUpgradeModalProps): React.ReactElement | null {
  const router = useRouter();

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartOnboarding = () => {
    onClose();
    void router.push('/developer/onboarding');
  };

  const perks = [
    {
      icon: <icons.Building2 className="w-5 h-5 text-[#029bba]" />,
      title: 'List Master-Planned Projects',
      desc: 'Showcase high-rises, commercial plazas, and societies to verified buyers nationwide.',
    },
    {
      icon: <icons.ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: 'Verified Developer Badge',
      desc: 'Build trust with SECP, FBR, and NADRA verified credentials displayed on your profile.',
    },
    {
      icon: <icons.Bot className="w-5 h-5 text-[#7c3aed]" />,
      title: 'ALEEM AI Lead Qualification',
      desc: 'Automatic 24/7 lead screening, WhatsApp follow-ups, and customer interest scoring.',
    },
    {
      icon: <icons.BarChart3 className="w-5 h-5 text-amber-600" />,
      title: 'Real-Time Developer Analytics',
      desc: 'Track investor inquiries, brochure downloads, and campaign conversion rates in real-time.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 border border-gray-100 animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <icons.X className="w-4 h-4" />
        </button>

        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-[#004063] to-[#029bba] p-6 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/20">
            <icons.Building className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mb-1">
            Upgrade to Developer Account
          </h2>
          <p className="text-xs text-white/80 max-w-sm mx-auto">
            To access {featureName}, register your construction firm or corporate entity.
          </p>
        </div>

        {/* Perks Grid */}
        <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {perks.map((perk, index) => (
            <div
              key={index}
              className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3.5"
            >
              <div className="p-2 bg-white rounded-lg shadow-xs shrink-0">
                {perk.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#004063] leading-tight">
                  {perk.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {perk.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/3 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors text-center"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={handleStartOnboarding}
            className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl bg-[#029bba] hover:bg-[#017a8a] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            Start 4-Stage Onboarding
            <icons.ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
