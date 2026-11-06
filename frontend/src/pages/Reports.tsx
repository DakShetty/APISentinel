import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Plus,
  Clock,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { ReportItem, ScanJob } from '../types';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<number | ''>('');

  const fetchReportsAndScans = async () => {
    try {
      setLoading(true);
      const [reps, scs] = await Promise.all([api.reports.list(), api.scans.list()]);
      setReports(reps);
      setScans(scs.filter((s) => s.status === 'completed'));
      if (scs.length > 0) {
        setSelectedScanId(scs[0].id);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndScans();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScanId) return;

    try {
      setGenerating(true);
      const newReport = await api.reports.generate(Number(selectedScanId));
      setReports((prev) => [newReport, ...prev]);
      await api.reports.downloadPdf(newReport.id, `API_Sentinel_Report_Scan_${selectedScanId}.pdf`);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            <span>PDF SECURITY ASSESSMENT REPORTS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Download professional, board-ready executive security evaluation reports with remediation roadmaps
          </p>
        </div>

        <button
          onClick={fetchReportsAndScans}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Generate Report Quick Bar */}
      {scans.length > 0 && (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Generate New PDF Assessment Report
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any completed assessment to compile findings, charts, and recommendations into a formatted PDF.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="flex items-center space-x-2">
            <select
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  Scan #{s.id} — {s.target_name} ({s.security_score.toFixed(1)}/100)
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={generating || !selectedScanId}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generating ? 'Compiling PDF...' : 'Generate & Download'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
          Generated Report Documents ({reports.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-cyan-400 font-mono text-sm">
            Loading generated reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No PDF reports generated yet. Select a completed scan above or click "Download PDF Report" from any scan results page.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                      PDF DOCUMENT
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Score: <strong className="text-emerald-400">{report.security_score.toFixed(1)}/100</strong>
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      • {formatFileSize(report.file_size_bytes)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white tracking-tight">{report.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Generated: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => api.reports.downloadPdf(report.id, `API_Sentinel_Report_${report.id}.pdf`)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

