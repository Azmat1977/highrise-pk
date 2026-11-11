// components/layout/header.tsx
// Highrise.pk global header. Composition root only: it owns the session
// state, the mega-menu trigger state machine, the badge counters and the
// in-place auth gate modal. Navigation data, identity helpers, menu
// primitives, the profile dropdown, the desktop panel and the mobile drawer
// live in ./header/*.
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { icons } from "@/lib/design-system/icons";
import { Button } from "../ui/button";
import AuthGateModal, { type AuthGateContext } from "@/components/auth/AuthGateModal";
import { useStickySearchActive } from "@/hooks/useStickySearchActive";
import { useHeaderCounters } from "./header/useHeaderCounters";
import {
  NAV_ITEMS,
  PRIMARY_NAV_LINKS,
  isNavItemActive,
  type NavItem,
  type NavKey,
} from "./header/navConfig";
import {
  getDisplayName,
  getRoleBadge,
  type DeveloperProfile,
  type SessionUser,
} from "./header/headerIdentity";
import { cx } from "./header/menuPrimitives";
import { UserMenu } from "./header/UserMenu";
import { MegaMenuPanel } from "./header/MegaMenuPanel";
import { MobileDrawer } from "./header/MobileDrawer";

// The compact sticky search header imports the nav projection from this
// module path, so re-export it here to keep that import stable.
export { PRIMARY_NAV_LINKS };

const SESSION_POLL_INTERVAL = 60000;

interface DeveloperProfileResponse {
  success?: boolean;
  hasProfile?: boolean;
  profile?: DeveloperProfile;
}

