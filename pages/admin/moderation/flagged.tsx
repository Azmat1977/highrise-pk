import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  ShieldAlert,
  RefreshCcw,
  Eye,
  Undo2,
  Filter,
  AlertTriangle,
} from "lucide-react";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Item = {
  _id: string;
  title?: string;
  slug?: string;
  city?: string;
  society?: string;
  price?: number;

  isDeleted?: boolean;
  deletedAt?: string | null;

  isFlagged?: boolean;
  flagReason?: string | null;
  flaggedAt?: string | null;

  // Phase 3.5
  riskScore?: number;
  riskLevel?: RiskLevel;
  uniqueIpCount24h?: number;
  reportsTotal?: number;

  updatedAt?: string;
};

const PRIMARY_COLOR = "#029bba";

function riskBadge(level?: RiskLevel, score?: number) {
  const s = Number(score || 0);
  const lv = (level || "LOW") as RiskLevel;
  const base =
    "inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold border";

  if (lv === "CRITICAL")
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-100`}>
        <ShieldAlert className="w-3 h-3" /> {s} • CRITICAL
      </span>
    );

  if (lv === "HIGH")
    return (
      <span className={`${base} bg-amber-50 text-amber-700 border-amber-100`}>
        <AlertTriangle className="w-3 h-3" /> {s} • HIGH
      </span>
    );

  if (lv === "MEDIUM")
    return (
      <span className={`${base} bg-yellow-50 text-yellow-700 border-yellow-100`}>
        <AlertTriangle className="w-3 h-3" /> {s} • MEDIUM
      </span>
    );

  return (
    <span className={`${base} bg-slate-50 text-slate-700 border-slate-100`}>
      {s} • LOW
    </span>
  );
}

function ipPill(n?: number) {
  const v = Number(n || 0);
  const base =
    "inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border";

  if (v >= 5)
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-100`}>
        {v} IPs (24h)
      </span>
    );
  if (v >= 3)
    return (
      <span className={`${base} bg-amber-50 text-amber-700 border-amber-100`}>
        {v} IPs (24h)
      </span>
    );
  if (v >= 1)
    return (
      <span className={`${base} bg-gray-50 text-gray-700 border-gray-100`}>
        {v} IP (24h)
      </span>
    );

  return (
    <span className={`${base} bg-gray-50 text-gray-500 border-gray-100`}>
      0 IPs (24h)
    </span>
  );
}

export default function FlaggedModerationPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [show, setShow] = useState<
    "flagged_or_hidden" | "flagged" | "hidden"
  >("flagged_or_hidden");

  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total]
  );

  const load = async () => {
    setLoading(true);
    try {
      const filter =
        show === "flagged_or_hidden"
          ? "both"
          : show === "flagged"
          ? "flagged"
          : "hidden";

      const res = await fetch(
        `/api/admin/moderation/flagged?filter=${filter}&page=${page}&limit=${limit}`,
        { credentials: "include" }
      );

      const data = await res.json();

      if (data?.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [show, page]);

  const restoreProperty = async (propertyId: string) => {
    setRestoringId(propertyId);
    try {
      const note =
        prompt("Optional note for audit log (reason for restore):") || "";

      const res = await fetch(
        "/api/admin/moderation/update-property-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            propertyId,
            action: "restore",
            note,
          }),
        }
      );

      const data = await res.json();

      if (data?.ok) {
        await load();
        window.dispatchEvent(new CustomEvent("refreshAdminStats"));
      } else {
        alert(data?.error || "Failed to restore");
      }
    } catch {
      alert("Failed to restore");
    } finally {
      setRestoringId(null);
    }
  };

  const clearFlagOnly = async (propertyId: string) => {
    setRestoringId(propertyId);
    try {
      const note = prompt("Optional note (why clearing flag?):") || "";

      const res = await fetch(
        "/api/admin/moderation/update-property-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            propertyId,
            action: "unflag",
            note,
          }),
        }
      );

      const data = await res.json();

      if (data?.ok) {
        await load();
        window.dispatchEvent(new CustomEvent("refreshAdminStats"));
      } else {
        alert(data?.error || "Failed to clear flag");
      }
    } catch {
      alert("Failed to clear flag");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Moderation: Flagged / Hidden Listings
            </h1>
            <p className="text-sm text-gray-600">
              Risk intelligence + auto protection queue.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4" />
              <select
                value={show}
                onChange={(e) => {
                  setPage(1);
                  setShow(e.target.value as any);
                }}
                className="ml-2 px-3 py-2 rounded-xl border border-gray-200"
              >
                <option value="flagged_or_hidden">
                  Flagged OR Hidden
                </option>
                <option value="flagged">Flagged only</option>
                <option value="hidden">Hidden only</option>
              </select>
            </div>

            <div className="text-xs text-gray-500">
              Total: <b>{total}</b>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Listing</th>
                  <th className="px-6 py-4">Risk</th>
                  <th className="px-6 py-4">Unique IPs (24h)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-sm text-gray-500"
                    >
                      No items in queue.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => {
                    const riskScore = Number(it.riskScore || 0);
                    const isHighRisk = riskScore >= 5;
                    const isCritical = riskScore >= 8;

                    const isHidden = Boolean(it.isDeleted);
                    const isFlagged = Boolean(it.isFlagged);

                    return (
                      <tr
                        key={it._id}
                        className={`${
                          isCritical
                            ? "bg-red-50"
                            : isHighRisk
                            ? "bg-amber-50"
                            : "hover:bg-gray-50"
                        } transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold">
                            {it.title || "Untitled"}
                            {isCritical && (
                              <span className="ml-2 text-red-700 text-xs font-bold">
                                🚨 HIGH RISK
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {it.city || "-"} • PKR{" "}
                            {(it.price || 0).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {riskBadge(it.riskLevel, it.riskScore)}
                        </td>

                        <td className="px-6 py-4">
                          {ipPill(it.uniqueIpCount24h)}
                          <div className="mt-2 text-xs text-gray-500">
                            {Number(it.reportsTotal || 0)} reports
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {isHidden ? "Hidden" : isFlagged ? "Flagged" : "Review"}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700">
                          {it.flagReason || "No reason saved"}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {it.slug && (
                              <Link
                                href={`/property/${it.slug}`}
                                target="_blank"
                                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold"
                              >
                                <Eye className="w-4 h-4 inline mr-1" />
                                View
                              </Link>
                            )}

                            <button
                              onClick={() => restoreProperty(it._id)}
                              disabled={restoringId === it._id}
                              className="px-3 py-2 rounded-xl bg-[#029bba] text-white text-xs font-semibold"
                            >
                              <Undo2 className="w-4 h-4 inline mr-1" />
                              Restore
                            </button>

                            {isFlagged && !isHidden && (
                              <button
                                onClick={() => clearFlagOnly(it._id)}
                                className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200"
                              >
                                Clear Flag
                              </button>
                            )}
                          </div>
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
