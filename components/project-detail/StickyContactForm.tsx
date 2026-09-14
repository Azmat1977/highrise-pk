import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ShieldCheck, Loader2, Send } from 'lucide-react';

interface StickyContactFormProps {
  projectId: string;
  projectName: string;
  developerName?: string;
  developerPhone?: string;
  isVerified?: boolean;
}

export default function StickyContactForm({ 
  projectId, projectName, developerName, developerPhone, isVerified 
}: StickyContactFormProps) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: `I am interested in ${projectName} and would like to schedule a viewing. Please let me know when this would be possible.` });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please complete the security check.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'project',
          entityId: projectId,
          ...formData,
          turnstileToken: token
        }),
      });
      
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send inquiry.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden sticky top-20">
      
      {/* Header Info */}
      <div className="p-5 text-center border-b border-gray-100 bg-gray-50">
        <h3 className="font-bold text-gray-900 text-base mb-1">{developerName || 'Developer Sales Team'}</h3>
        <p className="text-[#029bba] font-bold text-lg mb-1">{developerPhone || 'Contact to Reveal'}</p>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-bold uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </span>
        )}
      </div>

      {/* Form */}
      {success ? (
        <div className="p-6 text-center">
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 mb-2">Inquiry Sent!</h4>
          <p className="text-sm text-gray-500">The developer team will contact you shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <input 
            type="text" required placeholder="Name"
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] outline-none" 
          />
          <input 
            type="tel" required placeholder="Phone"
            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] outline-none" 
          />
          <input 
            type="email" required placeholder="Email"
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] outline-none" 
          />
          <textarea 
            required rows={3}
            value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba] outline-none resize-none" 
          />
          
          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
          
          <div className="flex justify-center pt-2">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onSuccess={setToken}
              options={{ theme: 'light', size: 'flexible' }}
            />
          </div>

          <button 
            type="submit" disabled={loading || !token}
            className="w-full bg-[#df3a2c] hover:bg-[#c32f23] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Check Availability</>}
          </button>
          
          <p className="text-[10px] text-gray-400 text-center leading-relaxed mt-3">
            By clicking Check Availability, you agree to Highrise.pk's Terms of Use & Privacy Policy.
          </p>
        </form>
      )}
    </div>
  );
}