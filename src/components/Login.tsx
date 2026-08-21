import React, { useState } from 'react';
import { db } from '../supabaseClient';
import { Gamepad2, Mail, Lock, User, UserCheck, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (profile: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'estudiante' | 'docente'>('estudiante');
  const [nombreDocente, setNombreDocente] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegister) {
        // Validación del nombre del docente
        if (rol === 'docente' && !nombreDocente.trim()) {
          throw new Error('Por favor, ingresa tu nombre completo.');
        }

        const { data, error: signUpError } = await db.signUp(
          email,
          password,
          rol,
          rol === 'docente' ? nombreDocente : undefined
        );

        if (signUpError) throw signUpError;

        setSuccess(
          rol === 'estudiante'
            ? `¡Registro exitoso! Tu seudónimo asignado es: ${data.profile.pseudonimo}. Ya puedes iniciar sesión.`
            : '¡Registro de docente exitoso! Ya puedes iniciar sesión.'
        );
        setIsRegister(false);
        setPassword('');
      } else {
        const { data, error: signInError } = await db.signIn(email, password);
        if (signInError) throw signInError;
        
        onLoginSuccess(data.profile);
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado. Revisa tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center space-grid px-4 py-12 relative overflow-hidden select-none">
      {/* Elementos SVG espaciales decorativos */}
      <div className="absolute top-10 left-10 w-32 h-32 text-brand-violet/20 animate-float">
        <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
          <circle cx="50" cy="50" r="30" />
          <ellipse cx="50" cy="50" rx="45" ry="10" transform="rotate(-15 50 50)" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute bottom-10 right-10 w-48 h-48 text-brand-cyan/10 animate-float" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
          <path d="M10,90 Q50,10 90,90" />
          <circle cx="50" cy="45" r="8" fill="currentColor" />
          <polygon points="45,45 50,30 55,45" fill="currentColor" />
        </svg>
      </div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative border border-brand-violet/30 transition-all duration-300 hover:border-brand-cyan/50">
        
        {/* Cabecera / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-violet/20 border border-brand-violet/50 flex items-center justify-center glow-violet mb-3 animate-pulse-slow">
            <Gamepad2 className="w-9 h-9 text-brand-cyan" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider glow-text-cyan">ODISEA MENTAL</h1>
          <p className="text-sm text-gray-400 mt-1">Plataforma Cognitiva Gamificada (TDAH)</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Selector de Rol */}
          <div className="grid grid-cols-2 gap-2 bg-bg-space/80 p-1 rounded-xl border border-brand-violet/20">
            <button
              type="button"
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                rol === 'estudiante'
                  ? 'bg-brand-violet text-white glow-violet'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setRol('estudiante')}
            >
              Estudiante
            </button>
            <button
              type="button"
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                rol === 'docente'
                  ? 'bg-brand-violet text-white glow-violet'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setRol('docente')}
            >
              Docente
            </button>
          </div>

          {/* Alertas */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-brand-red/10 border border-brand-red/40 rounded-xl text-brand-red text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-brand-green/10 border border-brand-green/40 rounded-xl text-brand-green text-sm">
              <UserCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Nombre Docente (Solo Registro Docente) */}
          {isRegister && rol === 'docente' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-cyan tracking-wider uppercase">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Prof. Nombre Apellido"
                  value={nombreDocente}
                  onChange={(e) => setNombreDocente(e.target.value)}
                  className="w-full bg-bg-space/90 border border-brand-violet/20 hover:border-brand-cyan/50 focus:border-brand-cyan focus:outline-none rounded-xl py-3 pl-11 pr-4 text-white text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-cyan tracking-wider uppercase">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-space/90 border border-brand-violet/20 hover:border-brand-cyan/50 focus:border-brand-cyan focus:outline-none rounded-xl py-3 pl-11 pr-4 text-white text-sm transition-all"
              />
            </div>
            {rol === 'estudiante' && isRegister && (
              <p className="text-[11px] text-gray-400 italic">
                * Tu correo no será público. Se te asignará un seudónimo aleatorio.
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-cyan tracking-wider uppercase">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-space/90 border border-brand-violet/20 hover:border-brand-cyan/50 focus:border-brand-cyan focus:outline-none rounded-xl py-3 pl-11 pr-4 text-white text-sm transition-all"
              />
            </div>
          </div>

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-violet to-purple-600 hover:from-brand-cyan hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center glow-violet hover:glow-cyan focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest mt-2"
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrar' : 'Entrar'}
          </button>
        </form>

        {/* Enlace alternar login/registro */}
        <div className="text-center mt-6">
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-brand-cyan transition-colors"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccess(null);
            }}
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Iniciar Sesión'
              : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
};
