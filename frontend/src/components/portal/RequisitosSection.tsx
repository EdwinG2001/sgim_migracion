import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  Shield, 
  ArrowRight, 
  Info,
  DollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RequisitoItem {
  id: string;
  numero: string;
  rawType: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  encargado: string;
  tiempoEstimado: string;
  costo: string;
  requisitosObligatorios: string[];
  documentosRequeridos: string[];
  observacionesImportantes: string;
}

interface RequisitosSectionProps {
  onStartTramite: (rawType: string, title: string) => void;
}

export const RequisitosSection: React.FC<RequisitosSectionProps> = ({ onStartTramite }) => {
  const [expandedId, setExpandedId] = useState<string | null>('tramite-2');

  const tramitesRequisitos: RequisitoItem[] = [
    {
      id: 'tramite-1',
      numero: '01',
      rawType: 'movimiento',
      titulo: 'Certificado de Movimientos Migratorios',
      categoria: 'Control Fronterizo',
      descripcion: 'Documento oficial emitido por la Subsecretaría de Migración que certifica el historial cronológico de todas las entradas y salidas internacionales registradas en los aeropuertos y pasos fronterizos del Ecuador.',
      encargado: 'Intriago Salazar Josue Leonardo (Oficial de Migración)',
      tiempoEstimado: '24 horas hábiles (Inmediato digital)',
      costo: 'Gratuito para consulta ciudadana en línea',
      requisitosObligatorios: [
        'Cédula de identidad original y vigente (para ciudadanos ecuatorianos).',
        'Pasaporte válido y vigente con el que realizó los movimientos (para extranjeros).',
        'No registrar prohibiciones de salida del país emitidas por autoridades judiciales competentes.',
        'Cuenta de usuario activa en la ventanilla digital SGIM.'
      ],
      documentosRequeridos: [
        'Documento de viaje digitalizado (PDF o JPG claro).',
        'Formulario de solicitud con indicación del período a certificar.'
      ],
      observacionesImportantes: 'El certificado cuenta con código de verificación QR seguro y firma electrónica válida ante cualquier consulado o embajada.'
    },
    {
      id: 'tramite-2',
      numero: '02',
      rawType: 'prorroga',
      titulo: 'Prórroga de Estadía Turística (hasta 90 días)',
      categoria: 'Permanencia y Turismo',
      descripcion: 'Extensión legal del plazo de estancia para personas extranjeras que ingresaron al Ecuador en calidad de turistas y desean prolongar su permanencia por hasta 90 días calendario adicionales, antes del vencimiento de su estadía inicial.',
      encargado: 'Intriago Salazar Josue Leonardo (Oficial de Migración)',
      tiempoEstimado: '24 a 48 horas hábiles',
      costo: 'Tasa consular reglamentaria (un tercio del Salario Básico Unificado) o exento según convenios bilaterales',
      requisitosObligatorios: [
        'Pasaporte original con vigencia mínima de seis (6) meses posteriores a la fecha prevista de finalización de la prórroga.',
        'Registro de ingreso regular y legal al Ecuador dentro del plazo ordinario de los 90 días no vencidos.',
        'Demostración de medios lícitos de subsistencia económica durante el tiempo de estadía adicional.',
        'Declaración de dirección domiciliaria actual en Ecuador (provincia, cantón y calle).',
        'Comprobante de seguro de salud con cobertura internacional vigente.'
      ],
      documentosRequeridos: [
        'Copia legible de la página biográfica del pasaporte.',
        'Copia del sello o comprobante digital de entrada al territorio nacional.',
        'Planilla de servicio básico o comprobante del lugar de alojamiento en el país.'
      ],
      observacionesImportantes: 'La solicitud debe presentarse de manera obligatoria antes de que expire la visa o condición de turista inicial para evitar sanciones de permanencia irregular.'
    },
    {
      id: 'tramite-3',
      numero: '03',
      rawType: 'refugio',
      titulo: 'Solicitud de Estatuto de Refugiado y Protección Internacional',
      categoria: 'Derechos Humanos y Refugio',
      descripcion: 'Procedimiento administrativo de protección garantizado por el Estado ecuatoriano para personas que han tenido que huir de su país de nacionalidad debido a temores fundados de persecución, amenazas graves a su vida o integridad, conflicto armado o violación masiva de derechos humanos.',
      encargado: 'Corozo Angulo Milena Jazmin (Analista de Protección Internacional)',
      tiempoEstimado: '3 a 5 días para emisión de salvoconducto temporal; evaluación técnica posterior',
      costo: '100% Gratuito en todas sus etapas (Principio de No Devolución)',
      requisitosObligatorios: [
        'Manifestación expresa y fundada de solicitud de refugio en territorio ecuatoriano.',
        'Relato cronológico y verídico de los hechos y motivos que obligaron la salida del país de origen.',
        'Indicación de la fecha de ingreso al Ecuador y punto fronterizo por el cual ingresó.',
        'Documento de identidad o, en su defecto, declaración juramentada de identidad.',
        'Dirección domiciliaria física de contacto y residencia actual en el Ecuador.',
        'Registro de miembros del núcleo familiar que le acompañan en territorio nacional.'
      ],
      documentosRequeridos: [
        'Documento nacional de identidad, pasaporte o partida de nacimiento (si los posee).',
        'Pruebas documentales, denuncias o constancias de amenazas en país de origen (opcional pero recomendado).'
      ],
      observacionesImportantes: 'El trámite goza de absoluta confidencialidad y estricto amparo del principio de non-refoulement (prohibición de expulsión o devolución al país de peligro).'
    },
    {
      id: 'tramite-4',
      numero: '04',
      rawType: 'visa',
      titulo: 'Visas de Residencia Temporal y Permanente',
      categoria: 'Visas y Régimen Consular',
      descripcion: 'Autorización administrativa otorgada a personas extranjeras para residir de manera temporal (hasta 2 años) o permanente en el Ecuador, con base en actividades laborales, profesionales, inversión, estudios o amparo de vínculo con ciudadano ecuatoriano.',
      encargado: 'Caisa Preciado Franklin Andres (Analista de Visas)',
      tiempoEstimado: '10 a 15 días laborables',
      costo: 'Arancel consular de solicitud ($50 USD) + concesión según categoría de visa',
      requisitosObligatorios: [
        'Pasaporte válido con vigencia mínima de seis meses.',
        'Certificado de antecedentes penales del país de origen o del país en el que haya residido durante los últimos cinco años, apostillado o legalizado.',
        'Acreditación de medios lícitos de vida (contrato de trabajo legalizado, título profesional registrado o póliza de inversión).',
        'En caso de amparo familiar: certificado de matrimonio o partida de nacimiento debidamente legalizada o apostillada.',
        'Póliza de seguro de salud con cobertura en el Ecuador por el tiempo de vigencia de la visa.'
      ],
      documentosRequeridos: [
        'Formulario de solicitud de visa debidamente completado.',
        'Fotografía reciente en fondo blanco tamaño carné (digitalizada).',
        'Contrato laboral registrado en el Ministerio del Trabajo o matrícula educativa según el caso.'
      ],
      observacionesImportantes: 'Una vez aprobada la visa temporal por 2 años, el titular adquiere el derecho a postular por la residencia permanente en el país.'
    },
    {
      id: 'tramite-5',
      numero: '05',
      rawType: 'censo',
      titulo: 'Registro y Empadronamiento de Censo Migratorio (VIRTE)',
      categoria: 'Regularización Extraordinaria',
      descripcion: 'Proceso humanitario de registro biométrico y empadronamiento censal para ciudadanos extranjeros que se encuentran en el Ecuador y cumplen las condiciones de los Decretos Ejecutivos de amnistía y regularización migratoria.',
      encargado: 'Caicedo Medina Lessly Jelena (Analista de Regularización)',
      tiempoEstimado: '5 a 10 días laborables para emisión del Certificado Censal oficial',
      costo: 'Gratuito en fase de registro y censo digital',
      requisitosObligatorios: [
        'Haber ingresado a territorio ecuatoriano por punto de control oficial o registrar estadía previa a las fechas de corte del decreto de amnistía.',
        'Documento de identidad nacional o pasaporte emitido por su país de origen (incluso vencido de acuerdo a la reglamentación especial vigente).',
        'Declaración juramentada y verídica de residencia y ocupación actual en el Ecuador.',
        'Registro de núcleo familiar (hijos menores o cónyuge) para regularización conjunta.',
        'Asistencia a la cita de enrolamiento biométrico para toma fotográfica y dactilar.'
      ],
      documentosRequeridos: [
        'Cédula de identidad de origen o pasaporte (original o copia clara).',
        'Planilla de servicio residencial o contrato de arrendamiento en Ecuador.'
      ],
      observacionesImportantes: 'El certificado de registro en el censo es el requisito habilitante indispensable para postular al visado de regularización VIRTE.'
    },
    {
      id: 'tramite-6',
      numero: '06',
      rawType: 'movimiento',
      titulo: 'Registro de Control Fronterizo (Entradas y Salidas)',
      categoria: 'Control de Frontera y Flujo Internacional',
      descripcion: 'Procedimiento de verificación dactilar, documental y legal realizado en los filtros y cabinas de migración de los aeropuertos internacionales (Quito UIO, Guayaquil GYE) y pasos de frontera terrestres (Rumichaca, Huaquillas).',
      encargado: 'Intriago Salazar Josue Leonardo (Oficial de Migración)',
      tiempoEstimado: 'Registro inmediato en ventanilla de migración',
      costo: 'Trámite gratuito',
      requisitosObligatorios: [
        'Documento de viaje idóneo: pasaporte vigente o cédula de identidad para ciudadanos de países miembros de la Comunidad Andina y Mercosur.',
        'Declaración de motivo de viaje y dirección de destino final.',
        'Boleto aéreo o terrestre de salida o retorno (para visitantes en calidad turística).',
        'En caso de menores de edad que viajen no acompañados por ambos progenitores: autorización de salida del país notariada o emitida por juzgado de familia.',
        'No registrar alertas migratorias, impedimentos legales ni requerimientos de captura activa.'
      ],
      documentosRequeridos: [
        'Tarjeta Andina de Migración (TAM digital o física según el punto de control).',
        'Visa correspondiente en caso de que su nacionalidad requiera visado consular previo para ingresar al Ecuador.'
      ],
      observacionesImportantes: 'El oficial de migración sellará el documento y determinará el número de días de permanencia autorizada (habitualmente hasta 90 días).'
    }
  ];

  return (
    <section id="requisitos" className="py-16 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera de la Sección */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Guía Oficial de Requisitos Migratorios</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Requisitos de Ingreso y Trámites del Ecuador
          </h2>
          
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Consulte en detalle de qué trata cada uno de los <b>6 trámites oficiales</b> del Sistema de Gestión Integral Migratoria (SGIM), los requisitos obligatorios que debe cumplir, plazos de respuesta y los funcionarios encargados de su revisión.
          </p>
        </div>

        {/* Listado de los 6 trámites en diseño de tarjetas ricas */}
        <div className="space-y-6">
          {tramitesRequisitos.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div 
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 ${
                  isExpanded 
                    ? 'border-blue-300 bg-slate-50/70 shadow-md ring-1 ring-blue-500/10' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Encabezado colapsable */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-mono font-bold text-sm shrink-0 shadow-sm">
                      {item.numero}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.categoria}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ID: {item.rawType}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                        {item.titulo}
                      </h3>

                      <p className="text-sm text-slate-600 mt-1 line-clamp-2 md:line-clamp-none">
                        {item.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTramite(item.rawType, item.titulo);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Iniciar Trámite</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      aria-label="Ver detalles"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Contenido expandible con detalles completos */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-200/80 animate-fadeIn">
                    
                    {/* Barra de Datos Clave (Encargado, Tiempos, Costo) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs mb-6">
                      <div className="flex items-start gap-2.5">
                        <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-slate-700">Funcionario Encargado:</span>
                          <span className="text-slate-900 font-medium">{item.encargado}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-slate-700">Tiempo de Respuesta:</span>
                          <span className="text-slate-900 font-medium">{item.tiempoEstimado}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <DollarSign className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-slate-700">Costo o Tasa:</span>
                          <span className="text-slate-900 font-medium">{item.costo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requisitos y Documentos en 2 Columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Requisitos Obligatorios */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Requisitos Obligatorios</span>
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-700">
                          {item.requisitosObligatorios.map((req, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                              <span className="leading-relaxed">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Documentación a Presentar */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Documentos Requeridos</span>
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-700">
                          {item.documentosRequeridos.map((doc, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                              <span className="leading-relaxed">{doc}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Observación Importante */}
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">Nota Importante:</span>
                            <span className="leading-relaxed">{item.observacionesImportantes}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Botón inferior para iniciar */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onStartTramite(item.rawType, item.titulo)}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span>Comenzar Solicitud de {item.titulo}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
