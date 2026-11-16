// src/components/Shell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  FileCheck2,
  CheckSquare,
  Scale,
  BarChart3,
  Bell,
  ShieldCheck,
  User,
  Search,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../app/theme';
import { canAccessAdmin, canAccessReports, canApproveMinutes } from '../auth/permissions';
import { MOCK_NOTIFICATIONS } from '../data/mockData';
import DemoBanner from './DemoBanner';

export default function Shell({ children }) {
  const {
    currentUser,
    currentWorkspace,
    logout,
    switchDemoRole,
    switchDemoUser,
    demoUsers,
    isDemo,
  } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mainScrollRef = useRef(null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  const unreadNotifsCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/decisions?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Dynamic Navigation Items based on user role and permissions
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
    { label: 'Meetings', path: '/meetings', icon: CalendarDays, show: true },
    { label: 'Calendar', path: '/calendar', icon: Calendar, show: true },
    {
      label: 'Approvals',
      path: '/approvals',
      icon: FileCheck2,
      show: canApproveMinutes(currentUser),
    },
    { label: 'Actions', path: '/actions', icon: CheckSquare, show: true },
    { label: 'Decisions', path: '/decisions', icon: Scale, show: true },
    {
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
      show: canAccessReports(currentUser),
    },
    { label: 'Notifications', path: '/notifications', icon: Bell, show: true, badge: unreadNotifsCount },
    {
      label: 'Admin',
      path: '/admin',
      icon: ShieldCheck,
      show: canAccessAdmin(currentUser),
    },
    { label: 'Profile', path: '/profile', icon: User, show: true },
  ];

  return (
    <div className="h-screen h-[100dvh] max-h-screen bg-bg flex flex-col selection:bg-accent selection:text-text-primary overflow-hidden">
      {/* ---------------- PERSISTENT DEMO BANNER (Demo mode only) ---------------- */}
      <div className="shrink-0 z-40">
        <DemoBanner />
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ---------------- DESKTOP SIDEBAR (820px+) ---------------- */}
        <aside className="hidden lg:flex w-64 bg-surface border-r border-border flex-col justify-between select-none z-30 shrink-0 h-full overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-border">
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-btn bg-text-primary text-accent flex items-center justify-center font-heading font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                  M
                </div>
                <span className="font-heading font-bold text-lg tracking-tight text-text-primary">
                  meet<span className="text-text-primary">track</span>
                  <span className="text-accent text-xl leading-none">.</span>
                </span>
              </Link>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-secondary px-3 mb-2 font-semibold">
                Menu
              </div>
              <nav className="flex flex-col gap-1">
                {navItems
                  .filter((item) => item.show)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-2.5 rounded-btn text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-accent text-accent-text font-semibold shadow-xs'
                              : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge > 0 && (
                          <span className="w-5 h-5 rounded-full bg-error text-white text-[10px] font-mono font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>

            {/* Bottom Demo Role & User Switcher (Only in Demo Mode) */}
            {isDemo && (
              <div className="p-3 border-t border-border bg-surface-muted/30">
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                  <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">
                    Engineering Fest Personas
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-accent text-accent-text text-[9px] font-bold font-mono">
                    DEMO
                  </span>
                </div>
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => switchDemoUser && switchDemoUser(e.target.value)}
                  className="w-full h-8 px-2 bg-surface border border-border text-text-primary rounded-btn text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent mb-2"
                >
                  {(demoUsers || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}{u.isApprover ? ' • Approver' : ''})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-1">
                  {['Admin', 'Coordinator', 'Participant'].map((role) => (
                    <button
                      key={role}
                      onClick={() => switchDemoRole(role)}
                      className={`py-1 text-[10px] rounded-btn border text-center font-medium transition-colors ${
                        currentUser?.role === role
                          ? 'bg-text-primary text-bg border-text-primary font-bold'
                          : 'bg-surface hover:bg-surface-muted text-text-secondary border-border'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ---------------- MOBILE DRAWER (<820px) ---------------- */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-surface border-r border-border h-full flex flex-col justify-between p-4 z-10 animate-fade-in">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-btn bg-text-primary text-accent flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                    <span className="font-heading font-bold text-base text-text-primary">
                      MeetTrack
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-btn hover:bg-surface-muted text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1">
                  {navItems
                    .filter((item) => item.show)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-btn text-sm font-medium ${
                              isActive
                                ? 'bg-accent text-accent-text font-semibold'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 stroke-[2]" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge > 0 && (
                            <span className="w-5 h-5 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                </nav>
              </div>

              {/* Mobile Role Switcher (Demo Only) */}
              {isDemo && (
                <div className="pt-3 border-t border-border">
                  <span className="font-mono uppercase text-[10px] tracking-wider text-text-secondary block mb-2 font-semibold">
                    Engineering Fest Personas (Demo)
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {['Admin', 'Coordinator', 'Participant'].map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          switchDemoRole(role);
                          setMobileMenuOpen(false);
                        }}
                        className={`py-1 text-[11px] rounded-btn border text-center font-medium ${
                          currentUser?.role === role
                            ? 'bg-text-primary text-bg font-bold'
                            : 'bg-surface text-text-secondary border-border'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- MAIN CONTENT AREA ---------------- */}
        <div
          ref={mainScrollRef}
          id="main-content-scroll"
          className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto scroll-smooth"
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-30 shrink-0 h-16 bg-surface/90 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile hamburger & breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-btn text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sm">
                <span className="font-heading font-bold text-base sm:text-lg text-text-primary capitalize">
                  {location.pathname.replace('/', '') || 'Dashboard'}
                </span>
                <span className="text-text-secondary hidden sm:inline">•</span>
                <span
                  className="text-text-secondary text-xs font-mono hidden sm:inline truncate max-w-[220px]"
                  title={currentWorkspace?.name || (isDemo ? 'Engineering Fest 2026' : 'MeetTrack Workspace')}
                >
                  {currentWorkspace?.name || (isDemo ? 'Engineering Fest 2026' : 'MeetTrack Workspace')}
                </span>
              </div>
            </div>

            {/* Center: Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex items-center relative max-w-xs w-full"
            >
              <Search className="w-4 h-4 absolute left-3 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings, actions, decisions... /"
                className="w-full h-9 pl-9 pr-8 bg-surface-muted/60 border border-border rounded-input text-xs text-text-primary placeholder:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-secondary border border-border rounded px-1 bg-surface">
                /
              </kbd>
            </form>

            {/* Right: Theme Toggle, Notifications, User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 3-way Theme Switcher per spec (Light, Dark, System) */}
              <div
                className="flex items-center bg-surface-muted p-1 rounded-btn border border-border"
                role="radiogroup"
                aria-label="Theme switcher"
              >
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-btn text-xs transition-colors ${
                    theme === 'light'
                      ? 'bg-surface text-text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Light theme"
                  aria-label="Light theme"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-btn text-xs transition-colors ${
                    theme === 'dark'
                      ? 'bg-surface text-text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Dark theme"
                  aria-label="Dark theme"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-1.5 rounded-btn text-xs transition-colors ${
                    theme === 'system'
                      ? 'bg-surface text-text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="System theme"
                  aria-label="System theme"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-btn text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 stroke-[2]" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </Link>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* User Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 p-1 rounded-btn hover:bg-surface-muted transition-colors"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-text flex items-center justify-center font-heading font-bold text-xs shadow-xs">
                    {currentUser?.initials || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-text-primary leading-tight">
                      {currentUser?.name || 'Guest User'}
                    </div>
                    <div className="text-[10px] text-text-secondary font-mono leading-tight">
                      {currentUser?.role} {currentUser?.isApprover ? '• Approver' : ''}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-card shadow-xl py-2 z-50 animate-modal-enter">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-text-primary">{currentUser?.name}</p>
                      <p className="text-[11px] text-text-secondary truncate">{currentUser?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-muted text-[10px] font-mono text-text-primary">
                        Role: {currentUser?.role}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile & Settings</span>
                    </Link>

                    <Link
                      to="/"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>MeetTrack Landing Page</span>
                    </Link>

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-error hover:bg-error-bg transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in pb-20">{children}</main>
        </div>
      </div>
    </div>
  );
}

