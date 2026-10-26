/** Общая шкала выбранного владельцем цикла A → B → C. */
export const MATRIX_DURATION = 24
type MatrixMode = 'drift' | 'perspective' | 'pixels'
const MODES: MatrixMode[] = ['drift', 'perspective', 'pixels']
const TAU = Math.PI * 2
const wrap = (value: number, size: number) => ((value % size) + size) % size
const random = (seed: number) => wrap(Math.sin(seed * 127.1 + 311.7) * 43758.5453, 1)
const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value))
  return x * x * (3 - 2 * x)
}

/** Длительность художественного входа, с. Это бюджет анимации, а не ожидание загрузки. */
export const ENTRY_DURATION = 1.5

/** Прямоугольник меню в координатах холста, вокруг него фон успокаивается. */
export interface MatrixZone {
  x: number
  y: number
  w: number
  h: number
}

export interface MatrixEntry {
  /** Секунды с момента готовности атласа глифов. */
  elapsed: number
  zone?: MatrixZone | null
}

/** Спад к зоне меню: плавный, без изменения скорости потоков (только прозрачность). */
const ZONE_FALLOFF = 96
const ZONE_CALM = .75

/** Фаза входа: 0–0,4 потоки проявляются, 0,4–1,5 фон успокаивается вокруг меню. */
export function getEntryState(elapsed: number) {
  return { calm: smooth((elapsed - .4) / (ENTRY_DURATION - .4)) }
}

function entryFactor(entry: MatrixEntry, column: number, x: number, y: number) {
  const reveal = smooth((entry.elapsed - random(column + 90) * .25) / .15)
  let zone = 0
  const z = entry.zone
  if (z) {
    const dx = Math.max(z.x - x, 0, x - (z.x + z.w))
    const dy = Math.max(z.y - y, 0, y - (z.y + z.h))
    zone = 1 - smooth(Math.hypot(dx, dy) / ZONE_FALLOFF)
  }
  return reveal * (1 - ZONE_CALM * getEntryState(entry.elapsed).calm * zone)
}

export function getMatrixMix(time: number) {
  const segment = wrap(time, MATRIX_DURATION) / 8
  const index = Math.floor(segment)
  return { from: MODES[index], to: MODES[(index + 1) % 3], amount: smooth((segment % 1 - .65) / .35) }
}

export interface MatrixGlyph {
  id: string
  char: string
  layer: number
  head: boolean
  x: number
  y: number
  scale: number
  opacity: number
  dispersion: number
  seed: number
}

/** Геометрия зависит только от времени: перемотка, resize и пропуски кадров не накапливают ошибки. */
export function getMatrixFrame(
  time: number,
  width: number,
  height: number,
  recipes: readonly string[],
  reduced = false,
  entry?: MatrixEntry,
) {
  const t = wrap(time, MATRIX_DURATION)
  const phase = TAU * t / MATRIX_DURATION
  const phone = width < 768
  const columns = phone ? 22 : 52
  const mix = getMatrixMix(t)
  const result: MatrixGlyph[] = []
  for (const [kind, weight] of [[mix.from, 1 - mix.amount], [mix.to, mix.amount]] as const) {
    for (let i = 0; i < columns; i++) {
      // При снижении качества убираем часть потоков без перемещения оставшихся.
      if (reduced && i % 3 === 2) { continue }
      const layer = i % 3
      const depth = .65 + layer * .3
      const font = 20 + layer * 2
      const span = height + font * 14
      const travel = (1 + i % 2) * t / MATRIX_DURATION + .055 * Math.sin(phase + random(i + 12) * TAU)
      const y = wrap(random(i + 4) * span + travel * span, span) - font
      const x = (i + .5) * width / columns
      const recipe = Array.from(recipes[i % recipes.length] || 'すし')
      for (let j = 0; j < 10; j++) {
        let px = x - width / 2
        let py = y - j * font - height / 2
        let scale = 1
        if (kind === 'perspective') {
          const turn = (phone ? .10 : .16) * Math.sin(phase)
          const tilt = .08 * Math.sin(phase)
          const z = 90 * Math.sin(px / width * Math.PI + phase) * (.5 + depth)
          const rx = px * Math.cos(turn) + z * Math.sin(turn)
          const rz = -px * Math.sin(turn) + z * Math.cos(turn)
          scale = 750 / (750 + rz + depth * 60)
          px = rx * scale
          py = (py * Math.cos(tilt) - z * Math.sin(tilt)) * scale
        } else {
          const zoom = 1.04 + .035 * Math.sin(phase)
          px = px * zoom + 16 * Math.sin(phase) * depth
          py = py * zoom + 8 * (Math.cos(phase) - 1) * depth
        }
        px += width / 2
        py += height / 2
        const edge = Math.min(smooth((py + 20) / 60), smooth((height + 40 - py) / 80))
        result.push({
          id: `${kind}:${i}:${j}`,
          char: recipe[(Math.floor(random(i + 6) * recipe.length) + j) % recipe.length],
          layer,
          head: j === 0,
          x: px,
          y: py,
          scale,
          opacity: weight * edge * (1 - j / 11) * (.35 + depth * .3) * (entry ? entryFactor(entry, i, px, py) : 1),
          dispersion: kind === 'pixels'
            ? Math.sin(Math.PI * t / MATRIX_DURATION) ** 6 * (.65 + .35 * Math.sin(x / width * Math.PI))
            : 0,
          seed: i * 13 + j,
        })
      }
    }
  }
  return result
}

