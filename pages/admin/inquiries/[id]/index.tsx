"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  CheckCircle2,
  Mail,
  Sparkles,
  Clock,
  PhoneCall,
  CalendarClock,
  XCircle,
  Ban,
  type LucideIcon,
} from "lucide-react";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  property?: {
    _id: string;
    title: string;
    price?: number;
    location?: string;
  };
  propertyTitle?: string;
  status:
    | "new"
    | "pending"
    | "contacted"
    | "scheduled"
    | "resolved"
    | "closed"
    | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  assignedTo?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  statusHistory?: Array<{
    status: string;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>;
}

type SuccessDialogState = {
  open: boolean;
  title: string;
  description: string;
};

type StatusHistoryEntry = NonNullable<Inquiry["statusHistory"]>[number];

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    badgeClasses: string;
  }
> = {
  new: {
    label: "New",
    icon: Sparkles,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badgeClasses: "bg-blue-100 text-blue-800",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    badgeClasses: "bg-amber-100 text-amber-800",
  },
  contacted: {
    label: "Contacted",
    icon: PhoneCall,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    badgeClasses: "bg-indigo-100 text-indigo-800",
  },
  scheduled: {
    label: "Scheduled",
    icon: CalendarClock,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    badgeClasses: "bg-purple-100 text-purple-800",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badgeClasses: "bg-emerald-100 text-emerald-800",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    badgeClasses: "bg-gray-100 text-gray-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    badgeClasses: "bg-red-100 text-red-800",
  },
  email_sent: {
    label: "Email Sent",
    icon: Mail,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    badgeClasses: "bg-sky-100 text-sky-800",
  },
};

