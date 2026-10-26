import { describe, expect, it } from 'vitest'
import {
  blendCeremonyStates,
  BOOT_EVENT_CEILING,
  BOOT_LINES,
  CEREMONY_PHASES,
  type CeremonyEvents,
  createCeremonyRunner,
  getCatcherPose,
  getCeremonyState,
  getFinalState,
  getTotalDuration,
  SKIP_FADE,
} from './entry-ceremony'

const fast: CeremonyEvents = { atlasReadyAt: 0, fontsReadyAt: 0 }
const none: CeremonyEvents = { atlasReadyAt: null, fontsReadyAt: null }
const samples = (end: number, step = .02) => Array.from({ length: Math.round(end / step) + 1 }, (_, i) => i * step)

describe('таблица фаз', () => {
  it('полная версия длится 4,2 с, короткая — 1,5 с', () => {
    expect(getTotalDuration('full')).toBeCloseTo(4.2, 6)
    expect(getTotalDuration('short')).toBeCloseTo(1.5, 6)
    expect(getTotalDuration('none')).toBe(0)
  })

  it('фазы идут встык без пересечений и пропусков', () => {
    for (const phases of Object.values(CEREMONY_PHASES)) {
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].start).toBeCloseTo(phases[i - 1].start + phases[i - 1].duration, 6)
      }
    }
  })

  it('короткая версия не содержит boot-лога', () => {
    expect(CEREMONY_PHASES.short.some((phase) => phase.id === 'boot')).toBe(false)
    for (const t of samples(1.5)) {
      const state = getCeremonyState(t, 'short', fast)
      expect(state.bootLines).toEqual([])
      expect(state.log.opacity).toBe(0)
    }
  })
})

describe('getCeremonyState', () => {
  it('в нуле ничего не видно, в конце — финальный кадр', () => {
    const start = getCeremonyState(0, 'full', fast)
    expect(start.nameLetters.every((v) => v === 0)).toBe(true)
    expect(start.menuItems.every((v) => v === 0)).toBe(true)
    expect(start.role).toBe(0)
    expect(start.calm).toBe(0)
    expect(start.done).toBe(false)

    const end = getCeremonyState(4.2, 'full', fast)
    expect(end.done).toBe(true)
    expect(end.nameLetters.every((v) => v === 1)).toBe(true)
    expect(end.menuItems.every((v) => v === 1)).toBe(true)
    expect(end.role).toBe(1)
    expect(end.calm).toBe(1)
    expect(end.log.opacity).toBe(0)
  })

  it('все значения монотонны во времени (кроме присутствия лога)', () => {
    for (const mode of ['full', 'short'] as const) {
      let previous = getCeremonyState(0, mode, fast)
      for (const t of samples(getTotalDuration(mode) + .3).slice(1)) {
        const state = getCeremonyState(t, mode, fast)
        const pairs: [number[], number[]][] = [
          [previous.nameLetters, state.nameLetters],
          [previous.catchers, state.catchers],
          [previous.menuItems, state.menuItems],
          [[previous.role, previous.calm], [state.role, state.calm]],
          [previous.bootLines.map((l) => l.visible), state.bootLines.map((l) => l.visible)],
        ]
        for (const [a, b] of pairs) {
          b.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(a[i] - 1e-9))
        }
        previous = state
      }
    }
  })

  it('значения непрерывны: нет скачков больше одного кадра при 60 fps', () => {
    for (const mode of ['full', 'short'] as const) {
      const frame = 1 / 60
      let previous = getCeremonyState(0, mode, fast)
      for (let t = frame; t <= getTotalDuration(mode); t += frame) {
        const state = getCeremonyState(t, mode, fast)
        const pairs = [
          ...state.nameLetters.map((v, i) => [previous.nameLetters[i], v]),
          ...state.catchers.map((v, i) => [previous.catchers[i], v]),
          ...state.menuItems.map((v, i) => [previous.menuItems[i], v]),
          [previous.role, state.role],
          [previous.calm, state.calm],
          [previous.log.opacity, state.log.opacity],
        ]
        for (const [a, b] of pairs) { expect(Math.abs(b - a)).toBeLessThan(.4) }
        previous = state
      }
    }
  })

  it('буквы собираются слева направо, затем роль, затем меню по очереди', () => {
    const state = (t: number) => getCeremonyState(t, 'full', fast)
    const s = state(2.5)
    expect(s.catchers[0]).toBe(1)
    expect(s.catchers[3]).toBe(0)
    expect(s.nameLetters[0]).toBe(1)
    expect(state(3.15).nameLetters.every((v) => v > .9)).toBe(true)
    expect(state(3.3).role).toBeCloseTo(.5, 2)
    const menu = state(3.7).menuItems
    for (let i = 1; i < menu.length; i++) { expect(menu[i]).toBeLessThanOrEqual(menu[i - 1]) }
    expect(menu[0]).toBeGreaterThan(0)
  })

  it('лог печатается в boot-фазе и гаснет вверх при сборке имени', () => {
    expect(getCeremonyState(.3, 'full', fast).log.opacity).toBe(0)
    expect(getCeremonyState(.5, 'full', fast).log.opacity).toBe(1)
    expect(getCeremonyState(1, 'full', fast).log.opacity).toBe(1)
    const mid = getCeremonyState(2.5, 'full', fast).log
    expect(mid.opacity).toBeGreaterThan(0)
    expect(mid.opacity).toBeLessThan(1)
    expect(getCeremonyState(3, 'full', fast).log).toEqual({ opacity: 0, leave: 1 })
    // Строки не перекрываются по времени печати слишком сильно: порядок сохраняется.
    const lines = getCeremonyState(1.2, 'full', fast).bootLines
    expect(lines.map((l) => l.key)).toEqual(BOOT_LINES.map((l) => l.key))
    for (let i = 1; i < lines.length; i++) { expect(lines[i].visible).toBeLessThanOrEqual(lines[i - 1].visible) }
  })
})

