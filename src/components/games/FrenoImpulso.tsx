import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Zap } from 'lucide-react';

interface FrenoImpulsoProps {
  velocidad: number;
  onFinish: (aciertos: number, omisiones: number, comisiones: number, tiempoPromedio: number) => void;
}

type LightType = 'green' | 'red' | 'off';

export const FrenoImpulso: React.FC<FrenoImpulsoProps> = ({
  velocidad,
  onFinish
}) => {
  const [lightState, setLightState] = useState<LightType>('off');
  const [trialCount, setTrialCount] = useState<number>(0);
  const [shipPosition, setShipPosition] = useState<number>(10); // Posición Y de la nave
  const [feedback, setFeedback] = useState<'go-correct' | 'nogo-error' | 'go-error' | 'nogo-correct' | 'idle'>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const totalTrials = 20;

  const aciertos = useRef<number>(0);
  const erroresOmision = useRef<number>(0);
  const erroresComision = useRef<number>(0);
  const tiemposReaccion = useRef<number[]>([]);

  const shapeStartTime = useRef<number>(0);
  const hasResponded = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trialCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Refs para funciones estables
  const nextTrialRef = useRef<(() => void) | null>(null);
  const handleGameEndRef = useRef<(() => void) | null>(null);

  // Sintetizador de audio en el navegador (Web Audio API) para el pitido de alerta
  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sawtooth'; // Sonido estridente para alerta
      oscillator.frequency.value = 650; // Pitch de advertencia
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // Duración corta
    } catch (e) {
      console.warn('AudioContext no soportado o bloqueado por interacción del usuario', e);
    }
  };

  const nextTrial = () => {
    if (trialCountRef.current >= totalTrials) {
      handleGameEndRef.current?.();
      return;
    }

    setFeedback('idle');
    hasResponded.current = false;
    setLightState('off');

    // Intervalo inter-estímulo corto de transición
    setTimeout(() => {
      // 75% verde (Go), 25% rojo (No-Go)
      const isGo = Math.random() < 0.75;
      const currentLight = isGo ? 'green' : 'red';

      setLightState(currentLight);
      shapeStartTime.current = performance.now();
      trialCountRef.current += 1;
      setTrialCount(trialCountRef.current);

      if (currentLight === 'red') {
        playAlertSound(); // Activar pitido de advertencia
      }

      // Tiempo que permanece encendida la luz
      const displayDuration = velocidad * 0.8;

      timerRef.current = setTimeout(() => {
        setLightState('off');

        // Procesar lo que ocurrió al expirar el tiempo de estímulo
        if (currentLight === 'green' && !hasResponded.current) {
          // Si era verde y no respondió -> Error de Omisión
          erroresOmision.current += 1;
          setFeedback('go-error');
        } else if (currentLight === 'red' && !hasResponded.current) {
          // Si era rojo y no respondió -> Correcto (Inhibió con éxito)
          aciertos.current += 1; // Cuenta como éxito inhibitorio
          setFeedback('nogo-correct');
        }

        // Programar el siguiente intento
        setTimeout(() => nextTrialRef.current?.(), 300);

      }, displayDuration);

    }, 400);
  };

  const handleAction = () => {
    if (!isPlaying || hasResponded.current || lightState === 'off') return;

    hasResponded.current = true;
    const responseTime = performance.now() - shapeStartTime.current;

    if (lightState === 'green') {
      // Correcto: Aceleró a tiempo
      aciertos.current += 1;
      tiemposReaccion.current.push(responseTime);
      setFeedback('go-correct');
      // Impulsar la nave hacia adelante visualmente
      setShipPosition(prev => Math.min(prev + 5, 80));
    } else {
      // Error: No debió presionar en rojo (Falta de control inhibitorio)
      erroresComision.current += 1;
      setFeedback('nogo-error');
      // Retroceder nave
      setShipPosition(prev => Math.max(prev - 8, 10));
    }
  };

  const handleGameEnd = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Detener audio context para evitar que el sonido continúe
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (e) {
        console.warn('Error al cerrar AudioContext', e);
      }
    }

    const avgTime = tiemposReaccion.current.length > 0
      ? tiemposReaccion.current.reduce((a, b) => a + b, 0) / tiemposReaccion.current.length
      : 0;

    onFinish(
      aciertos.current,
      erroresOmision.current,
      erroresComision.current,
      avgTime
    );
  };

  useEffect(() => {
    // Asignar referencias a las funciones
    nextTrialRef.current = nextTrial;
    handleGameEndRef.current = handleGameEnd;

    nextTrial();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Detener audio al desmontar
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
        } catch (e) {
          console.warn('Error al cerrar AudioContext en cleanup', e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-between min-h-[400px] w-full cursor-pointer select-none"
      onClick={handleAction}
    >
      {/* Indicadores Superiores */}
      <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 px-4 pt-2">
        <span>SEMAFORO: {trialCount} / {totalTrials}</span>
        <span className="text-brand-red">GO / NO-GO CONTROL INHIBITORIO</span>
      </div>

      {/* Simulador de Vuelo y Semáforo */}
      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 items-center justify-center p-4 gap-6 relative">
        
        {/* Columna 1: Semáforo Espacial SVG */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 bg-gray-900 border border-purple-500/40 rounded-3xl p-3 flex flex-col gap-4 items-center shadow-lg">
            {/* Luz Roja */}
            <div
              className={`w-10 h-10 rounded-full transition-all duration-150 ${
                lightState === 'red'
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse'
                  : 'bg-red-950/40 border border-red-900/30'
              }`}
            />
            {/* Luz Verde */}
            <div
              className={`w-10 h-10 rounded-full transition-all duration-150 ${
                lightState === 'green'
                  ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]'
                  : 'bg-green-950/40 border border-green-900/30'
              }`}
            />
          </div>
        </div>

        {/* Columna 2: Campo Estelar y Nave */}
        <div className="md:col-span-2 h-44 bg-bg-space/90 border border-brand-violet/25 rounded-2xl relative overflow-hidden flex items-center">
          {/* Estrellas de fondo pasando (efecto túnel espacial) */}
          <div className="absolute inset-0 opacity-40">
            <div className="w-1 h-1 bg-white rounded-full absolute top-10 left-1/4 animate-pulse" />
            <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full absolute top-24 left-2/3 animate-ping" />
            <div className="w-0.5 h-0.5 bg-white rounded-full absolute top-32 left-1/2" />
          </div>

          {/* Nave Espacial SVG */}
          <div 
            className="absolute transition-all duration-300"
            style={{ 
              left: `${shipPosition}%`,
              transform: 'translateY(-50%)',
              top: '50%'
            }}
          >
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-brand-cyan drop-shadow-[0_0_10px_rgba(0,212,255,0.7)]">
              <path d="M70,50 L20,20 L30,50 L20,80 Z" fill="currentColor" />
              <circle cx="45" cy="50" r="5" fill="#101827" />
              <path d="M15,42 L5,50 L15,58 Z" fill="#FFD166" className="animate-pulse" />
            </svg>
          </div>

          {/* Línea de Meta (Estética) */}
          <div className="absolute right-4 top-0 bottom-0 w-1 border-r-2 border-dashed border-brand-yellow/30 flex flex-col justify-between py-2">
            <div className="w-2 h-2 rounded bg-brand-yellow" />
            <div className="w-2 h-2 rounded bg-brand-yellow" />
            <div className="w-2 h-2 rounded bg-brand-yellow" />
          </div>

          {/* Feedback Visual Interno */}
          {feedback === 'go-correct' && (
            <div className="absolute top-2 right-2 bg-brand-green/20 border border-brand-green/50 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>IMPULSO EXITOSO</span>
            </div>
          )}
          {feedback === 'nogo-error' && (
            <div className="absolute inset-0 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex flex-col items-center justify-center text-brand-red font-bold text-xs gap-1">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <span>COLISIÓN: ¡FALTA DE FRENO!</span>
            </div>
          )}
          {feedback === 'go-error' && (
            <div className="absolute top-2 right-2 bg-brand-red/20 border border-brand-red/50 text-brand-red text-[10px] font-bold px-2 py-0.5 rounded">
              OMISIÓN (SEMÁFORO VERDE)
            </div>
          )}
          {feedback === 'nogo-correct' && (
            <div className="absolute top-2 right-2 bg-brand-green/20 border border-brand-green/50 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded">
              INHIBICIÓN EXITOSA
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones de Uso */}
      <div className="pb-4 text-center px-4 border-t border-brand-violet/10 pt-3 w-full">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Presiona la <span className="bg-brand-violet text-white px-2 py-0.5 rounded font-black">BARRA ESPACIADORA</span> o toca la pantalla ante Luz <span className="text-brand-green font-black">VERDE</span>.
        </p>
        <p className="text-xs text-brand-red font-black uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>¡SI ENCIENDE LUZ ROJA O ESCUCHAS EL PITIDO, INHIBE LA RESPUESTA COMPLETAMENTE!</span>
        </p>
      </div>
    </div>
  );
};
