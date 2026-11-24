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
function Logo(){return <div className="brand brand-image"><img src="/snt-icon.svg" alt="Emblema oficial de SNT Eventos"/></div>}
function EventRow({event,large=false,canAlert=false,onAlert,cooldownMs=0,sending=false}) {
 const [tick,setTick]=useState(0);
 useEffect(()=>{const id=setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(id)},[]);
 const c=countdown(event.starts_at);
 const past=new Date(event.starts_at)<new Date();
 const type=event.category==='Competencia'?'swords':event.category==='Social'?'music':'run';
 const left=Math.max(0,Math.ceil(cooldownMs/1000));
 const cooldownLabel=left>0?String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0'):'';
 return <article className={`event-row ${large?'event-large':''}`}>
   <div className={`event-thumb thumb-${type}`}>{event.image_url?<img src={event.image_url} alt={event.title}/>:<Icon name={type}/>}</div>
   <div className="event-type-icon"><Icon name={type}/></div>
   <div className="event-info"><h3>{event.title}</h3><p>{event.description||'Actividad oficial del clan SNT'}</p><span className="tag">{event.category||'Evento'}</span>
   {canAlert&&!past&&<div className="event-alert-control"><button type="button" className="event-bell-button" aria-label={cooldownLabel?'Alerta bloqueada por tiempo de espera':'Enviar notificación de este evento'} title={cooldownLabel?'Disponible en '+cooldownLabel:'Enviar aviso de este evento'} disabled={sending||left>0} onClick={()=>onAlert?.(event)}><Icon name="bell"/></button>{sending?<small>Enviando…</small>:cooldownLabel?<small>Disponible en {cooldownLabel}</small>:<small>Avisar a todos</small>}</div>}
   </div>
   <div className="event-date"><Icon name="calendar"/><div><strong>{fmt(event.starts_at,{weekday:'short',day:'numeric',month:'short'})}</strong><span>{fmt(event.starts_at,{hour:'numeric',minute:'2-digit',hourCycle:'h12'})}</span><small>Tu hora local</small></div></div>
   <div className="count-box"><small>{past?'Comenzó':'Inicia en'}</small><strong>{past?'En curso':c.days?c.days+'d '+c.hours+'h':c.hours+'h '+c.mins+'m'}</strong><em>{!past&&c.days===0?String(c.secs).padStart(2,'0')+' s':''}</em></div>
   {event.roblox_url&&<a className="event-link" href={event.roblox_url} target="_blank" rel="noreferrer">Abrir Roblox ↗</a>}
 </article>
}
export default function App(){
 const [events,setEvents]=useState(demoEvents);
 const [page,setPage]=useState('home');
 const [user,setUser]=useState(null);
 const [profile,setProfile]=useState(null);
 const [registeredDevices,setRegisteredDevices]=useState(null);
 const [showLogin,setShowLogin]=useState(false);
 const [resetMode,setResetMode]=useState(false);
 const [newPassword,setNewPassword]=useState('');
 const [resetSent,setResetSent]=useState(false);
 const [inviteToken,setInviteToken]=useState(()=>new URLSearchParams(window.location.search).get('invite')||'');
 const [inviteLink,setInviteLink]=useState('');
 const [inviteName,setInviteName]=useState('');
 const [inviteEmail,setInviteEmail]=useState('');
 const [invitePassword,setInvitePassword]=useState('');
 const [inviteMessage,setInviteMessage]=useState('');
 const [managedUsers,setManagedUsers]=useState([]);
 const [managedLoading,setManagedLoading]=useState(false);
 const [newUserName,setNewUserName]=useState('');
 const [newUserEmail,setNewUserEmail]=useState('');
 const [newUserPassword,setNewUserPassword]=useState('');
 const [ownerNewPassword,setOwnerNewPassword]=useState('');
 const [pushTitle,setPushTitle]=useState('¡Aviso importante de SNT!');
 const [pushBody,setPushBody]=useState('Tenemos información nueva para la familia SNT.');
 const [pushTarget,setPushTarget]=useState('all');
 const [pushSending,setPushSending]=useState(false);
 const [pushStatus,setPushStatus]=useState('');
 const [pushCooldowns,setPushCooldowns]=useState({});
 const [pushClock,setPushClock]=useState(Date.now());
 const [sendingEventId,setSendingEventId]=useState(null);
 const [managedError,setManagedError]=useState('');
 const [ownerRecoveryToken,setOwnerRecoveryToken]=useState(()=>new URLSearchParams(window.location.search).get('owner_reset')||'');
 const [ownerRecoveryPassword,setOwnerRecoveryPassword]=useState('');
 const [installPrompt,setInstallPrompt]=useState(null);
 const [soundChoice,setSoundChoice]=useState(()=>localStorage.getItem('snt-sound')||'fanfare');
 const [remindersOn,setRemindersOn]=useState(()=>localStorage.getItem('snt-reminders')!=='off');
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
 const [imageFile,setImageFile]=useState(null);
 const [clock,setClock]=useState(new Date());
 const [calendar,setCalendar]=useState(false);
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
 useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});const handler=e=>{e.preventDefault();setInstallPrompt(e)};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[]);
 useEffect(()=>{if(!supabase)return;const {data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{setUser(session?.user||null);if(event==='PASSWORD_RECOVERY'){setResetMode('update');setShowLogin(true)}if(session?.user){const pending=new URLSearchParams(window.location.search).get('invite');const fullName=localStorage.getItem('snt-pending-admin-name');if(pending&&fullName){const {error}=await supabase.rpc('accept_admin_invitation',{p_token:pending,p_full_name:fullName});if(!error){localStorage.removeItem('snt-pending-admin-name');window.history.replaceState({},'',window.location.pathname);setInviteToken('');setInviteMessage('¡Tu cuenta de administrador quedó activada!')}}}});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!remindersOn||!('Notification'in window)||Notification.permission!=='granted')return;const sent=JSON.parse(localStorage.getItem('snt-sent-reminders')||'{}');const notify=(key,title,body)=>{if(sent[key])return;sent[key]=Date.now();localStorage.setItem('snt-sent-reminders',JSON.stringify(sent));navigator.serviceWorker?.ready.then(reg=>reg.showNotification(title,{body,icon:'/snt-icon.svg',badge:'/snt-icon.svg',tag:key})).catch(()=>new Notification(title,{body,icon:'/snt-icon.svg'}));playAlert(soundChoice)};const check=()=>{const now=new Date();if(now.getHours()===9&&now.getMinutes()===0)notify('daily-am-'+now.toDateString(),'¡SNT te espera!','Revisa los próximos eventos del clan.');if(now.getHours()===18&&now.getMinutes()===0)notify('daily-pm-'+now.toDateString(),'¡Se acerca la acción!','No olvides revisar la agenda SNT.');events.forEach(ev=>{const diff=new Date(ev.starts_at).getTime()-now.getTime();if(diff<=3600000&&diff>3590000)notify(ev.id+'-1h','¡Evento SNT en 1 hora!',ev.title);if(diff<=900000&&diff>890000)notify(ev.id+'-15m','¡Evento SNT en 15 minutos!',ev.title);});};check();const id=setInterval(check,30000);return()=>clearInterval(id)},[events,remindersOn,soundChoice]);
 useEffect(()=>{
   if(!supabase)return;
   supabase.from('events').select('*').eq('status','published').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').then(({data,error})=>{if(!error&&data)setEvents(data.length?data:[])});
   supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null));
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>setUser(session?.user||null));
   return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{async function load(){if(!user||!supabase){setProfile(null);return}const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();setProfile(data)}load()},[user]);
 const upcoming=useMemo(()=>events.filter(e=>e.status==='published'&&new Date(e.starts_at)>new Date(Date.now()-3600000)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),[events]);
 async function login(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setError(error.message);else{setShowLogin(false);setPassword('');setResetMode(false)}}
 async function sendReset(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});setBusy(false);if(error)setError(error.message);else setResetSent(true)}
 async function saveNewPassword(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.updateUser({password:newPassword});setBusy(false);if(error)setError(error.message);else{setNotice('Contraseña actualizada. Ya puedes iniciar sesión.');setResetMode(false);setShowLogin(false);setNewPassword('')}}
 async function createAdminInvite(){if(!user||profile?.role!=='owner'){setError('Solo el propietario puede generar invitaciones.');return}setBusy(true);setError('');const token=crypto.randomUUID()+crypto.randomUUID();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');const {error}=await supabase.from('admin_invitations').insert({token_hash:hash,created_by:user.id,expires_at:new Date(Date.now()+7*86400000).toISOString()});setBusy(false);if(error){setError(error.message);return}setInviteLink(APP_URL+'/?invite='+token)}
 async function registerInvitedAdmin(e){e.preventDefault();setBusy(true);setError('');localStorage.setItem('snt-pending-admin-name',inviteName);const {data,error}=await supabase.auth.signUp({email:inviteEmail,password:invitePassword,options:{emailRedirectTo:APP_URL+'/?invite='+inviteToken}});setBusy(false);if(error){setError(error.message);localStorage.removeItem('snt-pending-admin-name');return}if(data.session){setInviteMessage('Cuenta creada. Activando permisos de administrador…')}else setInviteMessage('Revisa tu correo y confirma tu cuenta. Después vuelve a abrir este enlace para activar tu acceso.')}
 
  async function finishOwnerRecovery(e){e.preventDefault();setBusy(true);setError('');try{const {data,error}=await supabase.functions.invoke('owner-user-admin',{body:{action:'owner-recovery',token:ownerRecoveryToken,password:ownerRecoveryPassword}});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);setOwnerRecoveryToken('');setOwnerRecoveryPassword('');window.history.replaceState({},'',window.location.pathname);setNotice('Contraseña del propietario actualizada. Ya puedes iniciar sesión.')}catch(e){setError(e.message||'No se pudo cambiar la contraseña.')}finally{setBusy(false)}}
 async function callOwnerAdmin(payload){const {data,error}=await supabase.functions.invoke('owner-user-admin',{body:payload});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);return data}
 async function loadManagedUsers(){setManagedLoading(true);setManagedError('');try{const data=await callOwnerAdmin({action:'list'});setManagedUsers(data.users||[])}catch(e){setManagedError(e.message||'No se pudieron cargar las cuentas.')}finally{setManagedLoading(false)}}
 async function changeOwnerPassword(e){e.preventDefault();setBusy(true);setManagedError('');try{await callOwnerAdmin({action:'change-own-password',password:ownerNewPassword});setOwnerNewPassword('');setNotice('Tu contraseña principal se actualizó correctamente. Usa la nueva contraseña en tu próximo inicio de sesión.')}catch(e){setManagedError(e.message||'No se pudo cambiar tu contraseña.')}finally{setBusy(false)}}
 async function createManagedUser(e){e.preventDefault();setBusy(true);setManagedError('');try{await callOwnerAdmin({action:'create',full_name:newUserName,email:newUserEmail,password:newUserPassword,role:'admin'});setNewUserName('');setNewUserEmail('');setNewUserPassword('');setNotice('Cuenta administrativa creada. Ya puede iniciar sesión.');await loadManagedUsers()}catch(e){setManagedError(e.message||'No se pudo crear la cuenta.')}finally{setBusy(false)}}
 async function saveManagedUser(row){setBusy(true);setManagedError('');try{await callOwnerAdmin({action:'update',id:row.id,full_name:row.full_name,email:row.email,role:row.role,active:row.active,password:row.new_password||undefined});setManagedUsers(rows=>rows.map(x=>x.id===row.id?{...x,new_password:''}:x));setNotice('Cuenta actualizada correctamente.')}catch(e){setManagedError(e.message||'No se pudo actualizar la cuenta.')}finally{setBusy(false)}}
 async function deleteManagedUser(row){if(!window.confirm('¿Eliminar definitivamente la cuenta de '+row.email+'? Esta acción no se puede deshacer.'))return;setBusy(true);setManagedError('');try{await callOwnerAdmin({action:'delete',id:row.id});setManagedUsers(rows=>rows.filter(x=>x.id!==row.id));setNotice('Cuenta eliminada.')}catch(e){setManagedError(e.message||'No se pudo eliminar la cuenta.')}finally{setBusy(false)}}
 function urlBase64ToUint8Array(value){const padding='='.repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
 async function enableNotifications(){try{const ua=navigator.userAgent||'';const isIOS=/iPhone|iPad|iPod/i.test(ua);const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(isIOS&&!isStandalone){setNotice('En iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio. Luego abre el icono de SNT y pulsa Activar avisos.');return}if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){setError('Este navegador no admite notificaciones push. Actualiza Chrome o Safari.');return}if(!supabase){setError('La conexión de SNT no está disponible.');return}if(!import.meta.env.VITE_VAPID_PUBLIC_KEY){setError('Falta configurar la clave pública de notificaciones.');return}const permission=await Notification.requestPermission();if(permission!=='granted'){setError('Permite las notificaciones de SNT en los ajustes del navegador.');return}const reg=await navigator.serviceWorker.ready;let subscription=await reg.pushManager.getSubscription();if(subscription){await subscription.unsubscribe();subscription=null}subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)});const {error:saveError}=await supabase.rpc('register_snt_push_subscription',{p_subscription:subscription.toJSON()});if(saveError)throw saveError;setRemindersOn(true);localStorage.setItem('snt-reminders','on');setNotice('¡Este dispositivo quedó registrado para recibir avisos de SNT!')}catch(e){setError('No se pudieron activar las notificaciones: '+(e.message||'inténtalo de nuevo.'))}}
 async function refreshPushCooldowns(){if(profile?.role!=='owner'||!supabase)return;const {data,error}=await supabase.rpc('get_snt_event_push_cooldowns');if(!error){const next={};(data||[]).forEach(row=>{next[row.event_id]=new Date(row.next_allowed_at).getTime()});setPushCooldowns(next)}}
 async function sendEventPushAlert(event){if(profile?.role!=='owner'||!user)return;setSendingEventId(event.id);setError('');setNotice('');try{const {data:{session}}=await supabase.auth.getSession();const response=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'event',eventId:event.id})});const result=await response.json();if(response.status===429&&result.nextAllowedAt){setPushCooldowns(x=>({...x,[event.id]:new Date(result.nextAllowedAt).getTime()}));throw new Error('Espera 15 minutos antes de volver a enviar el aviso de este evento.')}if(!response.ok)throw new Error(result.error||'No se pudo enviar la notificación.');setPushCooldowns(x=>({...x,[event.id]:new Date(result.nextAllowedAt).getTime()}));setNotice(result.sent>0?'¡Aviso enviado a '+result.sent+' dispositivos!':'No hay dispositivos registrados para recibir el aviso.');}catch(e){setError(e.message||'No se pudo enviar el aviso.')}finally{setSendingEventId(null)}}

 async function installApp(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null)}else setNotice('En Chrome: menú ⋮ → Instalar aplicación o Añadir a pantalla de inicio.');}
 function playAlert(choice){try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();const notes=choice==='party'?[523,659,784,1046]:choice==='bell'?[880,660]:[523,659,784];notes.forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,ctx.currentTime+i*.16);g.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+i*.16+.03);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+i*.16+.24);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+i*.16);o.stop(ctx.currentTime+i*.16+.25)});setTimeout(()=>ctx.close(),1300)}catch{}}
 async function createEvent(e){e.preventDefault();if(!supabase||!profile){setError('Inicia sesión con una cuenta administradora activa.');return}setBusy(true);setError('');let uploadedImage=null;if(imageFile){const safeName=imageFile.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=user.id+'/'+Date.now()+'-'+safeName;const {error:uploadError}=await supabase.storage.from('snt-event-images').upload(path,imageFile,{contentType:imageFile.type,upsert:false});if(uploadError){setBusy(false);setError('No se pudo subir la imagen: '+uploadError.message);return}uploadedImage=supabase.storage.from('snt-event-images').getPublicUrl(path).data.publicUrl;}const {error}=await supabase.from('events').insert({title,short_description:description,description,category,image_url:uploadedImage,starts_at:new Date(date).toISOString(),timezone:tz,roblox_url:roblox||null,status:'published',organizer:profile.full_name||'SNT',created_by:user.id});setBusy(false);if(error){setError(error.message);return}setNotice('Evento publicado correctamente.');setTitle('');setDescription('');setDate('');setRoblox('');setImageFile(null);const {data}=await supabase.from('events').select('*').eq('status','published').order('starts_at');if(data)setEvents(data);setPage('events')}
 async function logout(){await supabase?.auth.signOut();setProfile(null);setUser(null);setPage('home')}
 const admin=profile?.active&&(profile.role==='owner'||profile.role==='admin');
 useEffect(()=>{if(page==='admins'&&profile?.role==='owner')loadManagedUsers()},[page,profile?.role]);
 useEffect(()=>{if(profile?.role==='owner')refreshPushCooldowns()},[profile?.role]);
 useEffect(()=>{if(profile?.role!=='owner'||!supabase){setRegisteredDevices(null);return}let live=true;const load=async()=>{const {data,error}=await supabase.rpc('get_snt_push_device_count');if(live&&!error&&typeof data==='number')setRegisteredDevices(data)};load();const id=setInterval(load,60000);return()=>{live=false;clearInterval(id)}},[profile?.role]);
 useEffect(()=>{const id=setInterval(()=>setPushClock(Date.now()),1000);return()=>clearInterval(id)},[]);
 return <div className="app-shell">
  <header className="mobile-top"><button className="menu-button" onClick={()=>setPage(page==='menu'?'home':'menu')}>☰</button><Logo/><button className="admin-entry" onClick={installApp}>Instalar</button><button className="admin-entry" onClick={()=>setShowLogin(true)}>Admin</button></header>
  <aside className="sidebar"><div className="side-brand"><Logo/><p>EVENTOS OFICIALES</p></div><nav>{[['home','Inicio','home'],['events','Eventos','calendar'],['calendar','Calendario','calendar'],...(admin?[['create','Crear evento','plus']]:[]),...(profile?.role==='owner'?[['notifications','Avisar próximo evento','bell']]:[]),...(profile?.role==='owner'?[['admins','Usuarios y roles','users']]:[])].map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon name={icon}/>{label}</button>)}</nav><div className="side-bottom"><div className="side-status"><span/> Plataforma SNT</div><button onClick={()=>admin?logout():setShowLogin(true)}><Icon name={admin?'logout':'settings'}/>{admin?'Cerrar sesión':'Acceso administrativo'}</button></div></aside>
  <main className="main-content">
   <div className="topbar"><div><span className="eyebrow">CLAN SNT · SINIESTRO</span><h1>{page==='home'?'Eventos oficiales':page==='events'?'Todos los eventos':page==='calendar'?'Calendario SNT':page==='create'?'Crear evento':page==='notifications'?'Centro de notificaciones':page==='admins'?'Administradores':'Menú'}</h1>{profile?.role==='owner'&&<div className="device-count">● <strong>{registeredDevices===null?'—':registeredDevices}</strong> dispositivos con avisos</div>}</div><div className="local-clock"><Icon name="clock"/><div><small>Tu hora local</small><strong>{new Intl.DateTimeFormat('es',{hour:'numeric',minute:'2-digit',second:'2-digit',hourCycle:'h12'}).format(clock)}</strong><span>{tz.replaceAll('_',' ')} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div></div></div>
   {notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} ×</div>}
   {page==='menu'&&<section className="panel mobile-menu-panel"><span className="eyebrow">NAVEGACIÓN SNT</span><h2>Menú principal</h2><nav className="mobile-menu-links">
    <button onClick={()=>setPage('home')}>⌂ <span>Inicio</span></button>
    <button onClick={()=>setPage('events')}>▦ <span>Eventos</span></button>
    <button onClick={()=>setPage('calendar')}>▣ <span>Calendario</span></button>
    {admin&&<button onClick={()=>setPage('create')}>＋ <span>Crear evento</span></button>}
    {profile?.role==='owner'&&<button onClick={()=>setPage('notifications')}>♧ <span>Avisar próximo evento</span></button>}
    {profile?.role==='owner'&&<button onClick={()=>setPage('admins')}>♛ <span>Usuarios y roles</span></button>}
    {!admin&&<button onClick={()=>setShowLogin(true)}>⚙ <span>Acceso administrativo</span></button>}
    {admin&&<button onClick={logout}>↪ <span>Cerrar sesión</span></button>}
   </nav></section>}
   {page==='home'&&<><section className="hero-banner"><div className="hero-lines"/><Logo/><div className="hero-copy"><span>CALENDARIO DE ACTIVIDADES</span><h2>La próxima leyenda<br/>se escribe en equipo.</h2></div><div className="hero-orbit">SNT<br/><b>✦</b></div></section>
    <div className="section-heading"><div><span className="eyebrow">NO TE LO PIERDAS</span><h2>Próximos eventos</h2></div><button className="text-button" onClick={()=>setPage('events')}>Ver todos <b>→</b></button></div>
    {upcoming.length?<div className="events-list">{upcoming.slice(0,4).map(e=><EventRow key={e.id} event={e} canAlert={profile?.role==='owner'} onAlert={sendEventPushAlert} cooldownMs={(pushCooldowns[e.id]||0)-pushClock} sending={sendingEventId===e.id}/>)}</div>:<div className="empty-state"><Icon name="calendar"/><h3>Aún no hay eventos publicados</h3><p>Cuando el equipo SNT programe una actividad, aparecerá aquí.</p></div>}
    <div className="bottom-grid"><section className="panel"><div className="panel-title"><Icon name="bell"/><h3>Notificaciones SNT</h3></div><p className="muted">Recibe avisos oficiales del clan directamente en tu dispositivo.</p><button className="primary-button" onClick={enableNotifications}>Activar avisos</button><small className="ios-install-hint">En iPhone: Safari → Compartir → Añadir a pantalla de inicio. Después abre SNT desde el icono instalado.</small></section><section className="panel"><div className="panel-title"><Icon name="bell"/><h3>Información del clan</h3></div><p className="muted">Consulta esta página para enterarte de torneos, desafíos y reuniones oficiales. Los horarios se muestran automáticamente según la zona horaria de tu dispositivo.</p><div className="timezone-pill"><Icon name="clock"/> Zona detectada: <b>{tz}</b></div></section><section className="panel feature-panel"><span className="eyebrow">SIEMPRE PREPARADOS</span><h3>Una comunidad.<br/>Un mismo objetivo.</h3><p>Nos vemos en el próximo evento.</p></section></div>
   </>}

   {page==='notifications'&&profile?.role==='owner'&&<section className="panel form-panel"><span className="eyebrow">CONTROL DEL PROPIETARIO</span><h2>Alertas de eventos</h2><p className="muted">Usa la campanita que aparece debajo de cada evento para avisar únicamente sobre ese evento. Cada evento tiene un tiempo de espera de 15 minutos.</p></section>}
   {page==='admins'&&profile?.role==='owner'&&<section className="panel form-panel owner-users-panel">
    <span className="eyebrow">CONTROL EXCLUSIVO DEL PROPIETARIO</span><h2>Administrar cuentas SNT</h2>
    <p className="muted">Crea cuentas, cambia correos y contraseñas, asigna rangos, suspende accesos o elimina usuarios. Solo el propietario puede entrar aquí.</p>
    <form onSubmit={changeOwnerPassword} className="managed-create-form"><h3>Cambiar mi contraseña de propietario</h3>
     <label>Nueva contraseña principal<input type="password" minLength="10" required value={ownerNewPassword} onChange={e=>setOwnerNewPassword(e.target.value)} placeholder="Mínimo 10 caracteres"/></label>
     <button className="primary-button" disabled={busy}>{busy?'Actualizando…':'Actualizar mi contraseña'}</button>
    </form>
    <form onSubmit={createManagedUser} className="managed-create-form"><h3>Crear nueva cuenta ADM</h3>
     <label>Nombre completo<input required value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="Nombre del integrante"/></label>
     <label>Correo electrónico<input required type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} placeholder="correo@ejemplo.com"/></label>
     <label>Contraseña inicial<input required type="password" minLength="8" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label>
     <button className="primary-button" disabled={busy}>{busy?'Creando…':'Crear cuenta ADM'}</button>
    </form>
    <div className="managed-users-head"><h3>Cuentas registradas</h3><button type="button" className="outline-button" onClick={loadManagedUsers} disabled={managedLoading}>{managedLoading?'Cargando…':'Actualizar lista'}</button></div>
    {managedError&&<p className="error">{managedError}</p>}
    {managedUsers.map(row=><div className="managed-user-card" key={row.id}>
     <div className="managed-user-title"><strong>{row.full_name||'Sin nombre'}</strong><small>{row.email}</small></div>
     <label>Nombre<input value={row.full_name||''} onChange={e=>setManagedUsers(xs=>xs.map(x=>x.id===row.id?{...x,full_name:e.target.value}:x))}/></label>
     <label>Correo<input type="email" value={row.email||''} onChange={e=>setManagedUsers(xs=>xs.map(x=>x.id===row.id?{...x,email:e.target.value}:x))}/></label>
     <label>Nueva contraseña (opcional)<input type="password" minLength="8" placeholder="Vacío = no cambiar" value={row.new_password||''} onChange={e=>setManagedUsers(xs=>xs.map(x=>x.id===row.id?{...x,new_password:e.target.value}:x))}/></label>
     <div className="form-row"><label>Rango<select value={row.role} onChange={e=>setManagedUsers(xs=>xs.map(x=>x.id===row.id?{...x,role:e.target.value}:x))}><option value="admin">Administrador</option><option value="member">Miembro</option></select></label>
     <label>Acceso<select value={String(row.active)} onChange={e=>setManagedUsers(xs=>xs.map(x=>x.id===row.id?{...x,active:e.target.value==='true'}:x))}><option value="true">Activo</option><option value="false">Suspendido</option></select></label></div>
     <div className="managed-actions"><button type="button" className="primary-button" onClick={()=>saveManagedUser(row)} disabled={busy}>Guardar cambios</button><button type="button" className="danger-button" onClick={()=>deleteManagedUser(row)} disabled={busy}>Eliminar cuenta</button></div>
    </div>)}
    {!managedUsers.length&&!managedLoading&&!managedError&&<p className="muted">No hay cuentas cargadas. Pulsa «Actualizar lista».</p>}
    <button type="button" className="outline-button" onClick={createAdminInvite} disabled={busy}>Generar invitación por enlace (opcional)</button>
    {inviteLink&&<div className="invite-link-box"><label>Enlace privado<input readOnly value={inviteLink}/></label><button type="button" className="outline-button" onClick={()=>navigator.clipboard.writeText(inviteLink).then(()=>setNotice('Enlace copiado.'))}>Copiar enlace</button></div>}
   </section>}
   {page==='events'&&<><div className="section-heading"><div><span className="eyebrow">AGENDA SNT</span><h2>Todos los eventos</h2></div><span className="muted">{upcoming.length} próximos</span></div>{upcoming.length?<div className="events-list">{upcoming.map(e=><EventRow key={e.id} event={e} large canAlert={profile?.role==='owner'} onAlert={sendEventPushAlert} cooldownMs={(pushCooldowns[e.id]||0)-pushClock} sending={sendingEventId===e.id}/>)}</div>:<div className="empty-state"><Icon name="calendar"/><h3>No hay eventos próximos</h3><p>Vuelve pronto para consultar las nuevas actividades.</p></div>}</>}
   {page==='calendar'&&<section className="panel calendar-panel"><div className="section-heading"><div><span className="eyebrow">VISTA MENSUAL</span><h2>{new Intl.DateTimeFormat('es',{month:'long',year:'numeric'}).format(clock)}</h2></div><button className="outline-button" onClick={()=>setPage('events')}>Lista de eventos</button></div><div className="calendar-grid">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(x=><b key={x}>{x}</b>)}{Array.from({length:new Date(clock.getFullYear(),clock.getMonth(),1).getDay()},(_,i)=><span key={'e'+i}/>)}{Array.from({length:new Date(clock.getFullYear(),clock.getMonth()+1,0).getDate()},(_,i)=>{const n=i+1;const dayEvents=upcoming.filter(e=>{const d=new Date(e.starts_at);return d.getFullYear()===clock.getFullYear()&&d.getMonth()===clock.getMonth()&&d.getDate()===n});return <div className={`calendar-day ${n===clock.getDate()?'today':''}`} key={n}><span>{n}</span>{dayEvents.map(e=><small key={e.id} title={e.title}>{e.title}</small>)}</div>})}</div></section>}
   {page==='create'&&<section className="panel form-panel"><span className="eyebrow">PANEL DE ORGANIZACIÓN</span><h2>Publicar nuevo evento</h2>{!admin?<div className="empty-state"><Icon name="settings"/><h3>Acceso restringido</h3><p>Inicia sesión con una cuenta administradora para crear eventos.</p><button className="primary-button" onClick={()=>setShowLogin(true)}>Iniciar sesión</button></div>:<form onSubmit={createEvent}><label>Nombre del evento<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Torneo PvP SNT"/></label><label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalles de la actividad"/></label><div className="form-row"><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Evento</option><option>Competencia</option><option>Social</option><option>Reunión</option></select></label><label>Fecha y hora<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>Imagen del evento<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setImageFile(e.target.files?.[0]||null)}/><small className="muted">JPG, PNG o WebP · máximo 5 MB</small></label><label>Enlace de Roblox (opcional)<input type="url" value={roblox} onChange={e=>setRoblox(e.target.value)} placeholder="https://www.roblox.com/..."/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Publicando…':'Publicar evento'}</button></form>}</section>}
   <footer>© {new Date().getFullYear()} SNT SINIESTRO <span>Hecho para la comunidad.</span></footer>
  </main>
  {ownerRecoveryToken&&<div className="modal-backdrop"><section className="login-modal"><Logo/><h2>Recuperar cuenta propietaria</h2><p>Este enlace especial permite establecer una nueva contraseña para la cuenta principal de SNT. Solo se puede utilizar una vez.</p><form onSubmit={finishOwnerRecovery}><label>Nueva contraseña (mínimo 10 caracteres)<input type="password" minLength="10" required value={ownerRecoveryPassword} onChange={e=>setOwnerRecoveryPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?"Actualizando…":"Guardar nueva contraseña"}</button></form></section></div>}
  {inviteToken&&<div className="modal-backdrop"><section className="login-modal"><button className="close-modal" onClick={()=>{setInviteToken('');window.history.replaceState({},'',window.location.pathname)}}>×</button><Logo/><h2>Invitación al equipo SNT</h2><p>Completa tus datos para crear tu cuenta administrativa.</p>{inviteMessage?<p className="success-note">{inviteMessage}</p>:<form onSubmit={registerInvitedAdmin}><label>Nombre completo<input required value={inviteName} onChange={e=>setInviteName(e.target.value)}/></label><label>Correo electrónico<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><label>Contraseña (mínimo 8 caracteres)<input type="password" minLength="8" required value={invitePassword} onChange={e=>setInvitePassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>Crear cuenta de administrador</button></form>}</section></div>}
  {showLogin&&<div className="modal-backdrop" onClick={()=>setShowLogin(false)}><section className="login-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowLogin(false)}>×</button><Logo/><h2>Acceso administrativo</h2><p>Ingresa con tu cuenta autorizada de SNT.</p>{!hasSupabase?<div className="error">La conexión con Supabase aún no está configurada en el despliegue.</div>:resetMode==='update'?<form onSubmit={saveNewPassword}><p>Escribe tu nueva contraseña.</p><label>Nueva contraseña<input type="password" minLength="8" required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>Guardar contraseña</button></form>:resetMode==='request'?<form onSubmit={sendReset}><label>Correo para recuperación<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{resetSent&&<p className="success-note">Si el correo está registrado, recibirás un enlace. Revisa también spam.</p>}{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>Enviar enlace de recuperación</button><button type="button" className="forgot-link" onClick={()=>{setResetMode(false);setResetSent(false)}}>Volver</button></form>:<form onSubmit={login}><label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Entrando…':'Iniciar sesión'}</button><button type="button" className="forgot-link" onClick={()=>{setResetMode('request');setError('')}}>Olvidé mi contraseña</button></form>}</section></div>}
 </div>
}