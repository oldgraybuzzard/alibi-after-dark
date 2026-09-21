"use server";

import { redirect } from "next/navigation";
import { registeredCase } from "@/lib/cases/private/registry";
import { createClient } from "@/lib/supabase/server";

export async function startSoloInvestigation(formData: FormData) {
  const caseId = formData.get("caseId");
  const versionValue = formData.get("version");
  const version = typeof versionValue === "string" ? Number(versionValue) : Number.NaN;

  if (typeof caseId !== "string" || !Number.isInteger(version) || !registeredCase(caseId, version)) {
    redirect("/cases?error=unavailable");
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/");

  const userId = claimsData.claims.sub;
  if (typeof userId !== "string") redirect("/");

  const { data: session, error } = await supabase
    .from("investigation_sessions")
    .insert({ user_id: userId, case_id: caseId, case_version: version })
    .select("id")
    .single();

  if (error || !session) {
    redirect("/cases?error=start");
  }

  redirect(`/investigations/${session.id}`);
}