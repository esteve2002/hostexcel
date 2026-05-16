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
  language?: 'es' | 'en'
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
  const language = body.language === 'en' ? 'en' : 'es'

  const labels = language === 'en'
    ? {
        title: 'New contact from HostExcel',
        subjectPrefix: 'New HostExcel contact',
        name: 'Name',
        restaurant: 'Restaurant',
        email: 'Email',
        phone: 'Phone',
        interest: 'Interest',
        message: 'Message',
      }
    : {
        title: 'Nuevo contacto desde HostExcel',
        subjectPrefix: 'Nuevo contacto HostExcel',
        name: 'Nombre',
        restaurant: 'Restaurante',
        email: 'Email',
        phone: 'Teléfono',
        interest: 'Interés',
        message: 'Mensaje',
      }

  if (!email) {
    return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 })
  }

  const subject = `${labels.subjectPrefix}: ${restaurante !== '—' ? restaurante : nombre}`
  const text = [
    `${labels.name}: ${nombre}`,
    `${labels.restaurant}: ${restaurante}`,
    `${labels.email}: ${email}`,
    `${labels.phone}: ${telefono}`,
    `${labels.interest}: ${interes}`,
    `${labels.message}: ${mensaje}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">${labels.title}</h2>
      <p><strong>${labels.name}:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>${labels.restaurant}:</strong> ${escapeHtml(restaurante)}</p>
      <p><strong>${labels.email}:</strong> ${escapeHtml(email)}</p>
      <p><strong>${labels.phone}:</strong> ${escapeHtml(telefono)}</p>
      <p><strong>${labels.interest}:</strong> ${escapeHtml(interes)}</p>
      <p><strong>${labels.message}:</strong><br />${escapeHtml(mensaje).replace(/\n/g, '<br />')}</p>
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
