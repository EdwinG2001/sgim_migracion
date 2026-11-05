import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, Lock, CheckCircle2, AlertCircle, Save, 
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'security';
  onGoToDashboard?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'profile',
  onGoToDashboard,
}) => {
  const { user, updatePhone, changePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(defaultTab);

  // Estado para actualización de teléfono
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Estado para cambio de clave
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.telefono) {
      setNuevoTelefono(user.telefono);
    }
  }, [user]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneMessage(null);
    setPhoneLoading(true);

    try {
      await updatePhone(nuevoTelefono);
      setPhoneMessage('¡Teléfono actualizado exitosamente en MongoDB!');
    } catch (err: any) {
      setPhoneError(err.response?.data?.error || err.message || 'Error al actualizar teléfono');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage('¡Contraseña actualizada exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || err.message || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const isOperator = user.rol !== 'solo_lectura';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-white">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Mi Cuenta y Perfil Migratorio
              </h2>
              <p className="text-xs text-slate-400">
                {user.username} • <span className="text-blue-400 font-semibold">{user.rol === 'solo_lectura' ? 'Ciudadano' : user.rol}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Datos Personales y Teléfono</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Seguridad y Contraseña</span>
          </button>
        </div>

        {/* Contenido según Pestaña */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">

          {/* 1. PESTAÑA: DATOS PERSONALES Y TELÉFONO */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Tarjeta de Identidad Oficial */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Identidad Oficial (Colección personas)
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    Activo en MongoDB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Titular Completo:</span>
                    <p className="font-semibold text-white text-sm">
                      {user.nombres ? `${user.nombres} ${user.apellidos || ''}` : 'Usuario SGIM'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Número de Documento:</span>
                    <p className="font-semibold text-blue-300 font-mono text-sm">
                      {user.numero_documento || 'No asignado'} ({user.tipo_documento || 'ID'})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Nacionalidad (ISO):</span>
                    <p className="font-semibold text-white">
                      {user.nacionalidad || 'ECU'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Correo Electrónico:</span>
                    <p className="font-semibold text-slate-200 font-mono">
                      {user.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario de Actualización de Teléfono */}
              <form onSubmit={handleUpdatePhone} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Contacto Telefónico (Colección telefonos)</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Mantenga su número actualizado para recibir notificaciones sobre el estado de sus trámites migratorios.
                </p>

                {phoneMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{phoneMessage}</span>
                  </div>
                )}

                {phoneError && (
                  <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{phoneError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Ej: +593987654321 o 0991234567"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value)}
                      required
                      className="w-full pl-3 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={phoneLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{phoneLoading ? 'Guardando...' : 'Actualizar'}</span>
                  </button>
                </div>
              </form>

              {/* Botón para funcionarios / operadores */}
              {isOperator && onGoToDashboard && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onGoToDashboard();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ir al Panel de Control Operativo ({user.rol})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. PESTAÑA: SEGURIDAD Y CONTRASEÑA */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cambiar Contraseña
                </span>
                <p className="text-xs text-slate-400">
                  Por seguridad, ingrese su contraseña actual antes de registrar una nueva.
                </p>
              </div>

              {passwordMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordMessage}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Contraseña Actual:</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nueva Contraseña (mínimo 6 caracteres):</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Confirmar Nueva Contraseña:</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {passwordLoading ? 'Actualizando contraseña...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Pie del modal con botón Cerrar Sesión */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="text-red-400 hover:text-red-300 font-semibold hover:underline cursor-pointer"
          >
            Cerrar Sesión
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

