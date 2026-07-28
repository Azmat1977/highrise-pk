import type { Capability } from "./capabilities";
import type { Role } from "./roles";

export const PERMISSION_VALUES = [
  "admin_access_panel",

  "user_view_list",
  "user_view_details",
  "user_create",
  "user_edit",
  "user_delete",
  "user_suspend",
  "user_change_role",
  "user_manage_permissions",
  "user_impersonate",

  "owner_view_list",
  "owner_view_details",
  "owner_verify_kyc",
  "owner_reject_kyc",
  "owner_view_sensitive_docs",

  "developer_view_list",
  "developer_view_details",
  "developer_verify_kyc",
  "developer_reject_kyc",
  "developer_edit",
  "developer_delete",
  "developer_view_sensitive_docs",

  "agent_view_list",
  "agent_view_details",
  "agent_verify_kyc",
  "agent_reject_kyc",
  "agent_edit",
  "agent_delete",
  "agent_view_sensitive_docs",

  "society_view_list",
  "society_view_details",
  "society_verify_kyc",
  "society_reject_kyc",
  "society_edit",
  "society_delete",
  "society_view_sensitive_docs",

  "property_view_list",
  "property_create",
  "property_edit",
  "property_delete",
  "property_permanent_delete",
  "property_verify",
  "property_approve",
  "property_reject",
  "property_feature",

  "project_view_list",
  "project_create",
  "project_edit",
  "project_delete",
  "project_permanent_delete",
  "project_approve",
  "project_reject",
  "unit_manage",

  "blog_view_list",
  "blog_view_details",
  "blog_create",
  "blog_edit",
  "blog_delete",
  "blog_permanent_delete",
  "blog_restore",
  "content_publish",
  "content_edit",
  "content_delete",

  "review_moderate",
  "report_view",
  "report_update",
  "report_moderate",
  "comment_view_list",
  "comment_view_details",
  "comment_moderate",
  "comment_delete",
  "comment_pin",
  "comment_reply",

  "favorite_add",
  "inquiry_view",
  "inquiry_view_details",
  "inquiry_edit",
  "inquiry_delete",
  "inquiry_send_email",

  "media_view_library",
  "media_delete_own",
  "media_delete_any",
  "sensitive_document_view",
  "sensitive_document_download",

  "finance_view_transactions",
  "finance_view_revenue",
  "finance_process_refund",
  "finance_manage_subscriptions",

  "security_view_logs",
  "security_block_ip",
  "security_manage_settings",
  "security_export_data",
  "admin_audit_view",

  "system_manage_settings",
  "system_view_analytics",
  "system_manage_api_keys",

  "provider_view_list",
  "provider_view_details",
  "provider_review_credentials",
  "provider_approve",
  "provider_reject",
  "provider_suspend",
  "material_offer_moderate",
  "material_price_anomaly_review",
  "maintenance_dispatch",
  "maintenance_dispute_manage",
  "safedeal_manage_cases",
  "homevisit_manage",
] as const;

export type Permission = (typeof PERMISSION_VALUES)[number];

const PERMISSION_SET = new Set<string>(PERMISSION_VALUES);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

export const LEGACY_PERMISSION_ALIASES: Readonly<
  Record<string, Permission>
> = {
  "reports.view": "report_view",
  "reports.update": "report_update",
  file_delete_any: "media_delete_any",
};

export function normalizePermission(
  value: unknown,
): Permission | null {
  if (isPermission(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  return LEGACY_PERMISSION_ALIASES[value] ?? null;
}

export function normalizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(normalizePermission)
        .filter(
          (permission): permission is Permission =>
            permission !== null,
        ),
    ),
  ];
}

const USER_READ_PERMISSIONS = [
  "user_view_list",
  "user_view_details",
] as const satisfies readonly Permission[];

const KYC_REVIEW_PERMISSIONS = [
  "owner_view_list",
  "owner_view_details",
  "owner_verify_kyc",
  "owner_reject_kyc",
  "developer_view_list",
  "developer_view_details",
  "developer_verify_kyc",
  "developer_reject_kyc",
  "agent_view_list",
  "agent_view_details",
  "agent_verify_kyc",
  "agent_reject_kyc",
  "society_view_list",
  "society_view_details",
  "society_verify_kyc",
  "society_reject_kyc",
] as const satisfies readonly Permission[];

const CONTENT_MODERATION_PERMISSIONS = [
  "property_view_list",
  "property_verify",
  "property_approve",
  "property_reject",
  "project_view_list",
  "project_approve",
  "project_reject",
  "review_moderate",
  "report_moderate",
  "comment_moderate",
] as const satisfies readonly Permission[];

const BLOG_READ_PERMISSIONS = [
  "blog_view_list",
  "blog_view_details",
] as const satisfies readonly Permission[];

const BLOG_WRITE_PERMISSIONS = [
  ...BLOG_READ_PERMISSIONS,
  "blog_create",
  "blog_edit",
] as const satisfies readonly Permission[];

