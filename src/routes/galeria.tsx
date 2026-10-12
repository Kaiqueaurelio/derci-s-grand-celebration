import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Heart,
  UploadCloud,
  Image as ImageIcon,
  Video,
  LockKeyhole,
  Download,
  RefreshCw,
} from "lucide-react";
import { createUpload, finalizeUpload, getDriveGallery, getGallery } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadGalleryFiles } from "@/lib/workflow-client";
import { userErrorMessage } from "@/lib/user-error";

export const Route = createFileRoute("/galeria")({ component: GalleryPage });

type Item = Awaited<ReturnType<typeof getGallery>>["items"][number];
type DriveAlbum = Awaited<ReturnType<typeof getDriveGallery>>;

function GalleryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [uploader, setUploader] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [drivePhotos, setDrivePhotos] = useState<DriveAlbum["items"]>([]);
  const [selectedDrivePhoto, setSelectedDrivePhoto] = useState<DriveAlbum["items"][number] | null>(null);
  const [galleryAccessGranted, setGalleryAccessGranted] = useState(false);
  const [driveUnavailable, setDriveUnavailable] = useState(false);
  const [driveRefreshing, setDriveRefreshing] = useState(false);
  const [driveUpdatedAt, setDriveUpdatedAt] = useState<Date | null>(null);
  const driveRequestInFlight = useRef(false);

  const refreshDrive = useCallback(async (accessCode: string) => {
    if (driveRequestInFlight.current) return;
    driveRequestInFlight.current = true;
    setDriveRefreshing(true);
    try {
      const album = await getDriveGallery({
        data: { ...(accessCode ? { code: accessCode } : {}) },
      });
      setDrivePhotos(album.items);
      setDriveUnavailable(false);
      setDriveUpdatedAt(new Date());
    } catch {
      setDriveUnavailable(true);
    } finally {
      driveRequestInFlight.current = false;
      setDriveRefreshing(false);
    }
  }, []);

  const refresh = useCallback(
    async (accessCode: string) => {
      setError("");
      setMessage("");
      setGalleryAccessGranted(false);
      try {
        const result = await getGallery({ data: { code: accessCode || undefined } });
        setItems(result.items);
        setUploadsEnabled(result.uploadsEnabled);
        setNeedCode(false);
        setGalleryAccessGranted(true);
        await refreshDrive(accessCode);
      } catch (e) {
        const msg = userErrorMessage(e, "Não foi possível carregar o álbum.");
        if (msg.includes("CODE_REQUIRED") || msg.includes("CODE_INVALID")) setNeedCode(true);
        else if (msg.includes("AUTH_REQUIRED")) {
          setRequiresAuth(true);
          setError("Esta galeria exige acesso autenticado.");
        } else
          setError(
            msg.includes("GALLERY_DISABLED")
              ? "O álbum ainda não foi habilitado pela organização."
              : msg,
          );
      }
    },
    [refreshDrive],
  );

  useEffect(() => {
    void refresh("");
  }, [refresh]);
  useEffect(() => {
    if (!galleryAccessGranted) return;
    const updateWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshDrive(code);
    };
    const timer = window.setInterval(updateWhenVisible, 30_000);
    document.addEventListener("visibilitychange", updateWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, [galleryAccessGranted, code, refreshDrive]);
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setCode(codeInput.trim());
    await refresh(codeInput.trim());
  }
  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    const files = Array.from(fileList);
    setUploading(files.map((file) => file.name));
    let results: Awaited<ReturnType<typeof uploadGalleryFiles>> = [];
    try {
      results = await uploadGalleryFiles(
        files,
        { ...(code ? { code } : {}), uploaderName: uploader },
        {
          prepare: async (data) => createUpload({ data }),
          upload: async (path, token, file) => {
            const { error } = await supabase.storage
              .from("media")
              .uploadToSignedUrl(path, token, file, {
                contentType: file.type || "application/octet-stream",
                upsert: true,
              });
            if (error) throw error;
          },
          finalize: async (data) => finalizeUpload({ data }),
        },
        (file) => setUploading((old) => old.filter((name) => name !== file.name)),
      );
    } finally {
      setUploading([]);
      setBusy(false);
    }
    await refresh(code);
    const failures = results
      .filter((result) => !result.ok)
      .map((result) => result.file.name + ": " + result.error);
    const successes = results
      .filter((result) => result.ok)
      .map(
        (result) =>
          result.file.name +
          (result.status === "pending_approval"
            ? " enviado! Aguardando aprovação da organização."
            : result.status === "already_done"
              ? ": arquivo já estava enviado."
              : " enviado para o álbum."),
      );
    if (failures.length) setError(failures.join(" "));
    if (successes.length) setMessage(successes.join(" "));
  }

  return (
    <main className="derci-page gallery-page">
      <header className="gallery-header">
        <a className="secondary-action gallery-back" href="/">
          <ArrowLeft size={16} /> Voltar ao convite
        </a>
        <p className="modal-kicker">DONA DERCI · 80 ANOS</p>
        <h1>Vamos brindar aos 80</h1>
        <p>Compartilhe fotografias e vídeos para guardar esse dia especial.</p>
      </header>
      {galleryAccessGranted && (
        <section className="drive-gallery-section" aria-labelledby="drive-gallery-title">
          <div className="drive-gallery-heading">
            <div>
              <p className="modal-kicker">ÁLBUM AO VIVO</p>
              <h2 id="drive-gallery-title">Fotos da comemoração</h2>
              <p aria-live="polite">
                Atualização automática a cada 30 segundos · fotos e vídeos disponíveis aqui no aplicativo
                {driveUpdatedAt
                  ? ` · última atualização às ${driveUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : ""}
                .
              </p>
            </div>
            <div className="drive-gallery-actions">
              <button
                className="outline-action"
                type="button"
                onClick={() => void refreshDrive(code)}
                disabled={driveRefreshing}
              >
                <RefreshCw
                  size={15}
                  className={
                    driveRefreshing ? "drive-refresh-icon is-spinning" : "drive-refresh-icon"
                  }
                />
                {driveRefreshing ? "Atualizando..." : "Atualizar agora"}
              </button>

            </div>
          </div>
          {driveUnavailable && (
            <p className="drive-gallery-empty" role="status">
              Não foi possível atualizar o Drive agora.{" "}
              {drivePhotos.length
                ? "Exibindo as fotos carregadas anteriormente."
                : "Tente novamente em instantes ou abra a pasta no Drive."}
            </p>
          )}
          {!driveUnavailable && drivePhotos.length === 0 ? (
            <p className="drive-gallery-empty">
              Ainda não há fotos ou vídeos disponíveis no álbum.
            </p>
          ) : (
            drivePhotos.length > 0 && (
              <div className="drive-photo-grid">
                {drivePhotos.map((photo) => (
                  <article className="drive-photo-tile" key={photo.id}>
                    <button
                      className="drive-photo-preview"
                      type="button"
                      onClick={() => setSelectedDrivePhoto(photo)}
                      aria-label={`Visualizar ${photo.name} no aplicativo`}
                    >
                      {photo.kind === "image" ? (
                        <img src={photo.url} alt={photo.name} loading="lazy" />
                      ) : (
                        <div className="video-tile">
                          <Video size={32} />
                          <span>Reproduzir vídeo</span>
                        </div>
                      )}
                    </button>
                    <span>{photo.name}</span>
                    <a className="gallery-drive-download" href={photo.downloadUrl}>
                      <Download size={15} /> Baixar {photo.kind === "video" ? "vídeo" : "foto"}
                    </a>
                  </article>
                ))}
              </div>
            )
          )}
        </section>
      )}
      {needCode ? (
        <section className="rsvp-modal gallery-code-card">
          <LockKeyhole size={28} />
          <h2>Álbum da família</h2>
          <p>Digite o código de acesso que a organização compartilhou com você.</p>
          <form onSubmit={unlock}>
            <label>
              Código de acesso
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button className="primary-action">Acessar álbum</button>
          </form>
        </section>
      ) : null}
      {error && !needCode && (
        <p className="form-error gallery-error" role="alert">
          {error}
        </p>
      )}
      {requiresAuth && (
        <button
          className="primary-action"
          onClick={async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              window.location.href = "/entrar";
              return;
            }
            await refresh(code);
          }}
        >
          Entrar para ver álbum
        </button>
      )}
      {!needCode && !error && (
        <>
          <section className="upload-panel">
            <div className="upload-icon">
              <UploadCloud size={26} />
            </div>
            <div className="upload-copy">
              <h2>Compartilhe suas fotos e vídeos</h2>
              <p>
                Selecione arquivos do celular ou computador. Imagens e vídeos ajudam a contar essa
                história.
              </p>
            </div>
            <label className="primary-action upload-button">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
                disabled={!uploadsEnabled || busy}
                hidden
              />
              <UploadCloud size={17} />
              {busy ? "Enviando..." : "Selecionar arquivos"}
            </label>
            {uploading.map((n) => (
              <p className="uploading-item" key={n}>
                Enviando: {n}
              </p>
            ))}
            {message && <p className="upload-success">{message}</p>}
            {error && <p className="form-error">{error}</p>}
            {!uploadsEnabled && <p className="privacy-note">Envios temporariamente desativados.</p>}
            <label className="uploader-name">
              Seu nome (opcional)
              <input
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                maxLength={80}
                placeholder="Como devemos identificar você?"
              />
            </label>
          </section>
          <section className="gallery-grid-section">
            <div className="gallery-section-heading">
              <div>
                <h2>Momentos compartilhados</h2>
                <p>{items.length} arquivo(s) aprovado(s)</p>
              </div>
              <button className="outline-action" onClick={() => void refresh(code)}>
                <Heart size={15} /> Atualizar
              </button>
            </div>
            {items.length === 0 ? (
              <div className="gallery-empty">
                <ImageIcon size={34} />
                <p>As primeiras memórias aparecerão aqui assim que forem enviadas e aprovadas.</p>
              </div>
            ) : (
              <div className="gallery-grid">
                {items.map((item) => (
                  <button
                    className="gallery-tile"
                    key={item.id}
                    onClick={() => setSelected(item)}
                    aria-label={"Abrir " + item.name}
                  >
                    {item.kind === "image" ? (
                      <img src={item.url} alt={item.name} loading="lazy" />
                    ) : (
                      <div className="video-tile">
                        <Video size={32} />
                        <span>Vídeo</span>
                      </div>
                    )}
                    <span className="tile-caption">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {selectedDrivePhoto && (
        <div
          className="modal-backdrop gallery-lightbox"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedDrivePhoto(null);
          }}
        >
          <section className="gallery-viewer" role="dialog" aria-modal="true" aria-labelledby="drive-gallery-viewer-title">
            <button className="modal-close" onClick={() => setSelectedDrivePhoto(null)} aria-label="Fechar">×</button>
            {selectedDrivePhoto.kind === "image" ? (
              <img src={selectedDrivePhoto.url} alt={selectedDrivePhoto.name} />
            ) : (
              <video src={selectedDrivePhoto.url} controls autoPlay playsInline />
            )}
            <p id="drive-gallery-viewer-title">{selectedDrivePhoto.name}</p>
            <a className="primary-action gallery-download-action" href={selectedDrivePhoto.downloadUrl}>
              <Download size={16} /> Baixar arquivo
            </a>
          </section>
        </div>
      )}
      {selected && (
        <div
          className="modal-backdrop gallery-lightbox"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <section
            className="gallery-viewer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-viewer-title"
          >
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar">
              ×
            </button>
            {selected.kind === "image" ? (
              <img src={selected.url} alt={selected.name} />
            ) : (
              <video src={selected.url} controls playsInline />
            )}
            <p id="gallery-viewer-title">{selected.name}</p>
            <a
              className="primary-action gallery-download-action"
              href={selected.downloadUrl}
              download={selected.name}
            >
              <Download size={16} /> Baixar arquivo
            </a>
          </section>
        </div>
      )}
    </main>
  );
}
