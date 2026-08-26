// pages/admin/aleem/conversations.tsx
// Highrise.pk — Aleem Conversations List + Viewer (admin)
// V6.4.1 — Browse all conversations + view full message threads

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  MessagesSquare,
  Search,
  Filter,
  Loader2,
  Eye,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bot,
  User,
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  Globe,
  Target,
  Phone,
  Mail,
  Flame,
  RefreshCw,
} from 'lucide-react';

interface ConversationItem {
  _id:             string;
  sessionId:       string;
  createdAt:       string;
  lastActivityAt:  string;
  messageCount:    number;
  detectedIntent:  string;
  leadStatus:      string;
  leadCaptured:    boolean;
  leadId?:         string;
  context: { type: string; title?: string; city?: string };
  isActive:        boolean;
}

interface FullConversation {
  _id:            string;
  sessionId:      string;
  context:        Record<string, unknown>;
  messages:       Array<{ role: string; content: string; timestamp: string }>;
  messageCount:   number;
  detectedIntent: string;
  budgetMentioned?: number;
  cityMentioned?:   string;
  leadStatus:     string;
  leadCaptured:   boolean;
  leadId?:        string | null;
  linkedLead?: {
    _id: string; name: string; phone: string; email: string;
    temperature: string; priority: string; status: string;
  } | null;
  ipAddress?:     string;
  createdAt:      string;
  lastActivityAt: string;
}

interface Pagination {
  page: number; limit: number; total: number; pages: number;
}

const INTENT_COLORS: Record<string, string> = {
  buy:            '#029bba',
  rent:           '#10b981',
  invest:         '#f59e0b',
  verify_society: '#7c3aed',
  price_check:    '#06b6d4',
  general:        '#6b7280',
  unknown:        '#9ca3af',
};

const INTENT_LABELS: Record<string, string> = {
  buy: 'BUY', rent: 'RENT', invest: 'INVEST',
  verify_society: 'VERIFY', price_check: 'PRICE',
  general: 'GENERAL', unknown: '—',
};

