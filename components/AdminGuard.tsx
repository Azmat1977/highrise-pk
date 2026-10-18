// components/AdminGuard.tsx
// Admin route protection component
// Uses hasPermission('admin_access_panel') — not hardcoded role check
// Supports: admin | superadmin | moderator | editor | finance roles
// Auth: useSession() only | No localStorage | No as any | No inline styles

import { useEffect }       from 'react';
import { useSession }      from 'next-auth/react';
import { useRouter }       from 'next/router';
import Link                from 'next/link';
import { ShieldX, Loader2 } from 'lucide-react';
import { hasPermission }   from '@/lib/permissions';
import type { UserLike }   from '@/lib/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminGuardProps {
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' || !session?.user) {
      void router.replace(
        `/login?callbackUrl=${encodeURIComponent(router.asPath)}`
      );
    }
  }, [status, session, router]);

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 text-[#029bba] animate-spin mx-auto"
            aria-label="Checking access"
          />
          <p className="mt-4 text-sm text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated (pre-redirect render) ──
  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  // ── Permission check using lib/permissions ──
  const userLike: UserLike = {
    id:   session.user.id,
    role: session.user.role,
  };

  const canAccess = hasPermission(userLike, 'admin_access_panel');

  // ── Access Denied ──
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center 
                      justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm 
                        border border-gray-100 p-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center 
                          justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-[#004063] mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            You don&apos;t have permission to access the admin panel.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Signed in as{' '}
            <span className="font-medium text-gray-600">
              {session.user.email}
            </span>
            {' '}·{' '}
            <span className="capitalize font-medium text-gray-600">
              {session.user.role ?? 'user'}
            </span>
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3 bg-[#029bba] text-white rounded-xl 
                         text-sm font-semibold hover:bg-[#027a94] 
                         transition-colors text-center"
            >
              Go to Homepage
            </Link>
            <Link
              href="/agent/dashboard"
              className="w-full py-3 border border-gray-200 text-gray-600 
                         rounded-xl text-sm font-medium hover:bg-gray-50 
                         transition-colors text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Authorised — render children ──
  return <>{children}</>;
}