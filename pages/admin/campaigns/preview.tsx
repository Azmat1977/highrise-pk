//C:\dev\highrise-pk\pages\admin\campaigns\preview.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  Monitor, 
  Smartphone, 
  Tablet,
  Send,
  Loader2,
  Mail,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { Card } from '@/components/ui/card';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

function PreviewContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    // Get campaign data from URL query
    const { data } = router.query;
    
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data as string));
        setCampaignData(parsed);
        generatePreview(parsed);
      } catch (error) {
        console.error('Error parsing campaign data:', error);
        setBanner({ message: 'Invalid campaign data', type: 'error' });
      }
    }
    
    setLoading(false);
  }, [router.query]);

  const generatePreview = async (data: any) => {
    try {
      const response = await fetch('/api/newsletter/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: data.template,
          content: data.content,
          subject: data.subject,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setPreviewHtml(result.html);
      } else {
        // If API fails, show raw content
        setPreviewHtml(data.content || '<p>No content to preview</p>');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      // Fallback to raw content
      setPreviewHtml(data?.content || '<p>No content to preview</p>');
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setBanner({ message: 'Please enter a test email address', type: 'error' });
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(testEmail)) {
      setBanner({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setSendingTest(true);

    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${campaignData?.subject || 'Newsletter Preview'}`,
          template: campaignData?.template,
          content: campaignData?.content,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBanner({ message: `Test email sent to ${testEmail}`, type: 'success' });
        setTestEmail('');
      } else {
        setBanner({ message: data.message || 'Failed to send test email', type: 'error' });
      }
    } catch (error) {
      console.error('Error sending test:', error);
      setBanner({ message: 'Failed to send test email', type: 'error' });
    } finally {
      setSendingTest(false);
    }
  };

  const getDeviceWidth = () => {
    switch (device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Preview Data</h2>
            <p className="text-gray-600 mb-6">Please create a campaign first to preview it.</p>
            <Link href="/admin/campaigns/new">
              <button className="px-6 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-medium transition-colors">
                Create Campaign
              </button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative">
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/campaigns/new" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Email Preview</h1>
                <p className="text-sm text-gray-500">{campaignData.subject}</p>
              </div>
            </div>

            {/* Device Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-2 rounded-lg transition-all ${
                  device === 'desktop' 
                    ? 'bg-white shadow text-[#029bba]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Desktop"
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={() => setDevice('tablet')}
                className={`p-2 rounded-lg transition-all ${
                  device === 'tablet' 
                    ? 'bg-white shadow text-[#029bba]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Tablet"
              >
                <Tablet className="w-5 h-5" />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-2 rounded-lg transition-all ${
                  device === 'mobile' 
                    ? 'bg-white shadow text-[#029bba]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Mobile"
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Preview Panel */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              {/* Email Header Preview */}
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#029bba] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Highrise.pk</p>
                    <p className="text-sm text-gray-500">newsletter@highrise.pk</p>
                  </div>
                </div>
                <div className="pl-13">
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400">To:</span> subscriber@example.com
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    <span className="text-gray-400">Subject:</span> {campaignData.subject}
                  </p>
                </div>
              </div>

              {/* Email Content Preview */}
              <div 
                className="bg-gray-200 p-4 flex justify-center"
                style={{ minHeight: '600px' }}
              >
                <div 
                  className="bg-white shadow-lg transition-all duration-300"
                  style={{ 
                    width: getDeviceWidth(),
                    maxWidth: '100%',
                  }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: '600px' }}
                    title="Email Preview"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Campaign Info */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Campaign Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Title:</span>
                    <p className="font-medium text-gray-900">{campaignData.title || 'Untitled'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Template:</span>
                    <p className="font-medium text-gray-900 capitalize">
                      {campaignData.template?.replace('_', ' ') || 'Custom'}
                    </p>
                  </div>
                  {campaignData.scheduledFor && (
                    <div>
                      <span className="text-gray-500">Scheduled:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(campaignData.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Send Test Email */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Send className="w-4 h-4 mr-2 text-[#029bba]" />
                  Send Test Email
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a test email to preview how it looks in your inbox.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none text-sm"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </button>
                </div>
              </Card>

              {/* Actions */}
              <Card className="p-6">
                <div className="space-y-3">
                  <button
                    onClick={() => generatePreview(campaignData)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Preview
                  </button>
                  <Link href="/admin/campaigns/new" className="block">
                    <button className="w-full px-4 py-2.5 rounded-xl border border-[#029bba] text-[#029bba] font-medium hover:bg-[#029bba]/10 transition-colors">
                      Back to Editor
                    </button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignPreviewPage() {
  return (
    <AdminGuard>
      <PreviewContent />
    </AdminGuard>
  );
}
