import { ArrowLeft, Check, Clock3, FileText, Lightbulb, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { submitDeduction } from "@/app/investigations/actions";
import { DeductionSubmit } from "@/app/investigations/deduction-submit";
import { playerView } from "@/lib/cases/player-view";
import { registeredCase } from "@/lib/cases/private/registry";
import { createClient } from "@/lib/supabase/server";

type InvestigationPageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ result?: string }>;
};

export default async function InvestigationPage({ params, searchParams }: InvestigationPageProps) {
  const { sessionId } = await params;
  const { result: requestedResult } = await searchParams;
  const result = requestedResult === "correct" || requestedResult === "incorrect" || requestedResult === "error"
    ? requestedResult
    : undefined;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/");

  const { data: session, error } = await supabase
    .from("investigation_sessions")
    .select("id, case_id, case_version, mode, status, solved_deduction_ids, assigned_evidence_ids, shared_evidence_ids")
    .eq("id", sessionId)
    .single();

  if (error || !session) notFound();
  const mystery = registeredCase(session.case_id, session.case_version);
  if (!mystery || session.mode !== "solo") notFound();

  const view = playerView(mystery, {
    mode: "solo",
    assignedEvidenceIds: session.assigned_evidence_ids,
    sharedEvidenceIds: session.shared_evidence_ids,
    solvedDeductionIds: session.solved_deduction_ids,
  });

  return (
    <main className="investigation-shell">
      <header className="investigation-header">
        <Link className="back-link" href="/cases"><ArrowLeft aria-hidden="true" size={17} /> Case library</Link>
        <p>Alibi After Dark</p>
        <form action={signOut}>
          <button className="icon-action icon-action-dark" title="Sign out" type="submit"><LogOut aria-hidden="true" size={18} /><span className="sr-only">Sign out</span></button>
        </form>
      </header>

      <section className="case-opening">
        <div className="opening-copy">
          <p className="case-stamp">Investigation active</p>
          <h1>{view.title}</h1>
          <p className="case-setting">{view.setting}</p>
          <p className="opening-brief">{view.opening}</p>
          <div className="case-facts">
            <span><Clock3 aria-hidden="true" size={16} /> {view.estimatedMinutes} minutes</span>
            <span><Users aria-hidden="true" size={16} /> {view.suspects.length} suspects</span>
            <span><FileText aria-hidden="true" size={16} /> {view.evidence.length} opening exhibits</span>
          </div>
        </div>
        <aside className="suspect-register" aria-labelledby="suspect-heading">
          <p className="register-label" id="suspect-heading">Persons of interest</p>
          {view.suspects.map((suspect, index) => (
            <div className="suspect-row" key={suspect.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{suspect.name}</h2><p>{suspect.publicBio}</p></div>
            </div>
          ))}
        </aside>
      </section>

      <section className="evidence-section" aria-labelledby="evidence-heading">
        <div className="section-heading">
          <div><p className="case-stamp">At the scene</p><h2 id="evidence-heading">Opening evidence</h2></div>
          <span>{view.evidence.length} exhibits released</span>
        </div>
        <div className="evidence-grid">
          {view.evidence.map((exhibit, index) => (
            <article className="evidence-card" key={exhibit.id}>
              <div className="evidence-index">Exhibit {String(index + 1).padStart(2, "0")}</div>
              <h3>{exhibit.title}</h3>
              <p>{exhibit.content}</p>
              <footer><span>{exhibit.kind.replaceAll("-", " ")}</span><cite>{exhibit.source}</cite></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="deductions-section" id="deductions" aria-labelledby="deductions-heading">
        <div className="deductions-intro">
          <p className="case-stamp">Connect the record</p>
          <h2 id="deductions-heading">What does the evidence establish?</h2>
          <p>Test a conclusion against the exhibits. A supported deduction may release another part of the file.</p>
        </div>

        {result && (
          <p className={`deduction-result ${result}`} role="status">
            {result === "correct" && "Deduction confirmed. New evidence has been added to the file."}
            {result === "incorrect" && "That conclusion is not supported yet. Recheck the records and try again."}
            {result === "error" && "The deduction could not be recorded. Reload the case and try again."}
          </p>
        )}

        <div className="deduction-list">
          {view.deductions.map((deduction, index) => (
            <article className={`deduction-panel ${deduction.solved ? "solved" : ""}`} key={deduction.id}>
              <div className="deduction-number">Theory {String(index + 1).padStart(2, "0")}</div>
              {deduction.solved ? (
                <div className="deduction-solved">
                  <Check aria-hidden="true" size={20} />
                  <div><h3>{deduction.question}</h3><p>Confirmed and added to your case record.</p></div>
                </div>
              ) : (
                <form action={submitDeduction}>
                  <input name="sessionId" type="hidden" value={sessionId} />
                  <input name="deductionId" type="hidden" value={deduction.id} />
                  <fieldset>
                    <legend>{deduction.question}</legend>
                    <div className="deduction-choices">
                      {deduction.choices.map(choice => (
                        <label key={choice.id}>
                          <input name="choiceId" required type="radio" value={choice.id} />
                          <span>{choice.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <DeductionSubmit />
                </form>
              )}
            </article>
          ))}
        </div>
        <div className="next-lead"><Lightbulb aria-hidden="true" size={18} /><span>Later leads remain sealed until the evidence supports them.</span></div>
      </section>
    </main>
  );
}