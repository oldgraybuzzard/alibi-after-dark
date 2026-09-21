import test from "node:test";
import assert from "node:assert/strict";
import { zodTextFormat } from "openai/helpers/zod";
import { TruthSchema, DossierSchema, ReviewSchema, type MysteryCase } from "../lib/cases/schema";
import { validateCase } from "../lib/cases/validate";
import { playerView, reviewView } from "../lib/cases/player-view";
import { midnightLedger } from "../lib/cases/private/midnight-ledger";
import { generateCase, type CaseProvider } from "../lib/generation/pipeline";

// Deliberately minimal structural fixture, not a playable or AI-generated mystery.
function fixture(): MysteryCase {
  return {
    schemaVersion: 2, id: "test-case", version: 1,
    truth: {
      title: "Test case", setting: "An inn", culpritId: "a", motive: "A private motive",
      method: "A private method", explanation: "PRIVATE_REVEAL",
      proofPlan: { crimeWindow: "PRIVATE_WINDOW", culpritEvidence: "PRIVATE_PROOF_PLAN",
        exclusions: ["b", "c"].map(suspectId => ({ suspectId, eventIds: ["event-0"], observableProof: "PRIVATE_EXCLUSION" })),
      },
      suspects: ["a", "b", "c"].map(id => ({ id, name: id.toUpperCase(), publicBio: "Guest", secret: "PRIVATE_SECRET" })),
      timeline: [0, 1, 2, 3].map(n => ({ id: `event-${n}`, minute: n, actorIds: ["a"], fact: `Private fact ${n}` })),
    },
    dossier: {
      opening: "Something vanished.", difficulty: "medium", estimatedMinutes: 20,
      evidence: [0, 1, 2, 3, 4, 5].map(n => ({
        id: `e-${n}`, title: `Clue ${n}`, kind: "record", content: `Content ${n}`, source: "Archive",
        eventIds: ["event-0"], releaseAfterDeductionId: n >= 4 ? "d-1" : null,
        openingDelivery: n === 0 ? "distributed" : "shared",
      })),
      deductions: [0, 1].map(n => ({ id: `d-${n}`, question: `Question ${n}`,
        requiredEvidenceIds: n === 0 ? ["e-0", "e-1"] : ["e-2", "e-3"],
        choices: ["one", "two", "three"].map(id => ({ id, label: id })),
        correctChoiceId: "one", explanation: "PRIVATE_DEDUCTION", hints: ["hint 1", "hint 2", "hint 3"],
      })),
      accusation: { requiredEvidenceIds: ["e-4", "e-5"], culpritProof: "PRIVATE_PROOF",
        exclusions: ["b", "c"].map(suspectId => ({ suspectId, evidenceIds: ["e-4"], explanation: "Excluded by record" })),
      },
    },
  };
}
function provider(): CaseProvider {
  return {
    truth: async () => fixture().truth,
    dossier: async () => fixture().dossier,
    review: async () => ({ inferredCulpritId: "a", supportingEvidenceIds: ["e-4", "e-5"], uniquelySolvable: true,
      contradictions: [], unsupportedAssumptions: [], alternateSuspectIds: [], qualityIssues: [],
      deductionChecks: fixture().dossier.deductions.map(d => ({ deductionId: d.id, inferredChoiceId: d.correctChoiceId, supported: true, evidenceIds: d.requiredEvidenceIds, issues: [] })), exclusions: ["b", "c"].map(suspectId => ({ suspectId, evidenceIds: ["e-4"], reasoning: "Record excludes suspect" })), reasoning: "Evidence supports A" }),
  };
}

