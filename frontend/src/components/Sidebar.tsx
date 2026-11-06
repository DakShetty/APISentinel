import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Crosshair,
  PlayCircle,
  ShieldAlert,
  History,
  GitCompare,
  FileText,
  Settings,
  ShieldCheck,
  FlaskConical
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/targets', label: 'API Targets', icon: Crosshair },
    { to: '/scans/new', label: 'New Security Scan', icon: PlayCircle },
    { to: '/vulnerabilities', label: 'Vulnerability Explorer', icon: ShieldAlert },
    { to: '/scans/history', label: 'Scan History', icon: History },
    { to: '/scans/compare', label: 'Scan Comparison', icon: GitCompare },
    { to: '/reports', label: 'Security Reports', icon: FileText },
    { to: '/settings', label: 'Settings & Lab Guide', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-md glow-cyan">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-wider uppercase font-mono">
              API<span className="text-cyan-400">SENTINEL</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Security Assessment Platform
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 text-cyan-400 border border-cyan-800/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Demo Lab Callout Card */}
      <div className="p-4 m-3 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#0b101d] border border-cyan-900/30">
        <div className="flex items-center space-x-2 text-cyan-400 mb-1">
          <FlaskConical className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">Demo Lab Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Vulnerable & secure benchmark targets available on ports 8001 & 8002.
        </p>
      </div>
    </aside>
  );
};

