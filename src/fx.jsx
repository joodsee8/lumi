import { useEffect, useState } from 'react'
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Fondo ambiental: manchas suaves que flotan despacio
export const Ambient = () => <div className="ambient" aria-hidden="true"><i /><i /><i /></div>

// Destellos decorativos (para el hero)
export const Sparkles = () => (
  <>{[8, 22, 48, 70, 88, 60, 35].map((l, i) => (
    <span key={i} className="spark" aria-hidden="true"
      style={{ left: l + '%', top: [18, 70, 12, 60, 22, 86, 45][i] + '%', animationDelay: i * 0.6 + 's' }}>✦</span>
  ))}</>
)

// Esqueleto de carga con brillo
export const Skeleton = ({ n = 3 }) => (
  <div aria-busy="true" aria-label="Cargando">{Array.from({ length: n }, (_, i) => <div key={i} className="sk" style={{ animationDelay: i * 0.12 + 's' }} />)}</div>
)

// Número que cuenta hacia arriba
export function CountUp({ v, fmt = x => x }) {
  const [n, setN] = useState(typeof v === 'number' && !reduce() ? 0 : v)
  useEffect(() => {
    if (typeof v !== 'number' || reduce()) { setN(v); return }
    let raf, t0
    const step = t => {
      if (t0 === undefined) t0 = t
      const p = Math.min(1, (t - t0) / 800)
      setN(Math.round(v * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [v])
  return typeof v === 'number' ? fmt(n) : v
}

// Confeti pixel al confirmar una cita
export function Confetti() {
  const [on, setOn] = useState(true)
  useEffect(() => { const t = setTimeout(() => setOn(false), 2800); return () => clearTimeout(t) }, [])
  if (!on || reduce()) return null
  const C = ['#f7a6c3', '#c2386f', '#a8e6df', '#e8dfff', '#ffe0a8']
  return (
    <>{Array.from({ length: 32 }, (_, i) => (
      <span key={i} className="cf" aria-hidden="true"
        style={{ left: (i * 37) % 100 + '%', background: C[i % 5], '--x': ((i * 53) % 90) - 45 + 'px', '--r': (i * 97) % 720 + 'deg', animationDelay: (i % 10) * 0.06 + 's' }} />
    ))}</>
  )
}
