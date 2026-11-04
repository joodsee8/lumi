import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Pixi from './Pixi'
import { Ambient, CountUp, Skeleton } from './fx'
import { money, dayKey, dayLabel, timeLabel, errMsg, waLink, SLUG } from './lib'

const DNF = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TABS = [['dash', 'Resumen'], ['ag', 'Agenda'], ['svc', 'Servicios'], ['hr', 'Horarios']]
const HELP = {
  dash: 'Este es el resumen de tu negocio. Revisa tus próximas citas.',
  ag: 'Aquí está tu día. Puedes cancelar citas o agendar una a mano.',
  svc: 'Cambia nombre, precio y duración; los horarios se recalculan solos.',
  hr: 'Define jornada, comida y descansos, o bloquea fechas.'
}
const STATUS = { confirmed: ['Confirmada', ''], completed: ['Completada', ''], cancelled: ['Cancelada', ' x'], no_show: ['No asistió', ' x'] }
const hm = t => (t ? t.slice(0, 5) : '')

/* ---------- Sesión ---------- */
export default function Admin() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (session === undefined) return <><Ambient /><main><Skeleton n={2} /></main></>
  return session ? <Panel user={session.user} /> : <Login />
}

function Login() {
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword(f)
    setBusy(false)
    if (error) setErr('Correo o contraseña incorrectos.')
  }
  return (
    <><Ambient /><main style={{ maxWidth: 420 }}>
      <div className="card">
        <h2>Acceso dueña</h2>
        <p className="mute" style={{ marginBottom: 16 }}>Entra para ver tu agenda y administrar tu negocio.</p>
        <form onSubmit={submit}>
          <label>Correo<input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" required /></label>
          <label>Contraseña<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="current-password" required /></label>
          <div className="err">{err}</div>
          <button className="pri" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <p style={{ marginTop: 14 }}><a className="alink" href={`/${SLUG}`}>← Ir a la página de reservas</a></p>
      </div>
    </main></>
  )
}

/* ---------- Carga del negocio de la dueña ---------- */
function Panel({ user }) {
  const [biz, setBiz] = useState(null)
  const load = useCallback(async () => {
    const { data: o } = await supabase.from('owners').select('business_id').eq('user_id', user.id).maybeSingle()
    if (!o) { setBiz({ error: true }); return }
    const id = o.business_id
    const [b, sv, sc, bl] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', id).single(),
      supabase.from('services').select('*').eq('business_id', id).order('sort_order').order('name'),
      supabase.from('schedules').select('*').eq('business_id', id).order('day_of_week'),
      supabase.from('blocked_dates').select('*').eq('business_id', id).order('day')
    ])
    setBiz({ b: b.data, services: sv.data || [], schedules: sc.data || [], blocked: bl.data || [] })
  }, [user.id])
  useEffect(() => { load() }, [load])

  if (!biz) return <><Ambient /><main><Skeleton n={3} /></main></>
  if (biz.error) return (
    <main style={{ maxWidth: 520 }}>
      <div className="card">
        <h3>Tu cuenta aún no está vinculada a un negocio</h3>
        <p className="mute" style={{ margin: '8px 0 14px' }}>Falta registrar tu usuario en la tabla owners (paso 5 del archivo schema.sql).</p>
        <button onClick={() => supabase.auth.signOut()}>Salir</button>
      </div>
    </main>
  )
  return <Console biz={biz} reload={load} />
}

/* ---------- Consola ---------- */
function Console({ biz, reload }) {
  const { b } = biz
  const [tab, setTab] = useState('dash')
  const [rows, setRows] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [msg, setMsg] = useState(null)
  const say = useCallback((t, o) => setMsg({ t, id: Date.now(), ...(typeof o === 'number' ? { ms: o } : o || {}) }), [])

  const refresh = useCallback(async () => {
    const from = new Date(Date.now() - 30 * 864e5).toISOString()
    const { data } = await supabase.from('appointments').select('*, clients(name,phone), services(name)')
      .eq('business_id', b.id).gte('starts_at', from).order('starts_at')
    setRows(data || [])
  }, [b.id])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { say(HELP[tab], { mood: tab === 'dash' ? 'happy' : 'idle' }) }, [tab, say])

  return (
    <>
      <Ambient />
      <header>
        <div className="top">
          <div className="brand"><span className="logo">{b.name[0]}</span><div>{b.name}<small>Panel de la dueña</small></div></div>
          <button onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
        <nav id="tabs" aria-label="Secciones">
          {TABS.map(([id, l]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); window.scrollTo(0, 0) }}>{l}</button>)}
        </nav>
      </header>
      <main><div key={tab} className="view">
        {tab === 'dash' && <Dash b={b} rows={rows} onNew={() => { setTab('ag'); setNewOpen(true) }} />}
        {tab === 'ag' && <Agenda b={b} rows={rows} refresh={refresh} say={say} services={biz.services} newOpen={newOpen} setNewOpen={setNewOpen} />}
        {tab === 'svc' && <ServicesEd b={b} services={biz.services} reload={reload} say={say} />}
        {tab === 'hr' && <HoursEd b={b} schedules={biz.schedules} blocked={biz.blocked} reload={reload} say={say} />}
      </div></main>
      <Pixi msg={msg} onTap={() => say(HELP[tab], 6500)} />
    </>
  )
}

