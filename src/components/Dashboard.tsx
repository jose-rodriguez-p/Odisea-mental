import React, { useEffect, useRef, useState } from 'react';
import { PerfilUsuario, SesionEntrenamiento } from '../types';
import { db } from '../supabaseClient';
import { LogOut, Trophy, Flame, Target, Star, Play, CheckCircle, Lock, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  profile: PerfilUsuario;
  onLogout: () => void;
  onSelectGame: (gameId: number, sessionNum?: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onLogout, onSelectGame }) => {
  const [userProfile, setUserProfile] = useState<PerfilUsuario>(profile);
  const [sessions, setSessions] = useState<SesionEntrenamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionsScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const prof = await db.getProfile(profile.id);
        if (prof) setUserProfile(prof);

        const sess = await db.getSessions(profile.id);
        setSessions(sess);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [profile.id]);

  // Encontrar la siguiente sesión pendiente
  const currentPendingSession = sessions.find(s => !s.completada);

  const scrollSessions = (direction: 'left' | 'right') => {
    sessionsScrollerRef.current?.scrollBy({
      left: direction === 'right' ? 420 : -420,
      behavior: 'smooth'
    });
  };

  // Renderizar Avatar Espacial SVG basado en el nivel
  const renderAvatarSVG = (level: number) => {
    if (level < 3) {
      // Nivel 1-2: Cohete Inicial (Cadete)
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full text-brand-cyan">
          <path d="M50,15 L65,45 L50,40 L35,45 Z" fill="currentColor" />
          <rect x="44" y="45" width="12" height="25" rx="3" fill="#6C5CE7" />
          <path d="M35,60 L20,75 L35,70 Z" fill="currentColor" opacity="0.8" />
          <path d="M65,60 L80,75 L65,70 Z" fill="currentColor" opacity="0.8" />
          <circle cx="50" cy="30" r="4" fill="#101827" />
          <path d="M46,75 L50,85 L54,75 Z" fill="#FF5C5C" className="animate-pulse" />
        </svg>
      );
    } else if (level < 6) {
      // Nivel 3-5: Nave de Exploración (Explorador)
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full text-brand-violet">
          <path d="M50,10 C50,10 68,45 68,65 C68,75 58,80 50,80 C42,80 32,75 32,65 C32,45 50,10 50,10 Z" fill="currentColor" />
          <circle cx="50" cy="45" r="10" fill="#00D4FF" />
          <circle cx="50" cy="45" r="5" fill="#101827" />
          <path d="M25,50 Q10,70 15,80 Q25,80 30,70" fill="#00D4FF" opacity="0.8" />
          <path d="M75,50 Q90,70 85,80 Q75,80 70,70" fill="#00D4FF" opacity="0.8" />
          <rect x="47" y="80" width="6" height="12" fill="#FF5C5C" className="animate-pulse" />
        </svg>
      );
    } else {
      // Nivel 6+: Estación Espacial o Nave Crucero (Comandante Galáctico)
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full text-brand-yellow">
          <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="animate-orbit" strokeDasharray="10 5" />
          <circle cx="50" cy="50" r="18" fill="#6C5CE7" />
          <rect x="20" y="46" width="60" height="8" rx="4" fill="currentColor" />
          <rect x="46" y="20" width="8" height="60" rx="4" fill="currentColor" />
          <circle cx="50" cy="50" r="10" fill="#00D4FF" />
          <circle cx="50" cy="50" r="4" fill="#101827" />
        </svg>
      );
    }
  };

  const getRangoUsuario = (level: number) => {
    if (level < 3) return 'Cadete Espacial';
    if (level < 6) return 'Explorador Estelar';
    return 'Comandante de la Galaxia';
  };

  // Minijuegos Cognitivos
  const minijuegos = [
    {
      id: 1,
      nombre: 'Misión Detección (CPT)',
      area: 'Atención Sostenida & Vigilancia',
      desc: 'Mantén la mirada fija en el espacio. Presiona ESPACIO o toca la pantalla rápidamente solo cuando aparezca la estrella cian.',
      color: 'border-brand-cyan/30 text-brand-cyan hover:border-brand-cyan/60'
    },
    {
      id: 2,
      nombre: 'Escáner Visual (Test d2)',
      area: 'Atención Selectiva',
      desc: 'Escanea rápidamente una cuadrícula de cartas "p" y "d". Elige únicamente las letras "d" que tengan exactamente 2 rayitas.',
      color: 'border-brand-violet/30 text-brand-violet hover:border-brand-violet/60'
    },
    {
      id: 3,
      nombre: 'Freno de Impulso (Go / No-Go)',
      area: 'Control Inhibitorio',
      desc: 'Navega tu vehículo interestelar. Avanza ante luz verde, pero frena y mantén la posición por completo si ves luz roja.',
      color: 'border-brand-red/30 text-brand-red hover:border-brand-red/60'
    },
    {
      id: 4,
      nombre: 'Secuencia Estelar (Corsi Blocks)',
      area: 'Memoria de Trabajo',
      desc: 'Presta atención a los orbes espaciales que se iluminan secuencialmente y reproduce el patrón exacto de memoria.',
      color: 'border-brand-yellow/30 text-brand-yellow hover:border-brand-yellow/60'
    },
    {
      id: 5,
      nombre: 'Doble Desafío (Dual-Task)',
      area: 'Atención Dividida (Semana 6-8)',
      desc: 'Mantén estable la nave a la izquierda usando tu puntero mientras a la derecha clasificas números dictados como pares.',
      color: 'border-brand-green/30 text-brand-green hover:border-brand-green/60'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center space-grid text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mx-auto"></div>
          <p className="mt-4 text-sm tracking-wider text-gray-400">Cargando bitácora de vuelo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-grid text-white p-4 md:p-8">
      {/* Barra de Navegación Superior */}
      <header className="max-w-6xl mx-auto flex justify-between items-center bg-bg-space/85 backdrop-blur-md p-4 rounded-2xl border border-brand-violet/30 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/20 flex items-center justify-center border border-brand-violet/40">
            <Gamepad2 className="w-6 h-6 text-brand-cyan" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wider text-white">Odisea Mental</h2>
            <p className="text-xs text-brand-cyan font-bold">{userProfile.pseudonimo} (Estudiante)</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-brand-red border border-transparent hover:border-brand-red/30 bg-bg-space/50 hover:bg-brand-red/10 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        
        {/* Fila de Estado del Perfil (Stats) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta del Avatar */}
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-brand-violet/20 hover:border-brand-violet/40 transition-all">
            <div className="w-20 h-20 rounded-2xl bg-bg-space/80 border border-brand-violet/30 p-2 flex-shrink-0 relative overflow-hidden">
              {renderAvatarSVG(userProfile.nivel)}
              <div className="absolute bottom-0 right-0 bg-brand-cyan text-bg-space text-[10px] font-black px-1.5 py-0.5 rounded-tl-lg">
                NIVEL {userProfile.nivel}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{getRangoUsuario(userProfile.nivel)}</p>
              <h3 className="text-lg font-bold text-white mt-0.5">{userProfile.pseudonimo}</h3>
              <p className="text-xs text-gray-400 mt-1">Registrado el {new Date(userProfile.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Tarjeta de XP y Nivel */}
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-brand-violet/20">
            <div className="w-14 h-14 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow border border-brand-yellow/30 flex-shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Experiencia Total</span>
                  <p className="text-2xl font-black text-brand-yellow mt-0.5">{userProfile.xp} XP</p>
                </div>
                <span className="text-xs text-gray-400">Sig. Nivel en {(userProfile.nivel * 500) - userProfile.xp} XP</span>
              </div>
              {/* Barra de Progreso XP */}
              <div className="w-full bg-bg-space/80 h-2 rounded-full mt-3 overflow-hidden border border-brand-violet/20">
                <div
                  className="bg-gradient-to-r from-brand-violet to-brand-cyan h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (userProfile.xp / (userProfile.nivel * 500)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tarjeta de Racha */}
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-5 border border-brand-violet/20">
            <div className="w-14 h-14 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/30 flex-shrink-0">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Racha Activa</span>
              <p className="text-2xl font-black text-brand-red mt-0.5">{userProfile.racha} Días</p>
              <p className="text-xs text-gray-400 mt-1">
                {userProfile.ultimo_entrenamiento 
                  ? `Último juego: ${new Date(userProfile.ultimo_entrenamiento).toLocaleDateString()}`
                  : '¡Inicia tu primer juego hoy!'}
              </p>
            </div>
          </div>
        </section>

        {/* Sección 2: Ruta de Entrenamiento (24 Sesiones) */}
        <section className="glass-panel p-6 rounded-2xl border border-brand-violet/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h3 className="text-xl font-bold tracking-wider flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-cyan" />
                Programa de Entrenamiento Cognitivo
              </h3>
              <p className="text-xs text-gray-400 mt-1">24 Sesiones distribuidas en 8 semanas (3 sesiones semanales para máximo desarrollo)</p>
            </div>
            <div className="mt-3 md:mt-0 flex gap-2 items-center bg-bg-space/65 border border-brand-violet/20 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-bold">Progreso:</span>
              <span className="text-brand-cyan font-bold">{sessions.filter(s => s.completada).length} / 24</span>
              <span>Completadas</span>
            </div>
          </div>

          {/* Línea de tiempo de sesiones */}
          <div className="relative">
            <button
              type="button"
              aria-label="Ver sesiones anteriores"
              title="Ver sesiones anteriores"
              onClick={() => scrollSessions('left')}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-cyan/50 bg-bg-space/95 p-2 text-brand-cyan shadow-lg transition hover:bg-brand-cyan hover:text-bg-space"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div ref={sessionsScrollerRef} className="sessions-scroller overflow-x-auto pb-5 pl-10 pr-10 scroll-smooth">
            <div className="flex gap-4 min-w-max px-2">
              {sessions.map((sess) => {
                const isCurrent = currentPendingSession?.id === sess.id;
                const isLocked = !sess.completada && !isCurrent && sess.numero_sesion > (currentPendingSession?.numero_sesion || 24);

                return (
                  <div
                    key={sess.id}
                    className={`w-32 p-4 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                      sess.completada
                        ? 'bg-brand-green/5 border-brand-green/40 text-brand-green'
                        : isCurrent
                        ? 'bg-brand-violet/10 border-brand-violet/50 text-brand-cyan scale-105 glow-violet'
                        : 'bg-bg-space/40 border-brand-violet/10 text-gray-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-gray-400">Semana {sess.semana}</span>
                    <span className="text-lg font-black my-1.5 block">Sesión {sess.numero_sesion}</span>
                    
                    {sess.completada ? (
                      <CheckCircle className="w-6 h-6 text-brand-green" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-gray-600" />
                    ) : (
                      <button
                        onClick={() => {
                          // Lanzar primer juego para esta sesión
                          onSelectGame(1, sess.numero_sesion);
                        }}
                        className="bg-brand-cyan hover:bg-white text-bg-space hover:scale-110 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-md flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Jugar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            <button
              type="button"
              aria-label="Ver más sesiones"
              title="Ver más sesiones"
              onClick={() => scrollSessions('right')}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-cyan/50 bg-bg-space/95 p-2 text-brand-cyan shadow-lg transition hover:bg-brand-cyan hover:text-bg-space"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Sección 3: Biblioteca de Minijuegos */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-wider flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-yellow" />
            Entrenamiento Cognitivo Libre
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {minijuegos.map((game) => {
              // Juego 5 solo para semanas 6-8 (sesión 16 en adelante)
              const isLocked = game.id === 5 && sessions.filter(s => s.completada).length < 15;

              return (
                <div
                  key={game.id}
                  className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 ${game.color} relative overflow-hidden`}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-bg-space/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4">
                      <Lock className="w-10 h-10 text-brand-red mb-2" />
                      <h4 className="font-bold text-white text-sm">Bloqueo de Misión</h4>
                      <p className="text-xs text-gray-400 mt-1">Este juego de Doble Tarea (Atención Dividida) requiere haber completado al menos 15 sesiones.</p>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-bg-space/65 border border-brand-violet/30">
                        {game.area}
                      </span>
                      <Star className="w-4 h-4 text-brand-yellow fill-current" />
                    </div>
                    <h4 className="text-lg font-black text-white mt-3">{game.nombre}</h4>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{game.desc}</p>
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold">Módulo {game.id}</span>
                    <button
                      onClick={() => onSelectGame(game.id)}
                      className="flex items-center gap-1.5 bg-brand-violet hover:bg-brand-cyan text-white hover:text-bg-space px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar Vuelo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
};
