//C:\dev\highrise-pk\pages\blog\category\[category].tsx
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Eye,
  Loader2,
  Search,
  Sparkles,
  User,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getCategoryMetadata, getRelatedCategories, getCategoryGroup } from '../../../lib/categoryMetadata';

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

function formatCategoryName(raw: string) {
  return decodeURIComponent(raw || '').replace(/-/g, ' ');
}

export default function BlogCategoryPage() {
  const router = useRouter();
  const { category } = router.query;

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categoryName =
    typeof category === 'string' ? formatCategoryName(category) : '';

  // Get category metadata
  const categorySlug = typeof category === 'string' ? category : '';
  const categoryMeta = getCategoryMetadata(categorySlug);
  const relatedCategories = getRelatedCategories(categorySlug, 4);

  useEffect(() => {
    if (!categoryName) return;

    const fetchCategoryBlogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12',
          status: 'published',
          category: categoryName,
        });

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const response = await fetch(`/api/blogs?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setBlogs(Array.isArray(data.blogs) ? data.blogs : []);
          setPagination(data.pagination || null);
        } else {
          setBlogs([]);
        }
      } catch (error) {
        console.error('Error fetching category blogs:', error);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryBlogs();
  }, [categoryName, currentPage, searchQuery]);

  const heroPost = useMemo(() => {
    return blogs.find((b) => b.featured) || blogs[0] || null;
  }, [blogs]);

  const restPosts = useMemo(() => {
    if (!heroPost) return blogs;
    return blogs.filter((b) => b._id !== heroPost._id);
  }, [blogs, heroPost]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const pageTitle = categoryName
    ? `${categoryName} Blogs | Highrise.pk`
    : 'Category | Highrise.pk';

  const pageDescription = categoryName
    ? `Explore ${categoryName} articles on Highrise.pk. Discover expert insights, trends, guides, and updates from Pakistan’s real estate market.`
    : 'Explore blog articles by category on Highrise.pk.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {categoryName ? (
          <link
            rel="canonical"
            href={`https://highrise.pk/blog/category/${encodeURIComponent(categoryName)}`}
          />
        ) : null}
      </Head>

      <div className="min-h-screen bg-[#f8fafc]">
        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href="/blog" className="hover:text-[#029bba] font-medium transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">{categoryMeta?.name || categoryName || 'Category'}</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            {categoryMeta?.name || categoryName || 'Category'}
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>
              {categoryMeta?.longDescription || categoryMeta?.description
                || `Explore the latest ${categoryName || 'category'} insights, guides, market trends, analysis, and expert perspectives from Highrise.pk.`}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">
              {pagination?.total || blogs.length} article{((pagination?.total || blogs.length) !== 1) ? 's' : ''} • Updated regularly
            </span>
          </p>
        </div>

        {/* Search strip */}
        <section className="relative z-10">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-4 md:p-5">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search in ${categoryName || 'this category'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all"
                  />
                </div>

                <Link
                  href="/blog"
                  className="px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium text-center"
                >
                  View All Articles
                </Link>
              </form>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-12">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
              <span className="ml-2 text-gray-600">Loading articles...</span>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[#029bba]/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[#029bba]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 mb-6">
                There are no articles available in this category yet.
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
              {/* Featured article */}
              {heroPost ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Link href={`/blog/${heroPost.slug}`}>
                    <div className="group relative rounded-3xl overflow-hidden min-h-[420px] cursor-pointer border border-gray-200 shadow-xl bg-white">
                      <img
                        src={
                          heroPost.image?.url ||
                          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
                        }
                        alt={heroPost.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba] text-white">
                            {heroPost.category}
                          </span>

                          {heroPost.featured ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Featured
                            </span>
                          ) : null}
                        </div>

                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 max-w-3xl">
                          {heroPost.title}
                        </h2>

                        <p className="text-white/80 text-base md:text-lg max-w-2xl mb-5 line-clamp-3">
                          {heroPost.excerpt}
                        </p>

                        <div className="flex flex-wrap items-center gap-5 text-sm text-white/75">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {heroPost.authorName || heroPost.author || 'Highrise Team'}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(heroPost.publishedAt || heroPost.createdAt)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {heroPost.readTime || '5 min read'}
                          </div>
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            {heroPost.views || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ) : null}

              {/* Grid */}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {restPosts.map((post, index) => (
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

                          {post.tags && post.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                <span>{post.authorName || post.author || 'Highrise Team'}</span>
                              </div>
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
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Category Info Card */}
              {categoryMeta && (
                <Card className="p-6 border-gray-200 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    {categoryMeta.icon && (() => {
                      try {
                        const LucideIcons = require('lucide-react');
                        const IconComponent = LucideIcons[categoryMeta.icon];
                        return IconComponent ? (
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryMeta.color.gradient} flex items-center justify-center shrink-0`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                        ) : null;
                      } catch (err) {
                        return null;
                      }
                    })()}
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
                        {categoryMeta.name}
                        <span className="text-xl">{categoryMeta.emoji}</span>
                      </h3>
                      {categoryMeta.group && (() => {
                        const groupMeta = getCategoryGroup(categoryMeta.group);
                        return (
                          <p className="text-xs text-gray-500">
                            {groupMeta.emoji} {groupMeta.name}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {categoryMeta.description}
                  </p>
                  {categoryMeta.seoKeywords && categoryMeta.seoKeywords.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Related Topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryMeta.seoKeywords.slice(0, 5).map((keyword) => (
                          <span
                            key={keyword}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Related Categories */}
              {relatedCategories.length > 0 && (
                <Card className="p-6 border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Related Categories
                  </h3>
                  <div className="space-y-3">
                    {relatedCategories.map((relCat) => {
                      let IconComponent = null;
                      try {
                        const LucideIcons = require('lucide-react');
                        IconComponent = LucideIcons[relCat.icon];
                      } catch (err) {
                        // Icon not found
                      }

                      return (
                        <Link
                          key={relCat.slug}
                          href={`/blog/category/${relCat.slug}`}
                          className="group flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-cyan-200 hover:bg-cyan-50/50"
                        >
                          {IconComponent && (
                            <div className={`mt-0.5 rounded-lg bg-gradient-to-br ${relCat.color.gradient} p-2 shrink-0`}>
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900 group-hover:text-cyan-600">
                                {relCat.name}
                              </span>
                              <span className="text-xs">{relCat.emoji}</span>
                            </div>
                            <p className="line-clamp-2 text-xs leading-relaxed text-gray-600">
                              {relCat.description}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-600 shrink-0 mt-1" />
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Quick Navigation */}
              <Card className="p-6 border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Quick Navigation</h3>
                <div className="space-y-2">
                  <Link
                    href="/blog"
                    className="block px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                  >
                    All Blog Articles
                  </Link>
                  <Link
                    href="/blog/search"
                    className="block px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                  >
                    Advanced Search
                  </Link>
                </div>
              </Card>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}