"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, User } from "@/lib/api";
import { getToken, clearTokens } from "@/lib/auth";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    authApi
      .me(token)
      .then(({ user }) => {
        if (user.role !== "admin") {
          clearTokens();
          router.replace("/login");
          return;
        }
        setUser(user);
      })
      .catch(() => {
        clearTokens();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    clearTokens();
    router.replace("/login");
  };

  return { user, loading, logout };
}
