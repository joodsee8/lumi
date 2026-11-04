import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import Pixi from './Pixi'
import { Ambient, Sparkles, Skeleton, Confetti } from './fx'
import { money, dayKey, dow, dayLabel, timeLabel, dateLong, errMsg, SLUG } from './lib'

const TABS = [['home', 'Inicio'], ['svc', 'Servicios'], ['book', 'Reservar'], ['gal', 'Galería']]
const HELP = {
  home: '¡Hola! Soy Pixi. Toca Reservar cita y te acompaño.',
  svc: 'Elige un servicio y reserva en un toque.',
  gal: 'Aquí irán las fotos reales del estudio.'
}
// Dónde se posa Pixi en cada pantalla
const ANCH = { home: '[data-pixi="hero"]', svc: '[data-pixi="svc"]', gal: '[data-pixi="gal"]' }
const TIPS = {
  home: ['Reservar toma menos de un minuto.', 'Te confirmamos al instante.'],
  svc: ['Toca “Reservar” junto al servicio que quieras.', 'Los precios ya incluyen todo.'],
  book: ['Solo te muestro horarios libres.', 'Puedes volver atrás cuando quieras.'],
  gal: ['Pronto verás aquí trabajos reales.']
}
const STEP_HELP = ['Elige tu servicio.', 'Elige el día que te acomode.', '', 'Revisa tu cita y confirma.']
const STEP_AT = '[data-pixi="prog"]'

function useBusiness(slug) {
  const [st, setSt] = useState({ loading: true })
  useEffect(() => {
    let off = false
    ;(async () => {
      const { data: b, error } = await supabase.from('businesses').select('*').eq('slug', slug).maybeSingle()
      if (error || !b) { if (!off) setSt({ loading: false, error: true }); return }
      const [sv, sc, bl] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', b.id).order('sort_order'),
        supabase.from('schedules').select('*').eq('business_id', b.id),
        supabase.from('blocked_dates').select('day').eq('business_id', b.id)
      ])
      if (!off) setSt({ loading: false, b, services: sv.data || [], schedules: sc.data || [], blocked: (bl.data || []).map(x => x.day) })
    })()
    return () => { off = true }
  }, [slug])
  return st
}

const Row = ({ s, children }) => (
  <div className="item">
    <div className="n"><b>{s.name}</b><span className="mute">{s.duration_min} min</span></div>
    <span className="price">{money(s.price)}</span>{children}
  </div>
)

function Home({ b, go }) {
  return (
    <div className="hero" data-pixi="hero">
      <Sparkles />
      <div className="l">
        <h1>Reserva tu cita en línea, a cualquier hora</h1>
        <p>Elige tu servicio, consulta los horarios disponibles y recibe tu confirmación al instante.</p>
        <button className="pri" onClick={() => go('book')}>Reservar cita</button>{' '}
        <button className="link" onClick={() => go('svc')}>Ver servicios</button>
      </div>
      <div className="card">
        <h3>Información del estudio</h3>
        <ul className="facts">
          {b.address && <li><span className="mute">Ubicación</span><b>{b.address}</b></li>}
          {b.phone && <li><span className="mute">Teléfono</span><b>{b.phone}</b></li>}
          <li><span className="mute">Cancelaciones</span><b>Hasta {b.cancel_hours} h antes</b></li>
          <li><span className="mute">Confirmación</span><b>Inmediata</b></li>
        </ul>
      </div>
    </div>
  )
}

