import React, { useState } from 'react';
import { 
  FileText, 
  Flag, 
  ShieldCheck, 
  Award, 
  Users, 
  Search, 
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Tramite {
  id: string;
  icon: any;
  title: string;
  category: string;
  description: string;
  requisitos: string[];
  tiempoEstimado: string;
  moduloGo: string;
  rawType: string;
}

interface TramitesGridProps {
  onSelectTramite: (tramite: Tramite) => void;
  onStartTramite: (tipoTramite: string, title?: string) => void;
  onOpenConsulta?: () => void;
}

export const TramitesGrid: React.FC<TramitesGridProps> = ({ onSelectTramite, onStartTramite, onOpenConsulta }) => {
  const { t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const iconsMap: Record<string, any> = {
    movimientos: FileText,
    prorrogas: Flag,
    refugio: ShieldCheck,
    visas_residencia: Award,
    censo_virte: Users,
    consulta_expediente: Search,
  };

  const modulosGoMap: Record<string, string> = {
    movimientos: 'Módulo 2: Control Migratorio (Intriago Salazar Josue Leonardo)',
    prorrogas: 'Módulo 3: Visas y Prórrogas (Caisa Preciado Franklin Andres)',
    refugio: 'Módulo 1: Protección Internacional (Corozo Angulo Milena Jazmin)',
    visas_residencia: 'Módulo 3: Emisión de Visas (Caisa Preciado Franklin Andres)',
    censo_virte: 'Módulo 4: Regularización y Censos (Caicedo Medina Lessly Jelena)',
    consulta_expediente: 'Capa Transversal: Búsqueda Indexada en MongoDB',
  };

  const rawTypeMap: Record<string, string> = {
    movimientos: 'movimiento',
    prorrogas: 'prorroga',
    refugio: 'refugio',
    visas_residencia: 'visa',
    censo_virte: 'censo',
    consulta_expediente: 'consulta',
  };

  const tramiteKeys = ['movimientos', 'prorrogas', 'refugio', 'visas_residencia', 'censo_virte', 'consulta_expediente'];

  const tramitesList: Tramite[] = tramiteKeys.map((key) => {
    const itemData = t.tramites.items[key] || {
      title: key,
      category: 'General',
      description: '',
      requirements: [],
      estimatedTime: '',
    };

    return {
      id: key,
      icon: iconsMap[key] || FileText,
      title: itemData.title,
      category: itemData.category,
      description: itemData.description,
      requisitos: itemData.requirements,
      tiempoEstimado: itemData.estimatedTime,
      moduloGo: modulosGoMap[key],
      rawType: rawTypeMap[key] || 'movimiento',
    };
  });

  const filtered = selectedFilter === 'all' 
    ? tramitesList 
    : tramitesList.filter(t => t.category.toLowerCase().includes(selectedFilter.toLowerCase()));

  return (
    <section id="tramites" className="py-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado de la Sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.tramites.sectionTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t.tramites.sectionSubtitle}
            </p>
          </div>

          {/* Filtros */}
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2 text-xs">
            {[
              { id: 'all', label: t.tramites.filterAll },
              { id: 'control', label: t.tramites.filterControl },
              { id: 'visa', label: t.tramites.filterVisas },
              { id: 'protec', label: t.tramites.filterProtection },
              { id: 'regula', label: t.tramites.filterRegularization },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuadrícula de Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.id}
                className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all hover:border-blue-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Botones Detalles e Iniciar Trámite Funcionales */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectTramite(item)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{t.tramites.btnDetails}</span>
                    <span className="text-slate-400">ℹ️</span>
                  </button>

                  {item.rawType === 'consulta' ? (
                    <button
                      type="button"
                      onClick={() => onOpenConsulta ? onOpenConsulta() : onStartTramite(item.rawType)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Consultar Trámite</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartTramite(item.rawType, item.title)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{t.tramites.btnStart}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
