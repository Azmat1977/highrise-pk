import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Calendar, Clock, ArrowRight, TrendingUp, Hash } from 'lucide-react';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';
import type { IBlog } from '@/models/Blog';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface TagArchiveProps {
  tag: string;
  articles: Array<{
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    featuredImage?: string;
    author: {
      name: string;
      avatar?: string;
    };
    publishedAt: string;
    readTime: number;
    category: string;
    tags: string[];
  }>;
  totalCount: number;
  relatedTags: Array<{
    tag: string;
    count: number;
  }>;
  page: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TagArchivePage({
  tag,
  articles,
  totalCount,
  relatedTags,
  page,
  totalPages,
}: TagArchiveProps) {
  const [currentPage, setCurrentPage] = useState(page);

  // Format tag for display
  const displayTag = tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // ─────────────────────────────────────────────────────────────────────────────
  // SEO META
  // ─────────────────────────────────────────────────────────────────────────────

  const pageTitle = `${displayTag} - Articles & Insights | Highrise.pk`;
  const pageDescription = `Explore ${totalCount} expert articles about ${displayTag.toLowerCase()} in Pakistan's real estate market. Industry insights, guides, and trends.`;
  const canonicalUrl = `https://highrise.pk/blog/tag/${tag}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${displayTag} Articles`,
    description: pageDescription,
    url: canonicalUrl,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://highrise.pk',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: 'https://highrise.pk/blog',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: displayTag,
          item: canonicalUrl,
        },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: totalCount,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://highrise.pk/blog/${article.slug}`,
        name: article.title,
      })),
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Highrise.pk" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* BREADCRUMBS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-primary transition-colors">
                Blog
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{displayTag}</span>
            </nav>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAG HERO SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Hash className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">TAG</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {displayTag}
              </h1>

              <p className="text-lg text-gray-600 mb-6">
                {totalCount} {totalCount === 1 ? 'article' : 'articles'} exploring{' '}
                {displayTag.toLowerCase()} in Pakistan's real estate market
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>{totalCount} Articles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>{relatedTags.length} Related Tags</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MAIN CONTENT GRID */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Articles */}
            <div className="lg:col-span-2">
              {articles.length === 0 ? (
                <EmptyState tag={displayTag} />
              ) : (
                <>
                  <div className="grid gap-6 mb-8">
                    {articles.map((article, index) => (
                      <ArticleCard key={article._id} article={article} index={index} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      tag={tag}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </>
              )}
            </div>

            {/* Right: Sidebar */}
            <aside className="space-y-8">
              {/* Related Tags */}
              {relatedTags.length > 0 && (
                <RelatedTagsWidget tags={relatedTags} currentTag={tag} />
              )}

              {/* Newsletter CTA */}
              <NewsletterWidget />
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  index,
}: {
  article: TagArchiveProps['articles'][0];
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="md:flex">
        {/* Image */}
        {article.featuredImage && (
          <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-gray-100">
            <Image
              src={article.featuredImage}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Content */}
        <div className={`p-6 ${article.featuredImage ? 'md:w-2/3' : 'w-full'}`}>
          {/* Category */}
          <Link
            href={`/blog/category/${article.category.toLowerCase().replace(/\s+/g, '-')}`}
            className="inline-block text-xs font-semibold text-primary uppercase tracking-wider mb-2 hover:underline"
          >
            {article.category}
          </Link>

          {/* Title */}
          <Link href={`/blog/${article.slug}`}>
            <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h2>
          </Link>

          {/* Excerpt */}
          <p className="text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>

          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <time dateTime={article.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{article.readTime} min read</span>
              </div>
            </div>

            <Link
              href={`/blog/${article.slug}`}
              className="flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all"
              aria-label={`Read ${article.title}`}
            >
              Read More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATED TAGS WIDGET
// ─────────────────────────────────────────────────────────────────────────────

function RelatedTagsWidget({
  tags,
  currentTag,
}: {
  tags: TagArchiveProps['relatedTags'];
  currentTag: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5 text-primary" />
        Related Topics
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 10).map((item) => (
          <Link
            key={item.tag}
            href={`/blog/tag/${item.tag}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              item.tag === currentTag
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-primary hover:text-white'
            }`}
          >
            #{item.tag.replace(/-/g, ' ')} ({item.count})
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEWSLETTER WIDGET
// ─────────────────────────────────────────────────────────────────────────────

function NewsletterWidget() {
  return (
    <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white">
      <h3 className="text-xl font-bold mb-2">Stay Updated</h3>
      <p className="text-sm text-white/90 mb-4">
        Get the latest real estate insights delivered to your inbox
      </p>
      <Link
        href="/newsletter"
        className="block w-full bg-white text-primary text-center font-semibold py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Subscribe Now
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  tag,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  tag: string;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2"
    >
      {pages.map((page) => (
        <Link
          key={page}
          href={`/blog/tag/${tag}?page=${page}`}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            page === currentPage
              ? 'bg-primary text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ tag }: { tag: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Articles Yet</h3>
      <p className="text-gray-600 mb-6">
        We haven't published any articles about "{tag}" yet. Check back soon!
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        Browse All Articles
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET STATIC PATHS
// ─────────────────────────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    await dbConnect();

    // Get all unique tags from published blogs
     const tags: Array<{ _id: string }> = await Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags' } },
      { $limit: 50 }, // Pre-generate top 50 tags
    ]).exec();

    const paths = tags.map((item: any) => ({
      params: { tag: item._id.toLowerCase().replace(/\s+/g, '-') },
    }));

    return {
      paths,
      fallback: 'blocking', // ISR for new tags
    };
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STATIC PROPS
// ─────────────────────────────────────────────────────────────────────────────

export const getStaticProps: GetStaticProps<TagArchiveProps> = async ({
  params,
}) => {
  try {
    const tag = params?.tag as string;
    const page = 1;
    const limit = 12;

    await dbConnect();

    // Build tag regex (handle both slug format and original)
    const tagRegex = new RegExp(
      `^${tag.replace(/-/g, '[\\s-]')}$`,
      'i'
    );

        // Fetch articles with this tag
    const articles = await Blog.find({
      status: 'published',
      publishedAt: { $lte: new Date() },
      tags: tagRegex,
    })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        'title slug excerpt image authorName authorAvatar publishedAt readTime category tags'
      )
      .maxTimeMS(10000)
      .lean();

    const totalCount = await Blog.countDocuments({
      status: 'published',
      publishedAt: { $lte: new Date() },
      tags: tagRegex,
    }).maxTimeMS(5000);

     // Get related tags
    const relatedTagsAgg: Array<{ _id: string; count: number }> = await Blog.aggregate([
      {
        $match: {
          status: 'published',
          publishedAt: { $lte: new Date() },
          tags: tagRegex,
        },
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $not: tagRegex } } }, // Exclude current tag
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]).exec();

    const relatedTags = relatedTagsAgg.map((item: any) => ({
      tag: item._id.toLowerCase().replace(/\s+/g, '-'),
      count: item.count,
    }));

    // Format articles
    const formattedArticles = articles.map((article: any) => ({
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
       featuredImage: article.image?.url || null,
       author: {
        name: article.authorName || 'Highrise Team',
        avatar: article.authorAvatar || null,
      },
      publishedAt: article.publishedAt.toISOString(),
      readTime: article.readTime || 5,
      category: article.category || 'General',
      tags: article.tags || [],
    }));

    return {
      props: {
        tag,
        articles: formattedArticles,
        totalCount,
        relatedTags,
        page,
        totalPages: Math.ceil(totalCount / limit),
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      notFound: true,
    };
  }
};