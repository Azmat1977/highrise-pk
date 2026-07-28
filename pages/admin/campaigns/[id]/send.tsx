//C:\dev\highrise-pk\pages\admin\campaigns\[id]\send.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Send, 
  Mail, 
  Users, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

function SendCampaignContent() {
  const router = useRouter();
  const { id } = router.query;
  
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/newsletter/campaigns/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCampaign(data.campaign);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching campaign:', error);
        setLoading(false);
      });
  }, [id]);

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setSendingTest(true);

    try {
      const response = await fetch(`/api/newsletter/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmail('');
      } else {
        toast.error(data.message || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!confirm(`Are you sure you want to send this campaign to ${campaign.recipients.total} subscribers?`)) {
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/newsletter/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        router.push('/admin/campaigns');
      } else {
        toast.error(data.message || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
          <Link href="/admin/campaigns">
            <button className="px-6 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-medium transition-colors">
              Back to Campaigns
            </button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/campaigns" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Send Campaign</h1>
          <p className="text-gray-600">Review and send your email campaign</p>
        </div>

        {/* Campaign Summary */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Title:</span>
              <span className="font-medium text-gray-900">{campaign.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject:</span>
              <span className="font-medium text-gray-900">{campaign.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Template:</span>
              <span className="font-medium text-gray-900">{campaign.template}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recipients:</span>
              <span className="font-medium text-[#029bba]">{campaign.recipients.total} subscribers</span>
            </div>
          </div>
        </Card>

        {/* Test Email */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-[#029bba]" />
            Send Test Email
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Send a test email to yourself before sending to all subscribers
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] outline-none"
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail}
              className="px-6 py-2 rounded-xl border border-[#029bba] text-[#029bba] font-medium hover:bg-[#029bba]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Test
            </button>
          </div>
        </Card>

        {/* Warning */}
        <Card className="p-6 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Before You Send</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>✓ Send a test email and review it carefully</li>
                <li>✓ Check all links and images are working</li>
                <li>✓ Verify the subject line and preview text</li>
                <li>✓ Confirm the recipient count is correct</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Send Button */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready to Send?</h2>
          <p className="text-gray-600 mb-6">
            This will send the campaign to <strong className="text-[#029bba]">{campaign.recipients.total} active subscribers</strong>. 
            This action cannot be undone.
          </p>
          
          <button
            onClick={handleSendCampaign}
            disabled={sending}
            className="w-full px-6 py-3.5 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending Campaign...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Campaign to All Subscribers
              </>
            )}
          </button>
        </Card>
      </div>
    </div>
  );
}

export default function SendCampaignPage() {
  return (
    <AdminGuard>
      <SendCampaignContent />
    </AdminGuard>
  );
}