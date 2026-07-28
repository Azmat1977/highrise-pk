import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  MessagesSquare,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Clock,
  User,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Bot,
  UserCircle,
} from 'lucide-react';

// Types
interface ChatSession {
  _id: string;
  sessionId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  visitorCity: string;
  status: 'active' | 'closed' | 'waiting';
  agentName: string;
  agentGender: 'male' | 'female';
  source: string;
  currentPage: string;
  totalMessages: number;
  lastMessageAt: string;
  isAIHandled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  _id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  senderName: string;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface Counts {
  all: number;
  active: number;
  closed: number;
  waiting: number;
}

export default function AdminChatsPage() {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    active: 0,
    closed: 0,
    waiting: 0,
  });

  // Modal State
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch chat sessions
  const fetchSessions = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/chats?${params}`);
      const data = await res.json();

      if (data.success) {
        setSessions(data.data.sessions);
        setPagination(data.data.pagination);
        setCounts(data.data.counts);
      } else {
        setError(data.message || 'Failed to fetch chats');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchSessions(1);
  }, [statusFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // View chat details
  const viewChat = async (session: ChatSession) => {
    setSelectedSession(session);
    setModalLoading(true);
    setSessionMessages([]);

    try {
      const res = await fetch(`/api/admin/chats/${session.sessionId}`);
      const data = await res.json();

      if (data.success) {
        setSessionMessages(data.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setSelectedSession(null);
    setSessionMessages([]);
  };

  // Delete chat
  const deleteChat = async (sessionId: string) => {
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/chats/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setShowDeleteConfirm(null);
        fetchSessions(pagination.currentPage);
        if (selectedSession?.sessionId === sessionId) {
          closeModal();
        }
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Update chat status
  const updateStatus = async (sessionId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/chats/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        fetchSessions(pagination.currentPage);
        if (selectedSession?.sessionId === sessionId) {
          setSelectedSession({ ...selectedSession, status: newStatus as any });
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
      waiting: 'bg-amber-100 text-amber-700',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout>
      <Head>
        <title>AI Chats (Deprecated) | Highrise Admin</title>
      </Head>

      <div className="space-y-6">
        {/* DEPRECATION BANNER (V6.4.1) */}
        <div className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">⚠️ This page is deprecated</h3>
              <p className="text-sm text-white/90 mb-3">
                Old ChatWidget has been replaced by Aleem AI in V6.3.0. This page shows historical data only. For current Aleem conversations, please visit the new admin section.
              </p>
              <a
                href="/admin/aleem/conversations"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#d97706] rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                Go to Aleem Conversations →
              </a>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessagesSquare className="w-7 h-7 text-[#029bba]" />
              AI Chat Sessions
            </h1>
            <p className="text-gray-600 mt-1">
              View and manage all AI assistant conversations
            </p>
          </div>

          <button
            onClick={() => fetchSessions(pagination.currentPage)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Chats', count: counts.all },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'waiting', label: 'Waiting', count: counts.waiting },
            { key: 'closed', label: 'Closed', count: counts.closed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#029bba] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                statusFilter === tab.key
                  ? 'bg-white/20'
                  : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or session ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Chat List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <MessagesSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No chat sessions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Visitor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Agent</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Messages</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Last Active</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{session.visitorName}</p>
                          {session.visitorEmail && (
                            <p className="text-xs text-gray-500">{session.visitorEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-[#029bba]" />
                          <span className="text-sm text-gray-700">{session.agentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{session.totalMessages}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{formatDate(session.lastMessageAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewChat(session)}
                            className="p-2 hover:bg-[#029bba]/10 text-[#029bba] rounded-lg transition-colors"
                            title="View Chat"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(session.sessionId)}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Delete"
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
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} chats
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSessions(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchSessions(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Chat Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Chat with {selectedSession.visitorName}
                </h2>
                <p className="text-sm text-gray-500">
                  Agent: {selectedSession.agentName} • {formatDate(selectedSession.createdAt)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visitor Info */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 text-sm">
              {selectedSession.visitorEmail && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {selectedSession.visitorEmail}
                </div>
              )}
              {selectedSession.visitorPhone && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {selectedSession.visitorPhone}
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-600">
                <Globe className="w-4 h-4" />
                {selectedSession.currentPage}
              </div>
              <div className="ml-auto">
                <select
                  value={selectedSession.status}
                  onChange={(e) => updateStatus(selectedSession.sessionId, e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#029bba]"
                >
                  <option value="active">Active</option>
                  <option value="waiting">Waiting</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#029bba]" />
                </div>
              ) : sessionMessages.length === 0 ? (
                <p className="text-center text-gray-500">No messages found</p>
              ) : (
                sessionMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-[#029bba] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.role === 'user' ? (
                          <UserCircle className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium">
                          {msg.senderName || (msg.role === 'user' ? 'Visitor' : 'AI')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Chat?</h3>
            <p className="text-gray-600 text-sm mb-4">
              This will permanently delete this chat session and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteChat(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
