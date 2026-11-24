# SNT Eventos — Siniestro

Plataforma web para publicar y administrar las actividades oficiales del clan SNT.

## Incluye
- Página pública responsive con agenda de próximos eventos.
- Hora y fecha presentadas en la zona horaria del visitante.
- Cuenta regresiva para cada actividad.
- Vista de calendario mensual.
- Inicio de sesión administrativo con Supabase Auth.
- Creación de eventos para perfiles activos con rol `owner` o `admin`.
- Modo de demostración visual cuando todavía no se configuran las variables de Supabase.

## Desarrollo local
1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local`.
4. Configura las variables de Supabase.
5. Ejecuta `npm run dev`.

## Variables de entorno
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (clave publishable/anon; nunca uses `service_role` en el navegador).

## Despliegue
Configura las mismas variables en el proveedor de hosting y usa `npm run build` como comando de construcción y `dist` como directorio de salida.

## Estado
Primera versión de interfaz y conexión de datos. Antes de producción se deben probar los permisos RLS, el flujo de invitaciones de administradores, la edición/cancelación de eventos, la carga de imágenes y el sistema real de notificaciones.