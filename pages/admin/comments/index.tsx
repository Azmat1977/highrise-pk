import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  AlertTriangle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  User,
  Mail,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Types
interface Comment {
  _id: string;
  blogId: {
    _id: string;
    title: string;
    slug: string;
  };
  blogSlug: string;
  author: {
    name: string;
    email: string;
    isAdmin: boolean;
  };
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  likes: number;
  dislikes: number;
  replies: any[];
  isReported: boolean;
  reportCount: number;
  reportReasons: string[];
  createdAt: string;
}

interface CommentCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
  reported: number;
}

type TabType = 'all' | 'pending' | 'approved' | 'rejected' | 'spam' | 'reported';

// Format date helper
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminCommentsPage() {
  // State
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState<CommentCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    spam: 0,
    reported: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Modals
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const limit = 20;

  // Tabs configuration
  const tabs = [
    { id: 'pending' as TabType, label: 'Pending', count: counts.pending, icon: Clock, color: 'text-yellow-600' },
    { id: 'approved' as TabType, label: 'Approved', count: counts.approved, icon: CheckCircle, color: 'text-green-600' },
    { id: 'rejected' as TabType, label: 'Rejected', count: counts.rejected, icon: XCircle, color: 'text-red-600' },
    { id: 'spam' as TabType, label: 'Spam', count: counts.spam, icon: AlertTriangle, color: 'text-orange-600' },
    { id: 'reported' as TabType, label: 'Reported', count: counts.reported, icon: Flag, color: 'text-purple-600' },
    { id: 'all' as TabType, label: 'All', count: counts.all, icon: MessageSquare, color: 'text-gray-600' },
  ];

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (activeTab === 'reported') {
        params.append('reported', 'true');
      } else if (activeTab !== 'all') {
        params.append('status', activeTab);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const res = await fetch(`/api/admin/comments?${params}`);
      const data = await res.json();

      if (data.success) {
        setComments(data.comments);
        setCounts(data.counts);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error(data.message || 'Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // Refresh sidebar stats
  const refreshSidebarStats = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refreshAdminStats'));
    }
  };

  // Handle status change
  const handleStatusChange = async (comment: Comment, action: 'approve' | 'reject' | 'spam' | 'pending') => {
    setActionLoading(comment._id);
    try {
      const res = await fetch(`/api/admin/comments/${comment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        const messages: { [key: string]: string } = {
          approve: 'Comment approved!',
          reject: 'Comment rejected!',
          spam: 'Marked as spam!',
          pending: 'Moved to pending!',
        };
        toast.success(messages[action]);
        fetchComments();
        refreshSidebarStats();
      } else {
        toast.error(data.message || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Status change error:', error);
      toast.error('Failed to update comment');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
  const handleDelete = async (permanent: boolean = false) => {
    if (!selectedComment) return;

    setActionLoading(selectedComment._id);
    try {
      const res = await fetch(
        `/api/admin/comments/${selectedComment._id}?permanent=${permanent}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(permanent ? 'Comment permanently deleted!' : 'Comment deleted!');
        setShowDeleteModal(false);
        setSelectedComment(null);
        fetchComments();
        refreshSidebarStats();
      } else {
        toast.error(data.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete comment');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle admin reply
  const handleAdminReply = async () => {
    if (!selectedComment || !replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/comments/${selectedComment._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Reply posted successfully!');
        setReplyContent('');
        setShowReplyModal(false);
        setSelectedComment(null);
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Failed to post reply');
    } finally {
      setReplyLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
  const badges: { [key: string]: React.ReactNode } = {
      pending: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      ),
      approved: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      ),
      spam: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Spam
        </span>
      ),
    };
    return badges[status] || badges.pending;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comment Moderation</h1>
            <p className="text-gray-600 mt-1">
              Review and manage blog comments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {counts.pending > 0 && (
              <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-xl text-sm font-medium">
                {counts.pending} awaiting review
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-[#029bba]/5 border-[#029bba] ring-2 ring-[#029bba]/20'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <tab.icon className={`w-4 h-4 ${tab.color}`} />
                <span className="text-sm font-medium text-gray-600">{tab.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{tab.count}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={fetchComments}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Comments List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comments found</h3>
              <p className="text-gray-500">
                {activeTab === 'pending'
                  ? 'No comments awaiting review'
                  : 'No comments in this category'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {comments.map((comment) => (
                <motion.div
                  key={comment._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {comment.author.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {comment.author.email}
                            </span>
                            {getStatusBadge(comment.status)}
                            {comment.isReported && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                <Flag className="w-3 h-3" />
                                Reported ({comment.reportCount})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatDate(comment.createdAt)}</span>
                            <span>•</span>
                            <Link
                              href={`/blog/${comment.blogSlug}`}
                              target="_blank"
                              className="text-[#029bba] hover:underline flex items-center gap-1"
                            >
                              {comment.blogId?.title || comment.blogSlug}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Comment Content */}
                      <p className="text-gray-700 mb-3 line-clamp-2">{comment.content}</p>

                      {/* Replies count */}
                      {comment.replies && comment.replies.length > 0 && (
                        <p className="text-xs text-gray-500 mb-3">
                          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {comment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(comment, 'approve')}
                              disabled={actionLoading === comment._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(comment, 'reject')}
                              disabled={actionLoading === comment._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {comment.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(comment, 'reject')}
                            disabled={actionLoading === comment._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Unapprove
                          </button>
                        )}

                        {comment.status === 'rejected' && (
                          <button
                            onClick={() => handleStatusChange(comment, 'approve')}
                            disabled={actionLoading === comment._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => handleStatusChange(comment, 'spam')}
                          disabled={actionLoading === comment._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-orange-600 text-xs font-medium rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Spam
                        </button>

                        <button
                          onClick={() => {
                            setSelectedComment(comment);
                            setShowViewModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        <button
                          onClick={() => {
                            setSelectedComment(comment);
                            setShowReplyModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba] hover:bg-[#027a94] text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reply
                        </button>

                        <button
                          onClick={() => {
                            setSelectedComment(comment);
                            setShowDeleteModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Comment Modal */}
        <AnimatePresence>
          {showViewModal && selectedComment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowViewModal(false);
                setSelectedComment(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Comment Details</h3>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedComment(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* Author Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold">
                      {selectedComment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedComment.author.name}</p>
                      <p className="text-sm text-gray-500">{selectedComment.author.email}</p>
                    </div>
                    <div className="ml-auto">
                      {getStatusBadge(selectedComment.status)}
                    </div>
                  </div>

                  {/* Blog Link */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Posted on</p>
                    <Link
                      href={`/blog/${selectedComment.blogSlug}`}
                      target="_blank"
                      className="text-[#029bba] hover:underline flex items-center gap-1"
                    >
                      {selectedComment.blogId?.title || selectedComment.blogSlug}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Comment Content */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Comment</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedComment.content}</p>
                  </div>

                  {/* Report Info */}
                  {selectedComment.isReported && (
                    <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-1 flex items-center gap-1">
                        <Flag className="w-4 h-4" />
                        Reported {selectedComment.reportCount} times
                      </p>
                      <p className="text-xs text-red-600">
                        Reasons: {selectedComment.reportReasons.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Replies */}
                  {selectedComment.replies && selectedComment.replies.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-xs text-gray-500 mb-3">Replies ({selectedComment.replies.length})</p>
                      <div className="space-y-3">
                        {selectedComment.replies.map((reply: any) => (
                          <div key={reply._id} className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                                  reply.author.isAdmin
                                    ? 'bg-gradient-to-br from-[#029bba] to-[#027a94]'
                                    : 'bg-gray-400'
                                }`}
                              >
                                {reply.author.isAdmin ? (
                                  <Shield className="w-3 h-3" />
                                ) : (
                                  reply.author.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="text-sm font-medium">{reply.author.name}</span>
                              {reply.author.isAdmin && (
                                <span className="px-1.5 py-0.5 text-xs bg-[#029bba]/10 text-[#029bba] rounded-full">
                                  Team
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200">
                    <p>Created: {formatDate(selectedComment.createdAt)}</p>
                    <p>Likes: {selectedComment.likes} | Dislikes: {selectedComment.dislikes}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Modal */}
        <AnimatePresence>
          {showReplyModal && selectedComment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowReplyModal(false);
                setSelectedComment(null);
                setReplyContent('');
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#029bba]" />
                    Reply as Highrise.pk Team
                  </h3>
                  <button
                    onClick={() => {
                      setShowReplyModal(false);
                      setSelectedComment(null);
                      setReplyContent('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Original Comment */}
                <div className="p-3 bg-gray-50 rounded-xl mb-4">
                  <p className="text-xs text-gray-500 mb-1">Replying to {selectedComment.author.name}</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{selectedComment.content}</p>
                </div>

                {/* Reply Form */}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none resize-none"
                />
                <div className="flex justify-end mt-1 mb-4">
                  <span className={`text-xs ${replyContent.length > 900 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {replyContent.length}/1000
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReplyModal(false);
                      setSelectedComment(null);
                      setReplyContent('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminReply}
                    disabled={replyLoading || !replyContent.trim()}
                    className="flex-1 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {replyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Post Reply
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {showDeleteModal && selectedComment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedComment(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Comment?</h3>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl mb-6">
                  <p className="text-sm text-gray-700 line-clamp-2">{selectedComment.content}</p>
                  <p className="text-xs text-gray-500 mt-1">by {selectedComment.author.name}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedComment(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(true)}
                    disabled={actionLoading === selectedComment._id}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === selectedComment._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
