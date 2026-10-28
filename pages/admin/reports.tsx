// pages/admin/reports.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Search, RefreshCw, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';

type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'rejected';

type ReportRow = {
  _id: string;
  entityType: 'property';
  entityId: string;
  reason: string;
  details: string;
  reporterEmail?: string;
  reporterPhone?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

const PRIMARY = '#029bba';

const reasonLabel = (r: string) => {
  const map: Record<string, string> = {
    scam_suspicious: 'Scam / Suspicious',
    fake_images: 'Fake Images',
    incorrect_price: 'Incorrect Price',
    wrong_location: 'Wrong Location',
    duplicate_listing: 'Duplicate Listing',
    agent_not_owner: 'Agent Not Owner',
    spam: 'Spam',
    other: 'Other',
  };
  return map[r] || r;
};

const formatDateTime = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleString('en-PK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function AdminReportsPage() {
  const router = useRouter();

  const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Read initial status from query (deep link support)
  useEffect(() => {
    if (!router.isReady) return;
    const qs = router.query.status;
    if (typeof qs === 'string' && ['open', 'reviewing', 'resolved', 'rejected', 'all'].includes(qs)) {
      setStatus(qs as any);
    }
  }, [router.isReady, router.query.status]);

  const fetchReports = async (nextPage?: number) => {
    const p = nextPage || page;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (status !== 'all') params.set('status', status);
      if (q.trim()) params.set('q', q.trim());

      const res = await fetch(`/api/admin/reports?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (!data?.success) {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      setItems(data.reports || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      // Sync badges in AdminLayout (Trust-first UI)
      window.dispatchEvent(new Event('refreshAdminStats'));
    } catch (e) {
      console.error('Failed to load reports', e);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const statusPill = (s: ReportStatus) => {
    const base = 'px-2 py-1 rounded-full text-xs font-semibold border';
    if (s === 'open') return <span className={`${base} bg-red-50 text-red-700 border-red-100`}>Open</span>;
    if (s === 'reviewing') return <span className={`${base} bg-amber-50 text-amber-700 border-amber-100`}>Reviewing</span>;
    if (s === 'resolved') return <span className={`${base} bg-green-50 text-green-700 border-green-100`}>Resolved</span>;
    return <span className={`${base} bg-gray-50 text-gray-700 border-gray-200`}>Rejected</span>;
  };

  const changeStatus = async (id: string, next: ReportStatus) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      });

      const data = await res.json();
      if (!data?.success) return;

      // Refresh list
      await fetchReports(page);

      // Refresh sidebar badges
      window.dispatchEvent(new Event('refreshAdminStats'));
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-6 h-6" style={{ color: PRIMARY }} />
              Reports Inbox
            </h1>
            <p className="text-gray-600 text-sm">
              Trust-first moderation: review reported listings and take action.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchReports(page)}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['open', 'reviewing', 'resolved', 'rejected', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    status === s
                      ? 'bg-[#029bba] text-white border-[#029bba] shadow-lg shadow-[#029bba]/25'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search: reportId, propertyId, reason, email…"
                  className="w-full lg:w-[360px] pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                />
              </div>
              <Button onClick={() => fetchReports(1)} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Total: <span className="font-semibold">{total}</span>
            </p>
            <p className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Property</th>
                  <th className="px-5 py-4">Reporter</th>
                  <th className="px-5 py-4">Details</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4" colSpan={7}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-gray-500" colSpan={7}>
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {formatDateTime(r.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {reasonLabel(r.reason)}
                      </td>

                      <td className="px-5 py-4">
                        {statusPill(r.status)}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/property/${r.entityId}`}
                          target="_blank"
                          className="text-sm font-semibold text-[#029bba] hover:underline"
                        >
                          Open Listing
                        </Link>
                        <div className="text-[11px] text-gray-400 font-mono mt-1">
                          {r.entityId.slice(-8).toUpperCase()}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        <div className="text-xs text-gray-700">
                          {r.reporterEmail || '—'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {r.reporterPhone || ''}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        <div className="line-clamp-2 max-w-[360px]">
                          {r.details}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => changeStatus(r._id, 'reviewing')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1"
                            title="Mark Reviewing"
                          >
                            <Clock className="w-4 h-4" />
                            Review
                          </button>

                          <button
                            onClick={() => changeStatus(r._id, 'resolved')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                            title="Mark Resolved"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Resolve
                          </button>

                          <button
                            onClick={() => changeStatus(r._id, 'rejected')}
                            className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={!canPrev || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                fetchReports(next);
              }}
            >
              Prev
            </Button>

            <div className="text-xs text-gray-500">
              Showing <span className="font-semibold">{items.length}</span> of{' '}
              <span className="font-semibold">{total}</span>
            </div>

            <Button
              variant="outline"
              disabled={!canNext || loading}
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                fetchReports(next);
              }}
            >
              Next
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
