'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AuthGateModal from '@/components/auth/AuthGateModal';
import { Star, MessageSquare, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import type { ProjectDetailData, ProjectReview } from '@/types/projectDetail';

interface Props {
  project: ProjectDetailData;
}

export default function ProjectReviewsSection({ project }: Props) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ProjectReview[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isWriting, setIsWriting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAuthGate, setShowAuthGate] = useState(false);

  const average = project.averageRating ?? 0;
  const total = project.totalReviews ?? 0;

  useEffect(() => {
    fetchReviews();
  }, [project._id]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/projects/${project._id}/reviews`);
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } catch (err) {
      console.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage('Please select a star rating.');
      return;
    }
    if (content.trim().length < 20) {
      setErrorMessage('Review must be at least 20 characters.');
      return;
    }

    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/projects/${project._id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, content }),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          setIsWriting(false);
          setRating(0);
          setContent('');
          setSubmitStatus('idle');
        }, 4000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage('Failed to connect to server. Try again.');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <section id="reviews" className="scroll-mt-24 max-w-[1120px] mx-auto px-4 sm:px-6 mt-8 lg:mt-16">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-[#029bba]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Community Reviews</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 font-black text-gray-900 text-sm">{average > 0 ? average.toFixed(1) : 'New'}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">({total} {total === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>
          </div>

          {!isWriting && (
            <button
              onClick={() => session ? setIsWriting(true) : setShowAuthGate(true)}
              className="px-5 py-2.5 bg-[#029bba] text-white text-sm font-bold rounded-xl hover:bg-[#004063] transition-colors shadow-sm"
            >
              {session ? 'Write a Review' : 'Log in to Review'}
            </button>
          )}
        </div>

        {/* Write Review Form Expansion */}
        {isWriting && (
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            {submitStatus === 'success' ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Thank you for your feedback!</h4>
                  <p className="text-sm mt-1 opacity-90">Your review has been submitted and is currently pending moderation. It will appear publicly once approved by our team.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                <h3 className="font-bold text-gray-900 mb-4">Share your experience</h3>
                
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Overall Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star className={`w-8 h-8 ${
                          (hoverRating || rating) >= star 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-200 fill-gray-100'
                        } transition-colors`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Review</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What do you think about this project? Discuss the location, builder, pricing, etc. (min 20 characters)"
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
                    maxLength={3000}
                  />
                  <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                    <span className={content.length > 0 && content.length < 20 ? 'text-red-500' : ''}>
                      {content.length < 20 ? `Min 20 characters (${20 - content.length} more)` : 'Length requirement met'}
                    </span>
                    <span>{content.length}/3000</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {errorMessage}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitStatus === 'loading'}
                    className="px-6 py-2 bg-[#004063] text-white text-sm font-bold rounded-xl hover:bg-[#029bba] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitStatus === 'loading' ? 'Submitting...' : 'Submit for Moderation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWriting(false)}
                    className="px-4 py-2 text-gray-500 text-sm font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Feed List */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-gray-100 rounded" />
                    <div className="w-full h-12 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-600">No public reviews yet</p>
              <p className="text-xs text-gray-400 mt-1">Be the first to share your experience regarding this project.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((rev) => (
                <div key={rev._id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 overflow-hidden">
                    {rev.userId?.image ? (
                      <img src={rev.userId.image} alt={rev.reviewerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-indigo-700 font-bold text-sm">
                        {(rev.reviewerName || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Review Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-sm">{rev.reviewerName || 'Verified User'}</h4>
                      <span className="text-xs text-gray-400">{formatDate(rev.createdAt)}</span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 mb-2 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= rev.rating ? 'fill-current' : 'text-gray-200 fill-gray-100'}`} />
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {rev.content}
                    </p>

                    {/* Developer Response (Rendered if exists in DB) */}
                    {rev.response && (
                      <div className="mt-3 ml-2 sm:ml-6 bg-[#029bba]/5 p-3 rounded-xl border border-[#029bba]/10 relative">
                        <div className="absolute -left-[11px] top-4 w-3 h-3 bg-white border-b border-l border-[#029bba]/10 rotate-45" />
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
                          <span className="text-xs font-bold text-[#004063]">
                            Response from {rev.response.respondedByName}
                          </span>
                        </div>
                        <p className="text-[13px] text-gray-700 leading-relaxed">
                          {rev.response.content}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-2 block">
                          {formatDate(rev.response.respondedAt)}
                        </span>
                      </div>
                    )}

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <AuthGateModal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        actionDescription="write a review"
        entityTitle={project.projectName}
        title="Share Your Experience"
      />
    </section>
  );
}