/**
 * Модель церемонии входа на главную (KM-030, KM-039). Чистые функции без DOM: одно место, где задано,
 * что видно в каждый момент. Тесты, DOM-слой и Canvas читают одно и то же состояние.
 *
 * Загрузка синтетическая намеренно (решение владельца 2026-10-27): строки лога идут по расписанию
 * с выдержанным темпом и не зависят от реальных событий. Слишком быстрая загрузка обесценивает работу.
 */

export type EntryMode = 'full' | 'short' | 'none'
export type PhaseId = 'flow' | 'boot' | 'assemble' | 'role' | 'menu'

export interface CeremonyPhase {
  id: PhaseId
  /** Начало фазы, с. */
  start: number
  /** Длительность фазы, с. */
  duration: number
}

/**
 * Фазы задаются таблицей, а не константами в коде: портрет из букв (KM-019) вставит фазу
 * `portrait` между `boot` и `assemble` и сдвинет остальные, не переписывая модель.
 */
export const CEREMONY_PHASES: Record<'full' | 'short', readonly CeremonyPhase[]> = {
  full: [
    { id: 'flow', start: 0, duration: .4 },
    // 3 с — середина ориентира 2,5–3,5 с по замеру загрузки studio (2,0 с + пауза 0,28 с).
    { id: 'boot', start: .4, duration: 3 },
    { id: 'assemble', start: 3.4, duration: 1 },
    { id: 'role', start: 4.4, duration: .6 },
    { id: 'menu', start: 5, duration: .6 },
  ],
  short: [
    { id: 'flow', start: 0, duration: .4 },
    { id: 'assemble', start: .4, duration: .5 },
    { id: 'role', start: .9, duration: .2 },
    { id: 'menu', start: 1.1, duration: .4 },
  ],
}

/** Полёт одного «ловца» к букве имени, с. */
const FLIGHT: Record<'full' | 'short', number> = { full: .25, short: .2 }
/** Длительность полёта одного ловца, с; по ней находят момент старта полёта по его прогрессу. */
export const getFlightDuration = (mode: EntryMode) => (mode === 'short' ? FLIGHT.short : FLIGHT.full)
/** Проявление буквы после прилёта ловца, с. */
const LETTER_REVEAL = .12
/** Шаг между пунктами меню, с. */
export const MENU_STEP = .06
/** Печать подписи строки лога, с. */
const LINE_TYPE = .3
/** Пауза между напечатанной подписью и статусом `ok`, с. */
const OK_DELAY = .25
/** Длительность плавного перехода к финальному кадру при пропуске, с (бюджет приёмки — 0,6 с). */
export const SKIP_FADE = .4
/** Число блоков в полосе загрузки. */
export const BOOT_BAR_BLOCKS = 24

/**
 * Строки boot-лога. Тексты живут в `messages/*.json`, namespace `home.boot`. `status` — есть ли у строки
 * точки и `ok`; заголовок `kami.os` остаётся голой подписью.
 */
export const BOOT_LINES: readonly { key: string; status: boolean }[] = [
  { key: 'os', status: false },
  { key: 'glyphs', status: true },
  { key: 'fonts', status: true },
  { key: 'language', status: true },
  { key: 'theme', status: true },
  { key: 'rain', status: true },
  { key: 'menu', status: true },
]

export interface CeremonyCounts {
  letters: number
  menu: number
}
const DEFAULT_COUNTS: CeremonyCounts = { letters: 4, menu: 5 }

export type BootStatus = 'wait' | 'ok'

export interface CeremonyState {
  /** Подпись напечатана на долю `visible`; `ok` появляется по расписанию, а не по событию. */
  bootLines: { key: string; visible: number; status: BootStatus }[]
  /** Доля полосы загрузки, 0..1: идёт по времени boot-фазы. */
  bootProgress: number
  /** Присутствие лога: 1 — виден, 0 — погас. `leave` — доля ухода вверх. */
  log: { opacity: number; leave: number }
  /** Прогресс полёта ловца к каждой букве имени, 0..1. */
  catchers: number[]
  /** Проявление каждой буквы имени, 0..1. */
  nameLetters: number[]
  /** Доля напечатанных символов роли. */
  role: number
  menuItems: number[]
  /** Успокоение фона вокруг меню, 0..1 (вход фона из KM-017). */
  calm: number
  /** Проявление значков в углу, 0..1: вместе с меню. */
  corner: number
  done: boolean
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}

