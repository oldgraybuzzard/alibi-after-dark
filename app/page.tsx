import { redirect } from "next/navigation";
import { AuthForm } from "./auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) redirect("/cases");

  const { message } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-scene" aria-labelledby="brand-name">
        <div className="scene-shade" />
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">A</div>
          <p>Private investigations</p>
          <h1 id="brand-name">Alibi<br />After Dark</h1>
        </div>
        <blockquote><span>Case note 001</span>“Everyone has a story. Find the one that breaks.”</blockquote>
      </section>
      <section className="login-panel" aria-label="Account access">
        <AuthForm initialMessage={typeof message === "string" ? message : undefined} />
      </section>
    </main>
  );
}
