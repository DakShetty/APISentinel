import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Crosshair,
  Plus,
  Play,
  Trash2,
  Edit,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Clock,
  Key
} from 'lucide-react';
import { api } from '../services/api';
import { APITarget } from '../types';

export const Targets: React.FC = () => {
  const [targets, setTargets] = useState<APITarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<number, any>>({});

  const fetchTargets = async () => {
    try {
      const data = await api.targets.list();
      setTargets(data);
    } catch (err) {
      console.error('Failed to load targets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await api.targets.verify(id);
      setVerifyResults((prev) => ({ ...prev, [id]: res }));
      // refresh list to show verified status
      await fetchTargets();
    } catch (err: any) {
      setVerifyResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err.response?.data?.detail || 'Verification error' },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove target '${name}' and all associated scans?`)) {
      try {
        await api.targets.delete(id);
        setTargets((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        console.error('Failed to delete target', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
            <Crosshair className="w-6 h-6 text-cyan-400" />
            <span>API TARGET MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Register, configure endpoints, and verify connectivity of authorized API scopes
          </p>
        </div>

        <Link
          to="/targets/new"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Target</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-cyan-400 font-mono text-sm">
          Loading authorized API targets...
        </div>
      ) : targets.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xl">
          <div className="p-3 bg-cyan-950/50 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-cyan-400 mb-4 border border-cyan-800/40">
            <Crosshair className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">No API Targets Registered</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Register your authorized REST API base URL to start automated vulnerability scanning.
            You can also pre-load the local intentionally vulnerable demo lab target.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <Link
              to="/targets/new"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan transition-all"
            >
              Configure Target
            </Link>
            <Link
              to="/settings"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Demo Lab Guide
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {targets.map((target) => {
            const vResult = verifyResults[target.id];

            return (
              <div
                key={target.id}
                className="bg-[#0d1322] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{target.name}</h3>
                      <p className="text-xs font-mono text-cyan-400 truncate max-w-[220px]" title={target.base_url}>
                        {target.base_url}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        target.is_verified
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {target.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>

                  {target.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {target.description}
                    </p>
                  )}

                  <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>Auth Type:</span>
                      </span>
                      <span className="font-mono text-white uppercase text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {target.auth_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span>Configured Endpoints:</span>
                      </span>
                      <span className="font-mono font-bold text-cyan-400">
                        {target.endpoints?.length || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Timeout Limit:</span>
                      </span>
                      <span className="font-mono text-slate-300">{target.timeout_seconds}s</span>
                    </div>
                  </div>

                  {/* Verification result snippet */}
                  {vResult && (
                    <div
                      className={`mt-3 p-2.5 rounded-lg text-xs font-mono ${
                        vResult.success
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                          : 'bg-red-950/40 text-red-300 border border-red-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold mb-1">
                        {vResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{vResult.success ? 'Connectivity Verified' : 'Connection Failed'}</span>
                      </div>
                      <p className="text-[11px] truncate">{vResult.message}</p>
                      {vResult.server_header && (
                        <p className="text-[10px] text-slate-400 mt-1">Server: {vResult.server_header}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleVerify(target.id)}
                    disabled={verifyingId === target.id}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${verifyingId === target.id ? 'animate-spin' : ''}`} />
                    <span>{verifyingId === target.id ? 'Probing...' : 'Verify'}</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <Link
                      to={`/targets/${target.id}/edit`}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Edit target"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(target.id, target.name)}
                      className="p-1.5 rounded hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/scans/new?target_id=${target.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Scan</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