test("schemas can be converted to strict API output formats", () => {
  for (const schema of [TruthSchema, DossierSchema, ReviewSchema]) assert.equal(zodTextFormat(schema, "test").strict, true);
});
test("valid structural fixture passes", () => assert.equal(validateCase(fixture()).valid, true));
test("hand-authored training case passes structural admission", () => {
  assert.deepEqual(validateCase(midnightLedger), { valid: true, issues: [] });
});
test("training case opening projection keeps private and gated data server-side", () => {
  const view = playerView(midnightLedger, {
    mode: "solo",
    assignedEvidenceIds: [],
    sharedEvidenceIds: [],
    solvedDeductionIds: [],
  });
  assert.equal(view.evidence.length, 4);
  const raw = JSON.stringify(view);
  for (const hidden of ["culpritId", "secret", "correctChoiceId", "glove-fiber-report", "full-camera-review"]) {
    assert.ok(!raw.includes(hidden));
  }
});
test("rejects malformed input", () => assert.equal(validateCase({}).valid, false));
test("rejects unknown evidence and duplicate references", () => {
  const c = fixture(); c.dossier.accusation.requiredEvidenceIds = ["absent", "absent"];
  assert.ok(validateCase(c).issues.some(i => i.includes("Unknown accusation")));
  assert.ok(validateCase(c).issues.some(i => i.includes("Duplicate")));
});
test("rejects duplicate IDs, invalid answers, and reversed time", () => {
  const c = fixture(); c.dossier.evidence[1].id = "e-0";
  c.dossier.deductions[0].correctChoiceId = "absent";
  c.truth.timeline[1].minute = 0;
  const issues = validateCase(c).issues;
  assert.ok(issues.some(i => i.includes("Duplicate evidence")));
  assert.ok(issues.some(i => i.includes("correct choice")));
  assert.ok(issues.some(i => i.includes("chronological")));
});
test("detects circular clue gates", () => {
  const c = fixture(); c.dossier.deductions[1].requiredEvidenceIds = ["e-4", "e-5"];
  assert.ok(validateCase(c).issues.some(i => i.includes("Unreachable")));
});
test("requires an exclusion for every innocent and never the culprit", () => {
  const c = fixture(); c.dossier.accusation.exclusions[0].suspectId = "a";
  const issues = validateCase(c).issues;
  assert.ok(issues.some(i => i.includes("Missing exclusion")));
  assert.ok(issues.some(i => i.includes("Unknown excluded suspect")));
});
test("player projection strips private fields and gates later clues", () => {
  const view = playerView(fixture(), { mode: "solo", assignedEvidenceIds: [], sharedEvidenceIds: [], solvedDeductionIds: [] });
  assert.equal(view.evidence.length, 4);
  const raw = JSON.stringify(view);
  for (const secret of ["PRIVATE_", "correctChoiceId", "culpritId", "eventIds", "requiredEvidenceIds", "hints"]) assert.ok(!raw.includes(secret));
});
test("solved deduction state unlocks evidence without exposing the answer", () => {
  const view = playerView(fixture(), {
    mode: "solo", assignedEvidenceIds: [], sharedEvidenceIds: [], solvedDeductionIds: ["d-1"],
  });
  assert.equal(view.evidence.length, 6);
  assert.equal(view.deductions.find(deduction => deduction.id === "d-1")?.solved, true);
  assert.ok(!JSON.stringify(view).includes("correctChoiceId"));
});
test("group projection requires assignment or sharing for private opening evidence", () => {
  const state = { mode: "group" as const, assignedEvidenceIds: [], sharedEvidenceIds: [], solvedDeductionIds: [] };
  assert.equal(playerView(fixture(), state).evidence.length, 3);
  assert.equal(playerView(fixture(), { ...state, assignedEvidenceIds: ["e-0"] }).evidence.length, 4);
  assert.equal(playerView(fixture(), { ...state, sharedEvidenceIds: ["e-0"] }).evidence.length, 4);
  assert.equal(playerView(fixture(), { ...state, sharedEvidenceIds: ["e-5"] }).evidence.length, 3);
});
test("blind review gets all evidence but no solution", () => {
  const view = reviewView(fixture());
  assert.equal(view.evidence.length, 6);
  assert.ok(!JSON.stringify(view).includes("PRIVATE_"));
});
test("passing pipeline requires playtesting rather than publication", async () => {
  const result = await generateCase(provider(), { id: "test", premise: "Test" });
  assert.equal(result.status, "needs-playtest"); assert.equal(result.attempts, 1);
});
test("repair stays bounded and preserves truth", async () => {
  const p = provider(); let calls = 0;
  p.dossier = async truth => {
    calls++; assert.equal(truth.culpritId, "a");
    truth.culpritId = "c"; // Provider cannot mutate the pipeline's original truth.
    const d = fixture().dossier;
    if (calls === 1) d.accusation.requiredEvidenceIds = ["missing", "e-0"];
    return d;
  };
  const result = await generateCase(p, { id: "test", premise: "Test" });
  assert.equal(calls, 2); assert.equal(result.status, "needs-playtest");
  assert.equal(result.candidate?.truth.culpritId, "a");
});
test("ambiguous or wrong blind solutions are quarantined after at most two attempts", async () => {
  const p = provider(); let calls = 0;
  p.review = async () => {
    calls++; return { inferredCulpritId: "b", supportingEvidenceIds: ["e-4", "e-5"], uniquelySolvable: false,
      contradictions: [], unsupportedAssumptions: [], alternateSuspectIds: ["a"], qualityIssues: [], deductionChecks: [], exclusions: [], reasoning: "Ambiguous" };
  };
  const result = await generateCase(p, { id: "test", premise: "Test" });
  assert.equal(result.status, "quarantined"); assert.equal(calls, 2);
});
test("invalid truth stops before dossier generation", async () => {
  const p = provider();
  p.truth = async () => ({ ...fixture().truth, culpritId: "missing" });
  p.dossier = async () => { throw new Error("Must not be called"); };
  assert.equal((await generateCase(p, { id: "test", premise: "Test" })).status, "quarantined");
});
test("invalid limits fail before any API work", async () => {
  await assert.rejects(generateCase(provider(), { id: "test", premise: "Test", maxAttempts: 3 }));
  await assert.rejects(generateCase(provider(), { id: "test", premise: "Test", timeoutMs: NaN }));
});
test("abort stops generation and is not silently retried", async () => {
  const p = provider();
  p.truth = async (_, signal) => {
    await new Promise(resolve => setTimeout(resolve, 15)); signal.throwIfAborted(); return fixture().truth;
  };
  await assert.rejects(generateCase(p, { id: "test", premise: "Test", timeoutMs: 1 }));
});

