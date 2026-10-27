import { describe, expect, it } from 'vitest'
import {
  blendCeremonyStates,
  BOOT_BAR_BLOCKS,
  BOOT_LINES,
  CEREMONY_PHASES,
  createCeremonyRunner,
  formatBootBar,
  getCatcherPose,
  getCeremonyState,
  getFinalState,
  getPhases,
  getTotalDuration,
  SKIP_FADE,
} from './entry-ceremony'

const samples = (end: number, step = .02) => Array.from({ length: Math.round(end / step) + 1 }, (_, i) => i * step)
const phase = (id: string, mode: 'full' | 'short' = 'full') => {
  const found = getPhases(mode).find((item) => item.id === id)
  if (!found) { throw new Error(`нет фазы ${id}`) }
  return found
}

describe('таблица фаз', () => {
  it('загрузка длится 3 с (середина ориентира 2,5–3,5 с по замеру studio), полная версия — 5,6 с, короткая — 1,5 с', () => {
    expect(phase('boot').duration).toBeCloseTo(3, 6)
    expect(getTotalDuration('full')).toBeCloseTo(5.6, 6)
    expect(getTotalDuration('short')).toBeCloseTo(1.5, 6)
    expect(getTotalDuration('none')).toBe(0)
  })

  it('сборка имени ~1 с, роль ~0,6 с, меню ~0,6 с', () => {
    expect(phase('assemble').duration).toBeCloseTo(1, 6)
    expect(phase('role').duration).toBeCloseTo(.6, 6)
    expect(phase('menu').duration).toBeCloseTo(.6, 6)
  })

  it('фазы идут встык без пересечений и пропусков', () => {
    for (const phases of Object.values(CEREMONY_PHASES)) {
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].start).toBeCloseTo(phases[i - 1].start + phases[i - 1].duration, 6)
      }
    }
  })

  it('короткая версия не содержит boot-лога', () => {
    expect(CEREMONY_PHASES.short.some((item) => item.id === 'boot')).toBe(false)
    for (const t of samples(1.5)) {
      const state = getCeremonyState(t, 'short')
      expect(state.bootLines).toEqual([])
      expect(state.log.opacity).toBe(0)
      expect(state.bootProgress).toBe(0)
    }
  })
})

