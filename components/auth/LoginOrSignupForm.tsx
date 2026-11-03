// components/auth/LoginOrSignupForm.tsx
// Highrise.pk - Enterprise Auth Form
// V6.0.0 - isModal support | Role selection step | Context-aware messaging
//          CNIC optional at signup | Pages Router compatible

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import type { ParsedUrlQuery } from "querystring";
import { sanitizeCallbackUrl } from "@/lib/auth/safeRedirect";
import { icons } from "@/lib/design-system/icons";

const {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Check,
  X,
  Copy,
  Sparkles,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
} = icons;

// --- Types ----------------------------------------------------

type AuthMode = "login" | "signup" | "otp" | "forgot" | "reset" | "role";

type AuthContext =
  | "contact"   // triggered from contact button
  | "listing"   // triggered from list property
  | "save"      // triggered from save/favorite
  | "general";  // default

type Props = {
  onSuccess: () => void;
  isModal?: boolean;
  context?: AuthContext;
  defaultMode?: "login" | "signup" | "forgot" | "reset";
  returnTo?: string;
};

// --- Role Cards Definition ------------------------------------

interface RoleCard {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  href: string;
  accentColor: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: "buyer",
    title: "Browse & Contact",
    description: "Find properties, contact agents, save favorites",
    badge: "Instant Access",
    badgeColor: "#10b981",
    href: "/",
    accentColor: "#10b981",
  },
  {
    id: "owner",
    title: "List My Own Property",
    description: "CNIC-verified owner listings. Max 10 properties.",
    badge: "CNIC Verification",
    badgeColor: "#029bba",
    href: "/owner/verify",
    accentColor: "#029bba",
  },
  {
    id: "agent",
    title: "Property Agent",
    description: "Unlimited listings, lead management, CRM",
    badge: "Professional Verification",
    badgeColor: "#ea580c",
    href: "/onboarding/business",
    accentColor: "#ea580c",
  },
  {
    id: "developer",
    title: "Property Developer",
    description: "Projects, units, portfolio, analytics",
    badge: "Company Verification",
    badgeColor: "#004063",
    href: "/onboarding/developer",
    accentColor: "#004063",
  },
  {
    id: "society",
    title: "Housing Society",
    description: "Plot management, NOC documents, installments",
    badge: "Society Verification",
    badgeColor: "#7c3aed",
    href: "/onboarding/society",
    accentColor: "#7c3aed",
  },
  {
    id: "provider",
    title: "Service Provider",
    description: "Contractor, vendor, factory, legal services",
    badge: "Coming Soon",
    badgeColor: "#d97706",
    href: "/coming-soon?feature=provider",
    accentColor: "#d97706",
  },
  {
    id: "labour",
    title: "Skilled Labour",
    description: "Register your trade, receive job requests",
    badge: "Coming Soon",
    badgeColor: "#dc2626",
    href: "/coming-soon?feature=labour",
    accentColor: "#dc2626",
  },
];

// --- Turnstile Window Type ------------------------------------

interface TurnstileWidget {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

function getTurnstile(): TurnstileWidget | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { turnstile?: TurnstileWidget };
  return w.turnstile ?? null;
}

// --- API Types ------------------------------------------------

interface ApiSuccessResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

interface ApiErrorResponse {
  success?: false;
  error?: string;
  message?: string;
  code?: string;
}

interface FetchResult<T = ApiSuccessResponse> {
  ok: boolean;
  status: number;
  data: T | ApiErrorResponse;
}

// --- Constants ------------------------------------------------

const MAX_EMAIL_LEN     = 120;
const MAX_NAME_LEN      = 80;
const MAX_PHONE_LEN     = 20;
const MAX_PASSWORD_LEN  = 200;
const OTP_LENGTH        = 6;
const RESET_CODE_LENGTH = 6;

const MSG_GENERIC_SIGNUP = "Unable to create account. Please try again.";
const MSG_GENERIC_OTP    = "Invalid or expired code. Please try again.";
const MSG_GENERIC_FORGOT =
  "If the email is registered, you will receive a reset code shortly.";
const MSG_GENERIC_AUTH   = "Unable to continue. Please try again.";
const MSG_RATE_LIMITED   = "Too many attempts. Please wait before trying again.";

// --- Fetch Helper ---------------------------------------------

async function postJson<T = ApiSuccessResponse>(
  url: string,
  body: Record<string, unknown>
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: T | ApiErrorResponse;
    try {
      data = (await res.json()) as T | ApiErrorResponse;
    } catch {
      data = { success: false, message: "Invalid server response" };
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { success: false, message: "Network error. Please try again." },
    };
  }
}

function getErrorMessage(data: ApiSuccessResponse | ApiErrorResponse): string {
  const errData = data as ApiErrorResponse;
  return errData.message || errData.error || "";
}

// --- Sanitization ---------------------------------------------

