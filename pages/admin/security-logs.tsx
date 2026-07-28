import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Search, Filter, RefreshCw } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";

type SecurityItem = {
  _id: string;
  createdAt: string;
  type: string;
  email: string;
  role: string;
  ipHashShort: string;
  uaHashShort: string;
  metadata: Record<string, any>;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req as any, ctx.res as any, authOptions);
  const role = (session as any)?.user?.role;

  // SSR hard gate
  if (!session || role !== "admin") {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  // No-store headers
  ctx.res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  ctx.res.setHeader("Pragma", "no-cache");
  ctx.res.setHeader("Expires", "0");

  return { props: {} };
};

export default function AdminSecurityLogsPage() {
  const [items, setItems] = useState<SecurityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [type, setType] = useState("all");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (email.trim()) params.set("email", email.trim().toLowerCase());
    if (type !== "all") params.set("type", type);
    if (role !== "all") params.set("role", role);

    return params.toString();
  }, [email, type, role, page]);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/security-events?${query}`);
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load security logs");
      }

      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load security logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <AdminLayout>
      <Head>
        <title>Security Logs | Admin | Highrise</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              Security Logs
            </h1>
            <p className="text-gray-600 text-sm">
              Admin-only audit feed (hashed IP/UA). Use filters to investigate incidents.
            </p>
          </div>

          <button
            onClick={() => fetchLogs()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Search by email</label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => {
                    setPage(1);
                    setEmail(e.target.value);
                  }}
                  placeholder="e.g. user@email.com"
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={type}
                  onChange={(e) => {
                    setPage(1);
                    setType(e.target.value);
                  }}
                  className="w-full outline-none text-sm bg-transparent"
                >
                  <option value="all">All</option>
                  <option value="login_success">login_success</option>
                  <option value="login_failed">login_failed</option>
                  <option value="account_locked">account_locked</option>
                  <option value="password_change">password_change</option>
                  <option value="role_change">role_change</option>
                  <option value="verification_update">verification_update</option>
                  <option value="2fa_enabled">2fa_enabled</option>
                  <option value="2fa_disabled">2fa_disabled</option>
                  <option value="developer_approved">developer_approved</option>
                  <option value="developer_rejected">developer_rejected</option>
                  <option value="account_suspended">account_suspended</option>
                  <option value="account_activated">account_activated</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Role</label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={role}
                  onChange={(e) => {
                    setPage(1);
                    setRole(e.target.value);
                  }}
                  className="w-full outline-none text-sm bg-transparent"
                >
                  <option value="all">All</option>
                  <option value="user">user</option>
                  <option value="reader">reader</option>
                  <option value="writer">writer</option>
                  <option value="editor">editor</option>
                  <option value="developer">developer</option>
                  <option value="agent">agent</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">
              Latest Events
            </div>
            <div className="text-xs text-gray-500">
              Showing {items.length} items
            </div>
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="p-6 text-sm text-gray-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No events found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((e) => (
                <div key={e._id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {e.type}
                      </span>
                      {e.role ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700">
                          {e.role}
                        </span>
                      ) : null}
                      {e.email ? (
                        <span className="text-xs text-gray-700 font-mono truncate max-w-[260px]">
                          {e.email}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-gray-500 font-mono">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-3">
                    <span className="font-mono">ip: {e.ipHashShort || "-"}</span>
                    <span className="font-mono">ua: {e.uaHashShort || "-"}</span>
                  </div>

                  {e.metadata && Object.keys(e.metadata).length > 0 ? (
                    <pre className="mt-3 text-[11px] bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-2 rounded-xl text-sm border ${
                page <= 1 || loading
                  ? "bg-gray-50 text-gray-400 border-gray-100"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              }`}
            >
              Prev
            </button>

            <div className="text-xs text-gray-500">Page {page}</div>

            <button
              disabled={loading || items.length < limit}
              onClick={() => setPage((p) => p + 1)}
              className={`px-3 py-2 rounded-xl text-sm border ${
                loading || items.length < limit
                  ? "bg-gray-50 text-gray-400 border-gray-100"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              }`}
            >
              Next
            </button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
