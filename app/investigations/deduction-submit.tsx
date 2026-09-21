"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function DeductionSubmit({ final = false }: { final?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="deduction-submit" disabled={pending} type="submit">
      {pending ? (
        <><LoaderCircle aria-hidden="true" className="spin" size={17} /> {final ? "Saving accusation" : "Checking evidence"}</>
      ) : (
        <><Check aria-hidden="true" size={17} /> {final ? "Submit final accusation" : "Test deduction"}</>
      )}
    </button>
  );
}