/* ---------- Resumen ---------- */
function Dash({ b, rows, onNew }) {
  const tz = b.timezone
  const today = dayKey(new Date(), tz), wkEnd = dayKey(new Date(Date.now() + 7 * 864e5), tz)
  const up = (rows || []).filter(a => a.status === 'confirmed' && dayKey(new Date(a.starts_at), tz) >= today)
  const wk = up.filter(a => dayKey(new Date(a.starts_at), tz) <= wkEnd)
  const nxt = up.filter(a => new Date(a.ends_at) > new Date())
  const k = [
    ['Citas hoy', up.filter(a => dayKey(new Date(a.starts_at), tz) === today).length],
    ['Citas esta semana', wk.length],
    ['Ingreso estimado (7 días)', wk.reduce((s, a) => s + Number(a.price), 0), money],
    ['Próxima cita', nxt[0] ? `${dayLabel(dayKey(new Date(nxt[0].starts_at), tz))} · ${timeLabel(nxt[0].starts_at, tz)}` : '—']
  ]
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h2>Resumen</h2><p className="mute">Tu negocio de un vistazo.</p></div>
        <button className="pri" onClick={onNew}>Nueva cita</button>
      </div>
      <div className="kpis">{k.map(([l, v, fmt]) => <div className="card kpi" key={l}><span className="mute">{l}</span><b>{rows ? <CountUp v={v} fmt={fmt} /> : '…'}</b></div>)}</div>
      <h3>Próximas citas</h3>
      {rows && (nxt.length
        ? <div className="list">{nxt.slice(0, 6).map(a => (
            <div className="item" key={a.id}>
              <div className="n"><b>{a.clients?.name}</b><span className="mute">{a.services?.name}</span></div>
              <b>{dayLabel(dayKey(new Date(a.starts_at), tz))} · {timeLabel(a.starts_at, tz)}</b>
            </div>))}</div>
        : <div className="empty">Aún no hay citas próximas. Comparte tu enlace de reservas: /{b.slug}</div>)}
    </>
  )
}

