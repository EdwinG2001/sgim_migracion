export type ModuleType = 'pi' | 'visa' | 'mov' | 'censo';

export type DocStatus = 'verificado' | 'pendiente' | 'incompleto';

export interface RequirementTemplate {
  key: string;
  label: string;
  description: string;
  simulatedFileName: string;
  simulatedSize: string;
}

export interface DocumentCheckState {
  status: DocStatus;
  note?: string;
  updatedAt?: string;
}

export interface CitizenNotification {
  id: string;
  sentAt: string;
  sentBy: string;
  recipientName: string;
  recipientContact: string;
  channels: ('email' | 'sms' | 'portal')[];
  missingDocs: string[];
  message: string;
}

export interface SolicitudReviewMeta {
  docs: Record<string, DocumentCheckState>;
  notifications: CitizenNotification[];
}

export interface ModuleConfig {
  id: ModuleType;
  code: string;
  title: string;
  shortTitle: string;
  category: string;
  officer: string;
  roleKey: string;
  estimatedTime: string;
  accent: 'indigo' | 'emerald' | 'blue' | 'amber';
  requirements: RequirementTemplate[];
}

export const MODULE_CONFIGS: Record<ModuleType, ModuleConfig> = {
  pi: {
    id: 'pi',
    code: 'Módulo 1',
    title: 'Solicitud de Estatuto de Refugiado y Protección Internacional',
    shortTitle: 'Protección Internacional',
    category: 'PROTECCIÓN INTERNACIONAL',
    officer: 'Corozo Angulo Milena Jazmin (analista_pi)',
    roleKey: 'analista_pi',
    estimatedTime: 'En trámite prioritario',
    accent: 'indigo',
    requirements: [
      {
        key: 'declaracion_motivo',
        label: 'Declaración detallada del motivo de salida del país de origen',
        description: 'Relato formal firmado que sustenta persecución, conflicto armado o amenaza grave.',
        simulatedFileName: 'declaracion_juramentada_refugio.pdf',
        simulatedSize: '420 KB',
      },
      {
        key: 'nucleo_familiar',
        label: 'Composición del núcleo familiar acompañante',
        description: 'Registro de cónyuge, hijos o dependientes que solicitan protección conjunta.',
        simulatedFileName: 'formulario_nucleo_familiar.pdf',
        simulatedSize: '285 KB',
      },
      {
        key: 'datos_biometricos',
        label: 'Registro de datos filiatorios y captura biométrica',
        description: 'Validación de identidad filiatoria y plantilla dactilar en el sistema SGIM.',
        simulatedFileName: 'ficha_filiatoria_biometria.wsq',
        simulatedSize: '1.1 MB',
      },
    ],
  },
  mov: {
    id: 'mov',
    code: 'Módulo 2',
    title: 'Control Migratorio y Certificado de Movimientos Fronterizos',
    shortTitle: 'Control Fronterizo',
    category: 'CONTROL FRONTERIZO',
    officer: 'Intriago Salazar Josue Leonardo (oficial_migracion)',
    roleKey: 'oficial_migracion',
    estimatedTime: 'Inmediato (Verificación en línea)',
    accent: 'blue',
    requirements: [
      {
        key: 'documento_identidad',
        label: 'Documento de identidad vigente (Pasaporte o Cédula)',
        description: 'Pasaporte con vigencia mínima reglamentaria o cédula de ciudadanía reconocida.',
        simulatedFileName: 'pasaporte_o_cedula_vigente.pdf',
        simulatedSize: '610 KB',
      },
      {
        key: 'punto_control',
        label: 'Punto de control migratorio de ingreso o salida',
        description: 'Validación de sello electrónico en aeropuerto o paso fronterizo habilitado.',
        simulatedFileName: 'registro_punto_control.pdf',
        simulatedSize: '195 KB',
      },
      {
        key: 'motivo_viaje',
        label: 'Justificación o motivo de viaje',
        description: 'Respaldo del motivo declarado (turismo, negocios, tránsito o residencia).',
        simulatedFileName: 'justificacion_motivo_viaje.pdf',
        simulatedSize: '240 KB',
      },
    ],
  },
  visa: {
    id: 'visa',
    code: 'Módulo 3',
    title: 'Solicitud de Visa de Residencia Temporal o Permanente',
    shortTitle: 'Visas de Residencia',
    category: 'VISAS Y ESTADÍA',
    officer: 'Caisa Preciado Franklin Andres (analista_visas)',
    roleKey: 'analista_visas',
    estimatedTime: '5 a 15 días hábiles',
    accent: 'emerald',
    requirements: [
      {
        key: 'contrato_matricula',
        label: 'Contrato laboral registrado o matrícula educativa oficial',
        description: 'Documento emitido por el Ministerio de Trabajo o institución de educación superior.',
        simulatedFileName: 'contrato_laboral_o_matricula.pdf',
        simulatedSize: '845 KB',
      },
      {
        key: 'antecedentes_penales',
        label: 'Certificado de antecedentes penales apostillado',
        description: 'Certificado del país de origen o residencia de los últimos 5 años, apostillado y vigente.',
        simulatedFileName: 'antecedentes_penales_apostilla.pdf',
        simulatedSize: '512 KB',
      },
      {
        key: 'pasaporte_vigente',
        label: 'Pasaporte válido y vigente',
        description: 'Copia a color de la hoja biográfica y sellos de ingreso con vigencia mínima de 6 meses.',
        simulatedFileName: 'pasaporte_biografico_vigente.pdf',
        simulatedSize: '730 KB',
      },
    ],
  },
  censo: {
    id: 'censo',
    code: 'Módulo 4',
    title: 'Censo Migratorio Voluntario y Regularización Extraordinaria VIRTE',
    shortTitle: 'Regularización VIRTE',
    category: 'REGULARIZACIÓN',
    officer: 'Caicedo Medina Lessly Jelena (analista_regularizacion)',
    roleKey: 'analista_regularizacion',
    estimatedTime: 'Censos activos por convocatoria',
    accent: 'amber',
    requirements: [
      {
        key: 'registro_censo_abierto',
        label: 'Registro voluntario durante la vigencia del censo abierto',
        description: 'Comprobante de empadronamiento generado dentro del período oficial de convocatoria.',
        simulatedFileName: 'comprobante_censo_virte.pdf',
        simulatedSize: '310 KB',
      },
      {
        key: 'identidad_origen',
        label: 'Documento de identidad o partida de nacimiento del país de origen',
        description: 'Cédula, pasaporte o partida de nacimiento que acredite filiación y nacionalidad.',
        simulatedFileName: 'documento_identidad_origen.pdf',
        simulatedSize: '540 KB',
      },
      {
        key: 'registro_domiciliario',
        label: 'Registro domiciliario en territorio ecuatoriano',
        description: 'Planilla de servicio básico o declaración juramentada de domicilio actual en Ecuador.',
        simulatedFileName: 'registro_domicilio_ecuador.pdf',
        simulatedSize: '390 KB',
      },
    ],
  },
};

