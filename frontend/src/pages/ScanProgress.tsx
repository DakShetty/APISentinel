import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  StopCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { ScanJob } from '../types';

export const ScanProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const scanId = parseInt(id || '0');
  const navigate = useNavigate();

  const [scan, setScan] = useState<ScanJob | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: any = null;

    const pollScanStatus = async () => {
      try {
        const data = await api.scans.get(scanId);
        setScan(data);

        // If completed, wait 800ms to show 100% and redirect to results
        if (data.status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            navigate(`/scans/${scanId}/results`);
          }, 800);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to retrieve scan status');
        clearInterval(interval);
      }
    };

    pollScanStatus();
    interval = setInterval(pollScanStatus, 1200);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanId, navigate]);

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to abort this in-progress security assessment?')) {
      try {
        setCancelling(true);
        await api.scans.cancel(scanId);
        const data = await api.scans.get(scanId);
        setScan(data);
      } catch (err) {
        console.error('Failed to cancel scan', err);
      } finally {
        setCancelling(false);
      }
    }
  };

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cyan-400 font-mono text-sm">
        <Activity className="w-8 h-8 animate-spin mb-3" />
        Connecting to Background Assessment Engine...
      </div>
    );
  }

  const isFinished = scan.status === 'completed';
  const isFailed = scan.status === 'failed';
  const isCancelled = scan.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      {/* Console Card */}
      <div className="bg-[#0c1220] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden glow-blue">
        {/* Pulsing indicator */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 glow-cyan">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  SCAN JOB #{scan.id}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isFinished
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : isFailed
                      ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                      : isCancelled
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 animate-pulse'
                  }`}
                >
                  {scan.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                {scan.target_name || `Target #${scan.target_id}`}
              </h2>
            </div>
          </div>

          {!isFinished && !isFailed && !isCancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              <span>{cancelling ? 'Aborting...' : 'Abort Scan'}</span>
            </button>
          )}
        </div>

        {/* Live Progress Bar */}
        <div className="my-8 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-200">{scan.current_stage || 'Executing checks...'}</span>
            </span>
            <span className="font-bold text-cyan-400 text-base">{scan.progress_percent}%</span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFinished
                  ? 'bg-emerald-500 glow-cyan'
                  : isFailed
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 glow-cyan'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, scan.progress_percent))}%` }}
            />
          </div>
        </div>

        {/* Live Telemetry Tickers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">Endpoints</span>
            <span className="text-base font-bold text-white">{scan.endpoints_tested_count} Tested</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">Findings</span>
            <span className="text-base font-bold text-amber-400">{scan.vulnerabilities_count} Detected</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">Critical / High</span>
            <span className="text-base font-bold text-red-400">
              {scan.critical_count}C / {scan.high_count}H
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">Security Score</span>
            <span className="text-base font-bold text-cyan-400">
              {scan.security_score.toFixed(1)}/100
            </span>
          </div>
        </div>

        {/* Status Callout if failed or cancelled */}
        {isFailed && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Assessment Encountered Error</span>
            </div>
            <p className="font-mono text-[11px]">{scan.error_message || 'Unknown network or execution failure'}</p>
            <div className="pt-2 flex items-center space-x-3">
              <Link to="/scans/new" className="text-cyan-400 underline font-semibold">
                Configure New Scan
              </Link>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Assessment Cancelled by User</span>
            </div>
            <p className="text-[11px] text-slate-400">
              The scan execution thread was safely terminated. Partial findings were preserved in the database.
            </p>
            <div className="pt-2 flex items-center space-x-3">
              <Link to={`/scans/${scan.id}/results`} className="text-cyan-400 underline font-semibold">
                Inspect Partial Results
              </Link>
              <Link to="/scans/new" className="text-slate-300 underline font-semibold">
                Relaunch
              </Link>
            </div>
          </div>
        )}

        {isFinished && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold block">Assessment Complete</span>
                <span className="text-[11px] text-emerald-400/80">Redirecting to full vulnerability results...</span>
              </div>
            </div>
            <Link
              to={`/scans/${scan.id}/results`}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center space-x-1"
            >
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

