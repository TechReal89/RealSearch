"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  LayoutDashboard, Users, Briefcase, Coins, Wallet, Package, Gift, Monitor, Server, Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/users", label: "Người dùng", icon: Users },
  { href: "/jobs", label: "Công việc", icon: Briefcase },
  { href: "/credits", label: "Credits", icon: Coins },
  { href: "/payments", label: "Thanh toán", icon: Wallet },
  { href: "/packages", label: "Gói dịch vụ", icon: Package },
  { href: "/promotions", label: "Khuyến mãi", icon: Gift },
  { href: "/monitoring", label: "Giám sát", icon: Monitor },
  { href: "/server-monitor", label: "Máy chủ", icon: Server },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[rgba(212,168,75,0.08)] bg-[#0c0c12] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(212,168,75,0.06)]">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size={32} />
          <div>
            <h1 className="text-lg font-bold gold-shimmer tracking-tight">RealSearch</h1>
            <p className="text-[10px] text-[#8a8999] uppercase tracking-widest">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[rgba(212,168,75,0.1)] text-[#d4a84b] border border-[rgba(212,168,75,0.15)]"
                  : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-[#d4a84b]" : "")} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4a84b] shadow-[0_0_6px_rgba(212,168,75,0.4)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[rgba(212,168,75,0.06)]">
        <p className="text-[10px] text-[#555] uppercase tracking-widest">RealSearch &copy; 2024</p>
      </div>
    </aside>
  );
}
