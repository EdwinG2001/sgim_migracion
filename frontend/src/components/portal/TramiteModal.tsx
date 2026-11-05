import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  MapPin, 
  Users, 
  FileText,
  Fingerprint,
  HeartHandshake,
  Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface TramiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoTramite: string;
  tramiteTitle: string;
  onSuccess?: () => void;
}

export const TramiteModal: React.FC<TramiteModalProps> = ({
  isOpen,
  onClose,
  tipoTramite,
  tramiteTitle,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Formulario del Trámite y Tablas Satélite (direcciones, nucleo_familiar, telefonos, biometricos, beneficios)
  const [form, setForm] = useState({
    // Datos específicos del trámite
    tipo_tramite: tipoTramite,
    motivo_salida: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    tipo_visa: 'trabajo',
    dias_extension: 90,
    tipo_movimiento: 'ingreso',
    punto_control: 'UIO',
    medio_transporte: 'aereo',
    motivo_viaje: 'turismo',

    // Colección 'biometricos' (Censo Migratorio VIRTE)
    codigo_dactilar: '',
    dedo_registro: 'pulgar_derecho',
    foto_url: '',

    // Colección 'beneficios' (Refugio y Censo)
    solicitar_beneficio: true,
    tipo_beneficio: 'salud',

    // Colección 'direcciones'
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'Iñaquito',
    calle_principal: '',

    // Colección 'nucleo_familiar' (opcional)
    incluir_familiar: false,
    familiar_nombres: '',
    familiar_apellidos: '',
    familiar_documento: '',
    familiar_parentesco: 'conyuge',

    // Colección 'telefonos' (adicional)
    telefono_adicional: '',
  });

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      setForm((prev) => ({
        ...prev,
        tipo_tramite: tipoTramite,
        codigo_dactilar: prev.codigo_dactilar || `DACT-EC-${randomCode}`,
        foto_url: prev.foto_url || `biometria/fotografias/FOT-${user?.username?.replace(/[^a-zA-Z0-9]/g, '_') || 'USER'}.jpg`,
        tipo_beneficio: tipoTramite === 'censo' ? 'cedula' : 'salud',
      }));
    }
  }, [isOpen, tipoTramite, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const currentToken = localStorage.getItem('sgim_token') || '';
      const payload: any = {
        tipo_tramite: tipoTramite,
        username: user?.username || '',
        persona_id: user?.persona_id || '',
        token: currentToken,
        provincia: form.provincia,
        canton: form.canton,
        parroquia: form.parroquia,
        calle_principal: form.calle_principal,
        telefono_adicional: form.telefono_adicional,
      };

      if (tipoTramite === 'censo') {
        payload.codigo_dactilar = form.codigo_dactilar;
        payload.dedo_registro = form.dedo_registro;
        if (form.solicitar_beneficio) {
          payload.solicitar_beneficio = true;
          payload.tipo_beneficio = form.tipo_beneficio;
        }
      } else if (tipoTramite === 'refugio') {
        payload.motivo_salida = form.motivo_salida;
        payload.fecha_ingreso = form.fecha_ingreso;
        if (form.solicitar_beneficio) {
          payload.solicitar_beneficio = true;
          payload.tipo_beneficio = form.tipo_beneficio;
        }
      } else if (tipoTramite === 'prorroga') {
        payload.dias_extension = Number(form.dias_extension);
      } else if (tipoTramite === 'visa') {
        payload.tipo_visa = form.tipo_visa;
      } else if (tipoTramite === 'movimiento') {
        payload.tipo_movimiento = form.tipo_movimiento;
        payload.punto_control = form.punto_control;
        payload.medio_transporte = form.medio_transporte;
        payload.motivo_viaje = form.motivo_viaje;
      }

      if (form.incluir_familiar && form.familiar_nombres) {
        payload.familiar_nombres = form.familiar_nombres;
        payload.familiar_apellidos = form.familiar_apellidos;
        payload.familiar_documento = form.familiar_documento;
        payload.familiar_parentesco = form.familiar_parentesco;
      }

      const res = await api.post('/tramites/solicitar', payload, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined,
      });
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.message || 'Error al registrar solicitud');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Error al procesar el trámite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white max-h-[90vh] flex flex-col">
        
        {/* Encabezado */}
        <div className="p-6 pb-4 bg-slate-800/80 border-b border-slate-700 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Formulario de Trámite
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {tramiteTitle}
              </h3>
              <p className="text-xs text-slate-400">
                Titular registrado: <b>{user?.username}</b> (Rol: {user?.rol})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* VISTA DE ÉXITO */}
          {result ? (
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white">
                ¡Trámite Enviado y Registrado Exitosamente!
              </h3>

              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Su trámite ha sido guardado con éxito en la base de datos MongoDB junto con sus registros de dirección y núcleo familiar.
              </p>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left space-y-2 font-mono text-xs">
                <div><span className="text-slate-400">Trámite ID:</span> <b className="text-emerald-400">{result.tramite_id}</b></div>
                <div><span className="text-slate-400">Tipo Trámite:</span> <b className="text-blue-300 capitalize">{result.tipo_tramite}</b></div>
                <div><span className="text-slate-400">Titular:</span> <b className="text-white">{result.titular}</b></div>
                <div><span className="text-slate-400">Documento:</span> <b className="text-blue-300">{result.numero_documento}</b></div>
                {result.codigo_dactilar && (
                  <div><span className="text-slate-400">Biometría Registrada:</span> <b className="text-amber-300 font-mono">{result.codigo_dactilar} (Huella dactilar guardada en MongoDB)</b></div>
                )}
                {result.tipo_beneficio && (
                  <div><span className="text-slate-400">Beneficio Vinculado:</span> <b className="text-emerald-300 uppercase">{result.tipo_beneficio} (Guardado en colección beneficios)</b></div>
                )}
                <div><span className="text-slate-400">Estado:</span> <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">{result.estado}</span></div>
                <div className="pt-2 text-[11px] text-slate-300 border-t border-slate-700 italic">
                  {result.detalle}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSuccess) onSuccess();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                >
                  {user?.rol === 'solo_lectura' ? 'Finalizar y Ver Mis Trámites' : 'Aceptar y Ver en Panel Operativo'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 1. SECCIÓN ESPECÍFICA DEL TRÁMITE */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-blue-400 text-xs">
                  <FileText className="w-4 h-4" />
                  <span>1. Requisitos Específicos del Trámite</span>
                </div>

                {tipoTramite === 'prorroga' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Días de Estadía Adicionales Solicitados</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={form.dias_extension}
                        onChange={(e) => setForm({ ...form, dias_extension: Number(e.target.value) })}
                        required
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        La ley permite hasta un máximo de 90 días reglamentarios para estadía turística.
                      </p>
                    </div>
                  </div>
                )}

                {tipoTramite === 'refugio' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Motivo Detallado de Salida del País de Origen</label>
                      <textarea
                        rows={3}
                        placeholder="Describa los motivos de persecución, conflicto o crisis que justifican su solicitud de protección internacional..."
                        value={form.motivo_salida}
                        onChange={(e) => setForm({ ...form, motivo_salida: e.target.value })}
                        required
                        minLength={10}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Fecha de Ingreso a Ecuador</label>
                      <input
                        type="date"
                        value={form.fecha_ingreso}
                        onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                        required
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                    </div>

                    {/* Asignación de Beneficio de Protección Internacional */}
                    <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-semibold text-blue-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.solicitar_beneficio}
                            onChange={(e) => setForm({ ...form, solicitar_beneficio: e.target.checked })}
                            className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0"
                          />
                          <HeartHandshake className="w-4 h-4 text-blue-400" />
                          <span>Solicitar Beneficio de Protección Humanitaria (Colección beneficios)</span>
                        </label>
                      </div>

                      {form.solicitar_beneficio && (
                        <div className="pt-1">
                          <label className="block text-slate-300 mb-1">Tipo de Beneficio Asignado</label>
                          <select
                            value={form.tipo_beneficio}
                            onChange={(e) => setForm({ ...form, tipo_beneficio: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                          >
                            <option value="salud">Salud: Atención Médica y Red Pública Integral</option>
                            <option value="educacion">Educación: Acceso e Inclusión Educativa</option>
                            <option value="trabajo">Trabajo: Autorización Laboral y Medios de Vida</option>
                            <option value="cedula">Cédula: Identificación Humanitaria Provisoria</option>
                          </select>
                          <p className="text-[10px] text-blue-300/80 mt-1">
                            Se registrará en la colección <b>beneficios</b> bajo gestión de Corozo Angulo Milena Jazmin (Analista PI).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tipoTramite === 'visa' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Tipo de Visa Solicitada</label>
                      <select
                        value={form.tipo_visa}
                        onChange={(e) => setForm({ ...form, tipo_visa: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="trabajo">Visa de Trabajo (Bajo relación de dependencia)</option>
                        <option value="estudios">Visa de Estudios (Educación superior)</option>
                        <option value="inversion">Visa de Inversión</option>
                        <option value="amparo_familiar">Visa de Amparo Familiar</option>
                      </select>
                    </div>
                  </div>
                )}

                {tipoTramite === 'censo' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                      <Fingerprint className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <b className="font-bold text-amber-300">Enrolamiento Biométrico del Censo Migratorio (VIRTE)</b>
                        <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                          Conforme al Decreto de regularización extraordinaria, este trámite registrará su permanencia voluntaria emitiendo el <b>Certificado Censal oficial</b> e ingresará sus datos en la colección <b>biometricos</b> de MongoDB.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                          <span>Código Dactilar / Registro de Huella</span>
                        </label>
                        <input
                          type="text"
                          required
                          minLength={5}
                          placeholder="Ej: DACT-EC-89412"
                          value={form.codigo_dactilar}
                          onChange={(e) => setForm({ ...form, codigo_dactilar: e.target.value })}
                          className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Código de la estación dactilar biométrica (Colección <b>biometricos</b>).
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Dedo de Captura Dactilar</label>
                        <select
                          value={form.dedo_registro}
                          onChange={(e) => setForm({ ...form, dedo_registro: e.target.value })}
                          className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="pulgar_derecho">Pulgar Mano Derecha (D-1)</option>
                          <option value="indice_derecho">Índice Mano Derecha (D-2)</option>
                          <option value="pulgar_izquierdo">Pulgar Mano Izquierda (I-1)</option>
                          <option value="indice_izquierdo">Índice Mano Izquierda (I-2)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Dedo patrón validado para la plantilla dactilar.
                        </p>
                      </div>
                    </div>

                    {/* Captura Facial Digital en Mantenimiento */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 text-slate-300">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block">Registro de Captura Facial Digital</span>
                          <span className="text-[11px] text-slate-400">Validación biométrica fotográfica frontal</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wide">
                        Aún en mantenimiento
                      </span>
                    </div>

                    {/* Beneficio de Regularización VIRTE */}
                    <div className="pt-2 border-t border-slate-700/80">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-emerald-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.solicitar_beneficio}
                            onChange={(e) => setForm({ ...form, solicitar_beneficio: e.target.checked })}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <HeartHandshake className="w-4 h-4" />
                          <span>Vincular Beneficio de Regularización VIRTE (Colección beneficios)</span>
                        </label>
                      </div>

                      {form.solicitar_beneficio && (
                        <div>
                          <label className="block text-slate-300 mb-1">Beneficio Prioritario Solicitado</label>
                          <select
                            value={form.tipo_beneficio}
                            onChange={(e) => setForm({ ...form, tipo_beneficio: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                          >
                            <option value="cedula">Cédula de Regularización Extraordinaria VIRTE</option>
                            <option value="trabajo">Habilitación de Contrato Laboral y Empleo</option>
                            <option value="salud">Cobertura en Centros de Salud Pública</option>
                            <option value="educacion">Inclusión en el Sistema Educativo Nacional</option>
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Se registrará en la colección <b>beneficios</b> con estado activo bajo supervisión censal.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tipoTramite === 'movimiento' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Tipo de Movimiento</label>
                      <select
                        value={form.tipo_movimiento}
                        onChange={(e) => setForm({ ...form, tipo_movimiento: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="ingreso">Ingreso al País</option>
                        <option value="salida">Salida del País</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Punto de Control</label>
                      <select
                        value={form.punto_control}
                        onChange={(e) => setForm({ ...form, punto_control: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="UIO">Aeropuerto Mariscal Sucre (Quito)</option>
                        <option value="GYE">Aeropuerto José Joaquín de Olmedo (Guayaquil)</option>
                        <option value="RUM">Paso Fronterizo Rumichaca (Frontera Norte)</option>
                        <option value="HUA">Paso Fronterizo Huaquillas (Frontera Sur)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. COLECCIÓN 'direcciones' (DOMICILIO EN ECUADOR) */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-400 text-xs">
                  <MapPin className="w-4 h-4" />
                  <span>2. Domicilio Actual en Ecuador (Colección direcciones)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Provincia</label>
                    <input
                      type="text"
                      placeholder="Ej: Pichincha"
                      value={form.provincia}
                      onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Cantón / Ciudad</label>
                    <input
                      type="text"
                      placeholder="Ej: Quito"
                      value={form.canton}
                      onChange={(e) => setForm({ ...form, canton: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Parroquia</label>
                    <input
                      type="text"
                      placeholder="Ej: Iñaquito"
                      value={form.parroquia}
                      onChange={(e) => setForm({ ...form, parroquia: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Calle Principal y Número / Referencia</label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Amazonas N34-120 y Naciones Unidas"
                    value={form.calle_principal}
                    onChange={(e) => setForm({ ...form, calle_principal: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. COLECCIÓN 'nucleo_familiar' (OPCIONAL SEGÚN TRÁMITE) */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-indigo-400 text-xs">
                    <Users className="w-4 h-4" />
                    <span>3. Miembros del Núcleo Familiar (Colección nucleo_familiar)</span>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.incluir_familiar}
                      onChange={(e) => setForm({ ...form, incluir_familiar: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>¿Incluir familiar?</span>
                  </label>
                </div>

                {form.incluir_familiar && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-slate-300 mb-1">Nombres del Familiar</label>
                      <input
                        type="text"
                        placeholder="Nombres"
                        value={form.familiar_nombres}
                        onChange={(e) => setForm({ ...form, familiar_nombres: e.target.value })}
                        required={form.incluir_familiar}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Apellidos del Familiar</label>
                      <input
                        type="text"
                        placeholder="Apellidos"
                        value={form.familiar_apellidos}
                        onChange={(e) => setForm({ ...form, familiar_apellidos: e.target.value })}
                        required={form.incluir_familiar}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Documento del Familiar</label>
                      <input
                        type="text"
                        placeholder="Pasaporte o Cédula"
                        value={form.familiar_documento}
                        onChange={(e) => setForm({ ...form, familiar_documento: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Parentesco</label>
                      <select
                        value={form.familiar_parentesco}
                        onChange={(e) => setForm({ ...form, familiar_parentesco: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="conyuge">Cónyuge</option>
                        <option value="hijo">Hijo</option>
                        <option value="hija">Hija</option>
                        <option value="padre">Padre</option>
                        <option value="madre">Madre</option>
                        <option value="hermano">Hermano</option>
                        <option value="hermana">Hermana</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 font-bold tracking-wide rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Guardando en BD...' : 'ENVIAR TRÁMITE A REVISIÓN'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
