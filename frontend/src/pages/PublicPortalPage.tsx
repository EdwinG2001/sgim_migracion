import React, { useState } from 'react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { HeroSection } from '../components/portal/HeroSection';
import { TramitesGrid } from '../components/portal/TramitesGrid';
import { RequisitosSection } from '../components/portal/RequisitosSection';
import { GlassLoginModal } from '../components/auth/GlassLoginModal';
import { TramiteDetailModal } from '../components/portal/TramiteDetailModal';
import { TramiteModal } from '../components/portal/TramiteModal';
import { UserProfileModal } from '../components/portal/UserProfileModal';
import { ConsultaPublicaModal } from '../components/portal/ConsultaPublicaModal';
import { Shield, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PublicPortalPageProps {
  onGoToDashboard: () => void;
}

export const PublicPortalPage: React.FC<PublicPortalPageProps> = ({ onGoToDashboard }) => {
  const { isAuthenticated, user } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  // Modal de Perfil de Usuario (Exclusivo Datos Personales y Seguridad)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'security'>('profile');

  // Modal de Consulta de Trámites (Pantalla independiente y dedicada)
  const [isConsultaOpen, setIsConsultaOpen] = useState(false);

  // Modal de Detalles
  const [selectedTramite, setSelectedTramite] = useState<any | null>(null);

  // Modal de Solicitud de Trámite Autenticado
  const [isTramiteModalOpen, setIsTramiteModalOpen] = useState(false);
  const [activeTramiteType, setActiveTramiteType] = useState<string>('prorroga');
  const [activeTramiteTitle, setActiveTramiteTitle] = useState<string>('Prórroga de Estadía Turística');

  const handleStartTramite = (tipo: string, title?: string) => {
    setActiveTramiteType(tipo);
    const titleFallback: Record<string, string> = {
      refugio: 'Solicitud de estatuto de refugiado y protección internacional',
      prorroga: 'Prórroga de Estadía Turística',
      visa: 'Solicitud de visa de residencia temporal o permanente',
      censo: 'Registro y Empadronamiento de Censo Migratorio (VIRTE)',
      movimiento: 'Certificado de Movimientos Migratorios',
    };
    setActiveTramiteTitle(title || titleFallback[tipo] || 'Formulario de Trámite');

    if (!isAuthenticated) {
      setLoginNotice("Para solicitar este trámite, por favor inicie sesión o cree su cuenta primero.");
      setIsLoginOpen(true);
    } else {
      setIsTramiteModalOpen(true);
    }
  };

  const handleOpenConsulta = () => {
    setIsConsultaOpen(true);
  };

  const handleNavigateHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateTramites = () => {
    const el = document.getElementById('tramites');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateRequisitos = () => {
    const el = document.getElementById('requisitos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">

      {/* 1. Header Oficial (Navegación limpia sin Consultar Trámite repetido) */}
      <PublicHeader
        onOpenLogin={() => { setLoginNotice(null); setIsLoginOpen(true); }}
        onGoToDashboard={onGoToDashboard}
        onOpenProfile={() => { setProfileTab('profile'); setIsProfileOpen(true); }}
        onNavigateHome={handleNavigateHome}
        onNavigateTramites={handleNavigateTramites}
        onNavigateRequisitos={handleNavigateRequisitos}
      />

      {/* 2. Sección Informativa Superior (Limpia y con selector de idiomas funcional) */}
      <HeroSection />

      {/* 3. Cuadrícula de Trámites y Servicios */}
      <TramitesGrid
        onSelectTramite={(tramite) => setSelectedTramite(tramite)}
        onStartTramite={(tipo, title) => handleStartTramite(tipo, title)}
        onOpenConsulta={handleOpenConsulta}
      />

      {/* 3.1 Sección Oficial de Requisitos de Ingreso y Trámites (6 trámites detallados) */}
      <RequisitosSection
        onStartTramite={handleStartTramite}
      />

      {/* 4. Modal de Login y Registro Limpio (SIN selección forzada de trámite) */}
      <GlassLoginModal
        isOpen={isLoginOpen}
        onClose={() => { setIsLoginOpen(false); setLoginNotice(null); }}
        noticeMessage={loginNotice}
        onSuccess={() => {
          setIsLoginOpen(false);
          setLoginNotice(null);
          if (loginNotice) {
            setIsTramiteModalOpen(true);
          } else if (user?.rol !== 'solo_lectura') {
            onGoToDashboard();
          } else {
            setIsConsultaOpen(true);
          }
        }}
      />

      {/* 5. Modal de Formulario Específico del Trámite (con direcciones y núcleo familiar) */}
      <TramiteModal
        isOpen={isTramiteModalOpen}
        onClose={() => setIsTramiteModalOpen(false)}
        tipoTramite={activeTramiteType}
        tramiteTitle={activeTramiteTitle}
        onSuccess={() => {
          if (user?.rol !== 'solo_lectura') {
            onGoToDashboard();
          } else {
            setIsConsultaOpen(true);
          }
        }}
      />

      {/* 6. Modal de Requisitos y Detalles Informativos */}
      <TramiteDetailModal
        tramite={selectedTramite}
        onClose={() => setSelectedTramite(null)}
        onStart={() => {
          const tType = selectedTramite?.rawType || 'prorroga';
          if (tType === 'consulta') {
            handleOpenConsulta();
          } else {
            const tTitle = selectedTramite?.title || 'Trámite Migratorio';
            handleStartTramite(tType, tTitle);
          }
        }}
      />

      {/* 7. Modal de Mi Cuenta y Perfil (Exclusivo para datos personales y seguridad) */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        defaultTab={profileTab}
        onGoToDashboard={onGoToDashboard}
      />

      {/* 8. Modal de Consulta de Trámites (Pantalla independiente y dedicada) */}
      <ConsultaPublicaModal
        isOpen={isConsultaOpen}
        onClose={() => setIsConsultaOpen(false)}
        onOpenLogin={() => {
          setIsConsultaOpen(false);
          setLoginNotice(null);
          setIsLoginOpen(true);
        }}
      />

      {/* 8. Pie de Página */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800">

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shield className="w-5 h-5 text-blue-500" />
                <span>SGIM Ecuador</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Sistema de Gestión Integral Migratoria. Plataforma digital para la atención, control, refugio y regularización de personas extranjeras en el Ecuador.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Servicios Principales</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li><a href="#tramites" className="hover:text-slate-300">Movimientos Migratorios</a></li>
                <li><a href="#tramites" className="hover:text-slate-300">Prórrogas de Estadía (90 días)</a></li>
                <li><a href="#tramites" className="hover:text-slate-300">Protección Internacional / Refugio</a></li>
                <li><a href="#tramites" className="hover:text-slate-300">Visas de Residencia y VIRTE</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Puntos de Control</h4>
              <ul className="space-y-1.5 text-slate-500">
                <li>UIO - Aeropuerto Mariscal Sucre (Quito)</li>
                <li>GYE - Aeropuerto José Joaquín de Olmedo</li>
                <li>RUM - Paso Fronterizo Rumichaca</li>
                <li>HUA - Paso Fronterizo Huaquillas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm">Atención Ciudadana</h4>
              <div className="space-y-1.5 text-slate-500">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Esmeraldas, Ecuador</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>soporte.sgim@migracion.gob.ec</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span>1800-MIGRACION</span>
                </p>
              </div>
            </div>

          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between text-slate-500 text-[11px] gap-4 w-full">
            {/* Bloque Izquierdo: Texto con salto de línea y espaciado */}
            <div className="flex flex-col gap-1 text-center md:text-left">
              <p>© {new Date().getFullYear()} SGIM Ecuador. Desarrollado con Go (Backend) + TypeScript React (Frontend).</p>
              <p>Conforme a la Ley Orgánica de Movilidad Humana y Norma IEEE Std 830-1998.</p>
            </div>

            {/* Bloque Derecho: Integrantes alineados a la derecha */}
            <div className="text-center md:text-right max-w-xs">
              <p><span className="font-semibold">Integrantes:</span> Edwin Guillermo, Milena Jazmin, Lessly Jelena, Josue Leonardo, Franklin Andres</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
