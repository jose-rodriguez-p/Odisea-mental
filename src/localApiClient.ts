import { PerfilUsuario, SesionEntrenamiento, MetricaMinijuego, EvaluacionDocente } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'om_current_user_id';

class LocalApiDB {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setToken(userId: string) {
    localStorage.setItem(TOKEN_KEY, userId);
  }

  private clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Error de conexión con el servidor local.');
    }

    return data as T;
  }

  async signUp(
    email: string,
    password: string,
    rol: 'estudiante' | 'docente',
    name?: string
  ): Promise<{ data: any; error: any }> {
    try {
      const result = await this.request<{ data: any; error: null }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, rol, name }),
      });
      return { data: result.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const result = await this.request<{ data: { user: any; profile: PerfilUsuario; token: string }; error: null }>(
        '/auth/signin',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      this.setToken(result.data.token);
      return { data: { user: result.data.user, profile: result.data.profile }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async signOut() {
    this.clearToken();
    return { error: null };
  }

  async getCurrentUser(): Promise<PerfilUsuario | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      return await this.request<PerfilUsuario>('/auth/me');
    } catch {
      this.clearToken();
      return null;
    }
  }

  async getProfile(userId: string): Promise<PerfilUsuario | null> {
    try {
      return await this.request<PerfilUsuario>(`/profiles/${userId}`);
    } catch {
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<PerfilUsuario>): Promise<PerfilUsuario> {
    return this.request<PerfilUsuario>(`/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getSessions(userId: string): Promise<SesionEntrenamiento[]> {
    return this.request<SesionEntrenamiento[]>(`/sessions/${userId}`);
  }

  async completeSession(_userId: string, numeroSesion: number): Promise<void> {
    await this.request('/sessions/complete', {
      method: 'PATCH',
      body: JSON.stringify({ numeroSesion }),
    });
  }

  async saveMetric(metric: MetricaMinijuego): Promise<void> {
    await this.request('/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  }

  async getMetrics(userId: string): Promise<MetricaMinijuego[]> {
    return this.request<MetricaMinijuego[]>(`/metrics/${userId}`);
  }

  async getEvaluations(studentId: string): Promise<EvaluacionDocente[]> {
    return this.request<EvaluacionDocente[]>(`/evaluations/${studentId}`);
  }

  async saveEvaluation(evaluation: EvaluacionDocente): Promise<void> {
    await this.request('/evaluations', {
      method: 'POST',
      body: JSON.stringify(evaluation),
    });
  }

  async getAllStudents(): Promise<PerfilUsuario[]> {
    return this.request<PerfilUsuario[]>('/students');
  }

  async getAllMetrics(): Promise<MetricaMinijuego[]> {
    return this.request<MetricaMinijuego[]>('/metrics');
  }

  async getAllEvaluations(): Promise<EvaluacionDocente[]> {
    return this.request<EvaluacionDocente[]>('/evaluations');
  }
}

export const localApiDB = new LocalApiDB();
export const isLocalApiEnabled = Boolean(API_URL);
