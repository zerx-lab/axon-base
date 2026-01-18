"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { SafeUser, Role } from "@/lib/supabase/types";

export interface User extends SafeUser {
  role?: Role;
  permissions: string[];
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "axon_session_token";
const USER_ID_KEY = "axon_user_id";

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  const validateSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (result.valid) {
        setUser({
          ...result.user,
          role: result.role,
          permissions: result.permissions || [],
          isSuperAdmin: result.isSuperAdmin || false,
        });
        localStorage.setItem(USER_ID_KEY, result.user.id);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        setUser(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (result.success) {
          localStorage.setItem(TOKEN_KEY, result.token);
          localStorage.setItem(USER_ID_KEY, result.user.id);
          setUser({
            ...result.user,
            role: result.role,
            permissions: result.permissions || [],
            isSuperAdmin: result.isSuperAdmin || false,
          });
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch {
        return { success: false, error: "Login failed. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Ignore logout errors
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  // Permission checking methods
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // Super admin has all permissions
      if (user.isSuperAdmin) return true;
      // Safety check: if permissions is undefined or not an array, return false
      if (!user.permissions || !Array.isArray(user.permissions)) return false;
      // Check if user has wildcard permission (all permissions)
      if (user.permissions.includes("*")) return true;
      // Check specific permission
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (...permissions: string[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
