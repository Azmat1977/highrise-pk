// pages/admin/email-templates/index.tsx

import { NextPage } from 'next';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Mail,
  Check,
  Eye,
  Copy,
} from 'lucide-react';

// Types
interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
}

// Category configuration
const categories = [
  { value: 'welcome', label: 'Welcome', color: 'bg-green-100 text-green-800' },
  { value: 'verification', label: 'Verification', color: 'bg-blue-100 text-blue-800' },
  { value: 'notification', label: 'Notification', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'marketing', label: 'Marketing', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

// Template Modal
const TemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  onSave: (data: any, errorHandler: (msg: string) => void) => Promise<void>;
  mode: 'create' | 'edit' | 'view';
}> = ({ isOpen, onClose, template, onSave, mode }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('other');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (modalError) {
      const t = setTimeout(() => setModalError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [modalError]);

  useEffect(() => {
    if (template && (mode === 'edit' || mode === 'view')) {
      setName(template.name);
      setSubject(template.subject);
      setMessage(template.message);
      setCategory(template.category);
      setIsActive(template.isActive);
    } else {
      setName('');
      setSubject('');
      setMessage('');
      setCategory('other');
      setIsActive(true);
    }
  }, [template, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setModalError('Please enter template name');
      return;
    }
    if (!subject.trim()) {
      setModalError('Please enter subject');
      return;
    }
    if (!message.trim()) {
      setModalError('Please enter message');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        subject,
        message,
        category,
        isActive,
      }, setModalError);
    } finally {
      setIsSaving(false);
    }
  };

  const isViewMode = mode === 'view';

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
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {mode === 'create' ? 'Create Template' : mode === 'edit' ? 'Edit Template' : 'View Template'}
                </h3>
                <p className="text-sm text-white/80">
                  {mode === 'view' ? 'Template details' : 'Fill in the template details'}
                </p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] relative">
          {modalError && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-xl text-xs font-semibold text-center border border-red-200 animate-fadeIn">
              {modalError}
            </div>
          )}
          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isViewMode}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] disabled:bg-gray-50"
              placeholder="e.g., Welcome Email"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isViewMode}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] disabled:bg-gray-50"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isViewMode}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] disabled:bg-gray-50"
              placeholder="e.g., Welcome to Highrise.pk"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isViewMode}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] resize-none disabled:bg-gray-50"
              rows={8}
              placeholder="Type your email message here..."
            />
          </div>

          {/* Active Toggle */}
          {!isViewMode && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Active Template</p>
                <p className="text-sm text-gray-500">Enable this template for use</p>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isActive ? 'bg-[#029bba]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isActive ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Usage stats for view mode */}
          {isViewMode && template && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Times Used</p>
                  <p className="text-2xl font-bold text-gray-900">{template.usageCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {isViewMode ? 'Close' : 'Cancel'}
          </button>
          {!isViewMode && (
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateName: string;
}> = ({ isOpen, onClose, onConfirm, templateName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{templateName}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Main Page Component
const EmailTemplatesPage: NextPage = () => {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' ? { category: selectedCategory } : {}),
      });

      const response = await fetch(`/api/admin/email-templates?${params}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        setBanner({ message: data.message || 'Failed to fetch templates', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to fetch templates', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle create
  const handleCreate = () => {
    setSelectedTemplate(null);
    setModalMode('create');
    setShowModal(true);
  };

  // Handle edit
  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setModalMode('edit');
    setShowModal(true);
  };

  // Handle view
  const handleView = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setModalMode('view');
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      const res = await fetch(`/api/admin/email-templates/${templateToDelete._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setBanner({ message: 'Template deleted successfully', type: 'success' });
        fetchTemplates();
      } else {
        setBanner({ message: data.message || 'Failed to delete template', type: 'error' });
      }
    } catch (error) {
      setBanner({ message: 'Failed to delete template', type: 'error' });
    }
    setShowDeleteModal(false);
    setTemplateToDelete(null);
  };

  // Save template
  const handleSave = async (data: any, errorHandler?: (msg: string) => void) => {
    try {
      const url = modalMode === 'edit' && selectedTemplate
        ? `/api/admin/email-templates/${selectedTemplate._id}`
        : '/api/admin/email-templates';

      const res = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        setBanner({ message: modalMode === 'edit' ? 'Template updated!' : 'Template created!', type: 'success' });
        setShowModal(false);
        fetchTemplates();
      } else {
        if (errorHandler) {
          errorHandler(result.message || 'Failed to save template');
        } else {
          setBanner({ message: result.message || 'Failed to save template', type: 'error' });
        }
      }
    } catch (error) {
      if (errorHandler) {
        errorHandler('Failed to save template');
      } else {
        setBanner({ message: 'Failed to save template', type: 'error' });
      }
    }
  };

  // Copy template
  const handleCopy = (template: EmailTemplate) => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.message}`);
    setBanner({ message: 'Template copied to clipboard!', type: 'success' });
  };

  return (
    <AdminLayout>
      <Head>
        <title>Email Templates | Highrise Admin</title>
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

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-500">Manage reusable email templates</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/emails')}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email History
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#029bba] text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Templates
          </button>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-[#029bba] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-4">Create your first email template</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {templates.map((template) => {
                const cat = categories.find((c) => c.value === template.category) || categories[4];

                return (
                  <motion.div
                    key={template._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                        {!template.isActive && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Used {template.usageCount} times
                      </span>
                    </div>

                    {/* Name & Subject */}
                    <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 truncate">{template.subject}</p>

                    {/* Message Preview */}
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                      {template.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleView(template)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopy(template)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        template={selectedTemplate}
        onSave={handleSave}
        mode={modalMode}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        templateName={templateToDelete?.name || ''}
      />
    </AdminLayout>
  );
};

export default EmailTemplatesPage;
