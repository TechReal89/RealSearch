"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  tier: string;
  credit_balance: number;
  total_earned: number;
  total_spent: number;
  is_active: boolean;
};

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      if (requireAuth) router.push("/");
      return;
    }

    authApi
      .me()
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setLoading(false);
        if (requireAuth) router.push("/");
      });
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/");
  };

  return { user, loading, logout, setUser };
}
