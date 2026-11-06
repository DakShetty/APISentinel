import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Play,
  ShieldCheck,
  Crosshair,
  AlertTriangle,
  CheckSquare,
  Square,
  Lock,
  Layers,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { APITarget } from '../types';

export const NewScan: React.FC = () => {
  const [targets, setTargets] = useState<APITarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<number | ''>('');
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Scan module selection
  const [scanModules, setScanModules] = useState<Record<string, boolean>>({
    headers: true,
    auth: true,
    bola: true,
    rate_limiting: true,
    data_exposure: true,
    injection: true,
    misconfiguration: true,
    input_validation: true,
  });

  const moduleDefinitions = [
    { key: 'headers', title: 'HTTP Security Headers', desc: 'HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy', owasp: 'API8:2023' },
    { key: 'auth', title: 'Broken Authentication', desc: 'Missing auth verification on protected routes, invalid/forged token handling', owasp: 'API2:2023' },
    { key: 'bola', title: 'Broken Object Level Authorization (BOLA/IDOR)', desc: 'Dual-token isolation check and object identifier parameter tampering', owasp: 'API1:2023' },
    { key: 'rate_limiting', title: 'Rate Limiting Assessment', desc: 'Controlled request burst to detect missing throttling and RateLimit headers', owasp: 'API4:2023' },
    { key: 'data_exposure', title: 'Excessive Data Exposure', desc: 'Auditing JSON responses for exposed credentials, SSNs, and secret keys', owasp: 'API3:2023' },
    { key: 'injection', title: 'Safe Injection Probing', desc: 'Harmless syntax checks to detect raw database exception signatures and errors', owasp: 'API8:2023' },
    { key: 'misconfiguration', title: 'Security Misconfiguration & CORS', desc: 'Wildcard CORS, technology disclosure banners, verbose stack traces', owasp: 'API8:2023' },
    { key: 'input_validation', title: 'Input Validation & Error Handling', desc: 'Type mismatch, oversized safe values, and malformed payload resilience', owasp: 'API8:2023' },
  ];

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const data = await api.targets.list();
        setTargets(data);

        const targetIdParam = searchParams.get('target_id');
        if (targetIdParam) {
          const matched = data.find((t) => t.id === parseInt(targetIdParam));
          if (matched) {
            setSelectedTargetId(matched.id);
          }
        } else if (data.length > 0) {
          setSelectedTargetId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load targets', err);
      } finally {
        setFetching(false);
      }
    };
    loadTargets();
  }, [searchParams]);

  const toggleModule = (key: string) => {
    setScanModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTargetId) {
      setError('Please select an authorized API target to scan.');
      return;
    }

    if (!authorizationConfirmed) {
      setError('You must explicitly confirm testing authorization prior to executing scan.');
      return;
    }

    const enabledTypes = Object.keys(scanModules).filter((k) => scanModules[k]);
    if (enabledTypes.length === 0) {
      setError('Please select at least one security test module.');
      return;
    }

    setLoading(true);

    try {
      const scanJob = await api.scans.start({
        target_id: Number(selectedTargetId),
        authorization_confirmed: authorizationConfirmed,
        scan_types: enabledTypes,
      });

      // Navigate to live scan progress monitor
      navigate(`/scans/${scanJob.id}/progress`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize security assessment.');
      setLoading(false);
    }
  };

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);

  if (fetching) {
    return (
      <div className="text-center py-16 text-cyan-400 font-mono text-sm">
        Initializing scan controller and targets...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
          <Play className="w-6 h-6 text-cyan-400 fill-current" />
          <span>LAUNCH AUTOMATED SECURITY ASSESSMENT</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Execute controlled, non-destructive vulnerability checks across OWASP API Security Top 10
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-700/60 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {targets.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-8 text-center shadow-lg">
          <h3 className="text-base font-bold text-white mb-2">No Targets Available to Scan</h3>
          <p className="text-xs text-slate-400 mb-4">
            You must first register an authorized API target before initiating a security assessment.
          </p>
          <Link
            to="/targets/new"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan"
          >
            <span>Register New Target</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleLaunch} className="space-y-6">
          {/* Target Selection */}
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>Select Authorized Target Scope</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target API
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.base_url} ({t.endpoints?.length || 0} endpoints)
                  </option>
                ))}
              </select>
            </div>

            {selectedTarget && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Base Endpoint URL</span>
                  <span className="font-mono text-cyan-400 font-semibold truncate block">
                    {selectedTarget.base_url}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Authentication Method</span>
                  <span className="font-mono text-white uppercase font-semibold">
                    {selectedTarget.auth_type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Configured Endpoints</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedTarget.endpoints?.length || 0} Routes
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Module Selection */}
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Security Check Modules ({Object.values(scanModules).filter(Boolean).length}/8 Selected)</span>
              </h3>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScanModules({ headers: true, auth: true, bola: true, rate_limiting: true, data_exposure: true, injection: true, misconfiguration: true, input_validation: true })}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {moduleDefinitions.map((mod) => {
                const isSelected = scanModules[mod.key];
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 select-none ${
                      isSelected
                        ? 'bg-cyan-950/20 border-cyan-800/60 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="mt-0.5 text-cyan-400">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-white">{mod.title}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {mod.owasp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{mod.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Authorization & Safety Agreement */}
          <div className="bg-[#0d1322] border border-cyan-900/50 rounded-2xl p-6 shadow-lg space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={authorizationConfirmed}
                onChange={(e) => setAuthorizationConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-cyan-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
              />
              <span className="text-xs text-cyan-200 leading-relaxed">
                <strong className="text-white">AFFIRMATION OF TESTING PERMISSION:</strong> I confirm that I possess explicit authorization from the target owner to execute automated security scanning. Testing will run as a background task using controlled, non-destructive, rate-bounded probes.
              </span>
            </label>
          </div>

          {/* Launch Button */}
          <div className="flex items-center justify-end space-x-3">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !authorizationConfirmed}
              className="px-7 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg glow-cyan flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Initializing Assessment...' : 'Start Assessment'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