function Services({ services, onPick }) {
  const cats = [...new Set(services.map(s => s.category))]
  return (
    <div data-pixi="svc">
      <h2>Servicios</h2><p className="mute">Precios y duración aproximada.</p>
      {cats.map(c => (
        <div key={c}>
          <div className="cat">{c}</div>
          <div className="list">
            {services.filter(s => s.category === c).map(s => (
              <Row key={s.id} s={s}><button className="pri" onClick={() => onPick(s.id)}>Reservar</button></Row>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const WD = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const monthOf = k => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(k + 'T12:00:00Z'))

function Calendar({ days, day, onPick }) {
  const m1 = monthOf(days[0].k), m2 = monthOf(days[days.length - 1].k)
  return (
    <div className="cal">
      <div className="calh">{m1 === m2 ? m1 : `${m1.split(' ')[0]} – ${m2}`}</div>
      <div className="calg">
        {WD.map(d => <span key={d} className="wd">{d}</span>)}
        {Array.from({ length: dow(days[0].k) }, (_, i) => <span key={'e' + i} />)}
        {days.map((d, i) => (
          <button key={d.k} style={{ '--i': i }} disabled={!d.open} aria-label={dayLabel(d.k)}
            className={'day' + (day === d.k ? ' sel' : '') + (i === 0 ? ' today' : '')} onClick={() => onPick(d.k)}>
            {new Date(d.k + 'T12:00:00Z').getUTCDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

function Book({ data, pre, say, onNew }) {
  const { b, services, schedules, blocked } = data
  const [step, setStep] = useState(pre ? 2 : 1)
  const [svc, setSvc] = useState(pre || null)
  const [day, setDay] = useState(null)
  const [slots, setSlots] = useState(null)
  const [slot, setSlot] = useState(null)
  const [f, setF] = useState({ name: '', phone: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const s = services.find(x => x.id === svc)

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const k = dayKey(new Date(Date.now() + i * 864e5), b.timezone)
    const sc = schedules.find(x => x.day_of_week === dow(k))
    return { k, open: !!sc?.is_open && !blocked.includes(k) }
  }), [b, schedules, blocked])

  useEffect(() => { if (!done && STEP_HELP[step - 1]) say(STEP_HELP[step - 1], { at: STEP_AT }) }, [step, done, say])

  useEffect(() => {
    if (step !== 3) return
    let off = false
    setSlots(null)
    say('Buscando horarios', { mood: 'think', at: STEP_AT, ms: 1200 })
    supabase.rpc('get_available_slots', { p_slug: b.slug, p_service_id: svc, p_date: day }).then(({ data: d, error }) => {
      if (off) return
      if (error) { setErr(errMsg(error)); setSlots([]); say(errMsg(error), { mood: 'oops', at: STEP_AT }); return }
      const list = d.map(r => r.slot_start)
      setSlots(list)
      say(list.length ? '¡Mira, estos horarios están libres!' : 'Ese día está lleno. Prueba otro.', { mood: list.length ? 'happy' : 'oops', at: STEP_AT })
    })
    return () => { off = true }
  }, [step, svc, day, b.slug, say])

  async function confirm() {
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 8) {
      setErr('Escribe tu nombre y un WhatsApp de al menos 8 dígitos.'); say('Me faltan tus datos.', { mood: 'oops', at: STEP_AT }); return
    }
    setBusy(true); setErr('')
    const { data: d, error } = await supabase.rpc('book_appointment', {
      p_slug: b.slug, p_service_id: svc, p_starts_at: slot, p_name: f.name.trim(), p_phone: f.phone
    })
    setBusy(false)
    if (error) {
      if (error.message.includes('slot_unavailable')) { setStep(3); setSlot(null) }
      setErr(errMsg(error)); say(errMsg(error), { mood: 'oops', at: STEP_AT }); return
    }
    setDone({ ...d[0], svcName: s.name, price: s.price })
    say('¡Cita reservada! Te esperamos.', { mood: 'happy', at: 'br' })
  }

  async function cancel() {
    const { data: r } = await supabase.rpc('cancel_appointment', { p_token: done.token })
    const txt = r === 'cancelled' ? 'Tu cita fue cancelada.'
      : r === 'too_late' ? `Ya no se puede cancelar en línea (mínimo ${b.cancel_hours} h antes). Contacta al estudio.`
      : 'Esta cita ya no está activa.'
    setDone(d => ({ ...d, result: r, note: txt })); say(txt, { mood: r === 'cancelled' ? 'idle' : 'oops' })
  }

  if (done) {
    return (
      <div className="card pop" style={{ marginTop: 14, maxWidth: 520 }}>
        {done.result !== 'cancelled' && <Confetti />}
        <span className={'badge' + (done.result === 'cancelled' ? ' x' : '')}>{done.result === 'cancelled' ? 'Cita cancelada' : 'Cita confirmada'}</span>
        <h3 style={{ margin: '12px 0 6px' }}>¡Listo, {f.name.split(' ')[0]}!</h3>
        <p>{done.svcName}<br />{dateLong(done.starts_at, b.timezone)}, {timeLabel(done.starts_at, b.timezone)} h<br />Total: {money(done.price)}</p>
        {done.note && <p className="mute">{done.note}</p>}
        <button className="pri" onClick={onNew}>Reservar otra cita</button>{' '}
        {done.result !== 'cancelled' && <button className="link" onClick={cancel}>Cancelar cita</button>}
      </div>
    )
  }

  const summary = (
    <aside className="card sum">
      <h3>Resumen de tu cita</h3>
      <dl>
        <div><dt>Servicio</dt><dd key={svc}>{s ? s.name : '—'}</dd></div>
        <div><dt>Fecha</dt><dd key={day}>{day ? dayLabel(day) : '—'}</dd></div>
        <div><dt>Hora</dt><dd key={slot}>{slot ? timeLabel(slot, b.timezone) : '—'}</dd></div>
        <div><dt>Total</dt><dd key={svc + 't'}>{s ? money(s.price) : '—'}</dd></div>
      </dl>
    </aside>
  )

  return (
    <div className="book">
      <div>
        <ol className="prog" data-pixi="prog">
          {['Servicio', 'Día', 'Hora', 'Datos'].map((n, i) => <li key={n} className={i + 1 === step ? 'cur' : i + 1 < step ? 'ok' : ''}>{n}</li>)}
        </ol>
        <div className="stepbody" key={step} data-pixi="step">
          {step === 1 && (
            <div className="list">
              {services.map(x => <Row key={x.id} s={x}><button className={svc === x.id ? 'sel' : ''} onClick={() => { setSvc(x.id); setStep(2) }}>Elegir</button></Row>)}
            </div>
          )}
          {step === 2 && <Calendar days={days} day={day} onPick={k => { setDay(k); setSlot(null); setErr(''); setStep(3) }} />}
          {step === 3 && (slots === null
            ? <Skeleton n={2} />
            : slots.length
              ? <div className="chips">{slots.map((t, i) => <button key={t} style={{ '--i': i }} className={slot === t ? 'sel' : ''} onClick={() => { setSlot(t); setStep(4) }}>{timeLabel(t, b.timezone)}</button>)}</div>
              : <div className="empty">No quedan horarios libres ese día. Elige otro día.</div>)}
          {step === 4 && (
            <div className="card" style={{ marginTop: 14 }}>
              <label>Nombre completo<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
              <label>WhatsApp<input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" autoComplete="tel" /></label>
              <div className="err">{err}</div>
              <button className="pri" disabled={busy} onClick={confirm}>{busy ? 'Reservando…' : 'Confirmar cita'}</button>
            </div>
          )}
          {step === 3 && err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        </div>
        {step > 1 && <p><button className="link" onClick={() => { setErr(''); setStep(step - 1) }}>← Atrás</button></p>}
      </div>
      {summary}
    </div>
  )
}

const GAL = ['Gel rosa', 'Volumen', 'Chrome', 'Lifting', 'Francés', 'Nail art', 'Híbridas', 'Natural']
const GC = [['#ffd9e8', '#ffbcd4'], ['#eadfff', '#d9cbff'], ['#cdeee6', '#ffd9e8'], ['#ffe9d2', '#ffcfe0']]

export default function App() {
  const data = useBusiness(SLUG)
  const [tab, setTab] = useState('home')
  const [pre, setPre] = useState(null)
  const [bk, setBk] = useState(0)
  const [msg, setMsg] = useState(null)
  const intro = useMemo(() => ({
    text: '¡Ay no! Mis uñas y pestañas quedaron arruinadas… ¿Por qué no agendamos una cita?',
    cta: { label: 'Agendar cita', fn: () => { setTab('book'); window.scrollTo(0, 0) } }
  }), [])
  const say = useCallback((t, o) => setMsg({ t, id: Date.now(), ...(typeof o === 'number' ? { ms: o } : o || {}) }), [])

  useEffect(() => { if (!data.loading && !data.error && tab !== 'book' && HELP[tab]) say(HELP[tab], { at: ANCH[tab], mood: tab === 'home' ? 'happy' : 'idle' }) }, [tab, say, data.loading, data.error])
  const go = t => { setTab(t); window.scrollTo(0, 0) }
  const newBooking = (id = null) => { setPre(id); setBk(k => k + 1) }

  if (data.loading) return <><Ambient /><main><Skeleton n={4} /></main></>
  if (data.error) return <><Ambient /><main><div className="card"><h3>No encontramos este negocio</h3><p className="mute">Revisa el enlace e intenta de nuevo.</p></div></main></>
  const { b } = data

  return (
    <>
      <Ambient />
      <header>
        <div className="top">
          <div className="brand"><span className="logo">{b.name[0]}</span><div>{b.name}<small>Pestañas y uñas</small></div></div>
          <a className="alink" href={`/${SLUG}/admin`}>Soy la dueña</a>
        </div>
        <nav id="tabs" aria-label="Secciones">
          {TABS.map(([id, l]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>{l}</button>)}
        </nav>
      </header>
      <main>
        <div key={tab} className="view">
          {tab === 'home' && <Home b={b} go={go} />}
          {tab === 'svc' && <Services services={data.services} onPick={id => { newBooking(id); go('book') }} />}
          {tab === 'book' && <><h2>Reservar cita</h2><Book key={bk} data={data} pre={pre} say={say} onNew={() => newBooking(null)} /></>}
          {tab === 'gal' && (
            <>
              <h2>Galería</h2><p className="mute">Trabajos recientes del estudio.</p>
              <div className="gal" data-pixi="gal">{GAL.map((t, i) => <div key={t} style={{ background: `linear-gradient(135deg,${GC[i % 4][0]},${GC[(i + 1) % 4][1]})` }}>{t}</div>)}</div>
            </>
          )}
        </div>
      </main>
      <Pixi msg={msg} tips={TIPS[tab]} onSay={say} intro={intro}
        onTap={() => say(tab === 'book' ? 'Voy contigo paso a paso. Solo muestro horarios libres.' : HELP[tab], { ms: 3500, mood: 'happy' })} />
    </>
  )
}
