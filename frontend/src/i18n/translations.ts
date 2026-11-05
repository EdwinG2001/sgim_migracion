export type SupportedLanguage = 'es' | 'en' | 'ki';

export interface Translations {
  nav: {
    systemTitle: string;
    subTitle: string;
    searchPlaceholder: string;
    loginButton: string;
    windowTitle: string;
    subAgency: string;
    menuInicio: string;
    menuTramites: string;
    menuConsultar: string;
    menuRequisitos: string;
  };
  hero: {
    title: string;
    langEs: string;
    langEn: string;
    langKi: string;
    welcomeHeading: string;
    welcomeParagraph1: string;
    welcomeParagraph2: string;
    welcomeParagraph3: string;
    touristAlertTitle: string;
    touristAlertBody: string;
  };
  tramites: {
    sectionTitle: string;
    sectionSubtitle: string;
    filterAll: string;
    filterControl: string;
    filterVisas: string;
    filterProtection: string;
    filterRegularization: string;
    btnDetails: string;
    btnStart: string;
    items: {
      [key: string]: {
        title: string;
        category: string;
        description: string;
        requirements: string[];
        estimatedTime: string;
      };
    };
  };
  modal: {
    loginTitle: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    loginBtn: string;
    registerBtn: string;
    forgotPassword: string;
    quickTeamTitle: string;
    registerTitle: string;
    docType: string;
    docNumber: string;
    names: string;
    surnames: string;
    birthDate: string;
    nationality: string;
    gender: string;
    phone: string;
    tramiteSelect: string;
    submitTramite: string;
    backToLogin: string;
    successTitle: string;
    successMsg: string;
  };
}

