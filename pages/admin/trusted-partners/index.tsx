import React, { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import {
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import TrustedPartnerForm from '@/components/admin/TrustedPartnerForm';

interface TrustedPartner {
  _id: string;
  companyName: string;
  logo: { url: string; publicId: string };
  website?: string;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export default function AdminTrustedPartners() {
  const router = useRouter();
  const [partners, setPartners] = useState<TrustedPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<TrustedPartner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchPartners();
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/admin/trusted-partners');
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, permanent: boolean = false) => {
    if (!confirm(permanent ? 'Permanently delete? This cannot be undone.' : 'Soft delete? Can be restored later.')) {
      return;
    }

    try {
      const res = await fetch(`/api/trusted-partners/${id}?permanent=${permanent}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchPartners();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/trusted-partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPartners();
      }
    } catch (error) {
      console.error('Error restoring partner:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/trusted-partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPartners();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const filteredPartners = partners.filter((p) => {
    const matchesSearch = p.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && p.isActive && !p.isDeleted) ||
      (filter === 'inactive' && !p.isActive && !p.isDeleted) ||
      (filter === 'deleted' && p.isDeleted);
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <Head>
        <title>Trusted Partners - Admin | Highrise.pk</title>
      </Head>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trusted Partners</h1>
            <p className="text-gray-600 mt-1">Manage developer & builder logos for homepage</p>
          </div>
          <button
            onClick={() => {
              setEditingPartner(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-[#029bba] text-white rounded-lg hover:bg-[#027a94] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba]"
          >
            <option value="all">All ({partners.length})</option>
            <option value="active">Active ({partners.filter(p => p.isActive && !p.isDeleted).length})</option>
            <option value="inactive">Inactive ({partners.filter(p => !p.isActive && !p.isDeleted).length})</option>
            <option value="deleted">Deleted ({partners.filter(p => p.isDeleted).length})</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Logo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Added</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPartners.map((partner) => (
                  <tr key={partner._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Image
                        src={partner.logo.url}
                        alt={partner.companyName}
                        width={80}
                        height={40}
                        className="object-contain"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{partner.companyName}</p>
                        {partner.website && (
                          <a href={partner.website} target="_blank" className="text-xs text-[#029bba] hover:underline">
                            {partner.website}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{partner.displayOrder}</td>
                    <td className="px-6 py-4">
                      {partner.isDeleted ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Deleted</span>
                      ) : partner.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(partner.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!partner.isDeleted && (
                          <>
                            <button
                              onClick={() => handleToggleActive(partner._id, partner.isActive)}
                              className="p-2 text-gray-600 hover:text-[#029bba]"
                              title={partner.isActive ? 'Hide from homepage' : 'Show on homepage'}
                            >
                              {partner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingPartner(partner);
                                setShowForm(true);
                              }}
                              className="p-2 text-gray-600 hover:text-[#029bba]"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {partner.isDeleted ? (
                          <button
                            onClick={() => handleRestore(partner._id)}
                            className="p-2 text-green-600 hover:text-green-800"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(partner._id, false)}
                            className="p-2 text-red-600 hover:text-red-800"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(partner._id, true)}
                          className="p-2 text-red-800 hover:text-red-900"
                          title="Permanent Delete"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPartners.length === 0 && (
              <div className="text-center py-20 text-gray-500">No partners found</div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TrustedPartnerForm
          partner={editingPartner}
          onClose={() => {
            setShowForm(false);
            setEditingPartner(null);
            fetchPartners();
          }}
        />
      )}
    </AdminLayout>
  );
}