const STORAGE_KEY = 'sgim_solicitud_reviews_v1';

export function loadAllReviewMeta(): Record<string, SolicitudReviewMeta> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAllReviewMeta(data: Record<string, SolicitudReviewMeta>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

/**
 * Generates deterministic initial document verification states for a request
 * if the analyst has not customized them yet.
 */
export function getDefaultDocsForRecord(
  moduleType: ModuleType,
  recordId: string,
  estado?: string
): Record<string, DocumentCheckState> {
  const reqs = MODULE_CONFIGS[moduleType].requirements;
  const normalized = (estado || '').toLowerCase();
  const result: Record<string, DocumentCheckState> = {};

  // Deterministic hash from recordId so each request has a realistic, stable initial state
  let hash = 0;
  for (let i = 0; i < (recordId || '').length; i++) {
    hash = (hash * 31 + recordId.charCodeAt(i)) % 997;
  }

  reqs.forEach((req, idx) => {
    if (
      normalized === 'emitida' ||
      normalized === 'aprobado' ||
      normalized === 'aprobada' ||
      normalized === 'completado' ||
      normalized === 'activo'
    ) {
      result[req.key] = { status: 'verificado' };
    } else if (normalized === 'rechazado' || normalized === 'rechazada' || normalized === 'anulado') {
      result[req.key] = { status: idx === 1 ? 'incompleto' : 'verificado' };
    } else if (normalized === 'en_revision' || normalized === 'archivado') {
      // Realistic simulation: 1 verified, 1 incomplete/missing, 1 pending
      const states: DocStatus[] = ['verificado', 'incompleto', 'pendiente'];
      result[req.key] = { status: states[(idx + hash) % 3] };
    } else {
      // recibida / en_tramite / solicitada
      const pattern: DocStatus[] =
        hash % 3 === 0
          ? ['verificado', 'verificado', 'verificado']
          : hash % 3 === 1
          ? ['verificado', 'pendiente', 'verificado']
          : ['verificado', 'incompleto', 'pendiente'];
      result[req.key] = { status: pattern[idx % pattern.length] };
    }
  });

  return result;
}

export function getReviewSummary(
  moduleType: ModuleType,
  recordId: string,
  estado: string | undefined,
  store: Record<string, SolicitudReviewMeta>
) {
  const reqs = MODULE_CONFIGS[moduleType].requirements;
  const saved = store[recordId];
  const docs = saved?.docs || getDefaultDocsForRecord(moduleType, recordId, estado);
  const notifications = saved?.notifications || [];

  let verified = 0;
  let incomplete = 0;
  let pending = 0;

  for (const r of reqs) {
    const st = docs[r.key]?.status || 'pendiente';
    if (st === 'verificado') verified++;
    else if (st === 'incompleto') incomplete++;
    else pending++;
  }

  const total = reqs.length;
  const percent = total > 0 ? Math.round((verified / total) * 100) : 0;

  return {
    docs,
    notifications,
    verified,
    incomplete,
    pending,
    total,
    percent,
    allVerified: verified === total,
  };
}
