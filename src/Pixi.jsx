import { useCallback, useEffect, useRef, useState } from 'react'

/* =====================================================================
   PIXI · sprite de cuerpo completo (cuadrícula 24 x 34, 2 px por pixel)
   Se dibuja por piezas (piernas, vestido, cabeza, brazos) para poder
   componer poses. Para ANIMAR más: agrega poses en POSES / frames abajo.
   ===================================================================== */
const SK = '#ffe0d0', SL = '#ffc2d9', HAIR = '#8a4a6f', WH = '#ffffff', MINT = '#a8e6df', BOW = '#ff8fb8', INK = '#4a2540'
const mirror = rs => rs.map(([x, y, w, h]) => [24 - x - w, y, w, h])
const both = L => ({ L, R: L.map(([c, rs]) => [c, mirror(rs)]) })

/* ---- Cabeza ---- */
const HEAD = [
  [HAIR, [[8,1,8,1],[6,2,12,1],[5,3,14,10],[5,13,2,3],[17,13,2,3]]],
  [SK, [[7,4,10,9],[8,13,8,2]]],
  [HAIR, [[7,4,10,2],[7,6,2,1],[15,6,2,1]]],
  ['#ffb3cc', [[8,11,2,1],[14,11,2,1]]],
  [BOW, [[16,2,2,3],[19,2,2,3],[18,3,1,1]]],
  [MINT, [[4,8,2,4],[18,8,2,4],[5,6,1,2],[18,6,1,2],[6,5,12,1]]]
]
const EYES = {
  open: [[8,7,3,1],[13,7,3,1],[9,8,1,2],[14,8,1,2],[7,8,1,1],[16,8,1,1]],
  closed: [[8,9,3,1],[13,9,3,1]],
  happy: [[8,9,1,1],[9,8,1,1],[10,9,1,1],[13,9,1,1],[14,8,1,1],[15,9,1,1]],
  x: [[8,7,1,1],[10,7,1,1],[9,8,1,1],[8,9,1,1],[10,9,1,1],[13,7,1,1],[15,7,1,1],[14,8,1,1],[13,9,1,1],[15,9,1,1]]
}
const BROWS_SAD = [[8,6,1,1],[9,6,1,1],[14,6,1,1],[15,6,1,1]]
const MOUTH = {
  closed: [INK, [[11,12,2,1]]],
  open: ['#b3294e', [[11,12,2,2]]],
  smile: ['#e0607e', [[10,12,1,1],[11,13,2,1],[13,12,1,1]]],
  frown: ['#e0607e', [[11,12,2,1],[10,13,1,1],[13,13,1,1]]],
  wavy: ['#e0607e', [[10,13,1,1],[11,12,1,1],[12,13,1,1],[13,12,1,1]]]
}
const SOOT = [[8,5,3,1],[14,5,2,1],[7,10,2,1],[15,11,2,1],[11,10,2,1]]
const SOOT_BODY = [[7,19,2,1],[14,22,2,1],[10,23,3,1]]
const TUFT = [[10,0,1,1],[13,0,1,1],[12,1,1,1],[4,4,1,1],[19,5,1,1]]
const TEARS = [[8,11,1,2],[15,11,1,2]]

/* ---- Cuerpo ---- */
const NECK = [SK, [[10,15,4,1]]]
const DRESS = [
  [SL, [[7,16,10,2],[8,18,8,3],[7,21,10,1],[6,22,12,1],[5,23,14,2]]],
  [BOW, [[8,20,8,1]]],
  [WH, [[5,24,14,1],[11,17,2,2]]]
]
const LEGS = {
  stand: [[SK, [[9,25,2,6],[13,25,2,6]]], [WH, [[9,29,2,2],[13,29,2,2]]], [MINT, [[8,31,3,2],[13,31,3,2]]]],
  a: [[SK, [[7,25,2,6],[15,25,2,6]]], [WH, [[7,29,2,2],[15,29,2,2]]], [MINT, [[6,31,3,2],[15,31,3,2]]]],
  b: [[SK, [[10,25,2,5],[12,25,2,5]]], [WH, [[10,28,2,2],[12,28,2,2]]], [MINT, [[9,30,3,2],[12,30,3,2]]]]
}

