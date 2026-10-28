import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  Calendar,
  Clock,
  Eye,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  TrendingUp,
  User,
  Hash,
  ArrowRight,
  FileText,
} from 'lucide-react';
// react-hot-toast removed in favor of design-system banner

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SearchResult {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string | null;
  image: string | null;
  readTime: string;
  views: number;
  tags: string[];
  featured: boolean;
  relevanceScore: number | null;
}

interface SearchResponse {
  success: boolean;
  query: string | null;
  filters: {
    category: string | null;
    tags: string[];
    author: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  };
  sort: string;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  results: SearchResult[];
  filterOptions: {
    categories: string[];
    popularTags: Array<{ tag: string; count: number }>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
];

// Grouped categories for better UX
const CATEGORY_GROUPS = [
  {
    label: '🏠 Property Guides',
    categories: ['Buying Guide', 'Selling Guide', 'Renting Guide', 'First-Time Buyers'],
  },
  {
    label: '💰 Investment & Finance',
    categories: ['Investment', 'Investment Tips', 'ROI Analysis', 'Real Estate Finance', 'Mortgage & Loans'],
  },
  {
    label: '📊 Market & Analysis',
    categories: ['Market Analysis', 'Market Trends', 'Price Trends', 'Market News', 'Industry Reports'],
  },
  {
    label: '⚖️ Legal & Documentation',
    categories: ['Legal', 'Legal Guide', 'Property Laws', 'Documentation', 'Taxation', 'Verification'],
  },
  {
    label: '🏙️ City & Area Guides',
    categories: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'City Guide', 'Area Guide', 'Society Reviews'],
  },
  {
    label: '🏗️ Projects & Developers',
    categories: ['New Projects', 'Project Reviews', 'Developer News', 'Under Construction', 'Upcoming Projects'],
  },
  {
    label: '🏡 Property Types',
    categories: ['Apartments', 'Houses', 'Plots', 'Commercial', 'Offices', 'Shops', 'Farmhouses', 'Penthouses'],
  },
  {
    label: '🎨 Lifestyle & Living',
    categories: ['Lifestyle', 'Home Decor', 'Interior Design', 'Architecture', 'Smart Homes', 'Renovation', 'Maintenance'],
  },
  {
    label: '📰 News & Updates',
    categories: ['News', 'Government Policies', 'CPEC Updates', 'Infrastructure', 'Economy'],
  },
  {
    label: '💡 Tips & Advice',
    categories: ['Tips', 'Expert Advice', 'How-To Guides', 'Checklist', 'FAQs'],
  },
  {
    label: '🔧 Technology',
    categories: ['Technology', 'PropTech', 'Virtual Tours', 'Online Transactions'],
  },
  {
    label: '📋 Others',
    categories: ['Opinion', 'Interview', 'Success Stories', 'General'],
  },
];

