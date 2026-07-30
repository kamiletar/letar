/**
 * Структурированный прогресс деплоя (PLAN-INFRA.md §38 Этап 1/3) — парсинг фаз из лога
 * и watchdog залипания. Чистые функции без побочных эффектов на сторонние объекты,
 * вынесены из routes/deploy.ts (там же остаётся Fastify-обвязка и spawn).
 */

/** Одна фаза деплоя. `endedAt`/`ok`/`durationMs` отсутствуют пока фаза не завершилась. */
export interface DeployPhase {
  name: string
  startedAt: string
  endedAt?: string
  ok?: boolean
  durationMs?: number
}

// Маркер deploy-affected.sh: `::phase:build:start` / `::phase:build:ok` / `::phase:build:fail`
const PHASE_MARKER_RE = /^::phase:([a-z0-9-]+):(start|ok|fail)$/
// Уже существующие структурированные строки libs/deploy-engine (rollout.ts → cli.ts printRolloutStep):
// `✅ [wait-healthy] описание` / `❌ [smoke-test] описание — деталь`. Синхронный шаг —
// start и конец совпадают, durationMs изнутри rollout.ts не виден на этом уровне.
const ROLLOUT_STEP_RE = /^(✅|❌)\s\[([a-z0-9-]+)\]/

/** Мутирует массив фаз по одной строке лога. Экспортирована для unit-тестов —
 * чистая функция, без побочных эффектов кроме мутации переданного массива. */
export function applyPhaseLine(
  phases: DeployPhase[],
  line: string,
  now: () => string = () => new Date().toISOString(),
): void {
  const trimmed = line.trim()
  const marker = trimmed.match(PHASE_MARKER_RE)
  if (marker) {
    const name = marker[1] as string
    const state = marker[2] as 'start' | 'ok' | 'fail'
    if (state === 'start') {
      phases.push({ name, startedAt: now() })
      return
    }
    // ok/fail закрывает последнюю ОТКРЫТУЮ фазу с этим именем (на случай если в будущем
    // один и тот же phase-name встретится дважды за один деплой — маловероятно сегодня,
    // но безопаснее искать с конца, а не «первую попавшуюся»).
    for (let i = phases.length - 1; i >= 0; i--) {
      const phase = phases[i]
      if (phase && phase.name === name && phase.endedAt === undefined) {
        const endedAt = now()
        phase.endedAt = endedAt
        phase.ok = state === 'ok'
        phase.durationMs = Date.parse(endedAt) - Date.parse(phase.startedAt)
        return
      }
    }
    return
  }
  const step = trimmed.match(ROLLOUT_STEP_RE)
  if (step) {
    const icon = step[1]
    const name = step[2] as string
    const at = now()
    phases.push({ name, startedAt: at, endedAt: at, ok: icon === '✅', durationMs: 0 })
  }
}

/** Последняя фаза без `endedAt` — то, что сейчас идёт (для watchdog-порога, специфичного
 * для фазы). undefined, если фаз ещё не было или все уже закрыты. */
function currentOpenPhase(phases: DeployPhase[]): DeployPhase | undefined {
  for (let i = phases.length - 1; i >= 0; i--) {
    const phase = phases[i]
    if (phase && phase.endedAt === undefined) {
      return phase
    }
  }
  return undefined
}

// Порог молчания на фазу (§38 Этап 3): build легитимно молчит минутами (nx/docker build),
// nginx-reload — секунды. Ключ — имя фазы; для незнакомой/отсутствующей фазы — DEFAULT.
const STALL_THRESHOLD_MS: Record<string, number> = {
  build: 5 * 60 * 1000,
  rollout: 90 * 1000,
  'wait-healthy': 30 * 1000,
  'smoke-test': 15 * 1000,
  'nginx-reload': 10 * 1000,
}
const DEFAULT_STALL_THRESHOLD_MS = 30 * 1000

/** Минимум полей деплоя, нужный для оценки залипания — не весь `DeployStatus` (тот
 * остаётся в routes/deploy.ts, чтобы не тянуть его сюда ради трёх полей). */
export interface StalledCheckInput {
  running: boolean
  lastOutputAt?: string
  phases: DeployPhase[]
}

/** Оценивает залипание по порогу молчания, специфичному для текущей открытой фазы.
 * Только диагностика — НЕ убивает процесс (§38 «Чего делать НЕ надо»: ложное срабатывание
 * SIGTERM посреди `docker compose up` хуже пяти лишних минут ожидания). Экспортирована для тестов. */
export function computeStalled(
  deploy: StalledCheckInput,
  now: () => number = Date.now,
): { stalled: boolean; stalledSince?: string } {
  if (!deploy.running || !deploy.lastOutputAt) {
    return { stalled: false }
  }
  const phase = currentOpenPhase(deploy.phases)
  const threshold = phase ? (STALL_THRESHOLD_MS[phase.name] ?? DEFAULT_STALL_THRESHOLD_MS) : DEFAULT_STALL_THRESHOLD_MS
  const silentMs = now() - Date.parse(deploy.lastOutputAt)
  if (silentMs > threshold) {
    return { stalled: true, stalledSince: deploy.lastOutputAt }
  }
  return { stalled: false }
}
