import React, { useState, useEffect, useRef } from 'react';

interface EscanerVisualProps {
  dificultad: number;
  onFinish: (aciertos: number, omisiones: number, comisiones: number, tiempoPromedio: number) => void;
}

interface LetterCard {
  id: string;
  letter: 'p' | 'd';
  ticksAbove: number; // 0, 1, 2
  ticksBelow: number; // 0, 1, 2
  isTarget: boolean; // letter === 'd' && (ticksAbove + ticksBelow === 2)
  selected: boolean;
  isCorrectSelection?: boolean; // true if target, false if not
}

export const EscanerVisual: React.FC<EscanerVisualProps> = ({
  dificultad,
  onFinish
}) => {
  const [cards, setCards] = useState<LetterCard[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Determinar tamaño de cuadrícula
  const gridSize = dificultad >= 4 ? 5 : 4; // 4x4 (16 cartas) o 5x5 (25 cartas)

  const aciertos = useRef<number>(0);
  const erroresComision = useRef<number>(0);
  const correctClicksTime = useRef<number[]>([]);
  const roundStartTime = useRef<number>(0);
  const lastClickTime = useRef<number>(0);

  // Inicializar cartas de la cuadrícula
  const generateGrid = () => {
    const totalCards = gridSize * gridSize;
    const newCards: LetterCard[] = [];

    for (let i = 0; i < totalCards; i++) {
      // Generar letra aleatoria ('p' o 'd')
      const letter = Math.random() < 0.55 ? 'd' : 'p';
      
      // Generar marcas arriba (0, 1 o 2) y abajo (0, 1 o 2)
      const ticksAbove = Math.floor(Math.random() * 3); // 0, 1, 2
      const ticksBelow = Math.floor(Math.random() * 3); // 0, 1, 2
      const totalTicks = ticksAbove + ticksBelow;

      const isTarget = letter === 'd' && totalTicks === 2;

      newCards.push({
        id: `card-${i}`,
        letter,
        ticksAbove,
        ticksBelow,
        isTarget,
        selected: false
      });
    }

    // Asegurarse de que haya al menos 3 targets en la cuadrícula
    const targetCount = newCards.filter(c => c.isTarget).length;
    if (targetCount < 3) {
      return generateGrid(); // Regenerar
    }

    return newCards;
  };

  useEffect(() => {
    setCards(generateGrid());
    roundStartTime.current = performance.now();
    lastClickTime.current = performance.now();

    // Temporizador de 15 segundos
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRoundEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dificultad]);

  const handleCardClick = (cardId: string) => {
    if (!isPlaying) return;

    const clickTime = performance.now();
    const clickInterval = clickTime - lastClickTime.current;
    lastClickTime.current = clickTime;

    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === cardId && !card.selected) {
          const isCorrect = card.isTarget;

          if (isCorrect) {
            aciertos.current += 1;
            correctClicksTime.current.push(clickInterval);
          } else {
            erroresComision.current += 1;
          }

          return {
            ...card,
            selected: true,
            isCorrectSelection: isCorrect
          };
        }
        return card;
      })
    );
  };

  const handleRoundEnd = () => {
    setIsPlaying(false);

    // Calcular omisiones: objetivos válidos que NO fueron seleccionados
    // Necesitamos leer el estado de las cartas actualizadas.
    // Usamos el listado actual
    setCards(prevCards => {
      const targetsNoSeleccionados = prevCards.filter(c => c.isTarget && !c.selected).length;
      
      const avgTime = correctClicksTime.current.length > 0
        ? correctClicksTime.current.reduce((a, b) => a + b, 0) / correctClicksTime.current.length
        : 0;

      // Retornar en el siguiente tick para evitar race conditions
      setTimeout(() => {
        onFinish(
          aciertos.current,
          targetsNoSeleccionados, // Errores de omisión
          erroresComision.current,
          avgTime
        );
      }, 500);

      return prevCards;
    });
  };

  // Renderizar las marcas (líneas/ticks) encima y debajo
  const renderTicks = (count: number, position: 'above' | 'below') => {
    if (count === 0) return <div className="h-2" />; // Espaciador
    
    return (
      <div className={`flex justify-center gap-1.5 h-2 ${position === 'above' ? 'mb-1' : 'mt-1'}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div 
            key={idx} 
            className="w-0.5 h-2 bg-brand-cyan rounded-full" 
            style={{ boxShadow: '0 0 4px rgba(0, 212, 255, 0.7)' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-[430px] w-full select-none">
      
      {/* Indicadores Superiores */}
      <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 px-4 pt-2">
        <span className="text-brand-red flex items-center gap-1.5">
          TIEMPO RESTANTE: <span className="text-sm font-black tracking-widest">{timeLeft}s</span>
        </span>
        <span className="text-brand-violet">TEST D2 ATENCIÓN SELECTIVA</span>
      </div>

      {/* Grid de Cartas */}
      <div 
        className="grid gap-3 p-4 my-2 justify-center items-center flex-1 w-full"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          maxWidth: gridSize === 5 ? '380px' : '310px'
        }}
      >
        {cards.map(card => {
          let cardStyle = 'border-brand-violet/20 hover:border-brand-cyan/40 bg-bg-space/85';
          if (card.selected) {
            cardStyle = card.isCorrectSelection
              ? 'bg-brand-green/20 border-brand-green/70 text-brand-green glow-cyan scale-95'
              : 'bg-brand-red/20 border-brand-red/70 text-brand-red scale-95';
          }

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.selected || !isPlaying}
              className={`aspect-square w-14 md:w-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all duration-200 cursor-pointer focus:outline-none ${cardStyle}`}
            >
              {/* Marcas de arriba */}
              {renderTicks(card.ticksAbove, 'above')}

              {/* Letra central */}
              <span className="text-xl font-bold uppercase tracking-tighter leading-none select-none font-sans">
                {card.letter}
              </span>

              {/* Marcas de abajo */}
              {renderTicks(card.ticksBelow, 'below')}
            </button>
          );
        })}
      </div>

      {/* Instrucciones del juego */}
      <div className="pb-4 text-center px-4 w-full border-t border-brand-violet/10 pt-3">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Selecciona únicamente las letras <span className="text-brand-cyan font-black">d</span> que tengan exactamente <span className="text-brand-yellow font-black">2 rayitas</span> en total.
        </p>
        <p className="text-[10px] text-gray-600 mt-1 italic">
          Cuadrícula: {gridSize}x{gridSize} | Las cartas incorrectas o letras "p" reducen la precisión.
        </p>
      </div>

    </div>
  );
};
