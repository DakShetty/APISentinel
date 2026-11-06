import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Download,
  GitCompare,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { ScanJob, Vulnerability, ReportItem } from '../types';
import { ScoreMeter } from '../components/ScoreMeter';
import { SeverityBadge } from '../components/SeverityBadge';
import { VulnerabilityModal } from '../components/VulnerabilityModal';

export const ScanResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const scanId = parseInt(id || '0');

  const [scan, setScan] = useState<ScanJob | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scanData, vulnsData] = await Promise.all([
          api.scans.get(scanId),
          api.scans.getResults(scanId),
        ]);
        setScan(scanData);
        setVulnerabilities(vulnsData);
      } catch (err) {
        console.error('Failed to load scan results', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [scanId]);

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      const rep = await api.reports.generate(scanId);
      setGeneratedReport(rep);
      // Trigger authorized PDF download
      await api.reports.downloadPdf(rep.id, `API_Sentinel_Report_Scan_${scanId}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF report', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const filteredVulns = vulnerabilities.filter((v) => {
    if (severityFilter === 'all') return true;
    return v.severity.toLowerCase() === severityFilter.toLowerCase();
  });

  if (loading) {
    return (
      <div className="text-center py-20 text-cyan-400 font-mono text-sm">
        Compiling vulnerability findings and score report...
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        Scan record not found.{' '}
        <Link to="/scans/history" className="text-cyan-400 underline">
          View History
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Report Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            to="/scans/history"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                ASSESSMENT REPORT #{scan.id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'Recent'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-mono uppercase tracking-wide">
              {scan.target_name || `Target #${scan.target_id}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to={`/scans/compare?scan_b=${scan.id}`}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Scan</span>
          </Link>

          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{generatingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Score and Findings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Posture Score Widget */}
        <div className="lg:col-span-4 bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
            ASSESSED POSTURE SCORE
          </span>
          <ScoreMeter score={scan.security_score} size={160} />
          <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 max-w-xs">
            Evaluated across {scan.endpoints_tested_count} endpoint routes in {scan.duration_seconds}s.
          </div>
        </div>

        {/* Severity Metrics */}
        <div className="lg:col-span-8 bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Vulnerability Findings Breakdown
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {vulnerabilities.length} TOTAL DETECTIONS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
            <div
              onClick={() => setSeverityFilter('critical')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'critical' ? 'ring-2 ring-red-500' : ''
              } bg-red-950/20 border-red-900/40`}
            >
              <span className="text-red-400 text-xs font-bold uppercase tracking-wider block">Critical</span>
              <span className="text-2xl font-black text-red-400 font-mono">{scan.critical_count}</span>
              <span className="text-[10px] text-slate-400 block mt-1">-25 pts each</span>
            </div>

            <div
              onClick={() => setSeverityFilter('high')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'high' ? 'ring-2 ring-orange-500' : ''
              } bg-orange-950/20 border-orange-900/40`}
            >
              <span className="text-orange-400 text-xs font-bold uppercase tracking-wider block">High</span>
              <span className="text-2xl font-black text-orange-400 font-mono">{scan.high_count}</span>
              <span className="text-[10px] text-slate-400 block mt-1">-15 pts each</span>
            </div>

            <div
              onClick={() => setSeverityFilter('medium')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'medium' ? 'ring-2 ring-amber-500' : ''
              } bg-amber-950/20 border-amber-900/40`}
            >
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider block">Medium</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{scan.medium_count}</span>
              <span className="text-[10px] text-slate-400 block mt-1">-7 pts each</span>
            </div>

            <div
              onClick={() => setSeverityFilter('low')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'low' ? 'ring-2 ring-cyan-500' : ''
              } bg-cyan-950/20 border-cyan-900/40`}
            >
              <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider block">Low</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{scan.low_count}</span>
              <span className="text-[10px] text-slate-400 block mt-1">-3 pts each</span>
            </div>

            <div
              onClick={() => setSeverityFilter('informational')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                severityFilter === 'informational' ? 'ring-2 ring-slate-400' : ''
              } bg-slate-900/40 border-slate-800`}
            >
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Info</span>
              <span className="text-2xl font-black text-slate-400 font-mono">{scan.info_count}</span>
              <span className="text-[10px] text-slate-500 block mt-1">0 pts</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Filter view: <strong className="text-white uppercase">{severityFilter}</strong></span>
            {severityFilter !== 'all' && (
              <button
                onClick={() => setSeverityFilter('all')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
              >
                Reset Filter (Show All)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vulnerabilities List */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Detected Vulnerabilities ({filteredVulns.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click any finding to inspect evidence, OWASP classification & remediation
          </span>
        </div>

        {filteredVulns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No vulnerabilities match the current filter selection.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredVulns.map((vuln) => (
              <div
                key={vuln.id}
                onClick={() => setSelectedVuln(vuln)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1.5 pr-4">
                  <div className="flex items-center space-x-2.5">
                    <SeverityBadge severity={vuln.severity} size="sm" />
                    <span className="text-xs font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                      {vuln.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {vuln.owasp_category}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {vuln.name}
                  </h4>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {vuln.http_method}
                    </span>
                    <span className="text-slate-300 truncate max-w-md">{vuln.endpoint}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      vuln.status === 'resolved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : vuln.status === 'accepted_risk'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {vuln.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vulnerability Modal */}
      {selectedVuln && (
        <VulnerabilityModal
          vulnerability={selectedVuln}
          onClose={() => setSelectedVuln(null)}
          onStatusUpdated={(updated) => {
            setVulnerabilities((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
            setSelectedVuln(updated);
          }}
        />
      )}
    </div>
  );
};

