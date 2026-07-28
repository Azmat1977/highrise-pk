// ========== FILE: pages/admin/projects/pending/index.tsx ==========
// Admin: Pending Projects — pre-filtered view
// Auth: useSession() guard (AdminGuard BANNED — V6.4.2)
// =================================================================

import React, { useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminProjectsContent } from '@/pages/admin/projects';

export default function PendingProjectsPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as { role?: string })?.role !== 'admin') {
      void router.replace('/login?redirect=/admin/projects/pending');
    }
  }, [session, authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#029bba] border-t-transparent
            rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== 'admin') return <div />;

  return (
    <>
      <Head>
        <title>Pending Projects | Admin — Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <AdminLayout>
        <AdminProjectsContent
          initialFilterStatus="pending"
          pageTitle="Pending Approval"
        />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========