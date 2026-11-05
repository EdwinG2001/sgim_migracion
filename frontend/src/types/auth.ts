export type UserRole = 
  | 'admin'
  | 'oficial_migracion'
  | 'analista_pi'
  | 'analista_visas'
  | 'analista_regularizacion'
  | 'solo_lectura';

export interface UserProfile {
  id: string;
  username: string;
  rol: UserRole;
  persona_id?: string;
  nombres?: string;
  apellidos?: string;
  numero_documento?: string;
  nacionalidad?: string;
  tipo_documento?: string;
  telefono?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: UserProfile;
  };
}

