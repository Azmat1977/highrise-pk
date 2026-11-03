// components/auth/AuthGateModal.tsx
// Unified Authentication Modal (Screenshot 2 design everywhere)

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { icons } from '@/lib/design-system/icons';
import LoginOrSignupForm from '@/components/auth/LoginOrSignupForm';

export type AuthGateContext = 'contact' | 'listing' | 'save' | 'general';

export interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  actionDescription?: string;
  entityTitle?: string;
  returnTo?: string;
  context?: AuthGateContext;
  initialMode?: 'login' | 'signup';
  defaultMode?: 'login' | 'signup';
}

export default function AuthGateModal({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = 'access this feature',
  context,
  returnTo,
  defaultMode = 'login',
}: AuthGateModalProps) {
  const { status } = useSession();
  const [formKey, setFormKey] = useState(0);

  // Infer context from actionDescription when not explicitly passed
  const resolvedContext: 'contact' | 'listing' | 'save' | 'general' = React.useMemo(() => {
    if (context) return context;
    if (/save|favorite|shortlist|compare/i.test(actionDescription)) return 'save';
    if (/list|post|add property/i.test(actionDescription)) return 'listing';
    return 'contact';
  }, [context, actionDescription]);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormKey((prev) => prev + 1);
    }
  }, [isOpen]);

  // Auto-close if session becomes authenticated while modal is open
  useEffect(() => {
    if (isOpen && status === 'authenticated') {
      if (onSuccess) onSuccess();
      onClose();
    }
  }, [isOpen, status, onSuccess, onClose]);

  // Lock body scroll and close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedReturnTo =
    returnTo ||
    (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Highrise.pk"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setFormKey((prev) => prev + 1)}
            className="text-xs font-bold text-[#029bba] hover:underline flex items-center gap-1"
          >
            Back to 1-Click Options
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <LoginOrSignupForm
            key={formKey}
            isModal={true}
            defaultMode={defaultMode}
            context={resolvedContext}
            returnTo={resolvedReturnTo}
            onSuccess={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}