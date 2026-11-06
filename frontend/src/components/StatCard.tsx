import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'blue' | 'red' | 'amber' | 'emerald' | 'slate';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  badge,
}) => {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      badge: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      badge: 'bg-blue-950 text-blue-400 border-blue-800',
    },
    red: {
      border: 'border-red-500/20 hover:border-red-500/40',
      iconBg: 'bg-red-500/10 text-red-400',
      badge: 'bg-red-950 text-red-400 border-red-800',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      badge: 'bg-amber-950 text-amber-400 border-amber-800',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      badge: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    slate: {
      border: 'border-slate-700/40 hover:border-slate-600',
      iconBg: 'bg-slate-800 text-slate-300',
      badge: 'bg-slate-800 text-slate-400 border-slate-700',
    },
  };

  const scheme = colorMap[variant];

  return (
    <div
      className={`relative bg-[#0d1322] border rounded-xl p-5 shadow-lg transition-all duration-200 ${scheme.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {badge && (
        <div className="mt-3">
          <span
            className={`inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded border ${scheme.badge}`}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};

