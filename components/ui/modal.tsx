// components/ui/modal.tsx
import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  // ✅ Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ✅ Responsive widths (viewport-safe)
  const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "w-[min(92vw,520px)]",
    md: "w-[min(92vw,720px)]",
    lg: "w-[min(92vw,920px)]",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 sm:px-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Close only when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${sizeMap[size]} max-w-none max-h-[92vh] overflow-hidden overflow-x-hidden rounded-2xl bg-white shadow-2xl`}
      >
        {/* Header (optional title + close) */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 sm:px-6 py-3">
          <div className="min-w-0">
            {title ? (
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
            ) : (
              <span className="sr-only">Modal</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (single scroll area) */}
        <div className="w-full box-border max-h-[calc(92vh-52px)] overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};
