import { useCallback, useEffect, useRef, useState } from 'react'

/* ============ Sprite pixel art 24x22 ============ */
const K = '#4a2540'
const BASE = [
  ['#8a4a6f', [[8,1,8,1],[6,2,12,1],[5,3,14,10],[5,13,2,3],[17,13,2,3]]],
  ['#ffe0d0', [[7,4,10,9],[8,13,8,2],[10,15,4,1]]],
  ['#8a4a6f', [[7,4,10,2],[7,6,2,1],[15,6,2,1]]],
  ['#ffb3cc', [[8,11,2,1],[14,11,2,1]]],
  ['#ff8fb8', [[16,2,2,3],[19,2,2,3],[18,3,1,1]]],
  ['#a8e6df', [[4,8,2,4],[18,8,2,4],[5,6,1,2],[18,6,1,2],[6,5,12,1]]],
  ['#ffc2d9', [[6,16,12,6],[9,15,6,1]]],
  ['#ffffff', [[11,17,2,2]]]
]
const EYES = {
  open: [[8,7,3,1],[13,7,3,1],[9,8,1,2],[14,8,1,2],[7,8,1,1],[16,8,1,1]],
  closed: [[8,9,3,1],[13,9,3,1]],
  happy: [[8,9,1,1],[9,8,1,1],[10,9,1,1],[13,9,1,1],[14,8,1,1],[15,9,1,1]],
  x: [[8,7,1,1],[10,7,1,1],[9,8,1,1],[8,9,1,1],[10,9,1,1],[13,7,1,1],[15,7,1,1],[14,8,1,1],[13,9,1,1],[15,9,1,1]]
}
const MOUTH = {
  closed: ['#e0607e', [[11,12,2,1]]],
  open: ['#b3294e', [[11,12,2,2]]],
  smile: ['#e0607e', [[10,12,1,1],[11,13,2,1],[13,12,1,1]]],
  oops: ['#e0607e', [[11,12,2,1],[10,13,1,1],[13,13,1,1]]],
  wavy: ['#e0607e', [[10,13,1,1],[11,12,1,1],[12,13,1,1],[13,12,1,1]]]
}
const SOOT = [[8,5,3,1],[14,5,2,1],[7,10,2,1],[15,11,2,1],[11,10,2,1],[6,16,3,1],[14,17,3,1]]
const TUFT = [[10,0,1,1],[13,0,1,1],[12,1,1,1],[4,4,1,1],[19,5,1,1]]
const rects = (rs, fill, cls) => (
  <g className={cls} fill={fill}>{rs.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
)

/* ============ Paracaídas pixel art (40x26) ============ */
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
;[[4,7],[12,7],[28,7],[36,7]].forEach(([x, y]) => line(x, y, 20, 25))

/* humo: [dx, dy, escala] */
const PUFFS = [[-34,-6,2.4],[-18,-26,2.8],[0,-34,3],[20,-22,2.6],[36,-4,2.2],[-28,-44,2.4],[6,-52,2],[30,-40,2.5],[-8,-18,3.2],[14,-12,2.8]]

/* ============ Posiciones en pantalla ============ */
const W = 56, H = 54
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const minY = () => (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 6
const bottomGap = () => (window.innerWidth <= 760 ? 84 : 16)
const landing = () => ({ x: Math.round(window.innerWidth * 0.62 - W / 2), y: window.innerHeight - H - bottomGap() })
// at: 'br' | 'bl' | 'land' | 'peekR' | 'peekL' | selector CSS (se posa en la esquina superior derecha del elemento)
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
        return { x: Math.min(vw - W - 8, Math.max(8, r.right - W - 8)), y: Math.min(maxY, Math.max(minY(), r.top - H + 10)) }
      }
    }
  }
  return { x: vw - W - 14, y: maxY }
}

