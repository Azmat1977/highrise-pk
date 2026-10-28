// components/auth/UpgradePrompt.tsx
// Highrise.pk — Role upgrade prompt
// Shows when user tries to do something requiring a different role

import React from "react";
import { useRouter } from "next/router";
import { ShieldCheck, Users, Building2, Building, Clock, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface UpgradePromptProps {
  /** What action the user tried to do */
  action: "list_property" | "list_project" | "manage_society";
  /** Current user role */
  userRole?: string;
  /** Current status (for pending/rejected cases) */
  userStatus?: string;
  /** Close the prompt */
  onClose?: () => void;
}

interface UpgradeOption {
  emoji: string;
  title: string;
  description: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  action,
  userRole = "user",
  userStatus,
  onClose,
}) => {
  const router = useRouter();

  // ── Pending/Rejected states ──────────────────────────────────

  if (userRole === "agent" && userStatus === "pending") {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Agent Account Under Review
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Your agent application is being reviewed by our team.
          This usually takes 24-48 hours.
        </p>
        <p className="text-xs text-gray-500 mb-5">
          You will receive an email at your registered address when approved.
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href={`https://wa.me/923335877106?text=Hi, I applied as an agent and wanted to check my application status.`}
            target="_blank" rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            WhatsApp Support
          </a>
          {onClose && (
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
              OK, I'll wait
            </button>
          )}
        </div>
      </div>
    );
  }

  if (userRole === "agent" && userStatus === "rejected") {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Application Not Approved
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          Your agent application was not approved. Please contact our support
          team for assistance and to understand the next steps.
        </p>
        <a
          href={`https://wa.me/923335877106?text=Hi, my agent application was rejected. I need help.`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
        >
          Contact Support
        </a>
      </div>
    );
  }

  if (userRole === "developer" && userStatus === "pending") {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Developer Account Under Review
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          Your developer application is being reviewed. This usually takes 2-5 business days.
        </p>
        <a
          href={`https://wa.me/923335877106`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold">
          Contact Support
        </a>
      </div>
    );
  }

  // ── Basic user — show upgrade options ────────────────────────

  const options: UpgradeOption[] = [
    {
      emoji: "🛡️",
      title: "List as Verified Owner",
      description: "Verify your CNIC once, list up to 10 of your own properties for free.",
      href: "/owner/verify",
      color: "#029bba",
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      emoji: "👔",
      title: "Become a Professional Agent",
      description: "Unlimited listings, lead CRM, analytics. For professional agents.",
      href: "/agent/register",
      color: "#ea580c",
      icon: <Users className="w-5 h-5" />,
    },
    {
      emoji: "🏗️",
      title: "Register as Developer",
      description: "Add projects, units, and showcase your portfolio. For property developers.",
      href: "/developer/register",
      color: "#004063",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      emoji: "🏘️",
      title: "Register as Society",
      description: "Manage society plots, NOC documents, and installment tracking.",
      href: "/society/register",
      color: "#7c3aed",
      icon: <Building className="w-5 h-5" />,
    },
  ];

  const actionText = {
    list_property: "list a property",
    list_project: "add a project",
    manage_society: "manage a society",
  }[action];

  return (
    <div className="p-6">
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-[#029bba]/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-7 h-7 text-[#029bba]" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          Account upgrade required
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          To {actionText}, please choose how you&apos;d like to proceed:
        </p>
      </div>

      <div className="space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.href}
            type="button"
            onClick={() => {
              onClose?.();
              void router.push(opt.href);
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200
              hover:border-[#029bba]/40 hover:bg-[#029bba]/5 transition-all group text-left"
          >
            <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-[#029bba] transition-colors">
                {opt.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{opt.description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {onClose && (
        <button type="button" onClick={onClose}
          className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors hover:underline underline-offset-4">
          Cancel
        </button>
      )}
    </div>
  );
};

export default UpgradePrompt;