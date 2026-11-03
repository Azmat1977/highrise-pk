// pages/login.tsx
import React, { useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import { sanitizeCallbackUrl } from "@/lib/auth/safeRedirect";
import LoginOrSignupForm from "@/components/auth/LoginOrSignupForm";
import { icons } from "@/lib/design-system/icons";

const { ArrowLeft, X } = icons;

type FormMode = "login" | "signup" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();

  const returnTo = useMemo(() => {
    if (!router.isReady) return "/";
    const raw =
      (typeof router.query.returnTo === "string" && router.query.returnTo) ||
      (typeof router.query.callbackUrl === "string" && router.query.callbackUrl) ||
      (typeof router.query.redirect === "string" && router.query.redirect) ||
      "/";
    return sanitizeCallbackUrl(raw, "/");
  }, [router.isReady, router.query]);

  const defaultMode: FormMode = useMemo(() => {
    const qMode =
      typeof router.query.mode === "string"
        ? router.query.mode.toLowerCase().trim()
        : "";
    if (qMode === "signup") return "signup";
    if (qMode === "forgot") return "forgot";
    if (qMode === "reset") return "reset";
    return "login";
  }, [router.query.mode]);

  const context = useMemo(() => {
    const qCtx =
      typeof router.query.context === "string"
        ? router.query.context.toLowerCase().trim()
        : "";
    if (qCtx === "listing" || qCtx === "save" || qCtx === "contact") {
      return qCtx;
    }
    return "contact";
  }, [router.query.context]);

  return (
    <>
      <Head>
        <title>Sign In | Highrise.pk</title>
        <meta
          name="description"
          content="Sign in or create your Highrise.pk account."
        />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <Link
                href={returnTo}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:text-[#004063] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to 1-Click Options
              </Link>
              <Link
                href={returnTo}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Link>
            </div>

            <div className="px-6 pb-6 pt-1">
              <LoginOrSignupForm
                isModal={true}
                defaultMode={defaultMode}
                context={context}
                returnTo={returnTo}
                onSuccess={() => {
                  void router.push(returnTo);
                }}
              />
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            By continuing, you agree to our{" "}
            <Link
              href="/terms-of-service"
              className="text-[#029bba] hover:underline font-semibold"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="text-[#029bba] hover:underline font-semibold"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSidePropsSession(ctx);
  if (session?.user) {
    const raw =
      (typeof ctx.query.returnTo === "string" && ctx.query.returnTo) ||
      (typeof ctx.query.callbackUrl === "string" && ctx.query.callbackUrl) ||
      (typeof ctx.query.redirect === "string" && ctx.query.redirect) ||
      "/";
    const destination = sanitizeCallbackUrl(raw, "/");
    return {
      redirect: {
        destination,
        permanent: false,
      },
    };
  }
  return { props: {} };
};

async function getServerSidePropsSession(
  ctx: Parameters<GetServerSideProps>[0]
) {
  return getServerSession(ctx.req, ctx.res, authOptions);
}