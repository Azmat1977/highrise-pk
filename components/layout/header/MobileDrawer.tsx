/**
 * components/layout/header/MobileDrawer.tsx
 *
 * Slide-in mobile navigation drawer for the global header. Receives session
 * identity, role flags and gate callbacks via props and renders the public
 * nav with city chips, the expandable More panel, role-aware account
 * sections and the guest sign-in actions.
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { icons } from "@/lib/design-system/icons";
import { colors } from "@/lib/design-system/tokens";
import { MobileLink, MobileSectionHeader, cx } from "./menuPrimitives";
import { NAV_ITEMS, MENU_CITIES, isNavItemActive } from "./navConfig";
import type { RoleBadge, SessionUser } from "./headerIdentity";

const PRIMARY_COLOR = colors.primary;

export interface MobileDrawerProps {
  onClose: () => void;
  onRequestLogin: () => void;
  onRequestListingLogin: () => void;
  isLoggedIn: boolean;
  user: SessionUser | null;
  displayName: string;
  roleBadge: RoleBadge;
  isDevApproved: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isDeveloper: boolean;
  onLogout: () => void;
}

export function MobileDrawer({
  onClose,
  onRequestLogin,
  onRequestListingLogin,
  isLoggedIn,
  user,
  displayName,
  roleBadge,
  isDevApproved,
  isAdmin,
  isAgent,
  isDeveloper,
  onLogout,
}: MobileDrawerProps): React.ReactElement {
  const router = useRouter();
  const navReady = router.isReady;
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const moreItem = NAV_ITEMS.find((item) => item.key === "more") ?? NAV_ITEMS[NAV_ITEMS.length - 1];

  return (
    <div
      className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] bg-white z-[999] lg:hidden shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      {/* Drawer header */}
      <div className="sticky top-0 bg-gradient-to-r from-[#029bba] to-[#004063] px-6 py-5 shadow-lg z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <icons.X className="w-6 h-6" />
          </button>
          <Image
            src="/images/logo.png"
            alt="Highrise.pk"
            width={120}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </div>

        {isLoggedIn ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base truncate">{displayName}</p>
                <p className="text-white/70 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30">
              {roleBadge.icon}
              {roleBadge.text}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white/90 text-sm font-medium">Welcome to Highrise.pk</p>
            <p className="text-white/70 text-xs mt-1">Pakistan&apos;s Trusted Property Platform</p>
          </div>
        )}
      </div>

      {/* Public navigation links */}
      <nav className="px-4 py-4" role="navigation">
        <div className="space-y-1">
          {NAV_ITEMS.filter((item) => item.key !== "more").map((item) => {
            const isActive = navReady && isNavItemActive(item, router.pathname, router.asPath);
            return (
              <div key={item.key}>
                <Link
                  href={item.href}
                  className={cx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                    isActive
                      ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                      : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  )}
                  onClick={onClose}
                >
                  <span className={isActive ? "text-[#029bba]" : "text-gray-400"}>{item.icon}</span>
                  {item.label}
                  <icons.ArrowRight className="w-4 h-4 ml-auto text-gray-300" />
                </Link>
                {item.cityArea && MENU_CITIES.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-0.5">
                    {MENU_CITIES.map((cityName) => (
                      <Link
                        key={`mobile-city-${item.key}-${cityName}`}
                        href={`${item.cityArea!.base}?city=${encodeURIComponent(cityName)}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-[#029bba]/60 hover:text-[#029bba] min-h-[28px]"
                      >
                        <icons.MapPin className="w-3 h-3 text-[#029bba]" />
                        {cityName}
                      </Link>
                    ))}
                    <Link
                      href="/cities"
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#029bba] min-h-[28px]"
                    >
                      View All
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {/* More expandable */}
          <div>
            <button
              type="button"
              aria-expanded={isMoreExpanded}
              aria-controls="mobile-more-panel"
              onClick={() => setIsMoreExpanded((current) => !current)}
              className={cx(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
                navReady && isNavItemActive(moreItem, router.pathname, router.asPath)
                  ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
                  : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              )}
            >
              <div className="flex items-center gap-3">
                <icons.Sparkles className="w-5 h-5" />
                More
              </div>
              <icons.ChevronDown className={cx("w-4 h-4 transition-transform", isMoreExpanded && "rotate-180")} />
            </button>
            <div
              id="mobile-more-panel"
              className={cx(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isMoreExpanded ? "max-h-[720px] opacity-100 mt-1" : "max-h-0 opacity-0"
              )}
            >
              <div className="ml-4 space-y-4 pl-3 border-l-2 border-[#029bba]/20">
                {moreItem.sections
                  .filter((section) => section.kind === "links")
                  .map((section) => (
                  <div key={section.title}>
                    <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {(section.kind === "links" ? section.links : []).map((link) => (
                        <Link
                          key={`mobile-more-${section.title}-${link.href}`}
                          href={link.href}
                          onClick={onClose}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:text-[#029bba] transition-all"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOGGED IN: ROLE-AWARE MOBILE MENU */}
        {isLoggedIn && (
          <>
            {!isAdmin && (
              <>
                <div className="my-4 border-t-2 border-gray-100" />
                <div className="space-y-1">
                  {isDevApproved ? (
                    <>
                      <MobileLink href="/add-property" icon={<icons.Plus />} label="Add Property"
                        onClick={onClose} variant="primary" />
                      <MobileLink href="/developer/projects/new" icon={<icons.Building2 />} label="Add Project"
                        onClick={onClose} variant="soft" />
                    </>
                  ) : (
                    <MobileLink href="/add-property" icon={<icons.Plus />} label="List Your Property"
                      onClick={onClose} variant="primary" />
                  )}
                </div>
              </>
            )}

            {/* ADMIN MOBILE */}
            {isAdmin && (
              <>
                <div className="my-4 border-t-2 border-gray-100" />
                <MobileSectionHeader label="Admin Workspace" color="#d97706" />
                <div className="space-y-1">
                  <MobileLink href="/admin" icon={<icons.Shield />} label="Admin Dashboard"
                    onClick={onClose} active={router.pathname === "/admin"} />
                </div>

                <MobileSectionHeader label="Manage Listings" color="#d97706" />
                <div className="space-y-1">
                  <MobileLink href="/admin/properties" icon={<icons.Home />} label="Manage Properties"
                    onClick={onClose} active={router.pathname === "/admin/properties"} />
                  <MobileLink href="/admin/projects" icon={<icons.Building />} label="Manage Projects"
                    onClick={onClose} active={router.pathname === "/admin/projects"} />
                  <MobileLink href="/admin/societies" icon={<icons.Building2 />} label="Manage Societies"
                    onClick={onClose} active={router.pathname === "/admin/societies"} />
                </div>

                <MobileSectionHeader label="Manage Users" color="#d97706" />
                <div className="space-y-1">
                  <MobileLink href="/admin/developers" icon={<icons.Building2 />} label="Manage Developers"
                    onClick={onClose} active={router.pathname === "/admin/developers"} />
                  <MobileLink href="/admin/agents" icon={<icons.Users />} label="Manage Agents"
                    onClick={onClose} active={router.pathname === "/admin/agents"} />
                  <MobileLink href="/admin/users" icon={<icons.UserCircle />} label="Manage Users"
                    onClick={onClose} active={router.pathname === "/admin/users"} />
                </div>

                <MobileSectionHeader label="CRM & AI" color="#d97706" />
                <div className="space-y-1">
                  <MobileLink href="/admin/leads" icon={<icons.MessageSquare />} label="Manage Leads"
                    onClick={onClose} active={router.pathname === "/admin/leads"} />
                  <MobileLink href="/admin/aleem" icon={<icons.Bot />} label="Aleem AI"
                    onClick={onClose} active={router.pathname.startsWith("/admin/aleem")} />
                </div>

                <MobileSectionHeader label="Content & Reports" color="#d97706" />
                <div className="space-y-1">
                  <MobileLink href="/admin/blogs" icon={<icons.FileText />} label="Blog Manager"
                    onClick={onClose} active={router.pathname.startsWith("/admin/blogs")} />
                  <MobileLink href="/admin/analytics" icon={<icons.BarChart3 />} label="Analytics"
                    onClick={onClose} active={router.pathname === "/admin/analytics"} />
                  <MobileLink href="/admin/campaigns" icon={<icons.Megaphone />} label="Campaigns"
                    onClick={onClose} active={router.pathname.startsWith("/admin/campaigns")} />
                  <MobileLink href="/admin/settings" icon={<icons.Settings />} label="Admin Settings"
                    onClick={onClose} active={router.pathname === "/admin/settings"} />
                </div>
              </>
            )}

            {/* AGENT MOBILE */}
            {isAgent && (
              <>
                <div className="my-4 border-t-2 border-gray-100" />
                <MobileSectionHeader label="Agent Workspace" color="#ea580c" />
                <div className="space-y-1">
                  <MobileLink href="/agent/dashboard" icon={<icons.LayoutDashboard />} label="Agent Dashboard"
                    onClick={onClose} active={router.pathname === "/agent/dashboard"} />
                  <MobileLink href="/agent/listings" icon={<icons.Home />} label="My Listings"
                    onClick={onClose} active={router.pathname === "/agent/listings"} />
                  <MobileLink href="/agent/leads" icon={<icons.MessageSquare />} label="My Leads"
                    onClick={onClose} active={router.pathname === "/agent/leads"} />
                  <MobileLink href="/agent/profile" icon={<icons.UserCircle />} label="Agent Profile"
                    onClick={onClose} active={router.pathname === "/agent/profile"} />
                </div>
              </>
            )}

            {/* DEVELOPER MOBILE */}
            {isDeveloper && !isAdmin && !isAgent && (
              <>
                <div className="my-4 border-t-2 border-gray-100" />
                <MobileSectionHeader label="Developer Workspace" color={PRIMARY_COLOR} />
                <div className="space-y-1">
                  <MobileLink href="/developer/dashboard" icon={<icons.LayoutDashboard />} label="Developer Dashboard"
                    onClick={onClose} active={router.pathname === "/developer/dashboard"} />
                  <MobileLink href="/developer/projects" icon={<icons.Building />} label="My Projects"
                    onClick={onClose} active={router.pathname.startsWith("/developer/projects")} />
                  {isDevApproved && (
                    <MobileLink href="/developer/projects/new" icon={<icons.FolderPlus />} label="Add New Project"
                      onClick={onClose} active={router.pathname === "/developer/projects/new"} />
                  )}
                  <MobileLink href="/developer/leads" icon={<icons.MessageSquare />} label="My Leads"
                    onClick={onClose} active={router.pathname === "/developer/leads"} />
                  <MobileLink href="/developer/analytics" icon={<icons.TrendingUp />} label="Analytics"
                    onClick={onClose} active={router.pathname === "/developer/analytics"} />
                  <MobileLink href="/developer/profile" icon={<icons.Settings />} label="Company Profile"
                    onClick={onClose} active={router.pathname === "/developer/profile"} />
                </div>
              </>
            )}

            {/* USER MOBILE */}
            {!isAdmin && !isAgent && !isDeveloper && (
              <>
                <div className="my-4 border-t-2 border-gray-100" />
                <MobileSectionHeader label="My Account" color="#6b7280" />
                <div className="space-y-1">
                  <MobileLink href="/dashboard" icon={<icons.LayoutDashboard />} label="My Dashboard"
                    onClick={onClose} active={router.pathname === "/dashboard"} />
                  <MobileLink href="/profile" icon={<icons.UserCircle />} label="My Profile"
                    onClick={onClose} active={router.pathname === "/profile"} />
                  <MobileLink href="/my-properties" icon={<icons.Home />} label="My Properties"
                    onClick={onClose} active={router.pathname === "/my-properties"} />
                  <MobileLink href="/saved-properties" icon={<icons.Heart />} label="Saved Properties"
                    onClick={onClose} active={router.pathname === "/saved-properties"} />
                </div>

                <MobileSectionHeader label="Upgrade Account" color={PRIMARY_COLOR} />
                <div className="space-y-1">
                  <Link
                    href="/onboarding/business"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 transition-all min-h-[44px]"
                  >
                    <icons.Users className="w-5 h-5" />
                    <span className="flex-1">Become an Agent</span>
                    <icons.ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/onboarding/developer"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] transition-all min-h-[44px]"
                  >
                    <icons.Building2 className="w-5 h-5" />
                    <span className="flex-1">Become a Developer</span>
                    <icons.ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/onboarding/society"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 transition-all min-h-[44px]"
                  >
                    <icons.Building className="w-5 h-5" />
                    <span className="flex-1">Register Society</span>
                    <icons.ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/coming-soon?feature=provider"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                  >
                    <icons.Wrench className="w-5 h-5" />
                    <span className="flex-1">Service Provider</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Soon</span>
                  </Link>
                  <Link
                    href="/coming-soon?feature=labour"
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 transition-all min-h-[44px]"
                  >
                    <icons.HardHat className="w-5 h-5" />
                    <span className="flex-1">Skilled Labour</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Soon</span>
                  </Link>
                </div>
              </>
            )}

            {/* Logout */}
            <div className="my-4 border-t-2 border-gray-100" />
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-all min-h-[44px] w-full"
            >
              <icons.LogOut className="w-5 h-5" />
              Log Out
            </button>
          </>
        )}

        {/* Guest: Login button */}
        {!isLoggedIn && (
          <>
            <div className="my-4 border-t-2 border-gray-100" />
            <button
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-gradient-to-r from-[#029bba] to-[#027a94] text-white rounded-xl text-[15px] font-semibold shadow-lg hover:shadow-xl transition-all min-h-[44px]"
              onClick={onRequestLogin}
            >
              <icons.User className="w-5 h-5" />
              Login / Sign Up
            </button>
            <button
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 mt-2 bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba] rounded-xl text-[15px] font-semibold transition-all min-h-[44px]"
              onClick={onRequestListingLogin}
            >
              <icons.Plus className="w-5 h-5" />
              List Your Property
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 mt-4 border-t-2 border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          &copy; {new Date().getFullYear()} Highrise.pk
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          Pakistan&apos;s Trusted Property Platform
        </p>
      </div>
    </div>
  );
}