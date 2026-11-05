/* =====================================================================
   PIXI · sprite pixel art compartido
   - Figure: cuerpo completo (cuadrícula 24 x 34) para la animación de bienvenida
   - Bust:   busto (24 x 22) para el cuadro pequeño de la esquina
   Para animar más: agrega poses en POSES (o cuadros de 2 frames como 'wave').
   ===================================================================== */
const SK = '#ffe0d0', SL = '#ffc2d9', HAIR = '#8a4a6f', WH = '#ffffff', MINT = '#a8e6df', BOW = '#ff8fb8', INK = '#4a2540'
const mirror = rs => rs.map(([x, y, w, h]) => [24 - x - w, y, w, h])
const both = L => ({ L, R: L.map(([c, rs]) => [c, mirror(rs)]) })

export const rects = (rs, fill, cls) => (
  <g className={cls} fill={fill}>{rs.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
)
export const layers = (ls, k = '') => ls.map(([c, rs], i) => <g key={k + i}>{rects(rs, c)}</g>)

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
const NECK = [SK, [[10,15,4,1]]]
const DRESS = [
  [SL, [[7,16,10,2],[8,18,8,3],[7,21,10,1],[6,22,12,1],[5,23,14,2]]],
  [BOW, [[8,20,8,1]]],
  [WH, [[5,24,14,1],[11,17,2,2]]]
]
const LEGS = {
  stand: [[SK, [[9,25,2,6],[13,25,2,6]]], [WH, [[9,29,2,2],[13,29,2,2]]], [MINT, [[8,31,3,2],[13,31,3,2]]]]
}
const ARM = {
  down: [[SL, [[5,16,2,2]]], [SK, [[5,18,2,5]]]],
  hips: [[SL, [[5,16,2,1],[4,17,2,1]]], [SK, [[3,18,2,2],[4,20,2,1],[5,21,3,1]]]],
  sad: [[SL, [[6,16,2,2]]], [SK, [[7,18,2,2],[8,20,3,2]]]],
  up: [[SL, [[5,16,2,1],[4,15,2,1]]], [SK, [[3,14,2,1],[2,9,2,5],[2,7,2,2]]]],
  up2: [[SL, [[5,16,2,1],[4,15,2,1]]], [SK, [[3,14,2,1],[2,9,2,5],[3,7,2,2]]]],
  flail: [[SL, [[5,16,2,1],[4,16,1,1]]], [SK, [[2,15,3,1],[1,13,2,2],[0,12,2,1]]]]
}
export const POSES = {
  down: both(ARM.down),
  hips: both(ARM.hips),
  sad: { ...both(ARM.sad), extra: [[SK, [[11,20,2,2]]]] },
  up: both(ARM.up),
  flail: both(ARM.flail),
  wave: [{ L: both(ARM.down).L, R: both(ARM.up).R }, { L: both(ARM.down).L, R: both(ARM.up2).R }] // 2 cuadros
}

/* ---- Paracaídas (40 x 30, mismas unidades que el sprite) ---- */
const DOME = [[14,26],[10,30],[7,33],[5,35],[4,36],[3,37],[3,37]]
export const CH = []
DOME.forEach(([a, b], y) => {
  let x = a
  while (x <= b) {
    const s = Math.floor((x - 3) / 5); let e = x
    while (e + 1 <= b && Math.floor((e + 1 - 3) / 5) === s) e++
    CH.push([x, y, e - x + 1, s % 2 ? '#ffffff' : '#ff8fb8'])
    x = e + 1
  }
})
export const STR = []
const line = (x0, y0, x1, y1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) STR.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)])
}
line(4, 7, 11, 29); line(12, 7, 11, 29); line(28, 7, 29, 29); line(36, 7, 29, 29) // terminan en sus manos
export const PUFFS = [[-34,-6,2.4],[-18,-26,2.8],[0,-34,3],[20,-22,2.6],[36,-4,2.2],[-28,-44,2.4],[6,-52,2],[30,-40,2.5],[-8,-18,3.2],[14,-12,2.8]]

/* ---- Cara según el estado de ánimo ---- */
function Face({ mood, asleep, talk, dirty }) {
  const crash = mood === 'crash', sad = mood === 'sad', glad = mood === 'happy' || mood === 'wave'
  const m = MOUTH[asleep || mood === 'proud' ? 'closed' : crash ? 'wavy' : sad || mood === 'oops' ? 'frown' : glad ? 'smile' : 'closed']
  return (
    <>
      {dirty && <>{rects(TUFT, HAIR)}<g opacity=".5">{rects(SOOT, '#3a2430')}</g></>}
      {asleep ? rects(EYES.closed, INK) : crash ? rects(EYES.x, INK) : glad ? rects(EYES.happy, INK)
        : <>{rects(EYES.open, INK, 'eo')}{rects(EYES.closed, INK, 'ec')}</>}
      {sad && <>{rects(BROWS_SAD, INK)}<g className="tear">{rects(TEARS, '#6fc3ff')}</g></>}
      {talk && !asleep ? <>{rects(MOUTH.open[1], MOUTH.open[0], 'mt1')}{rects(MOUTH.closed[1], MOUTH.closed[0], 'mt2')}</> : rects(m[1], m[0])}
    </>
  )
}
const armsOf = p => <>{layers(p.L, 'L')}{layers(p.R, 'R')}{p.extra && layers(p.extra, 'X')}</>

/* ---- Cuerpo completo. u = píxeles de pantalla por unidad ---- */
export function Figure({ pose = 'down', mood = 'idle', talk = false, asleep = false, dirty = false, u = 2 }) {
  const p = POSES[pose]
  const dy = asleep ? 2 : mood === 'sad' ? 1 : 0
  return (
    <svg viewBox="0 0 24 34" width={24 * u} height={34 * u} shapeRendering="crispEdges" style={{ overflow: 'visible', display: 'block' }} aria-hidden="true">
      {layers(LEGS.stand, 'G')}
      {layers([NECK, ...DRESS], 'B')}
      {dirty && <g opacity=".5">{rects(SOOT_BODY, '#3a2430')}</g>}
      <g transform={`translate(0 ${dy})`}>{layers(HEAD, 'H')}<Face mood={mood} asleep={asleep} talk={talk} dirty={dirty} /></g>
      {Array.isArray(p) ? <><g className="w1">{armsOf(p[0])}</g><g className="w2">{armsOf(p[1])}</g></> : armsOf(p)}
      {mood === 'sad' && (
        <g className="cloud">
          {rects([[9,-8,6,1],[7,-7,10,1],[6,-6,12,2]], '#b9c7d8')}{rects([[7,-4,10,1]], '#93a6bd')}
          <g className="drops">{rects([[8,-2,1,2],[12,-2,1,2],[15,-2,1,2]], '#6fc3ff')}</g>
        </g>
      )}
    </svg>
  )
}

/* ---- Busto para el cuadrito de la esquina (24 x 22) ---- */
export function Bust({ mood = 'idle', talk = false, asleep = false }) {
  return (
    <svg viewBox="0 0 24 22" shapeRendering="crispEdges" aria-hidden="true">
      {layers([NECK, ...DRESS], 'B')}
      <g>{layers(HEAD, 'H')}<Face mood={mood} asleep={asleep} talk={talk} /></g>
      {armsOf(POSES.down)}
    </svg>
  )
}
