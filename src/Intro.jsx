import { useEffect, useRef, useState } from 'react'
import { Figure, CH, STR, PUFFS, rects } from './sprite'
import { Sparkles } from './fx'

/* Bienvenida a pantalla completa:
   cae con paracaídas → aterriza mal (humo) → manos a la cintura → se pone triste y habla
   → título "Bienvenida a …  Conoce a Pixi" con Pixi haciendo sus poses → botón Agendar */
const MSG = '¡Ay no! Mis uñas y pestañas quedaron arruinadas… ¿Por qué no agendamos una cita?'
const SHOW = [['wave', 'wave'], ['up', 'happy'], ['hips', 'proud'], ['wave', 'wave'], ['up', 'happy'], ['down', 'idle']] // poses del final
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const unit = () => Math.max(4, Math.min(8, Math.floor(Math.min(window.innerWidth / 56, window.innerHeight / 110))))

const Cloud = ({ top, s, d, delay }) => (
  <svg className="icloud" viewBox="0 0 11 4" shapeRendering="crispEdges" aria-hidden="true"
    style={{ top, width: s * 11, height: s * 4, animationDuration: d + 's', animationDelay: delay + 's' }}>
    {rects([[2,0,6,1],[1,1,9,1],[0,2,11,2]], '#ffffff')}
  </svg>
)

export default function Intro({ name, onStart }) {
  const rm = reduced()
  const [u] = useState(unit)
  const [stage, setStage] = useState(rm ? 'final' : 'fall') // fall | crash | proud | sad | final
  const [txt, setTxt] = useState('')
  const [talk, setTalk] = useState(false)
  const [smoke, setSmoke] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [chute, setChute] = useState(!rm)
  const [i, setI] = useState(0)
  const [burst, setBurst] = useState(0)
  const [out, setOut] = useState(false)
  const T = useRef([])
  const typer = useRef()
  const after = (ms, fn) => T.current.push(setTimeout(fn, ms))

  const finish = () => {
    T.current.forEach(clearTimeout); T.current = []; clearInterval(typer.current)
    setStage('final'); setDirty(false); setSmoke(0); setChute(false); setTalk(false); setTxt(''); setBurst(b => b + 1)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    if (!rm) {
      after(2800, () => { setStage('crash'); setSmoke(1); setDirty(true) })
      after(3900, () => { setStage('proud'); setChute(false) })
      after(4800, () => {
        setStage('sad'); setTalk(true)
        let n = 0
        typer.current = setInterval(() => {
          n++; setTxt(MSG.slice(0, n))
          if (n >= MSG.length) { clearInterval(typer.current); setTalk(false); after(2300, finish) }
        }, 26)
      })
    }
    return () => { document.body.style.overflow = ''; T.current.forEach(clearTimeout); clearInterval(typer.current) }
  }, []) // eslint-disable-line

  // al final, Pixi muestra sus poses una tras otra
  useEffect(() => {
    if (stage !== 'final' || rm) return
    const h = setInterval(() => setI(x => (x + 1) % SHOW.length), 1700)
    return () => clearInterval(h)
  }, [stage, rm])

  const go = () => { setOut(true); setTimeout(onStart, 480) }
  const [pose, mood] = stage === 'fall' ? ['up', 'idle'] : stage === 'crash' ? ['flail', 'crash']
    : stage === 'proud' ? ['hips', 'proud'] : stage === 'sad' ? ['sad', 'sad'] : SHOW[i]
  const fin = stage === 'final'

  return (
    <div className={'intro' + (out ? ' out' : '')} style={{ '--u': u + 'px' }} role="dialog" aria-label="Bienvenida">
      <div className="isky" aria-hidden="true">
        <Sparkles />
        <Cloud top="12%" s={u * 0.9} d={70} delay={-10} /><Cloud top="30%" s={u * 0.6} d={95} delay={-50} /><Cloud top="50%" s={u * 0.75} d={80} delay={-30} />
      </div>
      {!fin && <button className="skip" onClick={finish}>Saltar</button>}

      <div className={'ititle' + (fin ? ' on' : '')}>
        <h1>Bienvenida a <b>{name}</b></h1>
        <p>Conoce a <span>Pixi</span></p>
      </div>

      <div className="iground" aria-hidden="true" />
      <div className="ipixi" style={{ width: 24 * u, height: 34 * u }}>
        <div className={'ishadow' + (stage === 'fall' ? ' grow' : '')} />
        <div className={'ifall' + (stage === 'fall' ? ' dropping' : '')}>
          <div className={'isway' + (stage === 'fall' ? ' swaying' : '')} style={{ transformOrigin: `50% ${-21 * u}px` }}>
            {chute && (
              <svg className={'ichute' + (stage === 'crash' ? ' down' : '')} viewBox="0 0 40 30" shapeRendering="crispEdges" aria-hidden="true"
                style={{ left: -8 * u, top: -21 * u, width: 40 * u, height: 30 * u }}>
                {CH.map(([x, y, w, c], k) => <rect key={'c' + k} x={x} y={y} width={w} height="1" fill={c} />)}
                {STR.map(([x, y], k) => <rect key={'s' + k} x={x} y={y} width="1" height="1" fill="#b99aa9" />)}
              </svg>
            )}
            <div className={'isprite st-' + stage} key={fin ? 'f' + i : stage}>
              <Figure pose={pose} mood={mood} talk={talk} dirty={dirty} u={u} />
            </div>
          </div>
        </div>
        {smoke > 0 && (
          <>
            <div className="iring" />
            <div className="ismoke" aria-hidden="true">
              {PUFFS.map(([dx, dy, s], k) => <i key={k} style={{ '--dx': dx * u / 2 + 'px', '--dy': dy * u / 2 + 'px', '--s': s, '--d': k * 90 + 'ms' }} />)}
            </div>
          </>
        )}
        {stage === 'crash' && <div className="istars" aria-hidden="true"><b>★</b><b>★</b><b>★</b></div>}
        {burst > 0 && (
          <div className="iburst" key={burst} aria-hidden="true">
            {['♥', '✦', '♥', '✦', '♥', '✦'].map((c, k) => <span key={k} style={{ '--dx': (k - 2.5) * u * 2.4 + 'px', '--d': k * 70 + 'ms' }}>{c}</span>)}
          </div>
        )}
        <div className={'ibub' + (stage === 'sad' ? ' show' : '')} role="status" aria-live="polite">{txt}</div>
      </div>

      {fin && <button className="icta" onClick={go}>Agendar cita</button>}
    </div>
  )
}
