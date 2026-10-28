// components/auth/ContactGate.tsx
// Highrise.pk — Contact gating component
// Shows login prompt for non-authenticated users
// Reveals contact info for authenticated users

import React from "react";
import { useSession } from "next-auth/react";
import { Lock, LogIn, UserPlus } from "lucide-react";

interface ContactGateProps {
  children: React.ReactNode;
  openLoginModal: (context?: "contact" | "listing" | "save" | "general") => void;
  agentName?: string;
  compact?: boolean;
}

export const ContactGate: React.FC<ContactGateProps> = ({
  children,
  openLoginModal,
  agentName,
  compact = false,
}) => {
  const { data: session, status } = useSession();

  // Loading state — show placeholder
  if (status === "loading") {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-xl ${compact ? "h-10" : "h-24"}`} />
    );
  }

  // Authenticated — show actual content
  if (session) {
    return <>{children}</>;
  }

  // Not authenticated — show gate
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-500 flex-1">
          Sign in to see {agentName ? `${agentName}'s` : ""} contact
        </span>
        <button
          type="button"
          onClick={() => openLoginModal("contact")}
          className="text-sm font-bold text-[#029bba] hover:underline underline-offset-2 flex-shrink-0"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-gray-50 to-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">
            Sign in to see contact details
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Phone: +92 *** **** *** (hidden)
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Contact information is protected to prevent spam and ensure quality leads.
        Create a free account to see full details.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => openLoginModal("contact")}
          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl
            bg-gradient-to-r from-[#029bba] to-[#027a94] text-white text-sm font-semibold
            hover:from-[#027a94] hover:to-[#029bba] transition-all shadow-md hover:shadow-lg"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => openLoginModal("contact")}
          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl
            border-2 border-[#029bba]/30 text-[#029bba] text-sm font-semibold
            hover:bg-[#029bba]/5 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Register Free
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        Free forever • No credit card required
      </p>
    </div>
  );
};

export default ContactGate;