"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function credentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." } as const;
  }
  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters." } as const;
  }
  return { email: email.trim(), password } as const;
}

export async function signIn(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = credentials(formData);
  if ("error" in values) return values;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) return { error: "Email or password is incorrect." };

  revalidatePath("/", "layout");
  redirect("/cases");
}

export async function signUp(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = credentials(formData);
  if ("error" in values) return values;

  const displayName = formData.get("displayName");
  if (typeof displayName !== "string" || displayName.trim().length < 2) {
    return { error: "Enter the name other investigators should see." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...values,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/cases`,
    },
  });

  if (error) return { error: error.message };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/cases");
  }

  return { message: "Check your email to confirm your account, then return to sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}