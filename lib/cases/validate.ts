import { CaseSchema, TruthSchema, type MysteryCase, type Truth } from "./schema";

export type ValidationReport = { valid: boolean; issues: string[] };
const report = (issues: string[]): ValidationReport => ({ valid: issues.length === 0, issues });
function duplicates(values: string[], label: string, issues: string[]) {
  if (new Set(values).size !== values.length) issues.push(`Duplicate ${label} IDs.`);
}
function references(values: string[], known: Set<string>, label: string, issues: string[]) {
  for (const value of values) if (!known.has(value)) issues.push(`Unknown ${label}: ${value}.`);
  duplicates(values, `${label} reference`, issues);
}
export function validateTruth(input: unknown): ValidationReport {
  const parsed = TruthSchema.safeParse(input);
  if (!parsed.success) return report(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
  const t: Truth = parsed.data;
  const issues: string[] = [];
  const suspects = new Set(t.suspects.map(s => s.id));
  duplicates(t.suspects.map(s => s.id), "suspect", issues);
  duplicates(t.timeline.map(e => e.id), "event", issues);
  references([t.culpritId], suspects, "culprit", issues);
  t.timeline.forEach((event, index) => {
    references(event.actorIds, suspects, "event actor", issues);
    if (index && event.minute <= t.timeline[index - 1].minute) issues.push("Timeline must be strictly chronological.");
  });
  const innocent = new Set(t.suspects.filter(s => s.id !== t.culpritId).map(s => s.id));
  references(t.proofPlan.exclusions.map(e => e.suspectId), innocent, "planned exclusion", issues);
  const planned = new Set(t.proofPlan.exclusions.map(e => e.suspectId));
  for (const suspect of innocent) if (!planned.has(suspect)) issues.push(`Missing planned exclusion for ${suspect}.`);
  const eventIds = new Set(t.timeline.map(e => e.id));
  for (const exclusion of t.proofPlan.exclusions) references(exclusion.eventIds, eventIds, "exclusion event", issues);
  return report(issues);
}

export function validateCase(input: unknown): ValidationReport {
  const parsed = CaseSchema.safeParse(input);
  if (!parsed.success) return report(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
  const c: MysteryCase = parsed.data;
  const issues = [...validateTruth(c.truth).issues];
  const { evidence, deductions, accusation } = c.dossier;
  const evidenceIds = new Set(evidence.map(e => e.id));
  const deductionIds = new Set(deductions.map(d => d.id));
  const eventIds = new Set(c.truth.timeline.map(e => e.id));
  duplicates(evidence.map(e => e.id), "evidence", issues);
  duplicates(deductions.map(d => d.id), "deduction", issues);
  for (const e of evidence) {
    references(e.eventIds, eventIds, "truth event", issues);
    if (e.releaseAfterDeductionId) references([e.releaseAfterDeductionId], deductionIds, "release deduction", issues);
  }
  for (const d of deductions) {
    references(d.requiredEvidenceIds, evidenceIds, "deduction evidence", issues);
    duplicates(d.choices.map(c => c.id), "choice", issues);
    references([d.correctChoiceId], new Set(d.choices.map(c => c.id)), "correct choice", issues);
  }
  references(accusation.requiredEvidenceIds, evidenceIds, "accusation evidence", issues);
  const innocent = new Set(c.truth.suspects.filter(s => s.id !== c.truth.culpritId).map(s => s.id));
  const excluded = new Set(accusation.exclusions.map(e => e.suspectId));
  references(accusation.exclusions.map(e => e.suspectId), innocent, "excluded suspect", issues);
  for (const suspect of innocent) if (!excluded.has(suspect)) issues.push(`Missing exclusion for ${suspect}.`);
  for (const e of accusation.exclusions) references(e.evidenceIds, evidenceIds, "exclusion evidence", issues);

  // Simulate structural reachability, assuming players solve available deductions.
  // This catches deadlocks; it cannot establish whether the prose is a fair puzzle.
  const reachable = new Set(evidence.filter(e => e.releaseAfterDeductionId === null).map(e => e.id));
  if (reachable.size < 2) issues.push("At least two opening clues are required.");
  const solved = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of deductions) {
      if (!solved.has(d.id) && d.requiredEvidenceIds.every(id => reachable.has(id))) {
        solved.add(d.id);
        changed = true;
      }
    }
    for (const e of evidence) {
      if (!reachable.has(e.id) && e.releaseAfterDeductionId && solved.has(e.releaseAfterDeductionId)) {
        reachable.add(e.id);
        changed = true;
      }
    }
  }
  for (const e of evidence) if (!reachable.has(e.id)) issues.push(`Unreachable evidence: ${e.id}.`);
  for (const d of deductions) if (!solved.has(d.id)) issues.push(`Unreachable deduction: ${d.id}.`);
  return report(issues);
}