function normalizeEmailOnSubmit(v: string): string {
  return String(v || "").trim().toLowerCase()
    .replace(/[\x00-\x1F\x7F]/g, "").slice(0, MAX_EMAIL_LEN);
}
function normalizeNameOnSubmit(v: string): string {
  return String(v || "").trim().replace(/[<>'"]/g, "").slice(0, MAX_NAME_LEN);
}
function normalizePhoneOnSubmit(v: string): string {
  return String(v || "").trim().replace(/[^\d+]/g, "").slice(0, MAX_PHONE_LEN);
}
function capWhileTyping(v: string, maxLen = 120): string {
  return String(v ?? "").slice(0, maxLen);
}
function normalizePhoneWhileTyping(v: string): string {
  return String(v || "").replace(/[^\d+]/g, "").slice(0, MAX_PHONE_LEN);
}

// --- Password Policy ------------------------------------------

interface PasswordChecks {
  lengthOk: boolean; hasLower: boolean; hasUpper: boolean;
  hasNumber: boolean; hasSpecial: boolean;
}

function passwordChecks(pw: string): PasswordChecks {
  const v = String(pw || "");
  return {
    lengthOk:   v.length >= 12,
    hasLower:   /[a-z]/.test(v),
    hasUpper:   /[A-Z]/.test(v),
    hasNumber:  /[0-9]/.test(v),
    hasSpecial: /[^A-Za-z0-9]/.test(v),
  };
}

interface PasswordStrength {
  score: number;
  label: "Weak" | "Medium" | "Strong";
  color: string;
}

function getPasswordStrength(pw: string): PasswordStrength {
  const c = passwordChecks(pw);
  let score = 0;
  if (c.lengthOk)   score++;
  if (c.hasLower)   score++;
  if (c.hasUpper)   score++;
  if (c.hasNumber)  score++;
  if (c.hasSpecial) score++;
  if (score <= 2) return { score, label: "Weak",   color: "red" };
  if (score <= 4) return { score, label: "Medium", color: "yellow" };
  return { score, label: "Strong", color: "green" };
}

function isStrongPassword(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.lengthOk && c.hasLower && c.hasUpper && c.hasNumber && c.hasSpecial;
}

function generateStrongPassword(length = 16): string {
  const lowers   = "abcdefghijklmnopqrstuvwxyz";
  const uppers   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums     = "0123456789";
  const specials = "!@#$%^&*()-_=+[]{};:,.<>?/|~";
  const all      = lowers + uppers + nums + specials;
  const randomIndex = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };
  const arr: string[] = [
    lowers[randomIndex(lowers.length)],
    uppers[randomIndex(uppers.length)],
    nums[randomIndex(nums.length)],
    specials[randomIndex(specials.length)],
  ];
  while (arr.length < Math.max(12, length)) {
    arr.push(all[randomIndex(all.length)]);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

async function copyToClipboard(text: string): Promise<boolean> {
  const value = String(text || "").replace(/[<>'"]/g, "");
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

function normalizeAuthError(msg?: string): "invalid"|"locked"|"inactive"|"unverified"|"social" {
  const raw  = String(msg || "").trim();
  if (raw === "CredentialsSignin") return "invalid";
  const text = raw.toLowerCase();
  if (text.includes("verify your email")) return "unverified";
  if (text.includes("google or facebook")) return "social";
  if (text.includes("temporarily locked") || text.startsWith("account locked for ")) return "locked";
  if (text.includes("contact support") || text.includes("not active")) return "inactive";
  return "invalid";
}

function getQueryString(query: ParsedUrlQuery, key: string): string {
  const val = query[key];
  return String(Array.isArray(val) ? val[0] : val ?? "").toLowerCase().trim();
}

/** Read a redirect query param without lower-casing its value (paths are case-sensitive). */
function getRedirectParam(query: ParsedUrlQuery): string {
  const candidates = [query.callbackUrl, query.redirect];
  for (const candidate of candidates) {
    const val = Array.isArray(candidate) ? candidate[0] : candidate;
    if (typeof val === "string" && val) return val;
  }
  return "";
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// --- UI Components --------------------------------------------

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

function Input({ icon, error, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={cx(
          "w-full h-12",
          icon ? "pl-12" : "pl-4",
          "pr-4 rounded-xl bg-white border-2",
          error ? "border-red-300" : "border-gray-200",
          "text-gray-900 placeholder:text-gray-400",
          "outline-none transition-all duration-200",
          error
            ? "focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/10",
          "disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60",
          "shadow-sm hover:shadow-md",
          props.className
        )}
      />
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

function Btn({ variant = "primary", loading, children, ...props }: ButtonProps) {
  const base = "w-full h-12 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary:   "bg-gradient-to-r from-[#029bba] to-[#027a94] text-white shadow-lg shadow-[#029bba]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
    ghost:     "bg-transparent text-[#029bba] hover:bg-[#029bba]/5",
  };
  return (
    <button {...props} disabled={props.disabled || loading}
      className={cx(base, variants[variant], props.className)}>
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}

// --- Context Header Text --------------------------------------

function getContextText(context: AuthContext, mode: AuthMode) {
  if (mode === "signup") {
    return {
      title: "Create your account",
      subtitle: "Join Pakistan's first verified property platform",
    };
  }
  if (context === "contact") {
    return {
      title: "Sign in to see contact details",
      subtitle: "Phone numbers are protected. Sign in to reveal.",
    };
  }
  if (context === "listing") {
    return {
      title: "Sign in to list your property",
      subtitle: "Create an account to start listing in minutes",
    };
  }
  if (context === "save") {
    return {
      title: "Sign in to save properties",
      subtitle: "Create a free account to save your favorites",
    };
  }
  return {
    title: "Sign in to see contact details",
    subtitle: "Phone numbers are protected. Sign in to reveal.",
  };
}

// ===============================================================
// MAIN COMPONENT
// ===============================================================

const LoginOrSignupForm = ({
  onSuccess,
  isModal = false,
  context = "general",
  defaultMode = "login",
  returnTo,
}: Props) => {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>(defaultMode);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });

  const [otp, setOtp]                                 = useState("");
  const [otpCooldown, setOtpCooldown]                 = useState(0);
  const [resetCode, setResetCode]                     = useState("");
  const [newPassword, setNewPassword]                 = useState("");
  const [isResetCodeVerified, setIsResetCodeVerified] = useState(false);

  const [error, setError]                       = useState("");
  const [success, setSuccess]                   = useState("");
  const [showPassword, setShowPassword]         = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [isLocked, setIsLocked]                 = useState(false);
  const [failedLoginCount, setFailedLoginCount] = useState(0);
  const [rememberMe, setRememberMe]             = useState(false);

  const [copiedSignupPw, setCopiedSignupPw]     = useState(false);
  const [copiedResetPw, setCopiedResetPw]       = useState(false);

  // Turnstile
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const [turnstileReady, setTurnstileReady]                   = useState(false);
  const signupTurnstileRef                                    = useRef<HTMLDivElement | null>(null);
  const otpTurnstileRef                                       = useRef<HTMLDivElement | null>(null);
  const signupWidgetIdRef                                     = useRef<string | null>(null);
  const otpWidgetIdRef                                        = useRef<string | null>(null);
  const [signupTurnstileToken, setSignupTurnstileToken]       = useState("");
  const [otpResendTurnstileToken, setOtpResendTurnstileToken] = useState("");

  // --- Helpers -------------------------------------------------

  const getPostAuthDestination = useCallback((): string => {
    if (returnTo) {
      return sanitizeCallbackUrl(returnTo, "/");
    }
    if (!router.isReady) return "/";
    const redirectParam = getRedirectParam(router.query);
    if (redirectParam) {
      return sanitizeCallbackUrl(redirectParam, "/");
    }
    if (isModal && typeof window !== "undefined") {
      return sanitizeCallbackUrl(
        window.location.pathname + window.location.search,
        "/"
      );
    }
    return "/";
  }, [returnTo, router.isReady, router.query, isModal]);

  const clearNotices = useCallback(() => {
    setError(""); setSuccess("");
  }, []);

  const clearSensitiveData = useCallback(() => {
    setForm((prev) => ({ ...prev, password: "" }));
    setNewPassword(""); setOtp(""); setResetCode("");
  }, []);

  const resetLoginFailureUX = useCallback(() => {
    setFailedLoginCount(0);
  }, []);

  // --- URL mode detection --------------------------------------

  useEffect(() => {
    if (!router.isReady || isModal) return;

    const qMode = getQueryString(router.query, "mode");
    const rawToken = router.query.token || router.query.code;
    const qToken = String(Array.isArray(rawToken) ? rawToken[0] : rawToken ?? "");
    const qEmail = getQueryString(router.query, "email");

    if (qMode === "reset" || qToken) {
      setMode("reset");
      if (qToken) {
        setResetCode(qToken.replace(/\D/g, "").slice(0, RESET_CODE_LENGTH));
      }
      if (qEmail) {
        setForm((prev) => ({ ...prev, email: qEmail }));
      }
    } else if (qMode === "signup") {
      setMode("signup");
    } else if (qMode === "forgot") {
      setMode("forgot");
    } else if (qMode === "login") {
      setMode("login");
    }
  }, [router.isReady, router.query, isModal]);

  // --- Turnstile loader ----------------------------------------

  useEffect(() => {
    if (!siteKey) return;
    const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { setTurnstileReady(true); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => setTurnstileReady(true);
    s.onerror = () => setTurnstileReady(false);
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch { /* already removed */ } };
  }, [siteKey]);

  // --- Signup Turnstile ----------------------------------------

  useEffect(() => {
    if (mode !== "signup" || !turnstileReady || !siteKey || !signupTurnstileRef.current) return;
    const ts = getTurnstile();
    if (!ts) return;
    setSignupTurnstileToken("");
    signupTurnstileRef.current.innerHTML = "";
    try { if (signupWidgetIdRef.current) ts.remove(signupWidgetIdRef.current); } catch { /* removed */ }
    const widgetId = ts.render(signupTurnstileRef.current, {
      sitekey: siteKey,
      callback: (token) => setSignupTurnstileToken(token),
      "expired-callback": () => setSignupTurnstileToken(""),
      "error-callback":   () => setSignupTurnstileToken(""),
    });
    signupWidgetIdRef.current = widgetId;
    return () => { try { ts.remove(widgetId); } catch { /* removed */ } };
  }, [mode, turnstileReady, siteKey]);

  // --- OTP Turnstile -------------------------------------------

  useEffect(() => {
    if (mode !== "otp" || !turnstileReady || !siteKey || !otpTurnstileRef.current) return;
    const ts = getTurnstile();
    if (!ts) return;
    setOtpResendTurnstileToken("");
    otpTurnstileRef.current.innerHTML = "";
    try { if (otpWidgetIdRef.current) ts.remove(otpWidgetIdRef.current); } catch { /* removed */ }
    const widgetId = ts.render(otpTurnstileRef.current, {
      sitekey: siteKey,
      callback: (token) => setOtpResendTurnstileToken(token),
      "expired-callback": () => setOtpResendTurnstileToken(""),
      "error-callback":   () => setOtpResendTurnstileToken(""),
    });
    otpWidgetIdRef.current = widgetId;
    return () => { try { ts.remove(widgetId); } catch { /* removed */ } };
  }, [mode, turnstileReady, siteKey]);

  // --- OTP cooldown --------------------------------------------

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setInterval(() => setOtpCooldown((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [otpCooldown]);

  // --- Auto-verify reset code ----------------------------------

  useEffect(() => {
    if (mode !== "reset" || resetCode.length !== RESET_CODE_LENGTH ||
        isResetCodeVerified || loading || !form.email) return;
    const autoVerify = async () => {
      setLoading(true); clearNotices();
      const result = await postJson("/api/auth/verify-reset-code", {
        email: normalizeEmailOnSubmit(form.email),
        code: resetCode,
      });
      if (result.ok) {
        setIsResetCodeVerified(true);
        setSuccess((result.data as ApiSuccessResponse).message || "Code verified! Now set your new password.");
      } else {
        setIsResetCodeVerified(false);
        setError(getErrorMessage(result.data) || MSG_GENERIC_OTP);
      }
      setLoading(false);
    };
    const timer = setTimeout(autoVerify, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, resetCode, isResetCodeVerified, loading, form.email]);

  // --- Auto-verify signup OTP (with attempt tracking) ----------

  const otpAttemptedRef = useRef<string>("");

  useEffect(() => {
    if (mode !== "otp" || otp.length !== OTP_LENGTH || loading ||
        !form.email || !form.password) return;

    if (otpAttemptedRef.current === otp) return;
    otpAttemptedRef.current = otp;

    const autoVerifySignup = async () => {
      setLoading(true); clearNotices();
      const verifyResult = await postJson("/api/auth/verify-signup-code", {
        email: normalizeEmailOnSubmit(form.email),
        code: otp,
      });
      if (!verifyResult.ok) {
        const apiCode = (verifyResult.data as ApiErrorResponse).code;
        if (verifyResult.status === 409 && apiCode === "ACCOUNT_ALREADY_EXISTS") {
          setSuccess("This email already has an account. Please sign in or reset your password.");
          setMode("login");
          setLoading(false);
          return;
        }

        const serverMsg = getErrorMessage(verifyResult.data);
        setError(
          verifyResult.status === 429 ? MSG_RATE_LIMITED :
          serverMsg || MSG_GENERIC_OTP
        );
        setLoading(false);
        return;
      }
      setSuccess("Account created! Signing you in...");
      const result = await signIn("credentials", {
        email: normalizeEmailOnSubmit(form.email),
        password: String(form.password || ""),
        rememberMe: rememberMe ? "1" : "0",
        redirect: false,
      });
      if (result?.error) {
        setSuccess("Account created! Please sign in.");
        setMode("login");
        setLoading(false);
        return;
      }
      setSuccess("");
      setMode("role");
      setLoading(false);
    };
    const timer = setTimeout(autoVerifySignup, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, otp, loading, form.email, form.password, rememberMe]);

  // --- Field change handler ------------------------------------

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "email")    return { ...prev, email: capWhileTyping(String(value || "").trim().toLowerCase(), MAX_EMAIL_LEN) };
      if (name === "phone")    return { ...prev, phone: normalizePhoneWhileTyping(value) };
      if (name === "fullName") return { ...prev, fullName: capWhileTyping(value, MAX_NAME_LEN) };
      if (name === "password") return { ...prev, password: capWhileTyping(value, MAX_PASSWORD_LEN) };
      if (name in prev) return { ...prev, [name]: capWhileTyping(value, 120) };
      return prev;
    });
    setCopiedSignupPw(false);
    setCopiedResetPw(false);
    clearNotices();
    if (name === "email" || name === "password") setIsLocked(false);
  }, [clearNotices]);

  // --- Signup payload ------------------------------------------

  const signupPayload = useMemo(() => ({
    fullName: normalizeNameOnSubmit(form.fullName),
    email:    normalizeEmailOnSubmit(form.email),
    password: String(form.password || ""),
    phone:    normalizePhoneOnSubmit(form.phone),
    accountType: "individual" as const,
  }), [form]);

  // --- Handlers ------------------------------------------------

  const handleSignup = useCallback(async (opts?: { forResend?: boolean }) => {
    clearNotices(); setLoading(true);
    if (!signupPayload.fullName) { setError("Please enter your name"); setLoading(false); return; }
    if (!signupPayload.email)    { setError("Please enter your email"); setLoading(false); return; }
    if (!signupPayload.password) { setError("Password is required"); setLoading(false); return; }
    if (!isStrongPassword(signupPayload.password)) {
      setError("Password must be 12+ characters with uppercase, lowercase, number, and special character.");
      setLoading(false); return;
    }
    const token = opts?.forResend ? otpResendTurnstileToken : signupTurnstileToken;
    if (!token) { setError("Please complete the security check."); setLoading(false); return; }

    const resetTurnstile = () => {
      setSignupTurnstileToken("");
      try { const ts = getTurnstile(); if (ts && signupWidgetIdRef.current) ts.reset(signupWidgetIdRef.current); } catch { /* removed */ }
    };

    const result = await postJson("/api/auth/send-signup-code", {
      ...signupPayload, turnstileToken: token,
    });

    if (result.ok) {
      resetTurnstile(); setOtp(""); setMode("otp");
      setOtpResendTurnstileToken(""); setOtpCooldown(30);
      setSuccess("Check your email for the next step. Existing users can sign in or reset their password.");
    } else {
      const apiMessage = getErrorMessage(result.data);
      if (result.status === 429) {
        setError(MSG_RATE_LIMITED);
      } else {
        setError(apiMessage || MSG_GENERIC_SIGNUP);
      }
      resetTurnstile();
    }
    setLoading(false);
  }, [clearNotices, signupPayload, signupTurnstileToken, otpResendTurnstileToken]);

  const verifyOTP = useCallback(async () => {
    clearNotices(); setLoading(true);
    const verifyResult = await postJson("/api/auth/verify-signup-code", {
      email: normalizeEmailOnSubmit(form.email),
      code: otp,
    });
    if (!verifyResult.ok) {
      const apiCode = (verifyResult.data as ApiErrorResponse).code;
      if (verifyResult.status === 409 && apiCode === "ACCOUNT_ALREADY_EXISTS") {
        setSuccess("This email already has an account. Please sign in or reset your password.");
        setMode("login");
        setLoading(false);
        return;
      }

      setError(verifyResult.status === 429 ? MSG_RATE_LIMITED :
        getErrorMessage(verifyResult.data) || MSG_GENERIC_OTP);
      setLoading(false); return;
    }
    const result = await signIn("credentials", {
      email: normalizeEmailOnSubmit(form.email),
      password: String(form.password || ""),
      rememberMe: rememberMe ? "1" : "0",
      redirect: false,
    });
    if (result?.error) {
      setSuccess("Account created. Please sign in."); setMode("login");
      setLoading(false); return;
    }
    setMode("role");
    setLoading(false);
  }, [clearNotices, form.email, form.password, otp, rememberMe]);

  const handleLogin = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearNotices(); setIsLocked(false); setLoading(true);
    if (!form.email || !form.password) {
      setError("Please enter email and password"); setLoading(false); return;
    }
    const result = await signIn("credentials", {
      email: normalizeEmailOnSubmit(form.email),
      password: String(form.password || ""),
      rememberMe: rememberMe ? "1" : "0",
      redirect: false,
    });
    if (result?.error) {
      const kind = normalizeAuthError(result.error);
      if (kind !== "locked" && kind !== "inactive" && kind !== "unverified" && kind !== "social") {
        setFailedLoginCount((v) => Math.min(10, v + 1));
      }
      if (kind === "locked") { setIsLocked(true); setError("Account is temporarily locked. Please try again later or reset your password."); }
      else if (kind === "inactive")    setError("Unable to sign in. Please contact support.");
      else if (kind === "unverified")  setError("Please verify your email before logging in.");
      else if (kind === "social")      setError("Please login using Google or Facebook.");
      else                             setError("Invalid email or password.");
      setLoading(false); return;
    }
    resetLoginFailureUX();
    onSuccess();
    if (!isModal) {
      void router.push(getPostAuthDestination());
    }
    setLoading(false);
  }, [clearNotices, form.email, form.password, rememberMe, resetLoginFailureUX, onSuccess, router, getPostAuthDestination, isModal]);

  const sendForgotPasswordCode = useCallback(async () => {
    clearNotices(); setLoading(true);
    await postJson("/api/auth/reset-request", { email: normalizeEmailOnSubmit(form.email) });
    setResetCode(""); setNewPassword(""); setIsResetCodeVerified(false);
    setSuccess(MSG_GENERIC_FORGOT); setMode("reset"); setLoading(false);
  }, [clearNotices, form.email]);

  const resetPassword = useCallback(async () => {
    clearNotices();
    if (!isResetCodeVerified) { setError("Please verify the reset code first."); return; }
    if (!newPassword)         { setError("Password is required."); return; }
    if (!isStrongPassword(newPassword)) {
      setError("Password must be 12+ characters with uppercase, lowercase, number, and special character."); return;
    }
    setLoading(true);
    const result = await postJson("/api/auth/reset-password", {
      email: normalizeEmailOnSubmit(form.email), code: resetCode, newPassword,
    });
    if (result.ok) {
      setSuccess("Password reset! Please sign in.");
      setTimeout(() => {
        setMode("login"); setIsLocked(false); setIsResetCodeVerified(false);
        setResetCode(""); setNewPassword(""); clearSensitiveData();
      }, 1500);
    } else {
      setError(getErrorMessage(result.data) || MSG_GENERIC_AUTH);
    }
    setLoading(false);
  }, [clearNotices, isResetCodeVerified, newPassword, form.email, resetCode, clearSensitiveData]);

  const suggestSignupPassword = useCallback(() => {
    const pw = generateStrongPassword(16);
    setForm((prev) => ({ ...prev, password: pw }));
    setCopiedSignupPw(false);
    setSuccess("Strong password generated.");
  }, []);

  const copySignupPassword = useCallback(async () => {
    const ok = await copyToClipboard(form.password);
    setCopiedSignupPw(ok);
    if (ok) setSuccess("Password copied."); else setError("Copy failed.");
  }, [form.password]);

  const suggestResetPassword = useCallback(() => {
    const pw = generateStrongPassword(16);
    setNewPassword(pw); setCopiedResetPw(false); setSuccess("Strong password generated.");
  }, []);

  const copyResetPassword = useCallback(async () => {
    const ok = await copyToClipboard(newPassword);
    setCopiedResetPw(ok);
    if (ok) setSuccess("Password copied."); else setError("Copy failed.");
  }, [newPassword]);

  // --- Role selection handler ----------------------------------

  const handleRoleSelect = useCallback((role: RoleCard) => {
    onSuccess();
    if (!isModal || role.id !== "buyer") {
      void router.push(role.href);
    }
  }, [onSuccess, router, isModal]);

  const handleRoleSkip = useCallback(() => {
    onSuccess();
    if (!isModal) {
      void router.push(getPostAuthDestination());
    }
  }, [onSuccess, router, getPostAuthDestination, isModal]);

  // ===============================================================
  // WRAPPER - modal vs full-page
  // ===============================================================

  const wrapContent = (children: React.ReactNode) => {
    if (isModal) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8 px-4">
        <div className="w-full max-w-[480px] mx-auto">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <Image src="/images/logo.png" alt="Highrise.pk" width={180} height={90}
                className="h-20 w-auto object-contain" priority />
            </div>
            <p className="text-sm text-gray-500">Verified Properties. Trusted Deals.</p>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl shadow-gray-900/10 border border-gray-200/50 p-8">
            {children}
          </div>
          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing, you agree to our{" "}
            <Link href="/terms-of-service" className="text-[#029bba] hover:underline font-medium">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy-policy" className="text-[#029bba] hover:underline font-medium">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    );
  };

  // --- Context header (only in modal mode) ---------------------

  const contextHeader = isModal && (mode === "login" || mode === "signup") ? (
    <div className="mb-5">
      <div className="flex justify-center mb-4">
        <Image src="/images/logo.png" alt="Highrise.pk" width={220} height={64}
          className="h-[64px] w-auto object-contain" priority />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#004063]">
          {getContextText(context, mode).title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {getContextText(context, mode).subtitle}
        </p>
      </div>
    </div>
  ) : null;

  // ===============================================================
  // ROLE SELECTION SCREEN
  // ===============================================================

  if (mode === "role") {
    return wrapContent(
      <div>
        {isModal && (
          <div className="flex justify-center mb-5">
            <Image src="/images/logo.png" alt="Highrise.pk" width={200} height={60}
              className="h-[60px] w-auto object-contain" priority />
          </div>
        )}

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#029bba]/20 to-[#029bba]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-[#029bba]" />
          </div>
          <h2 className="text-xl font-bold text-[#004063]">Account created!</h2>
          <p className="text-sm text-gray-600 mt-1">
            What brings you to Highrise.pk?
          </p>
        </div>

        <div className="space-y-2">
          {ROLE_CARDS.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handleRoleSelect(role)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-gray-200
                hover:border-[#029bba]/40 hover:bg-[#029bba]/5 transition-all group text-left
                focus:outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#029bba] transition-colors">
                    {role.title}
                  </p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${role.badgeColor}15`, color: role.badgeColor }}
                  >
                    {role.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{role.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRoleSkip}
          className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700
            font-medium transition-colors hover:underline underline-offset-4"
        >
          Skip for now, I&apos;ll decide later
        </button>
      </div>
    );
  }

  // ===============================================================
  // LOGIN SCREEN
  // ===============================================================

  if (mode === "login") {
    return wrapContent(
      <>
        {contextHeader}

        {!isModal && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#004063]">Welcome back</h2>
            <p className="text-sm text-gray-600 mt-1">Sign in to your account</p>
          </div>
        )}

        {isLocked && (
          <div className="mb-5 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 p-4 rounded-2xl text-center">
            <Lock className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="font-bold text-red-800">Account Temporarily Locked</p>
            <p className="text-sm text-red-700 mt-1">Too many failed attempts.</p>
          </div>
        )}

        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: getPostAuthDestination() })}
            className="w-full h-11 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50
              hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
          >
            <Image src="/icons/google.svg" alt="Google" width={18} height={18} className="w-4.5 h-4.5" />
            <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => signIn("facebook", { callbackUrl: getPostAuthDestination() })}
            className="w-full h-11 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50
              hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
          >
            <Image src="/icons/facebook.svg" alt="Facebook" width={18} height={18} className="w-4.5 h-4.5" />
            <span className="text-sm font-semibold text-gray-700">Continue with Facebook</span>
          </button>
        </div>

        <div className="flex items-center my-5">
          <div className="flex-grow border-t-2 border-gray-200" />
          <span className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">or</span>
          <div className="flex-grow border-t-2 border-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <Input name="email" type="email" placeholder="Email address"
            onChange={handleChange} value={form.email}
            icon={<Mail className="w-5 h-5" />} required autoComplete="email" />

          <div className="relative">
            <Input type={showPassword ? "text" : "password"} name="password"
              placeholder="Password" onChange={handleChange} value={form.password}
              icon={<Lock className="w-5 h-5" />} required autoComplete="current-password" />
            <button type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
              {showPassword ? <EyeOff key="toggle-eye-off" className="w-4 h-4" /> : <Eye key="toggle-eye" className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]/30 cursor-pointer" />
              <span className="font-semibold">Remember me</span>
            </label>
            <button type="button"
              onClick={() => { clearNotices(); resetLoginFailureUX(); setMode("forgot"); }}
              className="text-sm font-bold text-[#029bba] hover:text-[#004063] hover:underline underline-offset-4">
              Forgot password?
            </button>
          </div>

          <Btn type="submit" variant="primary" loading={loading} disabled={isLocked}>
            {loading ? "Signing in..." : "Sign in"}
          </Btn>

          {failedLoginCount >= 3 && !isLocked && (
            <div className="bg-amber-50 border-2 border-amber-200 p-3 text-sm rounded-xl text-center">
              <p className="font-semibold text-amber-900">Having trouble?</p>
              <button type="button"
                onClick={() => { clearNotices(); setMode("forgot"); }}
                className="font-bold text-amber-800 underline underline-offset-2 mt-1">
                Reset your password
              </button>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              New to Highrise?{" "}
              <button type="button"
                onClick={() => { clearNotices(); resetLoginFailureUX(); setMode("signup"); }}
                className="font-bold text-[#029bba] hover:text-[#004063] hover:underline underline-offset-4">
                Create an account
              </button>
            </p>
          </div>
        </form>
      </>
    );
  }

  // ===============================================================
  // SIGNUP SCREEN
  // ===============================================================

  if (mode === "signup") {
    const { label, color } = getPasswordStrength(form.password);
    const checks = passwordChecks(form.password);

    return wrapContent(
      <>
        {contextHeader}

        {!isModal && (
          <div className="text-center mb-5">
            <h2 className="text-2xl font-bold text-[#004063]">Create your account</h2>
            <p className="text-sm text-gray-600 mt-1">
              Pakistan&apos;s first verified property platform
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-gradient-to-r from-[#029bba]/5 to-[#004063]/5 border border-[#029bba]/20 rounded-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#029bba] flex-shrink-0" />
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Encrypted & Secure.</span>{" "}
              Your data is protected with AES-256 encryption and never shown publicly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Input name="fullName" type="text" placeholder="Full name"
            onChange={handleChange} value={form.fullName}
            icon={<User className="w-5 h-5" />} required autoComplete="name" />

          <Input name="email" type="email" placeholder="Email address"
            onChange={handleChange} value={form.email}
            icon={<Mail className="w-5 h-5" />} required autoComplete="email" />

          <Input name="phone" type="tel" placeholder="Phone number (optional)"
            onChange={handleChange} value={form.phone}
            icon={<Phone className="w-5 h-5" />} autoComplete="tel" />

          <div className="relative">
            <Input type={showPassword ? "text" : "password"} name="password"
              placeholder="Create password (min 12 chars)"
              onChange={handleChange} value={form.password}
              icon={<Lock className="w-5 h-5" />} required autoComplete="new-password" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button type="button"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                {showPassword ? <EyeOff key="toggle-eye-off" className="w-4 h-4" /> : <Eye key="toggle-eye" className="w-4 h-4" />}
              </button>
              <button type="button"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                onClick={suggestSignupPassword} title="Generate strong password">
                <Sparkles key="generate-password" className="w-4 h-4" />
              </button>
              <button type="button"
                className={cx("p-1.5 rounded-lg hover:bg-gray-100 transition-colors",
                  copiedSignupPw ? "text-green-600" : "text-gray-500 hover:text-gray-800")}
                onClick={copySignupPassword} title="Copy password">
                {copiedSignupPw ? <Check key="copy-success" className="w-4 h-4" /> : <Copy key="copy-password" className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {form.password && (
            <div className="border-2 border-gray-200 rounded-xl p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-700">Password strength</p>
                <span className={cx("text-xs font-bold px-2 py-0.5 rounded-full",
                  color === "green" ? "bg-green-100 text-green-700" :
                  color === "yellow" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                  {label}
                </span>
              </div>
              <div className="flex gap-1.5 mb-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={cx("h-1.5 flex-1 rounded-full transition-all",
                    i < getPasswordStrength(form.password).score
                      ? color === "green" ? "bg-green-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                      : "bg-gray-200")} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {([
                  [checks.lengthOk, "12+ characters"],
                  [checks.hasUpper, "Uppercase (A-Z)"],
                  [checks.hasLower, "Lowercase (a-z)"],
                  [checks.hasNumber, "Number (0-9)"],
                  [checks.hasSpecial, "Special (!@#)"],
                ] as [boolean, string][]).map(([ok, lbl]) => (
                  <div key={lbl} className={cx("flex items-center gap-1",
                    ok ? "text-green-700 font-semibold" : "text-gray-400")}>
                    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {lbl}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-gray-200 rounded-xl p-3 bg-white">
            {!siteKey ? (
              <p className="text-xs text-red-600 font-medium">
                Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env
              </p>
            ) : (
              <div className="flex justify-center">
                <div ref={signupTurnstileRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 text-green-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          <Btn type="button" variant="primary" loading={loading}
            onClick={() => handleSignup({ forResend: false })}>
            {loading ? "Creating account..." : "Create account & verify email"}
          </Btn>

          <div className="text-center pt-1">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button type="button"
                onClick={() => { clearNotices(); setMode("login"); }}
                className="font-bold text-[#029bba] hover:text-[#004063] hover:underline underline-offset-4">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ===============================================================
  // OTP SCREEN
  // ===============================================================

  if (mode === "otp") {
    const canResend = !loading && otpCooldown <= 0;
    return wrapContent(
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-[#004063] mb-1">Check your email</h2>
        <p className="text-gray-600 text-sm mb-1">6-digit code sent to:</p>
        <p className="font-bold text-[#029bba] mb-4 text-sm">{normalizeEmailOnSubmit(form.email)}</p>

        <div className="mb-5 mx-auto max-w-md p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Can&apos;t find the email?</p>
              <p className="text-amber-800">
                Please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
                Emails from new senders sometimes get filtered.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <input
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
              if (error) setError(""); if (success) setSuccess("");
            }}
            maxLength={OTP_LENGTH} inputMode="numeric"
            disabled={loading && otp.length === OTP_LENGTH}
            className={cx(
              "w-full h-16 text-center text-4xl font-mono tracking-[0.6em] rounded-2xl bg-white outline-none shadow-sm transition-all",
              loading && otp.length === OTP_LENGTH
                ? "border-2 border-[#029bba] bg-[#029bba]/5 animate-pulse"
                : "border-2 border-gray-300 focus:ring-4 focus:ring-[#029bba]/20 focus:border-[#029bba]"
            )}
          />
          {loading && otp.length === OTP_LENGTH && (
            <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-[#029bba] text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying & creating account...
            </div>
          )}
        </div>

        {loading && otp.length === OTP_LENGTH && <div className="h-5" />}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 p-3 text-sm rounded-xl mb-3 font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-800 p-3 text-sm rounded-xl mb-3 font-medium flex items-center justify-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        <Btn type="button" variant="primary" loading={loading}
          onClick={verifyOTP} disabled={otp.length !== OTP_LENGTH || loading}>
          {loading ? "Creating account..." : otp.length === OTP_LENGTH ? "Verify & create account" : "Enter 6-digit code"}
        </Btn>

        <div className="mt-5 border-2 border-gray-200 rounded-xl bg-gray-50 p-4 text-left">
          <p className="text-sm font-bold text-gray-900 mb-1">Didn&apos;t receive the code?</p>
          <p className="text-xs text-gray-600 mb-3">
            Complete the security check to resend.
            {otpCooldown > 0 && ` Resend in ${otpCooldown}s.`}
          </p>
          <div className="border-2 border-gray-200 rounded-lg bg-white p-2 mb-3">
            {!siteKey ? (
              <p className="text-xs text-red-600">Missing Turnstile site key.</p>
            ) : (
              <div className="flex justify-center"><div ref={otpTurnstileRef} /></div>
            )}
          </div>
          <Btn type="button" variant="secondary" disabled={!canResend || !otpResendTurnstileToken}
            loading={loading}
            onClick={async () => {
              setOtp(""); clearNotices(); setLoading(true);
              const result = await postJson("/api/auth/resend-signup-code", {
                email: normalizeEmailOnSubmit(form.email),
                turnstileToken: otpResendTurnstileToken,
              });
              if (result.ok) {
                setSuccess("Check your email for the next step.");
                setOtpCooldown(30); setOtpResendTurnstileToken("");
                try { const ts = getTurnstile(); if (ts && otpWidgetIdRef.current) ts.reset(otpWidgetIdRef.current); } catch { /* removed */ }
              } else {
                setError(result.status === 429 ? MSG_RATE_LIMITED : "Unable to resend. Please try again.");
              }
              setLoading(false);
            }}>
            {loading ? "Resending..." : otpCooldown > 0 ? `Resend (${otpCooldown}s)` : "Resend code"}
          </Btn>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={() => { clearNotices(); setMode("login"); }}
              className="h-10 text-sm font-semibold text-[#029bba] hover:text-[#004063] hover:underline underline-offset-4">
              Sign in
            </button>
            <button type="button" onClick={() => { clearNotices(); setMode("forgot"); }}
              className="h-10 text-sm font-semibold text-[#029bba] hover:text-[#004063] hover:underline underline-offset-4">
              Reset password
            </button>
          </div>
          <button type="button" onClick={() => { clearNotices(); setMode("signup"); }}
            className="w-full h-10 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:underline underline-offset-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Edit details
          </button>
        </div>
      </div>
    );
  }

  // ===============================================================
  // FORGOT PASSWORD
  // ===============================================================

  if (mode === "forgot") {
    return wrapContent(
      <>
        <button type="button" onClick={() => { clearNotices(); setMode("login"); }}
          className="text-[#029bba] text-sm font-bold hover:underline underline-offset-4 mb-5 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[#004063]">Forgot password?</h2>
          <p className="text-sm text-gray-600 mt-1">Enter your email to receive a reset code.</p>
        </div>
        <div className="space-y-3">
          <Input name="email" type="email" placeholder="Email address"
            onChange={handleChange} value={form.email}
            icon={<Mail className="w-5 h-5" />} autoComplete="email" />
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 text-green-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}
          <Btn type="button" variant="primary" loading={loading} onClick={sendForgotPasswordCode}>
            {loading ? "Sending..." : "Send reset code"}
          </Btn>
        </div>
      </>
    );
  }

  // ===============================================================
  // RESET PASSWORD
  // ===============================================================

  if (mode === "reset") {
    const { label, color } = getPasswordStrength(newPassword);
    const checks = passwordChecks(newPassword);
    return wrapContent(
      <div className="text-center">
        <button type="button"
          onClick={() => { setMode("forgot"); clearNotices(); setResetCode(""); setNewPassword(""); setIsResetCodeVerified(false); setCopiedResetPw(false); }}
          className="text-[#029bba] text-sm font-bold hover:underline underline-offset-4 mb-5 inline-flex items-center gap-1 float-left">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="clear-both pt-2">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-[#004063]">Reset password</h2>
          <p className="text-sm text-gray-600 mt-1">
            Code sent to <strong>{normalizeEmailOnSubmit(form.email)}</strong>
          </p>
        </div>
        <div className="mt-5 space-y-4 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              6-digit code
              {loading && resetCode.length === RESET_CODE_LENGTH && !isResetCodeVerified && (
                <span className="ml-2 text-[#029bba] font-normal text-xs">
                  <Loader2 className="w-3.5 h-3.5 inline animate-spin" /> Verifying...
                </span>
              )}
              {isResetCodeVerified && (
                <span className="ml-2 text-green-600 font-normal text-xs">
                  <CheckCircle className="w-3.5 h-3.5 inline" /> Verified!
                </span>
              )}
            </label>
            <input value={resetCode}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, RESET_CODE_LENGTH);
                setResetCode(next);
                if (next !== resetCode) { setIsResetCodeVerified(false); setNewPassword(""); setCopiedResetPw(false); }
                if (error) setError(""); if (success) setSuccess("");
              }}
              placeholder="000000" maxLength={RESET_CODE_LENGTH}
              inputMode="numeric" disabled={isResetCodeVerified}
              className={cx(
                "w-full h-14 text-center text-3xl font-mono tracking-[0.6em] rounded-xl bg-white outline-none shadow-sm transition-all",
                isResetCodeVerified
                  ? "border-2 border-green-400 bg-green-50 text-green-700"
                  : "border-2 border-gray-300 focus:border-[#029bba] focus:ring-4 focus:ring-[#029bba]/20"
              )} />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              New password{" "}
              <span className="text-gray-400 font-normal">(verify code first)</span>
            </label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="New password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setCopiedResetPw(false); clearNotices(); }}
                disabled={!isResetCodeVerified} icon={<Lock className="w-5 h-5" />}
                autoComplete="new-password" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {[
                  [() => setShowPassword(!showPassword), showPassword ? <EyeOff key="toggle-eye-off" className="w-4 h-4" /> : <Eye key="toggle-eye" className="w-4 h-4" />, "Toggle"],
                  [suggestResetPassword, <Sparkles key="generate-password" className="w-4 h-4" />, "Generate"],
                  [copyResetPassword, copiedResetPw ? <Check key="copy-success" className="w-4 h-4" /> : <Copy key="copy-password" className="w-4 h-4" />, "Copy"],
                ].map(([fn, icon, label]) => (
                  <button key={label as string} type="button"
                    className={cx("p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors",
                      label === "Copy" && copiedResetPw ? "text-green-600" : "text-gray-500 hover:text-gray-800")}
                    onClick={fn as () => void} disabled={!isResetCodeVerified} title={label as string}>
                    {icon as React.ReactNode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isResetCodeVerified && newPassword && (
            <div className="border-2 border-gray-200 rounded-xl p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-700">Password strength</p>
                <span className={cx("text-xs font-bold px-2 py-0.5 rounded-full",
                  color === "green" ? "bg-green-100 text-green-700" :
                  color === "yellow" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                  {label}
                </span>
              </div>
              <div className="flex gap-1.5 mb-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={cx("h-1.5 flex-1 rounded-full transition-all",
                    i < getPasswordStrength(newPassword).score
                      ? color === "green" ? "bg-green-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                      : "bg-gray-200")} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {([
                  [checks.lengthOk, "12+ chars"], [checks.hasUpper, "Uppercase"],
                  [checks.hasLower, "Lowercase"], [checks.hasNumber, "Number"],
                  [checks.hasSpecial, "Special"],
                ] as [boolean, string][]).map(([ok, lbl]) => (
                  <div key={lbl} className={cx("flex items-center gap-1",
                    ok ? "text-green-700 font-semibold" : "text-gray-400")}>
                    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {lbl}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 text-green-800 p-3 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          <Btn type="button" variant="primary" loading={loading}
            onClick={resetPassword}
            disabled={!isResetCodeVerified || !isStrongPassword(newPassword)}>
            {loading ? "Resetting..." : "Reset password"}
          </Btn>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginOrSignupForm;