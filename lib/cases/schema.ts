import { z } from "zod";

const text = z.string().min(1).max(4000);
const id = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const ids = z.array(id).max(30);

// These schemas describe private authoring data, never a player API response.
export const TruthSchema = z.object({
  title: text,
  setting: text,
  suspects: z.array(z.object({ id, name: text, publicBio: text, secret: text })).min(3).max(5),
  culpritId: id,
  motive: text,
  method: text,
  timeline: z.array(z.object({
    id,
    minute: z.number().int().min(0).max(10080).describe("Minutes since the beginning of the case timeline; strictly increasing."),
    actorIds: ids,
    fact: text,
  })).min(4).max(12),
  proofPlan: z.object({
    crimeWindow: text,
    constraints: z.object({
      crimeStartMinute: z.number().int().min(0).max(10080),
      crimeEndMinute: z.number().int().min(0).max(10080),
      crimeEventId: id,
      crimeLocationId: id,
      requiredCredentialId: id.nullable(),
      culpritCredentialIds: ids,
    }).describe("Prototype scope: a direct physical crime. All times use the timeline origin; any required credential must be held by the culprit."),
    culpritEvidence: text.describe("Two independent observable facts that identify the culprit, including provenance."),
    exclusions: z.array(z.object({
      suspectId: id,
      eventIds: z.array(id).min(1).max(6),
      startMinute: z.number().int().min(0).max(10080),
      endMinute: z.number().int().min(0).max(10080),
      locationId: id,
      continuousRecord: z.boolean().describe("True only when an independent record establishes uninterrupted presence, not endpoint observations or self-report."),
      observableProof: text.describe("Independent evidence that rules this suspect out for the entire crime window; not demeanor or self-report."),
    })).min(2).max(4),
  }),
  explanation: text,
});
export type Truth = z.infer<typeof TruthSchema>;

export const DossierSchema = z.object({
  opening: text,
  difficulty: z.enum(["easy", "medium", "hard"]),
  estimatedMinutes: z.number().int().min(15).max(30),
  evidence: z.array(z.object({
    id,
    title: text,
    kind: z.enum(["message", "receipt", "record", "statement", "photo-description", "audio-transcript"]),
    content: text,
    source: text,
    eventIds: ids.describe("Truth events this clue concerns; a statement may lie about an event."),
    releaseAfterDeductionId: id.nullable().describe("null means opening evidence; otherwise unlock after this deduction."),
    openingDelivery: z.enum(["shared", "distributed"]).describe("Distributed opening clues are assigned to individual players in groups; solo gets all."),
  })).min(6).max(12),
  deductions: z.array(z.object({
    id,
    question: text,
    requiredEvidenceIds: z.array(id).min(2).max(6),
    choices: z.array(z.object({ id, label: text })).min(3).max(4),
    correctChoiceId: id,
    explanation: text,
    hints: z.array(text).length(3),
  })).min(2).max(4),
  accusation: z.object({
    requiredEvidenceIds: z.array(id).min(2).max(6),
    culpritProof: text,
    exclusions: z.array(z.object({ suspectId: id, evidenceIds: z.array(id).min(1).max(6), explanation: text })).min(2).max(4),
  }),
});
export type Dossier = z.infer<typeof DossierSchema>;
export const CaseSchema = z.object({
  schemaVersion: z.literal(3),
  id,
  version: z.number().int().positive(),
  truth: TruthSchema,
  dossier: DossierSchema,
});
export type MysteryCase = z.infer<typeof CaseSchema>;

export const ReviewSchema = z.object({
  inferredCulpritId: id.nullable(),
  supportingEvidenceIds: ids,
  uniquelySolvable: z.boolean(),
  contradictions: z.array(text).max(12),
  unsupportedAssumptions: z.array(text).max(12),
  alternateSuspectIds: ids,
  deductionChecks: z.array(z.object({
    deductionId: id, inferredChoiceId: id.nullable(), supported: z.boolean(),
    evidenceIds: ids, issues: z.array(text).max(6),
  })).max(4),
  qualityIssues: z.array(text).max(12),
  exclusions: z.array(z.object({
    suspectId: id, evidenceIds: z.array(id).min(1).max(6), reasoning: text,
  })).max(4),
  reasoning: text,
});
export type Review = z.infer<typeof ReviewSchema>;
