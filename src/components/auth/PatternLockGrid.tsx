import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Check, Lock } from 'lucide-react';

interface PatternLockGridProps {
  onPatternComplete: (pattern: string) => void;
  onPatternChange?: (pattern: string) => void;
  initialPattern?: string;
  readOnly?: boolean;
}

export const PatternLockGrid: React.FC<PatternLockGridProps> = ({
  onPatternComplete,
  onPatternChange,
  initialPattern = '',
  readOnly = false,
}) => {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial pattern if provided (e.g., "0-1-2-5-8")
  useEffect(() => {
    if (initialPattern) {
      const parsed = initialPattern
        .split('-')
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 8);
      setSelectedDots(parsed);
    }
  }, [initialPattern]);

  const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const handleDotTouchOrClick = (dotIndex: number) => {
    if (readOnly) return;
    if (!selectedDots.includes(dotIndex)) {
      const nextDots = [...selectedDots, dotIndex];
      setSelectedDots(nextDots);
      const patternStr = nextDots.join('-');
      if (onPatternChange) onPatternChange(patternStr);
      if (nextDots.length >= 4) {
        if (onPatternComplete) onPatternComplete(patternStr);
      }
    }
  };

  const handleReset = () => {
    setSelectedDots([]);
    if (onPatternChange) onPatternChange('');
  };

  // Helper to compute node center positions in percentage for SVG drawing lines
  const getDotCenter = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = col * 33.333 + 16.666;
    const y = row * 33.333 + 16.666;
    return { x, y };
  };

  return (
    <div className="flex flex-col items-center space-y-3 font-mono select-none">
      <div
        ref={containerRef}
        className="relative w-60 h-60 p-4 bg-[#08090d] border border-[#00e5ff]/30 rounded-3xl shadow-[0_0_25px_rgba(0,229,255,0.15)] flex flex-col justify-between"
      >
        {/* SVG overlay to render lines connecting dots */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {selectedDots.map((dotIdx, idx) => {
            if (idx === 0) return null;
            const prevDot = selectedDots[idx - 1];
            const start = getDotCenter(prevDot);
            const end = getDotCenter(dotIdx);
            return (
              <line
                key={`line-${idx}`}
                x1={`${start.x}%`}
                y1={`${start.y}%`}
                x2={`${end.x}%`}
                y2={`${end.y}%`}
                stroke="#00e5ff"
                strokeWidth="4"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_#00e5ff]"
              />
            );
          })}
        </svg>

        {/* 3x3 Dots Grid */}
        <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full z-20">
          {dots.map((dot) => {
            const isSelected = selectedDots.includes(dot);
            const selectionOrder = selectedDots.indexOf(dot) + 1;

            return (
              <button
                key={dot}
                type="button"
                onClick={() => handleDotTouchOrClick(dot)}
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#00e5ff]/20 border-2 border-[#00e5ff] shadow-[0_0_15px_#00e5ff] scale-105'
                    : 'bg-white/[0.03] border border-white/10 hover:border-[#00e5ff]/50 hover:bg-white/[0.08]'
                }`}
              >
                {/* Center dot core */}
                <div
                  className={`w-4 h-4 rounded-full transition-all ${
                    isSelected
                      ? 'bg-[#00e5ff] shadow-[0_0_10px_#00e5ff]'
                      : 'bg-white/40'
                  }`}
                />
                {isSelected && (
                  <span className="absolute top-1 right-1.5 text-[9px] font-bold text-[#00e5ff]">
                    {selectionOrder}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pattern Control bar */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-white/60 font-mono">
          PATTERN: <span className="text-[#00e5ff] font-bold">{selectedDots.join('-') || 'NONE'}</span>
        </span>
        {!readOnly && selectedDots.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center space-x-1"
            title="Reset Pattern"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px]">RESET</span>
          </button>
        )}
      </div>
    </div>
  );
};
