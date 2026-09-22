import type { MysteryCase } from "./schema";
import { playerView } from "./player-view";

/** Call only after loading an owned, active session. Never serialize the full hint list. */
export function availableHint(mystery: MysteryCase, state: Parameters<typeof playerView>[1], deductionId: string, tier: number): string | undefined {
  if (!Number.isInteger(tier) || tier < 0 || tier > 2) return undefined;
  const visible = playerView(mystery, state).deductions;
  if (!visible.some(d => d.id === deductionId && !d.solved)) return undefined;
  return mystery.dossier.deductions.find(d => d.id === deductionId)?.hints[tier];
}
