import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, claimFirstAdmin } from "@/lib/admin.functions";
import { LockKeyhole } from "lucide-react";

export const Route = createFileRoute("/entrar")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [creating,setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (creating) {
        if (email.trim().toLowerCase() !== "admin@salvador.br") {
          throw new Error("O cadastro inicial está reservado ao e-mail autorizado para administração.");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/entrar" },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Conta criada. Confira o e-mail para confirmar o cadastro e depois entre por esta tela.");
          setCreating(false);
          return;
        }
        const me = await getMyRole();
        if (me.canClaim) {
          await claimFirstAdmin();
          await navigate({ to: "/admin" });
          return;
        }
        if (me.role === "admin") { await navigate({ to: "/admin" }); return; }
        throw new Error("A conta foi criada, mas o acesso administrativo não pôde ser ativado.");
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      let me;
      try { me = await getMyRole(); }
      catch { throw new Error("Não foi possível verificar suas permissões. Confira a configuração do backend."); }
      if (me.canClaim) {
        await claimFirstAdmin();
        setNotice("Acesso de administrador ativado.");
        await navigate({ to: "/admin" });
        return;
      }
      if (me.role === "admin") await navigate({ to: "/admin" });
      else if (me.role === "door") await navigate({ to: "/portaria" });
      else throw new Error("Sua conta ainda não tem permissão para acessar o painel. Peça ao administrador para liberar seu acesso.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  return <main className="derci-page edit-page">
    <section className="rsvp-modal edit-card login-card">
      <div className="login-icon"><LockKeyhole size={28}/></div>
      <p className="modal-kicker">ACESSO RESTRITO</p>
      <h2>Área da organização</h2>
      <p className="modal-subtitle">{creating ? "Crie a conta inicial autorizada para administrar a festa." : "Entre para administrar as confirmações e liberar a entrada na portaria."}</p>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete={creating ? "off" : "username"}/></label>
        <label>Senha<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={creating ? "new-password" : "current-password"}/></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="success-note">{notice}</p>}
        <button className="primary-action submit-action" disabled={busy}>{busy?(creating?"Criando conta...":"Entrando..."):(creating?"Criar conta de administrador":"Entrar com segurança")}</button>
        <button type="button" className="outline-action" disabled={busy} onClick={()=>{const next = !creating; setCreating(next); if (next) setEmail("admin@salvador.br"); setError(""); setNotice("");}}>{creating?"Já tenho uma conta — entrar":"Primeiro acesso? Criar conta de administrador"}</button>
        <p className="privacy-note">Para o primeiro cadastro, use admin@salvador.br. A função só será ativada se ainda não existir administrador.</p>
      </form>
      <a className="add-companion" href="/">← Voltar ao convite</a>
    </section>
  </main>;
}
