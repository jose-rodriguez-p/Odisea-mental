import { createClient } from '@supabase/supabase-js';
import { PerfilUsuario, SesionEntrenamiento, MetricaMinijuego, EvaluacionDocente } from './types';
import { localApiDB, isLocalApiEnabled } from './localApiClient';

// Leer variables de entorno (si existen)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inicializar cliente real solo si las credenciales están configuradas
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ============================================================================
// BASE DE DATOS MOCK (LOCAL STORAGE FALLBACK)
// ============================================================================
class LocalDB {
  private initLocalStorage() {
    if (!localStorage.getItem('om_users')) localStorage.setItem('om_users', JSON.stringify([]));
    if (!localStorage.getItem('om_profiles')) {
      // Registrar un docente por defecto para pruebas rápidas
      const mockDocente: PerfilUsuario = {
        id: 'docente-default-uuid',
        correo: 'docente@odiseamental.com',
        pseudonimo: 'Prof. Tito Cusy',
        rol: 'docente',
        xp: 0,
        nivel: 1,
        racha: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('om_profiles', JSON.stringify([mockDocente]));
      localStorage.setItem('om_users', JSON.stringify([{
        id: 'docente-default-uuid',
        email: 'docente@odiseamental.com',
        password: 'password123',
        rol: 'docente'
      }]));
    }
    if (!localStorage.getItem('om_sessions')) localStorage.setItem('om_sessions', JSON.stringify([]));
    if (!localStorage.getItem('om_metrics')) localStorage.setItem('om_metrics', JSON.stringify([]));
    if (!localStorage.getItem('om_evaluaciones')) localStorage.setItem('om_evaluaciones', JSON.stringify([]));
  }

  constructor() {
    this.initLocalStorage();
  }

  // Helper para leer del localStorage
  private get<T>(key: string): T[] {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  // Helper para guardar en el localStorage
  private set<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async signUp(email: string, password: string, rol: 'estudiante' | 'docente', name?: string): Promise<{ data: any; error: any }> {
    const users = this.get<any>('om_users');
    if (users.find(u => u.email === email)) {
      return { data: null, error: { message: 'El correo electrónico ya está registrado.' } };
    }

    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
    const newUser = { id: userId, email, password, rol };
    users.push(newUser);
    this.set('om_users', users);

    // Crear perfil
    const profiles = this.get<PerfilUsuario>('om_profiles');
    let pseudonimo = '';
    if (rol === 'estudiante') {
      const studentCount = profiles.filter(p => p.rol === 'estudiante').length + 1;
      pseudonimo = `EST-2026-${String(studentCount).padStart(4, '0')}`;
    } else {
      pseudonimo = name || `Prof. ${email.split('@')[0]}`;
    }

    const newProfile: PerfilUsuario = {
      id: userId,
      correo: email,
      pseudonimo,
      rol,
      xp: 0,
      nivel: 1,
      racha: 0,
      ultimo_entrenamiento: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    this.set('om_profiles', profiles);

    // Si es estudiante, inicializar las 24 sesiones
    if (rol === 'estudiante') {
      const sessions = this.get<SesionEntrenamiento>('om_sessions');
      for (let s = 1; s <= 24; s++) {
        const semana = Math.ceil(s / 3); // 3 sesiones por semana
        sessions.push({
          id: `session-${userId}-${s}`,
          usuario_id: userId,
          numero_sesion: s,
          semana: semana,
          completada: false,
          fecha_completada: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      this.set('om_sessions', sessions);
    }

    return { data: { user: newUser, profile: newProfile }, error: null };
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    const users = this.get<any>('om_users');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return { data: null, error: { message: 'Credenciales incorrectas o usuario no encontrado.' } };
    }
    const profiles = this.get<PerfilUsuario>('om_profiles');
    const profile = profiles.find(p => p.id === user.id);
    localStorage.setItem('om_current_user_id', user.id);
    return { data: { user, profile }, error: null };
  }

  async signOut() {
    localStorage.removeItem('om_current_user_id');
    return { error: null };
  }

  async getCurrentUser(): Promise<PerfilUsuario | null> {
    const userId = localStorage.getItem('om_current_user_id');
    if (!userId) return null;
    const profiles = this.get<PerfilUsuario>('om_profiles');
    return profiles.find(p => p.id === userId) || null;
  }

  async getProfile(userId: string): Promise<PerfilUsuario | null> {
    const profiles = this.get<PerfilUsuario>('om_profiles');
    return profiles.find(p => p.id === userId) || null;
  }

  async updateProfile(userId: string, updates: Partial<PerfilUsuario>): Promise<PerfilUsuario> {
    const profiles = this.get<PerfilUsuario>('om_profiles');
    const index = profiles.findIndex(p => p.id === userId);
    if (index === -1) throw new Error('Perfil no encontrado');

    const updatedProfile = {
      ...profiles[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    profiles[index] = updatedProfile;
    this.set('om_profiles', profiles);
    return updatedProfile;
  }

  async getSessions(userId: string): Promise<SesionEntrenamiento[]> {
    const sessions = this.get<SesionEntrenamiento>('om_sessions');
    return sessions.filter(s => s.usuario_id === userId).sort((a, b) => a.numero_sesion - b.numero_sesion);
  }

  async completeSession(userId: string, numeroSesion: number): Promise<void> {
    const sessions = this.get<SesionEntrenamiento>('om_sessions');
    const session = sessions.find(s => s.usuario_id === userId && s.numero_sesion === numeroSesion);
    if (session && !session.completada) {
      session.completada = true;
      session.fecha_completada = new Date().toISOString();
      session.updated_at = new Date().toISOString();
      this.set('om_sessions', sessions);
    }
  }

  async saveMetric(metric: MetricaMinijuego): Promise<void> {
    const metrics = this.get<MetricaMinijuego>('om_metrics');
    const newMetric = {
      ...metric,
      id: 'metric-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    metrics.push(newMetric);
    this.set('om_metrics', metrics);

    // Actualizar racha y XP en el perfil
    const profile = await this.getProfile(metric.usuario_id);
    if (profile) {
      const updates: Partial<PerfilUsuario> = {
        xp: profile.xp + metric.xp_ganado,
        nivel: metric.nivel_dificultad_alcanzado // El nivel se actualiza según la dificultad alcanzada en el juego
      };

      // Calcular racha
      const hoy = new Date().toISOString().split('T')[0];
      if (profile.ultimo_entrenamiento) {
        const ultDia = profile.ultimo_entrenamiento.split('T')[0];
        if (ultDia !== hoy) {
          const diffMs = new Date(hoy).getTime() - new Date(ultDia).getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays <= 1) {
            updates.racha = profile.racha + 1;
          } else {
            updates.racha = 1; // Racha rota, iniciar en 1
          }
        }
      } else {
        updates.racha = 1; // Primera sesión
      }
      updates.ultimo_entrenamiento = new Date().toISOString();
      await this.updateProfile(metric.usuario_id, updates);
    }
  }

  async getMetrics(userId: string): Promise<MetricaMinijuego[]> {
    const metrics = this.get<MetricaMinijuego>('om_metrics');
    return metrics.filter(m => m.usuario_id === userId).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }

  async getEvaluations(studentId: string): Promise<EvaluacionDocente[]> {
    const evals = this.get<EvaluacionDocente>('om_evaluaciones');
    return evals.filter(e => e.estudiante_id === studentId);
  }

  async saveEvaluation(evaluation: EvaluacionDocente): Promise<void> {
    const evals = this.get<EvaluacionDocente>('om_evaluaciones');
    // Verificar si ya existe este tipo de evaluación para el estudiante (Pre o Post)
    const index = evals.findIndex(e => e.estudiante_id === evaluation.estudiante_id && e.tipo_evaluacion === evaluation.tipo_evaluacion);
    
    const newEval = {
      ...evaluation,
      id: index !== -1 ? evals[index].id : 'eval-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (index !== -1) {
      evals[index] = newEval;
    } else {
      evals.push(newEval);
    }
    this.set('om_evaluaciones', evals);
  }

  async getAllProfiles(): Promise<PerfilUsuario[]> {
    return this.get<PerfilUsuario>('om_profiles');
  }

  async getAllMetrics(): Promise<MetricaMinijuego[]> {
    return this.get<MetricaMinijuego>('om_metrics');
  }

  async getAllEvaluations(): Promise<EvaluacionDocente[]> {
    return this.get<EvaluacionDocente>('om_evaluaciones');
  }
}

const localDBInstance = new LocalDB();

const local = isLocalApiEnabled ? localApiDB : localDBInstance;

// ============================================================================
// API INTEGRADA DE DATOS (INTERFAZ PÚBLICA)
// Prioridad: Supabase → API local (PostgreSQL) → localStorage
// ============================================================================
export const db = {
  // Autenticación
  signUp: async (email: string, password: string, rol: 'estudiante' | 'docente', name?: string) => {
    if (supabase) {
      // Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { rol, name }
        }
      });
      if (authError) return { data: null, error: authError };
      // Esperar a que el trigger de postgres inserte el perfil
      // Hacemos una consulta rápida del perfil creado
      let profile = null;
      if (authData.user) {
        // En supabse real, esperamos un momento a que el trigger actúe
        const { data: profData } = await supabase
          .from('perfiles_usuarios')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        profile = profData;
      }
      return { data: { user: authData.user, profile }, error: null };
    } else {
      return local.signUp(email, password, rol, name);
    }
  },

  signIn: async (email: string, password: string) => {
    if (supabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) return { data: null, error: authError };
      const { data: profile } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      return { data: { user: authData.user, profile }, error: null };
    } else {
      return local.signIn(email, password);
    }
  },

  signOut: async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      return { error };
    } else {
      return local.signOut();
    }
  },

  getCurrentUser: async (): Promise<PerfilUsuario | null> => {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      return profile;
    } else {
      return local.getCurrentUser();
    }
  },

