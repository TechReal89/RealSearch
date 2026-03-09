"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Briefcase, Coins, Wallet, Package, Download, LogOut, Crown, Menu, X,
  Shield, Gem, Award, Star,
} from "lucide-react";
import { useState } from "react";
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

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/jobs", label: "Công việc", icon: Briefcase },
  { href: "/credits", label: "Credits", icon: Coins },
  { href: "/payments", label: "Nạp tiền", icon: Wallet },
  { href: "/packages", label: "Gói VIP", icon: Package },
  { href: "/download", label: "Tải app", icon: Download },
];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#09090d]">
      {/* Header */}
      <header className="glass-dark border-b border-[rgba(212,168,75,0.08)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo + Nav */}
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="relative animate-pulse-gold rounded-xl">
                  <Logo size={36} />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold gold-shimmer tracking-tight">RealSearch</span>
                  <div className="h-px w-0 group-hover:w-full gold-gradient transition-all duration-300" />
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
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
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
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

              {/* User */}
              <span className="text-sm text-[#8a8999] hidden md:block font-medium">{user.username}</span>

              {/* Divider */}
              <div className="hidden md:block w-px h-5 bg-[rgba(255,255,255,0.06)]" />

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.05)]"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              {/* Mobile menu */}
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

            {/* Mobile nav items */}
            <div className="space-y-1">
              {navItems.map((item) => {
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
