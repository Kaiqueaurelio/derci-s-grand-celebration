import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/galeria")({
  component: GalleryUnavailable,
});

function GalleryUnavailable() {
  return (
    <main className="derci-page edit-page">
      <section className="rsvp-modal edit-card">
        <p className="modal-kicker">DONA DERCI · 80 ANOS</p>
        <h2>Memórias da festa</h2>
        <p className="modal-subtitle">O álbum de fotos e vídeos ficará disponível por aqui assim que a organização habilitar a galeria.</p>
        <a className="primary-action" href="/">Voltar ao convite</a>
      </section>
    </main>
  );
}
