import React, { useRef, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

interface TrustedPartnerFormProps {
  partner?: any | null;
  onClose: () => void;
}

export default function TrustedPartnerForm({ partner, onClose }: TrustedPartnerFormProps) {
  const [companyName, setCompanyName] = useState(partner?.companyName || '');
  const [logo, setLogo] = useState({ url: partner?.logo?.url || '', publicId: partner?.logo?.publicId || '' });
  const [website, setWebsite] = useState(partner?.website || '');
  const [displayOrder, setDisplayOrder] = useState(partner?.displayOrder || 0);
  const [isActive, setIsActive] = useState(partner?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be 2MB or smaller.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Logo must be JPG, PNG, or WebP. SVG is not accepted for security reasons.');
      return;
    }

    setError('');
    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/upload?folder=trusted-partners', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.data?.url || !data?.data?.publicId) {
        throw new Error(data?.error || 'Logo upload failed');
      }
      setLogo({ url: data.data.url, publicId: data.data.publicId });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!companyName.trim()) {
        setError('Company name is required');
        setLoading(false);
        return;
      }

      if (!logo.url || !logo.publicId) {
        setError('Logo is required');
        setLoading(false);
        return;
      }

      const url = partner ? `/api/trusted-partners/${partner._id}` : '/api/trusted-partners';
      const method = partner ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          logo,
          website: website.trim(),
          displayOrder: Number(displayOrder),
          isActive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onClose();
      } else {
        setError(data.message || 'Failed to save partner');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {partner ? 'Edit Partner' : 'Add New Partner'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Bahria Town, DHA, etc."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none transition-colors"
              required
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo <span className="text-red-500">*</span>
            </label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadingLogo ? (
                <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {uploadingLogo ? 'Uploading securely...' : logo.url ? 'Change Logo' : 'Upload Logo (JPG, PNG, WebP)'}
              </span>
            </button>

            {/* Logo Preview */}
            {logo.url && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                <img
                  src={logo.url}
                  alt="Logo preview"
                  className="w-20 h-10 object-contain bg-white rounded"
                />
                <button
                  type="button"
                  onClick={() => setLogo({ url: '', publicId: '' })}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none transition-colors"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Show on homepage (Active)
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || uploadingLogo}
              className="flex-1 px-4 py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Partner'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
