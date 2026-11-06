import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Play, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#090d16]/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center space-x-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Scanner Engine:</span>
          <span className="text-emerald-400 font-mono font-semibold">ONLINE & PROTECTED</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Link
          to="/scans/new"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch Scan</span>
        </Link>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-mono">
              {user?.username ? user.username[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="font-semibold text-slate-200 leading-none">{user?.username}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-1">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

