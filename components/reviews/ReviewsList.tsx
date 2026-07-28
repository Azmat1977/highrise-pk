// components/reviews/ReviewsList.tsx

import React, { useEffect, useState } from 'react';
import { Star, CheckCircle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { api } from '@/lib/apiClient';

interface ReviewsListProps {
  entityType: 'agent' | 'developer' | 'project' | 'property';
  entityId: string;
}

export default function ReviewsList({ entityType, entityId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    
    const loadReviews = async () => {
      try {
        const res = await api.get(`/api/reviews?entityType=${entityType}&entityId=${entityId}&limit=5`);
        if (res.success) {
          setReviews(res.data || []);
          setStats(res.meta || null);
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [entityType, entityId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return null; // Don't show section if no reviews
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="text-center px-4 border-r border-gray-200">
          <div className="text-4xl font-bold text-gray-900">{stats?.averageRating || 0}</div>
          <div className="flex justify-center my-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(stats?.averageRating || 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500">{stats?.reviewCount || 0} Verified Reviews</div>
        </div>
        
        <div className="flex-1 px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#029bba] text-white p-1 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Highrise Verified</h3>
              <p className="text-xs text-gray-500">All reviews are manually verified by our team.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review._id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#029bba] to-[#017a8a] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  HT
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Highrise Team</h4>
                  <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <h3 className="font-bold text-gray-900 mb-2">{review.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{review.content}</p>

            {/* Pros & Cons */}
            {(review.pros?.length > 0 || review.cons?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-xl text-sm">
                {review.pros?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4" /> Pros
                    </h5>
                    <ul className="space-y-1">
                      {review.pros.map((pro: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-gray-700">
                          <span className="text-green-500">•</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {review.cons?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4" /> Cons
                    </h5>
                    <ul className="space-y-1">
                      {review.cons.map((con: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-gray-700">
                          <span className="text-red-500">•</span> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Admin Response (Optional Future) */}
             {review.response && (
               <div className="mt-4 pl-4 border-l-2 border-[#029bba] bg-blue-50/50 p-3 rounded-r-lg">
                 <p className="text-xs font-bold text-[#029bba] mb-1 flex items-center gap-1">
                   <MessageSquare className="w-3 h-3" /> Response from Owner
                 </p>
                 <p className="text-xs text-gray-700">{review.response.content}</p>
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
