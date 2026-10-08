// pages/admin/settings/index.tsx

import React, { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import {
  Settings,
  Globe,
  Mail,
  Share2,
  Search,
  Clock,
  Shield,
  Save,
  Loader2,
  RefreshCw,
  Building2,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronRight,
  Image,
  FileText,
  ToggleLeft,
  ToggleRight,
  ExternalLink
} from 'lucide-react';

// Types
interface BusinessHour {
  open: string;
  close: string;
  closed: boolean;
}

interface SettingsData {
  // Site Information
  siteName: string;
  siteTagline: string;
  siteUrl: string;
  siteLogo: string;
  siteFavicon: string;
  
  // Contact Information
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactAddress: string;
  
  // Social Media Links
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialLinkedIn: string;
  socialYouTube: string;
  socialTikTok: string;
  
  // SEO Settings
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  
  // Email Settings
  emailHost: string;
  emailPort: string;
  emailFrom: string;
  emailFromName: string;
  
  // Business Settings
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  
  // Feature Toggles
  maintenanceMode: boolean;
  allowRegistration: boolean;
  enableNotifications: boolean;
  enableNewsletter: boolean;
  enableComments: boolean;
  requireEmailVerification: boolean;
  
   // Business Hours
  businessHours: {
    monday: BusinessHour;
    tuesday: BusinessHour;
    wednesday: BusinessHour;
    thursday: BusinessHour;
    friday: BusinessHour;
    saturday: BusinessHour;
    sunday: BusinessHour;
  };
  
  // Watermark Settings
  watermark: {
    enabled: boolean;
    type: 'text' | 'logo';
    text: string;
    logoUrl: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
    opacity: number;
    size: 'small' | 'medium' | 'large';
    padding: number;
  };
  
  updatedAt?: string;
}

// Default settings
const defaultSettings: SettingsData = {
  siteName: 'Highrise.pk',
  siteTagline: "Pakistan's Premier Real Estate Platform",
  siteUrl: 'https://highrise.pk',
  siteLogo: '',
  siteFavicon: '',
  contactEmail: 'info@highrise.pk',
  contactPhone: '+92-300-1234567',
  contactWhatsApp: '+92-300-1234567',
  contactAddress: 'Lahore, Pakistan',
  socialFacebook: '',
  socialInstagram: '',
  socialTwitter: '',
  socialLinkedIn: '',
  socialYouTube: '',
  socialTikTok: '',
  seoTitle: 'Highrise.pk - Real Estate in Pakistan',
  seoDescription: 'Find your dream property in Pakistan. Browse homes, apartments, plots, and commercial properties.',
  seoKeywords: 'real estate pakistan, property, homes, apartments, plots, lahore, karachi, islamabad',
  googleAnalyticsId: '',
  googleTagManagerId: '',
  emailHost: 'mail.highrise.pk',
  emailPort: '465',
  emailFrom: 'info@highrise.pk',
  emailFromName: 'Highrise.pk',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  timezone: 'Asia/Karachi',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  maintenanceMode: false,
  allowRegistration: true,
  enableNotifications: true,
  enableNewsletter: true,
  enableComments: true,
  requireEmailVerification: false,
   businessHours: {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: true },
  },
  watermark: {
    enabled: true,
    type: 'text',
    text: 'Highrise.pk',
    logoUrl: '',
    position: 'bottom-right',
    opacity: 70,
    size: 'medium',
    padding: 20,
  },
};

// Tab configuration
const tabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'features', label: 'Features', icon: Shield },
  { id: 'watermark', label: 'Watermark', icon: Image },
  { id: 'hours', label: 'Business Hours', icon: Clock },
];

