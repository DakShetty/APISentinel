import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Crosshair,
  Plus,
  Trash2,
  Shield,
  Key,
  Globe,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  FlaskConical,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { EndpointConfig } from '../types';

export const TargetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [authType, setAuthType] = useState('none');
  const [authToken, setAuthToken] = useState('');
  const [authHeaderKey, setAuthHeaderKey] = useState('Authorization');
  const [secondaryAuthToken, setSecondaryAuthToken] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [allowPrivateIp, setAllowPrivateIp] = useState(true);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);

  // Endpoints list
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([
    { path: '/api/v1/public/ping', method: 'GET', requires_auth: false, supports_bola_test: false },
    { path: '/api/v1/users/1', method: 'GET', requires_auth: true, supports_bola_test: true, param_account_a: '1', param_account_b: '2' },
    { path: '/api/v1/orders', method: 'GET', requires_auth: true, supports_bola_test: false },
    { path: '/api/v1/search', method: 'GET', requires_auth: false, supports_bola_test: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      const fetchTarget = async () => {
        try {
          const t = await api.targets.get(parseInt(id));
          setName(t.name);
          setBaseUrl(t.base_url);
          setDescription(t.description || '');
          setAuthType(t.auth_type);
          setAuthHeaderKey(t.auth_header_key);
          setTimeoutSeconds(t.timeout_seconds);
          setDocumentationUrl(t.documentation_url || '');
          setAllowPrivateIp(t.allow_private_ip);
          if (t.endpoints && t.endpoints.length > 0) {
            setEndpoints(t.endpoints);
          }
          setAuthorizationConfirmed(true);
        } catch (err: any) {
          setError('Failed to fetch target data');
        } finally {
          setFetching(false);
        }
      };
      fetchTarget();
    }
  }, [id, isEdit]);

  const addEndpoint = () => {
    setEndpoints((prev) => [
      ...prev,
      { path: '/api/v1/', method: 'GET', requires_auth: true, supports_bola_test: false }
    ]);
  };

  const removeEndpoint = (index: number) => {
    setEndpoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEndpoint = (index: number, field: keyof EndpointConfig, value: any) => {
    setEndpoints((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handlePreloadDemo = (type: 'vulnerable' | 'secure') => {
    if (type === 'vulnerable') {
      setName('InsecureBank Demo Target (Vulnerable)');
      setBaseUrl('http://127.0.0.1:8001');
      setDescription('Academic intentionally vulnerable API demonstrating BOLA, missing auth, sensitive data leaks, and missing headers.');
      setAuthType('bearer');
      setAuthToken('Bearer test_account_a_token_alice');
      setSecondaryAuthToken('Bearer test_account_b_token_bob');
      setAllowPrivateIp(true);
      setAuthorizationConfirmed(true);
      setEndpoints([
        { path: '/api/v1/public/ping', method: 'GET', requires_auth: false, supports_bola_test: false },
        { path: '/api/v1/users/1', method: 'GET', requires_auth: true, supports_bola_test: true, param_account_a: '1', param_account_b: '2' },
        { path: '/api/v1/orders', method: 'GET', requires_auth: true, supports_bola_test: false },
        { path: '/api/v1/search', method: 'GET', requires_auth: false, supports_bola_test: false },
        { path: '/api/v1/admin/export', method: 'POST', requires_auth: false, supports_bola_test: false, body: { records: "not_a_number" } }
      ]);
    } else {
      setName('SecureBank Reference API (Hardened)');
      setBaseUrl('http://127.0.0.1:8002');
      setDescription('Hardened reference target API with proper JWT authentication, BOLA defense, security headers, and rate limiting.');
      setAuthType('bearer');
      // A mock valid JWT with sub=1
      setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFsaWNlIn0.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ');
      setSecondaryAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwibmFtZSI6IkJvYiJ9.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ');
      setAllowPrivateIp(true);
      setAuthorizationConfirmed(true);
      setEndpoints([
        { path: '/api/v1/public/ping', method: 'GET', requires_auth: false, supports_bola_test: false },
        { path: '/api/v1/users/1', method: 'GET', requires_auth: true, supports_bola_test: true, param_account_a: '1', param_account_b: '2' },
        { path: '/api/v1/orders', method: 'GET', requires_auth: true, supports_bola_test: false },
        { path: '/api/v1/search', method: 'GET', requires_auth: false, supports_bola_test: false },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!authorizationConfirmed) {
      setError('You must confirm explicit authorization to test this API target before saving.');
      return;
    }

    setLoading(true);

    const payload = {
      name,
      base_url: baseUrl,
      description,
      auth_type: authType,
      auth_token: authToken || undefined,
      auth_header_key: authHeaderKey,
      secondary_auth_token: secondaryAuthToken || undefined,
      timeout_seconds: timeoutSeconds,
      documentation_url: documentationUrl || undefined,
      allow_private_ip: allowPrivateIp,
      endpoints,
      authorization_confirmed: authorizationConfirmed,
    };

    try {
      if (isEdit && id) {
        await api.targets.update(parseInt(id), payload);
      } else {
        await api.targets.create(payload);
      }
      navigate('/targets');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save API target. Please verify base URL and parameters.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="text-center py-16 text-cyan-400 font-mono text-sm">
        Loading API Target details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            to="/targets"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wide">
              {isEdit ? 'Edit API Target' : 'Register New API Target'}
            </h1>
            <p className="text-xs text-slate-400">
              Configure target boundaries, credentials, and endpoints for automated security auditing
            </p>
          </div>
        </div>

        {/* Demo Lab Pre-Fill Presets */}
        {!isEdit && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handlePreloadDemo('vulnerable')}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Load Vulnerable Demo API</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreloadDemo('secure')}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Load Secure Demo API</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-700/60 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Target Details */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Target Core Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. InsecureBank Customer Orders API"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Base URL *
              </label>
              <input
                type="url"
                required
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://127.0.0.1:8001 or https://api.example.com"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope description, intended audience, and environment notes..."
              className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Documentation URL (Optional)
              </label>
              <input
                type="url"
                value={documentationUrl}
                onChange={(e) => setDocumentationUrl(e.target.value)}
                placeholder="https://api.example.com/docs"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Request Timeout (Seconds)
              </label>
              <input
                type="number"
                min={2}
                max={60}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 10)}
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Authentication & Controlled Test Accounts */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Authentication & Dual-Account BOLA Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Authentication Type
              </label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="none">None / Public Endpoints</option>
                <option value="bearer">Bearer Token (JWT / OAuth)</option>
                <option value="api_key">API Key Header</option>
                <option value="basic">HTTP Basic Authentication</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Header Key Name
              </label>
              <input
                type="text"
                value={authHeaderKey}
                onChange={(e) => setAuthHeaderKey(e.target.value)}
                placeholder="Authorization or X-API-Key"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Primary Account Token (Account A)
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Token or API Key for Account A"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Primary test identity for baseline authenticated calls.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Secondary Account Token (Account B - For BOLA Check)
              </label>
              <input
                type="password"
                value={secondaryAuthToken}
                onChange={(e) => setSecondaryAuthToken(e.target.value)}
                placeholder="Token or API Key for Account B"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Used to test whether Account B can unethically access Account A's resources.
              </span>
            </div>
          </div>
        </div>

        {/* Endpoints & Methods Configuration */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Configured Endpoints ({endpoints.length})</span>
            </h3>
            <button
              type="button"
              onClick={addEndpoint}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Endpoint</span>
            </button>
          </div>

          <div className="space-y-3">
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <select
                    value={ep.method}
                    onChange={(e) => updateEndpoint(idx, 'method', e.target.value)}
                    className="w-24 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold font-mono text-cyan-400"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>

                  <input
                    type="text"
                    required
                    value={ep.path}
                    onChange={(e) => updateEndpoint(idx, 'path', e.target.value)}
                    placeholder="/api/v1/orders"
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white placeholder-slate-500"
                  />

                  <button
                    type="button"
                    onClick={() => removeEndpoint(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800"
                    title="Remove endpoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ep.requires_auth}
                      onChange={(e) => updateEndpoint(idx, 'requires_auth', e.target.checked)}
                      className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
                    />
                    <span>Requires Auth</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ep.supports_bola_test}
                      onChange={(e) => updateEndpoint(idx, 'supports_bola_test', e.target.checked)}
                      className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
                    />
                    <span>Enable BOLA Object Test</span>
                  </label>

                  {ep.supports_bola_test && (
                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span>Resource ID A:</span>
                      <input
                        type="text"
                        value={ep.param_account_a || ''}
                        onChange={(e) => updateEndpoint(idx, 'param_account_a', e.target.value)}
                        placeholder="1"
                        className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center"
                      />
                      <span>ID B:</span>
                      <input
                        type="text"
                        value={ep.param_account_b || ''}
                        onChange={(e) => updateEndpoint(idx, 'param_account_b', e.target.value)}
                        placeholder="2"
                        className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety, SSRF & Authorization Confirmation */}
        <div className="bg-[#0d1322] border border-cyan-900/40 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Safety Restrictions & Authorization Compliance</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPrivateIp}
                onChange={(e) => setAllowPrivateIp(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Allow Local / Internal Network Target:</strong> Permit scanning of localhost or loopback interfaces (e.g. 127.0.0.1 demo laboratory). Cloud metadata addresses (169.254.169.254) remain strictly blocked by SSRF defense filters.
              </span>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40">
              <input
                type="checkbox"
                required
                checked={authorizationConfirmed}
                onChange={(e) => setAuthorizationConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-cyan-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
              />
              <span className="text-xs text-cyan-200 leading-relaxed">
                <strong className="text-white">MANDATORY TESTING AUTHORIZATION:</strong> I explicitly certify that I am the authorized owner of this API target or have received written authorization to conduct automated cybersecurity vulnerability assessments against these endpoints.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <Link
            to="/targets"
            className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg glow-cyan transition-all disabled:opacity-50"
          >
            {loading ? 'Saving Target...' : isEdit ? 'Save Changes' : 'Register Target'}
          </button>
        </div>
      </form>
    </div>
  );
};

