import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Heart, Users } from "lucide-react";
import { getPublicEvent, getRsvpByToken, updateRsvpByToken } from "@/lib/rsvp.functions";

export const Route = createFileRoute("/confirmar/$token")({
  loader: async ({ params }) => {
    const [event, rsvp] = await Promise.all([
      getPublicEvent(),
      getRsvpByToken({ data: { token: params.token } }),
    ]);
    return { event, rsvp };
  },
  component: EditConfirmationPage,
});

function EditConfirmationPage() {
  const { event, rsvp } = Route.useLoaderData();
  const { token } = Route.useParams();
  const [name, setName] = useState(rsvp.responsibleName);
  const [phone, setPhone] = useState(rsvp.phone);
  const [attending, setAttending] = useState(rsvp.attending);
  const [companions, setCompanions] = useState<string[]>(rsvp.companions);
  const [notes, setNotes] = useState(rsvp.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await updateRsvpByToken({
        data: {
          token,
          submissionId: crypto.randomUUID(),
          responsibleName: name,
          phone,
          attending,
          companions: attending ? companions.filter((n) => n.trim()) : [],
          notes,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a confirmação.");
    } finally { setBusy(false); }
  }

  return (
    <main className="derci-page edit-page">
      <section className="rsvp-modal edit-card">
        {saved ? (
          <div className="success-state">
            <CheckCircle2 size={42}/>
            <h2>Confirmação atualizada!</h2>
            <p>Os nomes foram atualizados para a lista da portaria.</p>
            <a className="primary-action" href="/">Voltar ao convite</a>
          </div>
        ) : (
          <>
            <p className="modal-kicker">DONA DERCI · 80 ANOS</p>
            <h2>Editar confirmação</h2>
            <p className="modal-subtitle">Mantenha os nomes atualizados para a lista de entrada. E lembre-se: é surpresa!</p>
            <form onSubmit={save}>
              <label>Seu nome completo<input required value={name} onChange={e=>setName(e.target.value)} minLength={3} autoComplete="name"/></label>
              <label>WhatsApp <span className="optional">(opcional)</span><input value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" inputMode="tel"/></label>
              <fieldset><legend>Você vai comparecer?</legend>
                <label className="radio-label"><input type="radio" checked={attending} onChange={()=>setAttending(true)}/> Sim, estarei lá!</label>
                <label className="radio-label"><input type="radio" checked={!attending} onChange={()=>{setAttending(false);setCompanions([])}}/> Não poderei ir.</label>
              </fieldset>
              {attending && <div className="companions">
                <div className="companions-heading"><Users size={18}/><span>Familiares e acompanhantes</span></div>
                {companions.map((person,i)=><div className="companion-row" key={i}><input required aria-label={"Nome do acompanhante "+(i+1)} value={person} onChange={e=>setCompanions(old=>old.map((n,j)=>i===j?e.target.value:n))} placeholder="Nome completo"/><button type="button" aria-label="Remover acompanhante" onClick={()=>setCompanions(old=>old.filter((_,j)=>i!==j))}>×</button></div>)}
                {companions.length < event.maxCompanions && <button type="button" className="add-companion" onClick={()=>setCompanions(old=>[...old,""])}>+ Adicionar acompanhante</button>}
              </div>}
              <label>Observações <span className="optional">(opcional)</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000}/></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-action submit-action" disabled={busy}>{busy?"Salvando...":"Salvar alterações"} <Heart size={17}/></button>
              <p className="privacy-note">Este link permite editar sua confirmação. Não compartilhe com outras pessoas.</p>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
