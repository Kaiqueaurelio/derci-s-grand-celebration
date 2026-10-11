import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, UploadCloud, Image as ImageIcon, Video, X, LockKeyhole } from "lucide-react";
import { createUpload, finalizeUpload, getGallery } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/galeria")({ component: GalleryPage });

type Item = Awaited<ReturnType<typeof getGallery>>["items"][number];

function GalleryPage(){
 const [items,setItems]=useState<Item[]>([]);
 const [code,setCode]=useState("");
 const [codeInput,setCodeInput]=useState("");
 const [needCode,setNeedCode]=useState(false);
 const [uploader,setUploader]=useState("");
 const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState<string[]>([]);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Item|null>(null);
 const [uploadsEnabled,setUploadsEnabled]=useState(false);
 const [requiresAuth,setRequiresAuth]=useState(false);

 async function refresh(accessCode=code){
  setError("");setMessage("");
  try{const result=await getGallery({data:{code:accessCode||undefined}});setItems(result.items);setUploadsEnabled(result.uploadsEnabled);setNeedCode(false);}
  catch(e){const msg=e instanceof Error?e.message:"Não foi possível carregar o álbum.";if(msg.includes("CODE_REQUIRED")||msg.includes("CODE_INVALID"))setNeedCode(true);else if(msg.includes("AUTH_REQUIRED")){setRequiresAuth(true);setError("Esta galeria exige acesso autenticado.");}else setError(msg.includes("GALLERY_DISABLED")?"O álbum ainda não foi habilitado pela organização.":msg);}
 }

 useEffect(()=>{void refresh();},[]);
 async function unlock(e:React.FormEvent){e.preventDefault();setCode(codeInput.trim());await refresh(codeInput.trim());}
 async function uploadFiles(fileList:FileList|null){
  if(!fileList?.length)return;
  setBusy(true);setError("");setMessage("");
  const files=Array.from(fileList);
  for(const f of files){
   const cid=crypto.randomUUID();setUploading(old=>[...old,f.name]);
   try{
    const prepared=await createUpload({data:{code:code||undefined,clientUploadId:cid,name:f.name,mimeType:f.type||"application/octet-stream",size:f.size,uploaderName:uploader.trim()||undefined}});
    if(prepared.alreadyDone){setMessage(f.name+": arquivo já estava enviado.");continue;}
    const {error:uploadError}=await supabase.storage.from("media").uploadToSignedUrl(prepared.path,prepared.token,f,{contentType:f.type||"application/octet-stream", upsert:true});
    if(uploadError)throw uploadError;
    const result=await finalizeUpload({data:{id:prepared.id,clientUploadId:cid}});
    setMessage(f.name+(result.status==="pending_approval"?" enviado! Aguardando aprovação da organização.":" enviado para o álbum."));
   }catch(e){setError(f.name+": "+(e instanceof Error?e.message:"Falha ao enviar arquivo."));}
   finally{setUploading(old=>old.filter(n=>n!==f.name));}
  }
  setBusy(false);await refresh();
 }

 return <main className="derci-page gallery-page">
  <header className="gallery-header"><a className="secondary-action gallery-back" href="/"><ArrowLeft size={16}/> Voltar ao convite</a><p className="modal-kicker">DONA DERCI · 80 ANOS</p><h1>Memórias da festa</h1><p>Compartilhe fotografias e vídeos para guardar esse dia especial.</p></header>
  {needCode?<section className="rsvp-modal gallery-code-card"><LockKeyhole size={28}/><h2>Álbum da família</h2><p>Digite o código de acesso que a organização compartilhou com você.</p><form onSubmit={unlock}><label>Código de acesso<input value={codeInput} onChange={e=>setCodeInput(e.target.value)} required autoComplete="current-password"/></label><button className="primary-action">Acessar álbum</button></form></section>:null}
  {error&&!needCode&&<p className="form-error gallery-error" role="alert">{error}</p>}
  {requiresAuth&&<button className="primary-action" onClick={async()=>{const {data}=await supabase.auth.getSession();if(!data.session){window.location.href="/entrar";return;}await refresh();}}>Entrar para ver álbum</button>}
  {!needCode&&!error&&<>
   <section className="upload-panel"><div className="upload-icon"><UploadCloud size={26}/></div><div className="upload-copy"><h2>Compartilhe suas fotos e vídeos</h2><p>Selecione arquivos do celular ou computador. Imagens e vídeos ajudam a contar essa história.</p></div><label className="primary-action upload-button"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime" onChange={e=>{void uploadFiles(e.target.files);e.currentTarget.value="";}} disabled={!uploadsEnabled||busy} hidden/><UploadCloud size={17}/>{busy?"Enviando...":"Selecionar arquivos"}</label>{uploading.map(n=><p className="uploading-item" key={n}>Enviando: {n}</p>)}{message&&<p className="upload-success">{message}</p>}{error&&<p className="form-error">{error}</p>}{!uploadsEnabled&&<p className="privacy-note">Envios temporariamente desativados.</p>}<label className="uploader-name">Seu nome (opcional)<input value={uploader} onChange={e=>setUploader(e.target.value)} maxLength={80} placeholder="Como devemos identificar você?"/></label></section>
   <section className="gallery-grid-section"><div className="gallery-section-heading"><div><h2>Momentos compartilhados</h2><p>{items.length} arquivo(s) aprovado(s)</p></div><button className="outline-action" onClick={()=>void refresh()}><Heart size={15}/> Atualizar</button></div>{items.length===0?<div className="gallery-empty"><ImageIcon size={34}/><p>As primeiras memórias aparecerão aqui assim que forem enviadas e aprovadas.</p></div>:<div className="gallery-grid">{items.map(item=><button className="gallery-tile" key={item.id} onClick={()=>setSelected(item)} aria-label={"Abrir "+item.name}>{item.kind==="image"?<img src={item.url} alt={item.name} loading="lazy"/>:<div className="video-tile"><Video size={32}/><span>Vídeo</span></div>}<span className="tile-caption">{item.name}</span></button>)}</div>}</section>
  </>}
  {selected&&<div className="modal-backdrop gallery-lightbox" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="gallery-viewer" role="dialog" aria-modal="true"><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Fechar">×</button>{selected.kind==="image"?<img src={selected.url} alt={selected.name}/>:<video src={selected.url} controls playsInline/>}<p>{selected.name}</p></section></div>}
 </main>;
}
