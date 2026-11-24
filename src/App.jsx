import { useEffect, useMemo, useState } from 'react';
import { supabase, hasSupabase } from './lib/supabase';

const demoEvents = [
  { id:'demo-1', title:'Torneo PvP - SNT', description:'Competencia 1vs1 / 2vs2', category:'Competencia', starts_at:future(1,14), roblox_url:'', status:'published', organizer:'SNT' },
  { id:'demo-2', title:'Desafío Parkour', description:'Recorre, salta y llega a la meta', category:'Evento', starts_at:future(2,15), roblox_url:'', status:'published', organizer:'SNT' },
  { id:'demo-3', title:'Noche SNT - DJ Session', description:'Música, roles y ambiente del clan', category:'Social', starts_at:future(4,20), roblox_url:'', status:'published', organizer:'SNT' }
];
function future(days, hour) { const d = new Date(); d.setDate(d.getDate()+days); d.setHours(hour,0,0,0); return d.toISOString(); }
// Evita combinar dateStyle/timeStyle con opciones individuales de Intl, lo que lanza RangeError y deja la app en blanco.
const fmt = (date, options) => new Intl.DateTimeFormat(undefined, options && Object.keys(options).length ? options : {dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
function countdown(date) {
  const ms = Math.max(0,new Date(date).getTime()-Date.now());
  const days=Math.floor(ms/86400000), hours=Math.floor(ms%86400000/3600000), mins=Math.floor(ms%3600000/60000), secs=Math.floor(ms%60000/1000);
  return {days,hours,mins,secs};
}
function Icon({name}) {
 const paths={calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',clock:'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',swords:'m14.5 17.5 3 3L22 16l-3-3m-5-1 7-7-3-3-7 7m-1 7-7 7-3-3 7-7m-1-1 3 3',run:'M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 21l5-7 3 2 3 5m-6-7 2-5 4 2 3 0m-7-2 2-3',music:'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm12-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7a4 4 0 0 1 0 8m2 4a4 4 0 0 1 3 4v1',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2m17.1-7.1-2.1 2.1M7 17l-2.1 2.1m14.2 0L17 17M7 7 4.9 4.9',plus:'M12 5v14m-7-7h14',logout:'M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7'};
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]||paths.calendar}/></svg>;
}
function Logo(){return <div className="brand"><div className="crown">♛</div><div className="brand-word">SNT</div><div className="brand-sub">SINIESTRO</div></div>}
function EventRow({event,large=false}) {
 const [tick,setTick]=useState(0);
 useEffect(()=>{const id=setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(id)},[]);
 const c=countdown(event.starts_at);
 const past=new Date(event.starts_at)<new Date();
 const type=event.category==='Competencia'?'swords':event.category==='Social'?'music':'run';
 return <article className={`event-row ${large?'event-large':''}`}>
   <div className={`event-thumb thumb-${type}`}><Icon name={type}/></div>
   <div className="event-type-icon"><Icon name={type}/></div>
   <div className="event-info"><h3>{event.title}</h3><p>{event.description||'Actividad oficial del clan SNT'}</p><span className="tag">{event.category||'Evento'}</span></div>
   <div className="event-date"><Icon name="calendar"/><div><strong>{fmt(event.starts_at,{weekday:'short',day:'numeric',month:'short'})}</strong><span>{fmt(event.starts_at,{hour:'numeric',minute:'2-digit'})}</span><small>Tu hora local</small></div></div>
   <div className="count-box"><small>{past?'Comenzó':'Inicia en'}</small><strong>{past?'En curso':c.days?c.days+'d '+c.hours+'h':c.hours+'h '+c.mins+'m'}</strong><em>{!past&&c.days===0?String(c.secs).padStart(2,'0')+' s':''}</em></div>
   {event.roblox_url&&<a className="event-link" href={event.roblox_url} target="_blank" rel="noreferrer">Abrir Roblox ↗</a>}
 </article>
}
export default function App(){
 const [events,setEvents]=useState(demoEvents);
 const [page,setPage]=useState('home');
 const [user,setUser]=useState(null);
 const [profile,setProfile]=useState(null);
 const [showLogin,setShowLogin]=useState(false);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [title,setTitle]=useState('');
 const [description,setDescription]=useState('');
 const [category,setCategory]=useState('Evento');
 const [date,setDate]=useState('');
 const [roblox,setRoblox]=useState('');
 const [clock,setClock]=useState(new Date());
 const [calendar,setCalendar]=useState(false);
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
 useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>{
   if(!supabase)return;
   supabase.from('events').select('*').eq('status','published').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').then(({data,error})=>{if(!error&&data)setEvents(data.length?data:[])});
   supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null));
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>setUser(session?.user||null));
   return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{async function load(){if(!user||!supabase){setProfile(null);return}const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();setProfile(data)}load()},[user]);
 const upcoming=useMemo(()=>events.filter(e=>e.status==='published'&&new Date(e.starts_at)>new Date(Date.now()-3600000)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),[events]);
 async function login(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setError(error.message);else{setShowLogin(false);setPassword('')}}
 async function createEvent(e){e.preventDefault();if(!supabase||!profile){setError('Inicia sesión con una cuenta administradora activa.');return}setBusy(true);setError('');const {error}=await supabase.from('events').insert({title,description,category,starts_at:new Date(date).toISOString(),timezone:tz,roblox_url:roblox||null,status:'published',organizer:profile.full_name||'SNT',created_by:user.id});setBusy(false);if(error){setError(error.message);return}setNotice('Evento publicado correctamente.');setTitle('');setDescription('');setDate('');setRoblox('');const {data}=await supabase.from('events').select('*').eq('status','published').order('starts_at');if(data)setEvents(data);setPage('events')}
 async function logout(){await supabase?.auth.signOut();setProfile(null);setUser(null);setPage('home')}
 const admin=profile?.active&&(profile.role==='owner'||profile.role==='admin');
 return <div className="app-shell">
  <header className="mobile-top"><button className="menu-button" onClick={()=>setPage(page==='menu'?'home':'menu')}>☰</button><Logo/><button className="admin-entry" onClick={()=>setShowLogin(true)}>Admin</button></header>
  <aside className="sidebar"><div className="side-brand"><Logo/><p>EVENTOS OFICIALES</p></div><nav>{[['home','Inicio','home'],['events','Eventos','calendar'],['calendar','Calendario','calendar'],...(admin?[['create','Crear evento','plus']]:[])].map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon}/>{label}</button>)}</nav><div className="side-bottom"><div className="side-status"><span/> Plataforma SNT</div><button onClick={()=>admin?logout():setShowLogin(true)}><Icon name={admin?'logout':'settings'}/>{admin?'Cerrar sesión':'Acceso administrativo'}</button></div></aside>
  <main className="main-content">
   <div className="topbar"><div><span className="eyebrow">CLAN SNT · SINIESTRO</span><h1>{page==='home'?'Eventos oficiales':page==='events'?'Todos los eventos':page==='calendar'?'Calendario SNT':page==='create'?'Crear evento':'Menú'}</h1></div><div className="local-clock"><Icon name="clock"/><div><small>Tu hora local</small><strong>{new Intl.DateTimeFormat('es',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(clock)}</strong><span>{tz.replaceAll('_',' ')} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div></div></div>
   {notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} ×</div>}
   {page==='home'&&<><section className="hero-banner"><div className="hero-lines"/><Logo/><div className="hero-copy"><span>CALENDARIO DE ACTIVIDADES</span><h2>La próxima leyenda<br/>se escribe en equipo.</h2><p>Prepárate para competir, compartir y representar a SNT.</p></div><div className="hero-orbit">SNT<br/><b>✦</b></div></section>
    <div className="section-heading"><div><span className="eyebrow">NO TE LO PIERDAS</span><h2>Próximos eventos</h2></div><button className="text-button" onClick={()=>setPage('events')}>Ver todos <b>→</b></button></div>
    {upcoming.length?<div className="events-list">{upcoming.slice(0,4).map(e=><EventRow key={e.id} event={e}/>)}</div>:<div className="empty-state"><Icon name="calendar"/><h3>Aún no hay eventos publicados</h3><p>Cuando el equipo SNT programe una actividad, aparecerá aquí.</p></div>}
    <div className="bottom-grid"><section className="panel"><div className="panel-title"><Icon name="bell"/><h3>Información del clan</h3></div><p className="muted">Consulta esta página para enterarte de torneos, desafíos y reuniones oficiales. Los horarios se muestran automáticamente según la zona horaria de tu dispositivo.</p><div className="timezone-pill"><Icon name="clock"/> Zona detectada: <b>{tz}</b></div></section><section className="panel feature-panel"><span className="eyebrow">SIEMPRE PREPARADOS</span><h3>Una comunidad.<br/>Un mismo objetivo.</h3><p>Nos vemos en el próximo evento.</p></section></div>
   </>}
   {page==='events'&&<><div className="section-heading"><div><span className="eyebrow">AGENDA SNT</span><h2>Todos los eventos</h2></div><span className="muted">{upcoming.length} próximos</span></div>{upcoming.length?<div className="events-list">{upcoming.map(e=><EventRow key={e.id} event={e} large/>)}</div>:<div className="empty-state"><Icon name="calendar"/><h3>No hay eventos próximos</h3><p>Vuelve pronto para consultar las nuevas actividades.</p></div>}</>}
   {page==='calendar'&&<section className="panel calendar-panel"><div className="section-heading"><div><span className="eyebrow">VISTA MENSUAL</span><h2>{new Intl.DateTimeFormat('es',{month:'long',year:'numeric'}).format(clock)}</h2></div><button className="outline-button" onClick={()=>setPage('events')}>Lista de eventos</button></div><div className="calendar-grid">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(x=><b key={x}>{x}</b>)}{Array.from({length:new Date(clock.getFullYear(),clock.getMonth(),1).getDay()},(_,i)=><span key={'e'+i}/>)}{Array.from({length:new Date(clock.getFullYear(),clock.getMonth()+1,0).getDate()},(_,i)=>{const n=i+1;const dayEvents=upcoming.filter(e=>{const d=new Date(e.starts_at);return d.getFullYear()===clock.getFullYear()&&d.getMonth()===clock.getMonth()&&d.getDate()===n});return <div className={`calendar-day ${n===clock.getDate()?'today':''}`} key={n}><span>{n}</span>{dayEvents.map(e=><small key={e.id} title={e.title}>{e.title}</small>)}</div>})}</div></section>}
   {page==='create'&&<section className="panel form-panel"><span className="eyebrow">PANEL DE ORGANIZACIÓN</span><h2>Publicar nuevo evento</h2>{!admin?<div className="empty-state"><Icon name="settings"/><h3>Acceso restringido</h3><p>Inicia sesión con una cuenta administradora para crear eventos.</p><button className="primary-button" onClick={()=>setShowLogin(true)}>Iniciar sesión</button></div>:<form onSubmit={createEvent}><label>Nombre del evento<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Torneo PvP SNT"/></label><label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalles de la actividad"/></label><div className="form-row"><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Evento</option><option>Competencia</option><option>Social</option><option>Reunión</option></select></label><label>Fecha y hora<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>Enlace de Roblox (opcional)<input type="url" value={roblox} onChange={e=>setRoblox(e.target.value)} placeholder="https://www.roblox.com/..."/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Publicando…':'Publicar evento'}</button></form>}</section>}
   <footer>© {new Date().getFullYear()} SNT SINIESTRO <span>Hecho para la comunidad.</span></footer>
  </main>
  {showLogin&&<div className="modal-backdrop" onClick={()=>setShowLogin(false)}><section className="login-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowLogin(false)}>×</button><Logo/><h2>Acceso administrativo</h2><p>Ingresa con tu cuenta autorizada de SNT.</p>{!hasSupabase?<div className="error">La conexión con Supabase aún no está configurada en el despliegue.</div>:<form onSubmit={login}><label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Entrando…':'Iniciar sesión'}</button></form>}</section></div>}
 </div>
}