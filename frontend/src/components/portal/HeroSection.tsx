import React from 'react';
import { Globe, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const HeroSection: React.FC = () => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div id="inicio" className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Título Principal Limpio (Sin el breadcrumb solicitado para eliminar) */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          {t.hero.title}
        </h1>

        {/* Selector de Idiomas 100% Funcional (Español, English, Kichwa) */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-6 pb-4 border-b border-slate-100">
          <button 
            type="button"
            onClick={() => setLang('es')}
            className={`flex items-center gap-1.5 transition-all cursor-pointer ${
              lang === 'es' ? 'text-blue-600 font-bold underline scale-105' : 'hover:text-slate-900 opacity-70 hover:opacity-100'
            }`}
          >
            <span>🇪🇨</span>
            <span>{t.hero.langEs}</span>
          </button>
          
          <span className="text-slate-300">|</span>
          
          <button 
            type="button"
            onClick={() => setLang('en')}
            className={`flex items-center gap-1.5 transition-all cursor-pointer ${
              lang === 'en' ? 'text-blue-600 font-bold underline scale-105' : 'hover:text-slate-900 opacity-70 hover:opacity-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.hero.langEn}</span>
          </button>
          
          <span className="text-slate-300">|</span>
          
          <button 
            type="button"
            onClick={() => setLang('ki')}
            className={`flex items-center gap-1.5 transition-all cursor-pointer ${
              lang === 'ki' ? 'text-blue-600 font-bold underline scale-105' : 'hover:text-slate-900 opacity-70 hover:opacity-100'
            }`}
          >
            <span>🌿</span>
            <span>{t.hero.langKi}</span>
          </button>
        </div>

        {/* Texto de Bienvenida e Información Dinámico por Idioma */}
        <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed max-w-4xl">
          <p className="font-semibold text-slate-900 text-lg">
            {t.hero.welcomeHeading}
          </p>
          
          <p>{t.hero.welcomeParagraph1}</p>

          <p className="text-slate-600">{t.hero.welcomeParagraph2}</p>

          <p className="italic text-slate-500 text-sm">{t.hero.welcomeParagraph3}</p>
        </div>

        {/* Alerta de Orientación Rápida sobre los 90 días */}
        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3 text-xs sm:text-sm text-blue-900">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{t.hero.touristAlertTitle} </span>
            <span>{t.hero.touristAlertBody}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
