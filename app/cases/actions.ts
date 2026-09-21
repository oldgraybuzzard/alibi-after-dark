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

  const { data: sessionId, error } = await supabase.rpc("start_solo_investigation", {
    requested_case_id: caseId,
    requested_case_version: version,
  });

  if (error || typeof sessionId !== "string") {
    redirect("/cases?error=start");
  }

  redirect(`/investigations/${sessionId}`);
}