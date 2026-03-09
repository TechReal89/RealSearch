"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[rgba(212,168,75,0.08)] glass-dark sticky top-0 z-40 flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            {/* Admin badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(212,168,75,0.08)] border border-[rgba(212,168,75,0.12)]">
              <Shield className="w-3 h-3 text-[#d4a84b]" />
              <span className="text-[10px] text-[#d4a84b] uppercase tracking-wider font-bold">Admin</span>
            </div>
            <span className="text-sm text-[#8a8999] font-medium">
              {user.username}
            </span>
            <div className="w-px h-5 bg-[rgba(255,255,255,0.06)]" />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.05)]"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Đăng xuất
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
