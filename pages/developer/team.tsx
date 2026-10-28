// pages/developer/team.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Crown,
  BadgeCheck,
  Lock,
  Eye,
  ArrowUp,
  ArrowDown,
  Save,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

type TeamRole = 'owner' | 'admin' | 'sales' | 'marketing' | 'support' | 'viewer';

interface TeamMember {
  _id:        string;
  name:       string;
  email:      string;
  phone?:     string;
  role:       TeamRole;
  isActive:   boolean;
  createdAt:  string;
  lastActive?: string;
}

interface BannerState {
  type:    'success' | 'error';
  message: string;
}

// ════════════════════════════════════════════════════
// ROLE CONFIG
// ════════════════════════════════════════════════════

const ROLE_OPTIONS: Array<{
  value: TeamRole;
  label: string;
  description: string;
  icon: React.ReactElement;
}> = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access — can manage everything',
    icon: <Crown className="w-4 h-4" />,
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage projects, units, leads',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    value: 'sales',
    label: 'Sales',
    description: 'Access leads and customer data',
    icon: <BadgeCheck className="w-4 h-4" />,
  },
  {
    value: 'marketing',
    label: 'Marketing',
    description: 'View analytics and campaign tools',
    icon: <Users className="w-4 h-4" />,
  },
  {
    value: 'support',
    label: 'Support',
    description: 'Assist customers and manage inquiries',
    icon: <Users className="w-4 h-4" />,
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access',
    icon: <Eye className="w-4 h-4" />,
  },
];

// ════════════════════════════════════════════════════
// BANNER
// ════════════════════════════════════════════════════

function Banner({ type, message, onDismiss }: BannerState & { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
      }
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MEMBER MODAL
// ════════════════════════════════════════════════════

function MemberModal({
  member,
  onSave,
  onClose,
  saving,
}: {
  member: Partial<TeamMember>;
  onSave: (data: Partial<TeamMember>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<TeamMember>>(member);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const updateField = (field: keyof TeamMember, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-[#004063] mb-5">
          {member._id ? 'Edit Team Member' : 'Add Team Member'}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <input
            type="text"
            value={form.name ?? ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Full Name"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />

          {/* Email */}
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Email Address"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />

          {/* Phone */}
          <input
            type="text"
            value={form.phone ?? ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="Phone (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />

          {/* Role */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Role
            </p>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.value}
                  onClick={() => updateField('role', role.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2
                              transition-all text-left
                              ${form.role === role.value
                                ? 'border-[#029bba] bg-[#029bba]/5'
                                : 'border-gray-100 hover:border-gray-200'
                              }`}
                >
                  <div className={`p-1.5 rounded-lg
                                   ${form.role === role.value
                                     ? 'bg-[#029bba] text-white'
                                     : 'bg-gray-100 text-gray-400'
                                   }`}>
                    {role.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-bold
                                   ${form.role === role.value
                                     ? 'text-[#029bba]'
                                     : 'text-gray-700'
                                   }`}>
                      {role.label}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {role.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#029bba]
                         focus:ring-[#029bba]"
            />
            <span className="text-xs font-semibold text-gray-600">
              Active Member
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.email || !form.role}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-sm font-semibold text-white
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function DeveloperTeamPage(): React.ReactElement {
  const { data: session } = useSession();

  const [members, setMembers]   = useState<TeamMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalMember, setModalMember] = useState<Partial<TeamMember> | null>(null);
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);
  const [banner, setBanner]     = useState<BannerState | null>(null);

  // ── Fetch members (placeholder API) ──
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/developer/team', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMembers(data.data?.members ?? []);
      }
    } catch {
      setBanner({ type: 'error', message: 'Team members load nahi ho sake.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ── Save member ──
  const handleSave = useCallback(async (member: Partial<TeamMember>) => {
    setSaving(true);
    try {
      const method = member._id ? 'PATCH' : 'POST';
      const res = await fetch('/api/developer/team', {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      const data = await res.json();
      if (data.success) {
        setBanner({ type: 'success', message: member._id ? 'Member updated' : 'Member added' });
        setModalMember(null);
        fetchMembers();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Save failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [fetchMembers]);

  // ── Delete member ──
  const handleDelete = useCallback(async () => {
    if (!deleteMember) return;
    setSaving(true);
    try {
      const res = await fetch('/api/developer/team', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: deleteMember._id }),
      });
      const data = await res.json();
      if (data.success) {
        setBanner({ type: 'success', message: 'Member removed' });
        setDeleteMember(null);
        fetchMembers();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  }, [deleteMember, fetchMembers]);

  return (
    <DeveloperLayout>
      <Head>
        <title>Team Management | Highrise.pk Developer</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#029bba]" />
          Team Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your team members and assign roles for project access
        </p>
      </div>

      {/* Add button */}
      <div className="mb-6">
        <button
          onClick={() => setModalMember({ isActive: true, role: 'viewer' })}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#029bba] to-[#027a94]
                     text-white text-sm font-semibold
                     hover:from-[#02a8c9] hover:to-[#028aaa]
                     hover:shadow-lg transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && members.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            No Team Members
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Add team members to delegate tasks — sales, marketing, support, and more.
          </p>
          <button
            onClick={() => setModalMember({ isActive: true, role: 'viewer' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-white text-sm font-semibold
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Member
          </button>
        </div>
      )}

      {/* Members list */}
      {!loading && members.length > 0 && (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                         hover:border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[#029bba]/10
                                flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-black text-[#029bba]">
                    {member.name?.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm text-gray-900">
                      {member.name}
                    </h3>
                    {!member.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500
                                       text-[9px] font-bold">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {member.phone}
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div className="mt-2">
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100
                                     text-[10px] font-bold text-gray-600 flex items-center gap-1 w-fit">
                      {ROLE_OPTIONS.find((r) => r.value === member.role)?.icon}
                      {ROLE_OPTIONS.find((r) => r.value === member.role)?.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalMember(member)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400
                               hover:text-[#029bba] transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => setDeleteMember(member)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400
                                 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member modal */}
      {modalMember && (
        <MemberModal
          member={modalMember}
          onSave={handleSave}
          onClose={() => setModalMember(null)}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      {deleteMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setDeleteMember(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-gray-800 mb-1">
              Remove {deleteMember.name}?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Is member ka access remove ho jaye ga. Agar yeh active deals handle kar rahe hain
              toh ensure karein koi aur member assign ho.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteMember(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                           text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-red-500 text-white text-sm font-semibold
                           hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </DeveloperLayout>
  );
}