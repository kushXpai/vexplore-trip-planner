// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/supabase/client';
import type { User } from '@/types/trip';
import { signIn as supabaseSignIn, signOut as supabaseSignOut } from '@/supabase/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Load user from localStorage initially
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          // Try fetching profile from 'users' table
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single<User>();

          // TS-safe fallback if row missing
          const currentUser: User = profile || {
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: data.session.user.email?.split('@')[0] || 'User',
            role: 'manager', // default role
          };

          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error('Error fetching session/profile:', err);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single<User>()
          .then(({ data: profile }) => {
            const currentUser: User = profile || {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              role: 'manager', // default role
            };

            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          });
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const profile = await supabaseSignIn(email, password);
      if (profile) {
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      }
      return !!profile;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  // Role helpers - UPDATED to include superadmin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isAuthenticated = !!user;

  // Return loading state so UI waits before rendering
  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin,
      isSuperAdmin,
      isAuthenticated 
    }}>
      {loading ? <div className="text-center py-12">Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};