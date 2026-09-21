"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { playerView } from "@/lib/cases/player-view";
import { registeredCase } from "@/lib/cases/private/registry";
import { createClient } from "@/lib/supabase/server";

const safeId = /^[a-z][a-z0-9_-]{0,63}$/;
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function investigationUrl(sessionId: string, result?: "correct" | "incorrect" | "error") {
  const query = result ? `?result=${result}` : "";
  return `/investigations/${sessionId}${query}#deductions`;
}

export async function submitDeduction(formData: FormData) {
  const sessionId = formData.get("sessionId");
  const deductionId = formData.get("deductionId");
  const choiceId = formData.get("choiceId");

  if (
    typeof sessionId !== "string" || !sessionIdPattern.test(sessionId) ||
    typeof deductionId !== "string" || !safeId.test(deductionId) ||
    typeof choiceId !== "string" || !safeId.test(choiceId)
  ) {
    redirect("/cases?error=unavailable");
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") redirect("/");

  const { data: session } = await supabase
    .from("investigation_sessions")
    .select("case_id, case_version, mode, status, solved_deduction_ids, assigned_evidence_ids, shared_evidence_ids")
    .eq("id", sessionId)
    .single();

  if (!session || session.mode !== "solo" || session.status !== "active") {
    redirect(investigationUrl(sessionId, "error"));
  }

  const mystery = registeredCase(session.case_id, session.case_version);
  if (!mystery) redirect(investigationUrl(sessionId, "error"));

  const view = playerView(mystery, {
    mode: "solo",
    assignedEvidenceIds: session.assigned_evidence_ids,
    sharedEvidenceIds: session.shared_evidence_ids,
    solvedDeductionIds: session.solved_deduction_ids,
  });
  const deduction = view.deductions.find(candidate => candidate.id === deductionId && !candidate.solved);
  const choice = deduction?.choices.find(candidate => candidate.id === choiceId);
  if (!deduction || !choice) redirect(investigationUrl(sessionId, "error"));

  const { error } = await supabase.from("deduction_attempts").insert({
    session_id: sessionId,
    user_id: userId,
    deduction_id: deductionId,
    choice_id: choiceId,
  });
  if (error) redirect(investigationUrl(sessionId, "error"));

  const privateDeduction = mystery.dossier.deductions.find(candidate => candidate.id === deductionId);
  const result = privateDeduction?.correctChoiceId === choiceId ? "correct" : "incorrect";
  revalidatePath(`/investigations/${sessionId}`);
  redirect(investigationUrl(sessionId, result));
}

export async function submitAccusation(formData: FormData) {
  const sessionId = formData.get("sessionId");
  const suspectId = formData.get("suspectId");
  const evidenceIds = formData.getAll("evidenceId");
  const reasoning = formData.get("reasoning");
  if (typeof sessionId !== "string" || !sessionIdPattern.test(sessionId)) redirect("/cases?error=unavailable");
  const failureUrl = `/investigations/${sessionId}?result=accusation-error#accusation`;
  if (typeof suspectId !== "string" || !safeId.test(suspectId) ||
      evidenceIds.some(id => typeof id !== "string" || !safeId.test(id)) ||
      typeof reasoning !== "string" || reasoning.length > 2000) redirect(failureUrl);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") redirect("/");
  const { data: session } = await supabase.from("investigation_sessions")
    .select("case_id, case_version, mode, status, solved_deduction_ids, assigned_evidence_ids, shared_evidence_ids")
    .eq("id", sessionId).single();
  if (!session || session.mode !== "solo") redirect(failureUrl);
  if (session.status === "completed") redirect(`/investigations/${sessionId}#accusation`);
  const mystery = registeredCase(session.case_id, session.case_version);
  if (!mystery) redirect(failureUrl);
  const view = playerView(mystery, {
    mode: "solo", assignedEvidenceIds: session.assigned_evidence_ids,
    sharedEvidenceIds: session.shared_evidence_ids, solvedDeductionIds: session.solved_deduction_ids,
  });
  if (!mystery.dossier.deductions.every(d => session.solved_deduction_ids.includes(d.id)) ||
      !view.suspects.some(s => s.id === suspectId) ||
      evidenceIds.length !== mystery.dossier.accusation.requiredEvidenceIds.length ||
      new Set(evidenceIds).size !== evidenceIds.length ||
      !evidenceIds.every(id => view.evidence.some(e => e.id === id))) redirect(failureUrl);
  const { error } = await supabase.from("accusations").insert({
    session_id: sessionId, user_id: userId, suspect_id: suspectId,
    evidence_ids: evidenceIds, reasoning: reasoning.trim(),
  });
  if (error) redirect(failureUrl);
  revalidatePath("/cases");
  revalidatePath(`/investigations/${sessionId}`);
  redirect(`/investigations/${sessionId}#accusation`);
}