/* ---- Brazos (solo el izquierdo; el derecho se espeja) ---- */
const ARM = {
  down: [[SL, [[5,16,2,2]]], [SK, [[5,18,2,5]]]],
  hips: [[SL, [[5,16,2,1],[4,17,2,1]]], [SK, [[3,18,2,2],[4,20,2,1],[5,21,3,1]]]],
  sad: [[SL, [[6,16,2,2]]], [SK, [[7,18,2,2],[8,20,3,2]]]],
  up: [[SL, [[5,16,2,1],[4,15,2,1]]], [SK, [[3,14,2,1],[2,9,2,5],[2,7,2,2]]]],
  up2: [[SL, [[5,16,2,1],[4,15,2,1]]], [SK, [[3,14,2,1],[2,9,2,5],[3,7,2,2]]]],
  flail: [[SL, [[5,16,2,1],[4,16,1,1]]], [SK, [[2,15,3,1],[1,13,2,2],[0,12,2,1]]]]
}
const POSES = {
  down: { ...both(ARM.down) },
  hips: { ...both(ARM.hips) },
  sad: { ...both(ARM.sad), extra: [[SK, [[11,20,2,2]]]] },
  up: { ...both(ARM.up) },
  flail: { ...both(ARM.flail) },
  // el saludo tiene 2 cuadros que se alternan
  wave: [{ L: both(ARM.down).L, R: both(ARM.up).R }, { L: both(ARM.down).L, R: both(ARM.up2).R }]
}

const rects = (rs, fill, cls) => (
  <g className={cls} fill={fill}>{rs.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
)
const layers = (ls, k = '') => ls.map(([c, rs], i) => <g key={k + i}>{rects(rs, c)}</g>)

/* ---- Paracaídas (40 x 30) ---- */
const DOME = [[14,26],[10,30],[7,33],[5,35],[4,36],[3,37],[3,37]]
const CH = []
DOME.forEach(([a, b], y) => {
  let x = a
  while (x <= b) {
    const s = Math.floor((x - 3) / 5); let e = x
    while (e + 1 <= b && Math.floor((e + 1 - 3) / 5) === s) e++
    CH.push([x, y, e - x + 1, s % 2 ? '#ffffff' : '#ff8fb8'])
    x = e + 1
  }
})
const STR = []
const line = (x0, y0, x1, y1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) STR.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)])
}
// las cuerdas terminan en las manos de Pixi
line(4, 7, 11, 29); line(12, 7, 11, 29); line(28, 7, 29, 29); line(36, 7, 29, 29)

/* humo: [dx, dy, escala] */
const PUFFS = [[-34,-6,2.4],[-18,-26,2.8],[0,-34,3],[20,-22,2.6],[36,-4,2.2],[-28,-44,2.4],[6,-52,2],[30,-40,2.5],[-8,-18,3.2],[14,-12,2.8]]

/* ============ Posiciones en pantalla ============ */
const W = 48, H = 68
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const minY = () => (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 6
const bottomGap = () => (window.innerWidth <= 760 ? 84 : 16)
const landing = () => ({ x: Math.round(window.innerWidth * 0.62 - W / 2), y: window.innerHeight - H - bottomGap() })
// at: 'br' | 'bl' | 'land' | 'peekR' | 'peekL' | selector CSS (se para sobre el borde superior del elemento)
function spot(at) {
  const vw = window.innerWidth, vh = window.innerHeight, bot = bottomGap()
  const maxY = vh - H - bot
  if (at === 'land') return landing()
  if (at === 'bl') return { x: 12, y: maxY }
  if (at === 'peekR') return { x: vw - W * 0.4, y: vh * 0.5 }
  if (at === 'peekL') return { x: -W * 0.6, y: vh * 0.35 }
  if (at && at !== 'br') {
    const el = document.querySelector(at)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.bottom > minY() && r.top < vh - bot) {
        return { x: Math.min(vw - W - 8, Math.max(8, r.right - W - 8)), y: Math.min(maxY, Math.max(minY(), r.top - H + 6)) }
      }
    }
  }
  return { x: vw - W - 14, y: maxY }
}