const BLOG_MANAGE_PERMISSIONS = [
  ...BLOG_WRITE_PERMISSIONS,
  "blog_delete",
  "blog_restore",
] as const satisfies readonly Permission[];

const COMMENT_MANAGEMENT_PERMISSIONS = [
  "comment_view_list",
  "comment_view_details",
  "comment_moderate",
  "comment_delete",
  "comment_pin",
  "comment_reply",
] as const satisfies readonly Permission[];

const REPORT_MANAGEMENT_PERMISSIONS = [
  "report_view",
  "report_update",
  "report_moderate",
] as const satisfies readonly Permission[];

const INQUIRY_MANAGEMENT_PERMISSIONS = [
  "inquiry_view",
  "inquiry_view_details",
  "inquiry_edit",
  "inquiry_delete",
  "inquiry_send_email",
] as const satisfies readonly Permission[];

const FINANCE_READ_PERMISSIONS = [
  "finance_view_transactions",
  "finance_view_revenue",
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS = {
  user: ["favorite_add"],

  reader: [
    "admin_access_panel",
    ...USER_READ_PERMISSIONS,
    "property_view_list",
    "project_view_list",
    ...BLOG_READ_PERMISSIONS,
    "comment_view_list",
    "comment_view_details",
    "report_view",
    "inquiry_view",
    "inquiry_view_details",
    "system_view_analytics",
  ],

  writer: [
    "admin_access_panel",
    "favorite_add",
    ...BLOG_WRITE_PERMISSIONS,
    "content_edit",
  ],

  editor: [
    "admin_access_panel",
    ...BLOG_MANAGE_PERMISSIONS,
    "content_publish",
    "content_edit",
    "content_delete",
    "review_moderate",
    ...COMMENT_MANAGEMENT_PERMISSIONS,
  ],

  moderator: [
    "admin_access_panel",
    "favorite_add",
    ...USER_READ_PERMISSIONS,
    ...KYC_REVIEW_PERMISSIONS,
    ...CONTENT_MODERATION_PERMISSIONS,
    ...BLOG_READ_PERMISSIONS,
    ...COMMENT_MANAGEMENT_PERMISSIONS,
    ...REPORT_MANAGEMENT_PERMISSIONS,
    ...INQUIRY_MANAGEMENT_PERMISSIONS,
    "property_edit",
    "project_edit",
    "provider_view_list",
    "provider_view_details",
    "provider_review_credentials",
  ],

  finance: [
    "admin_access_panel",
    ...FINANCE_READ_PERMISSIONS,
    "finance_process_refund",
    "finance_manage_subscriptions",
  ],

  admin: [
    "admin_access_panel",
    "favorite_add",

    ...USER_READ_PERMISSIONS,
    "user_create",
    "user_edit",
    "user_delete",
    "user_suspend",
    "user_change_role",
    "user_manage_permissions",

    ...KYC_REVIEW_PERMISSIONS,
    "owner_view_sensitive_docs",
    "developer_view_sensitive_docs",
    "agent_view_sensitive_docs",
    "society_view_sensitive_docs",

    ...CONTENT_MODERATION_PERMISSIONS,
    ...BLOG_MANAGE_PERMISSIONS,
    "blog_permanent_delete",
    ...COMMENT_MANAGEMENT_PERMISSIONS,
    ...REPORT_MANAGEMENT_PERMISSIONS,
    ...INQUIRY_MANAGEMENT_PERMISSIONS,

    "property_edit",
    "property_delete",
    "property_permanent_delete",
    "property_verify",
    "property_approve",
    "property_reject",
    "property_feature",

    "project_edit",
    "project_delete",
    "project_permanent_delete",
    "project_approve",
    "project_reject",
    "unit_manage",

    "content_publish",
    "content_edit",
    "content_delete",

    "media_view_library",
    "media_delete_any",
    "sensitive_document_view",
    "sensitive_document_download",

    ...FINANCE_READ_PERMISSIONS,

    "security_view_logs",
    "security_block_ip",
    "admin_audit_view",

    "system_manage_settings",
    "system_view_analytics",

    "provider_view_list",
    "provider_view_details",
    "provider_review_credentials",
    "provider_approve",
    "provider_reject",
    "provider_suspend",

    "material_offer_moderate",
    "material_price_anomaly_review",
    "maintenance_dispatch",
    "maintenance_dispute_manage",
    "safedeal_manage_cases",
    "homevisit_manage",
  ],

  superadmin: [],
} as const satisfies Record<Role, readonly Permission[]>;

export const CAPABILITY_PERMISSIONS = {
  property_owner: ["property_create"],
  real_estate_agent: ["property_create"],
  property_developer: ["property_create", "project_create"],
  housing_society: ["project_create"],
  material_supplier: [],
  construction_contractor: [],
  professional_service_provider: [],
  skilled_worker: [],
  maintenance_service_provider: [],
  home_visit_inspector: [],
} as const satisfies Record<Capability, readonly Permission[]>;
