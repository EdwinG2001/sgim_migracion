import React from 'react';
import { X, CheckCircle, Clock, Shield, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TramiteDetailModalProps {
  tramite: any | null;
  onClose: () => void;
  onStart: () => void;
}

export const TramiteDetailModal: React.FC<TramiteDetailModalProps> = ({ tramite, onClose, onStart }) => {
  const { t } = useLanguage();
  if (!tramite) return null;

  const IconComponent = tramite.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Encabezado */}
        <div className="p-6 pb-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {tramite.category}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {tramite.title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5 text-xs text-slate-600">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-1.5">Descripción del Servicio</h4>
            <p className="leading-relaxed">{tramite.description}</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Requisitos Principales</h4>
            <ul className="space-y-2">
              {tramite.requisitos.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-700">Tiempo estimado:</span>
            </div>
            <span className="font-bold text-slate-900">{tramite.tiempoEstimado}</span>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span><b>Gestor Backend:</b> {tramite.moduloGo}</span>
          </div>
        </div>

        {/* Pie */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => { onClose(); onStart(); }}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tramite.rawType === 'consulta' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <span>{tramite.rawType === 'consulta' ? 'Consultar Estado' : t.tramites.btnStart}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
