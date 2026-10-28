import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  User,
  Search,
  Clock,
  Eye,
  Loader2,
  TrendingUp,
  Sparkles,
  Mail,
  ChevronRight,
  ArrowRight,
  Newspaper,
  Bookmark,
  Filter,
  Home,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import SubscriptionModal from '@/components/ui/SubscriptionModal';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import { getCategoryMetadata } from '../lib/categoryMetadata';

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

interface CategoryCount {
  _id: string;
  count: number;
}

const PRIMARY_COLOR = '#029bba';

export default function BlogPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState<'latest' | 'popular' | 'featured'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');

  const [trendingBlogs, setTrendingBlogs] = useState<BlogPost[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'already_subscribed'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const allCategories = [
    'All',
    'Buying Guide',
    'Selling Guide',
    'Renting Guide',
    'First-Time Buyers',
    'Investment',
    'Investment Tips',
    'ROI Analysis',
    'Real Estate Finance',
    'Mortgage & Loans',
    'Market Analysis',
    'Market Trends',
    'Price Trends',
    'Market News',
    'Industry Reports',
    'Legal',
    'Legal Guide',
    'Property Laws',
    'Documentation',
    'Taxation',
    'Verification',
    'Karachi',
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Peshawar',
    'Quetta',
    'City Guide',
    'Area Guide',
    'Society Reviews',
    'New Projects',
    'Project Reviews',
    'Developer News',
    'Under Construction',
    'Upcoming Projects',
    'Apartments',
    'Houses',
    'Plots',
    'Commercial',
    'Offices',
    'Shops',
    'Farmhouses',
    'Penthouses',
    'Lifestyle',
    'Home Decor',
    'Interior Design',
    'Architecture',
    'Smart Homes',
    'Renovation',
    'Maintenance',
    'News',
    'Government Policies',
    'CPEC Updates',
    'Infrastructure',
    'Economy',
    'Tips',
    'Expert Advice',
    'How-To Guides',
    'Checklist',
    'FAQs',
    'Technology',
    'PropTech',
    'Virtual Tours',
    'Online Transactions',
    'Opinion',
    'Interview',
    'Success Stories',
    'General',
  ];

    const fetchTrendingBlogs = async () => {
    setTrendingLoading(true);
    try {
      const response = await fetch('/api/blogs/trending?limit=4');
      const data = await response.json();

      if (data?.success && Array.isArray(data.blogs)) {
        setTrendingBlogs(data.blogs);
      } else {
        setTrendingBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching trending blogs:', error);
      setTrendingBlogs([]);
    } finally {
      setTrendingLoading(false);
    }
  };

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        status: 'published',
        sort: selectedSort,
      });

      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/blogs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setBlogs(Array.isArray(data.blogs) ? data.blogs : []);
        setPagination(data.pagination || null);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } else {
        setBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [currentPage, selectedCategory, selectedSort]);

  useEffect(() => {
    fetchTrendingBlogs();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    await fetchBlogs();
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newsletterEmail) {
      setModalType('error');
      setModalMessage('Please enter your email address');
      setShowModal(true);
      return;
    }

    if (!turnstileToken) {
      setModalType('error');
      setModalMessage('Please complete CAPTCHA verification before subscribing.');
      setShowModal(true);
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail,
          source: 'blog_page',
          turnstileToken,
          website: honeypotWebsite,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setModalType('success');
        setModalMessage(data.message || 'Successfully subscribed');
        setShowModal(true);
      } else {
        if (data.message?.toLowerCase().includes('already')) {
          setModalType('already_subscribed');
        } else {
          setModalType('error');
          setModalMessage(data.message || 'Failed to subscribe. Please try again.');
        }
        setShowModal(true);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setModalType('error');
      setModalMessage('Something went wrong. Please try again.');
      setShowModal(true);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === 'success') {
      setNewsletterEmail('');
      setTurnstileToken('');
      setHoneypotWebsite('');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryCount = (category: string) => {
    if (category === 'All') {
      return categories.reduce((sum, c) => sum + c.count, 0);
    }
    return categories.find((c) => c._id === category)?.count || 0;
  };

  const featuredBlogs = useMemo(
    () => blogs.filter((b) => b.featured),
    [blogs]
  );

  const heroBlog = useMemo(() => {
    if (selectedSort === 'featured' && featuredBlogs.length > 0) {
      return featuredBlogs[0];
    }
    return blogs[0] || null;
  }, [selectedSort, featuredBlogs, blogs]);

  const secondaryFeatured = useMemo(() => {
    if (!heroBlog) return [];
    return blogs.filter((b) => b._id !== heroBlog._id).slice(0, 3);
  }, [blogs, heroBlog]);

  const popularBlogs = trendingBlogs;

  const latestBlogs = useMemo(() => {
    return [...blogs].sort((a, b) => {
      const aDate = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [blogs]);

  const latestGridBlogs = useMemo(() => {
    if (!heroBlog) return latestBlogs;
    return latestBlogs.filter((b) => b._id !== heroBlog._id);
  }, [latestBlogs, heroBlog]);

  const spotlightBlogs = useMemo(() => {
    return latestGridBlogs.slice(0, 2);
  }, [latestGridBlogs]);

  const editorialFeedBlogs = useMemo(() => {
    return latestGridBlogs.slice(2);
  }, [latestGridBlogs]);

  const spotlightCategories = useMemo(() => {
    return categories
      .filter((c) => c._id && c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [categories]);

  return (
    <>
      <Head>
        <title>Highrise.pk Blog | Real Estate Insights, Guides & Market Trends</title>
        <meta
          name="description"
          content="Explore Highrise.pk Blog for Pakistan real estate insights, legal guides, investment tips, market analysis, technology updates, and expert property advice."
        />
        <link rel="canonical" href="https://highrise.pk/blog" />
        <meta property="og:title" content="Highrise.pk Blog" />
        <meta
          property="og:description"
          content="Real estate insights, legal guides, market trends, and investment advice from Highrise.pk."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://highrise.pk/blog" />
      </Head>

      <div className="min-h-screen bg-[#f7fafc]">
        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">Blog</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            Insights, analysis, and guides for Pakistan&rsquo;s property market
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>Investment strategy</span>
            <span className="text-gray-300">•</span>
            <span>Legal guidance</span>
            <span className="text-gray-300">•</span>
            <span>City trends</span>
            <span className="text-gray-300">•</span>
            <span>Project intelligence</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">Homeownership tips</span>
          </p>
        </div>

        {/* Editorial Snapshot (relocated from hero) */}
        {!loading && (
          <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pt-4">
            <div className="grid lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-8 grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Published</p>
                  <p className="text-2xl font-bold text-[#004063]">{pagination?.total || blogs.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Articles in editorial archive</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Topics</p>
                  <p className="text-2xl font-bold text-[#004063]">{categories.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Active real estate categories</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Featured</p>
                  <p className="text-2xl font-bold text-[#004063]">{featuredBlogs.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Highlighted editorial picks</p>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="w-4 h-4 text-[#029bba]" />
                  <span className="text-sm font-semibold text-[#004063]">Editorial Snapshot</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Browse the latest property coverage, legal explainers, investment strategies,
                  market intelligence, and city-focused housing insights curated for Pakistan.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Search + Filter Strip */}
        <section className="relative z-10">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-4 md:p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search articles, insights, trends..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none transition-all"
                    />
                  </div>
                </form>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium whitespace-nowrap">
                    <Filter className="w-4 h-4" />
                    Topics
                  </div>

                  {allCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                        selectedCategory === category
                          ? 'text-white shadow-lg bg-[#029bba]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                      <span className="ml-1 opacity-70">({getCategoryCount(category)})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-14 md:py-16">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
              <span className="ml-2 text-gray-600">Loading articles...</span>
            </div>
          )}

          {/* Empty */}
          {!loading && blogs.length === 0 && (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
              >
                <Search className="w-8 h-8" style={{ color: PRIMARY_COLOR }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? `No results for "${searchQuery}". Try different keywords.`
                  : 'No articles in this category yet. Check back soon!'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-colors bg-[#029bba] hover:bg-[#027a94]"
              >
                View All Articles
              </button>
            </div>
          )}

          {!loading && blogs.length > 0 && (
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left Main Feed */}
              <div className="lg:col-span-8 space-y-8">
                {/* Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-[0.18em]">
                    Sort by
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSort('latest');
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        selectedSort === 'latest'
                          ? 'bg-[#029bba] text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Latest
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSort('popular');
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        selectedSort === 'popular'
                          ? 'bg-[#029bba] text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Popular
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSort('featured');
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        selectedSort === 'featured'
                          ? 'bg-[#029bba] text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Featured
                    </button>
                  </div>
                </div>

                {/* Section heading */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {selectedSort === 'latest'
                        ? 'Latest Articles'
                        : selectedSort === 'popular'
                        ? 'Popular Articles'
                        : 'Featured Articles'}
                    </h2>
                    <p className="text-gray-500 text-sm md:text-base mt-1">
                      {selectedSort === 'latest'
                        ? 'Fresh insights, legal guidance, investment intelligence, and practical market coverage — ordered by latest publishing activity.'
                        : selectedSort === 'popular'
                        ? 'High-performing articles ranked by reader interest, visibility, and popularity.'
                        : 'Handpicked editorial coverage featuring important real estate insights and standout stories.'}
                    </p>
                  </div>

                  <div className="text-sm text-gray-500">
                    Showing {latestGridBlogs.length} article{latestGridBlogs.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Featured story */}
                {heroBlog && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#029bba] font-semibold mb-2">
                          {selectedSort === 'popular'
                            ? 'Popular Pick'
                            : selectedSort === 'featured'
                            ? 'Featured Story'
                            : 'Featured Story'}
                        </p>
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                          {selectedSort === 'popular'
                            ? 'Most engaging coverage right now'
                            : selectedSort === 'featured'
                            ? 'Editor’s highlighted coverage'
                            : 'Editor’s highlighted coverage'}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        {selectedSort === 'popular' ? 'Reader momentum' : 'Premium editorial pick'}
                      </span>
                    </div>

                    <Link href={`/blog/${heroBlog.slug}`}>
                      <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200">
                        <div className="grid lg:grid-cols-12">
                          <div className="lg:col-span-5 h-72 lg:h-full overflow-hidden">
                            <img
                              src={
                                heroBlog.image?.url ||
                                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
                              }
                              alt={heroBlog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>

                          <div className="lg:col-span-7 p-6 md:p-8 flex flex-col">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span
                                className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                style={{
                                  backgroundColor: `${PRIMARY_COLOR}15`,
                                  color: PRIMARY_COLOR,
                                }}
                              >
                                {heroBlog.category}
                              </span>

                              {heroBlog.featured && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                  <Sparkles className="w-3 h-3" />
                                  Featured
                                </span>
                              )}

                              {heroBlog.source === 'ai_generated' && (
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                  AI Generated
                                </span>
                              )}
                            </div>

                            <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight group-hover:text-[#029bba] transition-colors">
                              {heroBlog.title}
                            </h3>

                            <p className="text-gray-600 mb-6 text-base md:text-lg leading-relaxed line-clamp-4">
                              {heroBlog.excerpt}
                            </p>

                            <div className="mt-auto flex flex-wrap items-center gap-5 text-sm text-gray-500">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1.5" />
                                {heroBlog.authorName || heroBlog.author || 'Highrise Team'}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1.5" />
                                {formatDate(heroBlog.publishedAt || heroBlog.createdAt)}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1.5" />
                                {heroBlog.readTime || '5 min read'}
                              </div>
                              <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-1.5" />
                                {heroBlog.views || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                )}

                {/* Spotlight grid */}
                {spotlightBlogs.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {spotlightBlogs
                      .filter((post) => post._id !== heroBlog?._id)
                      .map((post, index) => (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                      >
                        <Link href={`/blog/${post.slug}`}>
                          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200 h-full">
                            <div className="h-56 overflow-hidden">
                              <img
                                src={
                                  post.image?.url ||
                                  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
                                }
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            <div className="p-6">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span
                                  className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                  style={{
                                    backgroundColor: `${PRIMARY_COLOR}15`,
                                    color: PRIMARY_COLOR,
                                  }}
                                >
                                  {post.category}
                                </span>

                                {post.featured && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                    <Sparkles className="w-3 h-3" />
                                    Featured
                                  </span>
                                )}
                              </div>

                              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#029bba] transition-colors line-clamp-2">
                                {post.title}
                              </h3>

                              <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                                {post.excerpt}
                              </p>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1.5" />
                                  {formatDate(post.publishedAt || post.createdAt)}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1.5" />
                                  {post.readTime || '5 min read'}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Editorial style cards */}
                <div className="space-y-6">
                  {editorialFeedBlogs.map((post, index) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                    >
                      <Link href={`/blog/${post.slug}`}>
                        <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200">
                          <div className="grid md:grid-cols-12">
                            <div className="md:col-span-4 h-64 md:h-full overflow-hidden">
                              <img
                                src={
                                  post.image?.url ||
                                  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
                                }
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            <div className="md:col-span-8 p-6 md:p-7 flex flex-col">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span
                                  className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                  style={{
                                    backgroundColor: `${PRIMARY_COLOR}15`,
                                    color: PRIMARY_COLOR,
                                  }}
                                >
                                  {post.category}
                                </span>

                                {post.featured && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                    <Sparkles className="w-3 h-3" />
                                    Featured
                                  </span>
                                )}

                                {post.source === 'ai_generated' && (
                                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                    AI Generated
                                  </span>
                                )}
                              </div>

                              <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#029bba] transition-colors line-clamp-2">
                                {post.title}
                              </h3>

                              <p className="text-gray-600 mb-5 line-clamp-3 leading-relaxed">
                                {post.excerpt}
                              </p>

                              {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-5">
                                  {post.tags.slice(0, 3).map((tag) => (
                                    <Link
                                      key={tag}
                                      href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                                      className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      #{tag}
                                    </Link>
                                  ))}
                                </div>
                              )}

                              <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <User className="w-4 h-4 mr-1.5" />
                                    {post.authorName || post.author || 'Highrise Team'}
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1.5" />
                                    {formatDate(post.publishedAt || post.createdAt)}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1.5" />
                                    {post.readTime || '5 min read'}
                                  </div>
                                  <div className="flex items-center">
                                    <Eye className="w-4 h-4 mr-1.5" />
                                    {post.views || 0}
                                  </div>
                                </div>

                                <div className="inline-flex items-center text-sm font-semibold text-[#029bba] group-hover:translate-x-1 transition-transform">
                                  Read article
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex flex-wrap justify-center items-center gap-2 pt-4">
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
                )}
              </div>

              {/* Right Sidebar */}
              <aside className="lg:col-span-4 space-y-6">
                {/* Popular / Trending */}
                <Card className="p-6 border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Trending Now</h3>
                      <p className="text-xs text-gray-500">Ranked by engagement, popularity, and recency</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {trendingLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-[#029bba]" />
                        <span className="ml-2 text-sm text-gray-500">Loading trending...</span>
                      </div>
                    ) : popularBlogs.length > 0 ? (
                      popularBlogs.map((post, index) => (
                        <Link key={post._id} href={`/blog/${post.slug}`} className="block group">
                          <div className="flex gap-4">
                            <div className="w-8 text-lg font-bold text-[#029bba]/70 shrink-0">
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs uppercase tracking-wide font-semibold text-[#029bba] mb-1">
                                {post.category}
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#029bba] transition-colors">
                                {post.title}
                              </h4>
                              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                                <span>{post.readTime || '5 min read'}</span>
                                <span>{post.views || 0} views</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 py-2">
                        No trending articles available right now.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Topics Card */}
                <Card className="p-6 border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Explore Topics</h3>
                      <p className="text-xs text-gray-500">Browse by category</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {allCategories
                      .filter((c) => c !== 'All' && getCategoryCount(c) > 0)
                      .map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setCurrentPage(1);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${
                            selectedCategory === category
                              ? 'bg-[#029bba] text-white'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`text-sm font-medium ${selectedCategory === category ? 'text-white' : 'text-gray-700'}`}>
                            {category}
                          </span>
                          <span className={`text-xs ${selectedCategory === category ? 'text-white/80' : 'text-gray-500'}`}>
                            {getCategoryCount(category)}
                          </span>
                        </button>
                      ))}
                  </div>
                </Card>

                {/* Newsletter Card */}
                <Card className="p-0 text-center bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950 border-none overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#06b6d4,_transparent_30%),radial-gradient(circle_at_bottom_left,_#0ea5e9,_transparent_25%)]" />

                  <div className="relative z-10 p-8 md:p-9">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-white/10 border border-white/10 shadow-lg">
                      <Mail className="w-8 h-8 text-white" />
                    </div>

                    <div className="max-w-sm mx-auto">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-3">
                        Newsletter
                      </p>

                      <h2 className="text-2xl md:text-[1.75rem] font-bold text-white mb-3 leading-tight">
                        Weekly Property Brief
                      </h2>

                      <p className="text-gray-300 mb-7 text-sm leading-7">
                        Get curated market trends, legal guidance, investment insights,
                        and high-signal property intelligence delivered to your inbox.
                      </p>
                    </div>

                    <form
                      onSubmit={handleNewsletterSubmit}
                      className="space-y-4 max-w-sm mx-auto"
                    >
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border border-white/15 bg-white/10 text-white placeholder:text-gray-400 focus:border-[#029bba] focus:bg-white/15 outline-none transition-all shadow-sm"
                      />

                      <input
                        type="text"
                        name="website"
                        value={honeypotWebsite}
                        onChange={(e) => setHoneypotWebsite(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        className="hidden"
                        aria-hidden="true"
                      />

                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex justify-center overflow-hidden">
                        <TurnstileWidget
                          theme="dark"
                          onVerify={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken('')}
                          onError={() => setTurnstileToken('')}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubscribing || !turnstileToken}
                        className="w-full px-6 py-3.5 rounded-2xl font-semibold text-white shadow-lg transition-all duration-300 bg-[#029bba] hover:bg-[#027a94] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subscribing...
                          </>
                        ) : (
                          <>
                            Subscribe Now
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="max-w-sm mx-auto mt-5">
                      <p className="text-gray-400 text-xs leading-6">
                        Protected by Turnstile. No spam. Unsubscribe anytime.
                      </p>
                    </div>
                  </div>
                </Card>
              </aside>
            </div>
          )}
        </section>

        {!loading && spotlightCategories.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pb-16 md:pb-20">
            <div className="mb-8 md:mb-10">
              <p className="text-xs uppercase tracking-[0.18em] text-[#029bba] font-semibold mb-3">
                Category Spotlight
              </p>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Explore the topics shaping Pakistan real estate
                  </h2>
                  <p className="text-gray-600 text-sm md:text-base mt-2 max-w-2xl leading-7">
                    Dive deeper into high-interest categories including investment, legal guidance,
                    market intelligence, project reviews, and practical homeownership advice.
                  </p>
                </div>

                <Link
                  href="/blog/search"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#029bba] hover:text-[#027a94] transition-colors"
                >
                  Explore all topics
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {spotlightCategories.map((category, index) => {
                const categorySlug = category._id.toLowerCase().replace(/\s+/g, '-');
                const categoryMeta = getCategoryMetadata(categorySlug);
                const relatedArticle = latestBlogs.find((blog) => blog.category === category._id);

                // Dynamically import the Lucide icon if available
                let IconComponent = null;
                if (categoryMeta?.icon) {
                  try {
                    const LucideIcons = require('lucide-react');
                    IconComponent = LucideIcons[categoryMeta.icon];
                  } catch (err) {
                    console.warn(`Icon ${categoryMeta.icon} not found`);
                  }
                }

                return (
                  <motion.div
                    key={category._id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                  >
                    <Link href={`/blog/category/${categorySlug}`}>
                      <Card className="group h-full border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer">
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          <img
                            src={
                              relatedArticle?.image?.url ||
                              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
                            }
                            alt={categoryMeta?.name || category._id}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold border border-white/20">
                              {category.count} article{category.count !== 1 ? 's' : ''}
                            </span>
                            {categoryMeta?.emoji && (
                              <span className="text-2xl">{categoryMeta.emoji}</span>
                            )}
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {IconComponent && (
                                <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${categoryMeta?.color.gradient || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
                                  <IconComponent className="w-5 h-5 text-white" />
                                </div>
                              )}
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#029bba] transition-colors leading-snug">
                                {categoryMeta?.name || category._id}
                              </h3>
                            </div>
                            <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#029bba]/10 text-[#029bba] group-hover:bg-[#029bba] group-hover:text-white transition-all">
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 leading-7 mb-4 line-clamp-3">
                            {categoryMeta?.description || 
                              (relatedArticle?.excerpt
                                ? relatedArticle.excerpt.slice(0, 120) + (relatedArticle.excerpt.length > 120 ? '...' : '')
                                : `Browse ${category._id.toLowerCase()} insights, expert coverage, and practical guidance from Highrise.pk.`)}
                          </p>

                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-500">
                              Latest: {formatDate(relatedArticle?.publishedAt || relatedArticle?.createdAt)}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-[#029bba] group-hover:translate-x-1 transition-transform">
                              Explore
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        <SubscriptionModal
          isOpen={showModal}
          onClose={handleModalClose}
          email={newsletterEmail}
          type={modalType}
          message={modalMessage}
        />
      </div>
    </>
  );
}