/* ---------- Agenda ---------- */
function Agenda({ b, rows, refresh, say, services, newOpen, setNewOpen }) {
  const tz = b.timezone
  const [date, setDate] = useState(dayKey(new Date(), tz))
  const list = (rows || []).filter(a => dayKey(new Date(a.starts_at), tz) === date)

  async function setStatus(a, status) {
    if (status === 'cancelled' && !window.confirm('¿Cancelar esta cita? El horario quedará libre.')) return
    const { error } = await supabase.from('appointments').update({ status }).eq('id', a.id)
    if (error) say('No se pudo actualizar la cita.')
    else { say(status === 'cancelled' ? 'Cita cancelada. El horario quedó libre.' : 'Cita actualizada.'); refresh() }
  }

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Agenda</h2>
        <button className="pri" onClick={() => setNewOpen(!newOpen)}>{newOpen ? 'Cerrar' : 'Nueva cita'}</button>
      </div>
      {newOpen && <NewAppt b={b} services={services.filter(s => s.active)} say={say}
        onSaved={d => { setNewOpen(false); if (d) setDate(d); refresh() }} />}
      <label style={{ maxWidth: 220, marginTop: 14 }}>Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      {!rows ? <p className="mute">Cargando…</p> : list.length
        ? <div className="list">{list.map(a => {
            const [lbl, x] = STATUS[a.status] || [a.status, '']
            return (
              <div className="item appt" key={a.id} style={a.status === 'cancelled' ? { opacity: .6 } : null}>
                <div className="n">
                  <b>{timeLabel(a.starts_at, tz)}–{timeLabel(a.ends_at, tz)}</b> <span className={'badge' + x}>{lbl}</span>
                  <div>{a.clients?.name} · {a.services?.name}</div>
                  <div className="mute">{a.clients?.phone}{a.created_by === 'owner' ? ' · agendada por ti' : ''}</div>
                </div>
                {a.status === 'confirmed' && (
                  <div className="acts">
                    <a className="btn" href={waLink(a.clients?.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
                    <button onClick={() => setStatus(a, 'completed')}>Completada</button>
                    <button onClick={() => setStatus(a, 'cancelled')}>Cancelar cita</button>
                  </div>
                )}
              </div>)
          })}</div>
        : <div className="empty">No hay citas este día.</div>}
    </>
  )
}

function NewAppt({ b, services, say, onSaved }) {
  const tz = b.timezone
  const [svc, setSvc] = useState(services[0]?.id || '')
  const [date, setDate] = useState(dayKey(new Date(), tz))
  const [slots, setSlots] = useState(null)
  const [slot, setSlot] = useState(null)
  const [f, setF] = useState({ name: '', phone: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const s = services.find(x => x.id === svc)

  useEffect(() => {
    if (!svc || !date) return
    let off = false
    setSlots(null); setSlot(null)
    supabase.rpc('get_available_slots', { p_slug: b.slug, p_service_id: svc, p_date: date }).then(({ data }) => {
      if (!off) setSlots((data || []).map(r => r.slot_start))
    })
    return () => { off = true }
  }, [svc, date, b.slug])

  async function save() {
    const phone = f.phone.replace(/\D/g, '')
    if (!s || !slot) { setErr('Elige servicio, día y hora.'); return }
    if (f.name.trim().length < 2 || phone.length < 8) { setErr('Escribe el nombre y un teléfono de al menos 8 dígitos.'); return }
    setBusy(true); setErr('')
    const { data: c, error: e1 } = await supabase.from('clients')
      .upsert({ business_id: b.id, name: f.name.trim(), phone }, { onConflict: 'business_id,phone' }).select('id').single()
    if (e1) { setBusy(false); setErr(errMsg(e1)); return }
    const start = new Date(slot)
    const { error } = await supabase.from('appointments').insert({
      business_id: b.id, client_id: c.id, service_id: s.id, starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + s.duration_min * 60000).toISOString(), price: s.price, created_by: 'owner'
    })
    setBusy(false)
    if (error) { setErr(error.code === '23P01' ? 'Ese horario ya está ocupado.' : errMsg(error)); return }
    say('Cita agendada.'); onSaved(date)
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 12 }}>Nueva cita</h3>
      <label>Servicio<select value={svc} onChange={e => setSvc(e.target.value)}>{services.map(x => <option key={x.id} value={x.id}>{x.name} · {x.duration_min} min</option>)}</select></label>
      <label>Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      {slots === null ? <p className="mute">Buscando horarios…</p> : slots.length
        ? <div className="chips" style={{ marginBottom: 14 }}>{slots.map(t => <button key={t} className={slot === t ? 'sel' : ''} onClick={() => setSlot(t)}>{timeLabel(t, tz)}</button>)}</div>
        : <div className="empty" style={{ marginBottom: 14 }}>No hay horarios libres ese día.</div>}
      <label>Nombre de la clienta<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Teléfono<input value={f.phone} inputMode="tel" onChange={e => setF({ ...f, phone: e.target.value })} /></label>
      <div className="err">{err}</div>
      <button className="pri" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Agendar cita'}</button>
    </div>
  )
}