describe('честные статусы boot-лога', () => {
  const status = (elapsed: number, events: CeremonyEvents, key: string) =>
    getCeremonyState(elapsed, 'full', events).bootLines.find((l) => l.key === key)?.status

  it('«ok» появляется только после события, не раньше напечатанной подписи', () => {
    const late: CeremonyEvents = { atlasReadyAt: 0, fontsReadyAt: 1.9 }
    expect(status(1.5, late, 'fonts')).toBe('wait')
    expect(status(1.89, late, 'fonts')).toBe('wait')
    expect(status(1.9, late, 'fonts')).toBe('ok')
    expect(status(2.4, late, 'glyphs')).toBe('ok')
  })

  it('событие до печати строки не ускоряет её', () => {
    const lines = getCeremonyState(.5, 'full', fast).bootLines
    // Подпись второй строки начнёт печататься позже, статус ждёт её окончания.
    expect(lines[1].visible).toBe(0)
    expect(lines[1].status).toBe('wait')
  })

  it('событие позже потолка и событие, которого нет, дают «позже»', () => {
    const slow: CeremonyEvents = { atlasReadyAt: 0, fontsReadyAt: BOOT_EVENT_CEILING + .5 }
    expect(status(BOOT_EVENT_CEILING - .01, slow, 'fonts')).toBe('wait')
    expect(status(BOOT_EVENT_CEILING, slow, 'fonts')).toBe('later')
    expect(status(3.9, slow, 'fonts')).toBe('later')
    expect(status(3.9, none, 'glyphs')).toBe('later')
    expect(status(1.9, none, 'language')).toBe('ok')
  })

  it('медленное событие не задерживает ни имя, ни меню', () => {
    for (const events of [fast, none, { atlasReadyAt: 0, fontsReadyAt: 99 }]) {
      for (const t of samples(4.2, .1)) {
        const a = getCeremonyState(t, 'full', events)
        const b = getCeremonyState(t, 'full', fast)
        expect(a.nameLetters).toEqual(b.nameLetters)
        expect(a.menuItems).toEqual(b.menuItems)
        expect(a.role).toBe(b.role)
        expect(a.done).toBe(b.done)
      }
    }
  })
})

