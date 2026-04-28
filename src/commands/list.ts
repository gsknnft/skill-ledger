import type {
  ManifestListFormat,
  SkillLedgerEntry,
  SkillLedgerManifest,
} from "../types.js";

function truncate(input: string | undefined, max: number): string {
  const value = input ?? "";
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function pad(input: string, width: number): string {
  return input.padEnd(width, " ");
}

function action(entry: SkillLedgerEntry): string {
  return entry.scan?.recommendedAction ?? "review";
}

export function formatManifestTable(manifest: SkillLedgerManifest): string {
  const rows = manifest.skills.map((entry) => ({
    id: truncate(entry.id, 28),
    name: truncate(entry.name ?? entry.id, 24),
    scope: entry.scope,
    action: action(entry),
    risk: String(entry.scan?.riskScore ?? 0),
    source: truncate(entry.source, 48),
  }));

  const widths = {
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    name: Math.max(4, ...rows.map((row) => row.name.length)),
    scope: Math.max(5, ...rows.map((row) => row.scope.length)),
    action: Math.max(6, ...rows.map((row) => row.action.length)),
    risk: Math.max(4, ...rows.map((row) => row.risk.length)),
    source: Math.max(6, ...rows.map((row) => row.source.length)),
  };

  const header = [
    pad("id", widths.id),
    pad("name", widths.name),
    pad("scope", widths.scope),
    pad("action", widths.action),
    pad("risk", widths.risk),
    pad("source", widths.source),
  ].join("  ");

  const separator = [
    "-".repeat(widths.id),
    "-".repeat(widths.name),
    "-".repeat(widths.scope),
    "-".repeat(widths.action),
    "-".repeat(widths.risk),
    "-".repeat(widths.source),
  ].join("  ");

  const body = rows.map((row) =>
    [
      pad(row.id, widths.id),
      pad(row.name, widths.name),
      pad(row.scope, widths.scope),
      pad(row.action, widths.action),
      pad(row.risk, widths.risk),
      pad(row.source, widths.source),
    ].join("  "),
  );

  return [header, separator, ...body].join("\n");
}

export function formatManifestMarkdown(manifest: SkillLedgerManifest): string {
  const lines = [
    "# Skill Ledger",
    "",
    `Generated: ${manifest.generatedAt ?? "unknown"}`,
    `Source: ${manifest.sourceId ?? "unspecified"}`,
    `Total skills: ${manifest.skills.length}`,
    "",
    "| ID | Name | Scope | Action | Risk | Source |",
    "| --- | --- | --- | --- | ---: | --- |",
  ];

  for (const entry of manifest.skills) {
    lines.push(
      `| ${entry.id} | ${entry.name ?? entry.id} | ${entry.scope} | ${action(entry)} | ${entry.scan?.riskScore ?? 0} | ${entry.source} |`,
    );
  }

  return lines.join("\n");
}

export function formatManifest(
  manifest: SkillLedgerManifest,
  format: ManifestListFormat = "table",
): string {
  if (format === "json") return JSON.stringify(manifest, null, 2);
  if (format === "markdown") return formatManifestMarkdown(manifest);
  return formatManifestTable(manifest);
}
