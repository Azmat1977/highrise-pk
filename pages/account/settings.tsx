// pages/account/settings.tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { getSession } from "next-auth/react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Shield, LogOut, Laptop } from "lucide-react";

type PageProps = {
  userEmail: string;
  userName: string;
  userRole: string;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const session = await getSession(ctx);

  // Protect page server-side (no flash of private content)
  if (!session?.user) {
    const redirectTo = encodeURIComponent("/account/settings");
    return {
      redirect: {
        destination: `/login?redirect=${redirectTo}`,
        permanent: false,
      },
    };
  }

  // Defense-in-depth: prevent caching of authenticated pages
  ctx.res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  ctx.res.setHeader("Pragma", "no-cache");
  ctx.res.setHeader("Expires", "0");

  const sUser = session.user as any;

  return {
    props: {
      userEmail: sUser?.email || "",
      userName: sUser?.name || sUser?.displayName || "",
      userRole: sUser?.role || "user",
    },
  };
};

export default function AccountSettingsPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const displayName = useMemo(() => {
    const name = props.userName?.trim();
    if (name) return name;
    const email = props.userEmail?.trim();
    if (email) return email.split("@")[0];
    return "User";
  }, [props.userName, props.userEmail]);

  const roleLabel = useMemo(() => {
    const r = (props.userRole || "user").toLowerCase();
    if (r === "admin") return "Admin";
    if (r === "developer") return "Developer";
    if (r === "agent") return "Agent";
    return "User";
  }, [props.userRole]);

  const handleLogoutAllDevices = useCallback(async () => {
    if (isLoggingOutAll) return;

    // Safety: session check (client-side defense-in-depth)
    if (!session?.user) {
      toast.error("You are not logged in.");
      router.push("/login?redirect=/account/settings");
      return;
    }

    setIsLoggingOutAll(true);

    try {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          "Unable to log out all devices. Please try again.";
        toast.error(msg);
        return;
      }

      toast.success("All devices logged out. Redirecting…");

      // Immediately end current session too (user experience + safety)
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      console.error("Logout-all devices error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoggingOutAll(false);
    }
  }, [isLoggingOutAll, router, session]);

  return (
    <>
      <Head>
        <title>Account Settings | Highrise.pk</title>
        <meta
          name="description"
          content="Manage your account settings and security preferences on Highrise.pk."
        />
        {/* Private page: avoid indexing */}
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </Head>

      <div className="min-h-[70vh] bg-gray-50">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Account Settings
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage your account and security preferences.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold">
                      <Shield className="w-4 h-4" />
                      {roleLabel}
                    </span>
                    <span className="text-sm text-gray-600">
                      Signed in as{" "}
                      <span className="font-semibold text-gray-900">
                        {displayName}
                      </span>
                      {props.userEmail ? (
                        <>
                          {" "}
                          <span className="text-gray-400">•</span>{" "}
                          <span className="font-medium">{props.userEmail}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/")}
                  className="text-sm font-semibold text-[#029bba] hover:text-[#027a94] transition-colors"
                >
                  Back to Home →
                </button>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Security</h2>
                  <p className="text-sm text-gray-600">
                    Control your active sessions and protect your account.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Logout all devices
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      This will invalidate all sessions across devices, including
                      current one.
                    </p>
                  </div>

                  <button
                    onClick={handleLogoutAllDevices}
                    disabled={isLoggingOutAll || status === "loading"}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-70"
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOutAll ? "Logging out…" : "Logout All Devices"}
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Tip: If you suspect unauthorized access, change your password
                  after logging out all devices.
                </div>
              </div>

              {/* Future slots */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                <p className="text-sm font-semibold text-gray-900">
                  Coming next:
                </p>
                <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                  <li>Security activity viewer (admin)</li>
                  <li>2FA (Authenticator app) for Admin/Agent</li>
                  <li>Password reuse prevention</li>
                </ul>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-500 mt-6 text-center">
              Highrise.pk • Secure account controls • Defense-in-depth enabled
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
