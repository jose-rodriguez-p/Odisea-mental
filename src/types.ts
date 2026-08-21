export interface PerfilUsuario {
  id: string;
  correo: string;
  pseudonimo: string;
  rol: 'estudiante' | 'docente' | 'administrador';
  xp: number;
  nivel: number;
  racha: number;
  ultimo_entrenamiento?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SesionEntrenamiento {
  id: string;
  usuario_id: string;
  numero_sesion: number; // 1 a 24
  semana: number; // 1 a 8 (3 sesiones por semana)
  completada: boolean;
  fecha_completada?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricaMinijuego {
  id?: string;
  usuario_id: string;
  sesion_id?: string | null;
  juego_id: number; // 1 a 5
  juego_nombre: string;
  aciertos: number;
  errores_omision: number;
  errores_comision: number;
  precision: number; // 0.00 a 100.00
  tiempo_reaccion_promedio_ms: number;
  nivel_dificultad_alcanzado: number;
  velocidad_estimulo_ms?: number | null;
  densidad_distractores: number;
  xp_ganado: number;
  created_at?: string;
}

export interface EvaluacionDocente {
  id?: string;
  estudiante_id: string;
  docente_id: string;
  tipo_evaluacion: 'pre' | 'post';
  fecha_evaluacion?: string;
  atencion_sostenida_score: number;
  atencion_selectiva_score: number;
  control_inhibitorio_score: number;
  memoria_trabajo_score: number;
  atencion_dividida_score: number;
  tiempo_respuesta_general_ms: number;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}
