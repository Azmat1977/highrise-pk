// ========== FILE: pages/agent/index.tsx ==========
// Smart redirect — /agent is not a landing page
// Routes users based on authentication + role:
//   Not logged in                   → /agents (public directory)
//   Logged in as agent or admin     → /agent/dashboard
//   Logged in as any other role     → /agents (public directory)
// V6.4.3 — Enhanced UX + accessibility
// =================================================

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Shield, Loader2 } from "lucide-react";

export default function AgentIndexRedirect(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redirectMessage, setRedirectMessage] = useState<string>("Preparing your workspace...");

  useEffect(() => {
    // Wait for session to resolve
    if (status === "loading") {
      setRedirectMessage("Checking your session...");
      return;
    }

    if (!session) {
      // Not logged in → public agents directory
      setRedirectMessage("Redirecting to agents directory...");
      void router.replace("/agents");
      return;
    }

    const role = session.user?.role;

    if (role === "agent" || role === "admin") {
      // Logged in as agent or admin → dashboard
      setRedirectMessage("Loading your dashboard...");
      void router.replace("/agent/dashboard");
      return;
    }

    // Logged in but not an agent → public directory
    setRedirectMessage("Redirecting to agents directory...");
    void router.replace("/agents");
  }, [session, status, router]);

  return (
    <>
      <Head>
        <title>Redirecting... | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>

      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
        role="status"
        aria-live="polite"
        aria-label="Redirecting"
      >
        <div className="text-center max-w-sm">
          {/* Brand icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#029bba]/20">
            <Shield className="w-8 h-8 text-white" />
          </div>

          {/* Spinner */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" />
            <p className="text-sm font-semibold text-gray-700">
              {redirectMessage}
            </p>
          </div>

          {/* Subtitle */}
          <p className="text-xs text-gray-500">
            Please wait while we route you to the right place
          </p>
        </div>
      </div>
    </>
  );
}

// ========== END OF FILE ==========