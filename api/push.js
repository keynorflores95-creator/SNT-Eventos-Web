import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Inicia sesión como propietario.' });
    if (!supabaseUrl || !supabaseAnonKey || !process.env.VAPID_PUBLIC_KEY || !process.env.SNT_VAPID_PRIVATE_KEY_V2 || !process.env.VAPID_SUBJECT) {
      return res.status(503).json({ error: 'El servicio push no está configurado correctamente.' });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer ' + token } }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'La sesión no es válida.' });
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role,active').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile?.active || profile.role !== 'owner') return res.status(403).json({ error: 'Solo el propietario puede enviar alertas.' });

    const eventId = String(req.body?.eventId || '');
    if (req.body?.action !== 'event' || !/^[0-9a-f-]{36}$/i.test(eventId)) return res.status(400).json({ error: 'Evento no válido.' });
    const { data: event, error: eventError } = await supabase.from('events')
      .select('id,title,description,short_description,starts_at,image_url,roblox_url,status')
      .eq('id',eventId).eq('status','published').gt('starts_at',new Date().toISOString()).maybeSingle();
    if (eventError) return res.status(500).json({ error: 'No se pudo consultar el evento.' });
    if (!event) return res.status(404).json({ error: 'El evento ya comenzó o no está publicado.' });

    const { data: targets, error: targetsError } = await supabase.rpc('get_snt_push_targets');
    if (targetsError) return res.status(403).json({ error: targetsError.message });
    const selected = targets || [];
    if (!selected.length) return res.status(409).json({ error: 'Todavía no hay dispositivos registrados. Pide a los miembros que pulsen «Activar avisos».' });

    const { data: claimRows, error: claimError } = await supabase.rpc('claim_snt_event_push',{p_event_id:event.id});
    if (claimError) return res.status(403).json({ error: claimError.message });
    const claim = claimRows?.[0];
    if (!claim?.allowed) return res.status(429).json({ error: 'Este evento ya recibió un aviso hace poco.', nextAllowedAt:claim?.next_allowed_at });

    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.SNT_VAPID_PRIVATE_KEY_V2);
    const when = new Intl.DateTimeFormat('es',{weekday:'long',day:'numeric',month:'long',hour:'numeric',minute:'2-digit',hourCycle:'h12'}).format(new Date(event.starts_at));
    const summary = event.short_description || event.description || 'Consulta todos los detalles en SNT.';
    const payload = JSON.stringify({
      title: '👑 '+event.title,
      body: when+' · '+summary.slice(0,110),
      url: '/?event='+encodeURIComponent(event.id),
      image: event.image_url || undefined,
      icon: '/snt-icon.svg',
      tag: 'snt-event-'+event.id,
      eventId: event.id
    });
    const results = await Promise.allSettled(selected.map(row =>
      webpush.sendNotification(row.subscription,payload,{TTL:60*60*12})
    ));
    const sent = results.filter(x=>x.status==='fulfilled').length;
    const failedResults = results.filter(x=>x.status==='rejected');
    const failed = failedResults.length;
    return res.status(200).json({ok:true,sent,failed,total:selected.length,eventTitle:event.title,nextAllowedAt:claim.next_allowed_at});
  } catch (error) {
    console.error('SNT push error:',error);
    return res.status(500).json({error:'No se pudo completar el envío de notificaciones.'});
  }
}
