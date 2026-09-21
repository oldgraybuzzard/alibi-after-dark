"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function StartButton() {
  const { pending } = useFormStatus();

  return (
    <button className="start-case" disabled={pending} type="submit">
      {pending ? (
        <><LoaderCircle aria-hidden="true" className="spin" size={17} /> Opening case</>
      ) : (
        <>Start investigation <ArrowRight aria-hidden="true" size={17} /></>
      )}
    </button>
  );
}