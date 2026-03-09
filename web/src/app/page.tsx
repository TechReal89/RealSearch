"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Crown, Eye, EyeOff, User, Mail, Lock, Gift, ArrowRight, Sparkles, Shield, Star } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regName, setRegName] = useState("");
  const [refCode, setRefCode] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(loginUser, loginPass);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      toast.success("Đăng nhập thành công!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.register({
        username: regUser,
        email: regEmail,
        password: regPass,
        full_name: regName || undefined,
        referral_code: refCode || undefined,
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      toast.success("Đăng ký thành công!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "pl-10 bg-[#0a0a10] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] focus:shadow-[0_0_12px_rgba(212,168,75,0.1)] text-[#f5f0e8] placeholder:text-[#444] transition-all duration-300";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* Gold radial accents */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% -20%, rgba(212,168,75,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 85% 50%, rgba(212,168,75,0.04) 0%, transparent 40%),
          radial-gradient(ellipse at 15% 80%, rgba(212,168,75,0.03) 0%, transparent 40%)`,
      }} />

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(212,168,75,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,75,0.5) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Decorative elements */}
      <div className="absolute top-20 left-[15%] w-1 h-1 rounded-full bg-[#d4a84b] animate-sparkle opacity-40" />
      <div className="absolute top-40 right-[20%] w-1.5 h-1.5 rounded-full bg-[#f0d78c] animate-sparkle opacity-30" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-[25%] w-1 h-1 rounded-full bg-[#d4a84b] animate-sparkle opacity-25" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-48 right-[15%] w-1 h-1 rounded-full bg-[#f0d78c] animate-sparkle opacity-35" style={{ animationDelay: '0.5s' }} />

      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px gold-gradient opacity-30" />

      <div className="relative w-full max-w-[420px] px-4 z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="relative inline-block">
            <div className="gold-glow-strong rounded-2xl mb-5 mx-auto flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <Logo size={72} />
            </div>
            {/* Decorative corners */}
            <div className="absolute -top-2 -left-2 w-3 h-3 border-t-2 border-l-2 border-[rgba(212,168,75,0.3)]" />
            <div className="absolute -top-2 -right-2 w-3 h-3 border-t-2 border-r-2 border-[rgba(212,168,75,0.3)]" />
            <div className="absolute -bottom-2 -left-2 w-3 h-3 border-b-2 border-l-2 border-[rgba(212,168,75,0.3)]" />
            <div className="absolute -bottom-2 -right-2 w-3 h-3 border-b-2 border-r-2 border-[rgba(212,168,75,0.3)]" />
          </div>
          <h1 className="text-4xl font-bold gold-shimmer tracking-tight">RealSearch</h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[rgba(212,168,75,0.3)]" />
            <p className="text-[#8a8999] text-sm flex items-center gap-2 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-[#d4a84b]" />
              Premium Platform
              <Sparkles className="w-3.5 h-3.5 text-[#d4a84b]" />
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[rgba(212,168,75,0.3)]" />
          </div>
        </div>

        {/* Card */}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="luxury-card-premium rounded-2xl gold-glow overflow-hidden">
            {/* Top gold accent */}
            <div className="h-0.5 gold-gradient" />

            <Tabs defaultValue="login">
              <div className="px-6 pt-6 pb-2">
                <TabsList className="grid w-full grid-cols-2 bg-[#0a0a10] border border-[rgba(212,168,75,0.08)] p-1 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-[rgba(212,168,75,0.12)] data-[state=active]:text-[#d4a84b] data-[state=active]:shadow-none text-[#8a8999] text-sm font-semibold transition-all">
                    Đăng nhập
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-[rgba(212,168,75,0.12)] data-[state=active]:text-[#d4a84b] data-[state=active]:shadow-none text-[#8a8999] text-sm font-semibold transition-all">
                    Đăng ký
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-6 pb-6">
                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Username hoặc Email</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value)}
                          placeholder="username"
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
                          type={showPass ? "text" : "password"}
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                          className={`${inputClass} pr-10`}
                          required
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#d4a84b] transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Username</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input value={regUser} onChange={(e) => setRegUser(e.target.value)} placeholder="username" className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="email@example.com" className={inputClass} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Họ tên</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Nguyễn Văn A" className={inputClass} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mật khẩu</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input type={showRegPass ? "text" : "password"} value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" className={`${inputClass} pr-10`} required />
                        <button type="button" onClick={() => setShowRegPass(!showRegPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#d4a84b] transition-colors">
                          {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mã giới thiệu</Label>
                      <div className="relative group">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                        <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="ABC12345" className={inputClass} />
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
                        <>Tạo tài khoản <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#555]" />
            <span className="text-xs text-[#555] uppercase tracking-wider">Bảo mật & An toàn</span>
          </div>
          <p className="text-[10px] text-[#333] uppercase tracking-widest">
            &copy; 2024 RealSearch &middot; Premium Traffic Exchange Platform
          </p>
        </div>
      </div>
    </div>
  );
}
