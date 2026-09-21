"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function DeductionSubmit() {
  const { pending } = useFormStatus();

  return (
    <button className="deduction-submit" disabled={pending} type="submit">
      {pending ? (
        <><LoaderCircle aria-hidden="true" className="spin" size={17} /> Checking evidence</>
      ) : (
        <><Check aria-hidden="true" size={17} /> Test deduction</>
      )}
    </button>
  );
}