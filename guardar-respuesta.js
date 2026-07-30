// Netlify Function: recibe cada respuesta guardada desde el formulario
// y la envía por correo (con el JSON completo adjunto) usando Resend.
//
// Variables de entorno necesarias (configúrelas en Netlify: Site settings
// → Environment variables):
//   RESEND_API_KEY  -> API key de https://resend.com
//   ADMIN_EMAIL     -> correo (o varios separados por coma) que recibirá los envíos
//   FROM_EMAIL       (opcional) -> remitente verificado en Resend.
//                                  Si no lo configura, se usa "onboarding@resend.dev"
//                                  (funciona para pruebas, pero es mejor verificar su propio dominio).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { ficha, respuestas, guardadoEn } = payload;
  if (!ficha || !respuestas) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos (ficha o respuestas)' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuración de correo incompleta (falta RESEND_API_KEY o ADMIN_EMAIL en las variables de entorno de Netlify)' })
    };
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const nombreArchivo = 'respuesta_frp_' + String(ficha.cc || 'sin_cc').replace(/[^a-zA-Z0-9_-]/g, '') + '.json';
  const jsonContent = JSON.stringify(payload, null, 2);
  const base64Attachment = Buffer.from(jsonContent, 'utf-8').toString('base64');

  const emailHtml = `
    <h2>Nueva respuesta registrada — Batería FRP</h2>
    <p><strong>Nombre:</strong> ${esc(ficha.nombre)}</p>
    <p><strong>Identificación:</strong> ${esc(ficha.cc)}</p>
    <p><strong>Cargo:</strong> ${esc(ficha.cargo)}</p>
    <p><strong>Empresa:</strong> ${esc(ficha.empresa)}</p>
    <p><strong>Fecha de aplicación:</strong> ${esc(ficha.fecha)}</p>
    <p><strong>Nivel de cargo:</strong> ${esc(ficha.nivelCargo)}</p>
    <p><strong>Guardado en:</strong> ${esc(guardadoEn)}</p>
    <p>Se adjunta el archivo <code>${esc(nombreArchivo)}</code> con todas las respuestas.
    Cárguelo en el panel de administrador del sitio para verlo y calificarlo.</p>
  `;

  const destinatarios = String(ADMIN_EMAIL).split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: destinatarios,
        subject: `Nueva respuesta FRP — ${ficha.nombre || 'Sin nombre'} (${ficha.cc || 'sin CC'})`,
        html: emailHtml,
        attachments: [
          {
            filename: nombreArchivo,
            content: base64Attachment
          }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Resend rechazó el envío', detalle: errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
