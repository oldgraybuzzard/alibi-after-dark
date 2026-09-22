"use server";

import { createClient } from "@/lib/supabase/server";
import { registeredCase } from "@/lib/cases/private/registry";
import { availableHint } from "@/lib/cases/hints";

export async function requestHint(sessionId: string, deductionId: string, tier: number): Promise<{ hint?: string; error?: string }> {
  if (typeof sessionId !== "string" || typeof deductionId !== "string" || !Number.isInteger(tier) || tier < 0 || tier > 2) return { error: "That hint is unavailable." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { error: "Sign in again to request a hint." };
  const { data: session } = await supabase.from("investigation_sessions")
    .select("case_id, case_version, mode, status, solved_deduction_ids, assigned_evidence_ids, shared_evidence_ids")
    .eq("id", sessionId).eq("user_id", auth.claims.sub).single();
  if (!session || session.mode !== "solo" || session.status !== "active") return { error: "That hint is unavailable." };
  const mystery = registeredCase(session.case_id, session.case_version);
  if (!mystery) return { error: "That hint is unavailable." };
  const hint = availableHint(mystery, { mode: "solo", assignedEvidenceIds: session.assigned_evidence_ids, sharedEvidenceIds: session.shared_evidence_ids, solvedDeductionIds: session.solved_deduction_ids }, deductionId, tier);
  return hint ? { hint } : { error: "That hint is unavailable." };
}
