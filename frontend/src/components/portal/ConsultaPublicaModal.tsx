import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  UserCheck, 
  Clock, 
  Calendar, 
  AlertCircle, 
  ShieldCheck,
  LogIn,
  RotateCcw,
  User as UserIcon
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ConsultaPublicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export const ConsultaPublicaModal: React.FC<ConsultaPublicaModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const { user, isAuthenticated } = useAuth();

  const [documento, setDocumento] = useState('');
  const [tramiteId, setTramiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cuando se abre el modal: si el usuario está autenticado, cargar automáticamente sus trámites oficiales
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (isAuthenticated && user) {
        if (user.numero_documento) {
          setDocumento(user.numero_documento);
        } else if (user.username) {
          setDocumento(user.username);
        }
        cargarTramitesAutenticado();
      } else {
        setHasSearched(false);
        setResultados([]);
      }
    }
  }, [isOpen, isAuthenticated, user]);

  const cargarTramitesAutenticado = async () => {
    setLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (user?.username) params.username = user.username;
      if (user?.persona_id) params.persona_id = user.persona_id;
      if (user?.numero_documento) params.documento = user.numero_documento;

      const res = await api.get('/tramites/mis-tramites', { params });
      if (res.data.success && Array.isArray(res.data.data)) {
        setResultados(res.data.data);
      } else {
        setResultados([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al consultar sus trámites.');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const docClean = documento.trim();
    const idClean = tramiteId.trim();

    if (!docClean && !idClean) {
      setError('Por favor ingrese su número de documento o el código de radicación.');
      return;
    }

    setError(null);
    setLoading(true);
    setHasSearched(true);

    try {
      const params: Record<string, string> = {};
      if (docClean) params.documento = docClean;
      if (idClean) params.tramite_id = idClean;

      const res = await api.get('/tramites/consulta-publica', { params });
      if (res.data.success && Array.isArray(res.data.data)) {
        setResultados(res.data.data);
      } else {
        setResultados([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al consultar el trámite.');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getEstadoBadge = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'aprobado' || est === 'completado') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (est === 'recibida' || est === 'en_tramite') {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
    if (est === 'solicitada' || est === 'activo') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-white max-h-[90vh] flex flex-col">
        
        {/* Cabecera Independiente y Exclusiva de Consultas */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Consulta de Estado de Trámites Migratorios
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full uppercase">
                  Ventanilla Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Información en tiempo real de sus solicitudes, fechas de radicación y funcionarios asignados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Principal */}
        <div className="p-6 overflow-y-auto space-y-5">

          {/* Banner de Usuario Autenticado si ha iniciado sesión */}
          {isAuthenticated && user && (
            <div className="p-3.5 rounded-xl bg-blue-950/50 border border-blue-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold text-slate-200">
                    {user.nombres ? `${user.nombres} ${user.apellidos || ''}` : user.username}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Documento: {user.numero_documento || 'No registrado'} • {user.username}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={cargarTramitesAutenticado}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-semibold transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>
          )}

          {/* Buscador de Trámites (Para público general o para rastrear por ID específico) */}
          <form onSubmit={handleBuscar} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isAuthenticated ? 'Buscar o Rastrear por Código de Radicación' : 'Ingrese sus Datos de Búsqueda'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número de Cédula o Pasaporte:
                </label>
                <input
                  type="text"
                  placeholder="Ej: 3269451635"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Código de Trámite / ID (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: 6ae4239b0d39c568c88e6a85"
                  value={tramiteId}
                  onChange={(e) => setTramiteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono text-xs"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Consulta directa indexada en la base de datos de Migración Ecuador.
              </span>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? 'Buscando...' : 'CONSULTAR ESTADO'}</span>
              </button>
            </div>
          </form>

          {/* Estado de Carga */}
          {loading && (
            <div className="py-8 text-center space-y-2 text-xs text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Consultando expedientes y trámites en MongoDB...</p>
            </div>
          )}

          {/* Sin Resultados */}
          {!loading && hasSearched && resultados.length === 0 && (
            <div className="p-6 text-center space-y-2 bg-slate-800/30 rounded-xl border border-slate-800">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">
                No se encontraron trámites registrados
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No existen solicitudes activas vinculadas a los datos ingresados. Verifique el número de cédula, pasaporte o código de trámite.
              </p>
            </div>
          )}

          {/* Lista de Resultados Encontrados */}
          {!loading && resultados.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-300 uppercase tracking-wide">
                  Historial de Trámites Encontrados ({resultados.length}):
                </span>
                {resultados[0]?.titular && (
                  <span className="font-mono text-emerald-400 font-bold">
                    Titular: {resultados[0].titular}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {resultados.map((t, idx) => (
                  <div 
                    key={t.id || idx}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs shadow-md"
                  >
                    {/* Cabecera del Trámite */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                      <div>
                        <span className="font-bold text-white text-sm block">
                          {t.tipo}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>ID: <b className="text-slate-300">{t.id}</b></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span>{t.fecha}</span>
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border self-start sm:self-center ${getEstadoBadge(t.estado)}`}>
                        {t.estado}
                      </span>
                    </div>

                    {/* Detalles: Encargado Oficial, Solicitado y Observaciones */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      
                      {/* Funcionario Encargado Oficial */}
                      {t.encargado && (
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Funcionario / Encargado de Revisión:
                            </span>
                            <span className="text-slate-200 font-semibold text-xs">
                              {t.encargado}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Lo Solicitado */}
                      {t.solicitado && (
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Detalle de lo Solicitado:
                            </span>
                            <span className="text-slate-200 text-xs">
                              {t.solicitado}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Observaciones */}
                      {t.observaciones && (
                        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5">
                          <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Observaciones y Seguimiento:
                            </span>
                            <span className="text-slate-300 text-[11px] italic">
                              {t.observaciones}
                            </span>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banner para iniciar sesión (Solo si NO está autenticado) */}
          {!isAuthenticated && onOpenLogin && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/60 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>¿Tiene cuenta creada en el SGIM? Inicie sesión para ver su perfil completo.</span>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-blue-400 font-semibold hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          )}

        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
