export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  created_at: string;
}

export interface EndpointConfig {
  path: string;
  method: string;
  headers?: Record<string, string>;
  query_params?: Record<string, any>;
  body?: any;
  requires_auth?: boolean;
  supports_bola_test?: boolean;
  param_key?: string;
  param_account_a?: string;
  param_account_b?: string;
}

export interface APITarget {
  id: number;
  user_id: number;
  name: string;
  base_url: string;
  description?: string;
  auth_type: string;
  auth_header_key: string;
  has_auth_token: boolean;
  has_secondary_token: boolean;
  timeout_seconds: number;
  documentation_url?: string;
  is_verified: boolean;
  allow_private_ip: boolean;
  endpoints: EndpointConfig[];
  created_at: string;
  updated_at: string;
}

export interface ScanJob {
  id: number;
  target_id: number;
  target_name?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  current_stage: string;
  endpoints_tested_count: number;
  vulnerabilities_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  security_score: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds: number;
  error_message?: string;
}

export interface Vulnerability {
  id: number;
  scan_id: number;
  target_id: number;
  target_name?: string;
  name: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  owasp_category: string;
  endpoint: string;
  http_method: string;
  description: string;
  evidence_summary: string;
  remediation: string;
  status: 'open' | 'resolved' | 'accepted_risk';
  detected_at: string;
}

export interface ReportItem {
  id: number;
  scan_id: number;
  title: string;
  file_path: string;
  file_size_bytes: number;
  security_score: number;
  created_at: string;
}

export interface DashboardStats {
  total_targets: number;
  total_scans: number;
  total_vulnerabilities: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  overall_posture_score: number;
  recent_scans: ScanJob[];
  top_vulnerable_targets: {
    target_id: number;
    target_name: string;
    base_url: string;
    vulnerabilities_count: number;
    last_score: number;
    last_scan_date?: string;
  }[];
}

export interface DashboardActivity {
  date: string;
  scans_count: number;
  findings_count: number;
}

