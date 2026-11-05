import { useCallback, useEffect, useRef, useState } from 'react'
import { Bust } from './sprite'

/* Asistente en su cuadro (esquina). Se mueve, se asoma por los bordes y se duerme. */
const W = 56, H = 54
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const minY = () => (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 6
// at: 'br' | 'bl' | 'peekR' | 'peekL' | selector CSS (se posa sobre el borde superior del elemento)
function spot(at) {
  const vw = window.innerWidth, vh = window.innerHeight, bot = vw <= 760 ? 84 : 16
  const maxY = vh - H - bot
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

/* msg = { t, id, ms?, at?, mood? }   mood: idle | happy | wave | oops | think */
export default function Pixi({ msg, onTap, onSay, tips = [] }) {
  const [at, setAt] = useState('br')
  const [pos, setPos] = useState(() => spot('br'))
  const [mode, setMode] = useState('normal') // normal | peek | sleep
  const [mood, setMood] = useState('idle')
  const [txt, setTxt] = useState('')
  const [show, setShow] = useState(false)
  const [talk, setTalk] = useState(false)
  const [moving, setMoving] = useState(false)
  const [follow, setFollow] = useState(false)
  const [burst, setBurst] = useState(0)
  const last = useRef(Date.now())
  const T = useRef({})
  const R = useRef({})
  R.current = { pos, at, mode, show, tips, onSay }

  const goTo = useCallback(a => {
    const p = spot(a), o = R.current.pos
    setAt(a); setPos(p)
    if (!reduced() && Math.hypot(p.x - o.x, p.y - o.y) > 6) {
      setMoving(true); clearTimeout(T.current.mv)
      T.current.mv = setTimeout(() => setMoving(false), 900)
    }
  }, [])

  useEffect(() => {
    if (!msg?.t) return
    last.current = Date.now()
    const target = msg.at || 'br'
    setMode('normal'); setMood(msg.mood || 'idle')
    clearTimeout(T.current.ret); clearTimeout(T.current.hide); clearInterval(T.current.typer); clearTimeout(T.current.settle)
    goTo(target)
    T.current.settle = setTimeout(() => goTo(target), 650)
    if (msg.mood === 'happy') setBurst(b => b + 1)
    setShow(true)
    if (reduced()) { setTxt(msg.t); setTalk(false) } else {
      let i = 0; setTxt(''); setTalk(true)
      T.current.typer = setInterval(() => {
        i++; setTxt(msg.t.slice(0, i))
        if (i >= msg.t.length) { clearInterval(T.current.typer); setTalk(false) }
      }, 22)
    }
    T.current.hide = setTimeout(() => {
      setShow(false); setMood('idle')
      if (target !== 'br') T.current.ret = setTimeout(() => goTo('br'), 450)
    }, (msg.ms || 5200) + msg.t.length * 25)
  }, [msg, goTo])

  useEffect(() => {
    let raf
    const upd = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (at !== 'br' && at !== 'bl' && !at.startsWith('peek')) {
          setFollow(true); clearTimeout(T.current.fl); T.current.fl = setTimeout(() => setFollow(false), 220)
        }
        setPos(spot(at))
      })
    }
    window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd)
    return () => { window.removeEventListener('scroll', upd); window.removeEventListener('resize', upd); cancelAnimationFrame(raf) }
  }, [at])

  useEffect(() => {
    const act = () => {
      last.current = Date.now()
      if (R.current.mode !== 'normal') { setMode('normal'); setMood('idle'); goTo('br') }
    }
    const evs = ['pointerdown', 'keydown']
    evs.forEach(e => window.addEventListener(e, act))
    const tick = setInterval(() => {
      const c = R.current
      if (c.show || reduced()) return
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

  useEffect(() => () => Object.values(T.current).forEach(h => { clearTimeout(h); clearInterval(h) }), [])

  const vw = window.innerWidth
  const right = pos.x > vw / 2
  const avail = right ? pos.x - 20 : vw - pos.x - W - 20
  const asleep = mode === 'sleep'

  return (
    <div id="bot" className={(follow ? 'follow ' : '') + mode} style={{ transform: `translate3d(${pos.x}px,${pos.y}px,0)` }}>
      <div id="bub" role="status" aria-live="polite" className={(show && mode === 'normal' ? 'show ' : '') + (right ? 'l' : 'r')}
        style={{ maxWidth: Math.max(110, Math.min(250, avail)) }}>
        {txt}{mood === 'think' && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
      </div>
      <button id="av" className={(moving ? 'moving ' : '') + (talk ? 'talk ' : '') + 'mood-' + mood}
        style={{ rotate: mode === 'peek' ? (right ? '-16deg' : '16deg') : '0deg' }}
        onClick={onTap} aria-label="Pixi, asistente">
        <Bust mood={mood} talk={talk} asleep={asleep} />
      </button>
      {burst > 0 && (
        <div className="burst" key={burst} aria-hidden="true">
          {['♥', '✦', '♥', '✦', '♥', '✦'].map((c, i) => <span key={i} style={{ '--dx': (i - 2.5) * 14 + 'px', '--d': i * 60 + 'ms' }}>{c}</span>)}
        </div>
      )}
      {asleep && <div className="zzz" aria-hidden="true"><span>z</span><span>Z</span></div>}
    </div>
  )
}