describe('getCeremonyState', () => {
  it('в нуле ничего не видно, в конце — финальный кадр', () => {
    const start = getCeremonyState(0, 'full')
    expect(start.nameLetters.every((v) => v === 0)).toBe(true)
    expect(start.menuItems.every((v) => v === 0)).toBe(true)
    expect(start.role).toBe(0)
    expect(start.calm).toBe(0)
    expect(start.corner).toBe(0)
    expect(start.done).toBe(false)

    const end = getCeremonyState(getTotalDuration('full'), 'full')
    expect(end.done).toBe(true)
    expect(end.nameLetters.every((v) => v === 1)).toBe(true)
    expect(end.menuItems.every((v) => v === 1)).toBe(true)
    expect(end.role).toBe(1)
    expect(end.calm).toBe(1)
    expect(end.corner).toBe(1)
    expect(end.log.opacity).toBe(0)
  })

  it('все значения монотонны во времени (кроме присутствия лога)', () => {
    for (const mode of ['full', 'short'] as const) {
      let previous = getCeremonyState(0, mode)
      for (const t of samples(getTotalDuration(mode) + .3).slice(1)) {
        const state = getCeremonyState(t, mode)
        const pairs: [number[], number[]][] = [
          [previous.nameLetters, state.nameLetters],
          [previous.catchers, state.catchers],
          [previous.menuItems, state.menuItems],
          [[previous.role, previous.calm, previous.corner], [state.role, state.calm, state.corner]],
          [previous.bootLines.map((l) => l.visible), state.bootLines.map((l) => l.visible)],
          [[previous.bootProgress], [state.bootProgress]],
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
      let previous = getCeremonyState(0, mode)
      for (let t = frame; t <= getTotalDuration(mode); t += frame) {
        const state = getCeremonyState(t, mode)
        const pairs = [
          ...state.nameLetters.map((v, i) => [previous.nameLetters[i], v]),
          ...state.catchers.map((v, i) => [previous.catchers[i], v]),
          ...state.menuItems.map((v, i) => [previous.menuItems[i], v]),
          [previous.role, state.role],
          [previous.calm, state.calm],
          [previous.corner, state.corner],
          [previous.log.opacity, state.log.opacity],
        ]
        for (const [a, b] of pairs) { expect(Math.abs(b - a)).toBeLessThan(.4) }
        previous = state
      }
    }
  })

  it('буквы собираются слева направо, затем роль, затем меню по очереди', () => {
    const assemble = phase('assemble')
    const role = phase('role')
    const menuPhase = phase('menu')
    const state = (t: number) => getCeremonyState(t, 'full')
    const s = state(assemble.start + .5)
    expect(s.catchers[0]).toBe(1)
    expect(s.catchers[3]).toBe(0)
    expect(s.nameLetters[0]).toBe(1)
    expect(state(assemble.start + assemble.duration + .15).nameLetters.every((v) => v > .9)).toBe(true)
    expect(state(role.start + role.duration / 2).role).toBeCloseTo(.5, 2)
    const menu = state(menuPhase.start + .1).menuItems
    for (let i = 1; i < menu.length; i++) { expect(menu[i]).toBeLessThanOrEqual(menu[i - 1]) }
    expect(menu[0]).toBeGreaterThan(0)
  })

  it('значки в углу проявляются вместе с меню, не раньше', () => {
    const menuPhase = phase('menu')
    expect(getCeremonyState(menuPhase.start - .01, 'full').corner).toBe(0)
    expect(getCeremonyState(menuPhase.start + menuPhase.duration / 2, 'full').corner).toBeGreaterThan(0)
    expect(getCeremonyState(menuPhase.start + menuPhase.duration, 'full').corner).toBe(1)
  })

  it('лог печатается в boot-фазе и гаснет вверх при сборке имени', () => {
    const boot = phase('boot')
    const assemble = phase('assemble')
    expect(getCeremonyState(boot.start - .1, 'full').log.opacity).toBe(0)
    expect(getCeremonyState(boot.start + .2, 'full').log.opacity).toBe(1)
    expect(getCeremonyState(boot.start + 1.5, 'full').log.opacity).toBe(1)
    const mid = getCeremonyState(assemble.start + assemble.duration / 2, 'full').log
    expect(mid.opacity).toBeGreaterThan(0)
    expect(mid.opacity).toBeLessThan(1)
    expect(getCeremonyState(assemble.start + assemble.duration, 'full').log).toEqual({ opacity: 0, leave: 1 })
    // Строки идут по порядку: каждая следующая начинает печататься не раньше предыдущей.
    const lines = getCeremonyState(boot.start + 1.2, 'full').bootLines
    expect(lines.map((l) => l.key)).toEqual(BOOT_LINES.map((l) => l.key))
    for (let i = 1; i < lines.length; i++) { expect(lines[i].visible).toBeLessThanOrEqual(lines[i - 1].visible) }
  })
})

describe('синтетический boot-лог (решение владельца 2026-10-27)', () => {
  const boot = phase('boot')
  const lines = (elapsed: number) => getCeremonyState(elapsed, 'full').bootLines
  const status = (elapsed: number, key: string) => lines(elapsed).find((l) => l.key === key)?.status

  it('в сценарии семь строк, и только первая — заголовок без статуса', () => {
    expect(BOOT_LINES).toHaveLength(7)
    expect(BOOT_LINES.filter((line) => !line.status).map((line) => line.key)).toEqual(['os'])
  })

  it('статуса «позже» нет: у строки только «ждёт» и «ok»', () => {
    for (const t of samples(getTotalDuration('full'), .05)) {
      for (const line of lines(t)) { expect(['wait', 'ok']).toContain(line.status) }
    }
  })

  it('первая строка начинает печататься в начале boot, последняя «ok» ставится ровно к его концу', () => {
    expect(lines(boot.start - .01)[0].visible).toBe(0)
    expect(lines(boot.start + .05)[0].visible).toBeGreaterThan(0)
    const last = BOOT_LINES[BOOT_LINES.length - 1].key
    expect(status(boot.start + boot.duration - .02, last)).toBe('wait')
    expect(status(boot.start + boot.duration, last)).toBe('ok')
  })

  it('расписание одно и то же всегда: на модель не влияет ничего, кроме времени', () => {
    for (const t of samples(getTotalDuration('full'), .1)) {
      expect(getCeremonyState(t, 'full')).toEqual(getCeremonyState(t, 'full'))
    }
    // «ok» всегда позже окончания печати строки и никогда не раньше.
    for (const line of BOOT_LINES.filter((item) => item.status)) {
      const early = lines(boot.start + boot.duration / 2).find((l) => l.key === line.key)
      if (early && early.visible < 1) { expect(early.status).toBe('wait') }
    }
  })

  it('темп выдержанный: строки стартуют с шагом 0,3–0,6 с', () => {
    const startedAt = BOOT_LINES.map((_, index) => {
      const at = samples(boot.start + boot.duration, .005).find((t) => (lines(t)[index]?.visible ?? 0) > 0)
      return at ?? NaN
    })
    for (let i = 1; i < startedAt.length; i++) {
      const gap = startedAt[i] - startedAt[i - 1]
      expect(gap).toBeGreaterThan(.3)
      expect(gap).toBeLessThan(.6)
    }
  })

  it('имя и меню от лога не зависят: сборка начинается ровно после boot', () => {
    expect(phase('assemble').start).toBeCloseTo(boot.start + boot.duration, 6)
    expect(getCeremonyState(boot.start + boot.duration - .01, 'full').nameLetters.every((v) => v === 0)).toBe(true)
  })

  it('полоса прогресса идёт по времени от 0 до 1 только в boot', () => {
    expect(getCeremonyState(boot.start, 'full').bootProgress).toBe(0)
    expect(getCeremonyState(boot.start + boot.duration / 2, 'full').bootProgress).toBeCloseTo(.5, 2)
    expect(getCeremonyState(boot.start + boot.duration, 'full').bootProgress).toBe(1)
  })

  it('полоса печатается блоками █░ и процентом', () => {
    expect(formatBootBar(0)).toBe(`[${'░'.repeat(BOOT_BAR_BLOCKS)}] 0%`)
    expect(formatBootBar(1)).toBe(`[${'█'.repeat(BOOT_BAR_BLOCKS)}] 100%`)
    expect(formatBootBar(.5)).toBe(`[${'█'.repeat(BOOT_BAR_BLOCKS / 2)}${'░'.repeat(BOOT_BAR_BLOCKS / 2)}] 50%`)
  })
})

describe('режим none и финальный кадр', () => {
  it('none — всё сразу в конце', () => {
    const state = getCeremonyState(0, 'none')
    expect(state).toEqual(getFinalState())
    expect(state.done).toBe(true)
    expect(state.menuItems).toEqual([1, 1, 1, 1, 1])
  })

  it('число букв и пунктов задаётся параметром', () => {
    const state = getCeremonyState(1, 'full', { letters: 5, menu: 3 })
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
    const from = getCeremonyState(1.2, 'full')
    const to = getFinalState()
    let last = -1
    for (let k = 0; k <= 1; k += .1) {
      const mixed = blendCeremonyStates(from, to, k)
      expect(mixed.role).toBeGreaterThanOrEqual(last)
      last = mixed.role
    }
    expect(blendCeremonyStates(from, to, 1).done).toBe(true)
    expect(blendCeremonyStates(from, to, 1).menuItems).toEqual(to.menuItems)
    expect(blendCeremonyStates(from, to, 1).corner).toBe(1)
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

describe('экран языка', () => {
  it('без параметра экрана языка нет: часы идут сразу', () => {
    const runner = createCeremonyRunner('full')
    expect(runner.phase).toBe('running')
    expect(runner.awaitingLanguage).toBe(false)
  })

  it('с экраном языка часы стоят, пока выбор не сделан: время не идёт, всё скрыто', () => {
    const runner = createCeremonyRunner('full', undefined, { language: true })
    expect(runner.phase).toBe('language')
    expect(runner.awaitingLanguage).toBe(true)
    runner.advance(10)
    expect(runner.elapsed).toBe(0)
    const state = runner.state()
    expect(state.done).toBe(false)
    expect(state.nameLetters.every((v) => v === 0)).toBe(true)
    expect(state.menuItems.every((v) => v === 0)).toBe(true)
    expect(state.corner).toBe(0)
    expect(state.log.opacity).toBe(0)
  })

  it('выбор языка запускает часы: дальше загрузка с нуля, экран языка не возвращается', () => {
    const runner = createCeremonyRunner('full', undefined, { language: true })
    runner.advance(3)
    runner.confirmLanguage()
    expect(runner.phase).toBe('running')
    expect(runner.awaitingLanguage).toBe(false)
    runner.advance(phase('boot').start + .5)
    expect(runner.state().bootLines[0].visible).toBeGreaterThan(0)
    runner.confirmLanguage()
    expect(runner.elapsed).toBeCloseTo(phase('boot').start + .5, 6)
  })

  it('выбор языка не нужен в короткой версии и режиме none', () => {
    expect(createCeremonyRunner('short', undefined, { language: true }).phase).toBe('running')
    expect(createCeremonyRunner('none', undefined, { language: true }).phase).toBe('done')
  })

  it('Escape на экране языка пропускает весь вход к финалу', () => {
    const runner = createCeremonyRunner('full', undefined, { language: true })
    runner.skip()
    expect(runner.phase).toBe('skipping')
    expect(runner.awaitingLanguage).toBe(false)
    runner.advance(SKIP_FADE)
    expect(runner.phase).toBe('done')
    expect(runner.state()).toEqual(getFinalState())
    expect(runner.skipped).toBe(true)
  })
})

describe('часы церемонии', () => {
  it('полная версия укладывается в 5,6 с при кадрах по 1/60 с', () => {
    const runner = createCeremonyRunner('full')
    let frames = 0
    while (runner.phase !== 'done') {
      runner.advance(1 / 60)
      frames++
    }
    expect(frames / 60).toBeGreaterThanOrEqual(5.6)
    expect(frames / 60).toBeLessThan(5.6 + 1 / 30)
  })

  it('короткая версия не длиннее 1,6 с', () => {
    const runner = createCeremonyRunner('short')
    let frames = 0
    while (runner.phase !== 'done') {
      runner.advance(1 / 60)
      frames++
    }
    expect(frames / 60).toBeLessThanOrEqual(1.6)
  })

  it('режим none сразу завершён', () => {
    const runner = createCeremonyRunner('none')
    expect(runner.phase).toBe('done')
    expect(runner.state().done).toBe(true)
  })
})