// Toggle Switch Component
function ToggleSwitch({ 
  enabled, 
  onChange, 
  label, 
  description 
}: { 
  enabled: boolean; 
  onChange: (value: boolean) => void; 
  label: string; 
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div>
        <h3 className="font-medium text-gray-900">{label}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-[#029bba]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Input Field Component
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  icon: Icon,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  icon?: any;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500`}
        />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// Textarea Field Component
function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
// Image Upload Field Component
function ImageUploadField({
  label,
  value,
  onChange,
  onUploadComplete,
  hint,
  accept = 'image/*',
  folder = 'settings',
  showNotification,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploadComplete?: () => void;
  hint?: string;
  accept?: string;
  folder?: string;
  showNotification?: (message: string, type: 'success' | 'error') => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Display value or local preview
  const displayImage = localPreview || value;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      if (showNotification) showNotification('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      if (showNotification) showNotification('Image size must be less than 5MB', 'error');
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Show local preview immediately
      setLocalPreview(base64);

      // Upload to Cloudinary via API
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          mimeType: file.type,
          folder: folder,
          uploadedBy: 'admin',
        }),
      });

      const data = await response.json();

      if (data.success && data.media?.url) {
        const uploadedUrl = data.media.url;
        console.log('? Image uploaded to Cloudinary:', uploadedUrl);
        
        // Update parent state with the Cloudinary URL
        onChange(uploadedUrl);
        setLocalPreview(''); // Clear local preview, use value from parent
        if (showNotification) showNotification('Image uploaded! Click "Save Changes" to save.', 'success');
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        if (showNotification) showNotification(data.message || 'Failed to upload image', 'error');
        setLocalPreview(''); // Clear failed preview
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (showNotification) showNotification('Failed to upload image', 'error');
      setLocalPreview('');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setLocalPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (showNotification) showNotification('Image removed. Click "Save Changes" to save.', 'success');
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    setLocalPreview('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      <div className="flex items-start gap-4">
        {/* Preview Area */}
        <div className="relative w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
          {displayImage ? (
            <>
              <img
                src={displayImage}
                alt="Preview"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Remove button */}
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <Image className="w-8 h-8 text-gray-300" />
          )}
          
          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#029bba]" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`upload-${label.replace(/\s/g, '-').toLowerCase()}`}
          />
          
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`upload-${label.replace(/\s/g, '-').toLowerCase()}`}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors font-medium cursor-pointer text-sm w-fit ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4" />
                  Choose Image
                </>
              )}
            </label>

            {/* URL Input (optional manual entry) */}
            <input
              type="text"
              value={value}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Or paste image URL..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            />
          </div>

          {hint && <p className="text-xs text-gray-500 mt-2">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
// Select Field Component
function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// Main Settings Content
function SettingsContent() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showBanner = (message: string, type: "success" | "error" | "warning" = "success") => {
    setBanner({ message, type });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success && data.data) {
        setSettings({ ...defaultSettings, ...data.data });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showBanner('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update settings field
  const updateField = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Update business hours
  const updateBusinessHours = (
    day: keyof SettingsData['businessHours'],
    field: keyof BusinessHour,
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        showBanner('Settings saved successfully!', 'success');
        setHasChanges(false);
        if (data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      } else {
        showBanner(data.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      showBanner('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset settings
  const handleReset = async () => {
    setResetLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      const data = await response.json();

      if (data.success) {
        showBanner('Settings reset to defaults!', 'success');
        setSettings({ ...defaultSettings, ...data.data });
        setHasChanges(false);
        setResetModal(false);
      } else {
        showBanner(data.message || 'Failed to reset settings', 'error');
      }
    } catch (error) {
      showBanner('Failed to reset settings', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mx-auto mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Site Name"
                  value={settings.siteName}
                  onChange={(v) => updateField('siteName', v)}
                  placeholder="Your site name"
                  icon={Building2}
                  required
                />
                <InputField
                  label="Site URL"
                  value={settings.siteUrl}
                  onChange={(v) => updateField('siteUrl', v)}
                  placeholder="https://example.com"
                  icon={Globe}
                />
              </div>
            </div>

            <InputField
              label="Site Tagline"
              value={settings.siteTagline}
              onChange={(v) => updateField('siteTagline', v)}
              placeholder="A short description of your site"
              hint="This appears in various places across your site"
            />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploadField
                label="Site Logo"
                value={settings.siteLogo}
                onChange={(v) => updateField('siteLogo', v)}
                hint="Recommended: PNG or SVG, max 5MB"
                folder="settings"
                showNotification={showBanner}
              />
              <ImageUploadField
                label="Favicon"
                value={settings.siteFavicon}
                onChange={(v) => updateField('siteFavicon', v)}
                hint="Recommended: ICO or PNG, 32x32 or 64x64 pixels"
                folder="settings"
                accept="image/*,.ico"
                showNotification={showBanner}
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SelectField
                  label="Currency"
                  value={settings.currency}
                  onChange={(v) => updateField('currency', v)}
                  options={[
                    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'GBP', label: 'GBP - British Pound' },
                    { value: 'AED', label: 'AED - UAE Dirham' },
                  ]}
                />
                <InputField
                  label="Currency Symbol"
                  value={settings.currencySymbol}
                  onChange={(v) => updateField('currencySymbol', v)}
                  placeholder="Rs."
                />
                <SelectField
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(v) => updateField('timezone', v)}
                  options={[
                    { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
                    { value: 'Europe/London', label: 'Europe/London (GMT)' },
                    { value: 'America/New_York', label: 'America/New_York (EST)' },
                  ]}
                />
                <SelectField
                  label="Date Format"
                  value={settings.dateFormat}
                  onChange={(v) => updateField('dateFormat', v)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Contact Email"
                value={settings.contactEmail}
                onChange={(v) => updateField('contactEmail', v)}
                type="email"
                placeholder="info@example.com"
                icon={Mail}
                required
              />
              <InputField
                label="Contact Phone"
                value={settings.contactPhone}
                onChange={(v) => updateField('contactPhone', v)}
                placeholder="+92-300-1234567"
                icon={Phone}
              />
            </div>

            <InputField
              label="WhatsApp Number"
              value={settings.contactWhatsApp}
              onChange={(v) => updateField('contactWhatsApp', v)}
              placeholder="+92-300-1234567"
              icon={MessageCircle}
              hint="Include country code for WhatsApp click-to-chat"
            />

            <TextareaField
              label="Address"
              value={settings.contactAddress}
              onChange={(v) => updateField('contactAddress', v)}
              placeholder="Your business address"
              rows={3}
            />
          </div>
        );

      case 'social':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
            <p className="text-gray-500 text-sm mb-4">
              Enter the full URLs to your social media profiles. Leave empty to hide.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Facebook"
                value={settings.socialFacebook}
                onChange={(v) => updateField('socialFacebook', v)}
                placeholder="https://facebook.com/yourpage"
                icon={Facebook}
              />
              <InputField
                label="Instagram"
                value={settings.socialInstagram}
                onChange={(v) => updateField('socialInstagram', v)}
                placeholder="https://instagram.com/yourprofile"
                icon={Instagram}
              />
              <InputField
                label="Twitter / X"
                value={settings.socialTwitter}
                onChange={(v) => updateField('socialTwitter', v)}
                placeholder="https://twitter.com/yourhandle"
                icon={Twitter}
              />
              <InputField
                label="LinkedIn"
                value={settings.socialLinkedIn}
                onChange={(v) => updateField('socialLinkedIn', v)}
                placeholder="https://linkedin.com/company/yourcompany"
                icon={Linkedin}
              />
              <InputField
                label="YouTube"
                value={settings.socialYouTube}
                onChange={(v) => updateField('socialYouTube', v)}
                placeholder="https://youtube.com/@yourchannel"
                icon={Youtube}
              />
              <InputField
                label="TikTok"
                value={settings.socialTikTok}
                onChange={(v) => updateField('socialTikTok', v)}
                placeholder="https://tiktok.com/@yourprofile"
              />
            </div>
          </div>
        );

      case 'seo':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h3>
            <p className="text-gray-500 text-sm mb-4">
              These are default values used when pages don't have their own SEO settings.
            </p>

            <InputField
              label="Default Meta Title"
              value={settings.seoTitle}
              onChange={(v) => updateField('seoTitle', v)}
              placeholder="Your Site Name - Tagline"
              hint="Recommended: 50-60 characters"
            />

            <TextareaField
              label="Default Meta Description"
              value={settings.seoDescription}
              onChange={(v) => updateField('seoDescription', v)}
              placeholder="A brief description of your website"
              rows={3}
              hint="Recommended: 150-160 characters"
            />

            <TextareaField
              label="Default Keywords"
              value={settings.seoKeywords}
              onChange={(v) => updateField('seoKeywords', v)}
              placeholder="keyword1, keyword2, keyword3"
              rows={2}
              hint="Comma-separated keywords (less important for modern SEO)"
            />

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics & Tracking</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Google Analytics ID"
                  value={settings.googleAnalyticsId}
                  onChange={(v) => updateField('googleAnalyticsId', v)}
                  placeholder="G-XXXXXXXXXX"
                  hint="Your GA4 Measurement ID"
                />
                <InputField
                  label="Google Tag Manager ID"
                  value={settings.googleTagManagerId}
                  onChange={(v) => updateField('googleTagManagerId', v)}
                  placeholder="GTM-XXXXXXX"
                  hint="Your GTM Container ID"
                />
              </div>
            </div>

            {/* SEO Preview */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Search Preview</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                  {settings.seoTitle || 'Your Site Title'}
                </p>
                <p className="text-green-700 text-sm truncate">
                  {settings.siteUrl}
                </p>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {settings.seoDescription || 'Your meta description will appear here...'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Email Configuration</p>
                <p className="text-blue-700 text-sm mt-1">
                  SMTP settings are configured in your <code className="bg-blue-100 px-1 rounded">.env.local</code> file for security.
                  The values below are for display/reference only.
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Display Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Email Host"
                value={settings.emailHost}
                onChange={(v) => updateField('emailHost', v)}
                placeholder="mail.example.com"
                disabled
              />
              <InputField
                label="Email Port"
                value={settings.emailPort}
                onChange={(v) => updateField('emailPort', v)}
                placeholder="465"
                disabled
              />
              <InputField
                label="From Email"
                value={settings.emailFrom}
                onChange={(v) => updateField('emailFrom', v)}
                placeholder="info@example.com"
              />
              <InputField
                label="From Name"
                value={settings.emailFromName}
                onChange={(v) => updateField('emailFromName', v)}
                placeholder="Your Site Name"
              />
            </div>

            <div className="pt-4">
              <a
                href="/admin/email-templates"
                className="inline-flex items-center gap-2 text-[#029bba] hover:underline font-medium"
              >
                <FileText className="w-4 h-4" />
                Manage Email Templates
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Toggles</h3>
            <p className="text-gray-500 text-sm mb-4">
              Enable or disable various features of your platform.
            </p>

            <div className="space-y-3">
              <ToggleSwitch
                enabled={settings.maintenanceMode}
                onChange={(v) => updateField('maintenanceMode', v)}
                label="Maintenance Mode"
                description="When enabled, visitors see a maintenance page"
              />
              <ToggleSwitch
                enabled={settings.allowRegistration}
                onChange={(v) => updateField('allowRegistration', v)}
                label="Allow User Registration"
                description="Allow new users to create accounts"
              />
              <ToggleSwitch
                enabled={settings.requireEmailVerification}
                onChange={(v) => updateField('requireEmailVerification', v)}
                label="Require Email Verification"
                description="Users must verify email before accessing features"
              />
              <ToggleSwitch
                enabled={settings.enableNotifications}
                onChange={(v) => updateField('enableNotifications', v)}
                label="Enable Email Notifications"
                description="Send email notifications for various events"
              />
              <ToggleSwitch
                enabled={settings.enableNewsletter}
                onChange={(v) => updateField('enableNewsletter', v)}
                label="Enable Newsletter"
                description="Show newsletter subscription forms"
              />
              <ToggleSwitch
                enabled={settings.enableComments}
                onChange={(v) => updateField('enableComments', v)}
                label="Enable Comments"
                description="Allow users to comment on blog posts"
              />
            </div>

            {settings.maintenanceMode && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-800 font-medium">Maintenance Mode is ON</p>
                  <p className="text-orange-700 text-sm mt-1">
                    Your website is currently showing a maintenance page to visitors. 
                    Admin users can still access the site.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

          case 'watermark':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Watermark Settings</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Add watermark to property images automatically
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.watermark?.enabled ?? true}
                onChange={(v) => updateField('watermark', { ...settings.watermark, enabled: v })}
                label=""
              />
            </div>

            {settings.watermark?.enabled && (
              <>
                {/* Watermark Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => updateField('watermark', { ...settings.watermark, type: 'text' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        settings.watermark?.type === 'text'
                          ? 'border-[#029bba] bg-[#029bba]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className={`w-6 h-6 mx-auto mb-2 ${
                        settings.watermark?.type === 'text' ? 'text-[#029bba]' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        settings.watermark?.type === 'text' ? 'text-[#029bba]' : 'text-gray-600'
                      }`}>Text Watermark</p>
                      <p className="text-xs text-gray-500 mt-1">Use your site name</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('watermark', { ...settings.watermark, type: 'logo' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        settings.watermark?.type === 'logo'
                          ? 'border-[#029bba] bg-[#029bba]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Image className={`w-6 h-6 mx-auto mb-2 ${
                        settings.watermark?.type === 'logo' ? 'text-[#029bba]' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        settings.watermark?.type === 'logo' ? 'text-[#029bba]' : 'text-gray-600'
                      }`}>Logo Watermark</p>
                      <p className="text-xs text-gray-500 mt-1">Use your logo image</p>
                    </button>
                  </div>
                </div>

                {/* Text or Logo Input */}
                {settings.watermark?.type === 'text' ? (
                  <InputField
                    label="Watermark Text"
                    value={settings.watermark?.text || 'Highrise.pk'}
                    onChange={(v) => updateField('watermark', { ...settings.watermark, text: v })}
                    placeholder="Highrise.pk"
                    hint="This text will appear on all property images"
                  />
                ) : (
                  <ImageUploadField
                    label="Watermark Logo"
                    value={settings.watermark?.logoUrl || ''}
                    onChange={(v) => updateField('watermark', { ...settings.watermark, logoUrl: v })}
                    hint="Recommended: PNG with transparent background, max 500x200px"
                    folder="general"
                    showNotification={showBanner}
                  />
                )}

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'center', label: 'Center' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-center', label: 'Bottom Center' },
                      { value: 'bottom-right', label: 'Bottom Right' },
                    ].map((pos) => (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => updateField('watermark', { ...settings.watermark, position: pos.value as any })}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          settings.watermark?.position === pos.value
                            ? 'border-[#029bba] bg-[#029bba] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ].map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => updateField('watermark', { ...settings.watermark, size: size.value as any })}
                        className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                          settings.watermark?.size === size.value
                            ? 'border-[#029bba] bg-[#029bba] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opacity: {settings.watermark?.opacity || 70}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.watermark?.opacity || 70}
                    onChange={(e) => updateField('watermark', { ...settings.watermark, opacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10% (Subtle)</span>
                    <span>100% (Solid)</span>
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Padding from Edge: {settings.watermark?.padding || 20}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.watermark?.padding || 20}
                    onChange={(e) => updateField('watermark', { ...settings.watermark, padding: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px (Edge)</span>
                    <span>100px (Inset)</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Preview</label>
                  <div className="relative bg-gray-100 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {/* Sample Image Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <Building2 className="w-20 h-20 text-gray-500/50" />
                    </div>
                    
                    {/* Watermark Preview */}
                    <div
                      className={`absolute ${
                        settings.watermark?.position === 'top-left' ? 'top-0 left-0' :
                        settings.watermark?.position === 'top-right' ? 'top-0 right-0' :
                        settings.watermark?.position === 'bottom-left' ? 'bottom-0 left-0' :
                        settings.watermark?.position === 'bottom-right' ? 'bottom-0 right-0' :
                        settings.watermark?.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                        settings.watermark?.position === 'bottom-center' ? 'bottom-0 left-1/2 -translate-x-1/2' :
                        'bottom-0 right-0'
                      }`}
                      style={{ 
                        padding: `${settings.watermark?.padding || 20}px`,
                        opacity: (settings.watermark?.opacity || 70) / 100 
                      }}
                    >
                      {settings.watermark?.type === 'logo' && settings.watermark?.logoUrl ? (
                        <img 
                          src={settings.watermark.logoUrl} 
                          alt="Watermark"
                          className={`${
                            settings.watermark?.size === 'small' ? 'h-6' :
                            settings.watermark?.size === 'large' ? 'h-14' :
                            'h-10'
                          } w-auto`}
                        />
                      ) : (
                        <span 
                          className={`font-bold text-white drop-shadow-lg ${
                            settings.watermark?.size === 'small' ? 'text-sm' :
                            settings.watermark?.size === 'large' ? 'text-2xl' :
                            'text-lg'
                          }`}
                          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                        >
                          {settings.watermark?.text || 'Highrise.pk'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This is how watermark will appear on property images
                  </p>
                </div>
              </>
            )}

            {!settings.watermark?.enabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-medium">Watermark Disabled</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Property images will be uploaded without watermark. Enable watermark to protect your images.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'hours':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
            <p className="text-gray-500 text-sm mb-4">
              Set your operating hours. These may be displayed on your website.
            </p>

            <div className="space-y-3">
              {(Object.keys(settings.businessHours) as Array<keyof typeof settings.businessHours>).map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900 capitalize w-24">{day}</span>
                    
                    {!settings.businessHours[day].closed ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={settings.businessHours[day].open}
                          onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={settings.businessHours[day].close}
                          onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Closed</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => updateBusinessHours(day, 'closed', !settings.businessHours[day].closed)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      settings.businessHours[day].closed
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {settings.businessHours[day].closed ? 'Closed' : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      {banner && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all border ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : banner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <X className="w-5 h-5 text-red-600" />
          )}
          <span className="text-sm font-semibold">{banner.message}</span>
          <button onClick={() => setBanner(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your platform configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2.5 bg-[#029bba] text-white rounded-xl hover:bg-[#027a94] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#029bba] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Danger Zone */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setResetModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="font-medium">Reset to Defaults</span>
              </button>
            </div>
          </Card>

          {/* Last Updated */}
          {settings.updatedAt && (
            <p className="text-xs text-gray-400 mt-3 px-2">
              Last updated: {new Date(settings.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="p-6">
            {renderTabContent()}
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleReset}
        title="Reset All Settings?"
        message="This will reset all settings to their default values. This action cannot be undone."
        confirmText="Reset Settings"
        cancelText="Cancel"
        variant="danger"
        isLoading={resetLoading}
      />
    </div>
  );
}

// Main Export
export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminLayout>
        <SettingsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
