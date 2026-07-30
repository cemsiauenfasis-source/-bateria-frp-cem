# Batería FRP — envío automático por correo (Netlify Functions + Resend)

## Qué cambió
- `index.html`: al pulsar "Guardar respuestas", ahora se envía la respuesta a
  `/.netlify/functions/guardar-respuesta` en lugar de `window.storage` (que solo
  funciona dentro del entorno de Claude y nunca funcionó en Netlify). Si por algún
  motivo falla el envío (sin internet, función caída), se mantiene el respaldo:
  descarga el `.json` localmente para enviarlo a mano.
- `netlify/functions/guardar-respuesta.js`: función que recibe cada respuesta y
  la envía por correo (con el `.json` completo adjunto) usando el servicio Resend.
- El panel de administrador ahora explica que los registros llegan por correo:
  descárguelos y cárguelos ahí con el botón "Cargar archivo(s) recibidos por correo".

## Pasos para publicarlo

### 1. Subir el código a un repositorio
Cree un repositorio en GitHub (o GitLab/Bitbucket) y suba esta carpeta completa
(`index.html`, `netlify.toml`, `netlify/functions/guardar-respuesta.js`).

### 2. Conectar el repositorio a Netlify
En Netlify: **Add new site → Import an existing project** → elija el repositorio.
Netlify detecta automáticamente `netlify.toml`, no hace falta configurar nada más
en el build.

### 3. Crear una cuenta en Resend
1. Vaya a https://resend.com y cree una cuenta gratuita (100 correos/día,
   3.000/mes gratis).
2. En el panel, genere una **API Key** (Dashboard → API Keys → Create).
3. (Opcional pero recomendado) Verifique su propio dominio en Resend → Domains,
   así los correos salen desde `notificaciones@sudominio.com` en vez de la
   dirección de pruebas de Resend. Si no verifica un dominio, puede seguir usando
   `onboarding@resend.dev` como remitente mientras hace pruebas.

### 4. Configurar las variables de entorno en Netlify
En su sitio de Netlify: **Site configuration → Environment variables** → agregue:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la API key que generó en Resend |
| `ADMIN_EMAIL` | el correo (o varios, separados por coma) donde quiere recibir las respuestas |
| `FROM_EMAIL` | (opcional) remitente verificado, si ya configuró su dominio |

Después de guardar las variables, vuelva a desplegar el sitio (Deploys → Trigger
deploy) para que la función las tome.

### 5. Probar
Abra el sitio publicado, diligencie el cuestionario y guarde. Debe llegar un
correo a `ADMIN_EMAIL` con los datos y el `.json` adjunto en segundos.

## Nota de seguridad
La contraseña del panel de administrador está escrita directamente en el código
(`ADMIN_PASSWORD` en `index.html`, línea ~583) y es visible para cualquiera que
inspeccione el código fuente de la página. Dado que el cuestionario recoge datos
sensibles de riesgo psicosocial, se recomienda cambiarla por una contraseña
robusta y, si es posible, restringir el acceso al panel por otros medios
adicionales (por ejemplo, no compartir públicamente la URL del sitio).
