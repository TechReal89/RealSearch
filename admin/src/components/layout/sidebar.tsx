"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tổng quan", icon: "~" },
  { href: "/users", label: "Người dùng", icon: "U" },
  { href: "/jobs", label: "Công việc", icon: "J" },
  { href: "/credits", label: "Credits", icon: "C" },
  { href: "/payments", label: "Thanh toán", icon: "P" },
  { href: "/packages", label: "Gói dịch vụ", icon: "K" },
  { href: "/monitoring", label: "Giám sát", icon: "M" },
  { href: "/settings", label: "Cài đặt", icon: "S" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">RealSearch</h1>
        <p className="text-sm text-muted-foreground">Bảng điều khiển</p>
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="w-5 text-center font-mono">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
