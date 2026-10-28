//C:\dev\highrise-pk\components\blog\CommentSection.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, RefreshCw, ChevronDown, Pin, Award } from 'lucide-react';
import CommentForm from './CommentForm';
import CommentCard from './CommentCard';

interface CommentItem {
  _id: string;
  content: string;
  author: {
    name: string;
    isAdmin?: boolean;
    isVerifiedBuyer?: boolean;
    reputation?: {
      trustScore?: number;
    };
  };
  createdAt: string;
  editedAt?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  pinnedReason?: string;
  isBestAnswer?: boolean;
  likes: number;
  dislikes: number;
  helpfulVotes: number;
  notHelpfulVotes: number;
  netScore: number;
  replies: number;
  engagementScore?: number;
}

interface CommentSectionProps {
  blogSlug: string;
  blogId: string;
}

type SortOption =
  | 'newest'
  | 'oldest'
  | 'top'
  | 'helpful'
  | 'verified'
  | 'best-answer'
  | 'trending';

export default function CommentSection({ blogSlug, blogId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [pinnedComments, setPinnedComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?blogSlug=${encodeURIComponent(blogSlug)}&status=approved&sortBy=${sortBy}`
      );
      const data = await res.json();

      if (data.success) {
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setPinnedComments(Array.isArray(data.pinnedComments) ? data.pinnedComments : []);
        setTotalComments(data.pagination?.total || data.stats?.totalComments || 0);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [blogSlug, sortBy]);

  useEffect(() => {
    if (blogSlug) {
      fetchComments();
    }
  }, [blogSlug, fetchComments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#029bba]" />
            Comments
          </h2>
          {totalComments > 0 && (
            <span className="px-2.5 py-0.5 text-sm font-medium bg-[#029bba]/10 text-[#029bba] rounded-full">
              {totalComments}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="top">Top</option>
            <option value="helpful">Most Helpful</option>
            <option value="verified">Verified Buyers</option>
            <option value="best-answer">Best Answers</option>
            <option value="trending">Trending</option>
          </select>

          <button
            onClick={fetchComments}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-[#029bba] hover:bg-[#029bba]/5 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh comments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Form */}
      <CommentForm blogSlug={blogSlug} blogId={blogId} onCommentAdded={fetchComments} />

      {/* Comments */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-[#029bba] animate-spin" />
          </div>
        ) : comments.length === 0 && pinnedComments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 bg-gray-50 rounded-2xl"
          >
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-medium mb-1">No comments yet</h3>
            <p className="text-gray-500 text-sm">Be the first to share your thoughts!</p>
          </motion.div>
        ) : (
          <>
            {/* Pinned Comments */}
            {pinnedComments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#029bba]">
                  <Pin className="w-4 h-4" />
                  Pinned Comments
                </div>
                {pinnedComments.map((comment, index) => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <CommentCard comment={comment} onUpdate={fetchComments} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Normal Comments */}
            {comments.length > 0 && (
              <div className="space-y-3">
                {pinnedComments.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <ChevronDown className="w-4 h-4" />
                    All Comments
                  </div>
                )}

                {comments.map((comment, index) => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <CommentCard comment={comment} onUpdate={fetchComments} />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