const getStatusConfig = (status: string) => {
  if (STATUS_CONFIG[status]) return STATUS_CONFIG[status];

  const label =
    status && typeof status === "string"
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Update";

  return {
    label,
    icon: Clock,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-500",
    badgeClasses: "bg-gray-100 text-gray-700",
  };
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  let dayPart: string;
  if (isSameDay(date, now)) {
    dayPart = "Today";
  } else if (isSameDay(date, yesterday)) {
    dayPart = "Yesterday";
  } else {
    dayPart = date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dayPart}, ${timePart}`;
};

const getTimelineTitle = (
  entry: StatusHistoryEntry,
  index: number
): string => {
  const config = getStatusConfig(entry.status);

  if (entry.status === "email_sent") {
    return "Email Sent to Customer";
  }

  if (index === 0 && entry.status === "new") {
    return "Inquiry created (New)";
  }

  return `Status changed to ${config.label}`;
};

export default function InquiryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const inquiryId = typeof id === 'string' ? id : '';

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    status: "",
    assignedTo: "",
    followUpDate: "",
    notes: "",
    priority: "medium",
  });

  // Email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: "",
    message: "",
    adminEmail: "info@highrise.pk",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // ✅ Centered success dialog
  const [successDialog, setSuccessDialog] = useState<SuccessDialogState>({
    open: false,
    title: "",
    description: "",
  });

  // ✅ Track that we've already auto-opened email from query
  const [hasOpenedEmailFromQuery, setHasOpenedEmailFromQuery] =
    useState(false);

    useEffect(() => {
    if (inquiryId) {
      fetchInquiry();
    }
  }, [inquiryId]);

  // URL se ?openEmail=1 sirf pehli dafa use karo, phir param hata do
  useEffect(() => {
    if (!inquiry) return;
    if (typeof window === "undefined") return;
    if (hasOpenedEmailFromQuery) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("openEmail") === "1") {
      setEmailModalOpen(true);
      setHasOpenedEmailFromQuery(true);

      // URL se query param remove kar dein taa ke dobara trigger na ho
      router.replace(`/admin/inquiries/${id}`);
    }
  }, [inquiry, hasOpenedEmailFromQuery, id, router]);

  const fetchInquiry = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch inquiry: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setInquiry(data.data);
        setFormData({
          status: data.data.status,
          assignedTo: data.data.assignedTo || "",
          followUpDate: data.data.followUpDate
            ? new Date(data.data.followUpDate)
                .toISOString()
                .split("T")[0]
            : "",
          notes: data.data.notes || "",
          priority: data.data.priority || "medium",
        });
      } else {
        throw new Error(data.error || "Inquiry not found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load inquiry"
      );
      console.error("Error fetching inquiry:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInquiry = async () => {
    if (!inquiry) return;

    try {
      const updateData = {
        status: formData.status,
        assignedTo: formData.assignedTo || undefined,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes || undefined,
        priority: formData.priority,
      };

      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessDialog({
          open: true,
          title: "Inquiry updated successfully",
          description:
            "Your changes to this inquiry have been saved. You can continue managing the customer or close this dialog.",
        });
        setEditMode(false);
        await fetchInquiry();
      } else {
        setBanner({ message: data.error || "Failed to update inquiry.", type: "error" });
      }
    } catch (err) {
      console.error("Error updating inquiry:", err);
      setBanner({ message: "Failed to update inquiry. Please try again.", type: "error" });
    }
  };

  const copyEmailToClipboard = () => {
    if (!inquiry) return;

    const propertyTitle =
      inquiry.property?.title || inquiry.propertyTitle || "Property";
    const currentDate = new Date().toLocaleDateString();

    const emailTemplate = `To: ${inquiry.email}
From: info@highrise.pk
Subject: Re: Your Inquiry - ${propertyTitle}
CC: info@highrise.pk
Date: ${currentDate}

Dear ${inquiry.name},

Thank you for contacting Highrise.pk regarding "${propertyTitle}".

We have received your inquiry dated ${new Date(
      inquiry.createdAt
    ).toLocaleDateString()}:

"${inquiry.message}"

We would be pleased to assist you with this property. Here are the next steps:

1. **Property Viewing:** We can schedule a visit at your convenience.
2. **Detailed Information:** We can provide floor plans, amenities list, and neighborhood details.
3. **Pricing & Payment:** We can discuss pricing options and payment plans.

Please let us know:
- Your preferred date/time for viewing
- Any specific questions you have
- Your contact number for faster communication

You can also visit our website for more properties: https://highrise.pk

Looking forward to assisting you.

Warm regards,
**Highrise.pk Customer Care**
📞 0300-1234567
📧 info@highrise.pk
🌐 https://highrise.pk
📍 DHA Phase 5, Lahore`;

    navigator.clipboard
      .writeText(emailTemplate)
      .then(() => {
        setBanner({
          message: "Professional email template copied. Paste it into your email client.",
          type: "success"
        });
      })
      .catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = emailTemplate;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setBanner({
          message: "Email template copied. Paste it into your email client.",
          type: "success"
        });
      });
  };

  const handleStatusChange = async (newStatus: Inquiry["status"]) => {
    if (!inquiry) return;

    if (newStatus === inquiry.status) {
      setBanner({ message: "Status is already up to date.", type: "success" });
      return;
    }

    if (
      !confirm(
        `Change status from "${inquiry.status}" to "${newStatus}"?`
      )
    ) {
      return;
    }

    try {
      const statusButton = document.querySelector(
        `[data-status="${newStatus}"]`
      );
      if (statusButton) {
        statusButton.innerHTML = "Updating...";
        (statusButton as HTMLButtonElement).disabled = true;
      }

      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInquiry((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                updatedAt: new Date().toISOString(),
                statusHistory:
                  data.data?.statusHistory || prev.statusHistory,
              }
            : null
        );

        setSuccessDialog({
          open: true,
          title: "Status updated",
          description: `Inquiry status has been changed to "${newStatus}" for this customer.`,
        });
      } else {
        console.error("API Error:", data);
        setBanner({
          message: data.error || data.message || "Failed to update status.",
          type: "error"
        });
        await fetchInquiry();
      }
    } catch (err) {
      console.error("Status update error:", err);
      setBanner({ message: "Failed to update status. Please try again.", type: "error" });
      await fetchInquiry();
    }
  };

  const sendEmailToCustomer = async () => {
    if (!inquiry || !emailData.subject || !emailData.message) {
      setBanner({ message: "Please enter both subject and message before sending.", type: "error" });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(
        `/api/inquiries/${inquiryId}/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessDialog({
          open: true,
          title: "Email sent successfully",
          description: `We have sent an email to ${inquiry.email}. If the customer does not see this email in their Inbox, please ask them to also check their Spam or Promotions folder.`,
        });

        setEmailModalOpen(false);
        setEmailData({
          subject: "",
          message: "",
          adminEmail: "info@highrise.pk",
        });
        await fetchInquiry();
      } else {
        setBanner({
          message: data.message || data.error || "Failed to send email. Please try again.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("Email send error:", err);
      setBanner({
        message: "Failed to send email. Please check your connection and try again.",
        type: "error"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Email templates
  const emailTemplates = [
    {
      name: "Initial Response",
      subject: "Thank you for your inquiry - Highrise.pk",
      message: `Thank you for contacting Highrise.pk regarding your property inquiry.

We have received your request and one of our representatives will contact you within 24 hours to discuss your requirements in detail.

In the meantime, you can browse more properties on our website: https://highrise.pk

Best regards,`,
    },
    {
      name: "Schedule Viewing",
      subject: "Schedule a Property Viewing - Highrise.pk",
      message: `Thank you for your interest in our property.

We would be happy to schedule a viewing at your convenience. Please let us know your preferred date and time from the following options:

1. Morning (9 AM - 12 PM)
2. Afternoon (2 PM - 5 PM)
3. Evening (6 PM - 8 PM)

You can also call us directly at 0300-1234567 to schedule immediately.

Looking forward to assisting you.`,
    },
    {
      name: "Follow-up",
      subject: "Follow-up on your inquiry - Highrise.pk",
      message: `This is a follow-up regarding your recent inquiry with Highrise.pk.

We wanted to check if you have any further questions or if you would like to proceed with scheduling a viewing.

Please feel free to contact us for any additional information you may need.

Best regards,`,
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-primary hover:text-secondary"
            >
              ← Back to Inquiries
            </button>
          </div>
          <div className="text-center py-10">
            Loading inquiry details...
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !inquiry) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-primary hover:text-secondary"
            >
              ← Back to Inquiries
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-xl font-bold text-red-800 mb-2">
              Error
            </h1>
            <p className="text-red-600">
              {error || "Inquiry not found"}
            </p>
            <button
              onClick={() => router.push("/admin/inquiries")}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Back to Inquiries List
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-primary hover:text-secondary"
          >
            <span className="mr-2">←</span>
            Back to Inquiries
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Inquiry Management
            </h1>
            <p className="text-gray-600">
              ID: {inquiry._id.substring(0, 8)}...
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setEmailModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Send Email to Customer
            </button>

            <button
              onClick={copyEmailToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Email Template
            </button>

            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 ${
                editMode ? "bg-gray-600" : "bg-yellow-600"
              } text-white rounded hover:opacity-90 flex items-center gap-2`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {editMode ? "Cancel Edit" : "Edit Inquiry"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer & Property Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                <span>Customer Information</span>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    inquiry.status === "new"
                      ? "bg-blue-100 text-blue-800"
                      : inquiry.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : inquiry.status === "contacted"
                      ? "bg-green-100 text-green-800"
                      : inquiry.status === "scheduled"
                      ? "bg-purple-100 text-purple-800"
                      : inquiry.status === "resolved"
                      ? "bg-emerald-100 text-emerald-800"
                      : inquiry.status === "closed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {inquiry.status
                    ?.charAt(0)
                    ?.toUpperCase() + inquiry.status?.slice(1)}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {inquiry.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Email Address
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {inquiry.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Phone Number
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {inquiry.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Assigned To
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {inquiry.assignedTo ? (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {inquiry.assignedTo}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">
                        Not assigned
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Priority
                  </label>
                  <p
                    className={`mt-1 text-lg font-medium ${
                      inquiry.priority === "high" ||
                      inquiry.priority === "urgent"
                        ? "text-red-600"
                        : inquiry.priority === "medium"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {inquiry.priority
                      ?.charAt(0)
                      ?.toUpperCase() + inquiry.priority?.slice(1)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Inquiry Date
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {new Date(inquiry.createdAt).toLocaleDateString()} at{" "}
                    {new Date(
                      inquiry.createdAt
                    ).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Property Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Property Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Property Title
                  </label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {inquiry.property?.title ||
                      inquiry.propertyTitle ||
                      "Property information not available"}
                  </p>
                  {inquiry.property?.price && (
                    <p className="mt-1 text-sm text-gray-600">
                      Price: Rs.{" "}
                      {inquiry.property.price.toLocaleString()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Customer Message
                  </label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {inquiry.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status History Card (polished timeline) */}
            {inquiry.statusHistory &&
              inquiry.statusHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Status & Email Timeline
                  </h2>
                  <div className="space-y-4">
                    {inquiry.statusHistory.map(
                      (history, index) => {
                        const config = getStatusConfig(history.status);
                        const Icon = config.icon;
                        const isEmailEvent =
                          history.status === "email_sent";
                        const isLast =
                          index ===
                          inquiry.statusHistory!.length - 1;

                        return (
                          <div
                            key={index}
                            className="relative flex gap-4"
                          >
                            {/* Timeline icon + connector */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor} ring-4 ring-white shadow-sm`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              {!isLast && (
                                <div className="mt-1 h-full w-px bg-gray-200" />
                              )}
                            </div>

                            {/* Content card */}
                            <div
                              className={`flex-1 rounded-lg border p-3 sm:p-4 ${
                                isEmailEvent
                                  ? "bg-sky-50 border-sky-100"
                                  : "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm sm:text-base font-medium text-gray-900">
                                  {getTimelineTitle(
                                    history,
                                    index
                                  )}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(
                                    history.changedAt
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${config.badgeClasses}`}
                                >
                                  {isEmailEvent
                                    ? "Email"
                                    : config.label}
                                </span>
                                {history.changedBy && (
                                  <span className="text-gray-500">
                                    by{" "}
                                    <span className="font-medium text-gray-700">
                                      {history.changedBy}
                                    </span>
                                  </span>
                                )}
                              </div>

                              {history.notes && (
                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                                  <span className="font-medium text-gray-800">
                                    {isEmailEvent
                                      ? "Subject / Notes: "
                                      : "Notes: "}
                                  </span>
                                  {history.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Right Column - Management Tools */}
          <div className="space-y-6">
            {/* Status Management Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Status Management
              </h2>

              <div className="space-y-3">
                {([
                  "new",
                  "pending",
                  "contacted",
                  "scheduled",
                  "resolved",
                  "closed",
                  "cancelled",
                ] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={inquiry.status === status}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      inquiry.status === status
                        ? "bg-primary text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">
                        {status}
                      </span>
                      {inquiry.status === status && (
                        <span className="text-sm">
                          ✓ Current
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Form Card */}
            {editMode && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Edit Inquiry Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="new">New</option>
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To Admin
                    </label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignedTo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Select Admin --</option>
                      <option value="admin@highrise.pk">
                        Admin (admin@highrise.pk)
                      </option>
                      <option value="sales@highrise.pk">
                        Sales Team (sales@highrise.pk)
                      </option>
                      <option value="support@highrise.pk">
                        Support Team (support@highrise.pk)
                      </option>
                      <option value="manager@highrise.pk">
                        Manager (manager@highrise.pk)
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Or type custom email below
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Assignment
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignedTo: e.target.value,
                        })
                      }
                      placeholder="Enter admin name or email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          followUpDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Add internal notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    onClick={handleUpdateInquiry}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Quick Stats
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Inquiry Age</span>
                  <span className="font-medium">
                    {Math.floor(
                      (new Date().getTime() -
                        new Date(
                          inquiry.createdAt
                        ).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Priority</span>
                  <span
                    className={`font-medium ${
                      inquiry.priority === "high" ||
                      inquiry.priority === "urgent"
                        ? "text-red-600"
                        : inquiry.priority === "medium"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {inquiry.priority
                      ?.charAt(0)
                      ?.toUpperCase() + inquiry.priority?.slice(1)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned To</span>
                  <span className="font-medium">
                    {inquiry.assignedTo || "Not assigned"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium">
                    {new Date(
                      inquiry.updatedAt
                    ).toLocaleDateString()}
                  </span>
                </div>

                {inquiry.followUpDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Follow-up Date
                    </span>
                    <span className="font-medium">
                      {new Date(
                        inquiry.followUpDate
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {emailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Send Email to Customer
                  </h3>
                  <button
                    onClick={() => setEmailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Email Templates */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Quick Templates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {emailTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          setEmailData({
                            ...emailData,
                            subject: template.subject,
                            message: template.message,
                          })
                        }
                        className="text-left p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          {template.subject}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={emailData.adminEmail}
                      onChange={(e) =>
                        setEmailData({
                          ...emailData,
                          adminEmail: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) =>
                        setEmailData({
                          ...emailData,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Email subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To (Customer)
                    </label>
                    <input
                      type="text"
                      value={`${inquiry.name} <${inquiry.email}>`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={emailData.message}
                      onChange={(e) =>
                        setEmailData({
                          ...emailData,
                          message: e.target.value,
                        })
                      }
                      rows={8}
                      placeholder="Type your email message here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                  <button
                    onClick={() => setEmailModalOpen(false)}
                    disabled={sendingEmail}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendEmailToCustomer}
                    disabled={
                      sendingEmail ||
                      !emailData.subject ||
                      !emailData.message
                    }
                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingEmail ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Centered success dialog for all actions */}
        {successDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                {successDialog.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {successDialog.description}
              </p>
              <button
                onClick={() =>
                  setSuccessDialog((prev) => ({ ...prev, open: false }))
                }
                className="mt-6 w-full px-4 py-2.5 rounded-md bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-medium shadow-sm transition-colors"
              >
                OK, got it
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}