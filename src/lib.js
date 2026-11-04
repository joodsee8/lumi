const DN = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const money = n => '$' + Number(n).toLocaleString('es-MX')
// Fecha YYYY-MM-DD en la zona horaria del negocio
export const dayKey = (date, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
export const dow = key => new Date(key + 'T12:00:00Z').getUTCDay()
export const dayLabel = key => { const d = new Date(key + 'T12:00:00Z'); return `${DN[d.getUTCDay()]} ${d.getUTCDate()}` }
export const timeLabel = (iso, tz) =>
  new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(iso))
export const dateLong = (iso, tz) =>
  new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date(iso))

const ERR = {
  slot_unavailable: 'Ese horario se acaba de ocupar. Elige otro.',
  invalid_name: 'Escribe tu nombre.',
  invalid_phone: 'Escribe un WhatsApp válido (mínimo 8 dígitos).',
  service_not_found: 'Ese servicio ya no está disponible.',
  business_not_found: 'No encontramos este negocio.'
}
export const errMsg = e => {
  const m = e?.message || ''
  const k = Object.keys(ERR).find(k => m.includes(k))
  return k ? ERR[k] : 'No pudimos completar la acción. Intenta de nuevo.'
}

// Rutas: /lumi-studio (clientas) · /lumi-studio/admin o /admin (dueña)
const parts = window.location.pathname.split('/').filter(Boolean)
export const SLUG = parts[0] && parts[0] !== 'admin' ? parts[0] : 'lumi-studio'
export const IS_ADMIN = parts[0] === 'admin' || parts[1] === 'admin'
export const waLink = p => { const d = (p || '').replace(/\D/g, ''); return 'https://wa.me/' + (d.length === 10 ? '52' + d : d) }
