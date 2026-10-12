import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Heart,
  LockKeyhole,
  Wine,
  Users,
  CheckCircle2,
  ArrowRight,
  Share2,
  ChevronDown,
  Camera,
  Sparkles,
  Flower2,
  PartyPopper,
  UploadCloud,
} from "lucide-react";
import { getPublicEvent, submitRsvp } from "@/lib/rsvp.functions";
import { submitRsvpFlow } from "@/lib/workflow-client";
import floralCorner from "@/assets/floral-corner.png";

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
  const [success, setSuccess] = useState<{
    names: string[];
    token: string;
    attending: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [celebrationBurst, setCelebrationBurst] = useState(0);

  useEffect(() => {
    if (!celebrationBurst) return;
    const timeout = window.setTimeout(() => setCelebrationBurst(0), 1600);
    return () => window.clearTimeout(timeout);
  }, [celebrationBurst]);

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const eventTime = /^\d{2}:\d{2}$/.test(event.eventTime || "") ? event.eventTime : "13:00";
      const target = new Date(`${event.eventDate}T${eventTime}:00`).getTime();
      const remaining = Math.max(0, target - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      setCountdown({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [event.eventDate, event.eventTime]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  const mapAddress = event.location?.trim() || "Avenida Santa Marina, 1495, São Paulo, SP, Brasil";
  const mapUrl =
    event.mapsUrl ||
    "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        mapAddress.includes("Santa Marina") ? mapAddress + ", São Paulo, SP, Brasil" : mapAddress,
      );

  const rsvpUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareUrl = useMemo(
    () =>
      "https://wa.me/?text=" +
      encodeURIComponent("Você está convidado para os 80 anos da Dona Derci! " + rsvpUrl),
    [rsvpUrl],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = {
        submissionId: crypto.randomUUID(),
        responsibleName: name,
        phone,
        attending,
        companions: attending ? companions.filter((n) => n.trim()) : [],
        notes,
      };
      const result = await submitRsvpFlow(input, async (payload) => submitRsvp({ data: payload }));
      setSuccess(result);
      if (result.attending) setCelebrationBurst((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar sua confirmação. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function shareInvitation() {
    const dateLabel = new Date(event.eventDate + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const text =
      "É surpresa! Vamos celebrar os 80 anos da nossa querida " +
      (event.honoree || "Derci") +
      " em " +
      dateLabel +
      " às " +
      event.eventTime +
      ". Por favor, mantenha segredo. " +
      window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "80 anos da Dona Derci", text, url: window.location.href });
      } catch {
        /* share dismissed */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <main className="derci-page">
      <div className="floating-petals" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={"petal petal-" + (i % 5)} />
        ))}
      </div>
      {celebrationBurst > 0 && (
        <div key={celebrationBurst} className="celebration-burst" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ "--burst-index": i } as React.CSSProperties}>
              ♡
            </span>
          ))}
        </div>
      )}
      <div className="birthday-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className={"confetti-piece confetti-" + (i % 6)} />
        ))}
      </div>
      <article className="inv-card" aria-label="Convite dos 80 anos da Derci">
        <img className="inv-flower inv-flower-tl" src={floralCorner} alt="" aria-hidden="true" />
        <img className="inv-flower inv-flower-br" src={floralCorner} alt="" aria-hidden="true" />
        <div className="inv-frame" aria-hidden="true" />
        <div className="inv-surprise">
          É surpresa!
          <svg viewBox="0 0 160 40" aria-hidden="true">
            <path d="M4 22 C50 14 100 10 156 8" />
            <path d="M118 26 c-4-6-12-2-8 4 l8 8 l8-8 c4-6-4-10-8-4z" />
          </svg>
        </div>
        <p className="inv-caps">VAMOS CELEBRAR OS</p>
        <p className="inv-age">80 anos</p>
        <p className="inv-caps">DA NOSSA QUERIDA</p>
        <h1 className="inv-name">
          Derci<span className="inv-heart">♡</span>
        </h1>
        <svg className="inv-swash" viewBox="0 0 300 20" aria-hidden="true">
          <path d="M8 16 C90 4 200 2 292 6" />
        </svg>
        <p className="inv-intro">
          Essa data tão especial merece ser comemorada
          <br />
          ao lado de pessoas que fazem parte da sua história!
          <br />
          Contamos com a sua presença para tornar
          <br />
          esse momento ainda mais inesquecível!
        </p>

        <section className="inv-details" aria-label="Informações da festa">
          <div>
            <CalendarDays aria-hidden="true" />
            <span>DATA</span>
            <strong>12/10/2026</strong>
            <small>(segunda-feira)</small>
          </div>
          <div>
            <Clock3 aria-hidden="true" />
            <span>HORÁRIO</span>
            <strong>13h</strong>
          </div>
          <div>
            <MapPin aria-hidden="true" />
            <span>LOCAL</span>
            <strong>
              Avenida Santa
              <br />
              Marina, 1495
            </strong>
          </div>
        </section>

        <div className="inv-drink">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M14 8h12l-1 14a5 5 0 0 1-10 0z M20 27v24 M13 53h14 M38 10h12l1 14a5 5 0 0 1-10 0z M46 29v22 M39 53h14 M30 4l2-3 M34 6l3-2 M26 5l-1-3" />
          </svg>
          <p>
            Traga sua bebida
            <br />
            preferida!<span className="inv-mini-swash">⎯⎯ ♡ ⎯⎯</span>
          </p>
        </div>

        <div className="inv-important">
          <LockKeyhole aria-hidden="true" />
          <div>
            <strong>IMPORTANTE:</strong>
            <p>
              É uma festa surpresa!
              <br />
              <small>
                Pedimos que mantenha segredo para que a Derci
                <br />
                tenha uma linda surpresa.
              </small>
            </p>
          </div>
        </div>

        <p className="inv-closing">
          Esperamos por você!<span className="inv-mini-swash">⎯⎯ ♡ ⎯⎯</span>
        </p>
      </article>
      <div className="invitation-shell inv-actions-shell">
        <div className="actions">
          <button
            className="primary-action"
            onClick={() => {
              setOpen(true);
              setSuccess(null);
            }}
          >
            Confirmar minha presença <ArrowRight size={18} />
          </button>
          <a className="secondary-action" href={mapUrl} target="_blank" rel="noreferrer">
            <MapPin size={17} /> Ver localização
          </a>
          <button className="share-action" onClick={shareInvitation}>
            <Share2 size={16} /> {copied ? "Convite copiado!" : "Compartilhar convite"}
          </button>
          {event.galleryEnabled && (
            <a className="secondary-action" href="/galeria">
              <Heart size={17} /> Ver álbum de memórias
            </a>
          )}
          <a className="admin-entry-link" href="/entrar">
            <LockKeyhole size={16} aria-hidden="true" /> Acesso da organização
          </a>
        </div>

        <button
          className="little-celebration"
          type="button"
          onClick={() => setCelebrationBurst((value) => value + 1)}
        >
          <Sparkles size={15} /> Celebrar esse amor <span>♡</span>
        </button>
        <footer className="footer-note">
          Com carinho, para celebrar uma vida inteira de amor.
        </footer>
      </div>

      <div className="scroll-progress-track" aria-hidden="true">
        <span style={{ width: scrollProgress + "%" }} />
      </div>
      <a className="scroll-cue" href="#celebracao" aria-label="Role para descobrir mais">
        <span>UM DIA PARA GUARDAR NO CORAÇÃO</span>
        <ChevronDown size={19} />
      </a>

      <section className="derci-section celebration-section scroll-reveal" id="celebracao">
        <div className="botanical-mark" aria-hidden="true">
          <Flower2 size={28} />
          <span>✦</span>
          <Flower2 size={20} />
        </div>
        <p className="section-eyebrow">UMA VIDA INTEIRA DE HISTÓRIAS</p>
        <h2>O amor merece ser celebrado.</h2>
        <p className="section-copy">
          Oito décadas não cabem em uma página. Cabem nos encontros, nas conversas que atravessam a
          tarde e no carinho de quem caminhou ao lado dela. Agora, é hora de estarmos juntos para
          celebrar.
        </p>
        <div className="countdown-card">
          <div className="countdown-title">
            <Sparkles size={17} /> A contagem regressiva começou <Sparkles size={17} />
          </div>
          <div className="countdown-units" aria-label="Tempo restante até a festa">
            <div>
              <strong>{String(countdown.days).padStart(2, "0")}</strong>
              <span>dias</span>
            </div>
            <i>:</i>
            <div>
              <strong>{String(countdown.hours).padStart(2, "0")}</strong>
              <span>horas</span>
            </div>
            <i>:</i>
            <div>
              <strong>{String(countdown.minutes).padStart(2, "0")}</strong>
              <span>minutos</span>
            </div>
            <i>:</i>
            <div>
              <strong>{String(countdown.seconds).padStart(2, "0")}</strong>
              <span>segundos</span>
            </div>
          </div>
          <p>Até o momento de comemorar juntinhos ♡</p>
        </div>
      </section>

      <section className="derci-section details-story-section scroll-reveal">
        <div className="section-heading-row">
          <span className="fine-line" />
          <p className="section-eyebrow">ANOTE COM CARINHO</p>
          <span className="fine-line" />
        </div>
        <h2>Nosso encontro especial</h2>
        <div className="story-cards">
          <article className="story-card">
            <span className="story-icon">
              <CalendarDays size={24} />
            </span>
            <p className="story-label">QUANDO</p>
            <h3>
              {new Date(event.eventDate + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <p>
              {event.weekdayLabel || "Um dia especial"} · {event.eventTime}
            </p>
          </article>
          <article className="story-card">
            <span className="story-icon">
              <MapPin size={24} />
            </span>
            <p className="story-label">ONDE</p>
            <h3>{event.location}</h3>
            <p>Esperamos você para celebrar em família.</p>
            <a href={mapUrl} target="_blank" rel="noreferrer">
              Abrir localização <ArrowRight size={14} />
            </a>
          </article>
          <article className="story-card">
            <span className="story-icon">
              <Wine size={24} />
            </span>
            <p className="story-label">UM LEMBRETE</p>
            <h3>Traga sua bebida preferida</h3>
            <p>Venha com o coração leve e pronto para brindar.</p>
          </article>
        </div>
      </section>

      <section className="derci-section secret-section scroll-reveal">
        <div className="secret-flower" aria-hidden="true">
          ❧
        </div>
        <LockKeyhole size={29} />
        <p className="section-eyebrow">PSIU... É SURPRESA!</p>
        <h2>Vamos guardar esse segredo?</h2>
        <p className="section-copy">
          Vamos fazer essa surpresa valer a pena: não conte nada à Derci e evite publicar sobre a
          festa antes do dia. Na hora certa, queremos ver o sorriso dela ao encontrar todo mundo.
        </p>
        <span className="secret-signature">Combinado? ♡</span>
      </section>

      <section className="derci-section memory-section scroll-reveal">
        <div className="memory-emblem">
          <Camera size={30} />
        </div>
        <p className="section-eyebrow">CADA CLIQUE VIRA MEMÓRIA</p>
        <h2>Vamos guardar esse dia para sempre.</h2>
        <p className="section-copy">
          Depois da comemoração, volte aqui para rever os registros desse encontro. Cada foto vai
          ajudar a guardar um pedacinho desse dia.
        </p>
        <div className="memory-ribbon">
          <span>momentos</span>
          <span>♡</span>
          <span>memórias</span>
          <span>♡</span>
          <span>família</span>
        </div>
        <a
          className="gallery-cta"
          href="https://drive.google.com/drive/folders/1U02PNAceEReBC0_wz7RPwVj9ZTSkbHkU?usp=sharing"
          target="_blank"
          rel="noreferrer"
        >
          <Camera size={18} /> Ver fotos e vídeos no Google Drive <ArrowRight size={17} />
        </a>
        {event.galleryEnabled && (
          <a className="gallery-secondary-cta" href="/galeria">
            <UploadCloud size={17} /> Enviar fotos para compartilhar
          </a>
        )}
      </section>

      <section className="derci-final-cta scroll-reveal">
        <PartyPopper size={27} />
        <p className="section-eyebrow">SUA PRESENÇA É O NOSSO PRESENTE</p>
        <h2>Vamos brindar aos 80 anos da Derci?</h2>
        <p>
          Confirme sua presença e informe os nomes de todos que vão com você para prepararmos a
          lista da portaria.
        </p>
        <button
          className="primary-action final-confirm-button"
          onClick={() => {
            setOpen(true);
            setSuccess(null);
          }}
        >
          <Heart size={18} /> Confirmar minha presença <ArrowRight size={18} />
        </button>
        <a className="final-share-link" href={shareUrl}>
          <Share2 size={16} /> Compartilhar convite com a família
        </a>
        <p className="footer-note">Feito com amor para os 80 anos da Dona Derci.</p>
      </section>

      <nav className="floating-celebration-nav" aria-label="Atalhos da festa">
        <a href="#celebracao" aria-label="Sobre a celebração">
          <Sparkles size={18} />
        </a>
        <button
          onClick={() => {
            setOpen(true);
            setSuccess(null);
          }}
          aria-label="Confirmar presença"
        >
          <Heart size={18} />
        </button>
        {event.galleryEnabled && (
          <a href="/galeria" aria-label="Abrir álbum">
            <Camera size={18} />
          </a>
        )}
      </nav>
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section
            className="rsvp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rsvp-title"
          >
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar">
              ×
            </button>
            {success ? (
              <div className="success-state">
                <CheckCircle2 size={42} />
                <h2 id="rsvp-title">
                  {success.attending ? "Presença confirmada!" : "Resposta registrada!"}
                </h2>
                <p>
                  {success.attending
                    ? "Que alegria! Sua presença vai tornar esse dia ainda mais especial."
                    : "Obrigado por avisar. Registramos sua resposta."}
                </p>
                {success.attending && (
                  <ul>
                    {success.names.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
                <p className="secret-reminder">Lembre-se: é surpresa! 🤫</p>
                <button className="primary-action" onClick={() => setOpen(false)}>
                  Concluir
                </button>
                {success.attending && (
                  <button
                    className="text-action"
                    onClick={() => {
                      const link = window.location.origin + "/confirmar/" + success.token;
                      navigator.clipboard
                        .writeText(link)
                        .then(() =>
                          window.alert(
                            "Link de edição copiado! Guarde-o para corrigir sua confirmação.",
                          ),
                        )
                        .catch(() => window.prompt("Copie e guarde seu link de edição:", link));
                    }}
                  >
                    Copiar link seguro de edição
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="modal-kicker">80 ANOS DE AMOR</p>
                <h2 id="rsvp-title">Confirme sua presença</h2>
                <p className="modal-subtitle">
                  Informe seu nome e o de quem vai com você para deixarmos tudo organizado na
                  entrada.
                </p>
                <form onSubmit={submit}>
                  <label>
                    Seu nome completo
                    <input
                      required
                      minLength={3}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome e sobrenome"
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    WhatsApp <span className="optional">(opcional)</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="DDD + telefone"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </label>
                  <fieldset>
                    <legend>Você vai comparecer?</legend>
                    <label className="radio-label">
                      <input type="radio" checked={attending} onChange={() => setAttending(true)} />{" "}
                      Sim, estarei lá!
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        checked={!attending}
                        onChange={() => {
                          setAttending(false);
                          setCompanions([]);
                        }}
                      />{" "}
                      Infelizmente não poderei ir.
                    </label>
                  </fieldset>
                  {attending && (
                    <div className="companions">
                      <div className="companions-heading">
                        <Users size={18} />
                        <span>Familiares e acompanhantes</span>
                      </div>
                      {companions.map((person, i) => (
                        <div className="companion-row" key={i}>
                          <input
                            aria-label={"Nome do acompanhante " + (i + 1)}
                            required
                            value={person}
                            onChange={(e) =>
                              setCompanions((old) =>
                                old.map((n, j) => (i === j ? e.target.value : n)),
                              )
                            }
                            placeholder="Nome completo"
                          />
                          <button
                            type="button"
                            aria-label="Remover acompanhante"
                            onClick={() => setCompanions((old) => old.filter((_, j) => j !== i))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {companions.length < event.maxCompanions && (
                        <button
                          className="add-companion"
                          type="button"
                          onClick={() => setCompanions((old) => [...old, ""])}
                        >
                          + Adicionar acompanhante
                        </button>
                      )}
                    </div>
                  )}
                  <label>
                    Observações <span className="optional">(opcional)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      placeholder="Alguma informação para a organização?"
                    />
                  </label>
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="primary-action submit-action"
                    disabled={busy || !event.rsvpOpen}
                  >
                    {busy
                      ? "Enviando..."
                      : event.rsvpOpen
                        ? "Enviar confirmação"
                        : "Confirmações encerradas"}
                  </button>
                  {!event.rsvpOpen && (
                    <p className="form-error">As confirmações estão encerradas.</p>
                  )}
                  <p className="privacy-note">
                    Seus dados serão usados apenas para organizar a festa e a lista de entrada.
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
