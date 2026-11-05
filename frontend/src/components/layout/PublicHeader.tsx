import React from 'react';
import { LogIn, Search, Shield, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface PublicHeaderProps {
  onOpenLogin: () => void;
  onGoToDashboard: () => void;
  onOpenProfile: () => void;
  onNavigateHome: () => void;
  onNavigateTramites: () => void;
  onNavigateRequisitos: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onOpenLogin,
  onGoToDashboard,
  onOpenProfile,
  onNavigateHome,
  onNavigateTramites,
  onNavigateRequisitos,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* 1. Barra Principal Superior */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">

          {/* Identidad / Logo limpio */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white shadow-md shrink-0">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-nowrap">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800 whitespace-nowrap">
                  {t.nav.systemTitle}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-blue-100 text-blue-800 rounded-full whitespace-nowrap shrink-0">
                  SGIM Ecuador
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                {t.nav.subTitle}
              </p>
            </div>
          </div>

          {/* Lado Derecho: Buscador + Botón Iniciar Sesión en la esquina superior derecha */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className={`${isAuthenticated ? 'hidden xl:flex' : 'hidden md:flex'} items-center relative`}>
              <input
                type="text"
                placeholder={t.nav.searchPlaceholder}
                className="w-48 xl:w-56 pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5" />
            </div>

            {/* BOTÓN INICIAR SESIÓN A LA DERECHA ARRIBA */}
            {!isAuthenticated ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg shadow-sm hover:shadow transition-all transform active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.nav.loginButton}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {/* Botón de Perfil del Usuario / Mi Cuenta */}
                <button
                  onClick={onOpenProfile}
                  title="Ver perfil, mis trámites o cambiar contraseña"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0">
                    {user?.nombres ? user.nombres.charAt(0) : (user?.username ? user.username.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div className="text-left max-w-[130px] sm:max-w-[170px] md:max-w-[210px]">
                    <span className="block font-semibold text-slate-800 leading-tight truncate">
                      {user?.nombres ? `${user.nombres} ${user.apellidos || ''}` : user?.username}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono truncate">
                      {user?.username}
                    </span>
                  </div>
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase whitespace-nowrap shrink-0">
                    {user?.rol === 'solo_lectura' ? 'Ciudadano' : user?.rol}
                  </span>
                </button>

                {/* Si es operador o admin, botón directo a Dashboard */}
                {user?.rol !== 'solo_lectura' && (
                  <button
                    onClick={onGoToDashboard}
                    title="Panel de control operativo"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <span>Panel Operativo</span>
                  </button>
                )}

                {/* Botón Cerrar Sesión */}
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sub-barra de Navegación estilo Ventanilla de Atención */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-10 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="font-bold text-slate-800">{t.nav.windowTitle}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span>{t.nav.subAgency}</span>
          </div>

          <nav className="flex items-center gap-6">
            <button 
              onClick={onNavigateHome} 
              className="text-blue-600 font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              {t.nav.menuInicio}
            </button>
            <button 
              onClick={onNavigateTramites} 
              className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium"
            >
              {t.nav.menuTramites}
            </button>
            <button 
              onClick={onNavigateRequisitos} 
              className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium"
            >
              {t.nav.menuRequisitos}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
