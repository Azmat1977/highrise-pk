// pages/login.tsx
// Highrise.pk — Login Page
// V5.9.0: react-hot-toast removed, react-icons removed, role URL param removed,
//         lucide-react icons, inline banners, /dashboard default redirect

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import LoginOrSignupForm from "@/components/auth/LoginOrSignupForm";
import { sanitizeCallbackUrl } from "@/lib/auth/safeRedirect";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

// "signup" | "forgot" | "reset" are all rendered by the shared
// LoginOrSignupForm (the same component used by the AuthGateModal).
type AuthMode = "login" | "signup" | "forgot" | "reset";

interface LoginFormData {
  email: string;
  password: string;
}

// ─── Component ────────────────────────────────────────────────

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Read mode from query param — no role reading (Rule 19)
  // `callbackUrl` is the canonical param; `redirect` is a legacy alias kept
  // so existing links keep working. Both are validated before use.
  const { mode, callbackUrl, redirect, error: queryError } = router.query;
  const requestedRedirect =
    typeof callbackUrl === "string" && callbackUrl ? callbackUrl : redirect;

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState<LoginFormData>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // Determine auth mode from query param / hash
  useEffect(() => {
    const m = typeof mode === "string" ? mode.toLowerCase().trim() : "";
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace("#", "").toLowerCase()
        : "";
    if (m === "signup" || hash === "signup") setAuthMode("signup");
    else if (m === "forgot" || hash === "forgot") setAuthMode("forgot");
    else if (m === "reset" || hash === "reset") setAuthMode("reset");
    else setAuthMode("login");
  }, [mode]);

  // Redirect already-authenticated users
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const target = sanitizeCallbackUrl(requestedRedirect);
      router.replace(target);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  // Show generic error banner for NextAuth errors (anti-enumeration)
  useEffect(() => {
    if (queryError) {
      setBanner({
        type: "error",
        message: "Unable to sign in. Please check your credentials and try again.",
      });
    }
  }, [queryError]);

  const targetUrl = sanitizeCallbackUrl(requestedRedirect);

  // ── Login form submit (login mode only) ───────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    if (!formData.email || !formData.password) {
      setBanner({ type: "error", message: "Please enter both email and password." });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
        callbackUrl: targetUrl,
      });

      if (!result || result.error) {
        setBanner({
          type: "error",
          message: "Unable to sign in. Please check your credentials and try again.",
        });
        return;
      }

      setBanner({ type: "success", message: "Login successful! Redirecting..." });
      router.push(result.url ?? targetUrl);
    } catch {
      setBanner({
        type: "error",
        message: "Unable to sign in. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Social login ──────────────────────────────────────────
  const handleSocialLogin = (provider: "google" | "facebook") => {
    setIsLoading(true);
    signIn(provider, { callbackUrl: targetUrl });
  };

  // ── noop passed to LoginOrSignupForm ──────────────────────
  const handleAuthSuccess = () => undefined;

  // ── Loading state ─────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Login | Highrise.pk — Pakistan&apos;s Verified Property Platform</title>
        <meta
          name="description"
          content="Login to your Highrise.pk account to manage properties, save searches, and connect with verified agents."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-10 px-4 sm:px-6">
        {/* Signup mode: full-width form | Login mode: narrow card */}
        <div className={authMode === "signup" ? "w-full max-w-4xl" : "w-full max-w-md"}>

          {/* ── SIGNUP / FORGOT / RESET — delegate fully to LoginOrSignupForm ── */}
          {authMode !== "login" ? (
            <LoginOrSignupForm onSuccess={handleAuthSuccess} defaultMode={authMode} />
          ) : (

            /* ── LOGIN MODE ─────────────────────────────────────── */
            <>
              {/* Brand */}
              <div className="text-center mb-8">
                <Link href="/" className="inline-block">
                  <span className="text-3xl font-bold text-[#029bba] cursor-pointer">
                    Highrise.pk
                  </span>
                </Link>
                <p className="mt-2 text-gray-600">Welcome back!</p>
              </div>

              {/* Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                  <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Access your account to manage properties
                  </p>
                </div>

                {/* Inline banner */}
                {banner && (
                  <div className="mx-8 mb-2">
                    <div
                      className={`px-4 py-3 rounded-lg border-l-4 text-sm ${
                        banner.type === "error"
                          ? "bg-[#fef2f2] border-[#ef4444] text-red-700"
                          : "bg-[#f0fdf4] border-[#10b981] text-[#10b981]"
                      }`}
                    >
                      {banner.message}
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-6 pt-4 space-y-4" noValidate>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-transparent transition-all"
                        placeholder="you@example.com"
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-transparent transition-all"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#029bba] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">Remember me</span>
                    </label>
                    <Link
                      href="/login?mode=forgot"
                      className="text-sm text-[#029bba] hover:text-[#027a94] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative px-8 py-2">
                  <div className="absolute inset-0 flex items-center px-8">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Social login */}
                <div className="px-8 pb-6 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={isLoading}
                    className="w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Google SVG — no react-icons dependency */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="text-gray-700 font-medium">Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin("facebook")}
                    disabled={isLoading}
                    className="w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Facebook SVG — no react-icons dependency */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                        fill="#1877F2"
                      />
                    </svg>
                    <span className="text-gray-700 font-medium">Continue with Facebook</span>
                  </button>
                </div>

                {/* Footer — signup link */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
                  <p className="text-center text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/login?mode=signup"
                      className="font-semibold text-[#029bba] hover:text-[#027a94] transition-colors"
                    >
                      Create account
                    </Link>
                  </p>
                </div>

                {/* Professional upgrade hint — no role in URL (Rule 19) */}
                <div className="px-8 pb-5 bg-gray-50">
                  <p className="text-center text-xs text-gray-500">
                    Are you an Agent or Developer?{" "}
                    <Link
                      href="/login?mode=signup"
                      className="text-[#029bba] hover:text-[#027a94] font-medium transition-colors"
                    >
                      Sign up free
                    </Link>
                    {" "}and upgrade from your dashboard.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}