/* msg = { t, id, ms?, at?, mood?, cta? }
   mood: idle | happy | wave | oops | think | crash | proud | sad
   intro = { text, cta:{label, fn} }  -> caída con paracaídas al abrir la página */
export default function Pixi({ msg, onTap, onSay, tips = [], intro }) {
  const startIntro = !!intro && !reduced()
  const [at, setAt] = useState(startIntro ? 'land' : 'br')
  const [pos, setPos] = useState(() => (startIntro ? landing() : spot('br')))
  const [mode, setMode] = useState('normal') // normal | peek | sleep
  const [mood, setMood] = useState('idle')
  const [txt, setTxt] = useState('')
  const [cta, setCta] = useState(null)
  const [show, setShow] = useState(false)
  const [talk, setTalk] = useState(false)
  const [moving, setMoving] = useState(false)
  const [follow, setFollow] = useState(false)
  const [burst, setBurst] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [phase, setPhase] = useState(startIntro ? 'fall' : null) // fall | crash | null
  const [chute, setChute] = useState(startIntro)
  const [smoke, setSmoke] = useState(0)
  const last = useRef(Date.now())
  const T = useRef({})
  const R = useRef({})
  const lock = useRef(startIntro) // mientras dura la intro se ignoran otros mensajes
  R.current = { pos, at, mode, show, tips, onSay, dirty }

  const goTo = useCallback(a => {
    const p = spot(a), o = R.current.pos
    setAt(a); setPos(p)
    if (!reduced() && Math.hypot(p.x - o.x, p.y - o.y) > 6) {
      setMoving(true); clearTimeout(T.current.mv)
      T.current.mv = setTimeout(() => setMoving(false), 900)
    }
  }, [])

  const speak = useCallback(m => {
    last.current = Date.now()
    const target = m.at || 'br'
    setMode('normal'); setMood(m.mood || 'idle'); setCta(m.cta || null)
    clearTimeout(T.current.ret); clearTimeout(T.current.hide); clearInterval(T.current.typer); clearTimeout(T.current.settle)
    goTo(target)
    T.current.settle = setTimeout(() => goTo(target), 650) // re-mide cuando termina la animación de entrada
    if (m.mood === 'happy') setBurst(b => b + 1)
    setShow(true)
    if (reduced()) { setTxt(m.t); setTalk(false) } else {
      let i = 0; setTxt(''); setTalk(true)
      T.current.typer = setInterval(() => {
        i++; setTxt(m.t.slice(0, i))
        if (i >= m.t.length) { clearInterval(T.current.typer); setTalk(false) }
      }, 22)
    }
    T.current.hide = setTimeout(() => {
      setShow(false); setCta(null); setMood('idle')
      if (R.current.dirty) { setBurst(b => b + 1); setDirty(false) } // se limpia con destellos
      if (target !== 'br') T.current.ret = setTimeout(() => goTo('br'), 450)
    }, (m.ms || 5200) + m.t.length * 25)
  }, [goTo])

  // Mensajes que llegan desde la app
  useEffect(() => { if (msg?.t && !lock.current) speak(msg) }, [msg, speak])

  // --- Intro: cae con paracaídas, aterriza mal, humo, manos a la cintura y se pone triste ---
  useEffect(() => {
    if (!intro) return
    if (!startIntro) { lock.current = false; speak({ t: intro.text, mood: 'sad', ms: 6000, cta: intro.cta }); return }
    const t = [
      setTimeout(() => { setPhase('crash'); setMood('crash'); setDirty(true); setSmoke(1) }, 2900), // aterriza mal
      setTimeout(() => { setChute(false); setPhase(null) }, 3900),
      setTimeout(() => setMood('proud'), 4200),                                                      // se incorpora, manos a la cintura
      setTimeout(() => { lock.current = false; speak({ t: intro.text, mood: 'sad', at: 'land', ms: 6500, cta: intro.cta }) }, 5400) // se entristece
    ]
    T.current.intro = t
    return () => t.forEach(clearTimeout)
  }, [intro, startIntro, speak])

  // --- Seguir el elemento al hacer scroll / cambiar tamaño ---
  useEffect(() => {
    let raf
    const upd = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (at !== 'br' && at !== 'bl' && at !== 'land' && !at.startsWith('peek')) {
          setFollow(true); clearTimeout(T.current.fl); T.current.fl = setTimeout(() => setFollow(false), 220)
        }
        setPos(spot(at))
      })
    }
    window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd)
    return () => { window.removeEventListener('scroll', upd); window.removeEventListener('resize', upd); cancelAnimationFrame(raf) }
  }, [at])

  // --- Vida propia: pasea, se asoma por los bordes y se duerme ---
  useEffect(() => {
    const act = () => {
      last.current = Date.now()
      if (lock.current) { // tocar la pantalla salta la intro
        lock.current = false; (T.current.intro || []).forEach(clearTimeout)
        setPhase(null); setChute(false); setSmoke(0); setMood('idle'); setDirty(false); goTo('br'); return
      }
      if (R.current.mode !== 'normal') { setMode('normal'); setMood('idle'); goTo('br') }
    }
    const evs = ['pointerdown', 'keydown']
    evs.forEach(e => window.addEventListener(e, act))
    const tick = setInterval(() => {
      const c = R.current
      if (c.show || lock.current || reduced()) return
      const idle = Date.now() - last.current
      if (idle > 110000 && c.mode !== 'sleep') { setMode('sleep'); setMood('idle') }
      else if (idle > 60000 && c.mode === 'normal') { setMode('peek'); goTo(Math.random() < 0.5 ? 'peekR' : 'peekL') }
      else if (idle > 18000 && idle <= 60000 && c.mode === 'normal' && Math.random() < 0.3) {
        const opts = ['br', 'bl', 'peekR', 'peekL'].filter(a => a !== c.at)
        const next = opts[Math.floor(Math.random() * opts.length)]
        if (c.tips.length && c.onSay && Math.random() < 0.5) c.onSay(c.tips[Math.floor(Math.random() * c.tips.length)], { at: next })
        else goTo(next)
      }
    }, 4000)
    return () => { evs.forEach(e => window.removeEventListener(e, act)); clearInterval(tick) }
  }, [goTo])

  useEffect(() => () => Object.values(T.current).flat().forEach(h => { clearTimeout(h); clearInterval(h) }), [])

  /* ---------- Qué pose y qué cara toca ---------- */
  const vw = window.innerWidth
  const right = pos.x > vw / 2
  const avail = right ? pos.x - 20 : vw - pos.x - W - 20
  const asleep = mode === 'sleep', crash = mood === 'crash', sad = mood === 'sad'
  const poseName = asleep ? 'down' : phase === 'fall' ? 'up' : crash ? 'flail' : mood === 'proud' ? 'hips'
    : sad ? 'sad' : mood === 'happy' ? 'up' : mood === 'wave' ? 'wave' : 'down'
  const pose = POSES[poseName]
  const headDy = asleep ? 2 : sad ? 1 : 0
  const mouth = asleep || mood === 'proud' ? MOUTH.closed : crash ? MOUTH.wavy : sad || mood === 'oops' ? MOUTH.frown
    : mood === 'happy' || mood === 'wave' ? MOUTH.smile : MOUTH.closed
  const armsOf = p => <>{layers(p.L, 'L')}{layers(p.R, 'R')}{p.extra && layers(p.extra, 'X')}</>

  return (
    <div id="bot" className={(follow ? 'follow ' : '') + mode} style={{ transform: `translate3d(${pos.x}px,${pos.y}px,0)` }}>
      <div id="bub" role="status" aria-live="polite" className={(show && mode === 'normal' ? 'show ' : '') + (right ? 'l' : 'r')}
        style={{ maxWidth: Math.max(110, Math.min(250, avail)) }}>
        {txt}{mood === 'think' && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
        {cta && <button className="pri sm" onClick={() => { cta.fn(); setShow(false); setCta(null) }}>{cta.label}</button>}
      </div>
      <div className={'shadow' + (phase === 'fall' ? ' grow' : '')} aria-hidden="true" />
      <div className={'fall' + (phase === 'fall' ? ' dropping' : '')} style={{ '--fy': pos.y + 190 + 'px' }}>
        <div className={'sway' + (phase === 'fall' ? ' swaying' : '')}>
          {chute && (
            <svg className={'chute' + (phase === 'crash' ? ' down' : '')} viewBox="0 0 40 30" width="80" height="60" shapeRendering="crispEdges" aria-hidden="true">
              {CH.map(([x, y, w, c], i) => <rect key={'c' + i} x={x} y={y} width={w} height="1" fill={c} />)}
              {STR.map(([x, y], i) => <rect key={'s' + i} x={x} y={y} width="1" height="1" fill="#b99aa9" />)}
            </svg>
          )}
          {sad && (
            <svg className="rain" viewBox="0 0 14 10" width="28" height="20" shapeRendering="crispEdges" aria-hidden="true">
              {rects([[4,0,6,1],[2,1,10,1],[1,2,12,2]], '#b9c7d8')}{rects([[2,4,10,1]], '#93a6bd')}
              <g className="drops">{rects([[3,6,1,2],[7,6,1,2],[10,6,1,2]], '#6fc3ff')}</g>
            </svg>
          )}
          <button id="av" className={(moving ? 'moving ' : '') + (talk ? 'talk ' : '') + 'mood-' + mood}
            style={{ rotate: mode === 'peek' ? (right ? '-16deg' : '16deg') : '0deg' }}
            onClick={onTap} aria-label="Pixi, asistente. Toca para ver ayuda">
            <svg viewBox="0 0 24 34" width="48" height="68" shapeRendering="crispEdges" aria-hidden="true">
              {/* piernas: 3 cuadros; al caminar se alternan */}
              <g className="lg0">{layers(LEGS.stand)}</g><g className="lg1">{layers(LEGS.a)}</g><g className="lg2">{layers(LEGS.b)}</g>
              {/* vestido y cuello */}
              {layers([NECK, ...DRESS], 'B')}
              {dirty && <g opacity=".5">{rects(SOOT_BODY, '#3a2430')}</g>}
              {/* cabeza */}
              <g transform={`translate(0 ${headDy})`}>
                {layers(HEAD, 'H')}
                {dirty && <>{rects(TUFT, HAIR)}<g opacity=".5">{rects(SOOT, '#3a2430')}</g></>}
                {asleep ? rects(EYES.closed, INK) : crash ? rects(EYES.x, INK) : mood === 'happy' || mood === 'wave' ? rects(EYES.happy, INK)
                  : <>{rects(EYES.open, INK, 'eo')}{rects(EYES.closed, INK, 'ec')}</>}
                {sad && <>{rects(BROWS_SAD, INK)}<g className="tear">{rects(TEARS, '#6fc3ff')}</g></>}
                {talk ? <>{rects(MOUTH.open[1], MOUTH.open[0], 'mt1')}{rects(MOUTH.closed[1], MOUTH.closed[0], 'mt2')}</> : rects(mouth[1], mouth[0])}
              </g>
              {/* brazos (al frente) */}
              {Array.isArray(pose)
                ? <><g className="w1">{armsOf(pose[0])}</g><g className="w2">{armsOf(pose[1])}</g></>
                : armsOf(pose)}
            </svg>
          </button>
        </div>
      </div>
      {smoke > 0 && (
        <div className="smoke" key={smoke} aria-hidden="true">
          {PUFFS.map(([dx, dy, s], i) => <i key={i} style={{ '--dx': dx + 'px', '--dy': dy + 'px', '--s': s, '--d': i * 90 + 'ms' }} />)}
        </div>
      )}
      {crash && <div className="stars" aria-hidden="true"><b>★</b><b>★</b><b>★</b></div>}
      {burst > 0 && (
        <div className="burst" key={burst} aria-hidden="true">
          {['♥', '✦', '♥', '✦', '♥', '✦'].map((c, i) => <span key={i} style={{ '--dx': (i - 2.5) * 12 + 'px', '--d': i * 60 + 'ms' }}>{c}</span>)}
        </div>
      )}
      {asleep && <div className="zzz" aria-hidden="true"><span>z</span><span>Z</span></div>}
    </div>
  )
}
