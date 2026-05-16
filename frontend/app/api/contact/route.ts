import { NextResponse } from 'next/server'

const CONTACT_EMAIL = 'info@hostexcel.es'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'HostExcel <info@hostexcel.es>'

type ContactPayload = {
  nombre?: string
  restaurante?: string
  email?: string
  telefono?: string
  interes?: string
  mensaje?: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export async function POST(request: Request) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta configurar RESEND_API_KEY' }, { status: 500 })
  }

  let body: ContactPayload
  try {
    body = (await request.json()) as ContactPayload
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es válido' }, { status: 400 })
  }

  const nombre = body.nombre?.trim() || 'Contacto web'
  const restaurante = body.restaurante?.trim() || '—'
  const email = body.email?.trim() || ''
  const telefono = body.telefono?.trim() || '—'
  const interes = body.interes?.trim() || 'demo'
  const mensaje = body.mensaje?.trim() || '—'

  if (!email) {
    return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 })
  }

  const subject = `Nuevo contacto HostExcel: ${restaurante !== '—' ? restaurante : nombre}`
  const text = [
    `Nombre: ${nombre}`,
    `Restaurante: ${restaurante}`,
    `Email: ${email}`,
    `Teléfono: ${telefono}`,
    `Interés: ${interes}`,
    `Mensaje: ${mensaje}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Nuevo contacto desde HostExcel</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Restaurante:</strong> ${escapeHtml(restaurante)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
      <p><strong>Interés:</strong> ${escapeHtml(interes)}</p>
      <p><strong>Mensaje:</strong><br />${escapeHtml(mensaje).replace(/\n/g, '<br />')}</p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: CONTACT_EMAIL,
      reply_to: email,
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message = errorBody?.message || errorBody?.error || 'No se pudo enviar el correo'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
