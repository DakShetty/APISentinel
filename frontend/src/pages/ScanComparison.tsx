import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { ScanJob, Vulnerability } from '../types';
import { ScoreMeter } from '../components/ScoreMeter';
import { SeverityBadge } from '../components/SeverityBadge';

export const ScanComparison: React.FC = () => {
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [scanAId, setScanAId] = useState<number | ''>('');
  const [scanBId, setScanBId] = useState<number | ''>('');

  const [scanA, setScanA] = useState<ScanJob | null>(null);
  const [scanB, setScanB] = useState<ScanJob | null>(null);
  const [vulnsA, setVulnsA] = useState<Vulnerability[]>([]);
  const [vulnsB, setVulnsB] = useState<Vulnerability[]>([]);

  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.scans.list();
        setScans(data);

        const bParam = searchParams.get('scan_b');
        if (data.length >= 2) {
          if (bParam) {
            const bId = parseInt(bParam);
            setScanBId(bId);
            // Default A to the next scan or first scan
            const other = data.find((s) => s.id !== bId);
            if (other) setScanAId(other.id);
          } else {
            setScanAId(data[1].id);
            setScanBId(data[0].id);
          }
        } else if (data.length === 1) {
          setScanAId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load scans', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [searchParams]);

  useEffect(() => {
    if (scanAId && scanBId && scanAId !== scanBId) {
      const loadDetails = async () => {
        try {
          setComparing(true);
          const [sA, vA, sB, vB] = await Promise.all([
            api.scans.get(Number(scanAId)),
            api.scans.getResults(Number(scanAId)),
            api.scans.get(Number(scanBId)),
            api.scans.getResults(Number(scanBId)),
          ]);
          setScanA(sA);
          setVulnsA(vA);
          setScanB(sB);
          setVulnsB(vB);
        } catch (err) {
          console.error('Failed to load comparison data', err);
        } finally {
          setComparing(false);
        }
      };
      loadDetails();
    }
  }, [scanAId, scanBId]);

  // Compute fixed vs new findings
  // Signature: (endpoint, method, name)
  const getSig = (v: Vulnerability) => `${v.endpoint}|${v.http_method}|${v.name}`;
  const sigsA = new Set(vulnsA.map(getSig));
  const sigsB = new Set(vulnsB.map(getSig));

  const resolvedFindings = vulnsA.filter((v) => !sigsB.has(getSig(v)));
  const newFindings = vulnsB.filter((v) => !sigsA.has(getSig(v)));
  const persistentFindings = vulnsB.filter((v) => sigsA.has(getSig(v)));

  const scoreDiff = scanA && scanB ? Math.round((scanB.security_score - scanA.security_score) * 10) / 10 : 0;

  if (loading) {
    return (
      <div className="text-center py-16 text-cyan-400 font-mono text-sm">
        Loading scan comparisons...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
          <GitCompare className="w-6 h-6 text-cyan-400" />
          <span>SECURITY ASSESSMENT COMPARISON</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Evaluate security posture differential, remediation verification, and finding drift across scan runs
        </p>
      </div>

      {scans.length < 2 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl">
          <GitCompare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">At Least 2 Scans Required</h3>
          <p className="text-xs text-slate-400 mb-6">
            Execute at least two security scans (e.g. before and after remediation or comparing the vulnerable demo vs secured demo API) to enable side-by-side posture analysis.
          </p>
          <Link
            to="/scans/new"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan"
          >
            Launch Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scan Selectors */}
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Baseline Assessment (Scan A)
                </label>
                <select
                  value={scanAId}
                  onChange={(e) => setScanAId(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      Scan #{s.id} — {s.target_name} ({s.security_score.toFixed(1)}/100, {s.vulnerabilities_count} findings)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Comparison Assessment (Scan B)
                </label>
                <select
                  value={scanBId}
                  onChange={(e) => setScanBId(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      Scan #{s.id} — {s.target_name} ({s.security_score.toFixed(1)}/100, {s.vulnerabilities_count} findings)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {comparing ? (
            <div className="text-center py-16 text-cyan-400 font-mono text-sm">
              Calculating differential metrics and finding correlation...
            </div>
          ) : scanA && scanB ? (
            <div className="space-y-6">
              {/* Differential KPI Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Posture Score Delta
                  </span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-3xl font-black font-mono ${
                        scoreDiff > 0
                          ? 'text-emerald-400'
                          : scoreDiff < 0
                          ? 'text-red-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
                    </span>
                    {scoreDiff > 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : scoreDiff < 0 ? (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    ) : null}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Baseline: {scanA.security_score.toFixed(1)} → Target: {scanB.security_score.toFixed(1)}
                  </span>
                </div>

                <div className="bg-[#0d1322] border border-emerald-950/60 rounded-2xl p-5 shadow-lg">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                    Remediated Findings
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-400">
                    {resolvedFindings.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Vulnerabilities successfully eliminated
                  </span>
                </div>

                <div className="bg-[#0d1322] border border-red-950/60 rounded-2xl p-5 shadow-lg">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-red-400 block mb-1">
                    New Findings Detected
                  </span>
                  <div className="text-3xl font-black font-mono text-red-400">
                    {newFindings.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    New vulnerabilities introduced in Scan B
                  </span>
                </div>

                <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                    Persistent Findings
                  </span>
                  <div className="text-3xl font-black font-mono text-amber-400">
                    {persistentFindings.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Findings present in both assessments
                  </span>
                </div>
              </div>

              {/* Side-by-Side Posture Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                    SCAN #{scanA.id} — BASELINE ({scanA.target_name})
                  </span>
                  <ScoreMeter score={scanA.security_score} size={150} />
                  <div className="flex items-center justify-center space-x-2 font-mono text-xs mt-3">
                    <span className="text-red-400 font-bold">{scanA.critical_count} Crit</span>
                    <span className="text-orange-400 font-bold">{scanA.high_count} High</span>
                    <span className="text-amber-400 font-bold">{scanA.medium_count} Med</span>
                    <span className="text-cyan-400">{scanA.low_count} Low</span>
                  </div>
                </div>

                <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 text-center shadow-lg">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                    SCAN #{scanB.id} — COMPARISON ({scanB.target_name})
                  </span>
                  <ScoreMeter score={scanB.security_score} size={150} />
                  <div className="flex items-center justify-center space-x-2 font-mono text-xs mt-3">
                    <span className="text-red-400 font-bold">{scanB.critical_count} Crit</span>
                    <span className="text-orange-400 font-bold">{scanB.high_count} High</span>
                    <span className="text-amber-400 font-bold">{scanB.medium_count} Med</span>
                    <span className="text-cyan-400">{scanB.low_count} Low</span>
                  </div>
                </div>
              </div>

              {/* Remediated Vulnerabilities Table */}
              <div className="bg-[#0d1322] border border-emerald-950/60 rounded-2xl p-6 shadow-lg space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold text-sm border-b border-slate-800 pb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Remediated Vulnerabilities ({resolvedFindings.length})</span>
                </div>
                {resolvedFindings.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No remediated findings between these two scans.</p>
                ) : (
                  <div className="space-y-2">
                    {resolvedFindings.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 bg-emerald-950/10 border border-emerald-900/30 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <SeverityBadge severity={v.severity} size="sm" />
                            <span className="font-semibold text-white">{v.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 block text-[11px]">
                            {v.http_method} {v.endpoint}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                          Resolved
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Newly Detected Vulnerabilities */}
              {newFindings.length > 0 && (
                <div className="bg-[#0d1322] border border-red-950/60 rounded-2xl p-6 shadow-lg space-y-3">
                  <div className="flex items-center space-x-2 text-red-400 font-mono font-bold text-sm border-b border-slate-800 pb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>New Findings in Scan B ({newFindings.length})</span>
                  </div>
                  <div className="space-y-2">
                    {newFindings.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 bg-red-950/10 border border-red-900/30 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <SeverityBadge severity={v.severity} size="sm" />
                            <span className="font-semibold text-white">{v.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 block text-[11px]">
                            {v.http_method} {v.endpoint}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-red-400 px-2 py-0.5 rounded bg-red-950 border border-red-800">
                          New Detection
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

