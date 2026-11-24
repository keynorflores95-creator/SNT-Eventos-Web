import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const cronSecret = process.env.SNT_AUTO_PUSH_CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !process.env.VAPID_PUBLIC_KEY ||
        !process.env.SNT_VAPID_PRIVATE_KEY_V2 || !process.env.VAPID_SUBJECT) {
      return res.status(503).json({ error: 'El servicio push no está configurado correctamente.' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.SNT_VAPID_PRIVATE_KEY_V2
    );

    const { data: batches, error: claimError } = await supabase.rpc(
      'claim_snt_auto_push_batches',
      { p_cron_token: cronSecret }
    );
    if (claimError) throw claimError;

    const report = [];
    for (const batch of batches || []) {
      const scheduledAt = new Date(batch.scheduled_at);
      const remainingMinutes = Math.max(0, Math.round(
        (new Date(batch.starts_at).getTime() - scheduledAt.getTime()) / 60000
      ));
      const countdown = remainingMinutes === 60 ? '1 hora' : remainingMinutes + ' minutos';
      const summary = batch.short_description || batch.description || 'Consulta los detalles en SNT Eventos.';
      const payload = JSON.stringify({
        title: '⏰ SNT · ' + batch.title,
        body: '¡Tu evento comienza en ' + countdown + '! ' + summary.slice(0, 95),
        url: '/?event=' + encodeURIComponent(batch.event_id),
        image: batch.image_url || undefined,
        icon: '/snt-icon.svg',
        tag: 'snt-auto-' + batch.event_id + '-' + scheduledAt.getTime(),
        eventId: batch.event_id,
        automatic: true
      });

      const targets = Array.isArray(batch.subscriptions) ? batch.subscriptions : [];
      const results = await Promise.allSettled(targets.map(row =>
        webpush.sendNotification(row.subscription, payload, { TTL: 60 * 60 * 12, urgency: 'high' })
      ));

      const invalidIds = [];
      const errorsByStatus = {};
      let sent = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          const status = Number(result.reason?.statusCode || 0);
          const key = status ? String(status) : 'network';
          errorsByStatus[key] = (errorsByStatus[key] || 0) + 1;
          if (status === 404 || status === 410) invalidIds.push(targets[i].id);
        }
      }

      const failed = results.length - sent;
      const failureText = failed ? Object.entries(errorsByStatus).map(([code, count]) => code + ':' + count).join(', ') : null;
      const { error: finishError } = await supabase.rpc('finish_snt_auto_push_batch', {
        p_cron_token: cronSecret,
        p_event_id: batch.event_id,
        p_scheduled_at: batch.scheduled_at,
        p_sent: sent,
        p_failed: failed,
        p_invalid_ids: invalidIds,
        p_error: failureText
      });
      if (finishError) throw finishError;

      report.push({
        eventId: batch.event_id,
        scheduledAt: batch.scheduled_at,
        sent,
        failed,
        removedExpired: invalidIds.length,
        errorsByStatus
      });
    }

    return res.status(200).json({
      ok: true,
      batches: report.length,
      sent: report.reduce((n, row) => n + row.sent, 0),
      failed: report.reduce((n, row) => n + row.failed, 0),
      report
    });
  } catch (error) {
    console.error('SNT automatic push error:', error?.message || error);
    return res.status(500).json({ error: 'No se pudo ejecutar el envío automático.' });
  }
}
