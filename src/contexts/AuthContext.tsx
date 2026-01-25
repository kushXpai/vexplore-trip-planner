// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/supabase/client';
import type { User, UserRole } from '@/types/trip';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 On app start, immediately log out and clear session
  useEffect(() => {
    const init = async () => {
      // Clear Supabase session on every refresh
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
    };

    init();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile error:', error);
        setUser(null);
        return;
      }

      setUser(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser(null);
    }
  };

  // 🔐 Login
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) return false;

      // Load profile after successful login
      await loadProfile(data.user.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // 🔐 Signup
  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) return false;

      // Create profile row
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role,
      });

      // Load profile after signup
      await loadProfile(data.user.id);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  // 🚪 Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};