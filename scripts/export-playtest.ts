import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { CaseSchema } from "../lib/cases/schema";
import { validateCase } from "../lib/cases/validate";

// A paper-style review aid, not the gated interactive game or a catalog admission.
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error("Usage: npm run case:export -- .local/cases/<case-id>.json");
  const root = resolve(".local/cases");
  const path = resolve(args[0]);
  const rel = relative(root, path);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Choose a generated file inside .local/cases.");
  const result = JSON.parse(await readFile(path, "utf8"));
  if (result.status !== "needs-playtest") throw new Error("Only candidates that passed automated checks can be exported.");
  const c = CaseSchema.parse(result.candidate);
  const validation = validateCase(c);
  if (!validation.valid) throw new Error("Candidate no longer passes structural validation.");
  const packet = [
    `# ${c.truth.title}`, "", "## How to test", "",
    "This is an automatically generated development candidate, not a finished game. Time your investigation and note unclear clues. All evidence is included here for a paper-style fairness test; the interactive game will release it in stages. Do not open answer-key.md until you have recorded your accusation and supporting evidence.",
    "", "## Opening", "", c.dossier.opening, "", c.truth.setting, "", "## Suspects", "",
    ...c.truth.suspects.flatMap(s => [`### ${s.name} (${s.id})`, "", s.publicBio, ""]),
    "## Evidence", "",
    ...c.dossier.evidence.flatMap(e => [`### ${e.id}: ${e.title}`, "", `Source: ${e.source}`, "",
      `Release: ${e.releaseAfterDeductionId ? `after ${e.releaseAfterDeductionId}` : "opening"}`, "", e.content, ""]),
    "## Deductions", "",
    ...c.dossier.deductions.flatMap(d => [`### ${d.id}`, "", d.question, "",
      ...d.choices.map(choice => `- ${choice.id}: ${choice.label}`), ""]),
    "## Your accusation", "", "- Who did it?", "- How and why?", "- Which clues establish this?",
    "- What evidence rules out each other suspect?", "", "## Feedback", "",
    "- Time spent:", "- Confidence before reading the answer:", "- Unsupported assumptions or alternative solutions:",
    "- Confusing or contradictory clues:", "- Would you play another case? Why?", "",
  ].join("\n");
  const answers = [
    `# ${c.truth.title} — ANSWER KEY`, "", "SPOILERS: open only after finishing the player packet.", "",
    `Culprit: ${c.truth.suspects.find(s => s.id === c.truth.culpritId)?.name}`, "",
    c.truth.explanation, "", "## Deduction answers", "",
    ...c.dossier.deductions.flatMap(d => [`### ${d.id}: ${d.correctChoiceId}`, "", d.explanation, "",
      `Supporting clues: ${d.requiredEvidenceIds.join(", ")}`, ""]),
    "## Accusation evidence", "", c.dossier.accusation.culpritProof, "",
    `Required clues: ${c.dossier.accusation.requiredEvidenceIds.join(", ")}`, "",
    ...c.dossier.accusation.exclusions.flatMap(e => [`### ${e.suspectId}`, "", e.explanation, "", `Clues: ${e.evidenceIds.join(", ")}`, ""]),
  ].join("\n");
  const output = resolve(".local/playtests", c.id);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "player-packet.md"), packet, { mode: 0o600 });
  await writeFile(resolve(output, "answer-key.md"), answers, { mode: 0o600 });
  console.log(`Player packet: ${output}/player-packet.md`);
  console.log(`Separate answer key: ${output}/answer-key.md`);
}
main().catch(() => {
  console.error("Playtest export failed. Supply one valid needs-playtest candidate under .local/cases; see docs/CASE_GENERATION.md.");
  process.exitCode = 1;
});
