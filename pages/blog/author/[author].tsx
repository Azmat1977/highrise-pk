import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Loader2,
  Search,
  User,
  FileText,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BlogImage {
  url?: string;
  public_id?: string;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author?: string;
  authorName?: string;
  authorBio?: string;
  authorAvatar?: string;
  publishedAt?: string;
  createdAt?: string;
  image?: BlogImage;
  readTime?: string;
  views?: number;
  featured?: boolean;
  tags?: string[];
  source?: 'manual' | 'ai_generated';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAuthorName(raw: string) {
  return decodeURIComponent(raw || '').replace(/-/g, ' ');
}

export default function BlogAuthorPage() {
  const router = useRouter();
  const { author } = router.query;

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const authorName =
    typeof author === 'string' ? formatAuthorName(author) : '';

  useEffect(() => {
    if (!authorName) return;

    const fetchAuthorBlogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12',
          status: 'published',
          search: searchQuery.trim(),
        });

        const response = await fetch(`/api/blogs?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          const allBlogs: BlogPost[] = Array.isArray(data.blogs) ? data.blogs : [];
          const filteredBlogs = allBlogs.filter((post) => {
            const name = (post.authorName || post.author || '').toLowerCase();
            return name === authorName.toLowerCase();
          });

          setBlogs(filteredBlogs);

          setPagination({
            page: currentPage,
            limit: 12,
            total: filteredBlogs.length,
            totalPages: Math.max(1, Math.ceil(filteredBlogs.length / 12)),
            hasMore: currentPage < Math.ceil(filteredBlogs.length / 12),
          });
        } else {
          setBlogs([]);
        }
      } catch (error) {
        console.error('Error fetching author blogs:', error);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorBlogs();
  }, [authorName, currentPage, searchQuery]);

  const featuredPost = useMemo(() => {
    return blogs.find((b) => b.featured) || blogs[0] || null;
  }, [blogs]);

  const remainingPosts = useMemo(() => {
    if (!featuredPost) return blogs;
    return blogs.filter((b) => b._id !== featuredPost._id);
  }, [blogs, featuredPost]);

  const authorStats = useMemo(() => {
    const totalPosts = blogs.length;
    const totalViews = blogs.reduce((sum, blog) => sum + (blog.views || 0), 0);
    const categories = new Set(blogs.map((blog) => blog.category)).size;
    return { totalPosts, totalViews, categories };
  }, [blogs]);

  const authorAvatar =
    blogs[0]?.authorAvatar ||
    'https://ui-avatars.com/api/?name=' + encodeURIComponent(authorName || 'Author') + '&background=029bba&color=fff&size=256';

  const authorBio =
    blogs[0]?.authorBio ||
    `${authorName} contributes expert insights, analysis, and practical knowledge to Highrise.pk’s real estate editorial platform.`;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const pageTitle = authorName
    ? `${authorName} Articles | Highrise.pk Blog`
    : 'Author Articles | Highrise.pk';

  const pageDescription = authorName
    ? `Read articles by ${authorName} on Highrise.pk. Explore market insights, real estate advice, legal guides, and property expertise.`
    : 'Read author articles on Highrise.pk.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {authorName ? (
          <link
            rel="canonical"
            href={`https://highrise.pk/blog/author/${encodeURIComponent(authorName)}`}
          />
        ) : null}
      </Head>

      <div className="min-h-screen bg-[#f8fafc]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#06b6d4,_transparent_30%),radial-gradient(circle_at_bottom_left,_#0ea5e9,_transparent_25%)]" />
          <div className="container mx-auto px-4 py-14 md:py-18 relative">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-4xl"
            >
              <Link
                href="/blog"
                className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-xl shrink-0 bg-white/10">
                  <img
                    src={authorAvatar}
                    alt={authorName || 'Author'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm mb-4">
                    <User className="w-4 h-4 text-cyan-300" />
                    <span className="text-sm font-medium text-white/90">Author Archive</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-3">
                    {authorName || 'Author'}
                  </h1>

                  <p className="text-white/75 text-lg leading-relaxed max-w-2xl">
                    {authorBio}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Articles</p>
                  <p className="text-2xl font-bold text-white">{authorStats.totalPosts}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Views</p>
                  <p className="text-2xl font-bold text-white">{authorStats.totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Categories</p>
                  <p className="text-2xl font-bold text-white">{authorStats.categories}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Search */}
        <section className="relative -mt-6 z-10">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-4 md:p-5">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search articles by ${authorName || 'this author'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all"
                  />
                </div>

                <Link
                  href="/blog"
                  className="px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium text-center"
                >
                  Browse All Articles
                </Link>
              </form>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-4 py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
              <span className="ml-2 text-gray-600">Loading author articles...</span>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[#029bba]/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#029bba]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 mb-6">
                No published articles are currently available for this author.
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors"
              >
                Browse All Blog Posts
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured post */}
              {featuredPost ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Link href={`/blog/${featuredPost.slug}`}>
                    <div className="group relative rounded-3xl overflow-hidden min-h-[420px] cursor-pointer border border-gray-200 shadow-xl bg-white">
                      <img
                        src={
                          featuredPost.image?.url ||
                          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
                        }
                        alt={featuredPost.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba] text-white">
                            {featuredPost.category}
                          </span>

                          {featuredPost.featured ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Featured
                            </span>
                          ) : null}
                        </div>

                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 max-w-3xl">
                          {featuredPost.title}
                        </h2>

                        <p className="text-white/80 text-base md:text-lg max-w-2xl mb-5 line-clamp-3">
                          {featuredPost.excerpt}
                        </p>

                        <div className="flex flex-wrap items-center gap-5 text-sm text-white/75">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(featuredPost.publishedAt || featuredPost.createdAt)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {featuredPost.readTime || '5 min read'}
                          </div>
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            {featuredPost.views || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ) : null}

              {/* Grid */}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {remainingPosts.map((post, index) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                  >
                    <Link href={`/blog/${post.slug}`}>
                      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col border-gray-200">
                        <div className="h-52 overflow-hidden relative">
                          <img
                            src={
                              post.image?.url ||
                              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
                            }
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {post.featured ? (
                            <div className="absolute top-3 left-3 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Featured
                            </div>
                          ) : null}
                        </div>

                        <div className="p-6 flex flex-col flex-1">
                          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full mb-3 self-start bg-[#029bba]/10 text-[#029bba]">
                            {post.category}
                          </span>

                          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#029bba] transition-colors">
                            {post.title}
                          </h3>

                          <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                            {post.excerpt}
                          </p>

                          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{post.readTime || '5 min read'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              <span>{post.views || 0}</span>
                            </div>
                          </div>

                          <div className="flex items-center text-xs text-gray-400 mt-2">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 ? (
                <div className="flex flex-wrap justify-center items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === pagination.totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => (
                        <React.Fragment key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl font-medium transition-all ${
                              currentPage === page
                                ? 'bg-[#029bba] text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    disabled={!pagination.hasMore}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </>
  );
}