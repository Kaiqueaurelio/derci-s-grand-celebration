import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";
import { doorSearch, doorCheckIn } from "@/lib/door.functions";
import { CheckCircle2, LogOut, Search, RefreshCw, Users } from "lucide-react";

export const Route = createFileRoute("/portaria")({ component: DoorPage });
type Group = Awaited<ReturnType<typeof doorSearch>>[number];

function DoorPage(){
 const navigate=useNavigate();const [q,setQ]=useState("");const [groups,setGroups]=useState<Group[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [roleReady,setRoleReady]=useState(false);
 useEffect(()=>{void (async()=>{try{const me=await getMyRole();if(me.role!=="door"&&me.role!=="admin"){await navigate({to:"/entrar"});return;}setRoleReady(true);}catch{await navigate({to:"/entrar"});}})();},[]);
 async function search(value=q){setBusy(true);setError("");try{const result=await doorSearch({data:{q:value}});setGroups(result);}catch(e){setError(e instanceof Error?e.message:"Falha ao pesquisar convidados.");}finally{setBusy(false);}}
 async function toggle(guestId:string,checked:boolean){setError("");try{await doorCheckIn({data:{guestId,undo:checked}});await search();}catch(e){setError(e instanceof Error?e.message:"Falha no check-in.");}}
 async function signOut(){await supabase.auth.signOut();await navigate({to:"/entrar"});}
 return <main className="derci-page admin-page"><header className="admin-header"><div><p className="modal-kicker">DONA DERCI · 80 ANOS</p><h1>Controle de portaria</h1><p>Pesquise qualquer nome da família e registre a chegada individual.</p></div><button className="outline-action" onClick={signOut}><LogOut size={16}/> Sair</button></header>
 {!roleReady?<p className="empty-message">Verificando acesso...</p>:<section className="admin-list-card door-card"><div className="list-toolbar door-toolbar"><div className="search-field"><Search size={19}/><input aria-label="Pesquisar convidado por nome" value={q} onChange={e=>{setQ(e.target.value);if(e.target.value.trim().length>=2)void search(e.target.value)}} onKeyDown={e=>{if(e.key==="Enter")void search()}} placeholder="Digite nome de convidado ou acompanhante"/></div><button className="primary-action compact-action" onClick={()=>void search()} disabled={busy}><RefreshCw size={16}/> {busy?"Buscando...":"Buscar"}</button></div>{error&&<p className="form-error" role="alert">{error}</p>}{groups.length===0&&!busy?<p className="empty-message">Digite pelo menos duas letras para localizar um convidado.</p>:<div className="guest-list">{groups.map(g=><article className="guest-group-card" key={g.id}><div className="group-top"><div><h3>{g.responsibleName}</h3><span className={"status-pill "+(g.attending===true?"confirmed":g.attending===false?"declined":"pending")}>{g.attending===true?"Grupo confirmado":g.attending===false?"Grupo não comparecerá":"Resposta pendente"}</span></div></div><ul className="guest-names">{g.guests.map(person=><li key={person.id}><span>{person.fullName}{person.isResponsible?" (responsável)":""}</span><button className={person.checkedInAt?"checked-pill check-button done":"outline-action small-action check-button"} onClick={()=>void toggle(person.id,!!person.checkedInAt)}><CheckCircle2 size={16}/>{person.checkedInAt?"Desfazer entrada":"Registrar entrada"}</button></li>)}</ul></article>)}</div>}</section>}
 </main>
}
