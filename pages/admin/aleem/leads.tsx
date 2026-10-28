// pages/admin/aleem/leads.tsx
// Highrise.pk — Aleem-Only Leads (admin)
// V6.4.1 — Filtered view of source='direct' leads with temperature colors

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Users,
  Phone,
  Mail,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bot,
  Flame,
  ExternalLink,
  Eye,
  MessageCircle,
  RefreshCw,
  Filter,
  Calendar,
} from 'lucide-react';

interface AleemLead {
  _id:        string;
  name:       string;
  phone:      string;
  email:      string;
  message?:   string;
  leadType:   string;
  status:     string;
  priority:   string;
  temperature: string;
  source:     string;
  leadScore:  number;
  conversationId?: string;
  sessionId?: string;
  budget?: { tier?: string };
  createdAt:  string;
}

interface Pagination {
  page: number; limit: number; total: number; pages: number;
}

const TEMPERATURE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  burning: { label: 'BURNING', bg: 'bg-[#ef4444]',  text: 'text-white',         icon: '🔥' },
  hot:     { label: 'HOT',     bg: 'bg-[#f97316]',  text: 'text-white',         icon: '🔥' },
  warm:    { label: 'WARM',    bg: 'bg-[#f59e0b]',  text: 'text-white',         icon: '🌡️' },
  cold:    { label: 'COLD',    bg: 'bg-[#6b7280]',  text: 'text-white',         icon: '❄️' },
};

const STATUS_COLORS: Record<string, string> = {
  new:        '#3b82f6',
  contacted:  '#7c3aed',
  qualified:  '#f97316',
  won:        '#10b981',
  lost:       '#ef4444',
};

export default function AleemLeadsPage(): React.ReactElement {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [leads, setLeads] = useState<AleemLead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, pages: 0,
  });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  // Filters
  const [temperature, setTemperature] = useState('');
  const [status, setStatus]           = useState('');
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Read query param on mount (e.g., ?temperature=burning,hot)
  useEffect(() => {
    if (router.query.temperature && typeof router.query.temperature === 'string') {
      setTemperature(router.query.temperature);
    }
  }, [router.query]);

  // Auth guard
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/aleem/leads');
    }
  }, [sessionStatus, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch leads (using existing /api/leads endpoint, filtered to source=direct)
  const fetchLeads = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page:  String(pagination.page),
        limit: String(pagination.limit),
        source: 'direct',  // Aleem source filter
      });
      if (status)     params.append('status', status);
      if (debouncedSearch) params.append('search', debouncedSearch);

      // Try /api/leads first (existing endpoint)
      const res = await fetch(`/api/leads?${params}`, {
        credentials: 'include', // ✅ Required: sends session cookie to getServerSession()
      });
      const data = await res.json() as {
        success: boolean;
        data?: AleemLead[];
        pagination?: Pagination;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to load leads');
        return;
      }

      let filteredLeads = data.data ?? [];

      // Apply temperature filter (client-side since API may not support it)
      if (temperature) {
        const temps = temperature.split(',');
        filteredLeads = filteredLeads.filter(l => temps.includes(l.temperature));
      }

      setLeads(filteredLeads);
      if (data.pagination) setPagination(data.pagination);

    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, status, debouncedSearch, temperature]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  if (sessionStatus === 'loading') {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#029bba]" /></div></AdminLayout>;
  }

  const hotCount     = leads.filter(l => l.temperature === 'hot').length;
  const burningCount = leads.filter(l => l.temperature === 'burning').length;

  return (
    <AdminLayout>
      <Head><title>Aleem Leads | Highrise Admin</title></Head>

      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Aleem Leads
            </h1>
            <p className="text-gray-500 mt-1">All leads captured by Aleem AI assistant</p>
          </div>
          <button
            onClick={() => fetchLeads(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Priority Alert */}
        {burningCount + hotCount > 0 && (
          <div className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg">{burningCount + hotCount} Priority Leads on This Page</h3>
                <p className="text-sm text-white/90">{burningCount} burning + {hotCount} hot — contact within 1 hour</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba]"
              />
            </div>

            {/* Temperature filter */}
            <select
              value={temperature}
              onChange={(e) => { setTemperature(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">All Temperatures</option>
              <option value="burning">🔥 Burning Only</option>
              <option value="hot">🔥 Hot Only</option>
              <option value="burning,hot">🔥 Burning + Hot</option>
              <option value="warm">🌡️ Warm Only</option>
              <option value="cold">❄️ Cold Only</option>
            </select>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="new">🆕 New</option>
              <option value="contacted">📞 Contacted</option>
              <option value="qualified">✅ Qualified</option>
              <option value="won">🏆 Won</option>
              <option value="lost">❌ Lost</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Leads list */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No Aleem leads yet</p>
              <p className="text-xs text-gray-400 mt-1">Leads captured via chat will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const temp = TEMPERATURE_CONFIG[lead.temperature] ?? TEMPERATURE_CONFIG.warm;
                return (
                  <div key={lead._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#029bba] to-[#027a94] flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Name + temperature */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-gray-900">{lead.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${temp.bg} ${temp.text}`}>
                              {temp.icon} {temp.label}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white capitalize"
                              style={{ backgroundColor: STATUS_COLORS[lead.status] ?? '#6b7280' }}
                            >
                              {lead.status}
                            </span>
                          </div>

                          {/* Contact */}
                          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-[#029bba]">
                              <Phone className="w-3.5 h-3.5" />
                              {lead.phone}
                            </a>
                            {lead.email && !lead.email.includes('@noemail.highrise.pk') && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-[#029bba]">
                                <Mail className="w-3.5 h-3.5" />
                                {lead.email}
                              </a>
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(lead.createdAt)}
                            </span>
                            <span>Score: <strong className="text-gray-700">{lead.leadScore}</strong></span>
                            {lead.budget?.tier && (
                              <span>Budget: <strong className="text-gray-700">{lead.budget.tier}</strong></span>
                            )}
                          </div>

                          {/* Message preview */}
                          {lead.message && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2 italic">"{lead.message}"</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {lead.conversationId && (
                          <Link href={`/admin/aleem/conversations?search=${lead.sessionId ?? ''}`}>
                            <button className="p-2 hover:bg-[#029bba]/10 text-[#029bba] rounded-lg transition-colors" title="View Chat">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </Link>
                        )}
                        <a href={`tel:${lead.phone}`}>
                          <button className="p-2 hover:bg-[#10b981]/10 text-[#10b981] rounded-lg transition-colors" title="Call">
                            <Phone className="w-4 h-4" />
                          </button>
                        </a>
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <button className="p-2 hover:bg-[#25D366]/10 text-[#25D366] rounded-lg transition-colors" title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} • {pagination.total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}