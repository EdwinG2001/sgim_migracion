import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Send,
  Bell,
  Shield,
  Award,
  Users,
  Check,
  RotateCcw,
  FileCheck2,
  FileWarning,
  FileClock,
  Sparkles,
  Calendar,
  Globe,
  Hash,
} from 'lucide-react';
import api from '../../services/api';
import {
  MODULE_CONFIGS,
  getDefaultDocsForRecord,
  type ModuleType,
  type DocStatus,
  type DocumentCheckState,
  type CitizenNotification,
  type SolicitudReviewMeta,
} from '../../data/tramiteRequisitos';

export interface SelectedSolicitud {
  moduleType: ModuleType;
  record: any;
  persona?: any;
}

interface SolicitudReviewModalProps {
  selected: SelectedSolicitud | null;
  reviewMeta?: SolicitudReviewMeta;
  currentUser: { username?: string; rol?: string } | null;
  onClose: () => void;
  onUpdateDocs: (recordId: string, docs: Record<string, DocumentCheckState>) => void;
  onAddNotification: (recordId: string, notification: CitizenNotification) => void;
  onEmitirVisaPI: (solicitudId: string) => Promise<void>;
  onEmitirVisaOrdinaria: (solicitudId: string) => Promise<void>;
  onRegularizarVIRTE: (personaId: string) => Promise<void>;
  onOpenActionModal: (config: {
    tipo: 'pi' | 'visa' | 'mov';
    id: string;
    nuevoEstado: string;
    titulo: string;
    descripcion: string;
    color: string;
    defaultObservaciones?: string;
  }) => void;
  onQuickStatusUpdate?: (
    tipo: 'pi' | 'visa',
    id: string,
    nuevoEstado: string,
    observaciones: string
  ) => Promise<void>;
}

