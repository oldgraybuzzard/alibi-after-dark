"use client";

import { useState, useTransition } from "react";
import { requestHint } from "./hint-actions";

export function DeductionHints({ sessionId, deductionId }: { sessionId: string; deductionId: string }) {
  const [hints, setHints] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <aside className="deduction-hints" aria-label="Optional hints">
    {hints.length > 0 && <ol aria-live="polite">{hints.map((hint, index) => <li key={index}>{hint}</li>)}</ol>}
    {error && <p role="alert">{error}</p>}
    {hints.length < 3 ? <button className="deduction-submit" type="button" disabled={pending} onClick={() => startTransition(async () => {
      setError("");
      try {
        const result = await requestHint(sessionId, deductionId, hints.length);
        if (result.error) setError(result.error);
        else if (result.hint) setHints([...hints, result.hint]);
      } catch { setError("The hint could not be loaded. Try again."); }
    })}>{pending ? "Opening hint…" : hints.length === 2 ? "Reveal final hint (may give away the answer)" : `Reveal hint ${hints.length + 1} of 3`}</button> : <p>All hints revealed.</p>}
  </aside>;
}
