import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Play,
  GitCompare,
  ArrowRight,
  Clock,
  Crosshair,
  ShieldAlert,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { ScanJob } from '../types';

export const ScanHistory: React.FC = () => {
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const data = await api.scans.list();
        setScans(data);
      } catch (err) {
        console.error('Failed to load scan history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
            <History className="w-6 h-6 text-cyan-400" />
            <span>HISTORICAL SECURITY ASSESSMENTS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete historical audit records, security scores, and findings breakdown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/scans/compare"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Scans</span>
          </Link>
          <Link
            to="/scans/new"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>New Scan</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-cyan-400 font-mono text-sm">
          Loading scan records...
        </div>
      ) : scans.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">No Scan History Found</h3>
          <p className="text-xs text-slate-400 mb-6">
            Execute your first automated assessment against an authorized target to record findings and calculate posture scores.
          </p>
          <Link
            to="/scans/new"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan"
          >
            Launch Assessment
          </Link>
        </div>
      ) : (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#090d16] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Scan ID</th>
                  <th className="py-3 px-4">Target API</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Posture Score</th>
                  <th className="py-3 px-4">Endpoints Tested</th>
                  <th className="py-3 px-4">Severity Breakdown</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      #{scan.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {scan.target_name || `Target #${scan.target_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          scan.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : scan.status === 'running'
                            ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 animate-pulse'
                            : scan.status === 'failed'
                            ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono">
                      <span
                        className={
                          scan.security_score >= 80
                            ? 'text-emerald-400'
                            : scan.security_score >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }
                      >
                        {scan.security_score.toFixed(1)} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {scan.endpoints_tested_count} routes
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                        <span className="text-red-400 font-bold">{scan.critical_count}C</span>
                        <span className="text-orange-400 font-bold">{scan.high_count}H</span>
                        <span className="text-amber-400 font-bold">{scan.medium_count}M</span>
                        <span className="text-cyan-400">{scan.low_count}L</span>
                        <span className="text-slate-400">{scan.info_count}I</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {scan.duration_seconds}s
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'In Progress'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/scans/${scan.id}/results`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-[11px] transition-colors"
                        >
                          <span>Results</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