export const translations: Record<SupportedLanguage, Translations> = {
  es: {
    nav: {
      systemTitle: 'Sistema de Gestión Integral Migratoria',
      subTitle: 'Ventanilla Digital de Servicios y Trámites Migratorios',
      searchPlaceholder: '¿Qué trámite busca?',
      loginButton: 'Iniciar Sesión',
      windowTitle: 'Ventanilla de atención',
      subAgency: 'Migración Ecuador',
      menuInicio: 'Inicio',
      menuTramites: 'Trámites y Servicios',
      menuConsultar: 'Consultar Trámite',
      menuRequisitos: 'Requisitos de Ingreso',
    },
    hero: {
      title: 'Servicios para personas migrantes y extranjeros',
      langEs: 'Ver esta página en español',
      langEn: 'See this page in English',
      langKi: 'Kay panka Kichwapi rikuriy',
      welcomeHeading: 'Bienvenido a Ecuador.',
      welcomeParagraph1: 'A continuación encontrará los servicios y procedimientos que necesitará utilizar para permanecer legalmente en el país, ya sea como solicitante de protección internacional o refugiado, extranjero residente (por trabajo, estudios, inversión o amparo familiar), turista en estadía regular, o a través de los procesos extraordinarios de regularización migratoria (VIRTE).',
      welcomeParagraph2: 'Es importante que se tome el tiempo para leer detenidamente la información y requisitos de los servicios enumerados aquí para garantizar un procesamiento ágil y seguro de su solicitud. Cada trámite genera un registro digital inmutable que le permitirá consultar su estado en cualquier momento.',
      welcomeParagraph3: 'Esperamos que, de forma temporal o permanente, su experiencia de vivir o transitar en el Ecuador sea un motivo de bienestar, desarrollo y tranquilidad para usted y su familia.',
      touristAlertTitle: '¿Es turista extranjero?',
      touristAlertBody: 'Recuerde que el período de permanencia reglamentaria inicial es de hasta 90 días. Puede solicitar una prórroga de hasta 90 días adicionales en esta misma ventanilla antes de la fecha de vencimiento.',
    },
    tramites: {
      sectionTitle: 'Trámites y servicios',
      sectionSubtitle: 'Servicios en línea para la gestión migratoria, visados, protección y permanencia legal.',
      filterAll: 'Todos',
      filterControl: 'Control',
      filterVisas: 'Visas',
      filterProtection: 'Protección',
      filterRegularization: 'Regularización',
      btnDetails: 'Detalles',
      btnStart: 'Iniciar trámite',
      items: {
        movimientos: {
          title: 'Emisión de certificado de movimientos migratorios',
          category: 'Control Fronterizo',
          description: 'Trámite orientado a emitir el certificado oficial de registro de ingresos y salidas del país, requerido por personas nacionales y extranjeras para fines consulares o legales.',
          requirements: ['Documento de identidad vigente (Pasaporte o Cédula)', 'Punto de control migratorio de ingreso o salida', 'Justificación o motivo de viaje'],
          estimatedTime: 'Inmediato (Verificación en línea)',
        },
        prorrogas: {
          title: 'Emisión y registro de prórrogas migratorias de permanencia',
          category: 'Visas y Estadía',
          description: 'La prórroga es una autorización de permanencia en el territorio ecuatoriano, que se otorga hasta por noventa (90) días adicionales a turistas extranjeros que ingresaron regularmente.',
          requirements: ['Registro de movimiento de ingreso regular', 'Solicitud antes del vencimiento de los primeros 90 días', 'Pasaporte válido con vigencia mínima de 6 meses'],
          estimatedTime: '1 a 3 días hábiles',
        },
        refugio: {
          title: 'Solicitud de estatuto de refugiado y protección internacional',
          category: 'Protección Internacional',
          description: 'Procedimiento formal para solicitar refugio en el Ecuador para personas que han huido de su país de origen por persecución, conflicto armado o graves amenazas a sus derechos.',
          requirements: ['Declaración detallada del motivo de salida del país de origen', 'Composición del núcleo familiar acompañante', 'Registro de datos filiatorios y captura biométrica'],
          estimatedTime: 'En trámite prioritario',
        },
        visas_residencia: {
          title: 'Solicitud de visa de residencia temporal o permanente',
          category: 'Visas y Estadía',
          description: 'Recepción y trámite de visados ordinarios para extranjeros que planean residir en el Ecuador bajo categorías de trabajo en relación de dependencia, estudios, inversión o amparo familiar.',
          requirements: ['Contrato laboral registrado o matrícula educativa oficial', 'Certificado de antecedentes penales apostillado', 'Pasaporte válido y vigente'],
          estimatedTime: '5 a 15 días hábiles',
        },
        censo_virte: {
          title: 'Censo migratorio voluntario y regularización extraordinaria VIRTE',
          category: 'Regularización',
          description: 'Proceso de registro extraordinario para extranjeros no regularizados que permite obtener el Certificado de Registro Migratorio y la posterior emisión de la visa humanitaria VIRTE.',
          requirements: ['Registro voluntario durante la vigencia del censo abierto', 'Documento de identidad o partida de nacimiento del país de origen', 'Registro domiciliario en territorio ecuatoriano'],
          estimatedTime: 'Censos activos por convocatoria',
        },
        consulta_expediente: {
          title: 'Consulta de estado de trámite migratorio en línea',
          category: 'Consultas',
          description: 'Consulte en tiempo real el avance de su trámite de visa, solicitud de refugio, certificado de censo o registro de prórroga utilizando su número de documento.',
          requirements: ['Número de documento de viaje o pasaporte', 'Número de trámite o expediente asignado'],
          estimatedTime: 'Consulta en tiempo real',
        },
      },
    },
    modal: {
      loginTitle: 'Acceso Institucional y Usuarios',
      emailPlaceholder: 'Email ID o Usuario',
      passwordPlaceholder: 'Password',
      loginBtn: 'LOGIN',
      registerBtn: 'REGISTRAR TRÁMITE / CREAR CUENTA',
      forgotPassword: '¿Olvidó su contraseña?',
      quickTeamTitle: 'Cuentas del Equipo (Pruebas de QA / Roles):',
      registerTitle: 'Registro de Persona y Solicitud de Trámite',
      docType: 'Tipo de Documento',
      docNumber: 'Número de Documento',
      names: 'Nombres',
      surnames: 'Apellidos',
      birthDate: 'Fecha de Nacimiento',
      nationality: 'Nacionalidad (Código ISO: VEN, COL, etc.)',
      gender: 'Sexo',
      phone: 'Teléfono de Contacto',
      tramiteSelect: 'Seleccione el Trámite a Iniciar',
      submitTramite: 'ENVIAR SOLICITUD A REVISIÓN',
      backToLogin: 'Volver a Iniciar Sesión',
      successTitle: '¡Solicitud Registrada Exitosamente!',
      successMsg: 'Su trámite ha sido guardado en MongoDB y asignado al equipo operativo para su revisión.',
    },
  },

  en: {
    nav: {
      systemTitle: 'Comprehensive Migration Management System',
      subTitle: 'Digital Desk for Migration Services and Procedures',
      searchPlaceholder: 'Search procedure...',
      loginButton: 'Sign In',
      windowTitle: 'Service Desk',
      subAgency: 'Ecuador Migration',
      menuInicio: 'Home',
      menuTramites: 'Procedures & Services',
      menuConsultar: 'Check Status',
      menuRequisitos: 'Entry Requirements',
    },
    hero: {
      title: 'Services for Immigrants and Foreign Nationals',
      langEs: 'Ver esta página en español',
      langEn: 'See this page in English',
      langKi: 'Kay panka Kichwapi rikuriy',
      welcomeHeading: 'Welcome to Ecuador.',
      welcomeParagraph1: 'Below you will find the services and official procedures required to reside or stay legally in Ecuador, whether as an applicant for international protection (refugee/asylum), foreign resident (work, study, investment, family ties), regular tourist, or through extraordinary regularisation processes (VIRTE).',
      welcomeParagraph2: 'Please take the time to read the requirements carefully to ensure fast and secure processing of your request. Each procedure generates an immutable digital record so you can monitor your progress at any time.',
      welcomeParagraph3: 'We hope that, whether temporary or permanent, your experience living in or visiting Ecuador is a source of well-being, progress, and peace for you and your family.',
      touristAlertTitle: 'Are you a foreign tourist?',
      touristAlertBody: 'Remember that standard tourist stay is up to 90 days. You may apply for an extension of up to 90 additional days before your current authorized date expires.',
    },
    tramites: {
      sectionTitle: 'Procedures and Services',
      sectionSubtitle: 'Online services for migration management, visas, international protection, and lawful stay.',
      filterAll: 'All',
      filterControl: 'Control',
      filterVisas: 'Visas',
      filterProtection: 'Protection',
      filterRegularization: 'Regularisation',
      btnDetails: 'Details',
      btnStart: 'Start procedure',
      items: {
        movimientos: {
          title: 'Certificate of Migration Movements',
          category: 'Border Control',
          description: 'Official certificate recording entry and exit from Ecuador through authorized border posts and international airports for consular or legal purposes.',
          requirements: ['Valid identity document (Passport or ID card)', 'Border checkpoint of entry or exit', 'Travel purpose or justification'],
          estimatedTime: 'Immediate (Online verification)',
        },
        prorrogas: {
          title: 'Issuance and Registration of Tourist Extensions',
          category: 'Visas & Stay',
          description: 'Official extension granted for up to ninety (90) additional days to foreign tourists who entered Ecuador legally through authorized checkpoints.',
          requirements: ['Record of lawful entry into Ecuador', 'Application prior to the expiration of first 90 days', 'Valid passport with at least 6 months validity'],
          estimatedTime: '1 to 3 business days',
        },
        refugio: {
          title: 'Application for Refugee Status & Protection',
          category: 'International Protection',
          description: 'Formal procedure to request refugee status in Ecuador for individuals who fled their country due to persecution, armed conflict, or human rights crises.',
          requirements: ['Detailed statement of reasons for leaving country of origin', 'Family members accompanying applicant', 'Identity registration and biometric capture'],
          estimatedTime: 'Priority processing',
        },
        visas_residencia: {
          title: 'Application for Temporary or Permanent Visas',
          category: 'Visas & Stay',
          description: 'Receipt and processing of ordinary resident visas for foreigners intending to reside in Ecuador under employment, study, investment, or family ties.',
          requirements: ['Registered employment contract or official school enrollment', 'Apostilled police clearance certificate', 'Valid passport'],
          estimatedTime: '5 to 15 business days',
        },
        censo_virte: {
          title: 'Voluntary Migration Census & VIRTE Visa',
          category: 'Regularisation',
          description: 'Extraordinary registration process for undocumented foreign nationals to obtain a Migration Certificate and humanitarian VIRTE visa.',
          requirements: ['Voluntary registration during active census period', 'Identity document or birth certificate from country of origin', 'Residential address in Ecuador'],
          estimatedTime: 'Active census announcements',
        },
        consulta_expediente: {
          title: 'Online Application Status Inquiry',
          category: 'Inquiries',
          description: 'Track the status of your visa, refugee application, census certificate, or extension in real-time using your identity document number.',
          requirements: ['Travel document or passport number', 'Application or case tracking number'],
          estimatedTime: 'Real-time inquiry',
        },
      },
    },
    modal: {
      loginTitle: 'Institutional & User Access',
      emailPlaceholder: 'Email ID or Username',
      passwordPlaceholder: 'Password',
      loginBtn: 'LOGIN',
      registerBtn: 'APPLY FOR PROCEDURE / CREATE ACCOUNT',
      forgotPassword: 'Forgot Password?',
      quickTeamTitle: 'Team QA Tester Accounts (Roles):',
      registerTitle: 'Foreigner Registration & Application',
      docType: 'Document Type',
      docNumber: 'Document Number',
      names: 'First Names',
      surnames: 'Last Names',
      birthDate: 'Date of Birth',
      nationality: 'Nationality (ISO Code: VEN, COL, etc.)',
      gender: 'Gender',
      phone: 'Phone Number',
      tramiteSelect: 'Select Migration Procedure',
      submitTramite: 'SUBMIT APPLICATION FOR REVIEW',
      backToLogin: 'Back to Sign In',
      successTitle: 'Application Successfully Registered!',
      successMsg: 'Your case has been recorded in MongoDB and assigned to the relevant migration officer for review.',
    },
  },

  ki: {
    nav: {
      systemTitle: 'Ecuador Mamallaktapi Yallina Llankay Wasi',
      subTitle: 'Antanikik Antawa Ruranakuna',
      searchPlaceholder: 'Ima ruranata mashkanki?',
      loginButton: 'Yaykuna',
      windowTitle: 'Rikuk Wasi',
      subAgency: 'Ecuador Mitikuk',
      menuInicio: 'Kallariy',
      menuTramites: 'Ruranakuna',
      menuConsultar: 'Rikuna',
      menuRequisitos: 'Yaykuna Kamachiykuna',
    },
    hero: {
      title: 'Shuktak Mamallaktamanta Runakunapak Yanapaykuna',
      langEs: 'Ver esta página en español',
      langEn: 'See this page in English',
      langKi: 'Kay panka Kichwapi rikuriy',
      welcomeHeading: 'Alli shamushka kanki Ecuador mamallaktaman.',
      welcomeParagraph1: 'Kaypimi tarinki tukuy kamachiykuna Ecuadorpi alli kawsankapak, shuktak mamallaktamanta mitikushka runakuna, llankak shamushkakuna, yachakukkuna, turista runakunapash.',
      welcomeParagraph2: 'Alli killkashpa rikurinki tukuy kamachiykunata shuktakpi rurankapak. Tukuy rurashkakunami antanikipi waqaychin.',
      welcomeParagraph3: 'Ecuador mamallaktapi kawsayka kankunapak ayllupak sumak kawsay kachun munanchi.',
      touristAlertTitle: 'Turista kankichu?',
      touristAlertBody: 'Yuyariy 90 punchallami kanki. Shuktak 90 punchata mañayta ushanki kay llikapillata manarak puchukarikpi.',
    },
    tramites: {
      sectionTitle: 'Ruranakuna Yanapaykunapash',
      sectionSubtitle: 'Antanikiwan ruraykuna Ecuador mamallaktapi alli kawsankapak.',
      filterAll: 'Tukuy',
      filterControl: 'Rikuk',
      filterVisas: 'Visakuna',
      filterProtection: 'Waqaychiy',
      filterRegularization: 'Kamachiy',
      btnDetails: 'Aswan rikuna',
      btnStart: 'Kallariy rurayta',
      items: {
        movimientos: {
          title: 'Yaykushka llukshishka killka panka',
          category: 'Chaka Rikuy',
          description: 'Ecuador mamallaktaman yaykushka llukshishka pankata llukshina.',
          requirements: ['Kawsay panka (Pasaporte)', 'Chaka yaykuna', 'Imapak shamushka'],
          estimatedTime: 'Kunanllatak',
        },
        prorrogas: {
          title: 'Turista punchakunata mirachiy (90 punchakuna)',
          category: 'Visakuna',
          description: 'Turistakuna ashtawan 90 punchata Ecuadorpi kawsankapak mañay.',
          requirements: ['Alli yaykushka panka', '90 punchakuna manarak puchukarikpi', 'Alli Pasaporte'],
          estimatedTime: '1 - 3 punchakuna',
        },
        refugio: {
          title: 'Mitikushka runapak waqaychiy mañay (Refugio)',
          category: 'Waqaychiy',
          description: 'Paypa mamallaktamanta llukshimushkakunata Ecuadorpi waqaychinkapak mañay.',
          requirements: ['Imashpa llukshimushka killka', 'Ayllukuna shutikuna', 'Rikurishka panka'],
          estimatedTime: 'Uchalla rurana',
        },
        visas_residencia: {
          title: 'Llankana, yachana Visa mañay',
          category: 'Visakuna',
          description: 'Ecuador mamallaktapi unay kawsankapak visa panka.',
          requirements: ['Llankay killka', 'Alli runa kashka panka', 'Pasaporte'],
          estimatedTime: '5 - 15 punchakuna',
        },
        censo_virte: {
          title: 'VIRTE kamachiy censo panka',
          category: 'Kamachiy',
          description: 'Pankata mana charik runakuna shutita killkankapak.',
          requirements: ['Kikin kawsay panka', 'Maypi kawsak killka'],
          estimatedTime: 'Wasi llankaypi',
        },
        consulta_expediente: {
          title: 'Ima shina ruray katikun rikuna',
          category: 'Rikuy',
          description: 'Kikinpa panka yupaywan rikuy ima shina ñawpashkata.',
          requirements: ['Pasaporte yupay', 'Mañay yupay'],
          estimatedTime: 'Kunanllatak',
        },
      },
    },
    modal: {
      loginTitle: 'Llankakkunapak Yaykuna',
      emailPlaceholder: 'Chaski correo',
      passwordPlaceholder: 'Pakalla shimi',
      loginBtn: 'YAYKUNA',
      registerBtn: 'RUNA SHUTITA KILLKANA / MAÑANA',
      forgotPassword: 'Pakalla shimita kunkarinkichu?',
      quickTeamTitle: 'Llankak runakunapak yaykuna (QA):',
      registerTitle: 'Runa Killkay & Mañay Ruray',
      docType: 'Panka Laya',
      docNumber: 'Panka Yupay',
      names: 'Shutikuna',
      surnames: 'Ayllu Shutikuna',
      birthDate: 'Wacharishka Puncha',
      nationality: 'Mamallakta',
      gender: 'Kari / Warmi',
      phone: 'Wayanaku Yupay',
      tramiteSelect: 'Ima ruranatatak munanki',
      submitTramite: 'KACHANA RIKUK WASIMAN',
      backToLogin: 'Tigrana Yaykunaman',
      successTitle: 'Alli Killkarishkami!',
      successMsg: 'Kikinpa mañayka MongoDBpi waqaychishkami kan.',
    },
  },
};

