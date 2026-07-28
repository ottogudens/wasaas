'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  org: Org | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, org: Org) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  org: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('wasaas_token');
    const savedUser = localStorage.getItem('wasaas_user');
    const savedOrg = localStorage.getItem('wasaas_org');

    if (savedToken && savedUser && savedOrg) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setOrg(JSON.parse(savedOrg));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: User, newOrg: Org) => {
    localStorage.setItem('wasaas_token', newToken);
    localStorage.setItem('wasaas_user', JSON.stringify(newUser));
    localStorage.setItem('wasaas_org', JSON.stringify(newOrg));
    setToken(newToken);
    setUser(newUser);
    setOrg(newOrg);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wasaas_token');
    localStorage.removeItem('wasaas_user');
    localStorage.removeItem('wasaas_org');
    setToken(null);
    setUser(null);
    setOrg(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, org, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
