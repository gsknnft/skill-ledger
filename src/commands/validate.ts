import type {
  ManifestValidationIssue,
  ManifestValidationResult,
  SkillLedgerEntry,
  SkillLedgerManifest,
} from "../types.js";

const SCOPES = new Set(["global", "repo", "workspace"]);
const ACTIONS = new Set(["allow", "review", "block"]);
const SEVERITIES = new Set(["safe", "caution", "danger"]);

function issue(
  issues: ManifestValidationIssue[],
  severity: ManifestValidationIssue["severity"],
  path: string,
  message: string,
): void {
  issues.push({ severity, path, message });
}

function validateEntry(
  entry: SkillLedgerEntry,
  index: number,
  issues: ManifestValidationIssue[],
): void {
  const path = `skills[${index}]`;

  if (!entry.id) issue(issues, "error", `${path}.id`, "entry id is required");
  if (!entry.source) issue(issues, "error", `${path}.source`, "source is required");
  if (!SCOPES.has(entry.scope)) {
    issue(issues, "error", `${path}.scope`, "scope must be global, repo, or workspace");
  }
  if (!entry.installedAt) {
    issue(issues, "error", `${path}.installedAt`, "installedAt timestamp is required");
  }
  if (!/^sha256-[0-9a-f]{64}$/i.test(entry.integrity)) {
    issue(issues, "error", `${path}.integrity`, "integrity must be sha256-<64 hex chars>");
  }
  if (!entry.scanner?.name) {
    issue(issues, "error", `${path}.scanner.name`, "scanner name is required");
  }
  if (!entry.scanner?.version) {
    issue(issues, "error", `${path}.scanner.version`, "scanner version is required");
  }
  if (!entry.scanner?.reportVersion) {
    issue(issues, "error", `${path}.scanner.reportVersion`, "scanner reportVersion is required");
  }
  if (!ACTIONS.has(entry.scan?.recommendedAction)) {
    issue(
      issues,
      "error",
      `${path}.scan.recommendedAction`,
      "recommendedAction must be allow, review, or block",
    );
  }
  if (!SEVERITIES.has(entry.scan?.severity)) {
    issue(issues, "error", `${path}.scan.severity`, "severity must be safe, caution, or danger");
  }
  if (typeof entry.scan?.riskScore !== "number") {
    issue(issues, "error", `${path}.scan.riskScore`, "riskScore must be a number");
  }
  if (entry.scan?.recommendedAction === "allow" && entry.scan?.safeToInstall !== true) {
    issue(
      issues,
      "warning",
      `${path}.scan.safeToInstall`,
      "allow entries should set safeToInstall=true",
    );
  }
}

export function validateManifest(manifest: SkillLedgerManifest): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = [];

  if (manifest.version !== "skill-ledger.manifest.v1") {
    issue(issues, "warning", "version", "manifest version is not skill-ledger.manifest.v1");
  }
  if (!Array.isArray(manifest.skills)) {
    issue(issues, "error", "skills", "skills must be an array");
    return { valid: false, issues };
  }

  const seenIds = new Map<string, number>();
  manifest.skills.forEach((entry, index) => {
    validateEntry(entry, index, issues);
    if (entry.id) {
      const previous = seenIds.get(entry.id);
      if (previous !== undefined) {
        issue(
          issues,
          "warning",
          `skills[${index}].id`,
          `duplicate id also appears at skills[${previous}].id`,
        );
      } else {
        seenIds.set(entry.id, index);
      }
    }
  });

  return {
    valid: !issues.some((item) => item.severity === "error"),
    issues,
  };
}
