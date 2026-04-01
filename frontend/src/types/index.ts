/* ── TypeScript types for the LearnForge platform ─────────── */

/* ── Auth ────────────────────────────────────────────────────── */
export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  xp_total: number;
  current_streak: number;
  longest_streak: number;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/* ── Learning Content ────────────────────────────────────────── */
export interface PathSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  icon: string | null;
  language_key: string | null;
  total_sections: number;
  completed_sections: number;
}

export interface Section {
  id: string;
  title: string;
  content_type: 'lesson' | 'quiz' | 'coding_challenge';
  body_markdown: string | null;
  code_snippet: string | null;
  choices: Record<string, string> | null;
  explanation: string | null;
  test_cases: TestCase[] | null;
  points_value: number;
  order: number;
  completed: boolean;
  user_score: number;
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface ModuleDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  sections: Section[];
}

export interface PathDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  icon: string | null;
  language_key: string | null;
  modules: ModuleDetail[];
}

/* ── Quiz / Code Submission ──────────────────────────────────── */
export interface SubmitAnswerRequest {
  section_id: string;
  answer: string;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  xp_earned: number;
  new_xp_total: number;
  streak: number;
  achievements_unlocked: string[];
}

export interface CodeExecuteRequest {
  language: string;
  version?: string;
  code: string;
  section_id?: string;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface CodeExecuteResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out?: boolean;
  test_results: TestCaseResult[] | null;
  passed: number | null;
  total: number | null;
  xp_earned: number;
  achievements_unlocked: string[];
}

/* ── Leaderboard ─────────────────────────────────────────────── */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp_total: number;
  current_streak: number;
  achievement_count: number;
}

/* ── Achievements ────────────────────────────────────────────── */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
}

/* ── Language Config ─────────────────────────────────────────── */
export interface LanguageConfig {
  key: string;
  label: string;
  color: string;
  pistonId: string;
  pistonVersion: string;
  monacoLang: string;
  boilerplate: string;
}

export const LANGUAGES: Record<string, LanguageConfig> = {
  python: {
    key: 'python',
    label: 'Python',
    color: '#3776ab',
    pistonId: 'python',
    pistonVersion: '3.10',
    monacoLang: 'python',
    boilerplate: '# Write your solution here\n\n',
  },
  javascript: {
    key: 'javascript',
    label: 'JavaScript',
    color: '#f7df1e',
    pistonId: 'javascript',
    pistonVersion: '15.10',
    monacoLang: 'javascript',
    boilerplate: '// Write your solution here\n\n',
  },
  cpp: {
    key: 'cpp',
    label: 'C++',
    color: '#00599c',
    pistonId: 'c++',
    pistonVersion: '10.2.0',
    monacoLang: 'cpp',
    boilerplate: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n',
  },
  go: {
    key: 'go',
    label: 'Go',
    color: '#00add8',
    pistonId: 'go',
    pistonVersion: '1.16',
    monacoLang: 'go',
    boilerplate: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println()\n}\n',
  },
  rust: {
    key: 'rust',
    label: 'Rust',
    color: '#ce422b',
    pistonId: 'rust',
    pistonVersion: '1.68',
    monacoLang: 'rust',
    boilerplate: 'fn main() {\n    // Write your solution here\n    \n}\n',
  },
  lua: {
    key: 'lua',
    label: 'Lua',
    color: '#000080',
    pistonId: 'lua',
    pistonVersion: '5.4',
    monacoLang: 'lua',
    boilerplate: '-- Write your solution here\n\n',
  },
};

/* ── Labs ─────────────────────────────────────────────────────── */
export type LabProtocol = 'ssh' | 'vnc' | 'rdp' | 'web' | 'novnc';
export type LabStatus = 'queued' | 'provisioning' | 'running' | 'stopping' | 'stopped' | 'failed';
export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LabCategory = 'web_hacking' | 'linux' | 'privilege_escalation' | 'cve_exploitation' | 'network' | 'vm';

export interface LabTemplate {
  id: string;
  name: string;
  slug: string;
  docker_image: string;
  protocol: LabProtocol;
  internal_port: number;
  default_credentials: Record<string, string>;
  difficulty: LabDifficulty;
  category: LabCategory;
  description: string;
  tutorial_markdown: string;
  icon: string | null;
  xp_reward: number;
}

export interface LabTemplateSummary {
  id: string;
  name: string;
  slug: string;
  protocol: LabProtocol;
  difficulty: LabDifficulty;
  category: LabCategory;
  description: string;
  icon: string | null;
  xp_reward: number;
}

export interface Lab {
  id: string;
  user_id: string;
  template_id: string;
  status: LabStatus;
  container_id: string | null;
  web_url: string | null;
  queue_position: number | null;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  stopped_at: string | null;
  template: LabTemplateSummary;
}

export interface LabStatusEvent {
  status: LabStatus;
  web_url: string | null;
  queue_position: number | null;
  expires_at: string | null;
  progress_pct: number | null;
  progress_stage: string | null;
}
