// ========== FILE: pages/coming-soon.tsx ==========
// Highrise.pk — Coming Soon Placeholder
// For features not yet built (Service Provider, Labour, etc.)
// =====================================================

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Wrench,
  HardHat,
  Clock,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

const FEATURES: Record<string, {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  provider: {
    title: 'Service Provider Registration',
    description:
      'Register your business as a contractor, vendor, factory, or legal service provider on Highrise.pk. Receive leads, showcase your work, and grow your business.',
    icon: <Wrench className="w-10 h-10" />,
    color: '#d97706',
  },
  labour: {
    title: 'Skilled Labour Registration',
    description:
      'Register as a mason, electrician, plumber, painter, or any skilled trade. Get police-verified, receive job requests, and build your reputation on Highrise.pk.',
    icon: <HardHat className="w-10 h-10" />,
    color: '#dc2626',
  },
};

export default function ComingSoonPage() {
  const router = useRouter();
  const featureKey = String(router.query.feature ?? 'provider');
  const feature = FEATURES[featureKey] ?? FEATURES['provider'];

  return (
    <>
      <Head>
        <title>{feature.title} — Coming Soon | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200
                        shadow-sm p-8 text-center">

          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center
                        mx-auto mb-6"
            style={{
              backgroundColor: `${feature.color}15`,
              color: feature.color,
            }}
          >
            {feature.icon}
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          bg-amber-100 text-amber-800 text-sm font-semibold mb-4">
            <Clock className="w-4 h-4" />
            Coming Soon
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-[#004063] mb-3">
            {feature.title}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {feature.description}
          </p>

          <p className="text-sm text-gray-500 mb-6">
            We are building this feature and will launch it soon.
            Contact us to get early access or express your interest.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="https://wa.me/923335877106?text=I%20am%20interested%20in%20registering%20on%20Highrise.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-5 py-3
                         rounded-xl bg-[#029bba] text-white font-semibold
                         hover:bg-[#027a94] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us for Early Access
            </a>

            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full px-5 py-3
                         rounded-xl border border-gray-200 text-gray-700
                         font-semibold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Contact */}
          <p className="text-xs text-gray-400 mt-6">
            📞 +92 333 5877106 · info@highrise.pk
          </p>
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========