  getProfile: async (userId: string): Promise<PerfilUsuario | null> => {
    if (supabase) {
      const { data } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    } else {
      return local.getProfile(userId);
    }
  },

  updateProfile: async (userId: string, updates: Partial<PerfilUsuario>): Promise<PerfilUsuario> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return local.updateProfile(userId, updates);
    }
  },

  // Sesiones
  getSessions: async (userId: string): Promise<SesionEntrenamiento[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('sesiones_entrenamiento')
        .select('*')
        .eq('usuario_id', userId)
        .order('numero_sesion', { ascending: true });
      return data || [];
    } else {
      return local.getSessions(userId);
    }
  },

  completeSession: async (userId: string, numeroSesion: number, sessionId?: string): Promise<void> => {
    if (supabase) {
      if (sessionId) {
        await supabase
          .from('sesiones_entrenamiento')
          .update({ completada: true, fecha_completada: new Date().toISOString() })
          .eq('id', sessionId);
      } else {
        await supabase
          .from('sesiones_entrenamiento')
          .update({ completada: true, fecha_completada: new Date().toISOString() })
          .eq('usuario_id', userId)
          .eq('numero_sesion', numeroSesion);
      }
    } else {
      await local.completeSession(userId, numeroSesion);
    }
  },

  // Métricas
  saveMetric: async (metric: MetricaMinijuego): Promise<void> => {
    if (supabase) {
      const { error } = await supabase
        .from('metricas_minijuegos')
        .insert([metric]);
      if (error) throw error;

      // Actualizar perfil de usuario en base de datos real (Supabase resolverá los triggers,
      // pero por si acaso actualizamos el XP y nivel del usuario).
      const currentProfile = await db.getProfile(metric.usuario_id);
      if (currentProfile) {
        const updates: any = {
          xp: currentProfile.xp + metric.xp_ganado,
          nivel: metric.nivel_dificultad_alcanzado,
          ultimo_entrenamiento: new Date().toISOString()
        };
        // Lógica de racha
        const hoy = new Date().toISOString().split('T')[0];
        if (currentProfile.ultimo_entrenamiento) {
          const ultDia = currentProfile.ultimo_entrenamiento.split('T')[0];
          if (ultDia !== hoy) {
            const diffMs = new Date(hoy).getTime() - new Date(ultDia).getTime();
            if (diffMs / (1000 * 60 * 60 * 24) <= 1) {
              updates.racha = currentProfile.racha + 1;
            } else {
              updates.racha = 1;
            }
          }
        } else {
          updates.racha = 1;
        }
        await db.updateProfile(metric.usuario_id, updates);
      }
    } else {
      await local.saveMetric(metric);
    }
  },

  getMetrics: async (userId: string): Promise<MetricaMinijuego[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('metricas_minijuegos')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });
      return data || [];
    } else {
      return local.getMetrics(userId);
    }
  },

  // Evaluaciones del Docente
  getEvaluations: async (studentId: string): Promise<EvaluacionDocente[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('evaluaciones_docente')
        .select('*')
        .eq('estudiante_id', studentId);
      return data || [];
    } else {
      return local.getEvaluations(studentId);
    }
  },

  saveEvaluation: async (evaluation: EvaluacionDocente): Promise<void> => {
    if (supabase) {
      const { error } = await supabase
        .from('evaluaciones_docente')
        .upsert(evaluation, { onConflict: 'estudiante_id,tipo_evaluacion' });
      if (error) throw error;
    } else {
      await local.saveEvaluation(evaluation);
    }
  },

  // Métricas globales para Docentes
  getAllStudents: async (): Promise<PerfilUsuario[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('rol', 'estudiante');
      return data || [];
    } else if (isLocalApiEnabled) {
      return localApiDB.getAllStudents();
    } else {
      const all = await localDBInstance.getAllProfiles();
      return all.filter(p => p.rol === 'estudiante');
    }
  },

  getAllMetricsForDocente: async (): Promise<MetricaMinijuego[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('metricas_minijuegos')
        .select('*');
      return data || [];
    } else {
      return local.getAllMetrics();
    }
  },

  getAllEvaluationsForDocente: async (): Promise<EvaluacionDocente[]> => {
    if (supabase) {
      const { data } = await supabase
        .from('evaluaciones_docente')
        .select('*');
      return data || [];
    } else {
      return local.getAllEvaluations();
    }
  }
};
