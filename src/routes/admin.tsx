import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDashboard, getMyRole, saveGroup, deleteGroup } from "@/lib/admin.functions";
import { LogOut, Search, Users, CheckCircle2, Clock3, XCircle, Download, RefreshCw, Plus } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
type GuestGroup = Dashboard["groups"][number];

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

  async function refresh(){
    setBusy(true);setError("");
    try { const role=await getMyRole(); if(role.role!=="admin"&&!role.canClaim){await navigate({to:"/entrar"});return;} setData(await getDashboard()); }
    catch(e){setError(e instanceof Error?e.message:"Falha ao carregar painel.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void refresh();},[]);

  const groups=useMemo(()=>{const list=data?.groups??[];const q=query.trim().toLocaleLowerCase("pt-BR");return list.filter(g=>!q||[g.responsible_name,...g.guests.map(x=>x.full_name)].some(n=>n.toLocaleLowerCase("pt-BR").includes(q)));},[data,query]);

  function newGroup(){setEditing(null);setName("");setPhone("");setAttending("yes");setCompanions([]);setNotes("");setShowForm(true);}
  function editGroup(g:GuestGroup){setEditing(g);setName(g.responsible_name);setPhone(g.phone??"");setAttending(g.attending===true?"yes":g.attending===false?"no":"pending");setCompanions(g.guests.filter(x=>!x.is_responsible).map(x=>x.full_name));setNotes(g.notes??"");setShowForm(true);}
  async function save(e:React.FormEvent){e.preventDefault();setError("");try{await saveGroup({data:{id:editing?.id,responsibleName:name,phone,attending,companions,notes}});setShowForm(false);await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}}
  async function remove(g:GuestGroup){if(!window.confirm("Excluir a confirmação de "+g.responsible_name+"?"))return;try{await deleteGroup({data:{id:g.id}});await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao excluir.");}}
  async function signOut(){await supabase.auth.signOut();await navigate({to:"/entrar"});}
  function exportCsv(){const rows=[["Responsável","Nome completo","Status","Telefone","Check-in"]];for(const g of data?.groups??[]){for(const x of g.guests){rows.push([g.responsible_name,x.full_name,g.attending===true?"Confirmado":g.attending===false?"Não comparecerá":"Pendente",g.phone??"",x.checked_in_at?"Entrou":"Não entrou"]);}}const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="lista-convidados-derci.csv";a.click();URL.revokeObjectURL(url);}

  const stats=data?.stats;
  return <main className="derci-page admin-page">
    <header className="admin-header"><div><p className="modal-kicker">DONA DERCI · 80 ANOS</p><h1>Painel de convidados</h1><p>Lista de presença e controle da celebração.</p></div><div className="admin-header-actions"><button className="outline-action" onClick={()=>void refresh()}><RefreshCw size={16}/> Atualizar</button><button className="outline-action" onClick={exportCsv}><Download size={16}/> Exportar CSV</button><button className="outline-action" onClick={signOut}><LogOut size={16}/> Sair</button></div></header>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {stats&&<section className="stats-grid">
      <article className="stat-card"><CheckCircle2/><span>Pessoas confirmadas</span><strong>{stats.confirmed}</strong></article>
      <article className="stat-card"><Users/><span>Responsáveis</span><strong>{stats.responsibles}</strong></article>
      <article className="stat-card"><Users/><span>Acompanhantes</span><strong>{stats.companions}</strong></article>
      <article className="stat-card"><XCircle/><span>Não comparecerão</span><strong>{stats.declined}</strong></article>
      <article className="stat-card"><Clock3/><span>Pendentes</span><strong>{stats.pending}</strong></article>
      <article className="stat-card"><CheckCircle2/><span>Check-ins</span><strong>{stats.checkins}</strong></article>
    </section>}
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
    {showForm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="rsvp-modal edit-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={()=>setShowForm(false)}>×</button><h2>{editing?"Editar grupo":"Adicionar convidado"}</h2><form onSubmit={save}><label>Responsável<input required minLength={3} value={name} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><fieldset><legend>Status</legend><label className="radio-label"><input type="radio" checked={attending==="yes"} onChange={()=>setAttending("yes")}/> Confirmado</label><label className="radio-label"><input type="radio" checked={attending==="pending"} onChange={()=>setAttending("pending")}/> Pendente</label><label className="radio-label"><input type="radio" checked={attending==="no"} onChange={()=>setAttending("no")}/> Não comparecerá</label></fieldset>{attending!=="no"&&<div className="companions"><div className="companions-heading"><Users size={18}/> Acompanhantes</div>{companions.map((n,i)=><div className="companion-row" key={i}><input required value={n} onChange={e=>setCompanions(old=>old.map((v,j)=>i===j?e.target.value:v))} placeholder="Nome completo"/><button type="button" onClick={()=>setCompanions(old=>old.filter((_,j)=>i!==j))}>×</button></div>)}{companions.length<30&&<button type="button" className="add-companion" onClick={()=>setCompanions(old=>[...old,""])}>+ Adicionar acompanhante</button>}</div>}<label>Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="primary-action submit-action">Salvar convidado</button></form></section></div>}
  </main>;
}
