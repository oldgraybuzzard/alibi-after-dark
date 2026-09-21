"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm({ initialMessage }: { initialMessage?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signInPending : signUpPending;

  return (
    <div className="auth-form-wrap">
      <div className="auth-tabs" role="tablist" aria-label="Account access">
        <button aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} role="tab" type="button">Sign in</button>
        <button aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} role="tab" type="button">Create account</button>
      </div>

      <div className="auth-heading">
        <p className="eyebrow">Case access</p>
        <h2>{mode === "signin" ? "Return to the investigation" : "Join the bureau"}</h2>
        <p>{mode === "signin" ? "Your evidence, notes, and active rooms are waiting." : "Create an identity for solo cases and private investigations."}</p>
      </div>

      <form action={mode === "signin" ? signInAction : signUpAction}>
        {mode === "signup" ? (
          <label>Display name<input autoComplete="nickname" minLength={2} name="displayName" placeholder="What should the team call you?" required type="text" /></label>
        ) : null}
        <label>Email address<input autoComplete="email" name="email" placeholder="detective@example.com" required type="email" /></label>
        <label>
          Password
          <span className="password-field">
            <input autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} name="password" placeholder="8 characters minimum" required type={showPassword ? "text" : "password"} />
            <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? "Hide password" : "Show password"} type="button">
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </span>
        </label>

        {initialMessage && !state.error && !state.message ? <p className="form-message error" role="alert">{initialMessage}</p> : null}
        {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
        {state.message ? <p className="form-message success" role="status">{state.message}</p> : null}

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <LoaderCircle aria-hidden="true" className="spin" size={18} /> : null}
          {pending ? "Opening case files..." : mode === "signin" ? "Enter the case room" : "Create investigator account"}
        </button>
      </form>
      <p className="auth-footnote">Private rooms stay private. Your identity controls access to shared evidence.</p>
    </div>
  );
}