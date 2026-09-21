import { Clock3, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { startSoloInvestigation } from "@/app/cases/actions";
import { StartButton } from "@/app/cases/start-button";
import { createClient } from "@/lib/supabase/server";

type CasesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/");

  const { error: requestedError } = await searchParams;
  const { data: cases, error: catalogError } = await supabase
    .from("case_catalog")
    .select("case_id, version, title, setting, difficulty, estimated_minutes, admission_status")
    .order("created_at", { ascending: true });

  return (
    <main className="cases-shell">
      <header className="library-header">
        <div>
          <p className="eyebrow">Alibi After Dark</p>
          <h1>Case library</h1>
        </div>
        <form action={signOut}>
          <button className="icon-action" title="Sign out" type="submit"><LogOut aria-hidden="true" size={19} /><span className="sr-only">Sign out</span></button>
        </form>
      </header>

      <section className="library-intro">
        <p className="case-stamp">Private case files</p>
        <h2>Choose tonight&apos;s investigation.</h2>
        <p>Each file opens with the evidence available at the scene. What happened remains sealed until you prove it.</p>
      </section>

      {(requestedError || catalogError) && (
        <p className="case-alert" role="alert">
          {catalogError
            ? "The case archive is unavailable. Try again shortly."
            : requestedError === "unavailable"
              ? "That case is no longer available."
              : "The investigation could not be started. Try again."}
        </p>
      )}

      {cases && cases.length > 0 ? (
        <section className="case-grid" aria-label="Available cases">
          {cases.map((mystery) => (
            <article className="case-card" key={`${mystery.case_id}:${mystery.version}`}>
              <div className="case-card-topline">
                <span className="case-number">File {String(mystery.version).padStart(2, "0")}</span>
                <span className={`difficulty difficulty-${mystery.difficulty}`}>{mystery.difficulty}</span>
              </div>
              <div className="case-card-copy">
                <p className="case-stamp">{mystery.admission_status === "training" ? "Training case" : "Cleared for play"}</p>
                <h3>{mystery.title}</h3>
                <p>{mystery.setting}</p>
              </div>
              <div className="case-card-footer">
                <span><Clock3 aria-hidden="true" size={16} />{mystery.estimated_minutes} min</span>
                <form action={startSoloInvestigation}>
                  <input name="caseId" type="hidden" value={mystery.case_id} />
                  <input name="version" type="hidden" value={mystery.version} />
                  <StartButton />
                </form>
              </div>
            </article>
          ))}
        </section>
      ) : !catalogError && (
        <section className="empty-dossier">
          <p className="case-stamp">Archive review in progress</p>
          <h2>No cases have cleared admission.</h2>
          <p>New mysteries will appear here only after structural review and playtesting.</p>
        </section>
      )}
    </main>
  );
}