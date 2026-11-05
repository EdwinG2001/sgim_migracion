import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { UserProfile, AuthResponse } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  setSession: (token: string, user: UserProfile) => void;
  updatePhone: (telefono: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sgim_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sgim_token');
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('sgim_token', token);
    } else {
      localStorage.removeItem('sgim_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sgim_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sgim_user');
    }
  }, [user]);

  const setSession = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('sgim_token', newToken);
    localStorage.setItem('sgim_user', JSON.stringify(newUser));
  };

  const login = async (username: string, password: string): Promise<UserProfile> => {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    if (res.data.success && res.data.data) {
      setSession(res.data.data.token, res.data.data.user);
      return res.data.data.user;
    }
    throw new Error(res.data.message || 'Error al iniciar sesión');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sgim_token');
    localStorage.removeItem('sgim_user');
  };

  const updatePhone = async (telefono: string) => {
    const res = await api.post('/auth/update-phone', { telefono });
    if (res.data.success) {
      setUser((prev) => (prev ? { ...prev, telefono } : null));
    } else {
      throw new Error(res.data.message || 'Error actualizando teléfono');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Error cambiando contraseña');
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setUser((prev) => ({
          ...prev,
          id: d.id,
          username: d.username,
          rol: d.rol,
          nombres: d.persona?.nombres || prev?.nombres,
          apellidos: d.persona?.apellidos || prev?.apellidos,
          numero_documento: d.persona?.numero_documento || prev?.numero_documento,
          nacionalidad: d.persona?.nacionalidad || prev?.nacionalidad,
          telefono: d.telefonos?.[0]?.numero || prev?.telefono,
        }));
      }
    } catch {
      // Ignorar error de refresh
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      login,
      logout,
      setSession,
      updatePhone,
      changePassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

