/**
 * Что писать в `.last-e2e-status/<app>.json` по итогу e2e-прогона — файл читает прод-гейт
 * `evaluateE2eGate` в `libs/deploy-mcp`.
 *
 * Инцидент 2026-09-23 (domwellbes): точечный `run_e2e` (`grep` + `project`) записал
 * `passed: true` в тот же файл, что и полный прогон. Гейт не отличал один прошедший тест от
 * всего набора и пропустил бы прод-деплой на совпавшем коммите.
 *
 * Правило: фильтрованный прогон (`grep` или `project`) может статус гейта только ухудшить.
 * Зелёный — не пишется вовсе (остаётся статус последнего полного прогона), красный — пишется
 * `passed: false` с пометкой фильтров: упавший тест на этом коммите — достаточный повод
 * отказать в деплое. `workers` на полноту набора не влияет и фильтром не считается.
 */

/** Фильтры прогона, от которых зависит полнота набора тестов. */
export interface E2eRunScope {
  project?: string
  grep?: string
  workers?: number
}

/** Персистентный результат прогона — читает e2e-гейт в deploy-mcp. */
export interface LastE2eStatus {
  commitSha: string
  passed: boolean
  timestamp: string
  durationMs: number
  /**
   * true — статус записан прогоном с `grep`/`project` (всегда `passed: false`, см. выше).
   * Отсутствует в файлах, записанных до 2026-09-23, — гейт читает это как полный прогон.
   */
  filtered?: boolean
  project?: string
  grep?: string
}

/** Прогон шёл не по всему набору: задан `grep` или `project`. */
export function isFilteredRun(scope: E2eRunScope): boolean {
  return Boolean(scope.grep) || Boolean(scope.project)
}

/** Человекочитаемый список фильтров для логов прогона. */
export function describeRunScope(scope: E2eRunScope): string {
  return [scope.project ? `project=${scope.project}` : '', scope.grep ? `grep=${scope.grep}` : '']
    .filter(Boolean)
    .join(', ')
}

/**
 * Статус для записи в файл гейта или `null`, если файл трогать нельзя (фильтрованный зелёный
 * прогон — ничего не доказывает про весь набор).
 */
export function buildLastStatusUpdate(input: {
  commitSha: string
  passed: boolean
  timestamp: string
  durationMs: number
  scope: E2eRunScope
}): LastE2eStatus | null {
  const { scope, ...status } = input
  if (!isFilteredRun(scope)) {
    return { ...status, filtered: false }
  }
  if (status.passed) {
    return null
  }
  return {
    ...status,
    filtered: true,
    ...(scope.project ? { project: scope.project } : {}),
    ...(scope.grep ? { grep: scope.grep } : {}),
  }
}
