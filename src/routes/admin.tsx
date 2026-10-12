import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDashboard, getMyRole, saveGroup, deleteGroup, listAllMedia, moderateMedia, getDriveStatus, saveDriveFolder, testDriveConnection, retryDriveUploads, syncDriveFolder, askRsvpAssistant, getEventSettings, updateEventSettings } from "@/lib/admin.functions";
import { LogOut, Search, Users, CheckCircle2, Clock3, XCircle, Download, RefreshCw, Plus, Sparkles, Send, Bot, Settings, CalendarDays, MapPin, Image, Save, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
type GuestGroup = Dashboard["groups"][number];
type MediaItem = Awaited<ReturnType<typeof listAllMedia>>[number];
type DriveInfo = Awaited<ReturnType<typeof getDriveStatus>>;
type EventSettings = Awaited<ReturnType<typeof getEventSettings>>;

function AdminPage() {
  const navigate=useNavigate();
  const [data,setData]=useState<Dashboard|null>(null);
  const [query,setQuery]=useState("");
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<GuestGroup|null>(null);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [attending,setAttending]=useState<"yes"|"no"|"pending">("yes");
  const [companions,setCompanions]=useState<string[]>([]);
  const [notes,setNotes]=useState("");
  const [media,setMedia]=useState<MediaItem[]>([]);
  const [drive,setDrive]=useState<DriveInfo|null>(null);
  const [driveFolder,setDriveFolder]=useState("");
  const [mediaBusy,setMediaBusy]=useState(false);
  const [driveBusy,setDriveBusy]=useState(false);
  const [mediaFilter,setMediaFilter]=useState<"all"|"pending"|"approved">("all");
  const [assistantQuestion,setAssistantQuestion]=useState("");
  const [assistantAnswer,setAssistantAnswer]=useState("");
  const [assistantBusy,setAssistantBusy]=useState(false);
  const [assistantUpdatedAt,setAssistantUpdatedAt]=useState("");
  const [activeTab,setActiveTab]=useState<"overview"|"gallery"|"settings">("overview");
  const [eventSettings,setEventSettings]=useState<EventSettings|null>(null);
  const [settingsBusy,setSettingsBusy]=useState(false);
  const [settingsSaving,setSettingsSaving]=useState(false);
  const [galleryCode,setGalleryCode]=useState("");
  const [settingsMessage,setSettingsMessage]=useState("");

  async function refresh(){
    setBusy(true);setError("");
    try { const role=await getMyRole(); if(role.role!=="admin"&&!role.canClaim){await navigate({to:"/entrar"});return;} setData(await getDashboard()); }
    catch(e){setError(e instanceof Error?e.message:"Falha ao carregar painel.");}
    finally{setBusy(false);}
  }
  async function loadSettings(){
    setSettingsBusy(true);setError("");setSettingsMessage("");
    try { setEventSettings(await getEventSettings()); }
    catch(e){setError(e instanceof Error?e.message:"Falha ao carregar configurações.");}
    finally{setSettingsBusy(false);}
  }
  async function saveSettings(e:React.FormEvent){
    e.preventDefault();if(!eventSettings||settingsSaving)return;
    setSettingsSaving(true);setError("");setSettingsMessage("");
    try {
      await updateEventSettings({data:{
        honoree:eventSettings.honoree,event_date:eventSettings.event_date,event_time:eventSettings.event_time,weekday_label:eventSettings.weekday_label,
        location:eventSettings.location,maps_url:eventSettings.maps_url??"",rsvp_open:eventSettings.rsvp_open,
        phone_required:eventSettings.phone_required,max_companions:eventSettings.max_companions,
        gallery_enabled:eventSettings.gallery_enabled,gallery_access:eventSettings.gallery_access,
        gallery_code:galleryCode,moderation_required:eventSettings.moderation_required,uploads_enabled:eventSettings.uploads_enabled,
        max_image_mb:eventSettings.max_image_mb,max_video_mb:eventSettings.max_video_mb,uploads_per_hour:eventSettings.uploads_per_hour,
      }});
      setGalleryCode("");setSettingsMessage("Configurações salvas com sucesso.");setEventSettings(await getEventSettings());
    } catch(e){setError(e instanceof Error?e.message:"Falha ao salvar configurações.");}
    finally{setSettingsSaving(false);}
  }
  function patchSettings(patch:Partial<EventSettings>){setEventSettings(old=>old?{...old,...patch}:old);}
  async function refreshMedia(showLoading=true){
    if(showLoading)setMediaBusy(true);
    try { setMedia(await listAllMedia()); setDrive(await getDriveStatus()); }
    catch(e){ setError(e instanceof Error ? e.message : "Falha ao carregar galeria."); }
    finally { if(showLoading)setMediaBusy(false); }
  }
  useEffect(()=>{void refresh();void refreshMedia();},[]);
  // Poll quietly so newly uploaded media appears without manual refresh or loading flicker.
  useEffect(()=>{const timer=window.setInterval(()=>{void refreshMedia(false);},10000);return()=>window.clearInterval(timer);},[]);

  const groups=useMemo(()=>{const list=data?.groups??[];const q=query.trim().toLocaleLowerCase("pt-BR");return list.filter(g=>!q||[g.responsible_name,...g.guests.map(x=>x.full_name)].some(n=>n.toLocaleLowerCase("pt-BR").includes(q)));},[data,query]);

  function newGroup(){setEditing(null);setName("");setPhone("");setAttending("yes");setCompanions([]);setNotes("");setShowForm(true);}
  function editGroup(g:GuestGroup){setEditing(g);setName(g.responsible_name);setPhone(g.phone??"");setAttending(g.attending===true?"yes":g.attending===false?"no":"pending");setCompanions(g.guests.filter(x=>!x.is_responsible).map(x=>x.full_name));setNotes(g.notes??"");setShowForm(true);}
  async function save(e:React.FormEvent){e.preventDefault();setError("");try{await saveGroup({data:{id:editing?.id,responsibleName:name,phone,attending,companions,notes}});setShowForm(false);await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}}
  async function remove(g:GuestGroup){if(!window.confirm("Excluir a confirmação de "+g.responsible_name+"?"))return;try{await deleteGroup({data:{id:g.id}});await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao excluir.");}}
  async function signOut(){await supabase.auth.signOut();await navigate({to:"/entrar"});}
  async function moderate(id:string,action:"approve"|"reject"|"delete"){
    if(action==="delete"&&!window.confirm("Excluir definitivamente este arquivo?"))return;
    setError("");
    try{await moderateMedia({data:{id,action}});await refreshMedia();}
    catch(e){setError(e instanceof Error?e.message:"Falha ao moderar arquivo.");}
  }
  async function saveFolder(){
    setDriveBusy(true);setError("");
    try{await saveDriveFolder({data:{folder:driveFolder}});setDriveFolder("");await refreshMedia();}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível configurar a pasta.");await refreshMedia();}
    finally{setDriveBusy(false);}
  }
  async function testDrive(){
    setDriveBusy(true);setError("");
    try{await testDriveConnection();await refreshMedia();}
    catch(e){setError(e instanceof Error?e.message:"Falha ao testar Google Drive.");await refreshMedia();}
    finally{setDriveBusy(false);}
  }
  async function syncDrive(){
    setDriveBusy(true);setError("");
    try{const r=await syncDriveFolder();setError("");await refreshMedia();window.alert(r.summary);}
    catch(e){setError(e instanceof Error?e.message:"Falha ao sincronizar Drive.");}
    finally{setDriveBusy(false);}
  }
  async function retryDrive(){
    setDriveBusy(true);setError("");
    try{const r=await retryDriveUploads();await refreshMedia();window.alert(`Google Drive: ${r.ok} sucesso(s), ${r.fail} falha(s).`);}
    catch(e){setError(e instanceof Error?e.message:"Falha ao reenviar arquivos.");}
    finally{setDriveBusy(false);}
  }
  async function askAssistant(question=assistantQuestion){
    const prompt=question.trim();if(prompt.length<3||assistantBusy)return;
    setAssistantQuestion(prompt);setAssistantBusy(true);setAssistantAnswer("");setError("");
    try{const result=await askRsvpAssistant({data:{question:prompt}});setAssistantAnswer(result.answer);setAssistantUpdatedAt(result.updatedAt);}
    catch(e){setAssistantAnswer(e instanceof Error?e.message:"Não foi possível consultar as confirmações agora.");}
    finally{setAssistantBusy(false);}
  }
  function exportCsv(){const rows=[["Responsável","Nome completo","Status","Telefone","Check-in"]];for(const g of data?.groups??[]){for(const x of g.guests){rows.push([g.responsible_name,x.full_name,g.attending===true?"Confirmado":g.attending===false?"Não comparecerá":"Pendente",g.phone??"",x.checked_in_at?"Entrou":"Não entrou"]);}}const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="lista-convidados-derci.csv";a.click();URL.revokeObjectURL(url);}

  const stats=data?.stats;
  return <main className="derci-page admin-page">
    <header className="admin-header"><div><p className="modal-kicker">DONA DERCI · 80 ANOS</p><h1>{activeTab==="settings"?"Configurações do evento":activeTab==="gallery"?"Galeria ao vivo":"Painel de convidados"}</h1><p>{activeTab==="settings"?"Edite as informações públicas e as regras do aplicativo.":activeTab==="gallery"?"Fotos e vídeos atualizados automaticamente e enviados ao Google Drive.":"Lista de presença e controle da celebração."}</p></div><nav className="admin-mobile-nav" aria-label="Navegação administrativa"><button type="button" aria-current={activeTab==="overview"?"page":undefined} className={activeTab==="overview"?"admin-nav-item active":"admin-nav-item"} onClick={()=>setActiveTab("overview")}><Users size={17}/> Visão geral</button><button type="button" aria-current={activeTab==="gallery"?"page":undefined} className={activeTab==="gallery"?"admin-nav-item active":"admin-nav-item"} onClick={()=>{setActiveTab("gallery");void refreshMedia();}}><Image size={17}/> Galeria ao vivo</button><button type="button" aria-current={activeTab==="settings"?"page":undefined} className={activeTab==="settings"?"admin-nav-item active":"admin-nav-item"} onClick={()=>{setActiveTab("settings");if(!eventSettings&&!settingsBusy)void loadSettings();}}><Settings size={17}/> Configurações</button></nav><div className="admin-header-actions">{activeTab!=="overview"&&<button className="outline-action" onClick={()=>setActiveTab("overview")}><ArrowLeft size={16}/> Voltar ao painel</button>}{activeTab==="overview"&&<><button className="outline-action" onClick={()=>void refresh()}><RefreshCw size={16}/> Atualizar</button><button className="outline-action" onClick={()=>void loadSettings()}><Settings size={16}/> Configurações</button><button className="outline-action" onClick={exportCsv}><Download size={16}/> Exportar CSV</button></>}<button className="outline-action" onClick={signOut}><LogOut size={16}/> Sair</button></div></header>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {activeTab==="settings"?<section className="admin-list-card event-settings-card">
      <div className="media-heading"><div><p className="modal-kicker">ÁREA ADMINISTRATIVA</p><h2><Settings size={22}/> Informações do evento</h2><p>As alterações são salvas no banco de dados e refletem nas partes do aplicativo que usam essas configurações.</p></div></div>
      {settingsBusy||!eventSettings?<p className="empty-message">{settingsBusy?"Carregando configurações...":"Clique em Configurações novamente se os dados não carregarem."}</p>:<form className="event-settings-form" onSubmit={saveSettings}>
        <section className="settings-section"><h3><CalendarDays size={18}/> Identidade e data do evento</h3>
          <label>Nome da pessoa homenageada<input required minLength={2} maxLength={120} value={eventSettings.honoree} onChange={e=>patchSettings({honoree:e.target.value})}/></label>
          <label>Data do evento<input type="date" required value={eventSettings.event_date} onChange={e=>patchSettings({event_date:e.target.value})}/></label>
          <label>Dia da semana exibido<input maxLength={30} value={eventSettings.weekday_label ?? ""} onChange={e=>patchSettings({weekday_label:e.target.value})} placeholder="Ex.: Domingo"/></label>
          <label>Horário<input required maxLength={20} value={eventSettings.event_time} onChange={e=>patchSettings({event_time:e.target.value})} placeholder="Ex.: 12h às 18h"/></label>
          <label><MapPin size={16}/> Endereço/local<input required minLength={3} maxLength={200} value={eventSettings.location} onChange={e=>patchSettings({location:e.target.value})}/></label>
          <label>Link do Google Maps<input type="url" value={eventSettings.maps_url??""} onChange={e=>patchSettings({maps_url:e.target.value})} placeholder="https://maps.google.com/..."/></label>
        </section>
        <section className="settings-section"><h3><Users size={18}/> Confirmação de presença</h3>
          <label className="settings-toggle"><input type="checkbox" checked={eventSettings.rsvp_open} onChange={e=>patchSettings({rsvp_open:e.target.checked})}/> Aceitar novas confirmações</label>
          <label className="settings-toggle"><input type="checkbox" checked={eventSettings.phone_required} onChange={e=>patchSettings({phone_required:e.target.checked})}/> Exigir telefone/WhatsApp</label>
          <label>Máximo de acompanhantes por grupo<input type="number" min={0} max={30} required value={eventSettings.max_companions} onChange={e=>patchSettings({max_companions:Number(e.target.value)})}/></label>
        </section>
        <section className="settings-section"><h3><Image size={18}/> Galeria de fotos e vídeos</h3>
          <label className="settings-toggle"><input type="checkbox" checked={eventSettings.gallery_enabled} onChange={e=>patchSettings({gallery_enabled:e.target.checked})}/> Habilitar galeria</label>
          <label className="settings-toggle"><input type="checkbox" checked={eventSettings.uploads_enabled} onChange={e=>patchSettings({uploads_enabled:e.target.checked})}/> Permitir novos envios</label>
          <label className="settings-toggle"><input type="checkbox" checked={eventSettings.moderation_required} onChange={e=>patchSettings({moderation_required:e.target.checked})}/> Exigir aprovação do administrador antes de publicar</label>
          <label>Acesso à galeria<select value={eventSettings.gallery_access} onChange={e=>patchSettings({gallery_access:e.target.value as EventSettings["gallery_access"]})}><option value="link">Qualquer pessoa com o link</option><option value="code">Código de acesso</option><option value="auth">Somente usuários autenticados</option></select></label>
          {eventSettings.gallery_access==="code"&&<label>{eventSettings.hasGalleryCode?"Definir novo código (deixe vazio para manter o atual)":"Código de acesso da galeria"}<input type="password" autoComplete="new-password" maxLength={40} value={galleryCode} onChange={e=>setGalleryCode(e.target.value)} placeholder="Digite um código novo" required={!eventSettings.hasGalleryCode}/></label>}
          <div className="settings-number-grid"><label>Limite por foto (MB)<input type="number" min={1} max={100} required value={eventSettings.max_image_mb} onChange={e=>patchSettings({max_image_mb:Number(e.target.value)})}/></label><label>Limite por vídeo (MB)<input type="number" min={1} max={100} required value={eventSettings.max_video_mb} onChange={e=>patchSettings({max_video_mb:Number(e.target.value)})}/></label><label>Envios por hora/IP<input type="number" min={1} max={1000} required value={eventSettings.uploads_per_hour} onChange={e=>patchSettings({uploads_per_hour:Number(e.target.value)})}/></label></div>
        </section>
        {settingsMessage&&<p className="success-note" role="status">{settingsMessage}</p>}
        <button className="primary-action settings-save" type="submit" disabled={settingsSaving}><Save size={17}/>{settingsSaving?"Salvando...":"Salvar configurações"}</button>
        <p className="privacy-note">Somente administradores autenticados podem alterar essas informações. O código da galeria nunca é exibido de volta na tela.</p>
      </form>}
    </section>:<>
    {activeTab==="overview"&&<>
    {stats&&<section className="stats-grid">
      <article className="stat-card"><CheckCircle2/><span>Pessoas confirmadas</span><strong>{stats.confirmed}</strong></article>
      <article className="stat-card"><Users/><span>Responsáveis</span><strong>{stats.responsibles}</strong></article>
      <article className="stat-card"><Users/><span>Acompanhantes</span><strong>{stats.companions}</strong></article>
      <article className="stat-card"><XCircle/><span>Não comparecerão</span><strong>{stats.declined}</strong></article>
      <article className="stat-card"><Clock3/><span>Pendentes</span><strong>{stats.pending}</strong></article>
      <article className="stat-card"><CheckCircle2/><span>Check-ins</span><strong>{stats.checkins}</strong></article>
    </section>}
    <section className="admin-list-card rsvp-assistant-card" aria-labelledby="rsvp-assistant-title">
      <div className="media-heading"><div><p className="modal-kicker">ASSISTENTE DA ORGANIZAÇÃO</p><h2 id="rsvp-assistant-title"><Sparkles size={21}/> Pergunte sobre as confirmações</h2><p>Respostas geradas com os dados mais recentes do evento. Telefones e observações privadas não são enviados à IA.</p></div><span className="assistant-mark"><Bot size={22}/></span></div>
      <form className="assistant-question-form" onSubmit={e=>{e.preventDefault();void askAssistant();}}>
        <label htmlFor="rsvp-assistant-question">Sua pergunta</label>
        <div className="assistant-input-row"><input id="rsvp-assistant-question" value={assistantQuestion} onChange={e=>setAssistantQuestion(e.target.value)} maxLength={600} minLength={3} placeholder="Ex.: Quantas pessoas confirmaram e ainda não chegaram?" disabled={assistantBusy}/><button className="primary-action compact-action" type="submit" disabled={assistantBusy||assistantQuestion.trim().length<3}>{assistantBusy?<RefreshCw size={16} className="assistant-spin"/>:<Send size={16}/>} {assistantBusy?"Consultando...":"Perguntar"}</button></div>
      </form>
      <div className="assistant-suggestions" aria-label="Perguntas sugeridas">
        {["Quantas pessoas confirmaram?","Quem ainda está pendente?","Quantas pessoas já fizeram check-in?","Quais grupos confirmados ainda não chegaram?"].map(q=><button key={q} type="button" className="filter-chip" disabled={assistantBusy} onClick={()=>void askAssistant(q)}>{q}</button>)}
      </div>
      {assistantAnswer&&<div className="assistant-answer" role="status"><div><Bot size={18}/><strong>Resposta do assistente</strong></div><p>{assistantAnswer}</p>{assistantUpdatedAt&&<small>Consulta realizada em {new Date(assistantUpdatedAt).toLocaleString("pt-BR")}</small>}</div>}
    </section>
    <section className="admin-list-card">
      <div className="list-toolbar"><div className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar responsável ou acompanhante..."/></div><button className="primary-action compact-action" onClick={newGroup}><Plus size={17}/> Adicionar convidado</button></div>
      {busy?<p className="empty-message">Carregando convidados...</p>:groups.length===0?<p className="empty-message">Nenhum convidado encontrado.</p>:<div className="guest-list">
        {groups.map(g=><article className="guest-group-card" key={g.id}>
          <div className="group-top"><div><h3>{g.responsible_name}</h3><span className={"status-pill "+(g.attending===true?"confirmed":g.attending===false?"declined":"pending")}>{g.attending===true?"Confirmado":g.attending===false?"Não comparecerá":"Pendente"}</span></div><div className="group-actions"><button className="outline-action small-action" onClick={()=>editGroup(g)}>Editar</button><button className="outline-action small-action danger-action" onClick={()=>void remove(g)}>Excluir</button></div></div>
          {g.phone&&<p className="group-meta">WhatsApp: {g.phone}</p>}
          <ul className="guest-names">{g.guests.map(x=><li key={x.id}><span>{x.full_name}{x.is_responsible?" (responsável)":""}</span>{x.checked_in_at&&<span className="checked-pill">Entrada registrada</span>}</li>)}</ul>
          {g.notes&&<p className="group-meta">Obs.: {g.notes}</p>}
        </article>)}
      </div>}
    </section>
    </>}
    {activeTab!=="settings"&&<>
    <section className="admin-list-card admin-media-card">
      <div className="media-heading"><div><p className="modal-kicker">ATUALIZAÇÃO AUTOMÁTICA · A CADA 15 SEGUNDOS</p><h2>Galeria ao vivo</h2><p>Novas fotos e vídeos aparecem sem recarregar a página. Os envios são encaminhados ao Google Drive quando configurado.</p></div><button className="outline-action" onClick={()=>void refreshMedia()} disabled={mediaBusy}><RefreshCw size={16}/> Atualizar agora</button></div>
      {activeTab==="gallery"&&<p className="privacy-note">A galeria é atualizada automaticamente a cada 15 segundos. Configure a pasta do Drive abaixo para sincronizar os arquivos.</p>}
      <div className="media-filter-row">
        <button className={mediaFilter==="all"?"filter-chip active":"filter-chip"} onClick={()=>setMediaFilter("all")}>Todos ({media.length})</button>
        <button className={mediaFilter==="pending"?"filter-chip active":"filter-chip"} onClick={()=>setMediaFilter("pending")}>Aguardando aprovação ({media.filter(m=>m.status==="pending_approval").length})</button>
        <button className={mediaFilter==="approved"?"filter-chip active":"filter-chip"} onClick={()=>setMediaFilter("approved")}>Aprovados ({media.filter(m=>m.status==="approved").length})</button>
      </div>
      {mediaBusy?<p className="empty-message">Carregando arquivos...</p>:media.filter(m=>mediaFilter==="all"||(mediaFilter==="pending"?m.status==="pending_approval":m.status==="approved")).length===0?<p className="empty-message">Nenhum arquivo nesta categoria.</p>:<div className="admin-media-grid">{media.filter(m=>mediaFilter==="all"||(mediaFilter==="pending"?m.status==="pending_approval":m.status==="approved")).map(m=><article className="admin-media-tile" key={m.id}>
        {m.url?(m.kind==="image"?<img src={m.url} alt={m.original_name}/>:<video src={m.url} controls preload="metadata"/>):<div className="media-no-preview">{m.kind==="video"?"Vídeo":"Imagem"} sem prévia</div>}
        <div className="admin-media-info"><strong>{m.original_name}</strong><span className={"status-pill "+(m.status==="approved"?"confirmed":m.status==="rejected"?"declined":"pending")}>{m.status==="approved"?"Aprovado":m.status==="rejected"?"Rejeitado":m.status==="pending_approval"?"Aguardando aprovação":m.status==="failed"?"Falha no envio":"Processando"}</span><small>Por: {m.uploader_name||"Convidado"} · {m.size_bytes?Math.max(1,Math.round(m.size_bytes/1024/1024))+" MB":"tamanho indisponível"}</small>
        <div className="media-actions">{m.status!=="approved"&&<button className="outline-action small-action" onClick={()=>void moderate(m.id,"approve")}>Aprovar</button>}{m.status!=="rejected"&&<button className="outline-action small-action danger-action" onClick={()=>void moderate(m.id,"reject")}>Rejeitar</button>}<button className="outline-action small-action danger-action" onClick={()=>void moderate(m.id,"delete")}>Excluir</button></div></div>
      </article>)}</div>}
    </section>
    <section className="admin-list-card admin-drive-card">
      <div className="media-heading"><div><p className="modal-kicker">ARMAZENAMENTO</p><h2>Google Drive</h2><p>Configure uma pasta e gerencie os arquivos enviados pela aplicação.</p></div><span className={"drive-status "+(drive?.connected&&drive.settings?.last_test_ok?"connected":"disconnected")}>{drive?.connected?(drive.settings?.last_test_ok?"Conexão testada":"Credenciais presentes"):"Não conectado"}</span></div>
      {drive?.settings?.folder_name&&<p className="drive-folder-current">Pasta configurada: <strong>{drive.settings.folder_name}</strong></p>}
      {drive?.settings?.last_test_error&&<p className="form-error">Último erro da integração: {drive.settings.last_test_error}</p>}
      <div className="drive-config-row"><input aria-label="Link ou ID da pasta do Google Drive" value={driveFolder} onChange={e=>setDriveFolder(e.target.value)} placeholder="Cole o link ou ID da pasta do Google Drive"/><button className="primary-action compact-action" disabled={driveBusy||driveFolder.trim().length<10} onClick={()=>void saveFolder()}>{driveBusy?"Processando...":"Configurar e testar pasta"}</button></div>
      <div className="drive-actions"><button className="outline-action" disabled={driveBusy||!drive?.settings?.folder_id} onClick={()=>void testDrive()}><CheckCircle2 size={16}/> Testar conexão</button><button className="outline-action" disabled={driveBusy||!drive?.settings?.folder_id} onClick={()=>void syncDrive()}><RefreshCw size={16}/> Sincronizar arquivos do Drive</button><button className="outline-action" disabled={driveBusy} onClick={()=>void retryDrive()}><RefreshCw size={16}/> Tentar envios pendentes</button></div>
      <p className="privacy-note">A integração depende das credenciais seguras configuradas no backend. Nenhuma credencial é exibida nesta página.</p>
    </section>
    </>}
    </>}
    {showForm&&activeTab==="overview"&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="rsvp-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="admin-guest-dialog-title"><button className="modal-close" onClick={()=>setShowForm(false)} aria-label="Fechar formulário">×</button><h2 id="admin-guest-dialog-title">{editing?"Editar grupo":"Adicionar convidado"}</h2><form onSubmit={save}><label>Responsável<input required minLength={3} value={name} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><fieldset><legend>Status</legend><label className="radio-label"><input type="radio" name="guest-status" checked={attending==="yes"} onChange={()=>setAttending("yes")}/> Confirmado</label><label className="radio-label"><input type="radio" name="guest-status" checked={attending==="pending"} onChange={()=>setAttending("pending")}/> Pendente</label><label className="radio-label"><input type="radio" name="guest-status" checked={attending==="no"} onChange={()=>setAttending("no")}/> Não comparecerá</label></fieldset>{attending!=="no"&&<div className="companions"><div className="companions-heading"><Users size={18}/> Acompanhantes</div>{companions.map((n,i)=><div className="companion-row" key={i}><input required aria-label={`Nome do acompanhante ${i+1}`} value={n} onChange={e=>setCompanions(old=>old.map((v,j)=>i===j?e.target.value:v))} placeholder="Nome completo"/><button type="button" onClick={()=>setCompanions(old=>old.filter((_,j)=>i!==j))}>×</button></div>)}{companions.length<30&&<button type="button" className="add-companion" onClick={()=>setCompanions(old=>[...old,""])}>+ Adicionar acompanhante</button>}</div>}<label>Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="primary-action submit-action">Salvar convidado</button></form></section></div>}
  </main>;
}
