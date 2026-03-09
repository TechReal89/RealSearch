"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Briefcase, Coins, Wallet, LogOut, Crown, Menu, X,
  Shield, Gem, Award, Star, User, Gift, Download, ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Logo } from "@/components/ui/logo";

const tierConfig: Record<string, { label: string; color: string; bg: string; borderColor: string; icon: typeof Crown; glow: string }> = {
  bronze: {
    label: "Bronze",
    color: "text-amber-600",
    bg: "bg-gradient-to-r from-amber-950/40 to-amber-900/20",
    borderColor: "border-amber-700/30",
    icon: Shield,
    glow: "",
  },
  silver: {
    label: "Silver",
    color: "text-gray-300",
    bg: "bg-gradient-to-r from-gray-800/40 to-gray-700/20",
    borderColor: "border-gray-500/30",
    icon: Award,
    glow: "",
  },
  gold: {
    label: "Gold",
    color: "text-[#d4a84b]",
    bg: "bg-gradient-to-r from-[rgba(212,168,75,0.2)] to-[rgba(212,168,75,0.05)]",
    borderColor: "border-[rgba(212,168,75,0.3)]",
    icon: Crown,
    glow: "shadow-[0_0_12px_rgba(212,168,75,0.15)]",
  },
  diamond: {
    label: "Diamond",
    color: "text-cyan-300",
    bg: "bg-gradient-to-r from-cyan-900/30 to-cyan-800/10",
    borderColor: "border-cyan-400/30",
    icon: Gem,
    glow: "shadow-[0_0_12px_rgba(103,232,249,0.15)]",
  },
};

const mainNavItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/jobs", label: "Công việc", icon: Briefcase },
  { href: "/credits", label: "Credits", icon: Coins },
  { href: "/payments", label: "Nạp tiền", icon: Wallet },
  { href: "/upgrade", label: "Nâng cấp", icon: Crown },
];

const userMenuItems = [
  { href: "/profile", label: "Hồ sơ", icon: User },
  { href: "/referral", label: "Giới thiệu bạn bè", icon: Gift },
  { href: "/download", label: "Tải app", icon: Download },
];

const allNavItems = [...mainNavItems, ...userMenuItems];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090d]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[rgba(212,168,75,0.15)]" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[#8a8999] text-sm tracking-wider uppercase">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const tier = tierConfig[user.tier] || tierConfig.bronze;
  const TierIcon = tier.icon;
  const isUserMenuActive = userMenuItems.some((item) => pathname === item.href);

  return (
    <div className="min-h-screen bg-[#09090d]">
      {/* Header */}
      <header className="glass-dark border-b border-[rgba(212,168,75,0.08)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center gap-4">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative animate-pulse-gold rounded-xl">
                <Logo size={36} />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold gold-shimmer tracking-tight">RealSearch</span>
                <div className="h-px w-0 group-hover:w-full gold-gradient transition-all duration-300" />
              </div>
            </Link>

            {/* Desktop Nav - centered, evenly spaced */}
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "text-[#d4a84b] bg-[rgba(212,168,75,0.1)]"
                        : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {isActive && (
                      <div className="absolute bottom-0 left-3 right-3 h-px gold-gradient" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Credits Display */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(212,168,75,0.06)] border border-[rgba(212,168,75,0.12)] gold-glow-subtle">
                <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center">
                  <Coins className="w-3 h-3 text-[#09090d]" />
                </div>
                <span className="text-sm font-bold text-[#d4a84b] stat-value">
                  {user.credit_balance.toLocaleString()}
                </span>
              </div>

              {/* Tier Badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${tier.bg} border ${tier.borderColor} ${tier.glow}`}>
                <TierIcon className={`w-3.5 h-3.5 ${tier.color}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${tier.color}`}>{tier.label}</span>
              </div>

              {/* User Dropdown */}
              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isUserMenuActive || userMenuOpen
                      ? "text-[#d4a84b] bg-[rgba(212,168,75,0.1)]"
                      : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#d4a84b]" />
                  </div>
                  <span className="max-w-[80px] truncate">{user.username}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[rgba(212,168,75,0.1)] bg-[#111118] shadow-2xl shadow-black/50 overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
                      <p className="text-sm font-semibold text-[#f5f0e8]">{user.full_name || user.username}</p>
                      <p className="text-xs text-[#555] truncate">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      {userMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                              isActive
                                ? "text-[#d4a84b] bg-[rgba(212,168,75,0.08)]"
                                : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.03)]"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-[rgba(255,255,255,0.04)] py-1.5">
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#8a8999] hover:text-rose-400 hover:bg-[rgba(255,255,255,0.03)] w-full transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden text-[#8a8999] hover:text-[#f5f0e8] p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[rgba(212,168,75,0.06)] bg-[#09090d]/95 backdrop-blur-xl px-4 py-4">
            {/* Mobile credits & tier */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(212,168,75,0.06)] border border-[rgba(212,168,75,0.12)]">
                <Coins className="w-4 h-4 text-[#d4a84b]" />
                <span className="text-sm font-bold text-[#d4a84b]">{user.credit_balance.toLocaleString()}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${tier.bg} border ${tier.borderColor}`}>
                <TierIcon className={`w-3.5 h-3.5 ${tier.color}`} />
                <span className={`text-xs font-bold uppercase ${tier.color}`}>{tier.label}</span>
              </div>
            </div>

            {/* Mobile nav items - all items */}
            <div className="space-y-1">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[rgba(212,168,75,0.1)] text-[#d4a84b]"
                        : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {isActive && <Star className="w-3 h-3 text-[#d4a84b] ml-auto" />}
                  </Link>
                );
              })}

              {/* Mobile logout */}
              <div className="pt-3 mt-3 border-t border-[rgba(255,255,255,0.04)]">
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8a8999] hover:text-rose-400 hover:bg-[rgba(255,255,255,0.03)] w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 page-pattern">{children}</main>

      {/* Footer accent line */}
      <div className="ornament-line mt-auto" />
    </div>
  );
}
