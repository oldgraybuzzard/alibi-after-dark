import { CaseSchema, DossierSchema, ReviewSchema, TruthSchema, type Dossier, type MysteryCase, type Review, type Truth } from "../cases/schema";
import { validateCase, validateTruth } from "../cases/validate";
import { reviewView } from "../cases/player-view";

export interface CaseProvider {
  truth(premise: string, signal: AbortSignal): Promise<Truth>;
  dossier(truth: Truth, feedback: string[], signal: AbortSignal): Promise<Dossier>;
  review(view: ReturnType<typeof reviewView>, signal: AbortSignal): Promise<Review>;
}
export type GenerationResult = {
  status: "needs-playtest" | "quarantined";
  candidate: MysteryCase | null;
  review: Review | null;
  attempts: number;
  issues: string[];
};

export async function generateCase(provider: CaseProvider, options: {
  id: string; premise: string; maxAttempts?: number; timeoutMs?: number;
}): Promise<GenerationResult> {
  const maxAttempts = options.maxAttempts ?? 2;
  const timeoutMs = options.timeoutMs ?? 180_000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) throw new Error("Use one or two attempts.");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) throw new Error("Timeout must be 1–300000 ms.");
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(options.id)) throw new Error("Invalid case ID.");
  if (!options.premise.trim() || options.premise.length > 2000) throw new Error("Premise must be 1–2000 characters.");
  const signal = AbortSignal.timeout(timeoutMs);
  const truth = TruthSchema.parse(await provider.truth(options.premise, signal));
  const truthReport = validateTruth(truth);
  if (!truthReport.valid) return { status: "quarantined", candidate: null, review: null, attempts: 0, issues: truthReport.issues };
  let candidate: MysteryCase | null = null;
  let review: Review | null = null;
  let issues: string[] = [];
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    signal.throwIfAborted();
    // Repairs regenerate only the dossier: the underlying truth is immutable.
    const dossier = DossierSchema.parse(await provider.dossier(structuredClone(truth), issues, signal));
    candidate = CaseSchema.parse({ schemaVersion: 3, id: options.id, version: 1, truth, dossier });
    review = null;
    issues = validateCase(candidate).issues;
    if (!issues.length) {
      review = ReviewSchema.parse(await provider.review(reviewView(candidate), signal));
      if (review.inferredCulpritId !== truth.culpritId) issues.push("Blind reviewer did not infer the intended culprit.");
      if (!review.uniquelySolvable || review.alternateSuspectIds.length) issues.push("Blind reviewer found the solution ambiguous.");
      issues.push(...review.contradictions, ...review.unsupportedAssumptions, ...review.qualityIssues);
      const checks = new Map(review.deductionChecks.map(check => [check.deductionId, check]));
      if (checks.size !== review.deductionChecks.length || review.deductionChecks.some(check => !dossier.deductions.some(d => d.id === check.deductionId))) {
        issues.push("Reviewer returned duplicate or unknown deduction checks.");
      }
      for (const d of dossier.deductions) {
        const check = checks.get(d.id);
        if (!check || !check.supported || check.inferredChoiceId !== d.correctChoiceId) {
          issues.push(`Deduction ${d.id} is not independently supported by its required clues.`);
        }
        if (check) {
          issues.push(...check.issues.map(issue => `${d.id}: ${issue}`));
          if (check.evidenceIds.length < 2 || new Set(check.evidenceIds).size !== check.evidenceIds.length || check.evidenceIds.some(id => !d.requiredEvidenceIds.includes(id))) {
            issues.push(`Deduction ${d.id} review must cite distinct required clues only.`);
          }
        }
      }
      const evidenceIds = new Set(dossier.evidence.map(e => e.id));
      const innocent = new Set(truth.suspects.filter(s => s.id !== truth.culpritId).map(s => s.id));
      const excluded = new Set(review.exclusions.map(e => e.suspectId));
      if (excluded.size !== review.exclusions.length) issues.push("Reviewer repeated an exclusion.");
      for (const suspect of innocent) if (!excluded.has(suspect)) issues.push(`Reviewer could not rule out ${suspect} using evidence.`);
      for (const exclusion of review.exclusions) {
        if (!innocent.has(exclusion.suspectId)) issues.push(`Reviewer excluded an invalid suspect: ${exclusion.suspectId}.`);
        if (exclusion.evidenceIds.some(id => !evidenceIds.has(id))) issues.push(`Reviewer cited missing exclusion evidence for ${exclusion.suspectId}.`);
      }
      if (new Set(review.supportingEvidenceIds).size < 2 || review.supportingEvidenceIds.some(id => !evidenceIds.has(id))) {
        issues.push("Reviewer must cite at least two distinct, existing clues.");
      }
    }
    if (!issues.length) return { status: "needs-playtest", candidate, review, attempts, issues };
    if (attempts === maxAttempts) return { status: "quarantined", candidate, review, attempts, issues };
  }
  throw new Error("Generation ended unexpectedly.");
}