export default function AleemConversationsPage(): React.ReactElement {
  const router = useRouter();
  const { status } = useSession();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [intent, setIntent]               = useState('');
  const [contextType, setContextType]     = useState('');
  const [leadCaptured, setLeadCaptured]   = useState('');
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal & Deletion State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullConv, setFullConv]     = useState<FullConversation | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Deletion Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting]                 = useState(false);
  const [deleteError, setDeleteError]           = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/admin/aleem/conversations');
    }
  }, [status, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch conversations
  const fetchConversations = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page:  String(pagination.page),
        limit: String(pagination.limit),
      });
      if (intent)       params.append('intent', intent);
      if (contextType)  params.append('contextType', contextType);
      if (leadCaptured) params.append('leadCaptured', leadCaptured);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await fetch(`/api/admin/aleem/conversations?${params}`);
      const data = await res.json() as {
        success: boolean;
        data?: { conversations: ConversationItem[]; pagination: Pagination };
        error?: string;
      };

      if (!res.ok || !data.success || !data.data) {
        setError(data.error ?? 'Failed to load');
        return;
      }
      setConversations(data.data.conversations);
      setPagination(data.data.pagination);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, intent, contextType, leadCaptured, debouncedSearch]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // View single conversation
  const viewConversation = async (id: string) => {
    setSelectedId(id);
    setModalLoading(true);
    setFullConv(null);
    try {
      const res = await fetch(`/api/admin/aleem/conversations/${id}`);
      const data = await res.json() as { success: boolean; data?: FullConversation; error?: string };
      if (data.success && data.data) setFullConv(data.data);
    } catch {
      // silent
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setFullConv(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/aleem/conversations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Failed to delete conversation');
        return;
      }
      setDeleteConfirmId(null);
      if (selectedId === id) {
        closeModal();
      }
      await fetchConversations();
    } catch {
      setDeleteError('Network error while deleting');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs   = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)   return 'Just now';
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ago`;
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  if (status === 'loading') {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#029bba]" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <Head><title>Aleem Conversations | Highrise Admin</title></Head>

      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessagesSquare className="w-7 h-7 text-[#029bba]" />
              Aleem Conversations
            </h1>
            <p className="text-gray-500 mt-1">All chat sessions with full message history</p>
          </div>
          <button
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search session ID or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba]"
              />
            </div>

            {/* Intent filter */}
            <select
              value={intent}
              onChange={(e) => { setIntent(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#029bba]"
            >
              <option value="">All Intents</option>
              <option value="buy">🏠 Buy</option>
              <option value="rent">🔑 Rent</option>
              <option value="invest">📈 Invest</option>
              <option value="verify_society">🔍 Verify Society</option>
              <option value="price_check">💰 Price Check</option>
              <option value="general">💬 General</option>
            </select>

            {/* Context filter */}
            <select
              value={contextType}
              onChange={(e) => { setContextType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#029bba]"
            >
              <option value="">All Contexts</option>
              <option value="property">🏠 Property Page</option>
              <option value="project">🏗️ Project Page</option>
              <option value="society">🏘️ Society Page</option>
              <option value="general">🌐 General/Homepage</option>
            </select>

            {/* Lead captured filter */}
            <select
              value={leadCaptured}
              onChange={(e) => { setLeadCaptured(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#029bba]"
            >
              <option value="">All Conversations</option>
              <option value="true">✅ Lead Captured</option>
              <option value="false">❌ No Lead</option>
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

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessagesSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No conversations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Session</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Context</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Intent</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Messages</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Lead</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Active</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Last Activity</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conversations.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-700">{c.sessionId.slice(0, 8)}...</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                            {c.context.type}
                          </span>
                        </div>
                        {c.context.title && (
                          <p className="text-xs text-gray-600 mt-1 truncate max-w-[180px]">{c.context.title}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-full font-bold"
                          style={{
                            backgroundColor: `${INTENT_COLORS[c.detectedIntent]}15`,
                            color: INTENT_COLORS[c.detectedIntent],
                          }}
                        >
                          {INTENT_LABELS[c.detectedIntent]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.messageCount}</td>
                      <td className="px-4 py-3">
                        {c.leadCaptured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#f0fdf4] text-[#10b981] text-xs font-bold">
                            <CheckCircle className="w-3 h-3" /> Captured
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#10b981]">
                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Closed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(c.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => viewConversation(c._id)}
                            className="p-2 hover:bg-[#029bba]/10 text-[#029bba] rounded-lg transition-colors"
                            title="View Full Conversation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setDeleteError(null); setDeleteConfirmId(c._id); }}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Delete Conversation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Full Conversation Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#029bba] to-[#004063] text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Full Conversation
                </h2>
                {fullConv && (
                  <p className="text-xs text-white/80 mt-1 font-mono">{fullConv.sessionId}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {fullConv && (
                  <button
                    onClick={() => { setDeleteError(null); setDeleteConfirmId(fullConv._id); }}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
                </div>
              ) : fullConv ? (
                <div className="p-6 space-y-4">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                    <div>
                      <p className="text-xs text-gray-500">Intent</p>
                      <p className="font-semibold text-gray-900 capitalize">{fullConv.detectedIntent.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Messages</p>
                      <p className="font-semibold text-gray-900">{fullConv.messageCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Started</p>
                      <p className="font-semibold text-gray-900 text-sm">{new Date(fullConv.createdAt).toLocaleString('en-PK')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lead Status</p>
                      <p className="font-semibold text-gray-900 capitalize">{fullConv.leadStatus}</p>
                    </div>
                  </div>

                  {/* Linked Lead */}
                  {fullConv.linkedLead && (
                    <div className="bg-[#f0fdf4] border border-[#10b981]/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#10b981] font-bold uppercase mb-1">✓ Lead Captured</p>
                          <p className="font-bold text-gray-900">{fullConv.linkedLead.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-700">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {fullConv.linkedLead.phone}</span>
                            {fullConv.linkedLead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {fullConv.linkedLead.email}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {fullConv.linkedLead.temperature === 'burning' && (
                            <span className="px-2 py-1 rounded-full bg-[#ef4444] text-white text-xs font-bold">🔥 BURNING</span>
                          )}
                          {fullConv.linkedLead.temperature === 'hot' && (
                            <span className="px-2 py-1 rounded-full bg-[#f97316] text-white text-xs font-bold">🔥 HOT</span>
                          )}
                          <Link href={`/admin/leads`}>
                            <button className="text-xs text-[#029bba] hover:underline flex items-center gap-1">
                              View Lead <ExternalLink className="w-3 h-3" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-3">
                    {fullConv.messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-[#029bba] text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="flex items-center gap-2 mb-1 opacity-80">
                            {msg.role === 'user'
                              ? <User className="w-3 h-3" />
                              : <Bot className="w-3 h-3" />}
                            <span className="text-xs font-medium">
                              {msg.role === 'user' ? 'User' : 'Aleem'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Failed to load conversation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Conversation?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    This conversation and its entire message history will be permanently deleted. This action cannot be undone.
                  </p>
                </div>
                {deleteError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {deleteError}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => { setDeleteConfirmId(null); setDeleteError(null); }}
                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </AdminLayout>
      );
    }