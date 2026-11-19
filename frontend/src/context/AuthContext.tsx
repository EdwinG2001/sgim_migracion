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

  // Capturar retorno de Keycloak SSO (hash con #access_token=...)
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        try {
          const payloadBase64 = accessToken.split('.')[1];
          const payloadJson = decodeURIComponent(
            atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(payloadJson);
          const roles = payload.realm_access?.roles || [];
          const isAdmin = roles.includes('ADMIN') || roles.includes('admin');
          const keycloakUser: UserProfile = {
            id: payload.sub || 'keycloak-user',
            username: payload.preferred_username || payload.name || 'admin',
            rol: isAdmin ? 'admin' : 'oficial_migracion',
            nombres: payload.given_name || payload.name || 'Operador',
            apellidos: payload.family_name || 'Keycloak Migración',
            numero_documento: '1700000000',
            nacionalidad: 'ECU',
          };
          setSession(accessToken, keycloakUser);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Error procesando token Keycloak:', err);
        }
      }
    }
  }, []);

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