export const Header: React.FC = () => {
  const router = useRouter();
  const navReady = router.isReady;
  const { data: session, status } = useSession();

  // Saved and compare badge counters. Server-backed only: signed-out users
  // get zero for both and no legacy localStorage mirror is ever read.
  const {
    favoritesCount,
    compareCount,
    favoritesReady,
    compareReady,
  } = useHeaderCounters();

  // -- Auth gate modal --
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginContext, setLoginContext] = useState<
    "contact" | "listing" | "save" | "general" | "compare" | "save_search"
  >("general");

  // -- Mobile menu and add-listing dropdown --
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);

  // -- Mega menu state --
  const [activeNav, setActiveNav] = useState<NavKey | null>(null);
  // Geometry of the mega-menu card, measured from the open trigger so the
  // panel hangs directly under it instead of stretching across the viewport.
  const [panelBox, setPanelBox] = useState<{ left: number; width: number } | null>(null);
  const stickySearchActive = useStickySearchActive();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navPinnedRef = useRef(false);
  const activeNavRef = useRef<NavKey | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  // -- Developer profile (role-aware menus) --
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [devProfileLoading, setDevProfileLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // -- Derived session state --
  const user = session?.user as SessionUser | undefined;
  const isLoggedIn = status === "authenticated" && !!user;
  const isAdmin    = user?.role === "admin";
  const isAgent    = user?.role === "agent";
  const hasDevProfile  = !!developerProfile;
  const isDeveloper    = user?.role === "developer" || hasDevProfile;
  const isDevApproved  = developerProfile?.status === "approved";

  // -- Owner fields --
  const isVerifiedOwner  = !!(user as { isVerifiedOwner?: boolean })?.isVerifiedOwner;
  const ownerStatus      = (user as { ownerVerificationStatus?: string })?.ownerVerificationStatus ?? "none";
  const isOwnerPending   = ownerStatus === "pending";

  const displayName = getDisplayName(user);
  const roleBadge   = getRoleBadge(
    user?.role, hasDevProfile, isDevApproved,
    developerProfile?.status, isVerifiedOwner, ownerStatus
  );

  // Explicit gate context for the auth modal. Compare and save-search reuse
  // the save context because the gate modal has no dedicated compare type.
  const gateContext: AuthGateContext | undefined =
    loginContext === "listing" ? "listing" :
    loginContext === "save" || loginContext === "compare" || loginContext === "save_search" ? "save" :
    undefined;

  const handleShortlistClick = useCallback((e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setLoginContext("save");
      setIsLoginModalOpen(true);
    }
  }, [isLoggedIn]);

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setLoginContext("compare");
      setIsLoginModalOpen(true);
    }
  }, [isLoggedIn]);

  // -- Fetch developer profile --
  const fetchDeveloperProfile = useCallback(async () => {
    if (!isLoggedIn || !user?.id) {
      setDeveloperProfile(null);
      setDevProfileLoading(false);
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setDevProfileLoading(true);
    try {
      const res = await fetch("/api/developer/profile", {
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DeveloperProfileResponse;
      if (data.success && data.hasProfile && data.profile) {
        setDeveloperProfile(data.profile);
      } else {
        setDeveloperProfile(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setDeveloperProfile(null);
      }
    } finally {
      setDevProfileLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    fetchDeveloperProfile();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchDeveloperProfile]);

  // -- Close navigation menus on route change --
  useEffect(() => {
    applyNavState(null, false);
    setIsMobileMenuOpen(false);
    setIsAddListingOpen(false);
  }, [router.pathname, router.asPath]);

  // -- Route loading indicator --
  useEffect(() => {
    const handleStart = () => setIsRouteLoading(true);
    const handleDone  = () => setIsRouteLoading(false);
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleDone);
    router.events.on("routeChangeError", handleDone);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleDone);
      router.events.off("routeChangeError", handleDone);
    };
  }, [router.events]);

  // -- Session polling --
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      if (!devProfileLoading) fetchDeveloperProfile();
    }, SESSION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchDeveloperProfile, devProfileLoading]);

  // -- Logout --
  const handleLogout = useCallback(async () => {
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setDeveloperProfile(null);
      setDevProfileLoading(false);

      await signOut({ redirect: false });

      // Smart Redirect: only kick to home from a protected dashboard page.
      const protectedRoutes = [
        '/admin', '/agent', '/owner', '/developer',
        '/dashboard', '/profile', '/my-properties', '/saved-properties'
      ];

      const isProtected = protectedRoutes.some(route => router.pathname.startsWith(route));

      if (isProtected) {
        void router.push("/");
      } else {
        // Stay on the current public page. replace() clears the session
        // cache without moving the scroll bar.
        void router.replace(router.asPath, undefined, { scroll: false });
      }
    } catch {
      window.location.href = "/";
    }
  }, [router]);

  // -- Navigation helpers --
  const clearNavCloseTimer = useCallback(() => {
    if (navCloseTimer.current) {
      clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
  }, []);

  // Single funnel for every open/close transition so the mirror refs and the
  // pinned (click-opened) flag never drift out of sync with React state.
  const applyNavState = useCallback((key: NavKey | null, pinned: boolean) => {
    navPinnedRef.current = key === null ? false : pinned;
    activeNavRef.current = key;
    setActiveNav(key);
  }, []);

  const openNav = useCallback((key: NavKey) => {
    clearNavCloseTimer();
    // Hovering the trigger of an already click-pinned menu keeps it pinned.
    applyNavState(key, activeNavRef.current === key && navPinnedRef.current);
  }, [applyNavState, clearNavCloseTimer]);

  // A click-opened (pinned) menu stays open while the pointer wanders; it
  // only closes via Escape, outside click, link navigation, route change or
  // toggle.
  const scheduleCloseNav = useCallback(() => {
    clearNavCloseTimer();
    if (navPinnedRef.current) return;
    navCloseTimer.current = setTimeout(() => {
      navCloseTimer.current = null;
      if (!navPinnedRef.current) applyNavState(null, false);
    }, 180);
  }, [applyNavState, clearNavCloseTimer]);

  const toggleNav = useCallback((key: NavKey, trigger?: HTMLButtonElement) => {
    if (trigger) activeTriggerRef.current = trigger;
    clearNavCloseTimer();
    if (activeNavRef.current === key) {
      // Clicking an open trigger: closes it if pinned, otherwise pins it.
      if (navPinnedRef.current) {
        applyNavState(null, false);
      } else {
        navPinnedRef.current = true;
      }
    } else {
      applyNavState(key, true);
    }
  }, [applyNavState, clearNavCloseTimer]);

  const closeNavAndFocusTrigger = useCallback(() => {
    clearNavCloseTimer();
    applyNavState(null, false);
    window.requestAnimationFrame(() => activeTriggerRef.current?.focus());
  }, [applyNavState, clearNavCloseTimer]);

  const handleNavBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      scheduleCloseNav();
    }
  }, [scheduleCloseNav]);

  // Keyboard entry point: moves focus from a trigger into its open panel so
  // the shared mega-menu is reachable with Tab / ArrowDown as well.
  const focusFirstPanelItem = useCallback((key: NavKey) => {
    const panel = document.getElementById(`nav-panel-${key}`);
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>('a[href], button');
    first?.focus();
  }, []);

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, key: NavKey) => {
      const isOpen = activeNavRef.current === key;
      const wantsPanel =
        event.key === "ArrowDown" ||
        (event.key === "Tab" && !event.shiftKey && isOpen);
      if (!wantsPanel) return;
      if (!isOpen) {
        // ArrowDown opens the menu that is not open yet, then steps inside.
        openNav(key);
        window.requestAnimationFrame(() => focusFirstPanelItem(key));
        event.preventDefault();
        return;
      }
      event.preventDefault();
      window.requestAnimationFrame(() => focusFirstPanelItem(key));
    },
    [focusFirstPanelItem, openNav]
  );

  useEffect(() => () => clearNavCloseTimer(), [clearNavCloseTimer]);

  // Keep the mega-menu card aligned to its trigger: centred under it,
  // clamped inside the viewport, width driven by the number of sections.
  useEffect(() => {
    if (!activeNav) {
      setPanelBox(null);
      return;
    }
    const item = NAV_ITEMS.find((navItem) => navItem.key === activeNav);
    if (!item) return;

    const measure = () => {
      const cols = item.sections.length;
      // Wide enough that no column has to truncate a label or wrap a
      // heading. 4-column menus carry the longest labels.
      const desired = cols >= 5 ? 1180 : cols === 4 ? 1040 : 840;
      const viewportWidth = window.innerWidth;
      const width = Math.min(desired, viewportWidth - 32);
      const headerLeft =
        document.querySelector("header")?.getBoundingClientRect().left ?? 0;
      const triggerRect = activeTriggerRef.current?.getBoundingClientRect();
      const centre = triggerRect
        ? triggerRect.left + triggerRect.width / 2
        : viewportWidth / 2;
      const left = Math.min(
        Math.max(centre - width / 2 - headerLeft, 16),
        viewportWidth - width - 16
      );
      setPanelBox({ left, width });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeNav]);

  // -- Close navigation menus on outside click or Escape --
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (activeNavRef.current !== null) applyNavState(null, false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeNavRef.current !== null) {
          // Returns focus to the trigger that opened the menu.
          closeNavAndFocusTrigger();
        }
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [applyNavState, closeNavAndFocusTrigger]);

  const activeNavItem: NavItem | null = activeNav
    ? NAV_ITEMS.find((navItem) => navItem.key === activeNav) ?? null
    : null;

  // RENDER
  return (
    <>
      {isRouteLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-gradient-to-r from-transparent via-gray-100/50 to-transparent overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#029bba] via-[#16c2e0] to-[#029bba] rounded-full"
            style={{
              width: '30%',
              animation: 'routeLoading 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite, loadingPulse 2s ease-in-out infinite',
              boxShadow: '0 0 20px rgba(2, 155, 186, 0.5), 0 0 40px rgba(2, 155, 186, 0.3)',
            }}
          />
        </div>
      )}

      {/* The pointer boundary for the desktop mega-menu lives here on
          <header>, not on <nav>: the trigger row and the fixed panel are both
          DOM descendants of the header, so the pointer can travel between
          them without ever leaving the interaction region. The 180ms timer is
          only a safety grace for a real exit. backdrop-filter would trap the
          fixed drawer inside the header's height, so it is disabled while the
          menu overlay is open. */}
      <header
        className={`bg-white/95 shadow-md sticky top-0 z-50 border-b border-gray-200/50 transition-transform duration-200 ease-out motion-reduce:transition-none ${isMobileMenuOpen ? '' : 'backdrop-blur-md'} ${stickySearchActive ? '-translate-y-full pointer-events-none' : ''}`}
        onMouseEnter={clearNavCloseTimer}
        onMouseLeave={scheduleCloseNav}
        onBlur={handleNavBlur}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center group" aria-label="Highrise.pk Home">
            <div className="relative flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Highrise.pk"
                width={170}
                height={70}
                priority
                className="h-14 md:h-16 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav
            ref={navRef}
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1 flex-1 justify-center"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = navReady && isNavItemActive(item, router.pathname, router.asPath);
              const isOpen = activeNav === item.key;
              return (
                <div
                  key={item.key}
                  onMouseEnter={(e) => {
                    // Record the trigger before opening so the panel can be
                    // measured against the right element on first paint.
                    const trigger = e.currentTarget.querySelector("button");
                    if (trigger) activeTriggerRef.current = trigger;
                    openNav(item.key);
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={`nav-panel-${item.key}`}
                    onMouseEnter={(e) => { activeTriggerRef.current = e.currentTarget; }}
                    onFocus={(e) => { activeTriggerRef.current = e.currentTarget; }}
                    onClick={(e) => toggleNav(item.key, e.currentTarget)}
                    onKeyDown={(e) => handleTriggerKeyDown(e, item.key)}
                    className={cx(
                      "flex items-center gap-1.5 lg:px-2.5 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50",
                      isActive
                        ? "text-[#029bba] bg-[#029bba]/8"
                        : "text-gray-700 hover:text-[#029bba] hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                    <icons.ChevronDown
                      className={cx(
                        "w-4 h-4 transition-transform",
                        isOpen ? "rotate-180 text-[#029bba]" : "text-gray-400"
                      )}
                    />
                  </button>
                </div>
              );
            })}

            {/* Desktop mega-menu panel. The pointer boundary is the <header>
                element (see the handlers above). */}
            {activeNavItem && panelBox && (
              <MegaMenuPanel
                item={activeNavItem}
                panelBox={panelBox}
                onPointerEnter={clearNavCloseTimer}
                onRequestClose={() => applyNavState(null, false)}
              />
            )}
          </nav>

          {/* RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-3">

            {/* COMPARE BUTTON (desktop) */}
            <Link
              href="/compare"
              onClick={handleCompareClick}
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "hidden xl:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.BarChart3
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/compare"
                    ? "text-[#029bba]"
                    : compareCount > 0
                      ? "text-[#029bba]"
                      : "text-gray-500 group-hover:text-[#029bba]"
                )}
              />
              {compareReady && compareCount > 0 && (
                <span
                  className={cx(
                    "absolute -top-0.5 -right-0.5",
                    "min-w-[20px] h-5 px-1.5",
                    "rounded-full bg-[#029bba] text-white",
                    "text-[10px] font-black leading-none",
                    "flex items-center justify-center",
                    "border-2 border-white shadow-sm",
                    "animate-in zoom-in-50 duration-200"
                  )}
                  aria-hidden="true"
                >
                  {compareCount}
                </span>
              )}
            </Link>

            {/* SAVED PROPERTIES BUTTON (desktop) */}
            <Link
              href="/saved-properties"
              onClick={handleShortlistClick}
              aria-label={`Saved Properties${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "hidden xl:flex relative items-center justify-center",
                "w-11 h-11 rounded-xl transition-all group",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/saved-properties"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/saved-properties"
                    ? "text-[#029bba] fill-[#029bba]"
                    : favoritesCount > 0
                      ? "text-red-500 fill-red-500"
                      : "text-gray-500 group-hover:text-red-500"
                )}
              />
              {favoritesReady && favoritesCount > 0 && (
                <span
                  className={cx(
                    "absolute -top-0.5 -right-0.5",
                    "min-w-[20px] h-5 px-1.5",
                    "rounded-full bg-red-500 text-white",
                    "text-[10px] font-black leading-none",
                    "flex items-center justify-center",
                    "border-2 border-white shadow-sm",
                    "animate-in zoom-in-50 duration-200"
                  )}
                  aria-hidden="true"
                >
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>

            {/* LOGGED IN: Add Listing */}
            {isLoggedIn && (
              <>
                {isDevApproved ? (
                  <div className="relative hidden xl:block">
                    <Button
                      type="button"
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white font-semibold rounded-xl px-5 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => setIsAddListingOpen(!isAddListingOpen)}
                    >
                      <icons.Plus className="w-4 h-4" />
                      Add Listing
                      <icons.ChevronDown className={cx("w-4 h-4 transition-transform", isAddListingOpen && "rotate-180")} />
                    </Button>

                    {isAddListingOpen && (
                      <>
                        <div className="fixed inset-0 z-[998]" onClick={() => setIsAddListingOpen(false)} />
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl border-2 border-gray-200 bg-white p-2 shadow-2xl z-[999]">
                          <Link
                            href="/add-property"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-[#029bba]/10 hover:to-[#029bba]/5 transition-all group"
                            onClick={() => setIsAddListingOpen(false)}
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 flex items-center justify-center group-hover:bg-[#029bba]/20 transition-colors">
                              <icons.Home className="w-5 h-5 text-[#029bba]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Add Property</p>
                              <p className="text-xs text-gray-500">Single unit listing</p>
                            </div>
                          </Link>
                          <Link
                            href="/developer/projects/new"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-[#029bba]/10 hover:to-[#029bba]/5 transition-all group mt-1"
                            onClick={() => setIsAddListingOpen(false)}
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#029bba]/10 flex items-center justify-center group-hover:bg-[#029bba]/20 transition-colors">
                              <icons.Building2 className="w-5 h-5 text-[#029bba]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Add Project</p>
                              <p className="text-xs text-gray-500">Multi-unit development</p>
                            </div>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  !isAdmin && (
                    isDeveloper ? (
                      <Button
                        type="button"
                        size="sm"
                        className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                        onClick={() => router.push("/developer/projects/new")}
                      >
                        <icons.Building2 className="w-4 h-4" />
                        Add Project
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                        onClick={() => router.push("/add-property")}
                      >
                        <icons.Plus className="w-4 h-4" />
                        List Property
                      </Button>
                    )
                  )
                )}
              </>
            )}

            {/* GUEST: Login + List */}
            {!isLoggedIn && (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-[#029bba] to-[#027a94] hover:from-[#027a94] hover:to-[#029bba] text-white text-sm font-semibold rounded-xl px-4 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setLoginContext("listing");
                    setIsLoginModalOpen(true);
                  }}
                >
                  <icons.Plus className="w-4 h-4" />
                  List Property
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden xl:flex items-center gap-2 text-[15px] text-gray-700 hover:text-[#029bba] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <icons.User className="w-4 h-4" />
                  Login
                </Button>
              </>
            )}

            {/* LOGGED IN: PROFILE DROPDOWN */}
            {isLoggedIn && user && (
              <UserMenu
                user={user}
                displayName={displayName}
                roleBadge={roleBadge}
                developerProfile={developerProfile}
                isDevApproved={isDevApproved}
                isAdmin={isAdmin}
                isAgent={isAgent}
                isDeveloper={isDeveloper}
                isVerifiedOwner={isVerifiedOwner}
                isOwnerPending={isOwnerPending}
                onLogout={handleLogout}
              />
            )}

            {/* MOBILE COMPARE BUTTON */}
            <Link
              href="/compare"
              onClick={handleCompareClick}
              aria-label={`Compare${compareCount > 0 ? ` (${compareCount} items)` : ''}`}
              className={cx(
                "lg:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/compare" || router.pathname.startsWith("/compare/")
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.BarChart3
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/compare" || compareCount > 0
                    ? "text-[#029bba]"
                    : "text-gray-600"
                )}
              />
              {compareReady && compareCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5
                             min-w-[18px] h-[18px] px-1
                             rounded-full bg-[#029bba] text-white
                             text-[9px] font-black leading-none
                             flex items-center justify-center
                             border-2 border-white shadow-sm
                             animate-in zoom-in-50 duration-200"
                  aria-hidden="true"
                >
                  {compareCount}
                </span>
              )}
            </Link>

            {/* MOBILE SAVED PROPERTIES BUTTON */}
            <Link
              href="/saved-properties"
              onClick={handleShortlistClick}
              aria-label={`Saved Properties${favoritesCount > 0 ? ` (${favoritesCount} saved)` : ''}`}
              className={cx(
                "lg:hidden relative flex items-center justify-center",
                "w-10 h-10 rounded-xl transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#029bba]/40",
                router.pathname === "/saved-properties"
                  ? "bg-[#029bba]/10"
                  : ""
              )}
            >
              <icons.Heart
                className={cx(
                  "w-5 h-5 transition-colors",
                  router.pathname === "/saved-properties"
                    ? "text-[#029bba] fill-[#029bba]"
                    : favoritesCount > 0
                      ? "text-red-500 fill-red-500"
                      : "text-gray-600"
                )}
              />
              {favoritesReady && favoritesCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5
                             min-w-[18px] h-[18px] px-1
                             rounded-full bg-red-500 text-white
                             text-[9px] font-black leading-none
                             flex items-center justify-center
                             border-2 border-white shadow-sm
                             animate-in zoom-in-50 duration-200"
                  aria-hidden="true"
                >
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen
                ? <icons.X className="w-6 h-6 text-gray-700" />
                : <icons.Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU (slide-in drawer) */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] lg:hidden animate-in fade-in duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <MobileDrawer
              onClose={() => setIsMobileMenuOpen(false)}
              onRequestLogin={() => {
                setIsMobileMenuOpen(false);
                setLoginContext("general");
                setIsLoginModalOpen(true);
              }}
              onRequestListingLogin={() => {
                setIsMobileMenuOpen(false);
                setLoginContext("listing");
                setIsLoginModalOpen(true);
              }}
              isLoggedIn={isLoggedIn}
              user={user ?? null}
              displayName={displayName}
              roleBadge={roleBadge}
              isDevApproved={isDevApproved}
              isAdmin={isAdmin}
              isAgent={isAgent}
              isDeveloper={isDeveloper}
              onLogout={handleLogout}
            />
          </>
        )}
      </header>

      {/* IN-PLACE AUTH GATE MODAL for saved, compare and listing intents */}
      <AuthGateModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        context={gateContext}
        actionDescription={
          loginContext === "listing" ? "list your property" :
          loginContext === "save" ? "save this property" :
          loginContext === "compare" ? "compare projects" :
          loginContext === "save_search" ? "save search alerts" :
          "access your account"
        }
        title={
          loginContext === "listing" ? "List Your Property" :
          loginContext === "save" ? "Save Property" :
          loginContext === "compare" ? "Compare Projects" :
          loginContext === "save_search" ? "Save Search Alerts" :
          "Welcome Back"
        }
      />
    </>
  );
};

export default Header;