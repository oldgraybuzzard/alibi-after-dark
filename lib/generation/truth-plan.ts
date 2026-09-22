import { z } from "zod";
import { TruthSchema, type Truth } from "../cases/schema";

const proof = TruthSchema.shape.proofPlan;
const fact = TruthSchema.shape.timeline.element.shape.fact.describe("A complete narrative sentence stating what happened, who was involved, and relevant location or evidence. Never return just a minute number or event label.");

// The model writes facts for fixed slots; it cannot invent incompatible numeric intervals.
export const TruthDraftSchema = TruthSchema.omit({ timeline: true, proofPlan: true }).extend({
  suspects: TruthSchema.shape.suspects.length(3),
  events: z.object({
    firstAlibiStarts: fact, secondAlibiStarts: fact, lastInventory: fact,
    theft: fact, discovery: fact, alibisEnd: fact,
  }),
  proofPlan: proof.omit({ crimeWindow: true, constraints: true, exclusions: true }).extend({
    constraints: proof.shape.constraints.omit({ crimeStartMinute: true, crimeEndMinute: true, crimeEventId: true }),
    exclusions: z.array(proof.shape.exclusions.element.omit({ startMinute: true, endMinute: true, eventIds: true })).length(2),
  }),
});

export const truthSchedule = {
  origin: "All numeric times are minutes after the same story origin. Prefer elapsed minutes to clock times.",
  firstAlibiStarts: 0, secondAlibiStarts: 5, lastInventory: 20,
  theft: 30, discovery: 40, alibisEnd: 45,
  crimeWindow: "20–40 minutes",
  rules: "The object is confirmed present at minute 20 and missing at minute 40. The first innocent is continuously recorded away from the scene from minute 0 through 45, the second from minute 5 through 45. Both remain there during discovery. No automated theft, accomplice, or preparation by an innocent. Give both records plausible independent provenance. The culprit commits the theft at minute 30 using any required credential already held.",
} as const;

export function compileTruth(input: z.infer<typeof TruthDraftSchema>): Truth {
  const draft = TruthDraftSchema.parse(input);
  const [first, second] = draft.proofPlan.exclusions;
  const event = (id: string, minute: number, actorIds: string[], fact: string) => ({ id, minute, actorIds, fact });
  return TruthSchema.parse({
    ...draft,
    timeline: [
      event("first-alibi", 0, [first.suspectId], draft.events.firstAlibiStarts),
      event("second-alibi", 5, [second.suspectId], draft.events.secondAlibiStarts),
      event("last-inventory", 20, [], draft.events.lastInventory),
      event("theft", 30, [draft.culpritId], draft.events.theft),
      event("discovery", 40, [], draft.events.discovery),
      event("alibis-end", 45, [first.suspectId, second.suspectId], draft.events.alibisEnd),
    ],
    proofPlan: {
      ...draft.proofPlan,
      crimeWindow: "The object was present at minute 20 and discovered missing at minute 40; the crime window is minutes 20–40 from the timeline origin.",
      constraints: { ...draft.proofPlan.constraints, crimeStartMinute: 20, crimeEndMinute: 40, crimeEventId: "theft" },
      exclusions: draft.proofPlan.exclusions.map((exclusion, index) => ({
        ...exclusion, startMinute: index === 0 ? 0 : 5, endMinute: 45,
        eventIds: [index === 0 ? "first-alibi" : "second-alibi", "alibis-end"],
      })),
    },
  });
}
