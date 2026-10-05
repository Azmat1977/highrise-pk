//C:\dev\highrise-pk\components\blog\CommentCard.tsx
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Flag,
  Send,
  Loader2,
  User,
  Mail,
  X,
  Shield,
  Clock,
  Pin,
  Award,
  BadgeCheck,
  Pencil,
} from 'lucide-react';
import { useEffect } from 'react';
import TurnstileWidget from '@/components/ui/TurnstileWidget';

interface Reply {
  _id: string;
  parentReplyId?: string;
  depth?: number;
  author: {
    name: string;
    isAdmin?: boolean;
    isVerifiedBuyer?: boolean;
  };
  content: string;
  createdAt: string;
}

interface Comment {
  _id: string;
  author: {
    name: string;
    isAdmin?: boolean;
    isVerifiedBuyer?: boolean;
    reputation?: {
      trustScore?: number;
    };
  };
  content: string;
  likes: number;
  dislikes: number;
  helpfulVotes?: number;
  notHelpfulVotes?: number;
  netScore?: number;
  replies: Reply[] | number;
  createdAt: string;
  editedAt?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  pinnedReason?: string;
  isBestAnswer?: boolean;
}

interface CommentCardProps {
  comment: Comment;
  onUpdate?: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const [likes, setLikes] = useState(comment.likes || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes || 0);
  const [helpfulVotes, setHelpfulVotes] = useState(comment.helpfulVotes || 0);
  const [notHelpfulVotes, setNotHelpfulVotes] = useState(comment.notHelpfulVotes || 0);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyTurnstileToken, setReplyTurnstileToken] = useState('');
  const [replyTurnstileKey, setReplyTurnstileKey] = useState(0);

  const handleReplyTurnstileVerify = useCallback((token: string) => setReplyTurnstileToken(token), []);
  const clearReplyTurnstile = useCallback(() => setReplyTurnstileToken(''), []);

  const [submittingReply, setSubmittingReply] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const repliesArray = Array.isArray(comment.replies) ? comment.replies : [];
  const replyCount = Array.isArray(comment.replies) ? comment.replies.length : comment.replies || 0;

  const handleReaction = async (action: 'like' | 'dislike') => {
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/comments/${comment._id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        setLikes(data.stats?.likes || 0);
        setDislikes(data.stats?.dislikes || 0);
      } else {
        setBanner({ message: data.message || 'Failed to update reaction', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to update reaction', type: 'error' });
    } finally {
      setLikeLoading(false);
    }
  };

  const handleHelpfulVote = async (voteType: 'helpful' | 'not-helpful') => {
    setHelpfulLoading(true);
    try {
      const res = await fetch(`/api/comments/${comment._id}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      });

      const data = await res.json();

      if (data.success) {
        setHelpfulVotes(data.stats?.helpfulCount || 0);
        setNotHelpfulVotes(data.stats?.notHelpfulCount || 0);
      } else {
        setBanner({ message: data.message || 'Failed to update vote', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to update vote', type: 'error' });
    } finally {
      setHelpfulLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyName.trim() || !replyEmail.trim() || !replyContent.trim()) {
      setBanner({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(replyEmail)) {
      setBanner({ message: 'Please enter a valid email', type: 'error' });
      return;
    }

    if (!replyTurnstileToken) {
      setBanner({ message: 'Please complete the bot verification', type: 'error' });
      return;
    }

    setSubmittingReply(true);

    try {
      const res = await fetch(`/api/comments/${comment._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          author: {
            name: replyName.trim(),
            email: replyEmail.trim().toLowerCase(),
          },
          turnstileToken: replyTurnstileToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBanner({ message: data.message || 'Reply posted successfully!', type: 'success' });
        setReplyName('');
        setReplyEmail('');
        setReplyContent('');
        setReplyTurnstileToken('');
        setReplyTurnstileKey((value) => value + 1);
        setShowReplyForm(false);
        onUpdate?.();
      } else {
        setBanner({ message: data.message || 'Failed to post reply', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to post reply', type: 'error' });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReport = async (reason: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/comments/${comment._id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (data.success) {
        setBanner({ message: 'Thank you for reporting. We will review this comment.', type: 'success' });
        setShowReportModal(false);
      } else {
        setBanner({ message: data.message || 'Failed to report', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to report comment', type: 'error' });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border p-5 ${
        comment.isBestAnswer
          ? 'border-emerald-300 shadow-sm shadow-emerald-100'
          : comment.isPinned
          ? 'border-[#029bba]/30 shadow-sm shadow-[#029bba]/10'
          : 'border-gray-200'
      }`}
    >
      {banner && (
        <div
          className={`mb-3 p-2.5 rounded-lg text-xs font-semibold ${
            banner.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Top badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {comment.isPinned && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#029bba]/10 text-[#029bba] rounded-full">
            <Pin className="w-3 h-3" />
            Pinned
          </span>
        )}
        {comment.isBestAnswer && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            <Award className="w-3 h-3" />
            Best Answer
          </span>
        )}
        {comment.author.isVerifiedBuyer && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            <BadgeCheck className="w-3 h-3" />
            Verified Buyer
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
              comment.author.isAdmin
                ? 'bg-gradient-to-br from-[#029bba] to-[#027a94]'
                : comment.author.isVerifiedBuyer
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-gray-400 to-gray-500'
            }`}
          >
            {comment.author.isAdmin ? (
              <Shield className="w-5 h-5" />
            ) : (
              comment.author.name.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">{comment.author.name}</span>

              {comment.author.isAdmin && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#029bba]/10 text-[#029bba] rounded-full">
                  Team
                </span>
              )}

              {comment.author.reputation?.trustScore ? (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Trust {comment.author.reputation.trustScore}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(comment.createdAt)}
              </div>
              {comment.isEdited && (
                <div className="flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  edited
                </div>
              )}
            </div>
          </div>
        </div>

        {!comment.author.isAdmin && (
          <button
            onClick={() => setShowReportModal(true)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Report comment"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{comment.content}</p>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
        <button
          onClick={() => handleReaction('like')}
          disabled={likeLoading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{likes}</span>
        </button>

        <button
          onClick={() => handleReaction('dislike')}
          disabled={likeLoading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{dislikes}</span>
        </button>

        <button
          onClick={() => handleHelpfulVote('helpful')}
          disabled={helpfulLoading}
          className="text-sm text-gray-500 hover:text-[#029bba] transition-colors disabled:opacity-50"
        >
          Helpful ({helpfulVotes})
        </button>

        <button
          onClick={() => handleHelpfulVote('not-helpful')}
          disabled={helpfulLoading}
          className="text-sm text-gray-500 hover:text-orange-600 transition-colors disabled:opacity-50"
        >
          Not Helpful ({notHelpfulVotes})
        </button>

        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#029bba] transition-colors ml-auto"
        >
          <MessageCircle className="w-4 h-4" />
          Reply {replyCount > 0 ? `(${replyCount})` : ''}
        </button>
      </div>

      {/* Replies */}
      {repliesArray.length > 0 && (
        <div className="mt-4 ml-4 sm:ml-6 space-y-3 border-l-2 border-gray-100 pl-4">
          {repliesArray.map((reply) => (
            <div
              key={reply._id}
              className="bg-gray-50 rounded-lg p-4"
              style={{ marginLeft: `${Math.min((reply.depth || 0) * 12, 36)}px` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                    reply.author.isAdmin
                      ? 'bg-gradient-to-br from-[#029bba] to-[#027a94]'
                      : reply.author.isVerifiedBuyer
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                >
                  {reply.author.isAdmin ? (
                    <Shield className="w-3.5 h-3.5" />
                  ) : (
                    reply.author.name.charAt(0).toUpperCase()
                  )}
                </div>

                <span className="text-sm font-medium text-gray-900">{reply.author.name}</span>

                {reply.author.isAdmin && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-[#029bba]/10 text-[#029bba] rounded-full">
                    Team
                  </span>
                )}

                {reply.author.isVerifiedBuyer && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Verified
                  </span>
                )}

                <span className="text-xs text-gray-400 ml-auto">{formatDate(reply.createdAt)}</span>
              </div>

              <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Form */}
      <AnimatePresence>
        {showReplyForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleReplySubmit}
            className="mt-4 ml-4 sm:ml-6 border-l-2 border-[#029bba]/30 pl-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={replyName}
                  onChange={(e) => setReplyName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 outline-none"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={replyEmail}
                  onChange={(e) => setReplyEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
            </div>

            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={2}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 outline-none resize-none"
            />

            <div className="flex justify-start">
              <TurnstileWidget
                key={replyTurnstileKey}
                onVerify={handleReplyTurnstileVerify}
                onExpire={clearReplyTurnstile}
                onError={clearReplyTurnstile}
                theme="light"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReplyForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingReply || !replyTurnstileToken}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#029bba] hover:bg-[#027a94] text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {submittingReply ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Reply
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Report Comment</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Why are you reporting this comment?
              </p>

              <div className="space-y-2">
                {[
                  { value: 'spam', label: 'Spam' },
                  { value: 'harassment', label: 'Harassment or bullying' },
                  { value: 'inappropriate', label: 'Inappropriate content' },
                  { value: 'misinformation', label: 'Misinformation' },
                  { value: 'other', label: 'Other' },
                ].map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => handleReport(reason.value)}
                    disabled={reportLoading}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
