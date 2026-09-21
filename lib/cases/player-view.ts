import type { MysteryCase } from "./schema";

/** Server-side projection. All state arguments must come from trusted session storage. */
export function playerView(c: MysteryCase, state: {
  mode: "solo" | "group";
  assignedEvidenceIds: readonly string[];
  sharedEvidenceIds: readonly string[];
  solvedDeductionIds: readonly string[];
}) {
  const solved = new Set(state.solvedDeductionIds);
  const evidence = c.dossier.evidence.filter(e => {
    if (e.releaseAfterDeductionId !== null) return solved.has(e.releaseAfterDeductionId);
    return state.mode === "solo" || e.openingDelivery === "shared" ||
      state.assignedEvidenceIds.includes(e.id) || state.sharedEvidenceIds.includes(e.id);
  });
  const visible = new Set(evidence.map(e => e.id));
  return {
    id: c.id, version: c.version, title: c.truth.title, setting: c.truth.setting,
    opening: c.dossier.opening, difficulty: c.dossier.difficulty,
    estimatedMinutes: c.dossier.estimatedMinutes,
    suspects: c.truth.suspects.map(s => ({ id: s.id, name: s.name, publicBio: s.publicBio })),
    evidence: evidence.map(e => ({ id: e.id, title: e.title, kind: e.kind, content: e.content, source: e.source })),
    deductions: c.dossier.deductions.filter(d => d.requiredEvidenceIds.every(id => visible.has(id)))
      .map(d => ({ id: d.id, question: d.question, choices: d.choices, solved: solved.has(d.id) })),
  };
}

/** Blind review receives all player-facing clues, never the solution or answer keys. */
export function reviewView(c: MysteryCase) {
  const view = playerView(c, {
    mode: "solo", assignedEvidenceIds: [], sharedEvidenceIds: [],
    solvedDeductionIds: c.dossier.deductions.map(d => d.id),
  });
  return { ...view, deductionPackets: c.dossier.deductions.map(d => ({
    deductionId: d.id, question: d.question, choices: d.choices,
    evidence: view.evidence.filter(e => d.requiredEvidenceIds.includes(e.id)),
  })) };
}
