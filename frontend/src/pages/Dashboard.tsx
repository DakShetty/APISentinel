import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Crosshair,
  Scan,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  Play,
  Plus,
  Eye,
  History,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, DashboardActivity } from '../types';
import { StatCard } from '../components/StatCard';
import { ScoreMeter } from '../components/ScoreMeter';
import { SeverityBadge } from '../components/SeverityBadge';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, actData] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getActivity(7)
        ]);
        setStats(statsData);
        setActivity(actData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
        Querying Security Telemetry & Database Records...
      </div>
    );
  }

  const sev = stats?.severity_breakdown || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  const chartData = [
    { name: 'Critical', count: sev.critical, color: '#ef4444' },
    { name: 'High', count: sev.high, color: '#f97316' },
    { name: 'Medium', count: sev.medium, color: '#f59e0b' },
    { name: 'Low', count: sev.low, color: '#06b6d4' },
    { name: 'Info', count: sev.informational, color: '#64748b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono">
            SECURITY OPERATIONS CONSOLE
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time API posture telemetry, vulnerability counts, and assessment execution
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2.5">
          <Link
            to="/targets/new"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Target</span>
          </Link>
          <Link
            to="/scans/new"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md glow-cyan transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Scan</span>
          </Link>
          <Link
            to="/vulnerabilities"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Findings</span>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Targets"
          value={stats?.total_targets ?? 0}
          subtitle="Monitored API Endpoints"
          icon={Crosshair}
          variant="cyan"
          badge="Live Scope"
        />
        <StatCard
          title="Total Scans Executed"
          value={stats?.total_scans ?? 0}
          subtitle="Automated Assessments"
          icon={Scan}
          variant="blue"
          badge="Background Workers"
        />
        <StatCard
          title="Total Findings"
          value={stats?.total_vulnerabilities ?? 0}
          subtitle="OWASP Top 10 Weaknesses"
          icon={ShieldAlert}
          variant={stats?.total_vulnerabilities && stats.total_vulnerabilities > 0 ? "red" : "emerald"}
          badge={stats?.total_vulnerabilities && stats.total_vulnerabilities > 0 ? "Action Required" : "Secure Baseline"}
        />
        <StatCard
          title="Critical Findings"
          value={sev.critical}
          subtitle="Immediate Remediation SLA"
          icon={AlertOctagon}
          variant={sev.critical > 0 ? "red" : "emerald"}
          badge="Tier 1 Priority"
        />
      </div>

      {/* Security Posture & Vulnerability Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Posture Score Meter */}
        <div className="lg:col-span-4 bg-[#0d1322] border border-slate-800/90 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Aggregated Security Posture
            </span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <ScoreMeter score={stats?.overall_posture_score ?? 100} size={170} />
          <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 max-w-xs leading-relaxed">
            Derived from active database scan findings with severity-weighted deductions.
          </div>
        </div>

        {/* Severity Distribution Bar Chart */}
        <div className="lg:col-span-4 bg-[#0d1322] border border-slate-800/90 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Vulnerability Severity Distribution
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center pt-2 border-t border-slate-800">
            {chartData.map((d) => (
              <div key={d.name} className="text-[10px]">
                <div className="font-bold text-white">{d.count}</div>
                <div className="text-slate-400">{d.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Activity Over Time */}
        <div className="lg:col-span-4 bg-[#0d1322] border border-slate-800/90 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Assessment Activity (7 Days)
            </span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="scans_count" name="Scans" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#scansGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800">
            Aggregated test runs performed across authorized targets
          </p>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-[#0d1322] border border-slate-800/90 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Recent Security Assessments
            </h3>
          </div>
          <Link
            to="/scans/history"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
          >
            <span>View Full Scan History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.recent_scans && stats.recent_scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#090d16] text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Scan ID</th>
                  <th className="py-2.5 px-3">Target Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Findings</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stats.recent_scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                      #{scan.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {scan.target_name || `Target #${scan.target_id}`}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
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
                    <td className="py-3 px-3 font-bold font-mono">
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
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                        <span className="text-red-400 font-bold">{scan.critical_count}C</span>
                        <span className="text-orange-400 font-bold">{scan.high_count}H</span>
                        <span className="text-amber-400 font-bold">{scan.medium_count}M</span>
                        <span className="text-cyan-400">{scan.low_count}L</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {scan.duration_seconds}s
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/scans/${scan.id}/results`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] transition-colors"
                      >
                        <span>View Results</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            No assessments executed yet. Click{' '}
            <Link to="/scans/new" className="text-cyan-400 underline font-semibold">
              Start Scan
            </Link>{' '}
            to launch an automated audit.
          </div>
        )}
      </div>
    </div>
  );
};

