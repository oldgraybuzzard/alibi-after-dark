import { Clock3, LogOut } from "lucide-react";
import Link from "next/link";
import { registeredCase } from "@/lib/cases/private/registry";
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
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") redirect("/");

  const { error: requestedError } = await searchParams;
  const { data: cases, error: catalogError } = await supabase
    .from("case_catalog")
    .select("case_id, version, title, setting, difficulty, estimated_minutes, admission_status")
    .order("created_at", { ascending: true });
  const { data: sessions, error: sessionsError } = await supabase
    .from("investigation_sessions")
    .select("id, case_id, case_version, status, solved_deduction_ids, updated_at")
    .eq("user_id", userId)
    .eq("mode", "solo")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });

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

      {sessionsError && (
        <p className="case-alert" role="alert">Your saved investigations could not be loaded. Reload this page to try again; your progress is still saved.</p>
      )}

      {sessions && sessions.length > 0 && (
        <section className="saved-investigations" aria-labelledby="saved-heading">
          <p className="case-stamp">Your saved files</p>
          <h2 id="saved-heading">Your investigations</h2>
          <ul className="saved-session-list">
            {sessions.map(session => {
              const mystery = registeredCase(session.case_id, session.case_version);
              const solved = mystery?.dossier.deductions.filter(d => session.solved_deduction_ids.includes(d.id)).length ?? 0;
              return (
                <li key={session.id}>
                  <div>
                    <h3>{mystery?.truth.title ?? "Unavailable case"}</h3>
                    <p>{mystery ? `${solved} of ${mystery.dossier.deductions.length} deductions confirmed` : "This case version is not available right now."}</p>
                    <p>Last saved <time dateTime={session.updated_at}>{new Date(session.updated_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></p>
                  </div>
                  {mystery && <Link className="start-case resume-case" href={`/investigations/${session.id}`} aria-label={`${session.status === "completed" ? "View result for" : "Resume"} ${mystery.truth.title}`}>{session.status === "completed" ? "View result" : "Resume investigation"}</Link>}
                </li>
              );
            })}
          </ul>
        </section>
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