describe('режим none и финальный кадр', () => {
  it('none — всё сразу в конце', () => {
    const state = getCeremonyState(0, 'none', none)
    expect(state).toEqual(getFinalState())
    expect(state.done).toBe(true)
    expect(state.menuItems).toEqual([1, 1, 1, 1, 1])
  })

  it('число букв и пунктов задаётся параметром', () => {
    const state = getCeremonyState(1, 'full', fast, { letters: 5, menu: 3 })
    expect(state.nameLetters).toHaveLength(5)
    expect(state.menuItems).toHaveLength(3)
    expect(getFinalState({ letters: 2, menu: 7 }).menuItems).toHaveLength(7)
  })
})

describe('ловцы', () => {
  const from = { x: 100, y: 20 }
  const to = { x: 300, y: 240 }

  it('стартуют в источнике, приходят в букву и гаснут на прилёте', () => {
    const start = getCatcherPose(0, from, to, 2)
    const end = getCatcherPose(1, from, to, 2)
    expect(start).toMatchObject({ x: 100, y: 20, scale: 1, opacity: 0 })
    expect(end).toMatchObject({ x: 300, y: 240, scale: 2, opacity: 0 })
    expect(getCatcherPose(.5, from, to, 2).opacity).toBe(1)
  })

  it('траектория зависит только от прогресса и непрерывна', () => {
    expect(getCatcherPose(.37, from, to, 2)).toEqual(getCatcherPose(.37, from, to, 2))
    for (let p = 0; p < 1; p += .01) {
      const a = getCatcherPose(p, from, to, 2)
      const b = getCatcherPose(p + .01, from, to, 2)
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(25)
    }
  })
})

describe('пропуск', () => {
  it('переводит к финальному кадру за SKIP_FADE, не позже 0,6 с', () => {
    expect(SKIP_FADE).toBeLessThanOrEqual(.6)
    const runner = createCeremonyRunner('full')
    runner.markAtlasReady()
    runner.advance(1.1)
    const before = runner.state()
    expect(before.done).toBe(false)
    runner.skip()
    expect(runner.phase).toBe('skipping')
    expect(runner.state().log.opacity).toBeCloseTo(before.log.opacity, 6)
    runner.advance(SKIP_FADE / 2)
    const middle = runner.state()
    expect(middle.menuItems[0]).toBeGreaterThan(before.menuItems[0])
    expect(middle.menuItems[0]).toBeLessThan(1)
    runner.advance(SKIP_FADE)
    expect(runner.phase).toBe('done')
    expect(runner.state()).toEqual(getFinalState())
    expect(runner.skipped).toBe(true)
  })

  it('смесь состояний монотонна и заканчивается финалом', () => {
    const from = getCeremonyState(1.2, 'full', fast)
    const to = getFinalState()
    let last = -1
    for (let k = 0; k <= 1; k += .1) {
      const mixed = blendCeremonyStates(from, to, k)
      expect(mixed.role).toBeGreaterThanOrEqual(last)
      last = mixed.role
    }
    expect(blendCeremonyStates(from, to, 1).done).toBe(true)
    expect(blendCeremonyStates(from, to, 1).menuItems).toEqual(to.menuItems)
  })

  it('повторный пропуск и пропуск после конца ничего не меняют', () => {
    const runner = createCeremonyRunner('short')
    runner.advance(5)
    expect(runner.phase).toBe('done')
    runner.skip()
    expect(runner.skipped).toBe(false)
    expect(runner.phase).toBe('done')
  })
})

describe('часы церемонии', () => {
  it('полная версия укладывается в 4,2 с при кадрах по 1/60 с', () => {
    const runner = createCeremonyRunner('full')
    let frames = 0
    while (runner.phase !== 'done') {
      runner.advance(1 / 60)
      frames++
    }
    expect(frames / 60).toBeGreaterThanOrEqual(4.2)
    expect(frames / 60).toBeLessThan(4.2 + 1 / 30)
  })

  it('события фиксируются один раз на текущем времени часов', () => {
    const runner = createCeremonyRunner('full')
    runner.markAtlasReady()
    runner.advance(1.3)
    runner.markFontsReady()
    runner.advance(.5)
    runner.markFontsReady()
    expect(runner.events).toEqual({ atlasReadyAt: 0, fontsReadyAt: 1.3 })
  })

  it('режим none сразу завершён', () => {
    const runner = createCeremonyRunner('none')
    expect(runner.phase).toBe('done')
    expect(runner.state().done).toBe(true)
  })
})
