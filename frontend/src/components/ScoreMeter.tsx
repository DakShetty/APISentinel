import React from 'react';

interface ScoreMeterProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({ score, size = 160, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 90) return { stroke: '#10b981', text: 'text-emerald-400', grade: 'A', label: 'EXCELLENT' };
    if (val >= 75) return { stroke: '#06b6d4', text: 'text-cyan-400', grade: 'B', label: 'GOOD' };
    if (val >= 50) return { stroke: '#f59e0b', text: 'text-amber-400', grade: 'C', label: 'MODERATE RISK' };
    if (val >= 30) return { stroke: '#f97316', text: 'text-orange-400', grade: 'D', label: 'POOR' };
    return { stroke: '#ef4444', text: 'text-red-500', grade: 'F', label: 'CRITICAL RISK' };
  };

  const status = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Meter */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-extrabold tracking-tight ${status.text}`}>
            {Math.round(score)}
          </span>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
            GRADE {status.grade}
          </span>
        </div>
      </div>
      <span className={`mt-2 text-xs font-bold tracking-widest uppercase ${status.text}`}>
        {status.label}
      </span>
    </div>
  );
};