/* ---------- Servicios ---------- */
function ServicesEd({ b, services, reload, say }) {
  async function upd(id, patch) {
    const { error } = await supabase.from('services').update(patch).eq('id', id)
    if (error) say('No se pudo guardar.'); else { say('Cambios guardados.'); reload() }
  }
  const num = (e, s, key, min, max) => {
    const v = Number(e.target.value)
    if (!(v >= min && v <= max)) { say(`Valor fuera de rango (${min} a ${max}).`); e.target.value = s[key]; return }
    if (v !== Number(s[key])) upd(s.id, { [key]: v })
  }
  async function add() {
    const { error } = await supabase.from('services').insert({ business_id: b.id, name: 'Nuevo servicio', category: 'Pestañas', duration_min: 60, price: 0, sort_order: services.length + 1 })
    if (error) say('No se pudo agregar.'); else { say('Servicio agregado. Edita su nombre y precio.'); reload() }
  }
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h2>Servicios y precios</h2><p className="mute">La duración define qué horarios se ofrecen.</p></div>
        <button className="pri" onClick={add}>Agregar servicio</button>
      </div>
      <div className="list">
        {services.map(s => (
          <div className="ed sv" key={s.id}>
            <div className="edn">
              <b>{s.category}</b>
              <label className="tg"><input type="checkbox" defaultChecked={s.active} onChange={e => upd(s.id, { active: e.target.checked })} /> Visible</label>
            </div>
            <label>Nombre<input defaultValue={s.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== s.name) upd(s.id, { name: v }); else e.target.value = s.name }} /></label>
            <label>Categoría<select defaultValue={s.category} onChange={e => upd(s.id, { category: e.target.value })}><option>Pestañas</option><option>Uñas</option></select></label>
            <label>Duración (min)<input type="number" step="15" inputMode="numeric" defaultValue={s.duration_min} onBlur={e => num(e, s, 'duration_min', 15, 480)} /></label>
            <label>Precio ($)<input type="number" step="10" inputMode="numeric" defaultValue={s.price} onBlur={e => num(e, s, 'price', 0, 100000)} /></label>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Horarios y bloqueos ---------- */
function HoursEd({ b, schedules, blocked, reload, say }) {
  const [rows, setRows] = useState(() => schedules.map(r => ({ ...r, open_time: hm(r.open_time), close_time: hm(r.close_time), lunch_start: hm(r.lunch_start), lunch_end: hm(r.lunch_end) })))
  const [bd, setBd] = useState('')
  const set = (i, k, v) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  async function save() {
    for (const r of rows) {
      if (!r.is_open) continue
      if (!r.open_time || !r.close_time || r.close_time <= r.open_time) { say(`Revisa la jornada del ${DNF[r.day_of_week]}.`); return }
      if (!!r.lunch_start !== !!r.lunch_end || (r.lunch_start && r.lunch_end <= r.lunch_start)) { say(`Revisa la comida del ${DNF[r.day_of_week]}: llena ambas horas o deja ambas vacías.`); return }
    }
    const payload = rows.map(r => ({
      id: r.id, business_id: b.id, day_of_week: r.day_of_week, is_open: r.is_open,
      open_time: r.open_time || '10:00', close_time: r.close_time || '19:00',
      lunch_start: r.lunch_start || null, lunch_end: r.lunch_end || null
    }))
    const { error } = await supabase.from('schedules').upsert(payload)
    if (error) say('No se pudo guardar el horario.'); else { say('Horario guardado. Ya se refleja para las clientas.'); reload() }
  }
  async function block() {
    if (!bd) { say('Elige primero la fecha.'); return }
    const { error } = await supabase.from('blocked_dates').upsert({ business_id: b.id, day: bd }, { onConflict: 'business_id,day' })
    if (error) say('No se pudo bloquear.'); else { say('Día bloqueado. Nadie podrá reservarlo.'); setBd(''); reload() }
  }
  async function unblock(id) {
    await supabase.from('blocked_dates').delete().eq('id', id); say('Bloqueo quitado.'); reload()
  }

  return (
    <>
      <h2>Horarios</h2><p className="mute">Jornada semanal, hora de comida y días de descanso.</p>
      <div className="list">
        {rows.map((r, i) => (
          <div className="ed" key={r.id}>
            <div className="edn"><b>{DNF[r.day_of_week]}</b><label className="tg"><input type="checkbox" checked={r.is_open} onChange={e => set(i, 'is_open', e.target.checked)} /> Abierto</label></div>
            {r.is_open ? (
              <>
                <label>Abre<input type="time" value={r.open_time} onChange={e => set(i, 'open_time', e.target.value)} /></label>
                <label>Cierra<input type="time" value={r.close_time} onChange={e => set(i, 'close_time', e.target.value)} /></label>
                <label>Comida desde<input type="time" value={r.lunch_start} onChange={e => set(i, 'lunch_start', e.target.value)} /></label>
                <label>Hasta<input type="time" value={r.lunch_end} onChange={e => set(i, 'lunch_end', e.target.value)} /></label>
              </>
            ) : <span className="mute">Día de descanso</span>}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 14 }}><button className="pri" onClick={save}>Guardar horarios</button></p>

      <h3 style={{ margin: '26px 0 10px' }}>Bloquear una fecha</h3>
      <div className="row"><input type="date" value={bd} onChange={e => setBd(e.target.value)} style={{ maxWidth: 200, margin: 0 }} /><button onClick={block}>Bloquear día</button></div>
      <div className="bl">
        {blocked.length ? blocked.map(d => <span className="badge" key={d.id}>{dayLabel(d.day)} <button className="link" style={{ padding: '0 4px', minHeight: 0 }} onClick={() => unblock(d.id)} aria-label="Quitar bloqueo">✕</button></span>)
          : <span className="mute">Sin fechas bloqueadas.</span>}
      </div>
    </>
  )
}
