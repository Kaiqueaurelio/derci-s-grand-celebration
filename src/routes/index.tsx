import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, Heart, LockKeyhole, Wine, Users, CheckCircle2, ArrowRight, Share2 } from "lucide-react";
import { getPublicEvent, submitRsvp } from "@/lib/rsvp.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicEvent(),
  component: InvitationPage,
});

function InvitationPage() {
  const event = Route.useLoaderData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [attending, setAttending] = useState(true);
  const [companions, setCompanions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{names:string[]; token:string; attending:boolean} | null>(null);
  const [copied, setCopied] = useState(false);
  const mapUrl = event.mapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(event.location);

  const rsvpUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareUrl = useMemo(() => "https://wa.me/?text=" + encodeURIComponent("Você está convidado para os 80 anos da Dona Derci! " + rsvpUrl), [rsvpUrl]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await submitRsvp({
        data: {
          submissionId: crypto.randomUUID(),
          responsibleName: name,
          phone,
          attending,
          companions: attending ? companions.filter((n) => n.trim()) : [],
          notes,
        },
      });
      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar sua confirmação. Tente novamente.");
    } finally { setBusy(false); }
  }

  async function shareInvitation() {
    const text = "É surpresa! Vamos celebrar os 80 anos da nossa querida Derci em 12/10/2026 às 13h. Por favor, mantenha segredo. " + window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "80 anos da Dona Derci", text, url: window.location.href }); } catch { /* share dismissed */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <main className="derci-page">
      <div className="invitation-shell">
        <div className="corner corner-tl" aria-hidden="true">✿</div>
        <div className="corner corner-br" aria-hidden="true">✿</div>
        <div className="frame-line" aria-hidden="true" />
        <div className="surprise">É surpresa! <span>♡</span></div>
        <p className="eyebrow">VAMOS CELEBRAR OS</p>
        <div className="age">80 <span>anos</span></div>
        <p className="eyebrow beloved">DA NOSSA QUERIDA</p>
        <h1 className="honoree">{event.honoree || "Derci"}<span>♡</span></h1>

        <p className="intro">Essa data tão especial merece ser comemorada ao lado de pessoas que fazem parte da sua história! Contamos com a sua presença para tornar esse momento ainda mais inesquecível!</p>

        <section className="event-details" aria-label="Informações da festa">
          <div className="detail">
            <CalendarDays aria-hidden="true" />
            <span className="detail-label">DATA</span>
            <strong>{new Date(event.eventDate + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
            {event.weekdayLabel && <small>({event.weekdayLabel})</small>}
          </div>
          <div className="detail">
            <Clock3 aria-hidden="true" />
            <span className="detail-label">HORÁRIO</span>
            <strong>{event.eventTime}</strong>
          </div>
          <div className="detail">
            <MapPin aria-hidden="true" />
            <span className="detail-label">LOCAL</span>
            <strong className="location">{event.location}</strong>
          </div>
        </section>

        <div className="bring-drink">
          <Wine aria-hidden="true" />
          <p>Traga sua bebida<br/>preferida!</p>
        </div>

        <div className="secret-note">
          <LockKeyhole aria-hidden="true" />
          <div><strong>IMPORTANTE:</strong><p>É uma festa surpresa!<br/>Pedimos que mantenha segredo para que a Derci tenha uma linda surpresa.</p></div>
        </div>

        <p className="closing">Esperamos por você! <span>♡</span></p>

        <div className="actions">
          <button className="primary-action" onClick={() => { setOpen(true); setSuccess(null); }}>
            Confirmar minha presença <ArrowRight size={18} />
          </button>
          <a className="secondary-action" href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={17}/> Ver localização</a>
          <button className="share-action" onClick={shareInvitation}><Share2 size={16}/> {copied ? "Convite copiado!" : "Compartilhar convite"}</button>
          {event.galleryEnabled && <a className="secondary-action" href="/galeria"><Heart size={17}/> Ver álbum de memórias</a>}
        </div>

        <footer className="footer-note">Com carinho, para celebrar uma vida inteira de amor.</footer>
      </div>

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <section className="rsvp-modal" role="dialog" aria-modal="true" aria-labelledby="rsvp-title">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
            {success ? (
              <div className="success-state">
                <CheckCircle2 size={42} />
                <h2 id="rsvp-title">{success.attending ? "Presença confirmada!" : "Resposta registrada!"}</h2>
                <p>{success.attending ? "Que alegria! Registramos:" : "Obrigado por avisar. Registramos sua resposta."}</p>
                {success.attending && <ul>{success.names.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                <p className="secret-reminder">Lembre-se: é surpresa! 🤫</p>
                <button className="primary-action" onClick={() => setOpen(false)}>Concluir</button>
                {success.attending && <button className="text-action" onClick={() => { navigator.clipboard.writeText(window.location.origin + "/confirmar/" + success.token).catch(()=>{}); }}>Copiar link seguro de edição</button>}
              </div>
            ) : (
              <>
                <p className="modal-kicker">80 ANOS DE AMOR</p>
                <h2 id="rsvp-title">Confirme sua presença</h2>
                <p className="modal-subtitle">Precisamos dos nomes completos para liberar a entrada na portaria.</p>
                <form onSubmit={submit}>
                  <label>Seu nome completo<input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e sobrenome" autoComplete="name"/></label>
                  <label>WhatsApp <span className="optional">(opcional)</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="DDD + telefone" autoComplete="tel" inputMode="tel"/></label>
                  <fieldset><legend>Você vai comparecer?</legend><label className="radio-label"><input type="radio" checked={attending} onChange={() => setAttending(true)}/> Sim, estarei lá!</label><label className="radio-label"><input type="radio" checked={!attending} onChange={() => { setAttending(false); setCompanions([]); }}/> Infelizmente não poderei ir.</label></fieldset>
                  {attending && <div className="companions"><div className="companions-heading"><Users size={18}/><span>Familiares e acompanhantes</span></div>{companions.map((person, i) => <div className="companion-row" key={i}><input aria-label={"Nome do acompanhante " + (i+1)} required value={person} onChange={(e) => setCompanions(old => old.map((n,j) => i===j ? e.target.value : n))} placeholder="Nome completo"/><button type="button" aria-label="Remover acompanhante" onClick={() => setCompanions(old => old.filter((_,j) => j!==i))}>×</button></div>)}{companions.length < event.maxCompanions && <button className="add-companion" type="button" onClick={() => setCompanions(old => [...old, ""])}>+ Adicionar acompanhante</button>}</div>}
                  <label>Observações <span className="optional">(opcional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Alguma informação para a organização?"/></label>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="primary-action submit-action" disabled={busy || !event.rsvpOpen}>{busy ? "Enviando..." : event.rsvpOpen ? "Enviar confirmação" : "Confirmações encerradas"}</button>
                  {!event.rsvpOpen && <p className="form-error">As confirmações estão encerradas.</p>}
                  <p className="privacy-note">Seus dados serão usados apenas para organizar a festa e a lista de entrada.</p>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
