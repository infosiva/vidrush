export function parseFindings(rawJson) {
  if (!rawJson || !Array.isArray(rawJson.findings)) {
    throw new Error("parseFindings: input missing a 'findings' array");
  }
  return rawJson.findings.map((f) => ({
    title: f.title,
    explanation: f.explanation,
    severity: f.severity,
    tokensSaved: f.tokensSaved,
    estimatedSavingsUSD: f.estimatedSavingsUSD,
    fix: f.fix ?? null,
  }));
}

export function parseSummary(rawJson) {
  const s = rawJson?.summary;
  if (!s) throw new Error("parseSummary: input missing a 'summary' object");
  return {
    healthScore: s.healthScore,
    healthGrade: s.healthGrade,
    findingCount: s.findingCount,
    potentialSavingsCostUSD: s.potentialSavingsCostUSD,
    potentialSavingsPercent: s.potentialSavingsPercent,
  };
}
