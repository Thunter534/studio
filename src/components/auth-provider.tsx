'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { type User, type UserRole, mockUsers, getMockToken } from '@/lib/auth';
import { LoadingSpinner } from './loading-spinner';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole) => void;
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
    const isEntryPage = pathname === '/login' || pathname === '/';
    
    if (currentUser) {
        if (isEntryPage) {
            // If logged in and on an entry/login page, redirect to appropriate dashboard
            router.replace(currentUser.role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard');
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
    // This effect simulates checking for an existing session on component mount.
    try {
        const storedUser = sessionStorage.getItem('classpulse_user');
        const storedToken = sessionStorage.getItem('classpulse_token');
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

  const login = (role: UserRole) => {
    const userToLogin = mockUsers[role];
    const userToken = getMockToken(role);
    setUser(userToLogin);
    setToken(userToken);
    sessionStorage.setItem('classpulse_user', JSON.stringify(userToLogin));
    sessionStorage.setItem('classpulse_token', userToken);
    router.push(role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('classpulse_user');
    sessionStorage.removeItem('classpulse_token');
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