interface MatrixColors {
  background: string
  ink: string
  head: string
}
const keyFor = (glyph: MatrixGlyph) => `${glyph.layer}:${glyph.head}:${glyph.char}`

/** Атлас растеризуется небольшими порциями; кадры переиспользуют глифы через drawImage. */
export function createMatrixRenderer(ctx: CanvasRenderingContext2D, recipes: readonly string[], colors: MatrixColors) {
  const entries = [...new Map(getMatrixFrame(0, 960, 600, recipes).map((g) => [keyFor(g), g])).values()]
  const atlas = document.createElement('canvas')
  const cell = 48
  atlas.width = 32 * cell
  atlas.height = Math.ceil(entries.length / 32) * cell
  const paint = atlas.getContext('2d')
  const positions = new Map<string, { x: number; y: number }>()
  let ready = 0

  return {
    warm() {
      if (!paint) { return true }
      const started = performance.now()
      for (let count = 0; ready < entries.length && count < 12; count++) {
        const glyph = entries[ready]
        const x = ready % 32 * cell
        const y = Math.floor(ready / 32) * cell
        paint.fillStyle = glyph.head ? colors.head : colors.ink
        paint.font = `${(20 + glyph.layer * 2) * 1.5}px monospace`
        paint.textAlign = 'center'
        paint.fillText(glyph.char, x + cell / 2, y + 37.5)
        positions.set(keyFor(glyph), { x, y })
        ready++
        if (performance.now() - started > 4) { break }
      }
      return ready === entries.length
    },
    draw(time: number, width: number, height: number, reduced = false, entry?: MatrixEntry) {
      const started = performance.now()
      ctx.globalAlpha = 1
      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, width, height)
      for (const glyph of getMatrixFrame(time, width, height, recipes, reduced, entry)) {
        if (glyph.opacity < .002 || glyph.y < -32 || glyph.y > height + 32) { continue }
        const position = positions.get(keyFor(glyph))
        const dispersion = smooth(glyph.dispersion)
        if (position && dispersion < 1) {
          ctx.globalAlpha = glyph.opacity * (1 - dispersion)
          ctx.drawImage(
            atlas,
            position.x,
            position.y,
            cell,
            cell,
            glyph.x - 16 * glyph.scale,
            glyph.y - 25 * glyph.scale,
            32 * glyph.scale,
            32 * glyph.scale,
          )
        }
        if (dispersion > .001) {
          ctx.globalAlpha = glyph.opacity * dispersion
          ctx.fillStyle = glyph.head ? colors.head : colors.ink
          for (let q = 0; q < (width < 768 || reduced ? 3 : 6); q++) {
            const angle = random(glyph.seed * 7 + q + 55) * TAU
            const radius = (12 + random(glyph.seed * 3 + q) * 65) * glyph.dispersion
            const dot = Math.max(1.2, 2.5 * glyph.scale)
            ctx.fillRect(glyph.x + Math.cos(angle) * radius, glyph.y + Math.sin(angle) * radius, dot, dot)
          }
        }
      }
      ctx.globalAlpha = 1
      return performance.now() - started
    },
  }
}
