"use client";

import { useActionState, useState } from "react";
import { submitAccusation } from "./actions";
import { DeductionSubmit } from "./deduction-submit";

export function AccusationForm({ sessionId, suspects, evidence, requiredCount }: {
  sessionId: string; suspects: { id: string; name: string }[];
  evidence: { id: string; title: string }[]; requiredCount: number;
}) {
  const [state, action, pending] = useActionState(submitAccusation, {});
  const [suspectId, setSuspectId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");
  return <form className="accusation-form" action={action}>
    <input name="sessionId" type="hidden" value={sessionId} />
    <p className="accusation-warning">This is your final submission. It closes this investigation and reveals the solution, even if your accusation is wrong.</p>
    {state.error && <p className="case-alert" role="alert">{state.error}</p>}
    <fieldset disabled={pending}>
      <legend>Who did it?</legend>
      <div className="deduction-choices">{suspects.map(s => <label key={s.id}><input name="suspectId" type="radio" required value={s.id} checked={suspectId === s.id} onChange={() => setSuspectId(s.id)} /><span>{s.name}</span></label>)}</div>
    </fieldset>
    <fieldset disabled={pending}>
      <legend>What proves your case?</legend>
      <p className="accusation-guidance">Choose {requiredCount} exhibits that connect the culprit and rule out the others.</p>
      <p className="accusation-count" aria-live="polite">{selected.length} of {requiredCount} exhibits selected</p>
      <div className="deduction-choices accusation-evidence">{evidence.map(e => <label key={e.id}><input name="evidenceId" type="checkbox" value={e.id} checked={selected.includes(e.id)} onChange={event => setSelected(event.target.checked ? [...selected, e.id] : selected.filter(id => id !== e.id))} /><span>{e.title}</span></label>)}</div>
    </fieldset>
    <label className="accusation-notes"><span>Your reasoning <span className="accusation-optional">(optional)</span></span><span className="accusation-guidance" id="reasoning-help">Saved with your verdict; not graded.</span><textarea aria-describedby="reasoning-help" name="reasoning" maxLength={2000} rows={4} value={reasoning} onChange={event => setReasoning(event.target.value)} readOnly={pending} /></label>
    <DeductionSubmit final />
  </form>;
}
