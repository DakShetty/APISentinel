import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Vulnerability, APITarget } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { VulnerabilityModal } from '../components/VulnerabilityModal';

export const Vulnerabilities: React.FC = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [targets, setTargets] = useState<APITarget[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchVulns = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (severity) params.severity = severity;
      if (category) params.category = category;
      if (status) params.status = status;
      if (targetId) params.target_id = parseInt(targetId);

      const [vulnsData, targetsData] = await Promise.all([
        api.vulnerabilities.list(params),
        api.targets.list(),
      ]);
      setVulnerabilities(vulnsData);
      setTargets(targetsData);
    } catch (err) {
      console.error('Failed to load vulnerabilities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulns();
  }, [severity, category, status, targetId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVulns();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSeverity('');
    setCategory('');
    setStatus('');
    setTargetId('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
            <span>CENTRALIZED VULNERABILITY EXPLORER</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query, triage, and filter security findings across all evaluated API targets
          </p>
        </div>

        <button
          onClick={fetchVulns}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Findings</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vulnerability name, affected endpoint, OWASP category or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan transition-all"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
            <option value="Medium">Medium Only</option>
            <option value="Low">Low Only</option>
            <option value="Informational">Informational Only</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Categories</option>
            <option value="BOLA">BOLA / IDOR</option>
            <option value="Broken Authentication">Broken Authentication</option>
            <option value="Data Exposure">Data Exposure</option>
            <option value="Rate Limiting">Rate Limiting</option>
            <option value="Injection">Injection</option>
            <option value="HTTP Headers">HTTP Headers</option>
            <option value="Security Misconfiguration">Security Misconfiguration</option>
            <option value="Input Validation">Input Validation</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open (Active)</option>
            <option value="resolved">Resolved</option>
            <option value="accepted_risk">Accepted Risk</option>
          </select>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Targets</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Findings Results */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Matching Findings ({vulnerabilities.length})
          </span>
          <span className="text-xs text-slate-400">
            Click finding row to view evidence payload and update triage status
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-cyan-400 font-mono text-sm">
            Filtering security findings...
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No vulnerabilities found matching specified search criteria.
          </div>
        ) : (
          <div className="space-y-2.5">
            {vulnerabilities.map((vuln) => (
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
                    <span className="text-[11px] text-slate-500 font-sans">
                      • Target: <strong className="text-slate-300">{vuln.target_name}</strong>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {vuln.name}
                  </h4>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {vuln.http_method}
                    </span>
                    <span className="text-slate-300 truncate max-w-lg">{vuln.endpoint}</span>
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

      {/* Modal */}
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

