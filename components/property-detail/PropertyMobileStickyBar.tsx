// File: components/property-detail/PropertyMobileStickyBar.tsx
// Fixed bottom contact bar for mobile screens

import React from "react";
import { Lock, Phone, MessageCircle } from "lucide-react";
import { formatPrice } from "./propertyDetailUtils";

interface PropertyMobileStickyBarProps {
  price: number;
  totalPrice?: number;
  isRent: boolean;
  isLoggedIn: boolean;
  canRevealPhone: boolean;
  phoneValue: string;
  canWhatsapp: boolean;
  waValue: string;
  propertyTitle: string;
  canonicalUrl: string;
  onLoginClick: () => void;
  onCallbackClick: () => void;
}

export default function PropertyMobileStickyBar({
  price,
  totalPrice,
  isRent,
  isLoggedIn,
  canRevealPhone,
  phoneValue,
  canWhatsapp,
  waValue,
  propertyTitle,
  canonicalUrl,
  onLoginClick,
  onCallbackClick,
}: PropertyMobileStickyBarProps): React.ReactElement {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Price */}
          <div className="flex-shrink-0">
            <p className="text-xs text-[#666666]">
              {isRent ? "Monthly Rent" : "Price"}
            </p>
            <p className="text-lg font-bold text-[#029bba]">
              PKR {formatPrice(totalPrice ?? price)}
              {isRent && (
                <span className="text-xs font-normal text-[#666666]">/mo</span>
              )}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#027a94] transition-colors"
              >
                <Lock className="w-4 h-4" />
                Login to Contact
              </button>
            )}

            {isLoggedIn && (
              <>
                {canRevealPhone ? (
                  <a
                    href={`tel:${phoneValue}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#017a8a] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onCallbackClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#017a8a] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Callback
                  </button>
                )}

                {canWhatsapp && (
                  <a
                    href={`https://wa.me/${waValue}?text=${encodeURIComponent(
                      `Hi, I'm interested in your property: ${propertyTitle}\n\nLink: ${canonicalUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-medium text-sm hover:bg-[#128C7E] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}