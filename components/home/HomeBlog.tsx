import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, Calendar, ArrowRight, Loader2 } from 'lucide-react';

interface BlogItem {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  image?: { url: string };
}

export default function HomeBlog({ blogs, loading }: { blogs: BlogItem[]; loading: boolean }) {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-bold tracking-wide mb-4">
            <Newspaper className="w-4 h-4" /> Real Estate Insights
          </span>
          {/* Standardized Heading */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#001f2b] mb-4 tracking-tight">
            <span className="text-[#029bba]">Latest</span> from Our Blog
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Stay updated with expert analysis, market trends, and property guides.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : blogs.length > 0 ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link key={blog._id} href={`/blog/${blog.slug || blog._id || '#'}`}>
                  <div className="overflow-hidden bg-white border border-gray-100 hover:border-[#029bba]/30 rounded-3xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl flex flex-col h-full">
                    <div className="h-52 overflow-hidden relative">
                      <Image
                        src={blog.image?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'}
                        alt={blog.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-[#029bba] text-xs font-bold rounded-lg shadow-sm">
                          {blog.category || 'Insights'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-[#001f2b] mb-3 line-clamp-2 group-hover:text-[#029bba] transition-colors leading-tight">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">{blog.excerpt}</p>
                      <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <Calendar className="w-4 h-4" />
                          {new Date(blog.publishedAt || blog.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-[#029bba] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/blog">
                <button className="px-8 py-4 rounded-xl bg-white border-2 border-[#029bba] text-[#029bba] font-bold inline-flex items-center gap-2 hover:bg-[#029bba] hover:text-white transition-all shadow-sm hover:shadow-lg">
                  View All Articles <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-3xl">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#001f2b] mb-2">No Blog Posts Yet</h3>
          </div>
        )}
      </div>
    </section>
  );
}