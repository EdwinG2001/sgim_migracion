import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { PublicPortalPage } from './pages/PublicPortalPage';
import { DashboardPage } from './pages/DashboardPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [currentView, setCurrentView] = useState<'portal' | 'dashboard'>('portal');

  const handleGoToDashboard = () => {
    // Los ciudadanos (solo_lectura) o usuarios no autenticados NUNCA ingresan al panel operativo
    if (!isAuthenticated || user?.rol === 'solo_lectura') {
      return;
    }
    setCurrentView('dashboard');
  };

  // Si intenta estar en dashboard pero es solo_lectura o no está autenticado, forzar portal público
  if (currentView === 'dashboard' && (!isAuthenticated || user?.rol === 'solo_lectura')) {
    return <PublicPortalPage onGoToDashboard={handleGoToDashboard} />;
  }

  if (currentView === 'dashboard') {
    return <DashboardPage onBackToPortal={() => setCurrentView('portal')} />;
  }

  return (
    <PublicPortalPage 
      onGoToDashboard={handleGoToDashboard} 
    />
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