/** Фазы режима; для `none` фаз нет. */
export function getPhases(mode: EntryMode): readonly CeremonyPhase[] {
  return mode === 'none' ? [] : CEREMONY_PHASES[mode]
}

export function getTotalDuration(mode: EntryMode) {
  return getPhases(mode).reduce((end, phase) => Math.max(end, phase.start + phase.duration), 0)
}

function phaseOf(mode: EntryMode, id: PhaseId) {
  return getPhases(mode).find((phase) => phase.id === id)
}

/** Состояние, к которому всё приходит в конце (и сразу при `none`). */
export function getFinalState(counts: CeremonyCounts = DEFAULT_COUNTS): CeremonyState {
  return {
    bootLines: [],
    bootProgress: 0,
    log: { opacity: 0, leave: 1 },
    catchers: Array.from({ length: counts.letters }, () => 1),
    nameLetters: Array.from({ length: counts.letters }, () => 1),
    role: 1,
    menuItems: Array.from({ length: counts.menu }, () => 1),
    calm: 1,
    corner: 1,
    done: true,
  }
}

/** Полоса загрузки `[████░░░░] 50%`: блоки и процент считаются из одной доли. */
export function formatBootBar(progress: number) {
  const value = clamp(progress)
  const filled = Math.round(value * BOOT_BAR_BLOCKS)
  return `[${'█'.repeat(filled)}${'░'.repeat(BOOT_BAR_BLOCKS - filled)}] ${Math.round(value * 100)}%`
}

/** Состояние каждого слоя в момент `elapsed`; одна функция — один источник правды для тестов. */
export function getCeremonyState(
  elapsed: number,
  mode: EntryMode,
  counts: CeremonyCounts = DEFAULT_COUNTS,
): CeremonyState {
  if (mode === 'none') { return getFinalState(counts) }
  const total = getTotalDuration(mode)
  const done = elapsed >= total
  const boot = phaseOf(mode, 'boot')
  const assemble = phaseOf(mode, 'assemble')
  const role = phaseOf(mode, 'role')
  const menu = phaseOf(mode, 'menu')
  const flight = FLIGHT[mode]

  const bootLines: CeremonyState['bootLines'] = []
  if (boot) {
    const count = BOOT_LINES.length
    // Последняя строка получает `ok` ровно к концу boot-фазы: расписание делит остаток поровну.
    const gap = (boot.duration - LINE_TYPE - OK_DELAY) / Math.max(1, count - 1)
    BOOT_LINES.forEach((line, index) => {
      const planned = boot.start + index * gap
      const okAt = planned + LINE_TYPE + OK_DELAY
      bootLines.push({
        key: line.key,
        visible: clamp((elapsed - planned) / LINE_TYPE),
        status: line.status && elapsed + 1e-9 >= okAt ? 'ok' : 'wait',
      })
    })
  }

  const leave = assemble ? smooth((elapsed - assemble.start) / assemble.duration) : 1
  const logOpacity = boot ? smooth((elapsed - boot.start) / .08) * (1 - leave) : 0

  const catchers: number[] = []
  const nameLetters: number[] = []
  for (let i = 0; i < counts.letters; i++) {
    if (!assemble) {
      catchers.push(1)
      nameLetters.push(1)
      continue
    }
    const stagger = counts.letters > 1 ? (assemble.duration - flight) / (counts.letters - 1) : 0
    const begin = assemble.start + i * stagger
    catchers.push(clamp((elapsed - begin) / flight))
    nameLetters.push(smooth((elapsed - begin - flight) / LETTER_REVEAL))
  }

  const itemDuration = menu ? Math.max(.05, menu.duration - (counts.menu - 1) * MENU_STEP) : 1
  const menuItems = Array.from(
    { length: counts.menu },
    (_, i) => menu ? smooth((elapsed - menu.start - i * MENU_STEP) / itemDuration) : 1,
  )
  const menuProgress = menu ? smooth((elapsed - menu.start) / menu.duration) : 1

  return {
    bootLines,
    bootProgress: boot ? clamp((elapsed - boot.start) / boot.duration) : 0,
    log: { opacity: logOpacity, leave },
    catchers,
    nameLetters,
    role: role ? clamp((elapsed - role.start) / role.duration) : 1,
    menuItems,
    calm: menuProgress,
    corner: menuProgress,
    done,
  }
}

const mixNumber = (from: number, to: number, k: number) => from + (to - from) * k
const mixList = (from: number[], to: number[], k: number) => to.map((value, i) => mixNumber(from[i] ?? value, value, k))