test("truth must plan observable exclusions for every innocent", () => {
  const c = fixture(); c.truth.proofPlan.exclusions[0].suspectId = "a";
  assert.ok(validateCase(c).issues.some(i => i.includes("Missing planned exclusion")));
});
test("review cannot pass by guessing culprit without excluding others", async () => {
  const p = provider(); const original = p.review;
  p.review = async (view, signal) => ({ ...await original(view, signal), exclusions: [] });
  const result = await generateCase(p, { id: "test", premise: "Test", maxAttempts: 1 });
  assert.equal(result.status, "quarantined");
  assert.ok(result.issues.some(i => i.includes("could not rule out")));
});
test("review exclusions must cite real clues and valid suspects", async () => {
  const p = provider(); const original = p.review;
  p.review = async (view, signal) => ({ ...await original(view, signal), exclusions: [
    { suspectId: "a", evidenceIds: ["missing"], reasoning: "Invalid" },
    { suspectId: "a", evidenceIds: ["e-4"], reasoning: "Duplicate" },
  ] });
  const result = await generateCase(p, { id: "test", premise: "Test", maxAttempts: 1 });
  assert.equal(result.status, "quarantined");
  assert.ok(result.issues.some(i => i.includes("missing exclusion evidence")));
  assert.ok(result.issues.some(i => i.includes("invalid suspect")));
  assert.ok(result.issues.some(i => i.includes("repeated an exclusion")));
});

test("review packets expose only each deduction's required clues and no answer key", () => {
  const c = fixture(); const view = reviewView(c);
  for (const packet of view.deductionPackets) {
    const deduction = c.dossier.deductions.find(d => d.id === packet.deductionId)!;
    assert.deepEqual(packet.evidence.map(e => e.id).sort(), [...deduction.requiredEvidenceIds].sort());
    assert.ok(!JSON.stringify(packet).includes("correctChoiceId"));
  }
});
test("missing or unsupported deduction checks block admission", async () => {
  const p = provider(); const original = p.review;
  p.review = async (view, signal) => ({ ...await original(view, signal), deductionChecks: [] });
  const r = await generateCase(p, { id: "test", premise: "Test", maxAttempts: 1 });
  assert.equal(r.status, "quarantined");
  assert.ok(r.issues.some(i => i.includes("not independently supported")));
});
test("deduction review cannot cite future or unrelated clues", async () => {
  const p = provider(); const original = p.review;
  p.review = async (view, signal) => {
    const r = await original(view, signal); r.deductionChecks[0].evidenceIds = ["e-4", "e-5"]; return r;
  };
  const r = await generateCase(p, { id: "test", premise: "Test", maxAttempts: 1 });
  assert.equal(r.status, "quarantined");
  assert.ok(r.issues.some(i => i.includes("required clues only")));
});
test("a narrative quality defect blocks admission despite a correct culprit", async () => {
  const p = provider(); const original = p.review;
  p.review = async (view, signal) => ({ ...await original(view, signal), qualityIssues: ["Snapshots do not cover the full alibi window"] });
  assert.equal((await generateCase(p, { id: "test", premise: "Test", maxAttempts: 1 })).status, "quarantined");
});
