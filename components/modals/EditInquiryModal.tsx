import { useState, useEffect } from 'react';
import Modal from './Modal';
import type { ILead, LeadStatus, LeadPriority } from '@/models/Lead';

interface EditInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: ILead | null;
  onSave: (updatedInquiry: Partial<ILead>) => Promise<void>;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new',       label: 'Pending',   color: 'bg-yellow-100 text-yellow-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'won',       label: 'Resolved',  color: 'bg-green-100 text-green-800' },
  { value: 'lost',      label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export default function EditInquiryModal({ isOpen, onClose, inquiry, onSave }: EditInquiryModalProps) {
  const [formData, setFormData] = useState<{
  status: LeadStatus;
  notes: string;
  assignedTo: string;
  priority: LeadPriority;
  followUpDate: string;
}>({
  status: 'new',
  notes: '',
  assignedTo: '',
  priority: 'medium',
  followUpDate: '',
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

   // Initialize form when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setFormData({
  status: inquiry.status || 'new',
  notes: inquiry.notes || '',
  assignedTo: inquiry.assignedTo ? String(inquiry.assignedTo) : '',
  priority: inquiry.priority || 'medium',
  followUpDate: inquiry.followUpDate
    ? new Date(inquiry.followUpDate).toISOString().split('T')[0]
    : '',
});
      setError('');
    }
  }, [inquiry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry) return;

    setLoading(true);
    setError('');

    try {
      const updatedData: Partial<ILead> = {
  status: formData.status,
  notes: formData.notes,
  priority: formData.priority,
};

      // Add optional fields only if they have values
      if (formData.assignedTo.trim()) {
        updatedData.assignedTo = formData.assignedTo;
      }

      if (formData.followUpDate) {
        updatedData.followUpDate = new Date(formData.followUpDate);
      }

      await onSave(updatedData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!inquiry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Inquiry"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Inquiry Info (Read-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-500">Property</label>
            <p className="mt-1 text-sm text-gray-900">
  {inquiry.propertySnapshot?.title
    ? inquiry.propertySnapshot.title
    : typeof inquiry.property === 'object' && 'title' in (inquiry.property as any)
      ? (inquiry.property as any).title
      : 'Property ID: ' + ((inquiry.property as any)?.toString()?.substring(0, 8) || 'N/A')}
</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Client</label>
            <p className="mt-1 text-sm text-gray-900">{inquiry.name} ({inquiry.email})</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Phone</label>
            <p className="mt-1 text-sm text-gray-900">{inquiry.phone || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Submitted</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(inquiry.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500">Message</label>
            <p className="mt-1 text-sm text-gray-900">{inquiry.message}</p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
              Assign To (Optional)
            </label>
            <input
              type="text"
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              placeholder="Enter admin name or email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">
              Follow-up Date (Optional)
            </label>
            <input
              type="date"
              id="followUpDate"
              name="followUpDate"
              value={formData.followUpDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add internal notes about this inquiry..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
