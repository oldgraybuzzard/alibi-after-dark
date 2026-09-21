import { ArrowLeft, Check, Clock3, FileText, Lightbulb, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { submitAccusation, submitDeduction } from "@/app/investigations/actions";
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

  const completed = session.status === "completed";
  const ready = mystery.dossier.deductions.every(d => session.solved_deduction_ids.includes(d.id));
  const { data: accusation } = completed
    ? await supabase.from("accusations").select("suspect_id, evidence_ids, reasoning, is_correct").eq("session_id", sessionId).single()
    : { data: null };

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
          <p className="case-stamp">{completed ? "Case closed" : "Investigation active"}</p>
          <h1>{view.title}</h1>
          <p className="case-setting">{view.setting}</p>
          <p className="opening-brief">{view.opening}</p>
          <div className="case-facts">
            <span><Clock3 aria-hidden="true" size={16} /> {view.estimatedMinutes} minutes</span>
            <span><Users aria-hidden="true" size={16} /> {view.suspects.length} suspects</span>
            <span><FileText aria-hidden="true" size={16} /> {view.evidence.length} exhibits available</span>
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
          <div><p className="case-stamp">At the scene</p><h2 id="evidence-heading">Case evidence</h2></div>
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

      <section className="deductions-section" id="accusation" aria-labelledby="accusation-heading">
        <div className="deductions-intro">
          <p className="case-stamp">{completed ? "The sealed answer" : "Close the case"}</p>
          <h2 id="accusation-heading">{completed ? "The final account" : "Make your accusation"}</h2>
        </div>
        {completed && accusation ? (
          <article className="deduction-panel case-reveal">
            <h3>{accusation.is_correct ? "Case solved. Your evidence holds up." : "Case closed. Here is what the record proves."}</h3>
            <p>You accused {view.suspects.find(s => s.id === accusation.suspect_id)?.name}, citing {view.evidence.filter(e => accusation.evidence_ids.includes(e.id)).map(e => e.title).join(" and ")}.</p>
            {accusation.reasoning && <p>Your notes: {accusation.reasoning}</p>}
            <h3>The culprit: {view.suspects.find(s => s.id === mystery.truth.culpritId)?.name}</h3>
            <p>{mystery.truth.explanation}</p>
            <p><strong>Motive:</strong> {mystery.truth.motive}</p>
            <p><strong>Method:</strong> {mystery.truth.method}</p>
            <p><strong>Decisive exhibits:</strong> {view.evidence.filter(e => mystery.dossier.accusation.requiredEvidenceIds.includes(e.id)).map(e => e.title).join(" and ")}.</p>
            {mystery.dossier.accusation.exclusions.map(exclusion => <p key={exclusion.suspectId}><strong>{view.suspects.find(s => s.id === exclusion.suspectId)?.name}:</strong> {exclusion.explanation}</p>)}
            <Link className="back-link" href="/cases">Return to the case library</Link>
          </article>
        ) : completed ? (
          <p role="alert">Your saved result could not be loaded. Reload to try again.</p>
        ) : ready ? (
          <form className="deduction-panel" action={submitAccusation}>
            <input name="sessionId" type="hidden" value={sessionId} />
            <p>This is your final submission. It closes this investigation and reveals the solution, even if your accusation is wrong.</p>
            {requestedResult === "accusation-error" && <p className="case-alert" role="alert">Your accusation was not saved. Choose one suspect and exactly {mystery.dossier.accusation.requiredEvidenceIds.length} different exhibits, then try again.</p>}
            <fieldset>
              <legend>Who did it?</legend>
              <div className="deduction-choices">{view.suspects.map(suspect => <label key={suspect.id}><input name="suspectId" type="radio" required value={suspect.id} /><span>{suspect.name}</span></label>)}</div>
            </fieldset>
            <fieldset>
              <legend>Choose the {mystery.dossier.accusation.requiredEvidenceIds.length} decisive exhibits that connect the culprit and rule out the others.</legend>
              <div className="deduction-choices">{view.evidence.map(exhibit => <label key={exhibit.id}><input name="evidenceId" type="checkbox" value={exhibit.id} /><span>{exhibit.title}</span></label>)}</div>
            </fieldset>
            <label className="accusation-notes">Your reasoning (optional; saved as notes, not graded)<textarea name="reasoning" maxLength={2000} rows={4} /></label>
            <DeductionSubmit final />
          </form>
        ) : <p>Confirm all deductions to unlock your final accusation.</p>}
      </section>
    </main>
  );
}