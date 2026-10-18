// components/shared/SafeDealSidebarCard.tsx
import React from 'react';
import { Shield, FileCheck, Scale, Receipt, MessageCircle, Phone } from 'lucide-react';

export default function SafeDealSidebarCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-[#029bba]" />
        </div>
        <div>
          <h3 className="font-black text-[#004063] text-lg leading-tight mb-1">
            Protect This Deal with SafeDeal
          </h3>
          <p className="text-xs font-medium text-gray-500">
            Pakistan's first property transaction protection service.
          </p>
        </div>
      </div>

      <ul className="space-y-2.5 text-sm font-semibold text-gray-700 mb-6">
        <li className="flex items-center gap-2.5">
          <FileCheck className="w-4 h-4 text-[#10b981]" /> Document Verification
        </li>
        <li className="flex items-center gap-2.5">
          <Receipt className="w-4 h-4 text-[#10b981]" /> Secure Token Escrow
        </li>
        <li className="flex items-center gap-2.5">
          <Scale className="w-4 h-4 text-[#10b981]" /> Legal & Tax Protection
        </li>
      </ul>

      <div className="space-y-3">
        <a
          href="https://wa.me/923335877106?text=I%20want%20to%20learn%20more%20about%20SafeDeal"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] text-white text-[15px] font-bold hover:bg-[#128C7E] transition-colors shadow-sm"
        >
          <MessageCircle className="w-4 h-4 fill-current" /> Book on WhatsApp
        </a>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 text-center">
        <a href="tel:+923335877106" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#004063] hover:text-[#029bba] transition-colors">
          <Phone className="w-4 h-4" /> Call us: +92 333 5877106
        </a>
      </div>
    </div>
  );
}