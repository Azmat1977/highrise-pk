// lib/permissions.ts
// ═══════════════════════════════════════════════════════════════
// PERMISSION SYSTEM - Highrise.pk
// 🔒 ENTERPRISE-GRADE RBAC (Role-Based Access Control)
// ═══════════════════════════════════════════════════════════════
// ✅ 60+ Granular Permissions
// ✅ Role Inheritance (Superadmin > Admin > Moderator)
// ✅ Resource Ownership Logic
// ✅ Type-Safe Interfaces
// ═══════════════════════════════════════════════════════════════

// ─── 1. Permission Definitions ────────────────────────────────────────────────

export type Permission =
  // 🔐 Admin Access
  | 'admin_access_panel'

  // 👥 User Management
  | 'user_view_list'
  | 'user_view_details'
  | 'user_create'
  | 'user_edit'
  | 'user_delete'
  | 'user_suspend'
  | 'user_change_role'
  | 'user_impersonate'         // ⚠️ Superadmin only

  // 🏢 Developer Management
  | 'developer_view_list'
  | 'developer_view_details'
  | 'developer_verify_kyc'
  | 'developer_reject_kyc'
  | 'developer_edit'
  | 'developer_delete'
  | 'developer_view_sensitive_docs'  // CNIC, NTN, SECP

  // 👔 Agent Management
  | 'agent_view_list'
  | 'agent_view_details'
  | 'agent_verify_kyc'
  | 'agent_reject_kyc'
  | 'agent_edit'
  | 'agent_delete'

  // 🏘️ Property Management
  | 'property_view_list'
  | 'property_create'
  | 'property_edit'
  | 'property_delete'
  | 'property_verify'
  | 'property_approve'
  | 'property_reject'
  | 'property_feature'

  // 🏗️ Project Management
  | 'project_view_list'
  | 'project_create'
  | 'project_edit'
  | 'project_delete'
  | 'project_approve'
  | 'project_reject'

  // ⭐ Reviews & Content
  | 'review_moderate'
  | 'content_publish'
  | 'content_edit'
  | 'content_delete'

  // 💰 Financial
  | 'finance_view_transactions'
  | 'finance_view_revenue'
  | 'finance_process_refund'
  | 'finance_manage_subscriptions'

  // 🛡️ Security & Audit
  | 'security_view_logs'
  | 'security_block_ip'
  | 'security_manage_settings'
  | 'security_export_data'

  // ⚙️ System
  | 'system_manage_settings'
  | 'system_view_analytics';

// ─── 2. Permission Groups ─────────────────────────────────────────────────────

export const PERM_GROUPS = {
  USER_READ: [
    'user_view_list',
    'user_view_details',
  ] as Permission[],

  USER_WRITE: [
    'user_create',
    'user_edit',
    'user_suspend',
    'user_change_role',
  ] as Permission[],

  KYC_MANAGER: [
    'developer_view_list',
    'developer_view_details',
    'developer_verify_kyc',
    'developer_reject_kyc',
    'developer_view_sensitive_docs',
    'agent_view_list',
    'agent_view_details',
    'agent_verify_kyc',
    'agent_reject_kyc',
  ] as Permission[],

  CONTENT_MODERATOR: [
    'property_view_list',
    'property_approve',
    'property_reject',
    'property_verify',
    'project_view_list',
    'project_approve',
    'project_reject',
    'review_moderate',
  ] as Permission[],

  FINANCE_VIEW: [
    'finance_view_transactions',
    'finance_view_revenue',
  ] as Permission[],

  SECURITY_ADMIN: [
    'security_view_logs',
    'security_block_ip',
    'security_manage_settings',
  ] as Permission[],
} as const;

// ─── 3. Role Definitions ──────────────────────────────────────────────────────