/* msg = { t, id, ms?, at?, mood?, cta? }   mood: idle | happy | oops | think | crash
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
  const [phase, setPhase] = useState(startIntro ? 'fall' : null) // fall | crash | null
  const [chute, setChute] = useState(startIntro)
  const [smoke, setSmoke] = useState(0)
  const last = useRef(Date.now())
  const T = useRef({})
  const R = useRef({})
  const lock = useRef(startIntro) // mientras dura la intro se ignoran otros mensajes
  R.current = { pos, at, mode, show, tips, onSay }

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
      if (target !== 'br') T.current.ret = setTimeout(() => goTo('br'), 450)
    }, (m.ms || 5200) + m.t.length * 25)
  }, [goTo])

  // Mensajes que llegan desde la app
  useEffect(() => { if (msg?.t && !lock.current) speak(msg) }, [msg, speak])

  // --- Intro: cae con paracaídas, aterriza mal, humo y mensaje ---
  useEffect(() => {
    if (!intro) return
    if (!startIntro) { lock.current = false; speak({ t: intro.text, mood: 'oops', ms: 6000, cta: intro.cta }); return }
    const a = setTimeout(() => { setPhase('crash'); setMood('crash'); setSmoke(1) }, 2900)
    const b = setTimeout(() => { setChute(false); setPhase(null) }, 3900)
    const c = setTimeout(() => { lock.current = false; speak({ t: intro.text, mood: 'crash', at: 'land', ms: 6500, cta: intro.cta }) }, 4300)
    T.current.intro = [a, b, c]
    return () => T.current.intro.forEach(clearTimeout)
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
        setPhase(null); setChute(false); setSmoke(0); setMood('idle'); goTo('br'); return
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

  const vw = window.innerWidth
  const right = pos.x > vw / 2
  const avail = right ? pos.x - 20 : vw - pos.x - W - 20
  const asleep = mode === 'sleep', crash = mood === 'crash'
  const mouth = asleep ? MOUTH.closed : crash ? MOUTH.wavy : mood === 'happy' ? MOUTH.smile : mood === 'oops' ? MOUTH.oops : MOUTH.closed

  return (
    <div id="bot" className={(follow ? 'follow ' : '') + mode} style={{ transform: `translate3d(${pos.x}px,${pos.y}px,0)` }}>
      <div id="bub" role="status" aria-live="polite" className={(show && mode === 'normal' ? 'show ' : '') + (right ? 'l' : 'r')}
        style={{ maxWidth: Math.max(110, Math.min(250, avail)) }}>
        {txt}{mood === 'think' && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
        {cta && <button className="pri sm" onClick={() => { cta.fn(); setShow(false); setCta(null) }}>{cta.label}</button>}
      </div>
      <div className={'fall' + (phase === 'fall' ? ' dropping' : '')} style={{ '--fy': pos.y + 190 + 'px' }}>
        <div className={'sway' + (phase === 'fall' ? ' swaying' : '')}>
          {chute && (
            <svg className={'chute' + (phase === 'crash' ? ' down' : '')} viewBox="0 0 40 26" width="120" height="78" shapeRendering="crispEdges" aria-hidden="true">
              {CH.map(([x, y, w, c], i) => <rect key={'c' + i} x={x} y={y} width={w} height="1" fill={c} />)}
              {STR.map(([x, y], i) => <rect key={'s' + i} x={x} y={y} width="1" height="1" fill="#b99aa9" />)}
            </svg>
          )}
          <button id="av" className={(moving ? 'moving ' : '') + (talk ? 'talk ' : '') + 'mood-' + mood}
            style={{ rotate: mode === 'peek' ? (right ? '-16deg' : '16deg') : '0deg' }}
            onClick={onTap} aria-label="Pixi, asistente. Toca para ver ayuda">
            <svg viewBox="0 0 24 22" shapeRendering="crispEdges" aria-hidden="true">
              {BASE.map(([c, rs], i) => <g key={i}>{rects(rs, c)}</g>)}
              {crash && <>{rects(TUFT, '#8a4a6f')}<g opacity=".5">{rects(SOOT, '#3a2430')}</g></>}
              {asleep ? rects(EYES.closed, K) : crash ? rects(EYES.x, K) : mood === 'happy' ? rects(EYES.happy, K)
                : <>{rects(EYES.open, K, 'eo')}{rects(EYES.closed, K, 'ec')}</>}
              {talk ? <>{rects(MOUTH.open[1], MOUTH.open[0], 'mt1')}{rects(MOUTH.closed[1], MOUTH.closed[0], 'mt2')}</> : rects(mouth[1], mouth[0])}
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
          {['♥', '✦', '♥', '✦', '♥', '✦'].map((c, i) => <span key={i} style={{ '--dx': (i - 2.5) * 14 + 'px', '--d': i * 60 + 'ms' }}>{c}</span>)}
        </div>
      )}
      {asleep && <div className="zzz" aria-hidden="true"><span>z</span><span>Z</span></div>}
    </div>
  )
}
