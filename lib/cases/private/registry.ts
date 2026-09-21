import "server-only";

import type { MysteryCase } from "../schema";
import { midnightLedger } from "./midnight-ledger";

const cases = new Map<string, MysteryCase>([
  [`${midnightLedger.id}:${midnightLedger.version}`, midnightLedger],
]);

export function registeredCase(caseId: string, version: number) {
  return cases.get(`${caseId}:${version}`);
}