export const SolicitudReviewModal: React.FC<SolicitudReviewModalProps> = ({
  selected,
  reviewMeta,
  currentUser,
  onClose,
  onUpdateDocs,
  onAddNotification,
  onEmitirVisaPI,
  onEmitirVisaOrdinaria,
  onRegularizarVIRTE,
  onOpenActionModal,
  onQuickStatusUpdate,
}) => {
  const [personaDetail, setPersonaDetail] = useState<{
    persona?: any;
    correos?: any[];
    telefonos?: any[];
    direcciones?: any[];
  } | null>(null);
  const [loadingPersona, setLoadingPersona] = useState(false);

  // Notification composer state
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyChannels, setNotifyChannels] = useState<('email' | 'sms' | 'portal')[]>([
    'email',
    'portal',
  ]);
  const [alsoMarkEnRevision, setAlsoMarkEnRevision] = useState(true);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const record = selected?.record;
  const moduleType = selected?.moduleType;
  const config = moduleType ? MODULE_CONFIGS[moduleType] : null;

  const docs: Record<string, DocumentCheckState> =
    selected && moduleType && record
      ? reviewMeta?.docs || getDefaultDocsForRecord(moduleType, record.id, record.estado)
      : {};

  const notifications = reviewMeta?.notifications || [];

  // Load full person contact details from MongoDB
  useEffect(() => {
    if (!selected?.record?.persona_id) {
      setPersonaDetail(selected?.persona ? { persona: selected.persona } : null);
      return;
    }

    let cancelled = false;
    setLoadingPersona(true);
    setShowNotifyPanel(false);
    setNotifySuccess(null);

    api
      .get(`/personas/${selected.record.persona_id}`)
      .then((res) => {
        if (!cancelled && res.data?.success && res.data.data) {
          setPersonaDetail(res.data.data);
        } else if (!cancelled) {
          setPersonaDetail(selected.persona ? { persona: selected.persona } : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPersonaDetail(selected.persona ? { persona: selected.persona } : null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPersona(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.record?.id, selected?.record?.persona_id]);

  if (!selected || !record || !moduleType || !config) return null;

  const persona = personaDetail?.persona || selected.persona;
  const fullName = persona
    ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim()
    : 'Solicitante Registrado';
  const primaryEmail =
    personaDetail?.correos?.[0]?.correo ||
    (persona?.nombres
      ? `${persona.nombres.toLowerCase().split(' ')[0]}.${(persona.apellidos || 'usuario')
          .toLowerCase()
          .split(' ')[0]}@correo.ec`
      : 'solicitante@migracion.gob.ec');
  const primaryPhone = personaDetail?.telefonos?.[0]?.numero || 'No registrado';
  const primaryAddress = personaDetail?.direcciones?.[0]
    ? `${personaDetail.direcciones[0].calle_principal}, ${personaDetail.direcciones[0].parroquia}, ${personaDetail.direcciones[0].canton} (${personaDetail.direcciones[0].provincia})`
    : 'Sin domicilio registrado';

  const verifiedCount = config.requirements.filter(
    (r) => (docs[r.key]?.status || 'pendiente') === 'verificado'
  ).length;
  const incompleteDocs = config.requirements.filter(
    (r) => (docs[r.key]?.status || 'pendiente') === 'incompleto'
  );
  const pendingDocs = config.requirements.filter(
    (r) => (docs[r.key]?.status || 'pendiente') === 'pendiente'
  );
  const totalReqs = config.requirements.length;
  const percent = Math.round((verifiedCount / totalReqs) * 100);
  const allVerified = verifiedCount === totalReqs;

  const handleSetDocStatus = (key: string, status: DocStatus) => {
    const updated: Record<string, DocumentCheckState> = {
      ...docs,
      [key]: {
        ...docs[key],
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    onUpdateDocs(record.id, updated);
  };

  const handleSetDocNote = (key: string, note: string) => {
    const updated: Record<string, DocumentCheckState> = {
      ...docs,
      [key]: {
        ...docs[key],
        status: docs[key]?.status || 'pendiente',
        note,
        updatedAt: new Date().toISOString(),
      },
    };
    onUpdateDocs(record.id, updated);
  };

  const handleVerifyAll = () => {
    const updated: Record<string, DocumentCheckState> = {};
    const now = new Date().toISOString();
    config.requirements.forEach((r) => {
      updated[r.key] = { ...docs[r.key], status: 'verificado', updatedAt: now };
    });
    onUpdateDocs(record.id, updated);
  };

  const openNotifyComposer = () => {
    const missingList = [...incompleteDocs, ...pendingDocs];
    const docLines =
      missingList.length > 0
        ? missingList
            .map((d) => {
              const st = docs[d.key]?.status === 'incompleto' ? 'Faltante/Incompleto' : 'Pendiente de entrega';
              const customNote = docs[d.key]?.note ? ` — Obs: ${docs[d.key].note}` : '';
              return `• ${d.label} [${st}]${customNote}`;
            })
            .join('\n')
        : '• Por favor acerque o cargue la documentación de respaldo solicitada para continuar su trámite.';

    setNotifyMessage(
      `Estimado/a ${fullName},\n\nLe informamos desde la Subsecretaría de Migración (SGIM) respecto a su trámite #${record.id?.slice(
        -8
      )} (${config.shortTitle}) que requiere subsanar los siguientes documentos:\n\n${docLines}\n\nPor favor complete los requisitos a través de la Ventanilla Digital para reanudar la evaluación.`
    );
    setNotifySuccess(null);
    setShowNotifyPanel(true);
  };

  const toggleChannel = (ch: 'email' | 'sms' | 'portal') => {
    setNotifyChannels((prev) =>
      prev.includes(ch) ? (prev.length > 1 ? prev.filter((c) => c !== ch) : prev) : [...prev, ch]
    );
  };

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) return;
    setSendingNotify(true);
    setNotifySuccess(null);
    try {
      const missingLabels = [...incompleteDocs, ...pendingDocs].map((d) => d.label);
      const newNotif: CitizenNotification = {
        id: `notif-${Date.now()}`,
        sentAt: new Date().toISOString(),
        sentBy: currentUser?.username || 'Funcionario SGIM',
        recipientName: fullName,
        recipientContact: primaryEmail,
        channels: notifyChannels,
        missingDocs: missingLabels,
        message: notifyMessage.trim(),
      };
      onAddNotification(record.id, newNotif);

      // If requested and applicable, also update backend status to en_revision / archivado
      if (alsoMarkEnRevision && onQuickStatusUpdate) {
        if (moduleType === 'visa' && record.estado === 'recibida') {
          await onQuickStatusUpdate('visa', record.id, 'en_revision', notifyMessage.trim());
        } else if (moduleType === 'pi' && record.estado === 'en_tramite') {
          await onQuickStatusUpdate('pi', record.id, 'archivado', notifyMessage.trim());
        }
      }

      setNotifySuccess(
        `Notificación enviada a ${fullName} (${primaryEmail}) vía ${notifyChannels
          .map((c) => (c === 'email' ? 'Correo' : c === 'sms' ? 'SMS' : 'Ventanilla Digital'))
          .join(', ')}.`
      );
      setShowNotifyPanel(false);
    } finally {
      setSendingNotify(false);
    }
  };

  const accentBadge =
    config.accent === 'indigo'
      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      : config.accent === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : config.accent === 'blue'
      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

  const ModuleIcon =
    moduleType === 'pi'
      ? Shield
      : moduleType === 'visa'
      ? Award
      : moduleType === 'mov'
      ? FileText
      : Users;

  const isClosed =
    record.estado === 'emitida' ||
    record.estado === 'aprobado' ||
    record.estado === 'rechazado' ||
    record.estado === 'rechazada' ||
    record.estado === 'anulado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* TOP HEADER */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl border ${accentBadge}`}>
              <ModuleIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${accentBadge}`}
                >
                  {config.code} · {config.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-700/80 text-blue-300 border border-slate-600/60">
                  ID #{record.id?.slice(-8)}
                </span>
                {record.estado && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                      record.estado === 'emitida' ||
                      record.estado === 'aprobado' ||
                      record.estado === 'aprobada' ||
                      record.estado === 'activo'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : record.estado === 'rechazado' ||
                          record.estado === 'rechazada' ||
                          record.estado === 'anulado'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : record.estado === 'en_revision' || record.estado === 'archivado'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {record.estado}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                {config.title}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Responsable de módulo: <span className="text-slate-200 font-medium">{config.officer}</span> · Tiempo estimado: <span className="text-slate-300">{config.estimatedTime}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
            title="Cerrar expediente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY (Scrollable Two-Column Layout) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {notifySuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{notifySuccess}</span>
              </div>
              <button
                onClick={() => setNotifySuccess(null)}
                className="text-emerald-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Solicitante + Detalle del Trámite */}
            <div className="lg:col-span-5 space-y-4">
              {/* Tarjeta del Solicitante */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
                    <User className="w-4 h-4" />
                    <span>Datos del Solicitante</span>
                  </div>
                  {loadingPersona && (
                    <span className="text-[10px] text-slate-400 animate-pulse">Sincronizando...</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                    {fullName
                      .split(' ')
                      .slice(0, 2)
                      .map((n: string) => n.charAt(0))
                      .join('')
                      .toUpperCase() || 'SG'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{fullName}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-blue-300">
                        {persona?.tipo_documento?.toUpperCase() || 'DOC'}:{' '}
                        {persona?.numero_documento || record.persona_id?.slice(-8) || 'N/A'}
                      </span>
                      {persona?.nacionalidad && (
                        <span className="px-2 py-0.5 rounded bg-slate-700/80 text-[10px] font-bold text-slate-200 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          {persona.nacionalidad}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="font-mono text-[11px] break-all">{primaryEmail}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="font-mono text-[11px]">{primaryPhone}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-[11px] leading-relaxed">{primaryAddress}</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Detalles del Trámite */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/60 pb-2.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Información de la Solicitud</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Código Completo
                    </span>
                    <p className="font-mono text-[11px] text-blue-300 mt-0.5 truncate" title={record.id}>
                      {record.id}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fecha Registro
                    </span>
                    <p className="font-semibold text-slate-200 mt-0.5 text-[11px]">
                      {record.fecha_solicitud
                        ? new Date(record.fecha_solicitud).toLocaleDateString()
                        : record.fecha_hora
                        ? new Date(record.fecha_hora).toLocaleString()
                        : record.fecha_registro
                        ? new Date(record.fecha_registro).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>

                  {moduleType === 'visa' && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                      <span className="text-[10px] text-slate-400">Categoría de Visa Solicitada</span>
                      <p className="font-bold text-emerald-300 capitalize mt-0.5">
                        Visa de Residencia — {record.tipo_visa?.replace('_', ' ')}
                      </p>
                    </div>
                  )}

                  {moduleType === 'pi' && (
                    <>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">País de Origen</span>
                        <p className="font-bold text-indigo-300 mt-0.5">{record.pais_origen}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">Ingreso a Ecuador</span>
                        <p className="font-semibold text-slate-200 mt-0.5">
                          {record.fecha_ingreso_ecuador
                            ? new Date(record.fecha_ingreso_ecuador).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">Motivo Declarado</span>
                        <p className="text-slate-200 mt-1 text-[11px] leading-relaxed">
                          {record.motivo_salida}
                        </p>
                      </div>
                    </>
                  )}

                  {moduleType === 'mov' && (
                    <>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">Movimiento / Punto</span>
                        <p className="font-bold text-blue-300 uppercase mt-0.5">
                          {record.tipo} · {record.punto_control}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">Días Autorizados</span>
                        <p className="font-bold text-emerald-300 mt-0.5">
                          {record.dias_permitidos} días ({record.medio_transporte})
                        </p>
                      </div>
                      <div className="col-span-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400">Motivo de Viaje</span>
                        <p className="text-slate-200 capitalize mt-0.5">{record.motivo_viaje}</p>
                      </div>
                    </>
                  )}

                  {moduleType === 'censo' && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50">
                      <span className="text-[10px] text-slate-400">Certificado Censal Emitido</span>
                      <p className="font-mono font-bold text-amber-300 mt-0.5">
                        {record.numero_certificado}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de Notificaciones Enviadas */}
              {notifications.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-amber-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      Notificaciones Enviadas ({notifications.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-amber-200">{n.sentBy}</span>
                          <span>{new Date(n.sentAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-line line-clamp-3">{n.message}</p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {n.channels.map((ch) => (
                            <span
                              key={ch}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] uppercase font-bold text-blue-300 border border-slate-700"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Verificación de Requisitos + Notificación al Solicitante */}
            <div className="lg:col-span-7 space-y-4">
              {/* Progreso de Requisitos */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      <span>Verificación de Requisitos Documentales</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Marque el estado de cada documento entregado por el solicitante antes de resolver el trámite.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Validar Todos</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">
                      Cumplimiento: {verifiedCount} de {totalReqs} requisitos entregados y verificados
                    </span>
                    <span
                      className={`font-bold ${
                        allVerified
                          ? 'text-emerald-400'
                          : incompleteDocs.length > 0
                          ? 'text-red-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-700/60">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        allVerified
                          ? 'bg-emerald-500'
                          : incompleteDocs.length > 0
                          ? 'bg-gradient-to-r from-amber-500 to-red-500'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Lista de Requisitos */}
                <div className="space-y-3 pt-1">
                  {config.requirements.map((req) => {
                    const state = docs[req.key] || { status: 'pendiente' as DocStatus };
                    const isVerified = state.status === 'verificado';
                    const isIncomplete = state.status === 'incompleto';

                    return (
                      <div
                        key={req.key}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          isVerified
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isIncomplete
                            ? 'bg-red-950/25 border-red-500/35'
                            : 'bg-slate-900/70 border-amber-500/25'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isVerified
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isIncomplete
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {isVerified ? (
                                <FileCheck2 className="w-4 h-4" />
                              ) : isIncomplete ? (
                                <FileWarning className="w-4 h-4" />
                              ) : (
                                <FileClock className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white leading-snug">{req.label}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                {req.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {isIncomplete ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                                    <AlertTriangle className="w-3 h-3" />
                                    Documento faltante o inválido
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                                    <FileText className="w-3 h-3 text-blue-400" />
                                    {req.simulatedFileName} ({req.simulatedSize})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botones de Estado del Documento */}
                          <div className="flex items-center gap-1 shrink-0 bg-slate-950/60 p-1 rounded-xl border border-slate-700/60 self-start">
                            <button
                              type="button"
                              onClick={() => handleSetDocStatus(req.key, 'verificado')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isVerified
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                              }`}
                              title="Marcar como entregado y verificado"
                            >
                              <Check className="w-3 h-3" />
                              Entregado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDocStatus(req.key, 'pendiente')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                state.status === 'pendiente'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                              }`}
                              title="Marcar como pendiente de revisión"
                            >
                              <Clock className="w-3 h-3" />
                              Pendiente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDocStatus(req.key, 'incompleto')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isIncomplete
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-red-300 hover:bg-slate-800'
                              }`}
                              title="Marcar como faltante o incompleto"
                            >
                              <XCircle className="w-3 h-3" />
                              Faltante
                            </button>
                          </div>
                        </div>

                        {/* Observación específica si está incompleto o pendiente */}
                        {!isVerified && (
                          <input
                            type="text"
                            value={state.note || ''}
                            onChange={(e) => handleSetDocNote(req.key, e.target.value)}
                            placeholder="Observación opcional (ej. falta apostilla vigente, archivo ilegible...)"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700/80 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel / Botón para Informar al Solicitante */}
              <div
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  incompleteDocs.length > 0
                    ? 'bg-amber-950/25 border-amber-500/40'
                    : 'bg-slate-800/50 border-slate-700/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        incompleteDocs.length > 0
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/15 text-blue-400'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Notificación de Subsanación al Solicitante
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {incompleteDocs.length > 0
                          ? `Hay ${incompleteDocs.length} documento(s) faltante(s) o incompleto(s). Puede informar de inmediato a ${fullName}.`
                          : 'Envíe un aviso formal al ciudadano sobre observaciones o estado de su expediente.'}
                      </p>
                    </div>
                  </div>

                  {!showNotifyPanel && (
                    <button
                      type="button"
                      onClick={openNotifyComposer}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
                        incompleteDocs.length > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Informar al Solicitante</span>
                    </button>
                  )}
                </div>

                {showNotifyPanel && (
                  <div className="pt-3 border-t border-slate-700/60 space-y-3 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-300">
                        Destinatario: <b className="text-white">{fullName}</b>{' '}
                        <span className="font-mono text-blue-300">({primaryEmail})</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            { id: 'email', label: 'Correo' },
                            { id: 'sms', label: 'SMS' },
                            { id: 'portal', label: 'Ventanilla' },
                          ] as const
                        ).map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => toggleChannel(ch.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                              notifyChannels.includes(ch.id)
                                ? 'bg-blue-600/30 text-blue-200 border-blue-500/50'
                                : 'bg-slate-900 text-slate-500 border-slate-700'
                            }`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/60"
                    />

                    {(moduleType === 'visa' && record.estado === 'recibida') ||
                    (moduleType === 'pi' && record.estado === 'en_tramite') ? (
                      <label className="flex items-center gap-2 text-[11px] text-amber-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alsoMarkEnRevision}
                          onChange={(e) => setAlsoMarkEnRevision(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-600 text-amber-500 focus:ring-0"
                        />
                        <span>
                          Cambiar también el estado del trámite a{' '}
                          <b>{moduleType === 'visa' ? 'en_revision' : 'archivado'}</b> en MongoDB mientras subsana
                        </span>
                      </label>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNotifyPanel(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={sendingNotify || !notifyMessage.trim()}
                        onClick={handleSendNotification}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingNotify ? 'Enviando...' : 'Enviar Notificación'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER: Acciones Administrativas Directas */}
        <div className="px-6 py-4 bg-slate-800/90 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            {!allVerified && !isClosed ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Faltan <b className="text-amber-300">{totalReqs - verifiedCount}</b> requisito(s) por validar antes de emitir.
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium">
                  {isClosed
                    ? 'Expediente en estado final / histórico.'
                    : 'Todos los requisitos han sido verificados. Listo para emisión.'}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {/* Acciones Módulo 1: PI */}
            {moduleType === 'pi' && record.estado === 'en_tramite' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenActionModal({
                      tipo: 'pi',
                      id: record.id,
                      nuevoEstado: 'archivado',
                      titulo: 'Aplazar / Archivar Solicitud PI',
                      descripcion: `¿Desea aplazar la solicitud #${record.id?.slice(-8)} de ${fullName}?`,
                      color: 'amber',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Aplazar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenActionModal({
                      tipo: 'pi',
                      id: record.id,
                      nuevoEstado: 'rechazado',
                      titulo: 'Rechazar Solicitud de Protección',
                      descripcion: `¿Confirma el rechazo de la solicitud #${record.id?.slice(-8)} de ${fullName}?`,
                      color: 'red',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={async () => {
                    setBusyAction(true);
                    try {
                      await onEmitirVisaPI(record.id);
                      onClose();
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyAction ? 'Emitiendo...' : 'Aprobar y Emitir Visa PI'}
                </button>
              </>
            )}

            {moduleType === 'pi' && record.estado === 'archivado' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenActionModal({
                    tipo: 'pi',
                    id: record.id,
                    nuevoEstado: 'en_tramite',
                    titulo: 'Reanudar Evaluación de Solicitud',
                    descripcion: `¿Desea reactivar la solicitud #${record.id?.slice(-8)} de ${fullName}?`,
                    color: 'indigo',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reanudar Trámite
              </button>
            )}

            {/* Acciones Módulo 3: Visas */}
            {moduleType === 'visa' &&
              (record.estado === 'recibida' ||
                record.estado === 'en_revision' ||
                record.estado === 'aprobada') && (
                <>
                  {record.estado === 'recibida' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenActionModal({
                          tipo: 'visa',
                          id: record.id,
                          nuevoEstado: 'en_revision',
                          titulo: 'Poner Solicitud En Revisión / Aplazar',
                          descripcion: `¿Desea cambiar la solicitud #${record.id?.slice(-8)} de ${fullName} a 'en_revision'?`,
                          color: 'amber',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      En Revisión
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenActionModal({
                        tipo: 'visa',
                        id: record.id,
                        nuevoEstado: 'rechazada',
                        titulo: 'Rechazar Solicitud de Visa',
                        descripcion: `¿Confirma el rechazo de la solicitud #${record.id?.slice(-8)} de ${fullName}?`,
                        color: 'red',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        await onEmitirVisaOrdinaria(record.id);
                        onClose();
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {busyAction ? 'Emitiendo...' : 'Aprobar y Emitir Visa'}
                  </button>
                </>
              )}

            {/* Acciones Módulo 2: Movimientos */}
            {moduleType === 'mov' && record.estado !== 'anulado' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenActionModal({
                    tipo: 'mov',
                    id: record.id,
                    nuevoEstado: 'anulado',
                    titulo: 'Anular Registro de Movimiento Fronterizo',
                    descripcion: `¿Confirma la anulación del movimiento #${record.id?.slice(-8)} de ${fullName} en ${record.punto_control}?`,
                    color: 'red',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Anular Movimiento
              </button>
            )}

            {/* Acciones Módulo 4: Censo -> Emitir Visa VIRTE */}
            {moduleType === 'censo' && record.persona_id && (
              <button
                type="button"
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  try {
                    await onRegularizarVIRTE(record.persona_id);
                    onClose();
                  } finally {
                    setBusyAction(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                {busyAction ? 'Procesando...' : 'Emitir Visa Humanitaria VIRTE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
