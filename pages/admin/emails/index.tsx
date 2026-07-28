// pages/admin/emails/index.tsx

import { NextPage } from 'next';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Eye,
  RotateCcw,
  Loader2,
  Calendar,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Email {
  _id: string;
  to: string;
  toName?: string;
  from: string;
  subject: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentBy: string;
  sentAt: string;
  createdAt: string;
}

interface Counts {
  all: number;
  sent: number;
  failed: number;
  pending: number;
}

// Tab configuration
const tabs = [
  { key: 'all', label: 'All Emails', icon: Mail, color: 'text-gray-600' },
  { key: 'sent', label: 'Sent', icon: CheckCircle, color: 'text-green-600' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-600' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
  { key: 'trash', label: 'Trash', icon: Trash2, color: 'text-red-500' },
];
// Status configuration
const statusConfig = {
  sent: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Sent' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Failed' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
};

// Email Detail Modal
const EmailDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  onResend: (email: Email) => void;
}> = ({ isOpen, onClose, email, onResend }) => {
  if (!isOpen || !email) return null;

  const status = statusConfig[email.status];
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#029bba] to-[#027a94] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Email Details</h3>
                <p className="text-sm text-white/80">View email information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-6">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${status.bg} ${status.text}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(email.sentAt).toLocaleString()}
            </span>
          </div>

          {/* Error Message if failed */}
          {email.status === 'failed' && email.errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error Message</p>
                  <p className="text-sm text-red-600 mt-1">{email.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Email Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm font-medium text-gray-900">{email.from}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Sent By</p>
                <p className="text-sm font-medium text-gray-900">{email.sentBy}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">To</p>
              <p className="text-sm font-medium text-gray-900">
                {email.toName ? `${email.toName} <${email.to}>` : email.to}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Subject</p>
              <p className="text-sm font-medium text-gray-900">{email.subject}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">Message</p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200">
                {email.message}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {email.status === 'failed' && (
            <button
              onClick={() => onResend(email)}
              className="px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resend Email
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Action Confirmation Modal (Beautiful UI)
const ActionConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  type: 'soft-delete' | 'permanent-delete' | 'restore' | null;
}> = ({ isOpen, onClose, onConfirm, loading, type }) => {
  if (!isOpen || !type) return null;

  const config = {
    'soft-delete': {
      title: 'Move to Trash?',
      message: 'Are you sure you want to move this email to trash? You can restore it later.',
      icon: Trash2,
      color: 'bg-orange-100 text-orange-600',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      btnText: 'Move to Trash',
    },
    'permanent-delete': {
      title: 'Delete Permanently?',
      message: 'This action cannot be undone. This email log will be removed forever.',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnText: 'Delete Forever',
    },
    'restore': {
      title: 'Restore Email?',
      message: 'This email will be moved back to the main list.',
      icon: RotateCcw,
      color: 'bg-green-100 text-green-600',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnText: 'Restore Email',
    },
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${currentConfig.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                {currentConfig.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {currentConfig.message}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 ${currentConfig.btnColor}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              currentConfig.btnText
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main Page Component
const EmailsPage: NextPage = () => {
  const router = useRouter();

  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

    // Modal state (Detail)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Action Modal State (Delete/Restore)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'soft-delete' | 'permanent-delete' | 'restore' | null;
    emailId: string | null;
  }>({
    isOpen: false,
    type: null,
    emailId: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Helper to open action modal
  const openActionModal = (type: 'soft-delete' | 'permanent-delete' | 'restore', emailId: string) => {
    setActionModal({ isOpen: true, type, emailId });
  };

  // Helper to close action modal
  const closeActionModal = () => {
    setActionModal({ isOpen: false, type: null, emailId: null });
  };

  // Execute Action API Call
  const handleConfirmAction = async () => {
    const { type, emailId } = actionModal;
    if (!type || !emailId) return;

    setActionLoading(true);
    try {
      let res;
      // 1. Soft Delete
      if (type === 'soft-delete') {
        res = await fetch(`/api/admin/emails?id=${emailId}&type=soft`, { method: 'DELETE' });
      }
      // 2. Permanent Delete
      else if (type === 'permanent-delete') {
        res = await fetch(`/api/admin/emails?id=${emailId}&type=permanent`, { method: 'DELETE' });
      }
      // 3. Restore
      else if (type === 'restore') {
        res = await fetch(`/api/admin/emails?id=${emailId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        });
      }

      const data = await res?.json();

      if (data && data.success) {
        toast.success(data.message);
        fetchEmails(); // Refresh list
        closeActionModal();
      } else {
        toast.error(data?.message || 'Action failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(activeTab !== 'all' ? { status: activeTab } : {}),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/emails?${params}`);
      const data = await response.json();

      if (data.success) {
        setEmails(data.emails);
        setCounts(data.counts);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error(data.message || 'Failed to fetch emails');
      }
    } catch (error) {
      toast.error('Failed to fetch emails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle tab change
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    setPage(1);
  };

  // Handle resend
  const handleResend = async (email: Email) => {
    try {
      const res = await fetch(`/api/admin/emails/${email._id}/resend`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Email resent successfully!');
        setShowDetailModal(false);
        fetchEmails();
      } else {
        toast.error(data.message || 'Failed to resend email');
      }
    } catch (error) {
      toast.error('Failed to resend email');
    }
  };

  // View email
  const handleView = (email: Email) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
  };

  return (
    <AdminLayout>
      <Head>
        <title>Email History | Highrise Admin</title>
      </Head>

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email History</h1>
            <p className="text-gray-500">View all sent emails and their status</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/email-templates')}
              className="px-4 py-2 border border-[#029bba] text-[#029bba] rounded-xl hover:bg-[#029bba]/5 transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => fetchEmails()}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.key as keyof Counts];
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-[#029bba] text-white border-[#029bba] shadow-lg shadow-[#029bba]/25'
                    : 'bg-white text-gray-700 border-gray-100 hover:border-[#029bba]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : tab.color}`} />
                  <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {count}
                  </span>
                </div>
                <p className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {tab.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, name, or subject..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Emails Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search' : 'No emails have been sent yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {emails.map((email) => {
                      const status = statusConfig[email.status];
                      const StatusIcon = status.icon;

                      return (
                        <motion.tr
                          key={email._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#029bba]/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-[#029bba]" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {email.toName || 'Unknown'}
                                </p>
                                <p className="text-sm text-gray-500">{email.to}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-900 font-medium truncate max-w-xs">
                              {email.subject}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Calendar className="w-4 h-4" />
                              {new Date(email.sentAt).toLocaleDateString()}
                            </div>
                          </td>
                                                <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(email)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {activeTab === 'trash' ? (
                            <>
                              <button
                                onClick={() => openActionModal('restore', email._id)}
                                className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                                title="Restore"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openActionModal('permanent-delete', email._id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                title="Delete Forever"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {email.status === 'failed' && (
                                <button
                                  onClick={() => handleResend(email)}
                                  className="p-2 hover:bg-[#029bba]/10 rounded-lg transition-colors text-[#029bba]"
                                  title="Resend Email"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openActionModal('soft-delete', email._id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Email Detail Modal */}
  <EmailDetailModal
    isOpen={showDetailModal}
    onClose={() => setShowDetailModal(false)}
    email={selectedEmail}
    onResend={handleResend}
  />

  {/* Action Confirmation Modal */}
  <ActionConfirmationModal
    isOpen={actionModal.isOpen}
    onClose={closeActionModal}
    onConfirm={handleConfirmAction}
    loading={actionLoading}
    type={actionModal.type}
  />
</AdminLayout>
  );
};

export default EmailsPage;