/** Плавный переход от состояния в момент пропуска к финальному кадру; лог гаснет, а не печатается дальше. */
export function blendCeremonyStates(from: CeremonyState, to: CeremonyState, k: number): CeremonyState {
  const x = clamp(k)
  return {
    bootLines: from.bootLines,
    bootProgress: from.bootProgress,
    log: { opacity: mixNumber(from.log.opacity, to.log.opacity, x), leave: mixNumber(from.log.leave, to.log.leave, x) },
    catchers: mixList(from.catchers, to.catchers, x),
    nameLetters: mixList(from.nameLetters, to.nameLetters, x),
    role: mixNumber(from.role, to.role, x),
    menuItems: mixList(from.menuItems, to.menuItems, x),
    calm: mixNumber(from.calm, to.calm, x),
    corner: mixNumber(from.corner, to.corner, x),
    done: x >= 1,
  }
}

export interface CatcherPose {
  x: number
  y: number
  scale: number
  opacity: number
}

/**
 * Положение ловца при прогрессе полёта 0..1. Траектория — функция только прогресса и точек,
 * без накопления состояния: перемотка и пропуск кадров ничего не ломают.
 */
export function getCatcherPose(
  progress: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  endScale: number,
): CatcherPose {
  const p = clamp(progress)
  const e = smooth(p)
  // Небольшая дуга: поток падает сверху, глиф заходит на букву по кривой.
  const arc = Math.sin(Math.PI * p) * 28 * (to.x >= from.x ? 1 : -1)
  return {
    x: mixNumber(from.x, to.x, e) + arc,
    y: mixNumber(from.y, to.y, e),
    scale: mixNumber(1, endScale, e),
    opacity: smooth(p / .12) * (1 - smooth((p - .88) / .12)),
  }
}

/** `language` — экран выбора языка: часы стоят, пока посетитель не выберет язык. */
export type RunnerPhase = 'language' | 'running' | 'skipping' | 'done'

export interface RunnerOptions {
  /** Показать экран выбора языка перед загрузкой; только для полной версии. */
  language?: boolean
}

/** Часы церемонии: продвигаются по кадрам, принимают выбор языка и пропуск. Без DOM — проверяется тестами. */
export function createCeremonyRunner(
  mode: EntryMode,
  counts: CeremonyCounts = DEFAULT_COUNTS,
  options: RunnerOptions = {},
) {
  let elapsed = 0
  let skipClock = 0
  let skipFrom: CeremonyState | null = null
  let phase: RunnerPhase = mode === 'none' ? 'done' : options.language && mode === 'full' ? 'language' : 'running'
  let skipped = false

  const current = (): CeremonyState => {
    if (phase === 'done') { return getFinalState(counts) }
    if (skipFrom) {
      return blendCeremonyStates(skipFrom, getFinalState(counts), smooth(skipClock / SKIP_FADE))
    }
    return getCeremonyState(elapsed, mode, counts)
  }

  return {
    mode,
    get phase() {
      return phase
    },
    get awaitingLanguage() {
      return phase === 'language'
    },
    get elapsed() {
      return elapsed
    },
    get skipped() {
      return skipped
    },
    /**
     * Время для проявления потоков фона (KM-017): при пропуске идёт быстрее, чтобы к концу
     * перехода потоки были полностью видны, а не замирали на середине проявления.
     */
    get revealElapsed() {
      if (phase === 'done') { return Infinity }
      return skipFrom ? elapsed + skipClock * 6 : elapsed
    },
    state: current,
    /** Язык выбран: загрузка начинается с нуля. Вне экрана языка ничего не делает. */
    confirmLanguage() {
      if (phase === 'language') { phase = 'running' }
    },
    /** Продвинуть часы на `delta` секунд; на экране языка время стоит, в пропуске идёт отдельный отсчёт. */
    advance(delta: number) {
      if (phase === 'running') {
        elapsed += delta
        if (elapsed >= getTotalDuration(mode)) { phase = 'done' }
      } else if (phase === 'skipping') {
        skipClock += delta
        if (skipClock >= SKIP_FADE) { phase = 'done' }
      }
    },
    /** Пропуск: из текущего кадра плавно к финальному за `SKIP_FADE`; работает и на экране языка. */
    skip() {
      if (phase !== 'running' && phase !== 'language') { return }
      skipFrom = current()
      skipClock = 0
      skipped = true
      phase = 'skipping'
    },
    /** Мгновенный финал без перехода (смена маршрута, reduced-motion). */
    finish() {
      phase = 'done'
    },
  }
}

export type CeremonyRunner = ReturnType<typeof createCeremonyRunner>
