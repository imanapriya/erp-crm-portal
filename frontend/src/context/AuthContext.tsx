import { createContext, ReactNode, useContext, useState } from "react";
import { apiClient } from "../api/client";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("erp_crm_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("erp_crm_token"));
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const { token: newToken, user: newUser } = res.data.data;
      localStorage.setItem("erp_crm_token", newToken);
      localStorage.setItem("erp_crm_user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("erp_crm_token");
    localStorage.removeItem("erp_crm_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
