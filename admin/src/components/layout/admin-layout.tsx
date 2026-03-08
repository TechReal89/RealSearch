"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.username} ({user.role})
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Đăng xuất
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
