// pages/admin/reviews/index.tsx

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout'; // Verify path
import AdminGuard from '@/components/AdminGuard';
import { api } from '@/lib/apiClient';
import {
  Star,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  User,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('all');

  // Load Reviews
  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Note: Hamein admin ke liye "All Reviews" chahiye. 
      // Filhal hamari public API entityId mangti hai. 
      // Admin specific endpoint ke liye hum query params adjust kar sakte hain 
      // ya API mein thoda tweak chahiye hoga agar "List All" karna hai bina entityId ke.
      // 
      // FOR NOW: Hum API ko thoda update karenge taake bina entityId ke bhi sab reviews la sake (admin only).
      // Lekin abhi ke liye maan lete hain API support karti hai ya hum specific entity load kar rahe hain.
      // 
      // Temporary fix: Agar API "List All" support nahi karti, to humein API mein change karna padega.
      // Chalein pehle UI banate hain, phir API tweak dekh lenge.
      
      const res = await api.get(`/api/reviews?limit=50`); // Assuming API returns recent reviews if no ID
      if (res.success) {
        setReviews(res.data || []);
      }
    } catch (error) {
      console.error(error);
      // toast.error('Failed to load reviews'); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetchReviews(); 
    // API abhi entityId mangti hai required. 
    // Is liye abhi dummy empty state dikhega jab tak hum "Create" flow na bana lein.
    setLoading(false);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await api.patch(`/api/reviews/${id}`, { isDeleted: true });
      if (res.success) {
        setBanner({ message: 'Review deleted', type: 'success' });
        setReviews(reviews.filter((r) => r._id !== id));
      }
    } catch (error) {
      setBanner({ message: 'Failed to delete review', type: 'error' });
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <Head>
          <title>Manage Reviews | Highrise Admin</title>
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

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
              <p className="text-gray-500">Curate and manage verified reviews</p>
            </div>
            <Link href="/admin/reviews/create">
              <Button className="bg-[#029bba] hover:bg-[#027a94] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Write Review
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#029bba]"
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg bg-white"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="agent">Agents</option>
                <option value="developer">Developers</option>
                <option value="property">Properties</option>
              </select>
            </div>
          </Card>

          {/* Reviews Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#029bba]" />
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Star className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No reviews found</p>
                        <p className="text-sm">Start by writing a curated review.</p>
                      </td>
                    </tr>
                  ) : (
                    reviews.map((review) => (
                      <tr key={review._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {review.entityType === 'agent' ? <User className="w-4 h-4" /> :
                               review.entityType === 'developer' ? <Building2 className="w-4 h-4" /> :
                               <Home className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{review.entitySnapshot?.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{review.entityType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-500">
                            <span className="font-bold text-gray-900">{review.rating}</span>
                            <Star className="w-4 h-4 fill-current" />
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{review.title}</p>
                          <p className="text-sm text-gray-500 truncate">{review.content}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            review.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {review.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                            onClick={() => handleDelete(review._id)}
                            className="text-gray-400 hover:text-red-600 p-2"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
