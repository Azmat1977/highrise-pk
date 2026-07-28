import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { RefreshCcw, ShieldAlert, AlertTriangle, Users } from "lucide-react";

type Row = {
  developerId: string;
  properties30d: number;
  flaggedOrHidden30d: number;
  avgRisk: number;
  maxRisk: number;
  suggestedSuspension: boolean;
};

export default function DeveloperHeatPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/developer-heat", {
        credentials: "include",
      });
      const data = await res.json();
      if (data?.ok) setRows(data.results || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-gray-700" />
              Moderation: Developer Fraud Heat
            </h1>
            <p className="text-sm text-gray-600">
              30-day view: average risk, max risk, and flagged/hidden volume. (Suggestion is review-only)
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Developer</th>
                  <th className="px-6 py-4">Props (30d)</th>
                  <th className="px-6 py-4">Flagged/Hidden (30d)</th>
                  <th className="px-6 py-4">Avg Risk</th>
                  <th className="px-6 py-4">Max Risk</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-500" colSpan={6}>
                      No developer data found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const max = Number(r.maxRisk || 0);
                    const avg = Number(r.avgRisk || 0);

                    const rowBg =
                      max >= 8 ? "bg-red-50" : avg >= 5 ? "bg-amber-50" : "hover:bg-gray-50";

                    return (
                      <tr key={r.developerId} className={`${rowBg} transition-colors`}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {String(r.developerId).slice(0, 10)}…
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1 font-mono">
                            {r.developerId}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700">{r.properties30d}</td>

                        <td className="px-6 py-4 text-sm text-gray-700">{r.flaggedOrHidden30d}</td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-100">
                            {avg}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold border ${
                              max >= 8
                                ? "bg-red-50 text-red-700 border-red-100"
                                : max >= 5
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-gray-50 text-gray-700 border-gray-100"
                            }`}
                          >
                            {max >= 8 ? (
                              <ShieldAlert className="w-3 h-3" />
                            ) : max >= 5 ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : null}
                            {max}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {r.suggestedSuspension ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-800">
                              <ShieldAlert className="w-4 h-4" />
                              Review suspension
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700">
                              Monitor
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
