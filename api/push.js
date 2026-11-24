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
    if (!token) return res.status(401).json({ error: 'Inicia sesión para enviar alertas.' });
    if (!supabaseUrl || !supabaseAnonKey || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
      return res.status(503).json({ error: 'El servicio de notificaciones aún no está configurado en el servidor.' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer ' + token } }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'La sesión no es válida. Vuelve a iniciar sesión.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role,active').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile?.active || !['owner', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Solo el propietario y los administradores activos pueden enviar alertas.' });
    }

    const title = String(req.body?.title || '').trim().slice(0, 80);
    const body = String(req.body?.body || '').trim().slice(0, 240);
    const target = req.body?.target === 'admins' ? 'admins' : 'all';
    const url = typeof req.body?.url === 'string' && req.body.url.startsWith('/') ? req.body.url : '/';
    if (!title || !body) return res.status(400).json({ error: 'Escribe un título y un mensaje.' });

    const { data: rows, error: targetsError } = await supabase.rpc('get_snt_push_targets');
    if (targetsError) return res.status(403).json({ error: targetsError.message });
    const selected = (rows || []).filter(row => target === 'all' || row.role === 'admin' || row.role === 'owner');

    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const payload = JSON.stringify({ title, body, url, tag: 'snt-alert-' + Date.now() });
    const results = await Promise.allSettled(selected.map(row =>
      webpush.sendNotification(row.subscription, payload, { TTL: 60 * 60 * 12 })
    ));
    const sent = results.filter(x => x.status === 'fulfilled').length;
    const failed = results.length - sent;
    return res.status(200).json({ ok: true, sent, failed, total: selected.length, target });
  } catch (error) {
    console.error('SNT push error:', error);
    return res.status(500).json({ error: 'No se pudo completar el envío de notificaciones.' });
  }
}
