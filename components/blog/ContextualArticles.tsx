import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Newspaper } from 'lucide-react';

interface ContextualArticle {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string | null;
  image: string | null;
  readTime: string;
}

interface ContextualArticlesProps {
  title: string;
  description: string;
  tags: string[];
}

function formatPublishedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function ContextualArticles({
  title,
  description,
  tags,
}: ContextualArticlesProps): React.ReactElement | null {
  const [articles, setArticles] = useState<ContextualArticle[]>([]);
  const tagQuery = tags.join(',');

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      tags: tagQuery,
      sort: 'newest',
      limit: '4',
    });

    void fetch(`/api/blogs/search?${query.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        const results = Array.isArray(data?.results) ? data.results : [];
        setArticles(results.filter((article: ContextualArticle) => article.slug && article.title));
      })
      .catch(() => {
        if (!controller.signal.aborted) setArticles([]);
      });

    return () => controller.abort();
  }, [tagQuery]);

  if (articles.length === 0) return null;

  const allArticlesHref = `/blog/search?${new URLSearchParams({ tags: tagQuery }).toString()}`;

  return (
    <section aria-labelledby="contextual-articles-heading" className="border-t border-gray-200 pt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]">
            <Newspaper className="h-3.5 w-3.5" />
            HIGHRISE GUIDES
          </p>
          <h2 id="contextual-articles-heading" className="text-xl font-black leading-tight text-[#004063] md:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <Link
          href={allArticlesHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#029bba] hover:text-[#004063]"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => {
          const publishedDate = formatPublishedDate(article.publishedAt);
          return (
            <article key={article._id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#029bba]/40 hover:shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase text-[#029bba]">{article.category}</p>
              <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#004063]">
                <Link href={`/blog/${encodeURIComponent(article.slug)}`} className="hover:text-[#029bba]">
                  {article.title}
                </Link>
              </h3>
              {article.excerpt && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">{article.excerpt}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-gray-500">
                {publishedDate && <time dateTime={article.publishedAt || undefined}>{publishedDate}</time>}
                {article.readTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
