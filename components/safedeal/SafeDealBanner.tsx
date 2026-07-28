// File: components/safedeal/SafeDealBanner.tsx
// 🛡️ Highrise SafeDeal Banner — Compact & Full Versions
// Session 1 Launch Version

import Link from "next/link";
import { Shield, FileCheck, Scale, Receipt, MessageCircle } from "lucide-react";

type Props = {
  variant?: "compact" | "full";
};

export default function SafeDealBanner({ variant = "compact" }: Props) {
  if (variant === "compact") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#029bba]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#004063] text-sm">
              Protect This Deal with SafeDeal
            </h3>
            <p className="text-xs text-[#666666] mt-1">
              Pakistan’s first property transaction protection service.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-[#333333] mb-4">
          <li className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#10b981]" />
            Document Verification
          </li>
          <li className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#10b981]" />
            Secure Token Escrow
          </li>
          <li className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#10b981]" />
            Legal & Tax Protection
          </li>
        </ul>

        <div className="space-y-2">
          <Link
            href="/safedeal"
            className="block w-full text-center py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors"
          >
            Learn More
          </Link>

          <a
            href="https://wa.me/923335877106"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-[#333333] text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#029bba]" />
            Book on WhatsApp
          </a>
        </div>

        <p className="text-[11px] text-[#666666] text-center mt-3">
          Call us: +92 333 5877106
        </p>
      </div>
    );
  }

  // Full version (for future /safedeal page use)
  return (
    <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl p-8 text-white shadow-xl">
      <h2 className="text-2xl font-bold mb-3">
        Pakistan’s First Property Transaction Protection
      </h2>
      <p className="text-white/90 mb-6 max-w-2xl">
        From document verification to escrow and legal support —
        SafeDeal protects your money at every stage.
      </p>
      <Link
        href="/safedeal"
        className="inline-block px-6 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors"
      >
        Explore SafeDeal
      </Link>
    </div>
  );
}