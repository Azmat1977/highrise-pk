// ========== FILE: pages/admin/properties/featured/index.tsx ==========
// Admin: Featured Properties — featuredOnly filtered view
// Auth: useSession() guard (AdminGuard BANNED — V6.4.2)
// =====================================================================

import React, { useEffect } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminPropertiesContent } from "@/pages/admin/properties";

export default function FeaturedPropertiesPage(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || session.user?.role !== "admin") {
      void router.replace("/login?redirect=/admin/properties/featured");
    }
  }, [session, authStatus, router]);

  if (authStatus === "loading") {
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

  if (!session || session.user?.role !== "admin") return <></>;

  return (
    <>
      <Head>
        <title>Featured Properties | Admin — Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout>
        <AdminPropertiesContent
          initialFilterStatus=""
          featuredOnly={true}
          pageTitle="Featured Properties"
        />
      </AdminLayout>
    </>
  );
}
// ========== END OF FILE ==========