const DEBOUNCE_MS = 400;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function BlogSearchPage() {
  const router = useRouter();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    popularTags: Array<{ tag: string; count: number }>;
  }>({ categories: [], popularTags: [] });

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  // ─────────────────────────────────────────────────────────────────────────
  // SYNC URL PARAMS ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!router.isReady) return;

    const { q, category, tags, sort, dateFrom: df, dateTo: dt, page } = router.query;

    if (q) setSearchQuery(String(q));
    if (category) setSelectedCategory(String(category));
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : String(tags).split(',');
      setSelectedTags(tagArray.filter(Boolean));
    }
    if (sort && SORT_OPTIONS.some((s) => s.value === sort)) {
      setSelectedSort(String(sort));
    }
    if (df) setDateFrom(String(df));
    if (dt) setDateTo(String(dt));
    if (page) setCurrentPage(parseInt(String(page), 10) || 1);

    setIsInitialLoad(false);
  }, [router.isReady, router.query]);

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH FUNCTION
  // ─────────────────────────────────────────────────────────────────────────

  const performSearch = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (selectedSort !== 'relevance') params.set('sort', selectedSort);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (currentPage > 1) params.set('page', String(currentPage));

      const response = await fetch(`/api/blogs/search?${params.toString()}`);
      const data: SearchResponse = await response.json();

      if (data.success) {
        setResults(data.results);
        setPagination({
          totalCount: data.pagination.totalCount,
          totalPages: data.pagination.totalPages,
          hasMore: data.pagination.hasMore,
        });
        setFilterOptions(data.filterOptions);
      } else {
        setBanner({ message: 'Search failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setBanner({ message: 'Search failed. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedTags, selectedSort, dateFrom, dateTo, currentPage]);

  // ─────────────────────────────────────────────────────────────────────────
  // DEBOUNCED SEARCH
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isInitialLoad) return;

    const timer = setTimeout(() => {
      performSearch();

      // Update URL
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (selectedSort !== 'relevance') params.set('sort', selectedSort);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (currentPage > 1) params.set('page', String(currentPage));

      const queryString = params.toString();
      const newUrl = queryString ? `/blog/search?${queryString}` : '/blog/search';
      
      router.replace(newUrl, undefined, { shallow: true });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedTags, selectedSort, dateFrom, dateTo, currentPage, isInitialLoad]);

  // Initial search on mount
  useEffect(() => {
    if (!isInitialLoad) return;
    const timer = setTimeout(() => {
      performSearch();
    }, 100);
    return () => clearTimeout(timer);
  }, [isInitialLoad]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setSelectedSort('relevance');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedCategory !== '' ||
      selectedTags.length > 0 ||
      dateFrom !== '' ||
      dateTo !== ''
    );
  }, [searchQuery, selectedCategory, selectedTags, dateFrom, dateTo]);

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT DATE
  // ─────────────────────────────────────────────────────────────────────────

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SEO
  // ─────────────────────────────────────────────────────────────────────────

  const pageTitle = searchQuery
    ? `Search: "${searchQuery}" | Highrise.pk Blog`
    : 'Search Articles | Highrise.pk Blog';

  const pageDescription = searchQuery
    ? `Search results for "${searchQuery}" - Find expert real estate articles, guides, and insights on Highrise.pk`
    : 'Search our collection of real estate articles, market insights, legal guides, and investment advice for Pakistan property market.';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://highrise.pk/blog/search" />
      </Head>

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

      <div className="min-h-screen bg-gray-50">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* HEADER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white">
          <div className="container mx-auto px-4 py-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
              <span>/</span>
              <span className="text-white">Search</span>
            </nav>

            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Search Articles
              </h1>
              <p className="text-white/80 text-lg mb-8">
                Find expert insights on real estate, market trends, legal guides, and more
              </p>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search for articles, topics, keywords..."
                  className="w-full pl-12 pr-12 py-4 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg text-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MAIN CONTENT */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ─────────────────────────────────────────────────────────────── */}
            {/* FILTERS SIDEBAR */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <aside className="lg:w-72 flex-shrink-0">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm mb-4"
              >
                <span className="flex items-center gap-2 font-medium text-gray-900">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    showFilters ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Filters Panel */}
              <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 lg:sticky lg:top-24">
                      {/* Filter Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          Filters
                        </h3>
                        {hasActiveFilters && (
                          <button
                            onClick={handleClearFilters}
                            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* Sort */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sort By
                        </label>
                        <select
                          value={selectedSort}
                          onChange={(e) => {
                            setSelectedSort(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        >
                          {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Category
  </label>
  <select
    value={selectedCategory}
    onChange={(e) => {
      setSelectedCategory(e.target.value);
      setCurrentPage(1);
    }}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
  >
    <option value="">All Categories</option>
    {CATEGORY_GROUPS.map((group) => (
      <optgroup key={group.label} label={group.label}>
        {group.categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
</div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date Range
                        </label>
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                            placeholder="From"
                          />
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                            placeholder="To"
                          />
                        </div>
                      </div>

                      {/* Popular Tags */}
                      {filterOptions.popularTags.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Popular Tags
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {filterOptions.popularTags.slice(0, 12).map((item) => (
                              <button
                                key={item.tag}
                                onClick={() => handleTagToggle(item.tag)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  selectedTags.includes(item.tag)
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                #{item.tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Tags */}
                      {selectedTags.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selected Tags
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium"
                              >
                                #{tag}
                                <button
                                  onClick={() => handleTagToggle(tag)}
                                  className="hover:text-cyan-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </aside>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* RESULTS */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <main className="flex-1">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  {isLoading ? (
                    <p className="text-gray-600">Searching...</p>
                  ) : (
                    <p className="text-gray-600">
                      {pagination.totalCount > 0 ? (
                        <>
                          Found{' '}
                          <span className="font-semibold text-gray-900">
                            {pagination.totalCount}
                          </span>{' '}
                          {pagination.totalCount === 1 ? 'article' : 'articles'}
                          {searchQuery && (
                            <>
                              {' '}
                              for{' '}
                              <span className="font-semibold text-gray-900">
                                "{searchQuery}"
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        'No articles found'
                      )}
                    </p>
                  )}
                </div>

                {/* Active Filters Summary (Mobile) */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 sm:hidden">
                    {selectedCategory && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {selectedCategory}
                      </span>
                    )}
                    {selectedTags.length > 0 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {selectedTags.length} tags
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  <span className="ml-3 text-gray-600">Searching articles...</span>
                </div>
              )}

              {/* Results Grid */}
              {!isLoading && results.length > 0 && (
                <div className="grid gap-6">
                  {results.map((article, index) => (
                    <SearchResultCard
                      key={article._id}
                      article={article}
                      index={index}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && results.length === 0 && (
                <EmptyState
                  searchQuery={searchQuery}
                  hasFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                />
              )}

              {/* Pagination */}
              {!isLoading && pagination.totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </main>
          </div>
        </section>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────

function SearchResultCard({
  article,
  index,
  searchQuery,
}: {
  article: SearchResult;
  index: number;
  searchQuery: string;
}) {
  // Highlight search terms in title
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="md:flex">
        {/* Image */}
        {article.image && (
          <div className="md:w-64 lg:w-72 flex-shrink-0 relative h-48 md:h-auto overflow-hidden bg-gray-100">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {article.featured && (
              <span className="absolute top-3 left-3 px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                Featured
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Category & Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Link
              href={`/blog/category/${article.category.toLowerCase().replace(/\s+/g, '-')}`}
              className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs font-semibold rounded hover:bg-cyan-100 transition-colors"
            >
              {article.category}
            </Link>
            {article.tags.slice(0, 2).map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xs text-gray-500 hover:text-cyan-600 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* Title */}
          <Link href={`/blog/${article.slug}`}>
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-cyan-600 transition-colors line-clamp-2">
              {highlightText(article.title, searchQuery)}
            </h2>
          </Link>

          {/* Excerpt */}
          <p className="text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <time dateTime={article.publishedAt || ''}>
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Draft'}
              </time>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{article.readTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{article.views.toLocaleString()} views</span>
            </div>
          </div>

          {/* Read More */}
          <Link
            href={`/blog/${article.slug}`}
            className="inline-flex items-center gap-1 mt-4 text-cyan-600 font-semibold hover:gap-2 transition-all"
          >
            Read Article
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  searchQuery,
  hasFilters,
  onClearFilters,
}: {
  searchQuery: string;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {searchQuery ? 'No matching articles' : 'No articles found'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {searchQuery
          ? `We couldn't find any articles matching "${searchQuery}". Try different keywords or remove some filters.`
          : hasFilters
          ? 'No articles match your current filters. Try adjusting or clearing them.'
          : 'Start by entering a search term or selecting filters.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Clear Filters
          </button>
        )}
        <Link
          href="/blog"
          className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
        >
          Browse All Articles
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {getVisiblePages().map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? 'bg-cyan-500 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  );
}
