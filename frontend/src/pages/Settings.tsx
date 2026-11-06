import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  FlaskConical,
  ShieldCheck,
  Cpu,
  User,
  Key,
  Database,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addingDemo, setAddingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const handleRegisterBothDemoTargets = async () => {
    try {
      setAddingDemo(true);
      setDemoMessage(null);

      // Register Vulnerable Target
      await api.targets.create({
        name: 'InsecureBank Demo Target (Vulnerable)',
        base_url: 'http://127.0.0.1:8001',
        description: 'Intentionally vulnerable test API exhibiting BOLA, missing auth, sensitive data exposure, and missing headers.',
        auth_type: 'bearer',
        auth_token: 'Bearer test_account_a_token_alice',
        secondary_auth_token: 'Bearer test_account_b_token_bob',
        timeout_seconds: 8,
        allow_private_ip: true,
        authorization_confirmed: true,
        endpoints: [
          { path: '/api/v1/public/ping', method: 'GET', requires_auth: false, supports_bola_test: false },
          { path: '/api/v1/users/1', method: 'GET', requires_auth: true, supports_bola_test: true, param_account_a: '1', param_account_b: '2' },
          { path: '/api/v1/orders', method: 'GET', requires_auth: true, supports_bola_test: false },
          { path: '/api/v1/search', method: 'GET', requires_auth: false, supports_bola_test: false },
          { path: '/api/v1/admin/export', method: 'POST', requires_auth: false, supports_bola_test: false, body: { records: "not_a_number" } }
        ]
      });

      // Register Secure Target
      await api.targets.create({
        name: 'SecureBank Reference API (Hardened)',
        base_url: 'http://127.0.0.1:8002',
        description: 'Hardened counter-benchmark with JWT validation, BOLA enforcement, security headers, rate limiting, and sanitized outputs.',
        auth_type: 'bearer',
        auth_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFsaWNlIn0.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ',
        secondary_auth_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwibmFtZSI6IkJvYiJ9.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ',
        timeout_seconds: 8,
        allow_private_ip: true,
        authorization_confirmed: true,
        endpoints: [
          { path: '/api/v1/public/ping', method: 'GET', requires_auth: false, supports_bola_test: false },
          { path: '/api/v1/users/1', method: 'GET', requires_auth: true, supports_bola_test: true, param_account_a: '1', param_account_b: '2' },
          { path: '/api/v1/orders', method: 'GET', requires_auth: true, supports_bola_test: false },
          { path: '/api/v1/search', method: 'GET', requires_auth: false, supports_bola_test: false },
        ]
      });

      setDemoMessage('Both demo targets (Vulnerable :8001 and Secure :8002) were registered successfully!');
      setTimeout(() => {
        navigate('/targets');
      }, 1500);
    } catch (err: any) {
      setDemoMessage(err.response?.data?.detail || 'Failed to auto-register demo targets');
    } finally {
      setAddingDemo(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-wide font-mono flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          <span>SETTINGS & DEMONSTRATION LAB GUIDE</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configuration reference, scoring formula documentation, and local laboratory deployment instructions
        </p>
      </div>

      {demoMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-800 text-cyan-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{demoMessage}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center space-x-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span>Analyst Identity & Session</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Username</span>
            <span className="font-bold text-white text-sm">{user?.username}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Email Address</span>
            <span className="font-bold text-cyan-400 text-sm truncate block">{user?.email}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Role / Clearance</span>
            <span className="font-bold text-emerald-400 text-sm uppercase">Security Analyst</span>
          </div>
        </div>
      </div>

      {/* Demo Laboratory Walkthrough */}
      <div className="bg-[#0d1322] border border-cyan-900/40 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Local API Security Laboratory (Phase 3 Benchmark)
            </h3>
          </div>
          <button
            onClick={handleRegisterBothDemoTargets}
            disabled={addingDemo}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{addingDemo ? 'Registering...' : '1-Click Register Demo Targets'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          API Sentinel includes an isolated local API security demonstration laboratory with both an intentionally vulnerable target and a secured counter-version:
        </p>

        <div className="space-y-3 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-red-400 font-bold mb-1">
              <span>Target 1: Vulnerable Demo REST API (:8001)</span>
              <span className="text-[10px] bg-red-950 px-2 py-0.5 rounded border border-red-800">UNSECURED</span>
            </div>
            <p className="text-slate-400 text-[11px] font-sans mb-2">
              Features deliberate BOLA cross-account leaks, missing authentication on <code>/api/v1/orders</code>, password hash/SSN leakage, no security headers, and SQLite error disclosure on quotes.
            </p>
            <div className="p-2 rounded bg-black/60 text-slate-200 text-[11px]">
              python demo-lab/vulnerable-api/app.py
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
              <span>Target 2: Hardened Reference REST API (:8002)</span>
              <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">HARDENED</span>
            </div>
            <p className="text-slate-400 text-[11px] font-sans mb-2">
              Enforces JWT verification, 403 Forbidden BOLA ownership validation, strict HSTS/CSP/nosniff headers, rate limiting (HTTP 429), and DTO response sanitization.
            </p>
            <div className="p-2 rounded bg-black/60 text-slate-200 text-[11px]">
              python demo-lab/secure-api/app.py
            </div>
          </div>
        </div>
      </div>

      {/* Security Posture Scoring Formula Documentation */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security Posture Scoring Formula & Deduction Weights</span>
        </h3>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-cyan-300">
          Base Score = 100.0 <br />
          Score = max(0.0, 100.0 - (Critical x 25.0 + High x 15.0 + Medium x 7.0 + Low x 3.0))
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/40">
            <span className="text-red-400 font-bold block mb-1">Critical (-25 pts)</span>
            <span className="text-[11px] text-slate-400">BOLA/IDOR, Missing Authentication, Token Bypass</span>
          </div>
          <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-900/40">
            <span className="text-orange-400 font-bold block mb-1">High (-15 pts)</span>
            <span className="text-[11px] text-slate-400">Credential Leakage, Insecure CORS Wildcard, SQL Injection error</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
            <span className="text-amber-400 font-bold block mb-1">Medium (-7 pts)</span>
            <span className="text-[11px] text-slate-400">Missing Rate Limiting, Missing HSTS, Verbose Stack Trace</span>
          </div>
          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-900/40">
            <span className="text-sky-400 font-bold block mb-1">Low (-3 pts)</span>
            <span className="text-[11px] text-slate-400">Server Banner Disclosure, Missing CSP or X-Frame-Options</span>
          </div>
        </div>
      </div>
    </div>
  );
};

