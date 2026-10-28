// pages/admin/reviews/create.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/AdminGuard';
import { api } from '@/lib/apiClient';
import {
  ArrowLeft,
  Star,
  Search,
  Loader2,
  CheckCircle,
  Building2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CreateReviewPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Select Entity, 2: Write Review
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [submitting, setSubmitting] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  // Supported types in UI
  const [entityType, setEntityType] = useState<string>('agent');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Selected Entity
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // Review Form State
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);

  // Search Logic
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      // Search agents or developers
      const endpoint = entityType === 'agent' ? '/api/agents' : '/api/developers';
      // Note: Assuming these APIs support ?search= param. 
      // If not, we might need adjustments. 
      // Using generic search for now.
      const res = await api.get(`${endpoint}?search=${searchTerm}&limit=10`);

      if (res.success) {
        setSearchResults(res.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setBanner({ message: 'Search failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !content) {
      setBanner({ message: 'Please fill all required fields', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        entityType,
        entityId: selectedEntity._id,
        rating,
        title,
        content,
        pros: pros.filter(p => p.trim()),
        cons: cons.filter(c => c.trim()),
        entitySnapshot: {
          name: selectedEntity.name || selectedEntity.companyName || selectedEntity.displayName,
          slug: selectedEntity.slug,
          city: selectedEntity.city,
          imageUrl: selectedEntity.profilePicture || selectedEntity.logo,
        }
      };

      const res = await api.post('/api/reviews', payload);

      if (res.success) {
        setBanner({ message: 'Review published successfully!', type: 'success' });
        router.push('/admin/reviews');
      } else {
        setBanner({ message: res.message || 'Failed to publish review', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setBanner({ message: 'Something went wrong', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const addPro = () => setPros([...pros, '']);
  const addCon = () => setCons([...cons, '']);

  const updatePro = (index: number, val: string) => {
    const newPros = [...pros];
    newPros[index] = val;
    setPros(newPros);
  };

  const updateCon = (index: number, val: string) => {
    const newCons = [...cons];
    newCons[index] = val;
    setCons(newCons);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <Head>
          <title>Write Review | Highrise Admin</title>
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

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => step === 2 ? setStep(1) : router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Select Entity to Review' : 'Write Curated Review'}
            </h1>
          </div>

          {/* STEP 1: SELECT ENTITY */}
          {step === 1 && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                {['agent', 'developer', 'contractor', 'architect', 'vendor'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { setEntityType(type); setSearchResults([]); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                      entityType === type ? 'bg-white shadow text-[#029bba]' : 'text-gray-500'
                    }`}
                  >
                    {type}s
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Search ${entityType} name...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#029bba]"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading} className="h-[46px] px-6">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {searchResults.length > 0 && (
                  <p className="text-sm text-gray-500 font-medium">Select one to proceed:</p>
                )}
                {searchResults.map((item) => (
                  <div 
                    key={item._id}
                    onClick={() => {
                      setSelectedEntity(item);
                      setStep(2);
                    }}
                    className="flex items-center gap-4 p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {item.profilePicture || item.logo ? (
                        <img src={item.profilePicture || item.logo} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        entityType === 'agent' ? <User className="w-6 h-6 text-gray-500" /> : <Building2 className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#029bba]">
                        {item.name || item.companyName || item.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{item.city} • {item.email}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-gray-300 group-hover:bg-[#029bba] group-hover:border-[#029bba] flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                
                {!loading && searchResults.length === 0 && searchTerm && (
                  <p className="text-center text-gray-500 py-8">No results found.</p>
                )}
              </div>
            </Card>
          )}

          {/* STEP 2: WRITE REVIEW */}
          {step === 2 && selectedEntity && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected Entity Summary */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                 <div className="w-12 h-12 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img 
                      src={selectedEntity.profilePicture || selectedEntity.logo || '/placeholder.png'} 
                      className="w-full h-full object-cover" 
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/50')}
                    />
                 </div>
                 <div>
                    <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">Reviewing</p>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {selectedEntity.name || selectedEntity.companyName || selectedEntity.displayName}
                    </h3>
                 </div>
                 <Button 
                   type="button" 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setStep(1)}
                   className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                 >
                   Change
                 </Button>
              </div>

              <Card className="p-6 space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-lg font-bold text-gray-700">{rating}.0</span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review Headline</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Professional and reliable service"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#029bba]"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review Content</label>
                  <textarea
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your detailed review here..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#029bba]"
                  />
                </div>

                {/* Pros */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pros (What you liked)</label>
                  <div className="space-y-2">
                    {pros.map((pro, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={pro}
                        onChange={(e) => updatePro(idx, e.target.value)}
                        placeholder="+ Add a pro point"
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-green-50 border-green-200 focus:ring-green-500"
                      />
                    ))}
                    <button type="button" onClick={addPro} className="text-sm text-[#029bba] font-medium hover:underline">
                      + Add another pro
                    </button>
                  </div>
                </div>

                {/* Cons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cons (Areas for improvement)</label>
                  <div className="space-y-2">
                    {cons.map((con, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={con}
                        onChange={(e) => updateCon(idx, e.target.value)}
                        placeholder="- Add a con point"
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-red-50 border-red-200 focus:ring-red-500"
                      />
                    ))}
                    <button type="button" onClick={addCon} className="text-sm text-red-500 font-medium hover:underline">
                      + Add another con
                    </button>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/admin/reviews')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-[#029bba] hover:bg-[#027a94] text-white min-w-[140px]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Publish Review'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
