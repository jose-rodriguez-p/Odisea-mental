import React, { useState, useEffect, useRef } from 'react';
import { Target, AlertCircle, Volume2 } from 'lucide-react';

interface DobleDesafioProps {
  dificultad: number;
  onFinish: (aciertos: number, omisiones: number, comisiones: number, tiempoPromedio: number) => void;
}

export const DobleDesafio: React.FC<DobleDesafioProps> = ({
  dificultad,
  onFinish
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Tarea 1: Motor Tracking (Izquierda)
  const [targetY, setTargetY] = useState<number>(50); // En porcentaje (0-100)
  const [shipY, setShipY] = useState<number>(50); // En porcentaje
  const [isCentered, setIsCentered] = useState<boolean>(true);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Tarea 2: Auditiva/Visual Discriminación (Derecha)
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [prevNumber, setPrevNumber] = useState<number | null>(null);
  const numbersIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Métricas y Referencias
  const aciertosDerecha = useRef<number>(0);
  const erroresOmisionDerecha = useRef<number>(0);
  const erroresComisionDerecha = useRef<number>(0);
  
  const aciertosIzquierda = useRef<number>(0); // Pasos alineados
  const totalMuestrasIzquierda = useRef<number>(0); // Total de chequeos Y
  
  const tiemposReaccion = useRef<number[]>([]);
  const lastNumberTime = useRef<number>(0);
  const hasRespondedRight = useRef<boolean>(false);

  // Hablar número usando el Sintetizador de Voz Nativo del Navegador (Offline)
  const speakNumber = (num: number) => {
    try {
      if ('speechSynthesis' in window) {
        // Detener discursos en cola para evitar retrasos
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(num.toString());
        utterance.lang = 'es-ES';
        utterance.rate = 1.5; // Hablar rápido
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('SpeechSynthesis no soportado o bloqueado por el navegador.', e);
    }
  };

  // 1. Tarea Izquierda: Motor Tracking loop (Mueve el objetivo en onda senoidal)
  useEffect(() => {
    if (!isPlaying) return;

    let time = 0;
    const trackingLoop = setInterval(() => {
      time += 0.05;
      // Onda combinada para mayor dificultad e imprevisibilidad
      const speedFactor = 0.5 + (dificultad * 0.15);
      const newY = 50 + Math.sin(time * speedFactor) * 35 + Math.cos(time * 0.4 * speedFactor) * 10;
      setTargetY(Math.max(10, Math.min(90, newY)));

      // Medir la distancia entre la nave del jugador y el objetivo
      const diff = Math.abs(newY - shipY);
      totalMuestrasIzquierda.current += 1;
      
      if (diff <= 15) {
        setIsCentered(true);
        aciertosIzquierda.current += 1;
      } else {
        setIsCentered(false);
      }
    }, 100);

    return () => clearInterval(trackingLoop);
  }, [shipY, isPlaying, dificultad]);

  // Manejar el movimiento de mouse en el panel izquierdo
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPlaying || !leftPanelRef.current) return;
    const rect = leftPanelRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const relativeY = (mouseY / rect.height) * 100;
    setShipY(Math.max(5, Math.min(95, relativeY)));
  };

  // Manejar el toque (touch) para móviles en el panel izquierdo
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPlaying || !leftPanelRef.current || e.touches.length === 0) return;
    const rect = leftPanelRef.current.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    const relativeY = (touchY / rect.height) * 100;
    setShipY(Math.max(5, Math.min(95, relativeY)));
  };

  // 2. Tarea Derecha: Loop de números pares consecutivos
  const runNumbersLoop = () => {
    if (!isPlaying) return;

    // Verificar si el bloque anterior requería respuesta y se omitió
    if (prevNumber !== null && currentNumber !== null) {
      const isPrevEven = prevNumber % 2 === 0;
      const isCurrEven = currentNumber % 2 === 0;
      if (isPrevEven && isCurrEven && !hasRespondedRight.current) {
        erroresOmisionDerecha.current += 1;
      }
    }

    hasRespondedRight.current = false;
    
    // Generar nuevo número (1 a 9)
    const newNum = Math.floor(Math.random() * 9) + 1;
    
    setPrevNumber(currentNumber);
    setCurrentNumber(newNum);
    speakNumber(newNum);
    
    lastNumberTime.current = performance.now();

    // Generar números cada 1.6 segundos
    numbersIntervalRef.current = setTimeout(runNumbersLoop, 1600);
  };

  // Iniciar temporizador del juego y loop de números
  useEffect(() => {
    runNumbersLoop();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (numbersIntervalRef.current) clearTimeout(numbersIntervalRef.current);
    };
  }, [isPlaying]);

  // Manejar respuesta de la tarea de pares consecutivos
  const handlePairAction = () => {
    if (!isPlaying || hasRespondedRight.current || prevNumber === null || currentNumber === null) return;

    hasRespondedRight.current = true;
    const clickTime = performance.now();
    const rt = clickTime - lastNumberTime.current;

    const isPrevEven = prevNumber % 2 === 0;
    const isCurrEven = currentNumber % 2 === 0;

    if (isPrevEven && isCurrEven) {
      // ¡Correcto! Dos pares consecutivos
      aciertosDerecha.current += 1;
      tiemposReaccion.current.push(rt);
      speakFeedback(true);
    } else {
      // ¡Incorrecto! No eran consecutivos pares
      erroresComisionDerecha.current += 1;
      speakFeedback(false);
    }
  };

  // Feedback sonoro para las respuestas rápidas
  const speakFeedback = (success: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = success ? 800 : 200; // Tono agudo vs tono grave
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // ignorar bloqueos
    }
  };

  const handleGameEnd = () => {
    setIsPlaying(false);
    if (numbersIntervalRef.current) clearTimeout(numbersIntervalRef.current);
    window.speechSynthesis?.cancel();

    // Promedios y consolidación de métricas
    const trackingAccuracy = totalMuestrasIzquierda.current > 0
      ? (aciertosIzquierda.current / totalMuestrasIzquierda.current) * 100
      : 0;

    // Aciertos totales: suma ponderada del seguimiento motor y las respuestas cognitivas
    const motorHitsScaled = Math.round(trackingAccuracy * 0.15); // Aportación de hasta 15 aciertos
    const totalAciertosConsolidados = aciertosDerecha.current + motorHitsScaled;

    // Errores de comisión: clics equivocados + bloques de desalineación severos
    const desalineaciones = totalMuestrasIzquierda.current - aciertosIzquierda.current;
    const desalineacionComision = Math.floor(desalineaciones / 12); // Agrupar desalineaciones en errores
    const totalComisionesConsolidadas = erroresComisionDerecha.current + desalineacionComision;

    const avgTime = tiemposReaccion.current.length > 0
      ? tiemposReaccion.current.reduce((a, b) => a + b, 0) / tiemposReaccion.current.length
      : 0;

    onFinish(
      totalAciertosConsolidados,
      erroresOmisionDerecha.current,
      totalComisionesConsolidadas,
      avgTime
    );
  };

  // Escuchar teclado "P" para el botón de pares
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePairAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNumber, prevNumber]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-[420px] w-full select-none">
      
      {/* Indicadores Superiores */}
      <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 px-4 pt-2">
        <span className="text-brand-red flex items-center gap-1">
          CRONÓMETRO: <span className="text-sm font-black tracking-widest">{timeLeft}s</span>
        </span>
        <span className="text-brand-green">DOBLE DESAFÍO - ATENCIÓN DIVIDIDA</span>
      </div>

      {/* Área del juego dividida en 2 columnas */}
      <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 my-2">
        
        {/* LADO IZQUIERDO: Tarea Motor Tracking */}
        <div 
          ref={leftPanelRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="h-56 bg-bg-space/95 border border-brand-violet/20 rounded-xl relative overflow-hidden cursor-crosshair flex items-center"
        >
          <div className="absolute top-2 left-2 text-[10px] font-bold text-brand-cyan tracking-wider">
            TAREA A: MANTENER ALINEACIÓN
          </div>

          {/* Anillo de Órbita Objetivo Y (Renderizado SVG) */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-75"
            style={{ top: `${targetY}%` }}
          >
            <svg viewBox="0 0 100 100" className="w-12 h-12 text-brand-yellow animate-spin" style={{ animationDuration: '6s' }}>
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="12 6" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
            </svg>
          </div>

          {/* Nave del Jugador (Sigue el puntero Y) */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ top: `${shipY}%`, transform: 'translate(-50%, -50%)' }}
          >
            <svg viewBox="0 0 100 100" className={`w-8 h-8 ${isCentered ? 'text-brand-green' : 'text-brand-cyan'}`}>
              <polygon points="50,15 80,75 50,60 20,75" fill="currentColor" />
              {isCentered && <circle cx="50" cy="45" r="25" fill="none" stroke="currentColor" strokeWidth="4" className="animate-ping" />}
            </svg>
          </div>

          {/* Indicador de alineamiento */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
            {isCentered ? (
              <span className="text-brand-green animate-pulse">CENTRADO</span>
            ) : (
              <span className="text-brand-red">DESALINEADO</span>
            )}
          </div>
        </div>

        {/* LADO DERECHO: Tarea de Discriminación Auditiva/Visual */}
        <div className="h-56 bg-bg-space/95 border border-brand-violet/20 rounded-xl flex flex-col items-center justify-between p-4 relative">
          
          <div className="absolute top-2 left-2 text-[10px] font-bold text-brand-yellow tracking-wider flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-brand-yellow" />
            <span>TAREA B: NÚMEROS PARES CONSECUTIVOS</span>
          </div>

          {/* Visualizador de Número */}
          <div className="flex-1 flex items-center justify-center pt-6">
            {currentNumber !== null ? (
              <div 
                className="w-20 h-20 rounded-2xl bg-brand-violet/15 border-2 border-brand-violet/50 flex items-center justify-center text-4xl font-black text-white glow-violet select-none"
                key={currentNumber} // Forzar animación cada vez que cambie
              >
                {currentNumber}
              </div>
            ) : (
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Esperando inicio...</div>
            )}
          </div>

          {/* Botón de acción rápida */}
          <button
            onClick={handlePairAction}
            disabled={!isPlaying || hasRespondedRight}
            className="w-full bg-brand-yellow hover:bg-white text-bg-space font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all focus:outline-none flex items-center justify-center gap-1.5 glow-cyan"
          >
            <span>¡2 PARES CONSECUTIVOS! (Tecla P)</span>
          </button>
        </div>

      </div>

      {/* Instrucciones de uso */}
      <div className="pb-4 text-center px-4 w-full border-t border-brand-violet/10 pt-3">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Mueve tu cursor en el panel <span className="text-brand-cyan font-black">Izquierdo</span> para centrar la nave. Presiona <span className="text-brand-yellow font-black">P</span> en el panel <span className="text-brand-yellow font-black">Derecho</span> al escuchar/ver 2 números pares consecutivos.
        </p>
      </div>

    </div>
  );
};
