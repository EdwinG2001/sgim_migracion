import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

interface GlassLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  noticeMessage?: string | null;
}

export const GlassLoginModal: React.FC<GlassLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  noticeMessage
}) => {
  const { login, setSession } = useAuth();
  const { t } = useLanguage();

  // Modos: 'login' | 'register' | 'success'
  const [mode, setMode] = useState<'login' | 'register' | 'success'>('login');

  // Estado Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado Crear Cuenta (SOLO DATOS PERSONALES Y ACCESO - SIN TRÁMITES)
  const [formData, setFormData] = useState({
    tipo_documento: 'pasaporte',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    nacionalidad: 'VEN',
    sexo: 'M',
    email: '',
    password: '',
    telefono: '',
  });

  const [createdProfile, setCreatedProfile] = useState<any>(null);

  // Reiniciar estado siempre que el modal se abre o cierra
  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setError(null);
      setCreatedProfile(null);
      setPassword('');
    }
  }, [isOpen]);

  const handleModalClose = () => {
    setMode('login');
    setCreatedProfile(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // 1. Manejo de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al autenticarse');
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejo de Registro Limpio (POST /api/auth/register-citizen)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/register-citizen', formData);
      if (res.data.success) {
        setCreatedProfile(res.data.data);

        // Autologin inmediato en el contexto de autenticación de React
        if (res.data.data.token && res.data.data.user) {
          const userWithPersona = {
            ...res.data.data.user,
            nombres: res.data.data.persona?.nombres,
            apellidos: res.data.data.persona?.apellidos,
            numero_documento: res.data.data.persona?.numero_documento,
            nacionalidad: res.data.data.persona?.nacionalidad,
            telefono: formData.telefono,
          };
          setSession(res.data.data.token, userWithPersona);
        }

        setMode('success');
      } else {
        setError(res.data.message || 'Error al crear cuenta');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  const setQuickCreds = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Contenedor Glassmorphism */}
      <div className={`relative w-full overflow-hidden border rounded-3xl shadow-2xl backdrop-blur-2xl bg-slate-900/60 border-white/30 text-white transition-all ${mode === 'register' ? 'max-w-lg' : 'max-w-sm'
        }`}>

        {/* Botón cerrar */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* -------------------- VISTA 1: INICIAR SESIÓN -------------------- */}
        {mode === 'login' && (
          <div className="p-8 pt-10">
            {/* Avatar circular superior */}
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-white/20 border-2 border-white/40 shadow-inner">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-500/40">
                  <User className="w-12 h-12 text-white/90" />
                </div>
              </div>
            </div>

            {noticeMessage && (
              <div className="mb-4 p-2.5 rounded-lg bg-blue-500/30 border border-blue-500/40 text-xs text-blue-100 flex items-center gap-2">
                <span>{noticeMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/30 border border-red-500/40 text-xs text-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-3 pb-2 border-b border-white/40 focus-within:border-white transition-colors">
                  <Mail className="w-4 h-4 text-white/70" />
                  <input
                    type="text"
                    placeholder="Email ID o Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm placeholder:text-white/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3 pb-2 border-b border-white/40 focus-within:border-white transition-colors">
                  <Lock className="w-4 h-4 text-white/70" />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm placeholder:text-white/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2 text-xs font-semibold tracking-widest uppercase transition-all rounded-md shadow-md bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 cursor-pointer"
                >
                  {loading ? '...' : 'LOGIN'}
                </button>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert("Contacte al administrador (San Lucas Arroyo Edwin Guillermo) para soporte."); }}
                  className="text-xs italic text-white/70 hover:text-white hover:underline"
                >
                  {t.modal.forgotPassword}
                </a>
              </div>
            </form>

            {/* Cuentas del Equipo (QA Tester) */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-[10px] text-white/70 text-center uppercase tracking-wider mb-2">
                Cuentas del Equipo (1 Clic QA):
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuickCreds('admin', 'Admin2026*')}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-left transition-colors truncate cursor-pointer"
                  title="San Lucas Arroyo Edwin Guillermo (admin)"
                >
                  👑 <b>Admin</b> (Edwin)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCreds('intriagoofimi@gmail.com', 'in12345')}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-left transition-colors truncate cursor-pointer"
                  title="Intriago Salazar Josue Leonardo (oficial_migracion)"
                >
                  🛂 <b>Migración</b> (Josue)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCreds('corozoanalis@gmail.com', 'co12345')}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-left transition-colors truncate cursor-pointer"
                  title="Corozo Angulo Milena Jazmin (analista_pi)"
                >
                  🛡️ <b>Refugio PI</b> (Milena)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCreds('caisavisas@gmail.com', 'ca12345')}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-left transition-colors truncate cursor-pointer"
                  title="Caisa Preciado Franklin Andres (analista_visas)"
                >
                  📑 <b>Visas</b> (Franklin)
                </button>
              </div>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setQuickCreds('caicedoregu@gmail.com', 'les12345')}
                  className="w-full p-1.5 text-[11px] rounded bg-white/10 hover:bg-white/20 text-center transition-colors truncate cursor-pointer"
                  title="Caicedo Medina Lessly Jelena (analista_regularizacion)"
                >
                  📋 <b>Regularización & Censos</b> (Lessly)
                </button>
              </div>
            </div>

            {/* Pestaña inferior: Cambiar a CREAR USUARIO LIMPIO */}
            <div className="mt-6 -mx-8 -mb-8 p-3.5 text-center bg-white/10 border-t border-white/20 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-xs font-bold tracking-widest text-emerald-300 hover:text-emerald-200 uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
              >
                <span>CREAR CUENTA NUEVA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* -------------------- VISTA 2: CREAR USUARIO (SOLO DATOS PERSONALES) -------------------- */}
        {mode === 'register' && (
          <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto">

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/20">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Crear Cuenta de Usuario
                </h3>
                <p className="text-xs text-white/70">
                  Regístrese para gestionar sus trámites. Podrá iniciar solicitudes después de crear su cuenta.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/30 border border-red-500/40 text-xs text-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">

              {/* 1. Datos Personales Oficiales (Colección 'personas') */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <p className="font-semibold text-emerald-300 uppercase tracking-wider text-[10px]">
                  1. Datos de Identidad Oficial (Colección personas)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1">Tipo de Documento</label>
                    <select
                      value={formData.tipo_documento}
                      onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    >
                      <option value="pasaporte">Pasaporte</option>
                      <option value="cedula">Cédula</option>
                      <option value="documento_viaje">Documento de Viaje</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1">Número de Documento</label>
                    <input
                      type="text"
                      placeholder="Ej: 1436578961"
                      value={formData.numero_documento}
                      onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1">Nombres</label>
                    <input
                      type="text"
                      placeholder="Ej: Josimar Feliz"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1">Apellidos</label>
                    <input
                      type="text"
                      placeholder="Ej: Canabria Gomez"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1">Nacionalidad (ISO)</label>
                    <input
                      type="text"
                      placeholder="PER, VEN, COL..."
                      maxLength={3}
                      value={formData.nacionalidad}
                      onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value.toUpperCase() })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white uppercase focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1">Sexo</label>
                    <select
                      value={formData.sexo}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    >
                      <option value="M">Masculino (M)</option>
                      <option value="F">Femenino (F)</option>
                      <option value="X">No binario (X)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Contacto y Cuenta (Colección 'usuarios', 'correos', 'telefonos') */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <p className="font-semibold text-emerald-300 uppercase tracking-wider text-[10px]">
                  2. Credenciales y Contacto (Colección usuarios y telefonos)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 mb-1">Correo Electrónico (Usuario)</label>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 mb-1">Teléfono Móvil (Colección telefonos)</label>
                    <input
                      type="tel"
                      placeholder="Ej: 0987654321"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 mb-1">Contraseña (Mínimo 6 caracteres)</label>
                  <input
                    type="password"
                    placeholder="******"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full p-2 rounded-lg bg-slate-800/80 border border-white/20 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-4 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Volver a Iniciar Sesión
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 font-bold tracking-wide rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Creando cuenta...' : 'REGISTRAR MI CUENTA'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        )}

        {/* -------------------- VISTA 3: ÉXITO DE REGISTRO -------------------- */}
        {mode === 'success' && (
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white">
              ¡Cuenta Creada Exitosamente!
            </h3>

            <p className="text-xs text-white/80 leading-relaxed max-w-sm mx-auto">
              Sus datos oficiales han sido guardados en la base de datos MongoDB (colecciones <b>personas</b>, <b>usuarios</b>, <b>correos</b> y <b>telefonos</b>).
            </p>

            {createdProfile && (
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-left text-xs space-y-1.5 font-mono">
                <div><span className="text-white/60">Titular:</span> <b className="text-white">{createdProfile.persona?.nombres} {createdProfile.persona?.apellidos}</b></div>
                <div><span className="text-white/60">Documento:</span> <b className="text-blue-300">{createdProfile.persona?.numero_documento}</b></div>
                <div><span className="text-white/60">Usuario:</span> <b className="text-emerald-300">{createdProfile.user?.username}</b></div>
                <div><span className="text-white/60">Estado:</span> <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Activo</span></div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  if (onSuccess) onSuccess();
                }}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Comenzar a Usar la Plataforma
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
