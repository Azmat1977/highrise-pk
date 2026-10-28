//C:\dev\highrise-pk\pages\admin\blogs\index.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Clock,
  Star,
  MoreVertical,
  RefreshCw,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
// react-hot-toast removed in favor of design-system banner state

// Types
interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  image: {
    url: string;
    public_id: string;
  };
  status: 'draft' | 'published' | 'scheduled';
  featured: boolean;
  views: number;
  readTime: string;
  tags: string[];
  publishedAt: string | null;
  scheduledFor: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlogCounts {
  all: number;
  published: number;
  draft: number;
  scheduled: number;
  trash: number;
}

type TabType = 'all' | 'published' | 'draft' | 'scheduled' | 'trash';

// Categories
const CATEGORIES = [
  'All Categories',
  'Investment',
  'Legal',
  'Guide',
  'Technology',
  'Market Analysis',
  'News',
  'Tips',
  'Lifestyle',
];

// Format date helper
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format views helper
const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
};

export default function BlogsPage() {
  const router = useRouter();

  // State
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [counts, setCounts] = useState<BlogCounts>({
    all: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
    trash: 0,
  });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const limit = 10;

  // Tabs configuration
  const tabs = [
    { id: 'all' as TabType, label: 'All Posts', count: counts.all },
    { id: 'published' as TabType, label: 'Published', count: counts.published },
    { id: 'draft' as TabType, label: 'Drafts', count: counts.draft },
    { id: 'scheduled' as TabType, label: 'Scheduled', count: counts.scheduled },
    { id: 'trash' as TabType, label: 'Trash', count: counts.trash },
  ];

  // Fetch blogs
  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        deleted: activeTab === 'trash' ? 'true' : 'false',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (activeTab !== 'all' && activeTab !== 'trash') {
        params.append('status', activeTab);
      }

      if (selectedCategory !== 'All Categories') {
        params.append('category', selectedCategory);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const res = await fetch(`/api/admin/blogs?${params}`);
      const data = await res.json();

      if (data.success) {
        setBlogs(data.blogs);
        setCounts(data.counts);
        setTotalPages(data.pagination.totalPages);
      } else {
        setBanner({ message: data.message || 'Failed to fetch blogs', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBanner({ message: 'Failed to fetch blogs', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedCategory, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Refresh sidebar stats
  const refreshSidebarStats = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refreshAdminStats'));
    }
  };

  // Handle status change
  const handleStatusChange = async (blog: Blog, newStatus: 'draft' | 'published') => {
    setActionLoading(blog._id);
    try {
      const res = await fetch(`/api/admin/blogs/${blog._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setBanner({
          message: newStatus === 'published' ? 'Blog published!' : 'Blog unpublished!',
          type: 'success',
        });
        fetchBlogs();
        refreshSidebarStats();
      } else {
        setBanner({ message: data.message || 'Failed to update status', type: 'error' });
      }
    } catch (error) {
      console.error('Status change error:', error);
      setBanner({ message: 'Failed to update status', type: 'error' });
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  // Handle delete (soft delete)
  const handleDelete = async () => {
    if (!blogToDelete) return;

    setActionLoading(blogToDelete._id);
    try {
      const res = await fetch(
        `/api/admin/blogs/${blogToDelete._id}?permanent=${isPermanentDelete}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (data.success) {
        setBanner({
          message: isPermanentDelete ? 'Blog permanently deleted!' : 'Blog moved to trash!',
          type: 'success',
        });
        fetchBlogs();
        refreshSidebarStats();
      } else {
        setBanner({ message: data.message || 'Failed to delete blog', type: 'error' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setBanner({ message: 'Failed to delete blog', type: 'error' });
    } finally {
      setActionLoading(null);
      setShowDeleteModal(false);
      setBlogToDelete(null);
    }
  };

  // Handle restore
  const handleRestore = async (blog: Blog) => {
    setActionLoading(blog._id);
    try {
      const res = await fetch(`/api/admin/blogs/${blog._id}/restore`, {
        method: 'PATCH',
      });

      const data = await res.json();

      if (data.success) {
        setBanner({ message: 'Blog restored successfully!', type: 'success' });
        fetchBlogs();
        refreshSidebarStats();
      } else {
        setBanner({ message: data.message || 'Failed to restore blog', type: 'error' });
      }
    } catch (error) {
      console.error('Restore error:', error);
      setBanner({ message: 'Failed to restore blog', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, featured: boolean) => {
    const badges = {
      published: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Published
        </span>
      ),
      draft: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          <FileText className="w-3 h-3" />
          Draft
        </span>
      ),
      scheduled: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          <Clock className="w-3 h-3" />
          Scheduled
        </span>
      ),
    };

    return (
      <div className="flex items-center gap-2">
        {badges[status as keyof typeof badges] || badges.draft}
        {featured && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Star className="w-3 h-3 fill-current" />
          </span>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      {banner && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
            banner.type === 'success'
              ? 'bg-[#004063] text-white border border-[#029bba]/30'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{banner.message}</span>
        </div>
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your blog content
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/blogs/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
                <p className="text-sm text-gray-500">Total Posts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.published}</p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Edit className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts.draft}</p>
                <p className="text-sm text-gray-500">Drafts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {blogs.reduce((sum, b) => sum + (b.views || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#029bba] text-white shadow-lg shadow-[#029bba]/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={fetchBlogs}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Blog List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'trash'
                  ? 'Trash is empty'
                  : 'Get started by creating your first blog post'}
              </p>
              {activeTab !== 'trash' && (
                <button
                  onClick={() => router.push('/admin/blogs/create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Post
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blogs.map((blog) => (
                    <motion.tr
                      key={blog._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Post */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {blog.image?.url ? (
                              <img
                                src={blog.image.url}
                                alt={blog.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 truncate max-w-xs">
                              {blog.title}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {blog.readTime || '5 min read'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {blog.category}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {blog.author}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(blog.status, blog.featured)}
                      </td>

                      {/* Views */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Eye className="w-4 h-4" />
                          {formatViews(blog.views || 0)}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(blog.publishedAt || blog.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'trash' ? (
                            <>
                              <button
                                onClick={() => handleRestore(blog)}
                                disabled={actionLoading === blog._id}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Restore"
                              >
                                {actionLoading === blog._id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setBlogToDelete(blog);
                                  setIsPermanentDelete(true);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => router.push(`/admin/blogs/${blog._id}/edit`)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <a
                                href={`/blog/${blog.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(
                                      openDropdown === blog._id ? null : blog._id
                                    );
                                  }}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                  {openDropdown === blog._id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {blog.status === 'published' ? (
                                        <button
                                          onClick={() =>
                                            handleStatusChange(blog, 'draft')
                                          }
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <XCircle className="w-4 h-4" />
                                          Unpublish
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleStatusChange(blog, 'published')
                                          }
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Publish
                                        </button>
                                      )}
                                      <hr className="my-1" />
                                      <button
                                        onClick={() => {
                                          setBlogToDelete(blog);
                                          setIsPermanentDelete(false);
                                          setShowDeleteModal(true);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Move to Trash
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && blogToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDeleteModal(false)}
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
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isPermanentDelete ? 'Delete Permanently?' : 'Move to Trash?'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isPermanentDelete
                        ? 'This action cannot be undone.'
                        : 'You can restore it later from trash.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl mb-6">
                  <p className="text-sm text-gray-700 truncate">{blogToDelete.title}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === blogToDelete._id}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === blogToDelete._id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isPermanentDelete ? 'Delete Forever' : 'Move to Trash'}
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
