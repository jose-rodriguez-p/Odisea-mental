import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface SecuenciaEstelarProps {
  dificultad: number;
  onFinish: (aciertos: number, omisiones: number, comisiones: number, tiempoPromedio: number) => void;
}

export const SecuenciaEstelar: React.FC<SecuenciaEstelarProps> = ({
  dificultad,
  onFinish
}) => {
  const [activeOrbIndex, setActiveOrbIndex] = useState<number | null>(null);
  const [sequenceLength, setSequenceLength] = useState<number>(Math.max(3, Math.min(7, dificultad)));
  const [gamePhase, setGamePhase] = useState<'showing' | 'player-input' | 'feedback'>('showing');
  const [roundNum, setRoundNum] = useState<number>(1);
  const [feedbackType, setFeedbackType] = useState<'success' | 'failure' | 'idle'>('idle');

  const totalRounds = 5;

  const aciertos = useRef<number>(0);
  const erroresOmision = useRef<number>(0);
  const erroresComision = useRef<number>(0);
  const tiemposReaccion = useRef<number[]>([]);

  // Referencias internas
  const sequence = useRef<number[]>([]);
  const playerSequence = useRef<number[]>([]);
  const lastInputTime = useRef<number>(0);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Posiciones de los 9 orbes flotantes (Grid espacial 3x3)
  const orbs = [
    { id: 0, x: '20%', y: '25%' }, { id: 1, x: '50%', y: '20%' }, { id: 2, x: '80%', y: '25%' },
    { id: 3, x: '25%', y: '50%' }, { id: 4, x: '50%', y: '50%' }, { id: 5, x: '75%', y: '50%' },
    { id: 6, x: '20%', y: '75%' }, { id: 7, x: '50%', y: '80%' }, { id: 8, x: '80%', y: '75%' }
  ];

  // Iniciar una nueva ronda y generar secuencia
  const startRound = () => {
    if (roundNum > totalRounds) {
      handleGameEnd();
      return;
    }

    setGamePhase('showing');
    setFeedbackType('idle');
    playerSequence.current = [];
    
    // Generar secuencia de orbes aleatorios
    const newSeq: number[] = [];
    for (let i = 0; i < sequenceLength; i++) {
      const randomOrb = Math.floor(Math.random() * 9);
      // Evitar que el mismo orbe se repita dos veces consecutivas en la secuencia para evitar confusión
      if (i > 0 && randomOrb === newSeq[i - 1]) {
        i--;
        continue;
      }
      newSeq.push(randomOrb);
    }
    sequence.current = newSeq;

    // Reproducir secuencia
    playSequence(0);
  };

  // Reproducción visual paso a paso de la secuencia
  const playSequence = (index: number) => {
    if (index >= sequence.current.length) {
      // Fin de reproducción, turno del jugador
      setActiveOrbIndex(null);
      setGamePhase('player-input');
      lastInputTime.current = performance.now();
      return;
    }

    // Encender orbe
    setActiveOrbIndex(sequence.current[index]);
    
    // Reproducir un pitido armónico de tono variable según el orbe
    playOrbTone(sequence.current[index]);

    showTimeoutRef.current = setTimeout(() => {
      // Apagar orbe
      setActiveOrbIndex(null);
      
      // Pausa corta entre orbes
      showTimeoutRef.current = setTimeout(() => {
        playSequence(index + 1);
      }, 350);

    }, 650);
  };

  // Generación de tono musical por el navegador para los orbes
  const playOrbTone = (orbId: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      // Frecuencias pentatónicas agradables
      const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
      oscillator.frequency.value = frequencies[orbId] || 300;

      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // Ignorar si el navegador bloquea el audio
    }
  };

  const handleOrbClick = (orbId: number) => {
    if (gamePhase !== 'player-input') return;

    const clickTime = performance.now();
    const reactTime = clickTime - lastInputTime.current;
    lastInputTime.current = clickTime;
    tiemposReaccion.current.push(reactTime);

    // Encender y pitar momentáneamente al presionar
    setActiveOrbIndex(orbId);
    playOrbTone(orbId);
    setTimeout(() => setActiveOrbIndex(null), 200);

    const stepIndex = playerSequence.current.length;
    const expectedOrb = sequence.current[stepIndex];

    if (orbId === expectedOrb) {
      // Acierto individual en el paso
      playerSequence.current.push(orbId);
      aciertos.current += 1;

      // Verificar si completó toda la secuencia
      if (playerSequence.current.length === sequence.current.length) {
        setGamePhase('feedback');
        setFeedbackType('success');
        
        // Aumentar longitud de secuencia para la siguiente ronda (Límite 7)
        setSequenceLength(prev => Math.min(7, prev + 1));
        
        setTimeout(() => {
          setRoundNum(prev => prev + 1);
        }, 1200);
      }
    } else {
      // Error de Comisión (Presionó el orbe equivocado)
      erroresComision.current += 1;
      setGamePhase('feedback');
      setFeedbackType('failure');
      
      // Disminuir longitud de la secuencia (Mínimo 3)
      setSequenceLength(prev => Math.max(3, prev - 1));

      setTimeout(() => {
        setRoundNum(prev => prev + 1);
      }, 1200);
    }
  };

  const handleGameEnd = () => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    
    // Calcular omisiones. Si falló o no ingresó todos los pasos,
    // se calculan los pasos restantes de la secuencia que no se completaron en rondas fallidas
    const avgTime = tiemposReaccion.current.length > 0
      ? tiemposReaccion.current.reduce((a, b) => a + b, 0) / tiemposReaccion.current.length
      : 0;

    // Calcular omisiones estimadas (puntos no clickeados por fallos)
    const totalClicsRequeridos = totalRounds * sequenceLength; // Aprox
    const clicsRealizados = aciertos.current;
    const omisiones = Math.max(0, totalClicsRequeridos - clicsRealizados - erroresComision.current);

    onFinish(
      aciertos.current,
      omisiones,
      erroresComision.current,
      avgTime
    );
  };

  useEffect(() => {
    startRound();
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, [roundNum]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-[420px] w-full select-none relative">
      {/* Indicadores Superiores */}
      <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 px-4 pt-2">
        <span>RONDA: {roundNum} / {totalRounds}</span>
        <span className="text-brand-yellow flex items-center gap-1">
          <Brain className="w-4 h-4 text-brand-yellow" />
          <span>CORSI MEMORIA DE TRABAJO</span>
        </span>
      </div>

      {/* Panel de Estado / Turno */}
      <div className="text-center mt-2">
        {gamePhase === 'showing' && (
          <span className="text-xs font-black text-brand-cyan tracking-widest uppercase animate-pulse flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5" /> Observa la Secuencia...
          </span>
        )}
        {gamePhase === 'player-input' && (
          <span className="text-xs font-black text-brand-yellow tracking-widest uppercase glow-text-cyan flex items-center gap-1.5 justify-center">
            ¡Tu Turno! ({playerSequence.current.length} / {sequence.current.length})
          </span>
        )}
        {gamePhase === 'feedback' && feedbackType === 'success' && (
          <span className="text-xs font-black text-brand-green tracking-widest uppercase">
            ¡SECUENCIA CORRECTA!
          </span>
        )}
        {gamePhase === 'feedback' && feedbackType === 'failure' && (
          <span className="text-xs font-black text-brand-red tracking-widest uppercase">
            SECUENCIA INCORRECTA
          </span>
        )}
      </div>

      {/* Campo de orbes espaciales */}
      <div className="flex-1 w-full max-w-[340px] aspect-square relative my-4 bg-bg-space/40 border border-brand-violet/10 rounded-2xl">
        
        {/* Líneas de conexión decorativas */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <line x1="20%" y1="25%" x2="50%" y2="20%" stroke="currentColor" strokeWidth="2" />
          <line x1="50%" y1="20%" x2="80%" y2="25%" stroke="currentColor" strokeWidth="2" />
          <line x1="20%" y1="25%" x2="25%" y2="50%" stroke="currentColor" strokeWidth="2" />
          <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="currentColor" strokeWidth="2" />
          <line x1="80%" y1="25%" x2="75%" y2="50%" stroke="currentColor" strokeWidth="2" />
          <line x1="25%" y1="50%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="2" />
          <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="currentColor" strokeWidth="2" />
          <line x1="25%" y1="50%" x2="20%" y2="75%" stroke="currentColor" strokeWidth="2" />
          <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="currentColor" strokeWidth="2" />
          <line x1="75%" y1="50%" x2="80%" y2="75%" stroke="currentColor" strokeWidth="2" />
          <line x1="20%" y1="75%" x2="50%" y2="80%" stroke="currentColor" strokeWidth="2" />
          <line x1="50%" y1="80%" x2="80%" y2="75%" stroke="currentColor" strokeWidth="2" />
        </svg>

        {/* Mapeo de orbes en el lienzo */}
        {orbs.map(orb => {
          const isActive = activeOrbIndex === orb.id;
          
          let orbStyle = 'border-brand-violet/30 bg-bg-space/90 hover:border-brand-cyan/50';
          if (isActive) {
            orbStyle = 'bg-brand-yellow text-bg-space border-brand-yellow glow-cyan scale-110';
          } else if (gamePhase === 'feedback' && feedbackType === 'success') {
            orbStyle = 'border-brand-green/50 text-brand-green';
          } else if (gamePhase === 'feedback' && feedbackType === 'failure') {
            orbStyle = 'border-brand-red/50 text-brand-red';
          }

          return (
            <button
              key={orb.id}
              onClick={() => handleOrbClick(orb.id)}
              disabled={gamePhase !== 'player-input'}
              style={{
                left: orb.x,
                top: orb.y,
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md focus:outline-none ${orbStyle}`}
            >
              <svg viewBox="0 0 100 100" className="w-6 h-6">
                <circle cx="50" cy="50" r="25" fill="currentColor" />
                {isActive && <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="5" className="animate-ping" />}
              </svg>
            </button>
          );
        })}
      </div>

      {/* Instrucciones de uso */}
      <div className="pb-4 text-center px-4 w-full border-t border-brand-violet/10 pt-3">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Repite la secuencia de orbes iluminados haciendo clic sobre ellos.
        </p>
        <p className="text-[10px] text-gray-600 mt-1 italic">
          Longitud de secuencia actual: {sequenceLength} orbes | Completa las 5 rondas para registrar.
        </p>
      </div>

    </div>
  );
};
