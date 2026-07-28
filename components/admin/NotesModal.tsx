// components/admin/NotesModal.tsx

import React, { useState } from 'react';
import { X, Save, MessageSquare, Calendar, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface Lead {
  _id: string;
  name: string;
  email: string;
  projectSnapshot: {
    projectName: string;
    city: string;
    area: string;
  };
  notes?: string;
  timeline?: Array<{
    action: string;
    performedBy: string;
    performedByRole: string;
    timestamp: string;
    notes?: string;
  }>;
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (leadId: string, notes: string) => Promise<void>;
}

// ============================================
// NOTES MODAL COMPONENT
// ============================================

export default function NotesModal({
  isOpen,
  onClose,
  lead,
  onSave,
}: NotesModalProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset notes when modal opens with new lead
  React.useEffect(() => {
    if (isOpen && lead) {
      setNotes(lead.notes || '');
    }
  }, [isOpen, lead]);

  // Handle save
  const handleSave = async () => {
    if (!lead) return;

    if (!notes.trim()) {
      toast.error('Please enter some notes');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(lead._id, notes.trim());
      toast.success('Notes saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get note-related timeline entries
  const noteTimeline = lead?.timeline?.filter(
    (entry) => entry.action === 'note_added' || entry.notes
  ) || [];

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#029bba]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Notes</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {lead.name} • {lead.projectSnapshot.projectName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Current Notes Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your notes about this lead... (e.g., customer preferences, follow-up details, budget discussion)"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-2">
                {notes.length} characters
              </p>
            </div>

            {/* Previous Notes Timeline */}
            {noteTimeline.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#029bba]" />
                  Previous Notes History
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-3">
                  {noteTimeline.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">
                            {entry.performedBy}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                        {entry.action === 'note_added' && (
                          <span className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba] rounded-md text-xs font-medium">
                            Note
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead Quick Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Lead Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">{lead.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{lead.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Project</p>
                  <p className="font-medium text-gray-900">
                    {lead.projectSnapshot.projectName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">
                    {lead.projectSnapshot.area}, {lead.projectSnapshot.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !notes.trim()}
              className="px-5 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Notes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
