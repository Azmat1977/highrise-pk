//C:\dev\highrise-pk\components\ui\SubscriptionModal.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  X, 
  Mail, 
  Sparkles,
  PartyPopper
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  type: 'success' | 'error' | 'already_subscribed';
  message?: string;
}

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  email, 
  type,
  message 
}: SubscriptionModalProps) {
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Auto close after 5 seconds for success
  useEffect(() => {
    if (isOpen && type === 'success') {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type, onClose]);

  const getContent = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-600" />,
          title: 'Subscription request received',
          subtitle: 'One more step to join the Highrise.pk newsletter',
          description: message || 'We have sent a verification email to',
          bgGradient: 'from-green-500 via-emerald-500 to-teal-600',
          iconBg: 'bg-white/15',
          accentText: 'text-green-700',
          infoBoxClass: 'bg-green-50 border border-green-100',
          buttonText: 'Got it, thanks',
        };
      case 'already_subscribed':
        return {
          icon: <Mail className="w-12 h-12 text-blue-600" />,
          title: 'You are already subscribed',
          subtitle: 'This email is already part of our newsletter community',
          description: message || 'This email address is already subscribed',
          bgGradient: 'from-blue-500 via-indigo-500 to-violet-600',
          iconBg: 'bg-white/15',
          accentText: 'text-blue-700',
          infoBoxClass: 'bg-blue-50 border border-blue-100',
          buttonText: 'Close',
        };
      case 'error':
        return {
          icon: <X className="w-12 h-12 text-red-600" />,
          title: 'Unable to complete subscription',
          subtitle: 'Please review the details and try again',
          description: message || 'We could not process your request at this moment.',
          bgGradient: 'from-red-500 via-rose-500 to-pink-600',
          iconBg: 'bg-white/15',
          accentText: 'text-red-700',
          infoBoxClass: 'bg-red-50 border border-red-100',
          buttonText: 'Try again',
        };
      default:
        return {
          icon: <Mail className="w-12 h-12 text-[#029bba]" />,
          title: 'Newsletter',
          subtitle: '',
          description: '',
          bgGradient: 'from-[#029bba] to-[#027a94]',
          iconBg: 'bg-white/15',
          accentText: 'text-[#029bba]',
          infoBoxClass: 'bg-gray-50 border border-gray-100',
          buttonText: 'Close',
        };
    }
  };

  const content = getContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-modal-title"
              className="bg-white rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.25)] max-w-md w-full overflow-hidden relative border border-white/50"
            >
              {/* Close X button */}
              <button
                onClick={onClose}
                aria-label="Close subscription modal"
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Gradient Header */}
              <div className={`bg-gradient-to-br ${content.bgGradient} px-6 pt-8 pb-7 text-center relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-36 h-36 bg-white/10 rounded-full -translate-x-20 -translate-y-20" />
                <div className="absolute bottom-0 right-0 w-28 h-28 bg-white/10 rounded-full translate-x-14 translate-y-14" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_35%)]" />

                {type === 'success' && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="absolute top-5 left-8"
                    >
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="absolute top-8 right-12"
                    >
                      <PartyPopper className="w-6 h-6 text-yellow-300" />
                    </motion.div>
                  </>
                )}

                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.08 }}
                  className={`w-20 h-20 ${content.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 border border-white/10 shadow-lg`}
                >
                  {content.icon}
                </motion.div>

                <motion.h2
                  id="subscription-modal-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="text-2xl md:text-[1.75rem] font-bold text-white mb-2 relative z-10 leading-tight"
                >
                  {content.title}
                </motion.h2>

                {content.subtitle ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26 }}
                    className="text-white/90 text-sm md:text-base relative z-10 max-w-xs mx-auto leading-6"
                  >
                    {content.subtitle}
                  </motion.p>
                ) : null}
              </div>
              
              {/* Content */}
              <div className="px-6 pt-6 pb-6 text-center">
                <p className="text-gray-600 text-sm md:text-base leading-7 mb-3">
                  {content.description}
                </p>

                {email && type !== 'error' && (
                  <div className={`rounded-2xl px-4 py-3 mb-5 ${content.infoBoxClass}`}>
                    <p className={`font-semibold text-sm md:text-base break-all ${content.accentText}`}>
                      {email}
                    </p>
                  </div>
                )}

                {type === 'success' && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-left">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Next step
                    </p>
                    <p className="text-sm text-gray-600 leading-6">
                      Please check your inbox and click the verification link to activate your
                      newsletter subscription. This extra step helps keep the platform secure.
                    </p>
                  </div>
                )}

                {type === 'already_subscribed' && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-left">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Good news
                    </p>
                    <p className="text-sm text-gray-600 leading-6">
                      This email is already subscribed to Highrise.pk newsletter updates. You do not
                      need to subscribe again.
                    </p>
                  </div>
                )}

                {type === 'error' && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-left">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      What you can do
                    </p>
                    <p className="text-sm text-gray-600 leading-6">
                      Please verify your email address, complete CAPTCHA if required, and try again
                      in a moment.
                    </p>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors shadow-lg"
                >
                  {content.buttonText}
                </button>

                {type === 'success' && (
                  <p className="text-xs text-gray-400 mt-3 leading-5">
                    This dialog will close automatically in 5 seconds
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