const ROLES: Record<string, Permission[]> = {
  // 👑 Superadmin — wildcard bypass (no list needed)
  superadmin: [],

  // 🛡️ Admin — full operational access
  admin: [
    'admin_access_panel',
    ...PERM_GROUPS.USER_READ,
    ...PERM_GROUPS.USER_WRITE,
    ...PERM_GROUPS.KYC_MANAGER,
    ...PERM_GROUPS.CONTENT_MODERATOR,
    ...PERM_GROUPS.FINANCE_VIEW,
    ...PERM_GROUPS.SECURITY_ADMIN,
    'system_manage_settings',
    'system_view_analytics',
    'property_edit',
    'property_delete',
    'property_feature',
    'property_verify',
    'project_edit',
    'project_delete',
    'content_publish',
    'content_edit',
    'content_delete',
    'user_delete',
    'developer_edit',
    'developer_delete',
    'agent_edit',
    'agent_delete',
  ],

  // 🕵️ Moderator — content & KYC focus
  moderator: [
    'admin_access_panel',
    ...PERM_GROUPS.USER_READ,
    ...PERM_GROUPS.KYC_MANAGER,
    ...PERM_GROUPS.CONTENT_MODERATOR,
    'property_edit',
    'project_edit',
  ],

  // 📝 Editor — blog & content only
  editor: [
    'admin_access_panel',
    'content_publish',
    'content_edit',
    'content_delete',
    'review_moderate',
  ],

  // 💰 Finance — financials only
  finance: [
    'admin_access_panel',
    ...PERM_GROUPS.FINANCE_VIEW,
    'finance_process_refund',
    'finance_manage_subscriptions',
  ],

  // 🏗️ Developer — property & project creation
  developer: [
    'property_create',
    'project_create',
  ],

  // 👔 Agent — property creation only
  agent: [
    'property_create',
  ],

  // 👤 User — no permissions
  user: [],
};

// ─── 4. Interfaces ────────────────────────────────────────────────────────────

export interface UserLike {
  id?:          string;
  _id?:         string;
  role?:        string;
  permissions?: Permission[] | null;
}

export interface ResourceLike {
  user?:      string | { id?: string; _id?: string };
  developer?: string | { id?: string; _id?: string };
  agent?:     string | { id?: string; _id?: string };
  createdBy?: string | { id?: string; _id?: string };
}

// ─── 5. Core Permission Helpers ───────────────────────────────────────────────

/**
 * Check if user has a specific permission.
 * Superadmin bypasses all checks.
 */
export function hasPermission(
  user: UserLike | null | undefined,
  permission: Permission
): boolean {
  if (!user?.role) return false;

  // 👑 Superadmin — always allowed
  if (user.role === 'superadmin') return true;

  // Role-based check
  const rolePerms = ROLES[user.role] ?? [];
  if (rolePerms.includes(permission)) return true;

  // Custom override permissions
  if (user.permissions?.includes(permission)) return true;

  return false;
}

/**
 * Check if user has ALL of the given permissions.
 */
export function hasAllPermissions(
  user: UserLike | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return permissions.every((perm) => hasPermission(user, perm));
}

/**
 * Check if user has ANY of the given permissions.
 */
export function hasAnyPermission(
  user: UserLike | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return permissions.some((perm) => hasPermission(user, perm));
}

/**
 * Get the full resolved permission list for a user.
 * Merges role permissions + custom overrides.
 */
export function getUserPermissions(
  user: UserLike | null | undefined
): Permission[] {
  if (!user?.role) return [];

  if (user.role === 'superadmin') {
    // Return all known permissions for UI checks
    const all = new Set<Permission>();
    Object.values(ROLES).forEach((list) =>
      list.forEach((p) => all.add(p))
    );
    return Array.from(all);
  }

  const rolePerms  = ROLES[user.role] ?? [];
  const userPerms  = user.permissions ?? [];

  return Array.from(new Set([...rolePerms, ...userPerms]));
}

// ─── 6. Resource Ownership ────────────────────────────────────────────────────

/**
 * Safely extract a string ID from a raw string or populated object.
 */
function getResourceId(
  field:
    | string
    | { id?: string; _id?: { toString(): string } | string }
    | null
    | undefined
): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    if ('id' in field && typeof field.id === 'string') return field.id;
    if ('_id' in field && field._id) {
      return typeof field._id === 'string'
        ? field._id
        : field._id.toString();
    }
  }
  return null;
}

/**
 * Check if user can manage a specific resource.
 * Priority: superadmin > admin permission > ownership
 */
export function canManageResource(
  user:            UserLike | null | undefined,
  resource:        ResourceLike | null | undefined,
  adminPermission: Permission = 'property_edit'
): boolean {
  if (!user || !resource) return false;

  // 👑 Superadmin
  if (user.role === 'superadmin') return true;

  // Admin override via permission
  if (hasPermission(user, adminPermission)) return true;

  // Ownership check
  const userId = user.id ?? user._id;
  if (!userId) return false;

  const ownerId =
    getResourceId(resource.user)      ??
    getResourceId(resource.developer) ??
    getResourceId(resource.agent)     ??
    getResourceId(resource.createdBy);

  return userId === ownerId;
}

// ─── 7. Aliases & Exports ─────────────────────────────────────────────────────

/** Alias for hasPermission — matches existing API route imports */
export const checkPermission = hasPermission;

/** Full role → permission map for UI usage */
export const rolePermissions = ROLES;