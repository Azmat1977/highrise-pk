// pages/developer/projects/[id]/properties.tsx
// Redirects to the new Units system

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { Building2 } from 'lucide-react';

export default function ProjectPropertiesRedirectPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!router.isReady || !id) return;
    void router.replace(`/developer/projects/${id as string}/units`);
  }, [router.isReady, id, router]);

  return (
    <DeveloperLayout>
      <Head>
        <title>Redirecting... | Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666666] text-sm">Redirecting to Units...</p>
        </div>
      </div>
    </DeveloperLayout>
  );
}