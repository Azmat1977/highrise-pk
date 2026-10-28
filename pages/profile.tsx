// ========== FILE: pages/profile.tsx ==========
// Highrise.pk — User Profile Page
// V7.1.0 — Camera upload + all 5 upgrade options + owner status
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Home,
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  LayoutDashboard,
  Building2,
  Building,
  Users,
  Shield,
  Edit3,
  Save,
  X,
  Camera,
  Wrench,
  HardHat,
} from 'lucide-react';
import ProfileImageCropModal from '@/components/ProfileImageCropModal';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface ProfileForm {
  phone:       string;
  city:        string;
  country:     string;
  homeAddress: string;
}

interface Banner {
  type:    'success' | 'error' | '';
  message: string;
}

interface UpgradeOption {
  label:       string;
  description: string;
  href:        string;
  icon:        ReactElement;
  color:       string;
  bgColor:     string;
  soon?:       boolean;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function getInitial(name?: string | null, email?: string | null): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return 'U';
}

// ═══════════════════════════════════════════
// ROLE BADGE
// ═══════════════════════════════════════════

function RoleBadge({ role }: { role?: string }): ReactElement {
  const configs: Record<string, {
    label:     string;
    className: string;
    icon:      ReactElement;
  }> = {
    admin: {
      label: 'Admin',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    agent: {
      label: 'Verified Agent',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    developer: {
      label: 'Developer',
      className: 'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
      icon: <Building2 className="w-3.5 h-3.5" />,
    },
    society: {
      label: 'Society',
      className: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <Building className="w-3.5 h-3.5" />,
    },
    user: {
      label: 'User',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <User className="w-3.5 h-3.5" />,
    },
  };

  const config = configs[role ?? 'user'] ?? configs['user'];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
        'text-xs font-semibold border',
        config.className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════
// OWNER STATUS CARD
// ═══════════════════════════════════════════

function OwnerStatusCard({
  ownerStatus,
  isVerifiedOwner,
}: {
  ownerStatus?:     string;
  isVerifiedOwner?: boolean;
}): ReactElement | null {
  if (isVerifiedOwner) {
    return (
      <div className="flex items-center justify-between gap-4 p-4
                      bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Verified Owner
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Identity confirmed by Highrise.pk
            </p>
          </div>
        </div>
        <Link
          href="/owner/dashboard"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2
                     rounded-xl bg-emerald-600 text-white text-xs font-semibold
                     hover:bg-emerald-700 transition-colors"
        >
          Owner Portal
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (ownerStatus === 'pending') {
    return (
      <div className="flex items-start gap-3 p-4 border-l-4
                      border-[#029bba] bg-[#eff6ff] rounded-r-xl">
        <Clock className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#004063]">
            Verification Under Review
          </p>
          <p className="text-xs text-[#004063]/80 mt-1">
            Your documents are being reviewed. Usually 24–48 hours.
          </p>
          <Link
            href="/owner/verify"
            className="inline-flex items-center gap-1 mt-2 text-xs
                       font-semibold text-[#029bba] hover:underline"
          >
            Check Status
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (ownerStatus === 'rejected') {
    return (
      <div className="flex items-start gap-3 p-4 border-l-4
                      border-red-500 bg-red-50 rounded-r-xl">
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">
            Verification Not Approved
          </p>
          <p className="text-xs text-red-800 mt-1">
            You can resubmit your application.
          </p>
          <Link
            href="/owner/verify"
            className="inline-flex items-center gap-1 mt-2 text-xs
                       font-semibold text-red-900 hover:underline"
          >
            Resubmit Verification
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Not started
  return (
    <div className="flex items-center justify-between gap-4 p-4
                    bg-gray-50 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Not Verified Yet
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Verify your CNIC to list properties
          </p>
        </div>
      </div>
      <Link
        href="/owner/verify"
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2
                   rounded-xl bg-[#029bba] text-white text-xs font-semibold
                   hover:bg-[#027a94] transition-colors"
      >
        Verify Now
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════
// UPGRADE OPTIONS — ALL 5 ROLES
// ═══════════════════════════════════════════

const UPGRADE_OPTIONS: UpgradeOption[] = [
  {
    label: 'Become an Agent',
    description: 'Sell client properties professionally',
    href: '/onboarding/business',
    icon: <Users className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'hover:bg-orange-50 hover:border-orange-200',
  },
  {
    label: 'Become a Developer',
    description: 'Manage projects, units and installments',
    href: '/onboarding/developer',
    icon: <Building2 className="w-4 h-4" />,
    color: 'text-[#029bba]',
    bgColor: 'hover:bg-[#029bba]/5 hover:border-[#029bba]/30',
  },
  {
    label: 'Register a Society',
    description: 'Manage plots, blocks and NOC documents',
    href: '/onboarding/society',
    icon: <Building className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'hover:bg-purple-50 hover:border-purple-200',
  },
  {
    label: 'Service Provider',
    description: 'Vendors, contractors, factories, legal',
    href: '/coming-soon?feature=provider',
    icon: <Wrench className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'hover:bg-amber-50 hover:border-amber-200',
    soon: true,
  },
  {
    label: 'Skilled Labour',
    description: 'Mason, electrician, plumber, painter',
    href: '/coming-soon?feature=labour',
    icon: <HardHat className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'hover:bg-red-50 hover:border-red-200',
    soon: true,
  },
];

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function ProfilePage(): ReactElement {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();

  const [isEditing, setIsEditing]   = useState(false);
  const [saving,    setSaving]      = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [banner,    setBanner]      = useState<Banner>({ type: '', message: '' });

  // Full user data fetched from API (not from session)
  const [userData, setUserData] = useState<{
    name:                    string;
    email:                   string;
    ownerVerificationStatus: string;
    isVerifiedOwner:         boolean;
    profileChangeCount:      number;
    profileChangeLimit:      number;
    profileChangesRemaining: number;
    profileChangeLocked:     boolean;
  }>({
    name: '',
    email: '',
    ownerVerificationStatus: 'none',
    isVerifiedOwner: false,
    profileChangeCount: 0,
    profileChangeLimit: 2,
    profileChangesRemaining: 2,
    profileChangeLocked: false,
  });

  // Profile picture states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempProfileFile, setTempProfileFile] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl]     = useState<string>('');
  const [uploadingPic, setUploadingPic]       = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    phone:       '',
    city:        '',
    country:     'Pakistan',
    homeAddress: '',
  });

  // ── Fetch user data from API (not session) ───────────────
  const fetchUserData = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const res = await fetch('/api/user/me');
      const data = (await res.json()) as {
        success: boolean;
        user?: {
          name:                    string;
          email:                   string;
          phone:                   string;
          city:                    string;
          country:                 string;
          homeAddress:             string;
          profilePictureUrl:       string;
          ownerVerificationStatus: string;
          isVerifiedOwner:         boolean;
          profileChangeCount?:     number;
          profileChangeLimit?:     number;
          profileChangesRemaining?:number;
          profileChangeLocked?:    boolean;
        };
      };

      if (res.ok && data.success && data.user) {
        // Populate all fields from database
        setForm({
          phone:       data.user.phone,
          city:        data.user.city,
          country:     data.user.country || 'Pakistan',
          homeAddress: data.user.homeAddress,
        });
        setProfilePicUrl(data.user.profilePictureUrl);
        setUserData({
          name:                    data.user.name,
          email:                   data.user.email,
          ownerVerificationStatus: data.user.ownerVerificationStatus,
          isVerifiedOwner:         data.user.isVerifiedOwner,
          profileChangeCount:      data.user.profileChangeCount ?? 0,
          profileChangeLimit:      data.user.profileChangeLimit ?? 2,
          profileChangesRemaining: data.user.profileChangesRemaining ?? 2,
          profileChangeLocked:     data.user.profileChangeLocked ?? false,
        });
      }
    } catch {
      // Silent fail — session data used as fallback
    } finally {
      setLoadingUser(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchUserData();
  }, [fetchUserData]);

  // ── Auth guard ───────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.replace('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  // ── Role & owner status ──────────────────────────────────
  const role        = session?.user?.role;
  const isAdmin     = role === 'admin';
  const isAgent     = role === 'agent';
  const isDeveloper = role === 'developer';
  const isSociety   = role === 'society';
  const isBasicUser = !isAdmin && !isAgent && !isDeveloper && !isSociety;

  const portalLink =
    isAdmin     ? '/admin' :
    isAgent     ? '/agent/dashboard' :
    isDeveloper ? '/developer/dashboard' :
    isSociety   ? '/society/dashboard' :
    '/dashboard';

  const portalLabel =
    isAdmin     ? 'Admin Panel' :
    isAgent     ? 'Agent Dashboard' :
    isDeveloper ? 'Developer Dashboard' :
    isSociety   ? 'Society Dashboard' :
    'My Dashboard';

  // Use fresh data from API (session may not have these fields)
  const isVerifiedOwner = userData.isVerifiedOwner;
  const ownerStatus     = userData.ownerVerificationStatus;

  // ── Form change ──────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setBanner({ type: '', message: '' });
    },
    []
  );

  const handleCancel = useCallback(() => {
    // Refetch from API to restore original values
    void fetchUserData();
    setIsEditing(false);
    setBanner({ type: '', message: '' });
  }, [fetchUserData]);

  // ── Save profile ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!session?.user?.email) return;

    if (form.phone && !/^(\+92|0)[0-9]{9,10}$/.test(
      form.phone.replace(/[-\s]/g, '')
    )) {
      setBanner({
        type: 'error',
        message: 'Please enter a valid Pakistani phone number.',
      });
      return;
    }

    setSaving(true);
    setBanner({ type: '', message: '' });

    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       session.user.email,
          phone:       form.phone.trim(),
          city:        form.city.trim(),
          country:     form.country.trim(),
          homeAddress: form.homeAddress.trim(),
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        updatedUser?: Record<string, string>;
      };

      if (res.ok && data.success) {
        // Refetch fresh data from database (guarantees UI shows saved values)
        await fetchUserData();

        // Show appropriate message based on change data
        const changeData = (data as unknown as {
          data?: {
            profileChangesRemaining?: number;
            profileChangeLocked?: boolean;
            justLocked?: boolean;
          };
        }).data;

        if (changeData?.justLocked) {
          setBanner({
            type: 'success',
            message: '✅ Profile updated. This was your final allowed change — your profile is now locked for security.',
          });
        } else if (typeof changeData?.profileChangesRemaining === 'number') {
          setBanner({
            type: 'success',
            message: `✅ Profile updated. You have ${changeData.profileChangesRemaining} change${changeData.profileChangesRemaining === 1 ? '' : 's'} remaining.`,
          });
        } else {
          setBanner({
            type: 'success',
            message: 'Profile updated successfully!',
          });
        }
        setIsEditing(false);
      } else {
        setBanner({
          type:    'error',
          message: data.message ?? 'Update failed. Please try again.',
        });
      }
    } catch {
      setBanner({
        type:    'error',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }, [session, form, updateSession]);

  // ── Profile picture handlers ─────────────────────────────
  const handleCameraClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleProfilePictureSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setBanner({ type: 'error', message: 'Please select an image file.' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setBanner({ type: 'error', message: 'Image must be less than 10MB.' });
        return;
      }
      setTempProfileFile(file);
      setIsCropModalOpen(true);
      e.target.value = '';
    },
    []
  );

  const handleCropComplete = useCallback(
    async (croppedFile: File) => {
      setIsCropModalOpen(false);
      setTempProfileFile(null);
      setUploadingPic(true);
      setBanner({ type: '', message: '' });

      try {
        const fd = new FormData();
        fd.append('file', croppedFile);

        const uploadRes = await fetch('/api/upload?folder=general', {
          method: 'POST',
          body: fd,
        });

        const uploadData = (await uploadRes.json()) as {
          success: boolean;
          data?: { url: string; publicId: string };
          error?: string;
        };

        if (!uploadRes.ok || !uploadData.success || !uploadData.data?.url) {
          throw new Error(uploadData.error ?? 'Upload failed');
        }

        const newUrl = uploadData.data.url;

        if (!session?.user?.email) throw new Error('No session');

        const saveRes = await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.user.email,
            profilePictureUrl: newUrl,
          }),
        });

        const saveData = (await saveRes.json()) as {
          success: boolean;
          message?: string;
        };

        if (!saveRes.ok || !saveData.success) {
          throw new Error(saveData.message ?? 'Failed to save');
        }

        setProfilePicUrl(newUrl);

        // Update session so header/other pages reflect new picture
        // NextAuth JWT listens for 'profilePicture' key (camelCase)
        await updateSession({
          user: {
            profilePicture: newUrl,
          },
        });

        // Refetch from database to confirm save
        await fetchUserData();

        setBanner({
          type: 'success',
          message: 'Profile picture updated!',
        });
      } catch (err) {
        setBanner({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to upload picture. Please try again.',
        });
      } finally {
        setUploadingPic(false);
      }
    },
    [session, updateSession]
  );

  // ── Loading ──────────────────────────────────────────────
  if (status === 'loading' || loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session) return <></>;

  // Use API data if loaded, fall back to session for name/email
  const userName  = userData.name  || session.user?.name  || '';
  const userEmail = userData.email || session.user?.email || '';
  const initial   = getInitial(userName, userEmail);

  return (
    <>
      <Head>
        <title>My Profile | Highrise.pk</title>
        <meta name="description" content="Manage your Highrise.pk profile" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ═══════════════════════════════════════════════
            PAGE HEADER — with profile picture
        ═══════════════════════════════════════════════ */}
        <div className="bg-gradient-to-b from-[#041c2c] via-[#06283b] to-[#052235]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

            <Link
              href={portalLink}
              className="inline-flex items-center gap-2 text-white/70
                         hover:text-white text-sm font-medium mb-6
                         transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              {portalLabel}
            </Link>

            {/* Avatar + Name */}
            <div className="flex items-center gap-5">

              {/* ═════ AVATAR WITH CAMERA UPLOAD ═════ */}
              <div className="relative flex-shrink-0">

                {/* Avatar circle — clickable */}
                <button
                  type="button"
                  onClick={handleCameraClick}
                  disabled={uploadingPic}
                  className="group relative block w-24 h-24 rounded-2xl
                             overflow-hidden ring-4 ring-white/20
                             cursor-pointer disabled:cursor-wait"
                  aria-label="Change profile picture"
                >
                  {profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicUrl}
                      alt={userName}
                      className="w-full h-full object-cover
                                 transition-all duration-300
                                 group-hover:brightness-75"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20
                                    flex items-center justify-center
                                    text-white text-3xl font-bold
                                    transition-all duration-300
                                    group-hover:brightness-75">
                      {initial}
                    </div>
                  )}

                  {/* Hover overlay with camera icon */}
                  <div className="absolute inset-0 flex items-center
                                  justify-center opacity-0
                                  group-hover:opacity-100
                                  transition-all duration-300
                                  bg-black/50">
                    <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>

                  {/* Upload spinner */}
                  {uploadingPic && (
                    <div className="absolute inset-0 flex items-center
                                    justify-center bg-white/80 z-20">
                      <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
                    </div>
                  )}
                </button>

                {/* Camera badge — always visible */}
                <button
                  type="button"
                  onClick={handleCameraClick}
                  disabled={uploadingPic}
                  className="absolute -bottom-1 -right-1 w-9 h-9
                             bg-[#029bba] rounded-full
                             flex items-center justify-center
                             border-4 border-[#041c2c]
                             shadow-lg cursor-pointer
                             hover:bg-[#027a94]
                             transition-colors z-10
                             disabled:cursor-wait disabled:opacity-70"
                  aria-label="Change profile picture"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureSelect}
                  className="hidden"
                />
              </div>

              {/* Name + Email + Role */}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-white truncate">
                  {userName || 'My Profile'}
                </h1>
                <p className="text-white/70 text-sm mt-1 truncate">
                  {userEmail}
                </p>
                <div className="mt-2">
                  <RoleBadge role={role} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            CONTENT
        ═══════════════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Banner */}
          {banner.type && (
            <div
              className={cx(
                'flex items-start gap-3 p-4 rounded-xl border',
                banner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              )}
            >
              {banner.type === 'success'
                ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              }
              <p className="text-sm font-medium">{banner.message}</p>
            </div>
          )}

          {/* ═════ PERSONAL INFO CARD ═════ */}
          <div className="bg-white rounded-2xl border border-gray-100
                          shadow-sm overflow-hidden">
            <div className="flex items-center justify-between
                            px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Personal Information
                </h2>
                {!userData.profileChangeLocked && userData.profileChangesRemaining < userData.profileChangeLimit && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {userData.profileChangesRemaining} of {userData.profileChangeLimit} changes remaining
                  </p>
                )}
              </div>
              {!isEditing ? (
                userData.profileChangeLocked ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2
                                     rounded-xl bg-red-50 border border-red-200
                                     text-red-700 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      Profile Locked
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2
                               rounded-xl border border-gray-200 text-sm
                               font-medium text-gray-600
                               hover:border-[#029bba] hover:text-[#029bba]
                               transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2
                               rounded-xl border border-gray-200 text-sm
                               font-medium text-gray-600
                               hover:bg-gray-50 transition-colors
                               disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2
                               rounded-xl bg-[#029bba] text-white text-sm
                               font-semibold hover:bg-[#027a94]
                               transition-colors disabled:opacity-60"
                  >
                    {saving
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />
                    }
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* ─── LOCKED WARNING ─── */}
            {userData.profileChangeLocked && (
              <div className="mx-6 mt-4 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">
                      Profile Locked for Security
                    </p>
                    <p className="text-xs text-red-800 mt-1">
                      You have used all your allowed profile changes.
                      To make further changes, contact us from your registered email or phone:
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <a
                        href="https://wa.me/923335877106"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-900 hover:underline"
                      >
                        📞 +92 333 5877106
                      </a>
                      <a
                        href="mailto:info@highrise.pk"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-900 hover:underline"
                      >
                        📧 info@highrise.pk
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── LAST CHANGE WARNING ─── */}
            {!userData.profileChangeLocked &&
             userData.profileChangesRemaining === 1 &&
             isEditing && (
              <div className="mx-6 mt-4 p-3 border-l-4 border-amber-500 bg-amber-50 rounded-r-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>⚠️ Warning:</strong> This is your last allowed change.
                    After saving, your profile will be locked. Please review carefully before saving.
                  </p>
                </div>
              </div>
            )}

            <div className="px-6 py-6">

              {/* Read-only: name + email */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-500 mb-1.5">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 h-11 px-4
                                  bg-gray-50 rounded-xl border border-gray-200">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {userName || '—'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Name cannot be changed here
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-500 mb-1.5">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 h-11 px-4
                                  bg-gray-50 rounded-xl border border-gray-200">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {userEmail || '—'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="03XX-XXXXXXX"
                        className="w-full h-11 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all
                                   placeholder:text-gray-400"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 h-11 px-4
                                    bg-gray-50 rounded-xl border border-gray-200">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {form.phone || '—'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-700 mb-1.5">
                    City
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="e.g. Lahore"
                        className="w-full h-11 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all
                                   placeholder:text-gray-400"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 h-11 px-4
                                    bg-gray-50 rounded-xl border border-gray-200">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {form.city || '—'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-700 mb-1.5">
                    Country
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2
                                        w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        placeholder="e.g. Pakistan"
                        className="w-full h-11 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all
                                   placeholder:text-gray-400"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 h-11 px-4
                                    bg-gray-50 rounded-xl border border-gray-200">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {form.country || '—'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold
                                    text-gray-700 mb-1.5">
                    Home Address
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2
                                       w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="homeAddress"
                        value={form.homeAddress}
                        onChange={handleChange}
                        placeholder="House #, Street, Area"
                        className="w-full h-11 pl-11 pr-4 border border-gray-200
                                   rounded-xl text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-[#029bba]/20
                                   focus:border-[#029bba] transition-all
                                   placeholder:text-gray-400"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 h-11 px-4
                                    bg-gray-50 rounded-xl border border-gray-200">
                      <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {form.homeAddress || '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═════ OWNER VERIFICATION (basic users only) ═════ */}
          {isBasicUser && (
            <div className="bg-white rounded-2xl border border-gray-100
                            shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">
                  Property Owner Verification
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Verify your CNIC to list your own properties with
                  a Verified Owner badge
                </p>
              </div>
              <div className="px-6 py-5">
                <OwnerStatusCard
                  ownerStatus={ownerStatus}
                  isVerifiedOwner={isVerifiedOwner}
                />
              </div>
            </div>
          )}

          {/* ═════ PROFESSIONAL PORTAL (for pro roles) ═════ */}
          {(isAgent || isDeveloper || isSociety || isAdmin) && (
            <div className="bg-white rounded-2xl border border-gray-100
                            shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">
                  Your Professional Portal
                </h2>
              </div>
              <div className="px-6 py-5">
                <Link
                  href={portalLink}
                  className="flex items-center justify-between p-4
                             bg-[#029bba]/5 border border-[#029bba]/20
                             rounded-xl hover:bg-[#029bba]/10
                             transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5 text-[#029bba]" />
                    <div>
                      <p className="text-sm font-semibold text-[#004063]">
                        {portalLabel}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Manage listings, leads and analytics
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#029bba]
                                           group-hover:translate-x-0.5
                                           transition-transform" />
                </Link>
              </div>
            </div>
          )}

          {/* ═════ ACCOUNT INFO + ALL 5 UPGRADE OPTIONS ═════ */}
          <div className="bg-white rounded-2xl border border-gray-100
                          shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                Account
              </h2>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Account type */}
              <div className="flex items-center justify-between
                              py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Account Type
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your current role on Highrise.pk
                  </p>
                </div>
                <RoleBadge role={role} />
              </div>

              {/* Upgrade options — ALL 5 for basic users */}
              {isBasicUser && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Upgrade Account
                  </p>
                  <p className="text-xs text-gray-500 -mt-2">
                    Choose your role on Highrise.pk. All roles are verified for trust.
                  </p>

                  <div className="grid gap-2">
                    {UPGRADE_OPTIONS.map((opt) => (
                      <Link
                        key={opt.label}
                        href={opt.href}
                        className={cx(
                          'flex items-center justify-between p-3',
                          'border border-gray-200 rounded-xl',
                          'transition-colors group',
                          opt.bgColor
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cx('flex-shrink-0', opt.color)}>
                            {opt.icon}
                          </span>
                          <div className="min-w-0">
                            <p className={cx(
                              'text-sm font-semibold text-gray-800 truncate',
                              'group-hover:' + opt.color
                            )}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {opt.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {opt.soon && (
                            <span className="text-[10px] font-bold px-2 py-0.5
                                             rounded-full bg-amber-100 text-amber-700">
                              Soon
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400
                                                   group-hover:text-gray-600" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Support */}
          <div className="text-center pb-8">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a
                href="https://wa.me/923335877106"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#029bba] font-semibold hover:underline"
              >
                WhatsApp Support
              </a>
              {' '}or{' '}
              <a
                href="mailto:info@highrise.pk"
                className="text-[#029bba] font-semibold hover:underline"
              >
                info@highrise.pk
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Profile Picture Crop Modal */}
      {isCropModalOpen && tempProfileFile && (
        <ProfileImageCropModal
          file={tempProfileFile}
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setTempProfileFile(null);
          }}
          onComplete={handleCropComplete}
        />
      )}
    </>
  );
}

// ========== END OF FILE ==========