// C:\dev\highrise-pk\components\property\ReportListingModal.tsx

import { useMemo, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ShieldCheck } from "lucide-react";

type Reason =
  | "scam_suspicious"
  | "fake_images"
  | "incorrect_price"
  | "wrong_location"
  | "duplicate_listing"
  | "agent_not_owner"
  | "spam"
  | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "scam_suspicious", label: "Scam / Suspicious behavior" },
  { value: "fake_images", label: "Fake / misleading images" },
  { value: "incorrect_price", label: "Incorrect price" },
  { value: "wrong_location", label: "Wrong location" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "agent_not_owner", label: "Agent pretending to be owner" },
  { value: "spam", label: "Spam / irrelevant" },
  { value: "other", label: "Other" },
];

export default function ReportListingModal(props: {
  open: boolean;
  onClose: () => void;
  propertyId: string;

  // optional user identity (if logged in)
  reporterUserId?: string;
  reporterEmail?: string;
  reporterPhone?: string;
}) {
  const { open, onClose, propertyId, reporterUserId, reporterEmail, reporterPhone } = props;

  const [reason, setReason] = useState<Reason>("scam_suspicious");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState(reporterEmail || "");
  const [phone, setPhone] = useState(reporterPhone || "");

  // honeypot field (hidden)
  const [companyWebsite, setCompanyWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const canSubmit = useMemo(() => {
    const d = details.trim();
    return d.length >= 10 && !loading;
  }, [details, loading]);

  if (!open) return null;

  const submit = async () => {
    try {
      setLoading(true);
      setErr("");
      setOkMsg("");

      const payload = {
        entityId: propertyId,
        reason,
        details,
        reporterUserId: reporterUserId || "",
        reporterEmail: email || "",
        reporterPhone: phone || "",
        companyWebsite, // honeypot
      };

      const resp = await axios.post("/api/reports/property", payload);

      if (resp?.data?.ok) {
        setOkMsg(resp.data.message || "Report submitted.");
        setDetails("");
      } else {
        setErr(resp?.data?.error || "Unable to submit report");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Unable to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <Card className="relative w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800">Report this listing</h3>
            <p className="text-xs text-gray-500 mt-1">
              Help keep Highrise.pk safe. We review reports and take action if needed.
            </p>
          </div>
        </div>

        {/* Honeypot (hidden) */}
        <input
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as Reason)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#029bba]/30"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Details (required)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Explain what seems wrong. Include any evidence (e.g., seller asked for advance payment, fake photos, wrong location, etc.)."
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#029bba]/30"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 10 characters.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#029bba]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone (optional)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92..."
                className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#029bba]/30"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">
              We don’t show your identity to the seller. If we need more info, we may contact you.
            </p>
          </div>

          {err ? <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">{err}</div> : null}
          {okMsg ? <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700">{okMsg}</div> : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
