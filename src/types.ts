
export type SkillLedgerManifest = {
  version: "skill-ledger.manifest.v1" | string;
  generatedAt?: string;
  sourceId?: string;
  skills: SkillLedgerEntry[];
};

export interface SkillLedgerEntry {
  id: string;
  name?: string;
  source: string;
  resolvedUrl?: string | null;
  scope: "global" | "repo" | "workspace";
  installedAt: string;
  updatedAt?: string;
  integrity: string; // e.g., "sha256-<hex>"
  scanner: {
    name: string;
    version: string;
    reportVersion: string;
  };
  scan: {
    safeToInstall: boolean;
    recommendedAction: "allow" | "review" | "block";
    severity: "safe" | "caution" | "danger";
    riskScore: number;
    flagCount: number;
    categories: Record<string, number>;
    mappings: {
      owasp: string[];
      mitreAtlas: string[];
      nistAiRmf: string[];
    };
  };
};

export type ManifestSummary = {
  total: number;
  byScope: { global: number; repo: number; workspace: number } | Record<string, number>;
  duplicates: number;
  duplicateGroups: { key: string; ids: string[] }[];
  changedSinceInstall: number | "unknown";
  missingSkillMd: number | "unknown";
  needsReview: number;
  blocked: number;
};

export type DoctorOptions = {
  checkRemote?: boolean;
  githubToken?: string;
  fetcher?: typeof fetch;
};

export interface DoctorSummary extends ManifestSummary {
  details?: Record<string, any>;
};

export type BuildManifestScope = SkillLedgerEntry["scope"];

export type BuildManifestOptions = {
  scope?: BuildManifestScope;
  sourceId?: string;
  now?: Date | string;
  rootDir?: string;
  verifier?: SkillLedgerVerifier;
};

export type SkillDiscovery = {
  path: string;
  relativePath: string;
  content: string;
};

export type SkillLedgerScanSummary = SkillLedgerEntry["scan"];

export type SkillLedgerVerifierResult = {
  scanner: SkillLedgerEntry["scanner"];
  scan: SkillLedgerScanSummary;
};

export type SkillLedgerVerifier = {
  verify(discovery: SkillDiscovery): Promise<SkillLedgerVerifierResult> | SkillLedgerVerifierResult;
};

export type ManifestValidationIssue = {
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type ManifestValidationResult = {
  valid: boolean;
  issues: ManifestValidationIssue[];
};

export type ManifestListFormat = "table" | "markdown" | "json";
