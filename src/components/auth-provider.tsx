'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AUTH_STORAGE_KEYS, getDefaultDashboardPath, type User, type UserRole } from '@/lib/auth';
import { LoadingSpinner } from './loading-spinner';
import { getCognitoLogoutUrl, startCognitoSignIn } from '@/lib/cognito';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role?: UserRole) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleAuthRedirect = useCallback((currentUser: User | null) => {
    const isEntryPage = pathname === '/login' || pathname === '/' || pathname.startsWith('/auth/callback');
    
    if (currentUser) {
        if (isEntryPage) {
            // If logged in and on an entry/login page, redirect to appropriate dashboard
        router.replace(getDefaultDashboardPath(currentUser.role));
        }
    } else {
        if (!isEntryPage) {
            // If not logged in and not on an entry page, redirect to the animated home/login
            router.replace('/');
        }
    }
    setIsLoading(false);
  }, [pathname, router]);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem(AUTH_STORAGE_KEYS.user);
      const storedToken = sessionStorage.getItem(AUTH_STORAGE_KEYS.token);
        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            handleAuthRedirect(parsedUser);
        } else {
            handleAuthRedirect(null);
        }
    } catch (error) {
        console.error("Failed to parse user from session storage", error);
        sessionStorage.clear();
        handleAuthRedirect(null);
    }
  }, [handleAuthRedirect]);

  const login = async (role?: UserRole) => {
    await startCognitoSignIn(role);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.idToken);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);

    const logoutUrl = getCognitoLogoutUrl();
    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }
    router.push('/');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
