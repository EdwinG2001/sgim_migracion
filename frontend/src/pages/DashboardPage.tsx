import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  ClipboardCheck,
  Bell,
  Filter,
  Sparkles,
  FileCheck2,
  FileWarning,
  FileClock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  loadAllReviewMeta,
  saveAllReviewMeta,
  getReviewSummary,
  type ModuleType,
  type DocumentCheckState,
  type CitizenNotification,
  type SolicitudReviewMeta,
} from '../data/tramiteRequisitos';
import {
  SolicitudReviewModal,
  type SelectedSolicitud,
} from '../components/dashboard/SolicitudReviewModal';

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

  // Filtros de búsqueda y vista
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | ModuleType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendientes' | 'revision' | 'completados' | 'rechazados'>('all');

  // Estado persistido de verificación documental y notificaciones al solicitante
  const [reviewStore, setReviewStore] = useState<Record<string, SolicitudReviewMeta>>(() =>
    loadAllReviewMeta()
  );
  const [selectedSolicitud, setSelectedSolicitud] = useState<SelectedSolicitud | null>(null);

  // Modal de acción / confirmación (Rechazar / Aplazar / Anular)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    tipo: 'pi' | 'visa' | 'mov';
    id: string;
    nuevoEstado: string;
    titulo: string;
    descripcion: string;
    color: string;
  } | null>(null);
  const [observacionesInput, setObservacionesInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Mapa rápido persona_id -> objeto Persona
  const personasMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of personasList) {
      if (p?.id) map[p.id] = p;
    }
    return map;
  }, [personasList]);

  // Cargar datos en vivo del backend Go
  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, pRes, mRes, piRes, vRes, cRes, aRes] = await Promise.all([
        api.get('/catalogos').catch(() => null),
        api.get('/personas?limit=100').catch(() => null),
        api.get('/movimientos?limit=100').catch(() => null),
        api.get('/proteccion/solicitudes?limit=100').catch(() => null),
        api.get('/visas/solicitudes?limit=100').catch(() => null),
        api.get('/censos/registros?limit=100').catch(() => null),
        user?.rol === 'admin' ? api.get('/auditoria?limit=100').catch(() => null) : Promise.resolve(null),
      ]);

      if (catRes?.data?.success && Array.isArray(catRes.data.data)) {
        setCatalogosCount(catRes.data.data.length);
      } else {
        setCatalogosCount(0);
      }

      if (pRes?.data?.success) {
        const list = Array.isArray(pRes.data.data) ? pRes.data.data : [];
        setPersonasList(list);
        setPersonasCount(pRes.data.meta?.total ?? list.length);
      } else {
        setPersonasList([]);
      }

      if (mRes?.data?.success) {
        const list = Array.isArray(mRes.data.data) ? mRes.data.data : [];
        setMovimientosList(list);
        setMovimientosCount(mRes.data.meta?.total ?? list.length);
      } else {
        setMovimientosList([]);
      }

      if (piRes?.data?.success) {
        setSolicitudesPI(Array.isArray(piRes.data.data) ? piRes.data.data : []);
      } else {
        setSolicitudesPI([]);
      }

      if (vRes?.data?.success) {
        setSolicitudesVisas(Array.isArray(vRes.data.data) ? vRes.data.data : []);
      } else {
        setSolicitudesVisas([]);
      }

      if (cRes?.data?.success) {
        setCensadosList(Array.isArray(cRes.data.data) ? cRes.data.data : []);
      } else {
        setCensadosList([]);
      }

      if (user?.rol === 'admin') {
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

  // Sincronizar el registro abierto en el modal si cambian los datos tras una acción
  useEffect(() => {
    if (!selectedSolicitud) return;
    const { moduleType, record } = selectedSolicitud;
    const source =
      moduleType === 'pi'
        ? solicitudesPI
        : moduleType === 'visa'
        ? solicitudesVisas
        : moduleType === 'mov'
        ? movimientosList
        : censadosList;
    const updated = source.find((item) => item.id === record.id);
    if (updated && updated !== record) {
      setSelectedSolicitud({
        moduleType,
        record: updated,
        persona: personasMap[updated.persona_id],
      });
    }
  }, [solicitudesPI, solicitudesVisas, movimientosList, censadosList, personasMap]);

  // Actualizar checklist de documentos de una solicitud
  const handleUpdateDocs = (recordId: string, docs: Record<string, DocumentCheckState>) => {
    setReviewStore((prev) => {
      const next: Record<string, SolicitudReviewMeta> = {
        ...prev,
        [recordId]: {
          docs,
          notifications: prev[recordId]?.notifications || [],
        },
      };
      saveAllReviewMeta(next);
      return next;
    });
  };

  // Registrar notificación enviada al solicitante
  const handleAddNotification = (recordId: string, notification: CitizenNotification) => {
    setReviewStore((prev) => {
      const current = prev[recordId] || { docs: {}, notifications: [] };
      const next: Record<string, SolicitudReviewMeta> = {
        ...prev,
        [recordId]: {
          ...current,
          notifications: [notification, ...(current.notifications || [])],
        },
      };
      saveAllReviewMeta(next);
      return next;
    });
    setActionMsg(`📩 Notificación enviada a ${notification.recipientName} (${notification.recipientContact}).`);
  };

  // Función para aprobar y emitir Visa PI (Milena / Admin)
  const handleEmitirVisaPI = async (solicitudId: string) => {
    try {
      const res = await api.post('/proteccion/visas', {
        solicitud_pi_id: solicitudId,
        vigencia_meses: 24,
      });
      if (res.data.success) {
        setActionMsg(`✅ Visa Humanitaria emitida: ${res.data.data.numero_visa}`);
        await loadData();
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
        vigencia_anios: 2,
      });
      if (res.data.success) {
        setActionMsg(`✅ Visa de Residencia emitida: ${res.data.data.numero_visa}`);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error emitiendo visa');
    }
  };

  // Función para emitir Visa Humanitaria VIRTE (Lessly / Admin)
  const handleRegularizarVIRTE = async (personaId: string) => {
    try {
      const res = await api.post('/regularizacion/virte', {
        persona_id: personaId,
        tipo: 'VIRTE',
        vigencia_meses: 24,
      });
      if (res.data.success) {
        setActionMsg(`✅ Visa de Regularización VIRTE emitida: ${res.data.data.numero_visa}`);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error emitiendo visa VIRTE');
    }
  };

  // Cambio rápido de estado desde el modal de notificación
  const handleQuickStatusUpdate = async (
    tipo: 'pi' | 'visa',
    id: string,
    nuevoEstado: string,
    observaciones: string
  ) => {
    try {
      if (tipo === 'pi') {
        await api.patch(`/proteccion/solicitudes/${id}/estado`, {
          estado: nuevoEstado,
          observaciones,
        });
      } else {
        await api.patch(`/visas/solicitudes/${id}/estado`, {
          estado: nuevoEstado,
          observaciones,
        });
      }
      await loadData();
    } catch (err) {
      console.error('Error actualizando estado rápido:', err);
    }
  };

  // Función para ejecutar cambio de estado confirmado (Rechazar / Aplazar / Anular)
  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setSubmittingAction(true);
    try {
      if (actionModal.tipo === 'pi') {
        const res = await api.patch(`/proteccion/solicitudes/${actionModal.id}/estado`, {
          estado: actionModal.nuevoEstado,
          observaciones: observacionesInput,
        });
        if (res.data?.success) {
          setActionMsg(`✅ Solicitud PI actualizada a estado: '${actionModal.nuevoEstado}'`);
        }
      } else if (actionModal.tipo === 'visa') {
        const res = await api.patch(`/visas/solicitudes/${actionModal.id}/estado`, {
          estado: actionModal.nuevoEstado,
          observaciones: observacionesInput,
        });
        if (res.data?.success) {
          setActionMsg(`✅ Solicitud de Visa actualizada a estado: '${actionModal.nuevoEstado}'`);
        }
      } else if (actionModal.tipo === 'mov') {
        const res = await api.patch(`/movimientos/${actionModal.id}/anular`, {
          motivo: observacionesInput,
        });
        if (res.data?.success) {
          setActionMsg(`⚠️ Movimiento migratorio #${actionModal.id?.slice(-8)} anulado exitosamente`);
        }
      }
      setActionModal(null);
      setObservacionesInput('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al procesar la acción administrativa');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helpers de filtrado
  const matchesStatus = (estado: string | undefined) => {
    if (statusFilter === 'all') return true;
    const st = (estado || 'activo').toLowerCase();
    if (statusFilter === 'pendientes') return st === 'recibida' || st === 'en_tramite' || st === 'solicitada';
    if (statusFilter === 'revision') return st === 'en_revision' || st === 'archivado';
    if (statusFilter === 'completados')
      return st === 'emitida' || st === 'aprobado' || st === 'aprobada' || st === 'activo' || st === 'completado';
    if (statusFilter === 'rechazados') return st === 'rechazado' || st === 'rechazada' || st === 'anulado';
    return true;
  };

  const matchesSearch = (item: any, extraFields: string[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const p = personasMap[item.persona_id];
    const haystack = [
      item.id,
      item.persona_id,
      p?.nombres,
      p?.apellidos,
      p?.numero_documento,
      p?.nacionalidad,
      ...extraFields,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  };

  const filteredPI = useMemo(
    () =>
      (solicitudesPI || []).filter(
        (sol) =>
          matchesStatus(sol.estado) &&
          matchesSearch(sol, [sol.pais_origen, sol.motivo_salida, sol.estado])
      ),
    [solicitudesPI, searchQuery, statusFilter, personasMap]
  );

  const filteredVisas = useMemo(
    () =>
      (solicitudesVisas || []).filter(
        (v) => matchesStatus(v.estado) && matchesSearch(v, [v.tipo_visa, v.estado])
      ),
    [solicitudesVisas, searchQuery, statusFilter, personasMap]
  );

  const filteredMovimientos = useMemo(
    () =>
      (movimientosList || []).filter(
        (m) =>
          matchesStatus(m.estado || 'activo') &&
          matchesSearch(m, [m.tipo, m.punto_control, m.medio_transporte, m.motivo_viaje, m.estado])
      ),
    [movimientosList, searchQuery, statusFilter, personasMap]
  );

  const filteredCensados = useMemo(
    () =>
      (censadosList || []).filter(
        (c) => matchesStatus('completado') && matchesSearch(c, [c.numero_certificado])
      ),
    [censadosList, searchQuery, statusFilter, personasMap]
  );

  const totalTramitesPendientes = useMemo(() => {
    const piPend = solicitudesPI.filter((s) => s.estado === 'en_tramite' || s.estado === 'archivado').length;
    const visaPend = solicitudesVisas.filter((v) => v.estado === 'recibida' || v.estado === 'en_revision').length;
    return piPend + visaPend;
  }, [solicitudesPI, solicitudesVisas]);

  const openReviewModal = (moduleType: ModuleType, record: any) => {
    setSelectedSolicitud({
      moduleType,
      record,
      persona: personasMap[record.persona_id],
    });
  };

  // Celda reutilizable: Solicitante (Nombre + Documento + Nacionalidad)
  const renderSolicitanteCell = (personaId: string) => {
    const p = personasMap[personaId];
    if (!p) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-700/80 text-slate-300 flex items-center justify-center text-[10px] font-bold">
            ID
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">Expediente Vinculado</p>
            <p className="text-[10px] font-mono text-slate-500">{personaId?.slice(-8) || 'N/A'}</p>
          </div>
        </div>
      );
    }
    const initials = `${p.nombres?.charAt(0) || ''}${p.apellidos?.charAt(0) || ''}`.toUpperCase();
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/80 to-indigo-600/80 border border-blue-400/20 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
          {initials || 'SG'}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate max-w-[170px]">
            {p.nombres} {p.apellidos}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            {p.numero_documento} · <span className="text-blue-300 font-sans font-semibold">{p.nacionalidad}</span>
          </p>
        </div>
      </div>
    );
  };

  // Celda reutilizable: Indicador de Requisitos + Notificación
  const renderRequisitosCell = (moduleType: ModuleType, record: any) => {
    const summary = getReviewSummary(moduleType, record.id, record.estado, reviewStore);
    const hasNotif = summary.notifications.length > 0;

    return (
      <div className="flex flex-col gap-1 min-w-[135px]">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              summary.allVerified
                ? 'text-emerald-400'
                : summary.incomplete > 0
                ? 'text-red-400'
                : 'text-amber-300'
            }`}
          >
            {summary.allVerified ? (
              <FileCheck2 className="w-3.5 h-3.5" />
            ) : summary.incomplete > 0 ? (
              <FileWarning className="w-3.5 h-3.5" />
            ) : (
              <FileClock className="w-3.5 h-3.5" />
            )}
            {summary.verified}/{summary.total} docs
          </span>

          {hasNotif && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-300"
              title={`${summary.notifications.length} notificación(es) enviada(s) al solicitante`}
            >
              <Bell className="w-2.5 h-2.5" />
              {summary.notifications.length}
            </span>
          )}
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all ${
              summary.allVerified
                ? 'bg-emerald-500'
                : summary.incomplete > 0
                ? 'bg-red-500'
                : 'bg-amber-400'
            }`}
            style={{ width: `${summary.percent}%` }}
          />
        </div>
      </div>
    );
  };

  // Guard de Acceso: Ciudadanos (solo_lectura) no tienen acceso al panel operativo institucional
  if (user?.rol === 'solo_lectura') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
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

  const isAdmin = user?.rol === 'admin';
  const showPI = (user?.rol === 'analista_pi' || isAdmin) && (moduleFilter === 'all' || moduleFilter === 'pi');
  const showVisas = (user?.rol === 'analista_visas' || isAdmin) && (moduleFilter === 'all' || moduleFilter === 'visa');
  const showMov = (user?.rol === 'oficial_migracion' || isAdmin) && (moduleFilter === 'all' || moduleFilter === 'mov');
  const showCenso = (user?.rol === 'analista_regularizacion' || isAdmin) && (moduleFilter === 'all' || moduleFilter === 'censo');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra Superior */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/70 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Portal Público</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hidden sm:flex">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">
                  SGIM Panel Operativo de Gestión
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Go :8080
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">
                Haga clic en cualquier solicitud para verificar requisitos documentales y notificar al ciudadano
              </p>
            </div>
          </div>
        </div>

        {/* Perfil del Operador */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white uppercase shadow-sm">
              {user?.username?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">{user?.username}</p>
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                {user?.rol}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 sm:p-6 space-y-6">
        {/* Banner de Mensaje de Acción */}
        {actionMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
            <span>{actionMsg}</span>
            <button
              onClick={() => setActionMsg(null)}
              className="text-emerald-400 hover:text-white cursor-pointer px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Métricas Principales conectadas a MongoDB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/70 border border-slate-800 hover:border-blue-500/30 transition-all flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Personas en Base de Datos</p>
              <h3 className="text-2xl font-extrabold text-white">{personasCount}</h3>
              <p className="text-[10px] text-slate-500">Expedientes activos en MongoDB</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/70 border border-slate-800 hover:border-amber-500/30 transition-all flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Trámites por Resolver</p>
              <h3 className="text-2xl font-extrabold text-white">{totalTramitesPendientes}</h3>
              <p className="text-[10px] text-amber-400/90">En trámite o en revisión documental</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/70 border border-slate-800 hover:border-indigo-500/30 transition-all flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Movimientos Fronterizos</p>
              <h3 className="text-2xl font-extrabold text-white">{movimientosCount}</h3>
              <p className="text-[10px] text-slate-500">Catálogos maestros: {catalogosCount}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/70 border border-slate-800 hover:border-emerald-500/30 transition-all flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Estado del Sistema</p>
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Operativo
              </h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Database className="w-3 h-3 text-emerald-500/80" /> MongoDB 9.0 Standalone
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación del Panel */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('tramites')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'tramites'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Trámites y Verificación Documental
          </button>

          <button
            onClick={() => setActiveTab('personas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'personas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Expedientes de Personas ({personasCount})
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Bitácora de Auditoría ({(auditoriaList || []).length})
            </button>
          )}

          <button
            onClick={loadData}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* TAB 1: BANDEJA DE TRÁMITES REALES ENTRANTE */}
        {activeTab === 'tramites' && (
          <div className="space-y-5">
            {/* Barra de Filtros, Búsqueda y Selector de Módulos (Admin + Roles) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Buscador */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por solicitante, cédula/pasaporte, ID de solicitud, visa o país..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                  />
                </div>

                {/* Filtro de Estado */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                    <Filter className="w-3.5 h-3.5" /> Estado:
                  </span>
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'pendientes', label: 'Pendientes' },
                      { id: 'revision', label: 'En Revisión' },
                      { id: 'completados', label: 'Aprobados' },
                      { id: 'rechazados', label: 'Rechazados' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector rápido de módulos para Administrador */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Vista Administrador:
                  </span>
                  {(
                    [
                      {
                        id: 'all',
                        label: 'Todos los Módulos',
                        count:
                          solicitudesPI.length +
                          solicitudesVisas.length +
                          movimientosList.length +
                          censadosList.length,
                      },
                      { id: 'pi', label: 'Mód. 1: Refugio', count: solicitudesPI.length },
                      { id: 'mov', label: 'Mód. 2: Frontera', count: movimientosList.length },
                      { id: 'visa', label: 'Mód. 3: Visas', count: solicitudesVisas.length },
                      { id: 'censo', label: 'Mód. 4: Censo VIRTE', count: censadosList.length },
                    ] as const
                  ).map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setModuleFilter(mod.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        moduleFilter === mod.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{mod.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                          moduleFilter === mod.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {mod.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN A: MÓDULO PROTECCIÓN INTERNACIONAL (Para Milena o Admin) */}
            {showPI && (
              <div className="bg-slate-900/70 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
                    <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span>
                      Módulo 1: Solicitudes de Refugio / Protección Internacional ({filteredPI.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    Gestionado por: analista_pi (Corozo Angulo Milena Jazmin)
                  </span>
                </div>

                {filteredPI.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No hay solicitudes de refugio que coincidan con el filtro actual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5 rounded-l-lg">ID</th>
                          <th className="px-3 py-2.5">Solicitante</th>
                          <th className="px-3 py-2.5">País / Motivo</th>
                          <th className="px-3 py-2.5">Requisitos</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3 py-2.5">Fecha</th>
                          <th className="px-3 py-2.5 text-right rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {filteredPI.map((sol) => (
                          <tr
                            key={sol.id}
                            onClick={() => openReviewModal('pi', sol)}
                            className="hover:bg-indigo-500/10 transition-colors cursor-pointer group"
                          >
                            <td className="px-3 py-3 font-mono text-blue-400 font-semibold">
                              #{sol.id?.slice(-8)}
                            </td>
                            <td className="px-3 py-3">{renderSolicitanteCell(sol.persona_id)}</td>
                            <td className="px-3 py-3">
                              <span className="font-bold text-indigo-300">{sol.pais_origen}</span>
                              <p className="text-[11px] text-slate-400 max-w-[200px] truncate">
                                {sol.motivo_salida}
                              </p>
                            </td>
                            <td className="px-3 py-3">{renderRequisitosCell('pi', sol)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  sol.estado === 'aprobado'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : sol.estado === 'rechazado'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : sol.estado === 'archivado'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {sol.estado}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400">
                              {sol.fecha_solicitud
                                ? new Date(sol.fecha_solicitud).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td
                              className="px-3 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => openReviewModal('pi', sol)}
                                  title="Abrir expediente y verificar documentos"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 bg-indigo-500/20 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>Revisar</span>
                                </button>

                                {sol.estado === 'en_tramite' && (
                                  <>
                                    <button
                                      onClick={() => handleEmitirVisaPI(sol.id)}
                                      title="Aprobar trámite y emitir Visa Humanitaria"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Emitir</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setObservacionesInput('');
                                        setActionModal({
                                          isOpen: true,
                                          tipo: 'pi',
                                          id: sol.id,
                                          nuevoEstado: 'archivado',
                                          titulo: 'Aplazar / Archivar Solicitud PI',
                                          descripcion: `¿Desea aplazar la solicitud #${sol.id?.slice(
                                            -8
                                          )} (${sol.pais_origen})? El trámite quedará en pausa a la espera de subsanación de requisitos.`,
                                          color: 'amber',
                                        });
                                      }}
                                      title="Aplazar trámite / Archivar temporalmente"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-600/80 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setObservacionesInput('');
                                        setActionModal({
                                          isOpen: true,
                                          tipo: 'pi',
                                          id: sol.id,
                                          nuevoEstado: 'rechazado',
                                          titulo: 'Rechazar Solicitud de Protección',
                                          descripcion: `¿Confirma el rechazo administrativo de la solicitud #${sol.id?.slice(
                                            -8
                                          )} (${sol.pais_origen})?`,
                                          color: 'red',
                                        });
                                      }}
                                      title="Rechazar solicitud"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600/80 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                {sol.estado === 'archivado' && (
                                  <button
                                    onClick={() => {
                                      setObservacionesInput('');
                                      setActionModal({
                                        isOpen: true,
                                        tipo: 'pi',
                                        id: sol.id,
                                        nuevoEstado: 'en_tramite',
                                        titulo: 'Reanudar Evaluación de Solicitud',
                                        descripcion: `¿Desea reactivar la solicitud #${sol.id?.slice(
                                          -8
                                        )} y ponerla nuevamente en estado 'en_tramite'?`,
                                        color: 'indigo',
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reanudar</span>
                                  </button>
                                )}
                              </div>
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
            {showVisas && (
              <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                      <Award className="w-4 h-4" />
                    </div>
                    <span>
                      Módulo 3: Solicitudes de Visas de Residencia ({filteredVisas.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    Gestionado por: analista_visas (Caisa Preciado Franklin Andres)
                  </span>
                </div>

                {filteredVisas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No hay solicitudes de visa que coincidan con el filtro actual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5 rounded-l-lg">ID</th>
                          <th className="px-3 py-2.5">Solicitante</th>
                          <th className="px-3 py-2.5">Tipo de Visa</th>
                          <th className="px-3 py-2.5">Requisitos</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3 py-2.5">Fecha</th>
                          <th className="px-3 py-2.5 text-right rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {filteredVisas.map((visa) => (
                          <tr
                            key={visa.id}
                            onClick={() => openReviewModal('visa', visa)}
                            className="hover:bg-emerald-500/10 transition-colors cursor-pointer group"
                          >
                            <td className="px-3 py-3 font-mono text-blue-400 font-semibold">
                              #{visa.id?.slice(-8)}
                            </td>
                            <td className="px-3 py-3">{renderSolicitanteCell(visa.persona_id)}</td>
                            <td className="px-3 py-3 font-semibold capitalize text-white">
                              {visa.tipo_visa?.replace('_', ' ')}
                            </td>
                            <td className="px-3 py-3">{renderRequisitosCell('visa', visa)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  visa.estado === 'emitida' || visa.estado === 'aprobada'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : visa.estado === 'rechazada'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : visa.estado === 'en_revision'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {visa.estado}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400">
                              {visa.fecha_solicitud
                                ? new Date(visa.fecha_solicitud).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td
                              className="px-3 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => openReviewModal('visa', visa)}
                                  title="Abrir expediente, revisar requisitos y notificar al solicitante"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 bg-emerald-500/20 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>Revisar</span>
                                </button>

                                {(visa.estado === 'recibida' ||
                                  visa.estado === 'en_revision' ||
                                  visa.estado === 'aprobada') && (
                                  <>
                                    <button
                                      onClick={() => handleEmitirVisaOrdinaria(visa.id)}
                                      title="Aprobar trámite y emitir Visa de Residencia"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Emitir</span>
                                    </button>

                                    {visa.estado === 'recibida' && (
                                      <button
                                        onClick={() => {
                                          setObservacionesInput('');
                                          setActionModal({
                                            isOpen: true,
                                            tipo: 'visa',
                                            id: visa.id,
                                            nuevoEstado: 'en_revision',
                                            titulo: 'Poner Solicitud En Revisión / Aplazar',
                                            descripcion: `¿Desea cambiar la solicitud #${visa.id?.slice(
                                              -8
                                            )} a estado 'en_revision' para subsanación o solicitud de requisitos adicionales?`,
                                            color: 'amber',
                                          });
                                        }}
                                        title="Poner en revisión / Aplazar"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-600/80 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {visa.estado === 'en_revision' && (
                                      <button
                                        onClick={() => {
                                          setObservacionesInput('');
                                          setActionModal({
                                            isOpen: true,
                                            tipo: 'visa',
                                            id: visa.id,
                                            nuevoEstado: 'recibida',
                                            titulo: 'Reabrir Solicitud como Recibida',
                                            descripcion: `¿Desea volver la solicitud #${visa.id?.slice(
                                              -8
                                            )} al estado 'recibida'?`,
                                            color: 'indigo',
                                          });
                                        }}
                                        title="Reabrir a estado recibida"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-600/80 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setObservacionesInput('');
                                        setActionModal({
                                          isOpen: true,
                                          tipo: 'visa',
                                          id: visa.id,
                                          nuevoEstado: 'rechazada',
                                          titulo: 'Rechazar Solicitud de Visa',
                                          descripcion: `¿Confirma el rechazo administrativo de la solicitud de visa #${visa.id?.slice(
                                            -8
                                          )}?`,
                                          color: 'red',
                                        });
                                      }}
                                      title="Rechazar solicitud de visa"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600/80 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
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
            {showMov && (
              <div className="bg-slate-900/70 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                    <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>
                      Módulo 2: Registro de Entradas y Salidas Fronterizas ({filteredMovimientos.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    Gestionado por: oficial_migracion (Intriago Salazar Josue Leonardo)
                  </span>
                </div>

                {filteredMovimientos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No hay movimientos migratorios que coincidan con el filtro actual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5 rounded-l-lg">Tipo / Punto</th>
                          <th className="px-3 py-2.5">Solicitante</th>
                          <th className="px-3 py-2.5">Viaje / Días</th>
                          <th className="px-3 py-2.5">Requisitos</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3 py-2.5">Fecha</th>
                          <th className="px-3 py-2.5 text-right rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {filteredMovimientos.map((m) => (
                          <tr
                            key={m.id}
                            onClick={() => openReviewModal('mov', m)}
                            className="hover:bg-blue-500/10 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    m.tipo === 'ingreso'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {m.tipo}
                                </span>
                                <span className="font-mono font-bold text-blue-400">
                                  {m.punto_control}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">{renderSolicitanteCell(m.persona_id)}</td>
                            <td className="px-3 py-3">
                              <span className="capitalize font-semibold text-white">
                                {m.motivo_viaje}
                              </span>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {m.medio_transporte} · {m.dias_permitidos} días
                              </p>
                            </td>
                            <td className="px-3 py-3">{renderRequisitosCell('mov', m)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  m.estado === 'activo' || !m.estado
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-700/60 text-slate-400 border border-slate-600/50'
                                }`}
                              >
                                {m.estado || 'activo'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400">
                              {m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString() : 'N/A'}
                            </td>
                            <td
                              className="px-3 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openReviewModal('mov', m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-200 bg-blue-500/20 hover:bg-blue-600 hover:text-white border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>Revisar</span>
                                </button>

                                {m.estado !== 'anulado' && (
                                  <button
                                    onClick={() => {
                                      setObservacionesInput('');
                                      setActionModal({
                                        isOpen: true,
                                        tipo: 'mov',
                                        id: m.id,
                                        nuevoEstado: 'anulado',
                                        titulo: 'Anular Registro de Movimiento Fronterizo',
                                        descripcion: `¿Confirma la anulación del registro migratorio #${m.id?.slice(
                                          -8
                                        )} en ${m.punto_control}? La trazabilidad quedará guardada en la bitácora inmutable.`,
                                        color: 'red',
                                      });
                                    }}
                                    title="Anular movimiento migratorio"
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600/80 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN D: MÓDULO CENSOS Y REGULARIZACIÓN (Para Lessly o Admin) */}
            {showCenso && (
              <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>
                      Módulo 4: Registros de Censo y Regularización VIRTE ({filteredCensados.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    Gestionado por: analista_regularizacion (Caicedo Medina Lessly Jelena)
                  </span>
                </div>

                {filteredCensados.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No hay registros de censo voluntarios que coincidan con el filtro actual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5 rounded-l-lg">Certificado #</th>
                          <th className="px-3 py-2.5">Solicitante</th>
                          <th className="px-3 py-2.5">Requisitos VIRTE</th>
                          <th className="px-3 py-2.5">Fecha Registro</th>
                          <th className="px-3 py-2.5 text-right rounded-r-lg">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {filteredCensados.map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => openReviewModal('censo', c)}
                            className="hover:bg-amber-500/10 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3 font-mono font-bold text-amber-300">
                              {c.numero_certificado}
                            </td>
                            <td className="px-3 py-3">{renderSolicitanteCell(c.persona_id)}</td>
                            <td className="px-3 py-3">{renderRequisitosCell('censo', c)}</td>
                            <td className="px-3 py-3 text-slate-400">
                              {c.fecha_registro
                                ? new Date(c.fecha_registro).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td
                              className="px-3 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openReviewModal('censo', c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-200 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Revisar</span>
                              </button>
                            </td>
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
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Expedientes de Personas en la Colección 'personas' ({personasList.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
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
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {(personasList || []).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-white">
                        {p.nombres} {p.apellidos}
                      </td>
                      <td className="px-4 py-3 capitalize">{p.tipo_documento}</td>
                      <td className="px-4 py-3 font-mono text-blue-400">{p.numero_documento}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
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
        {activeTab === 'auditoria' && isAdmin && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Bitácora de Auditoría Inmutable (Colección 'auditoria')</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/70 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Colección</th>
                    <th className="px-4 py-3">Documento ID</th>
                    <th className="px-4 py-3">Usuario ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
                  {(auditoriaList || []).map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2 text-slate-400">
                        {a.fecha ? new Date(a.fecha).toLocaleString() : 'N/A'}
                      </td>
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

      {/* Modal Interactivo de Revisión de Expediente, Requisitos y Notificación */}
      <SolicitudReviewModal
        selected={selectedSolicitud}
        reviewMeta={selectedSolicitud ? reviewStore[selectedSolicitud.record.id] : undefined}
        currentUser={user}
        onClose={() => setSelectedSolicitud(null)}
        onUpdateDocs={handleUpdateDocs}
        onAddNotification={handleAddNotification}
        onEmitirVisaPI={handleEmitirVisaPI}
        onEmitirVisaOrdinaria={handleEmitirVisaOrdinaria}
        onRegularizarVIRTE={handleRegularizarVIRTE}
        onQuickStatusUpdate={handleQuickStatusUpdate}
        onOpenActionModal={(cfg) => {
          setObservacionesInput(cfg.defaultObservaciones || '');
          setActionModal({
            isOpen: true,
            ...cfg,
          });
        }}
      />

      {/* Modal de Acción / Confirmación Administrativa (Rechazar / Aplazar / Anular) */}
      {actionModal && actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {actionModal.color === 'red' && <XCircle className="w-5 h-5 text-red-400" />}
                {actionModal.color === 'amber' && <Clock className="w-5 h-5 text-amber-400" />}
                {actionModal.color === 'indigo' && <RotateCcw className="w-5 h-5 text-blue-400" />}
                <span>{actionModal.titulo}</span>
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{actionModal.descripcion}</p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Motivo / Justificación Administrativa:
              </label>
              <textarea
                value={observacionesInput}
                onChange={(e) => setObservacionesInput(e.target.value)}
                placeholder="Ingrese las causales legales o requisitos pendientes a subsanar..."
                className="w-full h-20 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActionModal(null)}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={submittingAction}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer shadow-sm ${
                  actionModal.color === 'red'
                    ? 'bg-red-600 hover:bg-red-500'
                    : actionModal.color === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {submittingAction ? 'Procesando...' : 'Confirmar Acción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
