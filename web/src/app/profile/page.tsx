"use client";

import { useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { useAuth } from "@/hooks/useAuth";
import { userApi, authApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Mail, Phone, Shield, Crown, Lock, Save, Eye, EyeOff,
  Gem, Award, Sparkles, CheckCircle, Calendar,
} from "lucide-react";

const tierConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  bronze: { label: "Bronze", color: "text-amber-600", bg: "from-amber-900/20 to-amber-800/5", icon: Shield },
  silver: { label: "Silver", color: "text-gray-300", bg: "from-gray-600/20 to-gray-700/5", icon: Award },
  gold: { label: "Gold", color: "text-[#d4a84b]", bg: "from-[rgba(212,168,75,0.15)] to-[rgba(212,168,75,0.03)]", icon: Crown },
  diamond: { label: "Diamond", color: "text-cyan-300", bg: "from-cyan-700/20 to-cyan-800/5", icon: Gem },
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState((user as Record<string, unknown>)?.phone as string || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const tier = tierConfig[user?.tier || "bronze"] || tierConfig.bronze;
  const TierIcon = tier.icon;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const data: Record<string, unknown> = {};
      if (fullName !== user?.full_name) data.full_name = fullName;
      if (phone) data.phone = phone;

      if (Object.keys(data).length === 0) {
        toast.info("Không có thay đổi nào");
        setSavingProfile(false);
        return;
      }

      const updated = await userApi.updateProfile(data);
      if (setUser && updated) {
        setUser({ ...user!, full_name: updated.full_name || user!.full_name });
      }
      toast.success("Cập nhật hồ sơ thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật hồ sơ";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đổi mật khẩu thất bại";
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const inputClass = "bg-[#0a0a10] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] text-[#f5f0e8] placeholder:text-[#444]";

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <User className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Hồ sơ cá nhân</h2>
            <p className="text-sm text-[#8a8999]">Quản lý thông tin tài khoản của bạn</p>
          </div>
        </div>

        <div className="ornament-line" />

        {/* Tier Badge */}
        <div className={`luxury-card rounded-xl p-5 bg-gradient-to-r ${tier.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              user?.tier === "gold" || user?.tier === "diamond" ? "gold-gradient" : "bg-white/5"
            }`}>
              <TierIcon className={`w-7 h-7 ${user?.tier === "gold" || user?.tier === "diamond" ? "text-[#09090d]" : tier.color}`} />
            </div>
            <div>
              <p className="text-xs text-[#8a8999] uppercase tracking-wider">Cấp bậc hiện tại</p>
              <p className={`text-xl font-bold ${tier.color}`}>{tier.label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-[#8a8999]">Số dư Credit</p>
              <p className="text-xl font-bold text-[#d4a84b] stat-value">{user?.credit_balance.toLocaleString() || "0"}</p>
            </div>
          </div>
        </div>

        {/* Personal Info Section */}
        <div className="luxury-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Thông tin cá nhân</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Username - readonly */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Tên đăng nhập
              </Label>
              <Input
                value={user?.username || ""}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </div>

            {/* Email - readonly */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input
                value={user?.email || ""}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </div>

            {/* Full Name - editable */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Họ và tên
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                className={inputClass}
              />
            </div>

            {/* Phone - editable */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Số điện thoại
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all btn-gold-hover"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="luxury-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Đổi mật khẩu</h3>
          </div>

          <div className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Mật khẩu hiện tại</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#8a8999] transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#8a8999] transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Xác nhận mật khẩu mới</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className={inputClass}
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword}
              className="gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all btn-gold-hover mt-2"
            >
              <Lock className="w-4 h-4 mr-2" />
              {changingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="luxury-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Thông tin tài khoản</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[#8a8999] text-xs mb-1">Tổng đã kiếm</p>
              <p className="text-emerald-400 font-bold stat-value">+{user?.total_earned.toLocaleString() || "0"}</p>
            </div>
            <div>
              <p className="text-[#8a8999] text-xs mb-1">Tổng đã chi</p>
              <p className="text-rose-400 font-bold stat-value">-{user?.total_spent.toLocaleString() || "0"}</p>
            </div>
            <div>
              <p className="text-[#8a8999] text-xs mb-1">Số dư hiện tại</p>
              <p className="text-[#d4a84b] font-bold stat-value">{user?.credit_balance.toLocaleString() || "0"}</p>
            </div>
            <div>
              <p className="text-[#8a8999] text-xs mb-1">Trạng thái</p>
              <p className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
              </p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
