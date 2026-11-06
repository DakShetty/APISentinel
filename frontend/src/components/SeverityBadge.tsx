import React from 'react';

interface SeverityBadgeProps {
  severity: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const sev = severity.toLowerCase();

  const styles: Record<string, { bg: string; text: string; border: string }> = {
    critical: {
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-600/40',
    },
    high: {
      bg: 'bg-orange-950/60',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
    },
    medium: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
    },
    low: {
      bg: 'bg-sky-950/60',
      text: 'text-sky-400',
      border: 'border-sky-500/40',
    },
    informational: {
      bg: 'bg-slate-900/80',
      text: 'text-slate-400',
      border: 'border-slate-700/50',
    },
  };

  const current = styles[sev] || styles.informational;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium uppercase tracking-wider rounded-md border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {severity}
    </span>
  );
};

