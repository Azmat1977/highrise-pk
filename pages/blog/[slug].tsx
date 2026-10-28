//C:\dev\highrise-pk\pages\blog\[slug].tsx
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Calendar,
  User,
  Clock,
  Eye,
  ArrowLeft,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Tag,
  Loader2,
  Sparkles,
  List,
  ChevronUp,
  Mail,
} from 'lucide-react';
// react-hot-toast removed in favor of design-system banner
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import SubscriptionModal from '@/components/ui/SubscriptionModal';

import { Card } from '@/components/ui/card';
import CommentSection from '@/components/blog/CommentSection';

interface BlogImage {
  url?: string;
  public_id?: string;
}

interface BlogAuthor {
  name?: string;
  image?: string;
  bio?: string;
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author?: string;
  authorName?: string;
  authorId?: BlogAuthor;
  publishedAt?: string | null;
  createdAt?: string;
  image?: BlogImage;
  readTime?: string;
  views?: number;
  featured?: boolean;
  tags?: string[];
  source?: 'manual' | 'ai_generated';
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  tableOfContents?: TOCItem[];
}

export default function BlogPostPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [seoSchema, setSeoSchema] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'already_subscribed'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const [activeHeading, setActiveHeading] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;

    const fetchBlog = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/blogs/${slug}`);
        const data = await response.json();

        if (data?.success && data?.blog) {
          setBlog(data.blog);
          setRelatedPosts(Array.isArray(data.relatedPosts) ? data.relatedPosts : []);
          setSeoSchema(data.seo || null);
        } else {
          setBanner({ message: 'Blog post not found', type: 'error' });
          router.push('/blog');
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
        setBanner({ message: 'Error loading blog post', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug, router]);

  useEffect(() => {
    if (!blog) return;

    const handleScroll = () => {
      const article = document.getElementById('blog-article-content');
      if (!article) return;

      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      const progress = ((scrollY - articleTop + 120) / articleHeight) * 100;
      const clamped = Math.max(0, Math.min(100, progress));

      setReadingProgress(clamped);
      setShowBackToTop(scrollY > 500);

      if (blog.tableOfContents?.length) {
        let currentId = '';
        for (const item of blog.tableOfContents) {
          const el = document.getElementById(item.id);
          if (el && el.offsetTop <= scrollY + 140) {
            currentId = item.id;
          }
        }
        setActiveHeading(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [blog]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = (platform: 'facebook' | 'twitter' | 'linkedin' | 'copy') => {
    if (typeof window === 'undefined' || !blog) return;

    const url = window.location.href;
    const title = blog.title || '';

    const shareUrls: Record<'facebook' | 'twitter' | 'linkedin', string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setBanner({ message: 'Link copied to clipboard!', type: 'success' });
      return;
    }

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
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
          source: 'blog_article',
          turnstileToken,
          website: honeypotWebsite,
        }),
      });

      const data = await response.json();

            if (data?.success) {
        setModalType('success');
        setModalMessage(data.message || 'Successfully subscribed! Please check your inbox for verification.');
        setShowModal(true);
      } else {
        const errorMsg = (data?.message || '').toLowerCase();
        
        // Detect "already subscribed" variations
        const isAlreadySubscribed = 
          errorMsg.includes('already') || 
          errorMsg.includes('subscribed') || 
          errorMsg.includes('registered') ||
          errorMsg.includes('exists') ||
          errorMsg.includes('in our system');
        
        if (isAlreadySubscribed) {
          setModalType('already_subscribed');
          setModalMessage(''); // Let modal use its default content
        } else {
          setModalType('error');
          setModalMessage(data?.message || 'Failed to subscribe. Please try again.');
        }
        setShowModal(true);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setModalType('error');
      setModalMessage('Something went wrong. Please try again later.');
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

  const displayAuthor = useMemo(() => {
    if (!blog) return 'Highrise Team';
    return blog.authorName || blog.author || 'Highrise Team';
  }, [blog]);

  const displayImage = useMemo(() => {
    return (
      blog?.image?.url ||
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
    );
  }, [blog]);

  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://highrise.pk/blog/${blog?.slug || ''}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
        <span className="ml-2 text-gray-600">Loading article...</span>
      </div>
    );
  }

  if (!blog) return null;

  return (
    <>
      <Head>
        <title>{blog.metaTitle || blog.title}</title>
        {/* RSS Feed Autodiscovery */}
  <link
    rel="alternate"
    type="application/rss+xml"
    title="Highrise.pk Blog RSS Feed"
    href="/api/blogs/rss"
  />
        <meta name="description" content={blog.metaDescription || blog.excerpt} />
        <link rel="canonical" href={blog.canonicalUrl || currentUrl} />

        <meta property="og:title" content={blog.metaTitle || blog.title} />
        <meta property="og:description" content={blog.metaDescription || blog.excerpt} />
        <meta property="og:image" content={blog.ogImage || displayImage} />
        <meta property="og:url" content={blog.canonicalUrl || currentUrl} />
        <meta property="og:type" content="article" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.metaTitle || blog.title} />
        <meta name="twitter:description" content={blog.metaDescription || blog.excerpt} />
        <meta name="twitter:image" content={blog.ogImage || displayImage} />

        {seoSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(seoSchema).replace(/</g, '\\u003c') }}
          />
        ) : null}
      </Head>

      {/* Branded Banner Notification */}
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

      {/* Reading progress */}
      <div className="fixed top-0 left-0 w-full h-1 bg-transparent z-50">
        <div
          className="h-full bg-[#029bba] transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className="min-h-screen bg-[#f8fafc]">
        {/* Hero */}
        <section className="relative bg-slate-950 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#06b6d4,_transparent_25%),radial-gradient(circle_at_bottom_left,_#0ea5e9,_transparent_20%)]" />
          <div className="relative">
            <div className="h-[58vh] min-h-[500px] md:min-h-[560px]">
              <img
                src={displayImage}
                alt={blog.title}
                className="w-full h-full object-cover object-center opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent" />
            </div>

            <div className="absolute inset-0 flex items-center md:items-end">
              <div className="container mx-auto px-4 pt-24 md:pt-28 pb-12 md:pb-16">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="max-w-4xl relative z-10"
                >
                  <Link
                    href="/blog"
                    className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Blog
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="px-3 py-1 rounded-full bg-[#029bba] text-white text-sm font-semibold">
                      {blog.category}
                    </span>

                    {blog.featured ? (
                      <span className="px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Featured
                      </span>
                    ) : null}

                    {blog.source === 'ai_generated' ? (
                      <span className="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">
                        AI Generated
                      </span>
                    ) : null}
                  </div>

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5">
                    {blog.title}
                  </h1>

                  <p className="text-lg md:text-xl text-white/80 max-w-3xl mb-6 leading-relaxed">
                    {blog.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm md:text-base">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {displayAuthor}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(blog.publishedAt || blog.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {blog.readTime || '5 min read'}
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      {blog.views || 0} views
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Sticky left share rail */}
            <div className="hidden xl:flex xl:col-span-1">
              <div className="sticky top-28 flex flex-col gap-3 h-fit">
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#1877f2] hover:bg-[#1877f2] hover:text-white transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#1da1f2] hover:bg-[#1da1f2] hover:text-white transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-900 hover:text-white transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Article */}
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:col-span-8 xl:col-span-7"
            >
              <Card className="p-6 md:p-10 border-gray-200 shadow-sm">
                <div
                  id="blog-article-content"
                  className="prose prose-lg md:prose-xl max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-[#029bba] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-md"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {blog.tags && blog.tags.length > 0 ? (
                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-5 h-5 text-gray-400 mr-1" />
                      {blog.tags.map((tag) => (
  <Link
    key={tag}
    href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-[#029bba] hover:text-white transition-all duration-200"
  >
    #{tag}
  </Link>
))}
                    </div>
                  </div>
                ) : null}

                {/* Author box */}
                <div className="mt-12 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                      {blog.authorId?.image ? (
                        <img
                          src={blog.authorId.image}
                          alt={displayAuthor}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#029bba] mb-1">
                        About the author
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {displayAuthor}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {blog.authorId?.bio ||
                          'Highrise.pk editorial team member covering Pakistan real estate, market trends, legal updates, and practical property guidance.'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Comments */}
              <div className="mt-10">
                <CommentSection blogSlug={blog.slug} blogId={blog._id} />
              </div>
            </motion.article>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="lg:col-span-4"
            >
              <div className="sticky top-24 space-y-6">
                {/* TOC */}
                {blog.tableOfContents && blog.tableOfContents.length > 0 ? (
                  <Card className="p-6 border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <List className="w-4 h-4 mr-2 text-[#029bba]" />
                      In this article
                    </h3>
                    <nav className="space-y-3">
                      {blog.tableOfContents.map((toc) => (
                        <a
                          key={toc.id}
                          href={`#${toc.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document
                              .getElementById(toc.id)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`block text-sm transition-colors ${
                            activeHeading === toc.id
                              ? 'text-[#029bba] font-semibold'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                          style={{
                            paddingLeft: `${Math.max(0, toc.level - 2) * 14}px`,
                          }}
                        >
                          {toc.title}
                        </a>
                      ))}
                    </nav>
                  </Card>
                ) : null}

                {/* Reading Stats */}
                <Card className="p-6 border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4">Reading Stats</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Reading progress</span>
                      <span className="font-semibold text-gray-900">
                        {Math.round(readingProgress)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#029bba] transition-all duration-200"
                        style={{ width: `${readingProgress}%` }}
                      />
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Read time</p>
                        <p className="font-semibold text-gray-900">
                          {blog.readTime || '5 min read'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">Views</p>
                        <p className="font-semibold text-gray-900">
                          {blog.views || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Newsletter */}
                <Card className="p-0 bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950 text-white border-none overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#06b6d4,_transparent_30%),radial-gradient(circle_at_bottom_left,_#0ea5e9,_transparent_25%)]" />
                  <div className="relative z-10 p-7">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-5 shadow-lg">
                      <Mail className="w-7 h-7 text-white" />
                    </div>

                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-semibold mb-3">
                      Newsletter
                    </p>

                    <h3 className="text-xl font-bold mb-2 leading-tight">
                      Stay ahead of the market
                    </h3>

                    <p className="text-white/75 text-sm mb-6 leading-7">
                      Weekly real estate insights, legal updates, market trends, and
                      practical investment guidance for Pakistan.
                    </p>

                    <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/15 shadow-sm"
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
                        className="w-full py-3.5 rounded-2xl font-semibold bg-[#029bba] hover:bg-[#027a94] transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subscribing...
                          </>
                        ) : (
                          'Subscribe'
                        )}
                      </button>
                    </form>

                    <p className="text-white/45 text-xs leading-6 mt-4">
                      Protected by Turnstile. No spam. Unsubscribe anytime.
                    </p>
                  </div>
                </Card>

                {/* Related Posts */}
                {relatedPosts.length > 0 ? (
                  <Card className="p-6 border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-5">Related Articles</h3>
                    <div className="space-y-4">
                      {relatedPosts.map((post) => (
                        <Link
                          key={post._id}
                          href={`/blog/${post.slug}`}
                          className="block group"
                        >
                          <div className="flex gap-3">
                            <img
                              src={
                                post.image?.url ||
                                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'
                              }
                              alt={post.title}
                              className="w-20 h-16 rounded-xl object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase tracking-wide font-semibold text-[#029bba] mb-1">
                                {post.category}
                              </p>
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#029bba] transition-colors">
                                {post.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-2">
                                {post.readTime || '5 min read'}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </Card>
                ) : null}
              </div>
            </motion.aside>
          </div>
        </section>

        {/* Back to top */}
        {showBackToTop ? (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg bg-[#029bba] text-white flex items-center justify-center hover:bg-[#027a94] transition-colors z-40"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {/* Newsletter Subscription Modal */}
      <SubscriptionModal
        isOpen={showModal}
        onClose={handleModalClose}
        email={newsletterEmail}
        type={modalType}
        message={modalMessage}
      />
    </>
  );
}