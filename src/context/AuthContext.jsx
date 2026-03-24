import { createContext, useEffect, useMemo, useState, useContext } from "react";
import { loginRequest, meRequest } from "../services/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      const u = await meRequest();
      setUser(u);
      return u;
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, senha) {
    setLoading(true);
    const data = await loginRequest(email, senha);
    localStorage.setItem("access_token", data.access_token);
    await loadUser();
  }

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setLoading(false);
  }

  async function refresh() {
    setLoading(true);
    return await loadUser();
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
