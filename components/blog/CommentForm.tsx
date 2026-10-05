import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, User, Mail, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import TurnstileWidget from '@/components/ui/TurnstileWidget';

interface CommentFormProps {
  blogSlug: string;
  blogId: string;
  onCommentAdded?: () => void;
}
export default function CommentForm({ blogSlug, blogId, onCommentAdded }: CommentFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const clearTurnstile = useCallback(() => setTurnstileToken(''), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setBanner({ message: 'Please enter your name', type: 'error' });
      return;
    }

    if (!email.trim()) {
      setBanner({ message: 'Please enter your email', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setBanner({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    if (!content.trim()) {
      setBanner({ message: 'Please enter your comment', type: 'error' });
      return;
    }

    if (content.trim().length < 3) {
      setBanner({ message: 'Comment must be at least 3 characters', type: 'error' });
      return;
    }

    if (!turnstileToken) {
      setBanner({ message: 'Please complete the bot verification', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogSlug,
          blogId,
          content: content.trim(),
          author: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
          },
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBanner({
          message: data.message || 'Comment submitted successfully. Awaiting approval.',
          type: 'success',
        });
        setName('');
        setEmail('');
        setContent('');
        setTurnstileToken('');
        setTurnstileKey((value) => value + 1);
        onCommentAdded?.();
      } else {
        setBanner({ message: data.message || 'Failed to submit comment', type: 'error' });
      }
    } catch (error) {
      console.error('Comment submit error:', error);
      setBanner({ message: 'Failed to submit comment. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-[#029bba]" />
        Leave a Comment
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Your email will not be published</p>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Comment <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts..."
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${content.length > 1800 ? 'text-orange-500' : 'text-gray-400'}`}>
              {content.length}/2000
            </span>
          </div>
        </div>

        <div className="flex justify-center sm:justify-start">
          <TurnstileWidget
            key={turnstileKey}
            onVerify={handleTurnstileVerify}
            onExpire={clearTurnstile}
            onError={clearTurnstile}
            theme="light"
          />
        </div>

        {banner && (
          <div
            className={`p-3 rounded-xl text-sm font-semibold ${
              banner.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {banner.message}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !turnstileToken}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Comment
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
