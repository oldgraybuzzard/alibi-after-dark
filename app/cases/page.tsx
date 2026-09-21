import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/");

  const email = typeof data.claims.email === "string" ? data.claims.email : "Investigator";

  return (
    <main className="cases-shell">
      <header>
        <div><p className="eyebrow">Alibi After Dark</p><h1>Case library</h1></div>
        <form action={signOut}>
          <button className="icon-action" title="Sign out" type="submit"><LogOut aria-hidden="true" size={19} /><span className="sr-only">Sign out</span></button>
        </form>
      </header>
      <section className="empty-dossier">
        <p className="case-stamp">Access verified</p>
        <h2>Welcome, {email}</h2>
        <p>Your identity is secured. The first playable case will appear here when it clears review.</p>
      </section>
    </main>
  );
}