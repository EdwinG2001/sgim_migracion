import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  Award, 
  LogOut, 
  ArrowLeft, 
  Activity, 
  Database, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface DashboardPageProps {
  onBackToPortal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onBackToPortal }) => {
  const { user, logout } = useAuth();
  const [catalogosCount, setCatalogosCount] = useState<number>(0);
  const [personasCount, setPersonasCount] = useState<number>(0);
  const [movimientosCount, setMovimientosCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'tramites' | 'personas' | 'auditoria'>('tramites');
  const [personasList, setPersonasList] = useState<any[]>([]);
  
  // Listas de trámites reales
  const [solicitudesPI, setSolicitudesPI] = useState<any[]>([]);
  const [solicitudesVisas, setSolicitudesVisas] = useState<any[]>([]);
  const [movimientosList, setMovimientosList] = useState<any[]>([]);
  const [censadosList, setCensadosList] = useState<any[]>([]);
  const [auditoriaList, setAuditoriaList] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Cargar datos en vivo del backend Go
  const loadData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      // 1. Catálogos maestros
      const catRes = await api.get('/catalogos').catch(() => null);
      if (catRes?.data?.success && Array.isArray(catRes.data.data)) {
        setCatalogosCount(catRes.data.data.length);
      } else {
        setCatalogosCount(0);
      }

      // 2. Personas registradas
      const pRes = await api.get('/personas').catch(() => null);
      if (pRes?.data?.success) {
        const list = Array.isArray(pRes.data.data) ? pRes.data.data : [];
        setPersonasList(list);
        setPersonasCount(pRes.data.meta?.total ?? list.length);
      } else {
        setPersonasList([]);
      }

      // 3. Movimientos
      const mRes = await api.get('/movimientos').catch(() => null);
      if (mRes?.data?.success) {
        const list = Array.isArray(mRes.data.data) ? mRes.data.data : [];
        setMovimientosList(list);
        setMovimientosCount(mRes.data.meta?.total ?? list.length);
      } else {
        setMovimientosList([]);
      }

      // 4. Solicitudes PI (Refugio)
      const piRes = await api.get('/proteccion/solicitudes').catch(() => null);
      if (piRes?.data?.success) {
        setSolicitudesPI(Array.isArray(piRes.data.data) ? piRes.data.data : []);
      } else {
        setSolicitudesPI([]);
      }

      // 5. Solicitudes Visas
      const vRes = await api.get('/visas/solicitudes').catch(() => null);
      if (vRes?.data?.success) {
        setSolicitudesVisas(Array.isArray(vRes.data.data) ? vRes.data.data : []);
      } else {
        setSolicitudesVisas([]);
      }

      // 6. Censados
      const cRes = await api.get('/censos/registros').catch(() => null);
      if (cRes?.data?.success) {
        setCensadosList(Array.isArray(cRes.data.data) ? cRes.data.data : []);
      } else {
        setCensadosList([]);
      }

      // 7. Auditoria (solo admin)
      if (user?.rol === 'admin') {
        const aRes = await api.get('/auditoria').catch(() => null);
        if (aRes?.data?.success) {
          setAuditoriaList(Array.isArray(aRes.data.data) ? aRes.data.data : []);
        } else {
          setAuditoriaList([]);
        }
      }
    } catch (err) {
      console.error('Error cargando datos del backend Go:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Función para aprobar y emitir Visa PI (Milena / Admin)
  const handleEmitirVisaPI = async (solicitudId: string) => {
    try {
      const res = await api.post('/proteccion/visas', {
        solicitud_pi_id: solicitudId,
        vigencia_meses: 24
      });
      if (res.data.success) {
        setActionMsg(`✅ Visa Humanitaria emitida: ${res.data.data.numero_visa}`);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error emitiendo visa');
    }
  };

  // Función para aprobar y emitir Visa Ordinaria (Franklin / Admin)
  const handleEmitirVisaOrdinaria = async (solicitudId: string) => {
    try {
      const res = await api.post('/visas/emitir', {
        solicitud_visa_id: solicitudId,
        vigencia_anios: 2
      });
      if (res.data.success) {
        setActionMsg(`✅ Visa de Residencia emitida: ${res.data.data.numero_visa}`);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error emitiendo visa');
    }
  };

  // Guard de Acceso: Ciudadanos (solo_lectura) no tienen acceso al panel operativo institucional
  if (user?.rol === 'solo_lectura') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4">
          <Shield className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold mb-2">Panel Operativo Restringido</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Esta vista es exclusiva para los analistas y oficiales de la Subsecretaría de Migración. Como ciudadano solicitante, sus trámites y solicitudes se gestionan directamente desde la Ventanilla Digital.
        </p>
        <button
          onClick={onBackToPortal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Ventanilla Digital</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Barra Superior */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Portal Público</span>
          </button>
          
          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">SGIM Panel Operativo de Gestión</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Go :8080 Conectado
            </span>
          </div>
        </div>

        {/* Perfil del Operador */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-xs">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase">
              {user?.username?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">{user?.username}</p>
              <p className="text-[10px] text-emerald-400 uppercase font-bold">{user?.rol}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Banner de Mensaje de Acción */}
        {actionMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Métricas Principales conectadas a MongoDB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Personas en Base de Datos</p>
              <h3 className="text-2xl font-bold text-white">{personasCount}</h3>
              <p className="text-[10px] text-slate-500">Colección personas</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Catálogos Maestros</p>
              <h3 className="text-2xl font-bold text-white">{catalogosCount}</h3>
              <p className="text-[10px] text-emerald-400">Poblados en MongoDB</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Movimientos Fronterizos</p>
              <h3 className="text-2xl font-bold text-white">{movimientosCount}</h3>
              <p className="text-[10px] text-slate-500">Colección movimientos</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Estado del Sistema</p>
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Operativo
              </h3>
              <p className="text-[10px] text-slate-500">MongoDB 9.0 Standalone</p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación del Panel */}
        <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
          <button
            onClick={() => setActiveTab('tramites')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'tramites' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Trámites y Solicitudes en Espera
          </button>
          
          <button
            onClick={() => setActiveTab('personas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'personas' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Expedientes de Personas ({personasCount})
          </button>

          {user?.rol === 'admin' && (
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'auditoria' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Bitácora de Auditoría Inmutable ({(auditoriaList || []).length})
            </button>
          )}

          <button
            onClick={loadData}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* TAB 1: BANDEJA DE TRÁMITES REALES ENTRANTE */}
        {activeTab === 'tramites' && (
          <div className="space-y-6">

            {/* SECCIÓN A: MÓDULO PROTECCIÓN INTERNACIONAL (Para Milena o Admin) */}
            {(user?.rol === 'analista_pi' || user?.rol === 'admin') && (
              <div className="bg-slate-800/60 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Shield className="w-5 h-5" />
                    <span>Módulo 1: Solicitudes de Refugio / Protección Internacional ({(solicitudesPI || []).length})</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Gestionado por: analista_pi (Corozo Angulo Milena Jazmin)
                  </span>
                </div>

                {(solicitudesPI || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay solicitudes de refugio pendientes en este momento.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">ID Solicitud</th>
                          <th className="px-3 py-2">País Origen</th>
                          <th className="px-3 py-2">Motivo Declarado</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-slate-300">
                        {(solicitudesPI || []).map((sol) => (
                          <tr key={sol.id} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-mono text-blue-400">{sol.id?.slice(-8)}</td>
                            <td className="px-3 py-2 font-bold">{sol.pais_origen}</td>
                            <td className="px-3 py-2 max-w-xs truncate">{sol.motivo_salida}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sol.estado === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {sol.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-400">{sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-3 py-2 text-right">
                              {sol.estado === 'en_tramite' && (
                                <button
                                  onClick={() => handleEmitirVisaPI(sol.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                                >
                                  Aprobar y Emitir Visa PI
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN B: MÓDULO VISAS Y PRÓRROGAS (Para Franklin o Admin) */}
            {(user?.rol === 'analista_visas' || user?.rol === 'admin') && (
              <div className="bg-slate-800/60 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Award className="w-5 h-5" />
                    <span>Módulo 3: Solicitudes de Visas de Residencia ({(solicitudesVisas || []).length})</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Gestionado por: analista_visas (Caisa Preciado Franklin Andres)
                  </span>
                </div>

                {(solicitudesVisas || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay solicitudes de visa en revisión en este momento.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">ID Solicitud</th>
                          <th className="px-3 py-2">Tipo de Visa</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-slate-300">
                        {(solicitudesVisas || []).map((visa) => (
                          <tr key={visa.id} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-mono text-blue-400">{visa.id?.slice(-8)}</td>
                            <td className="px-3 py-2 font-semibold capitalize">{visa.tipo_visa}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                visa.estado === 'emitida' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {visa.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-400">{visa.fecha_solicitud ? new Date(visa.fecha_solicitud).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-3 py-2 text-right">
                              {visa.estado !== 'emitida' && (
                                <button
                                  onClick={() => handleEmitirVisaOrdinaria(visa.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                                >
                                  Aprobar y Emitir Visa
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN C: MÓDULO MOVIMIENTOS FRONTERIZOS (Para Josue o Admin) */}
            {(user?.rol === 'oficial_migracion' || user?.rol === 'admin') && (
              <div className="bg-slate-800/60 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <FileText className="w-5 h-5" />
                    <span>Módulo 2: Registro de Entradas y Salidas Fronterizas ({(movimientosList || []).length})</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Gestionado por: oficial_migracion (Intriago Salazar Josue Leonardo)
                  </span>
                </div>

                {(movimientosList || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay movimientos migratorios recientes.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Punto Control</th>
                          <th className="px-3 py-2">Transporte</th>
                          <th className="px-3 py-2">Motivo</th>
                          <th className="px-3 py-2">Días Autorizados</th>
                          <th className="px-3 py-2">Fecha y Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-slate-300">
                        {(movimientosList || []).map((m) => (
                          <tr key={m.id} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                m.tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {m.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-blue-400">{m.punto_control}</td>
                            <td className="px-3 py-2 capitalize">{m.medio_transporte}</td>
                            <td className="px-3 py-2">{m.motivo_viaje}</td>
                            <td className="px-3 py-2 font-bold">{m.dias_permitidos} días</td>
                            <td className="px-3 py-2 text-slate-400">{m.fecha_hora ? new Date(m.fecha_hora).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN D: MÓDULO CENSOS Y REGULARIZACIÓN (Para Lessly o Admin) */}
            {(user?.rol === 'analista_regularizacion' || user?.rol === 'admin') && (
              <div className="bg-slate-800/60 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Users className="w-5 h-5" />
                    <span>Módulo 4: Registros de Censo y Certificados ({(censadosList || []).length})</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Gestionado por: analista_regularizacion (Caicedo Medina Lessly Jelena)
                  </span>
                </div>

                {(censadosList || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay registros de censo voluntarios todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Certificado #</th>
                          <th className="px-3 py-2">Persona ID</th>
                          <th className="px-3 py-2">Fecha Registro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-slate-300">
                        {(censadosList || []).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-mono font-bold text-amber-300">{c.numero_certificado}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{c.persona_id}</td>
                            <td className="px-3 py-2 text-slate-400">{c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: PERSONAS EN MONGODB */}
        {activeTab === 'personas' && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Expedientes de Personas en la Colección 'personas' ({personasList.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Nombres y Apellidos</th>
                    <th className="px-4 py-3">Tipo Doc</th>
                    <th className="px-4 py-3">Número Doc</th>
                    <th className="px-4 py-3">Nacionalidad</th>
                    <th className="px-4 py-3">Sexo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-300">
                  {(personasList || []).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-semibold text-white">
                        {p.nombres} {p.apellidos}
                      </td>
                      <td className="px-4 py-3 capitalize">{p.tipo_documento}</td>
                      <td className="px-4 py-3 font-mono text-blue-400">{p.numero_documento}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold">
                          {p.nacionalidad}
                        </span>
                      </td>
                      <td className="px-4 py-3">{p.sexo}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AUDITORIA INMUTABLE (SOLO ADMIN) */}
        {activeTab === 'auditoria' && user?.rol === 'admin' && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Bitácora de Auditoría Inmutable (Colección 'auditoria')</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Colección</th>
                    <th className="px-4 py-3">Documento ID</th>
                    <th className="px-4 py-3">Usuario ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-300 font-mono text-[11px]">
                  {(auditoriaList || []).map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30">
                      <td className="px-4 py-2 text-slate-400">{a.fecha ? new Date(a.fecha).toLocaleString() : 'N/A'}</td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {a.accion}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold text-white">{a.coleccion}</td>
                      <td className="px-4 py-2 text-blue-300">{a.documento_id}</td>
                      <td className="px-4 py-2 text-slate-400">{a.usuario_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
