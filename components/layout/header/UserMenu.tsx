/**
 * components/layout/header/UserMenu.tsx
 *
 * Signed-in profile dropdown for the global header. Role-aware menu sections
 * (admin, verified owner, agent, developer, regular user) rendered with Radix
 * DropdownMenu. Presentational only: identity, role flags and the developer
 * profile arrive via props, and sign-out is delegated through onLogout.
 */

import React from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { icons } from "@/lib/design-system/icons";
import { colors } from "@/lib/design-system/tokens";
import { MenuItem, SectionHeader } from "./menuPrimitives";
import type { DeveloperProfile, RoleBadge, SessionUser } from "./headerIdentity";

const PRIMARY_COLOR = colors.primary;

export interface UserMenuProps {
  user: SessionUser;
  displayName: string;
  roleBadge: RoleBadge;
  developerProfile: DeveloperProfile | null;
  isDevApproved: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isDeveloper: boolean;
  isVerifiedOwner: boolean;
  isOwnerPending: boolean;
  onLogout: () => void;
}

export function UserMenu({
  user,
  displayName,
  roleBadge,
  developerProfile,
  isDevApproved,
  isAdmin,
  isAgent,
  isDeveloper,
  isVerifiedOwner,
  isOwnerPending,
  onLogout,
}: UserMenuProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[#029bba] hidden sm:block text-sm">
        {displayName}
      </span>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:text-[#029bba] hover:bg-gray-50 transition-all border-2 border-transparent hover:border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
            aria-label="User menu"
          >
            <icons.UserCircle className="w-5 h-5" />
            <icons.ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[9999] min-w-[300px] max-h-[calc(100vh-110px)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-gray-200 bg-white p-2 shadow-2xl"
        >
          {/* USER INFO HEADER */}
          <div className="px-4 py-4 border-b border-gray-100 mb-1">
            <p className="text-sm font-bold text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {user?.email}
            </p>
            <div
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}
            >
              {roleBadge.icon}
              {roleBadge.text}
            </div>
          </div>

          {/* ADMIN MENU */}
          {isAdmin && (
            <>
              <SectionHeader label="Admin Workspace" color="text-amber-600" />
              <MenuItem
                href="/admin"
                icon={<icons.Shield />}
                label="Admin Dashboard"
                iconColor="text-amber-500"
                hoverColor="group-hover:text-amber-600"
              />

              <SectionHeader label="Manage Listings" color="text-amber-600" />
              <MenuItem href="/admin/properties" icon={<icons.Home />} label="Manage Properties" />
              <MenuItem href="/admin/projects"   icon={<icons.Building />} label="Manage Projects" />
              <MenuItem href="/admin/societies"  icon={<icons.Building2 />} label="Manage Societies" />

              <SectionHeader label="Manage Users" color="text-amber-600" />
              <MenuItem href="/admin/developers" icon={<icons.Building2 />} label="Manage Developers" />
              <MenuItem href="/admin/agents"     icon={<icons.Users />} label="Manage Agents" />
              <MenuItem href="/admin/users"      icon={<icons.UserCircle />} label="Manage Users" />

              <SectionHeader label="Verifications" color="text-amber-600" />
              <MenuItem href="/admin/owners"     icon={<icons.ShieldCheck />} label="Verified Owners" />

              <SectionHeader label="CRM & AI" color="text-amber-600" />
              <MenuItem href="/admin/leads"  icon={<icons.MessageSquare />} label="Manage Leads" />
              <MenuItem
                href="/admin/aleem"
                icon={<icons.Bot />}
                label="Aleem AI"
                description="Conversations + analytics"
                badge={{ text: "AI", color: "#029bba" }}
              />

              <SectionHeader label="Content & Reports" color="text-amber-600" />
              <MenuItem href="/admin/blogs"     icon={<icons.FileText />} label="Blog Manager" />
              <MenuItem href="/admin/analytics" icon={<icons.BarChart3 />} label="Analytics" />
              <MenuItem href="/admin/campaigns" icon={<icons.Megaphone />} label="Campaigns" />
              <MenuItem href="/admin/settings"  icon={<icons.Settings />} label="Admin Settings" />
            </>
          )}

          {/* VERIFIED OWNER MENU */}
          {isVerifiedOwner && !isAdmin && !isAgent && !isDeveloper && (
            <>
              <SectionHeader label="Owner Portal" color="#059669" />
              <MenuItem
                href="/owner/dashboard"
                icon={<icons.LayoutDashboard />}
                label="Owner Dashboard"
                iconColor="text-emerald-400"
                hoverColor="group-hover:text-emerald-600"
              />
              <MenuItem
                href="/owner/listings"
                icon={<icons.Home />}
                label="My Listings"
                iconColor="text-emerald-400"
                hoverColor="group-hover:text-emerald-600"
              />
              <MenuItem
                href="/owner/leads"
                icon={<icons.MessageSquare />}
                label="My Leads"
                iconColor="text-emerald-400"
                hoverColor="group-hover:text-emerald-600"
              />
            </>
          )}

          {isOwnerPending && !isAdmin && !isAgent && !isDeveloper && !isVerifiedOwner && (
            <>
              <SectionHeader label="Owner Verification" color="#d97706" />
              <MenuItem
                href="/owner/verify"
                icon={<icons.Clock />}
                label="Verification Pending"
                description="Usually 24-48 hours"
                badge={{ text: "Under Review", color: "#d97706" }}
                iconColor="text-amber-400"
                hoverColor="group-hover:text-amber-600"
              />
            </>
          )}

          {/* AGENT MENU */}
          {isAgent && (
            <>
              <SectionHeader label="Agent Workspace" color="text-orange-600" />
              <MenuItem
                href="/agent/dashboard"
                icon={<icons.LayoutDashboard />}
                label="Agent Dashboard"
                iconColor="text-orange-400"
                hoverColor="group-hover:text-orange-600"
              />
              <MenuItem
                href="/agent/listings"
                icon={<icons.Home />}
                label="My Listings"
                iconColor="text-orange-400"
                hoverColor="group-hover:text-orange-600"
              />
              <MenuItem
                href="/agent/leads"
                icon={<icons.MessageSquare />}
                label="My Leads"
                iconColor="text-orange-400"
                hoverColor="group-hover:text-orange-600"
              />

              <SectionHeader label="Profile" color="text-orange-600" />
              <MenuItem
                href="/agent/profile"
                icon={<icons.UserCircle />}
                label="Agent Profile"
                iconColor="text-orange-400"
                hoverColor="group-hover:text-orange-600"
              />
              <MenuItem
                href="/add-property"
                icon={<icons.Plus />}
                label="Add New Property"
                iconColor="text-orange-400"
                hoverColor="group-hover:text-orange-600"
              />
            </>
          )}

          {/* DEVELOPER MENU */}
          {isDeveloper && !isAdmin && !isAgent && (
            <>
              <SectionHeader label="Developer Workspace" color={PRIMARY_COLOR} />
              <MenuItem
                href="/developer/dashboard"
                icon={<icons.LayoutDashboard />}
                label="Developer Dashboard"
                badge={
                  developerProfile?.status === "pending"
                    ? { text: "Pending", color: "#d97706" }
                    : developerProfile?.status === "rejected"
                    ? { text: "Rejected", color: "#dc2626" }
                    : undefined
                }
              />
              <MenuItem href="/developer/projects" icon={<icons.Building />} label="My Projects" />
              {isDevApproved && (
                <MenuItem href="/developer/projects/new" icon={<icons.FolderPlus />} label="Add New Project" />
              )}
              <MenuItem href="/developer/leads"     icon={<icons.MessageSquare />} label="My Leads" />
              <MenuItem href="/developer/analytics" icon={<icons.TrendingUp />} label="Analytics" />

              <SectionHeader label="Company" color={PRIMARY_COLOR} />
              <MenuItem href="/developer/profile" icon={<icons.Settings />} label="Company Profile" />
            </>
          )}

          {/* REGULAR USER MENU */}
          {!isAdmin && !isAgent && !isDeveloper && (
            <>
              <SectionHeader label="My Account" />
              <MenuItem href="/dashboard"        icon={<icons.LayoutDashboard />} label="My Dashboard" />
              <MenuItem href="/profile"          icon={<icons.UserCircle />} label="My Profile" />
              <MenuItem href="/my-properties"    icon={<icons.Home />} label="My Properties" />
              <MenuItem href="/saved-properties" icon={<icons.Heart />} label="Saved Properties" />

              <SectionHeader label="Upgrade Your Account" color={PRIMARY_COLOR} />

              {/* Verified Owner option */}
              <DropdownMenu.Item asChild>
                <Link
                  href="/owner/verify"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-emerald-50 to-emerald-100
                    hover:from-emerald-100 hover:to-emerald-200
                    transition-all group cursor-pointer outline-none"
                  style={{ color: "#059669" }}
                >
                  <icons.ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">List My Property</p>
                    <p className="text-[11px] opacity-80">CNIC verified owner listing</p>
                  </div>
                  <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/onboarding/business"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-orange-50 to-orange-100
                    hover:from-orange-100 hover:to-orange-200
                    transition-all group cursor-pointer outline-none"
                  style={{ color: "#ea580c" }}
                >
                  <icons.Users className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Become an Agent</p>
                    <p className="text-[11px] opacity-80">List properties professionally</p>
                  </div>
                  <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/onboarding/developer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-[#029bba]/5 to-[#029bba]/10
                    hover:from-[#029bba]/10 hover:to-[#029bba]/20
                    transition-all group cursor-pointer outline-none"
                  style={{ color: PRIMARY_COLOR }}
                >
                  <icons.Building2 className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Become a Developer</p>
                    <p className="text-[11px] opacity-80">Create verified projects</p>
                  </div>
                  <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/onboarding/society"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-purple-50 to-purple-100
                    hover:from-purple-100 hover:to-purple-200
                    transition-all group cursor-pointer outline-none"
                  style={{ color: "#7c3aed" }}
                >
                  <icons.Building className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Register Society</p>
                    <p className="text-[11px] opacity-80">Manage plots & blocks</p>
                  </div>
                  <icons.ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/coming-soon?feature=provider"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-gray-50 to-gray-100
                    hover:from-gray-100 hover:to-gray-200
                    transition-all group cursor-pointer outline-none"
                  style={{ color: "#6b7280" }}
                >
                  <icons.Wrench className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Service Provider</p>
                    <p className="text-[11px] opacity-80">Vendors, contractors, factories</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    Soon
                  </span>
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <Link
                  href="/coming-soon?feature=labour"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl
                    bg-gradient-to-r from-gray-50 to-gray-100
                    hover:from-gray-100 hover:to-gray-200
                    transition-all group cursor-pointer outline-none"
                  style={{ color: "#6b7280" }}
                >
                  <icons.HardHat className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Skilled Labour</p>
                    <p className="text-[11px] opacity-80">Register your trade</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    Soon
                  </span>
                </Link>
              </DropdownMenu.Item>
            </>
          )}

          {/* LOGOUT (all roles) */}
          <DropdownMenu.Separator className="my-2 h-px bg-gray-200" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onLogout();
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 rounded-xl
              hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100
              cursor-pointer transition-all font-semibold group outline-none"
          >
            <icons.LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Log Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}