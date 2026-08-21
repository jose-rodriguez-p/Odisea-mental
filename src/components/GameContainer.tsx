import React, { useState, useEffect } from 'react';
import { PerfilUsuario, MetricaMinijuego } from '../types';
import { db } from '../supabaseClient';
import { ArrowLeft, RefreshCw, Trophy, Award, Flame, Star } from 'lucide-react';

// Importar juegos
import { MisionDeteccion } from './games/MisionDeteccion';
import { EscanerVisual } from './games/EscanerVisual';
import { FrenoImpulso } from './games/FrenoImpulso';
import { SecuenciaEstelar } from './games/SecuenciaEstelar';
import { DobleDesafio } from './games/DobleDesafio';

interface GameContainerProps {
  gameId: number;
  sessionNum?: number;
  profile: PerfilUsuario;
  onBackToDashboard: () => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  gameId,
  sessionNum,
  profile,
  onBackToDashboard
}) => {
  // Estado adaptativo (Motor adaptativo)
  const [nivelDificultad, setNivelDificultad] = useState<number>(profile.nivel || 1);
  const [velocidadEstimuloMs, setVelocidadEstimuloMs] = useState<number>(1200);
  const [densidadDistractores, setDensidadDistractores] = useState<number>(1);
  
  // Estado de flujo de juego
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'summary'>('intro');
  const [lastMetric, setLastMetric] = useState<MetricaMinijuego | null>(null);
  const [xpBonificador, setXpBonificador] = useState<boolean>(false);

  // Nombres de los juegos
  const getGameName = (id: number) => {
    switch (id) {
      case 1: return 'Misión Detección (CPT)';
      case 2: return 'Escáner Visual (Test d2)';
      case 3: return 'Freno de Impulso (Go / No-Go)';
      case 4: return 'Secuencia Estelar (Corsi)';
      case 5: return 'Doble Desafío (Dual-Task)';
      default: return 'Minijuego Cognitivo';
    }
  };

  const getGameArea = (id: number) => {
    switch (id) {
      case 1: return 'Atención Sostenida & Vigilancia';
      case 2: return 'Atención Selectiva';
      case 3: return 'Control Inhibitorio';
      case 4: return 'Memoria de Trabajo';
      case 5: return 'Atención Dividida';
      default: return 'Funciones Ejecutivas';
    }
  };

  // Inicializar dificultad de acuerdo al nivel del usuario
  useEffect(() => {
    // Escalar la velocidad inicial y distractores según el nivel del perfil
    setNivelDificultad(profile.nivel);
    setVelocidadEstimuloMs(Math.max(600, 1300 - (profile.nivel * 80)));
    setDensidadDistractores(Math.min(5, 1 + Math.floor(profile.nivel / 2)));
    setGameState('intro');
  }, [gameId, profile.nivel]);

  const handleStartGame = () => {
    setGameState('playing');
  };

  // Callback al completar un bloque de juego
  const handleGameBlockComplete = async (
    aciertos: number,
    erroresOmision: number,
    erroresComision: number,
    tiempoReaccionPromedioMs: number
  ) => {
    // 1. Calcular precisión: aciertos / (total de estímulos con respuesta requerida o intentados)
    const totalEventos = aciertos + erroresOmision + erroresComision;
    const precision = totalEventos > 0 
      ? Number(((aciertos / totalEventos) * 100).toFixed(2))
      : 0.00;

    // 2. Aplicar Motor Adaptativo del PDF
    let nuevaVelocidad = velocidadEstimuloMs;
    let nuevaDensidad = densidadDistractores;
    let nuevoNivel = nivelDificultad;
    let bonificadorXP = false;
    let xpGanado = aciertos * 15; // XP base por aciertos

    if (precision > 85 && tiempoReaccionPromedioMs < 450) {
      // Éxito sobresaliente: Aumentar dificultad
      nuevaVelocidad = Math.max(500, velocidadEstimuloMs - 100);
      nuevaDensidad += 1;
      nuevoNivel += 1;
      bonificadorXP = true;
      xpGanado += 150; // Bonificador de 150 XP
    } else if (precision < 60 || erroresComision > 5) {
      // Rendimiento bajo: Reducir dificultad
      nuevaVelocidad = Math.min(1500, velocidadEstimuloMs + 150);
      nuevaDensidad = Math.max(0, densidadDistractores - 1);
      nuevoNivel = Math.max(1, nivelDificultad - 1);
    }

    // Actualizar estados locales del motor
    setVelocidadEstimuloMs(nuevaVelocidad);
    setDensidadDistractores(nuevaDensidad);
    setNivelDificultad(nuevoNivel);
    setXpBonificador(bonificadorXP);

    // 3. Crear registro de métricas
    const metrica: MetricaMinijuego = {
      usuario_id: profile.id,
      juego_id: gameId,
      juego_nombre: getGameName(gameId),
      aciertos,
      errores_omision: erroresOmision,
      errores_comision: erroresComision,
      precision,
      tiempo_reaccion_promedio_ms: Number(tiempoReaccionPromedioMs.toFixed(2)),
      nivel_dificultad_alcanzado: nuevoNivel,
      velocidad_estimulo_ms: gameId === 1 || gameId === 3 ? velocidadEstimuloMs : null,
      densidad_distractores: nuevaDensidad,
      xp_ganado: Math.max(50, xpGanado) // Garantizar al menos 50 XP por jugar
    };

    setLastMetric(metrica);

    try {
      // Guardar métrica en base de datos
      await db.saveMetric(metrica);

      // Si se lanzó desde una sesión del roadmap de 24 sesiones, completarla
      if (sessionNum) {
        await db.completeSession(profile.id, sessionNum);
      }
    } catch (err) {
      console.error('Error guardando métricas en la base de datos:', err);
    }

    setGameState('summary');
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex flex-col max-w-4xl mx-auto justify-center">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6 bg-bg-space/80 p-4 rounded-xl border border-brand-violet/20">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-brand-cyan tracking-widest">{getGameArea(gameId)}</span>
          <h2 className="text-base font-bold text-white leading-tight">{getGameName(gameId)}</h2>
        </div>
      </div>

      {/* Flujos de Juego */}
      {gameState === 'intro' && (
        <div className="glass-panel p-8 rounded-2xl border border-brand-violet/30 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-violet/10 border border-brand-violet/40 flex items-center justify-center mx-auto text-brand-cyan glow-violet">
            <Trophy className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <span className="text-xs font-black text-brand-cyan uppercase tracking-widest bg-brand-cyan/10 px-3 py-1 rounded-full">
              Preparando Misión
            </span>
            <h3 className="text-2xl font-black text-white">{getGameName(gameId)}</h3>
            <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
              {gameId === 1 && 'Instrucciones: Se presentarán figuras geométricas de forma continua en pantalla. Presiona la barra espaciadora o haz clic sobre la pantalla ÚNICAMENTE cuando veas una Estrella de 5 puntas de color Cian. ¡Evita equivocarte de figura o dejar pasar la estrella!'}
              {gameId === 2 && 'Instrucciones: Observarás una cuadrícula de letras "p" y "d". Tendrás 15 segundos para hacer clic ÚNICAMENTE en las letras "d" que contengan exactamente 2 marcas (líneas verticales o puntos). Cada acierto te otorga XP, las incorrectas restan precisión.'}
              {gameId === 3 && 'Instrucciones: Controlas un vehículo espacial en ruta. Mantén presionada la barra espaciadora o el botón de avanzar mientras el semáforo esté en VERDE (75% de los casos). En cuanto cambie a ROJO o escuches la alarma, suelta inmediatamente para FRENAR.'}
              {gameId === 4 && 'Instrucciones: Verás 9 orbes flotantes. El sistema iluminará secuencialmente varios orbes. Cuando termine, haz clic en ellos en el orden exacto. La longitud del patrón aumentará si tienes éxito.'}
              {gameId === 5 && 'Instrucciones: Doble tarea concurrente. Con tu puntero, debes mover la nave izquierda para mantenerla centrada en la trayectoria. Al mismo tiempo, escucha o mira el panel derecho y presiona la tecla "P" cada vez que escuches/veas dos números pares consecutivos.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-md mx-auto pt-4 text-xs font-bold bg-bg-space/55 p-4 rounded-xl border border-brand-violet/15">
            <div>
              <span className="text-gray-400 block">DIFICULTAD</span>
              <span className="text-white text-base font-black">Nivel {nivelDificultad}</span>
            </div>
            <div>
              <span className="text-gray-400 block">VELOCIDAD</span>
              <span className="text-white text-base font-black">{velocidadEstimuloMs} ms</span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-gray-400 block">DISTRACTORES</span>
              <span className="text-white text-base font-black">Densidad {densidadDistractores}</span>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="px-8 py-3.5 bg-brand-cyan hover:bg-white text-bg-space font-black text-sm uppercase tracking-wider rounded-xl transition-all duration-300 glow-cyan transform hover:scale-105"
          >
            Iniciar Misión
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="bg-bg-space/90 border border-brand-violet/20 rounded-2xl overflow-hidden min-h-[450px] flex items-center justify-center p-4 relative shadow-2xl">
          {gameId === 1 && (
            <MisionDeteccion
              dificultad={nivelDificultad}
              velocidad={velocidadEstimuloMs}
              onFinish={handleGameBlockComplete}
            />
          )}
          {gameId === 2 && (
            <EscanerVisual
              dificultad={nivelDificultad}
              onFinish={handleGameBlockComplete}
            />
          )}
          {gameId === 3 && (
            <FrenoImpulso
              velocidad={velocidadEstimuloMs}
              onFinish={handleGameBlockComplete}
            />
          )}
          {gameId === 4 && (
            <SecuenciaEstelar
              dificultad={nivelDificultad}
              onFinish={handleGameBlockComplete}
            />
          )}
          {gameId === 5 && (
            <DobleDesafio
              dificultad={nivelDificultad}
              onFinish={handleGameBlockComplete}
            />
          )}
        </div>
      )}

      {gameState === 'summary' && lastMetric && (
        <div className="glass-panel p-8 rounded-2xl border border-brand-violet/30 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/40 flex items-center justify-center mx-auto text-brand-yellow glow-cyan animate-bounce">
            <Award className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black text-brand-green uppercase tracking-widest bg-brand-green/10 px-3 py-1 rounded-full">
              Misión Completada
            </span>
            <h3 className="text-2xl font-black text-white">Reporte de Desempeño</h3>
            <p className="text-xs text-gray-400">Datos registrados con precisión de milisegundos</p>
          </div>

          {/* Bonificador de XP */}
          {xpBonificador && (
            <div className="bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow rounded-xl p-3 max-w-sm mx-auto flex items-center justify-center gap-2 animate-pulse">
              <Flame className="w-5 h-5" />
              <span className="text-xs font-black tracking-wider">¡SUPER RENDIMIENTO! +150 XP Adaptativo</span>
            </div>
          )}

          {/* Estadísticas de la ronda */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-bg-space/80 p-4 rounded-xl border border-brand-violet/20">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Aciertos</span>
              <span className="text-xl font-black text-brand-green">{lastMetric.aciertos}</span>
            </div>
            <div className="bg-bg-space/80 p-4 rounded-xl border border-brand-violet/20">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Errores (Com/Om)</span>
              <span className="text-xl font-black text-brand-red">
                {lastMetric.errores_comision} / {lastMetric.errores_omision}
              </span>
            </div>
            <div className="bg-bg-space/80 p-4 rounded-xl border border-brand-violet/20">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Precisión</span>
              <span className="text-xl font-black text-brand-cyan">{lastMetric.precision}%</span>
            </div>
            <div className="bg-bg-space/80 p-4 rounded-xl border border-brand-violet/20">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">T. Reacción Prom.</span>
              <span className="text-xl font-black text-white">{lastMetric.tiempo_reaccion_promedio_ms} ms</span>
            </div>
          </div>

          {/* Recompensa */}
          <div className="bg-brand-violet/10 border border-brand-violet/30 rounded-xl p-4 max-w-md mx-auto">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Recompensa Total Ganada</span>
            <div className="text-2xl font-black text-brand-yellow flex items-center justify-center gap-1.5 mt-1">
              <Star className="w-6 h-6 fill-current" />
              <span>+{lastMetric.xp_ganado} XP</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Dificultad adaptada para la próxima ronda: <span className="text-brand-cyan font-bold">Nivel {nivelDificultad}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setGameState('intro');
              }}
              className="px-6 py-3 rounded-xl bg-bg-space hover:bg-brand-violet border border-brand-violet/40 hover:border-brand-violet font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Jugar Otra Vez</span>
            </button>
            <button
              onClick={onBackToDashboard}
              className="px-8 py-3 rounded-xl bg-brand-cyan hover:bg-white text-bg-space font-black text-xs uppercase tracking-wider transition-all shadow-lg glow-cyan"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
