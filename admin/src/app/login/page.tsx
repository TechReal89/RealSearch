"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import { Shield, User, Lock, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const tokens = await authApi.login(username, password);
      setTokens(tokens.access_token, tokens.refresh_token);

      const { user } = await authApi.me(tokens.access_token);
      if (user.role !== "admin") {
        toast.error("Không có quyền truy cập Admin");
        return;
      }

      toast.success("Đăng nhập thành công!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "pl-10 bg-[#0a0a10] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] focus:shadow-[0_0_12px_rgba(212,168,75,0.1)] text-[#f5f0e8] placeholder:text-[#444] transition-all duration-300";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#06060a]" />
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% -20%, rgba(212,168,75,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 85% 50%, rgba(212,168,75,0.03) 0%, transparent 40%)`,
      }} />

      {/* Top line */}
      <div className="absolute top-0 left-0 right-0 h-px gold-gradient opacity-30" />

      <div className="relative w-full max-w-[400px] px-4 z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="gold-glow-strong rounded-2xl mb-5 mx-auto inline-block" style={{ padding: 8 }}>
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-bold gold-shimmer tracking-tight">RealSearch</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield className="w-3.5 h-3.5 text-[#d4a84b]" />
            <p className="text-[#8a8999] text-sm uppercase tracking-widest font-semibold">Admin Panel</p>
          </div>
        </div>

        {/* Card */}
        <div className="luxury-card rounded-2xl gold-glow overflow-hidden">
          <div className="h-0.5 gold-gradient" />
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Username</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mật khẩu</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all h-11 btn-gold-hover text-sm tracking-wide"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#09090d] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Đăng nhập <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#333] uppercase tracking-widest mt-6">
          &copy; 2024 RealSearch &middot; Authorized Access Only
        </p>
      </div>
    </div>
  );
}
