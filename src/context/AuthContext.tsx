"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, User, Institute } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  institute: Institute | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; institute: Institute | null }>;
  logout: () => Promise<void>;
  // Lets the branding settings page reflect a saved logo/color/slug in the
  // header immediately, without waiting for the next /me fetch.
  setInstitute: (institute: Institute | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setInstitute(res.institute);
      })
      .catch(() => {
        setUser(null);
        setInstitute(null);
        // The session cookie is stale (deleted/deactivated user, expired or
        // invalid token) — middleware only checks that it decodes, so unless
        // we clear it server-side here, redirecting to /login just bounces
        // straight back to /dashboard, looping forever.
        api.logout().catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
    setInstitute(res.institute);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setInstitute(null);
    // Under /<institute>/dashboard/..., keep the same institute in the
    // redirect so the branded login page shows again; otherwise fall back
    // to the generic /login.
    const segments = pathname.split("/").filter(Boolean);
    const target = segments[1] === "dashboard" ? `/${segments[0]}/login` : "/login";
    router.push(target);
  };

  return (
    <AuthContext.Provider value={{ user, institute, loading, login, logout, setInstitute }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
