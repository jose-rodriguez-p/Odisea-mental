import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MisionDeteccionProps {
  dificultad: number;
  velocidad: number;
  onFinish: (aciertos: number, omisiones: number, comisiones: number, tiempoPromedio: number) => void;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'rhombus' | 'star';

export const MisionDeteccion: React.FC<MisionDeteccionProps> = ({
  dificultad,
  velocidad,
  onFinish
}) => {
  const [currentShape, setCurrentShape] = useState<ShapeType | null>(null);
  const [trialCount, setTrialCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<'hit' | 'commission' | 'omission' | 'idle'>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Totales para la ronda (20 estímulos en total)
  const totalTrials = 20;

  // Referencias para métricas
  const aciertos = useRef<number>(0);
  const erroresOmision = useRef<number>(0);
  const erroresComision = useRef<number>(0);
  const tiemposReaccion = useRef<number[]>([]);

  // Controladores de tiempos
  const shapeStartTime = useRef<number>(0);
  const hasResponded = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trialCountRef = useRef<number>(0);

  // Refs para funciones estables
  const nextTrialRef = useRef<(() => void) | null>(null);
  const handleGameEndRef = useRef<(() => void) | null>(null);

  // Lista de formas disponibles
  const shapes: ShapeType[] = ['circle', 'square', 'triangle', 'rhombus', 'star'];

  // Función para pasar al siguiente estímulo
  const nextTrial = () => {
    if (trialCountRef.current >= totalTrials) {
      handleGameEndRef.current?.();
      return;
    }

    // Limpiar estados
    setFeedback('idle');
    hasResponded.current = false;

    // Determinar la forma. La estrella (Target) aparece en aproximadamente el 30% de los casos.
    const isTarget = Math.random() < 0.30;
    let selectedShape: ShapeType;
    if (isTarget) {
      selectedShape = 'star';
    } else {
      // Elegir otra forma aleatoria
      const nonStarShapes = shapes.filter(s => s !== 'star');
      selectedShape = nonStarShapes[Math.floor(Math.random() * nonStarShapes.length)];
    }

    setCurrentShape(selectedShape);
    shapeStartTime.current = performance.now();
    trialCountRef.current += 1;
    setTrialCount(trialCountRef.current);

    // El estímulo se muestra por el 75% del tiempo de velocidad.
    // El 25% restante es una pantalla negra de transición (Inter-Stimulus Interval).
    const displayDuration = velocidad * 0.75;
    const totalDuration = velocidad;

    timerRef.current = setTimeout(() => {
      // Al terminar el tiempo de visualización
      setCurrentShape(null);

      // Programar la transición al siguiente estímulo
      timerRef.current = setTimeout(() => {
        // Al terminar el ciclo completo, comprobar si hubo omisión
        if (selectedShape === 'star' && !hasResponded.current) {
          erroresOmision.current += 1;
          setFeedback('omission');
        }

        // Esperar un instante corto para que se note la retroalimentación de omisión antes del siguiente
        nextTrialRef.current?.();
      }, totalDuration - displayDuration);

    }, displayDuration);
  };

  // Manejo de la acción del usuario (barra espaciadora o click)
  const handleAction = useCallback(() => {
    if (!isPlaying || hasResponded.current || currentShape === null) return;

    hasResponded.current = true;
    const responseTime = performance.now() - shapeStartTime.current;

    if (currentShape === 'star') {
      // ¡Acierto!
      aciertos.current += 1;
      tiemposReaccion.current.push(responseTime);
      setFeedback('hit');
    } else {
      // ¡Error de Comisión! (Presionó con figura incorrecta)
      erroresComision.current += 1;
      setFeedback('commission');
    }
  }, [isPlaying, currentShape]);

  const handleGameEnd = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);

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

  // Controladores de eventos
  useEffect(() => {
    // Asignar referencias a las funciones
    nextTrialRef.current = nextTrial;
    handleGameEndRef.current = handleGameEnd;

    // Iniciar primer ciclo
    nextTrial();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Previene scroll de la barra espaciadora
        handleAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renderizador SVG de las figuras geométricas
  const renderShapeSVG = (shape: ShapeType) => {
    switch (shape) {
      case 'circle':
        return (
          <svg viewBox="0 0 100 100" className="w-48 h-48 text-brand-violet drop-shadow-[0_0_10px_rgba(108,92,231,0.5)]">
            <circle cx="50" cy="50" r="40" fill="currentColor" />
          </svg>
        );
      case 'square':
        return (
          <svg viewBox="0 0 100 100" className="w-48 h-48 text-brand-yellow drop-shadow-[0_0_10px_rgba(255,209,102,0.5)]">
            <rect x="15" y="15" width="70" height="70" rx="6" fill="currentColor" />
          </svg>
        );
      case 'triangle':
        return (
          <svg viewBox="0 0 100 100" className="w-48 h-48 text-brand-green drop-shadow-[0_0_10px_rgba(53,208,127,0.5)]">
            <polygon points="50,15 88,80 12,80" fill="currentColor" />
          </svg>
        );
      case 'rhombus':
        return (
          <svg viewBox="0 0 100 100" className="w-48 h-48 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            <polygon points="50,10 85,50 50,90 15,50" fill="currentColor" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 100 100" className="w-48 h-48 text-brand-cyan drop-shadow-[0_0_20px_rgba(0,212,255,0.8)] animate-pulse">
            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="currentColor" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-between min-h-[400px] w-full cursor-pointer select-none"
      onClick={handleAction}
    >
      {/* Indicador de Progreso */}
      <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 px-4 pt-2">
        <span>ESTÍMULO: {trialCount} / {totalTrials}</span>
        <span className="text-brand-cyan">CPT ATENCIÓN SOSTENIDA</span>
      </div>

      {/* Área Central del Estímulo */}
      <div className="flex-1 flex items-center justify-center min-h-[220px] w-full relative">
        
        {/* Retroalimentación Visual de la última acción */}
        {feedback === 'hit' && (
          <div className="absolute inset-0 bg-brand-green/5 border border-brand-green/20 rounded-xl flex items-center justify-center text-brand-green text-sm font-black uppercase tracking-wider animate-ping">
            ¡ACIERTO!
          </div>
        )}
        {feedback === 'commission' && (
          <div className="absolute inset-0 bg-brand-red/5 border border-brand-red/20 rounded-xl flex items-center justify-center text-brand-red text-sm font-black uppercase tracking-wider animate-shake">
            ¡ERROR DE COMISIÓN!
          </div>
        )}
        {feedback === 'omission' && (
          <div className="absolute inset-0 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 text-sm font-black uppercase tracking-wider">
            ¡ESTRELLA OMITIDA!
          </div>
        )}

        {/* Forma Actual */}
        {currentShape ? (
          <div className="transition-all transform scale-110">
            {renderShapeSVG(currentShape)}
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-gray-700 animate-ping" />
        )}
      </div>

      {/* Panel Inferior de Instrucciones */}
      <div className="pb-4 text-center px-4">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Toca la pantalla o presiona la <span className="bg-brand-violet text-white px-2 py-0.5 rounded font-black">BARRA ESPACIADORA</span> al ver la <span className="text-brand-cyan font-black">ESTRELLA CIAN</span>.
        </p>
        <p className="text-[10px] text-gray-600 italic mt-1.5">
          Velocidad de estímulo: {velocidad} ms | Dificultad cognitiva: Nivel {dificultad}
        </p>
      </div>
    </div>
  );
};
