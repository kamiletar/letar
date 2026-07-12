import type { Container } from './types'

/**
 * Резолвит контейнер по имени: точное совпадение (`container_name` в compose) ИЛИ
 * `<name>-N` с числовым суффиксом (дефолтная нумерация docker compose, когда
 * `container_name` убран — см. PLAN.md §18.6 rollout: без него контейнер называется
 * `<project>-app-1`/`<project>-app-2`). Числовой суффикс (не любой префикс) исключает
 * ложные срабатывания на несвязанных контейнерах вроде `<name>-worker`.
 * При нескольких совпадениях (rollout: пока жива и старая, и новая реплика) берёт первый по
 * алфавиту — детерминированно `-1` раньше `-2`.
 */
export function findContainerByName(containers: Container[], name: string): Container | undefined {
  const matchesExact = (n: string) => n === `/${name}` || n === name
  const exact = containers.find((c) => c.name === name || c.names?.some(matchesExact))
  if (exact) {
    return exact
  }

  const suffixPattern = new RegExp(`^/?${escapeRegExp(name)}-\\d+$`)
  const matchesSuffixed = (n: string) => suffixPattern.test(n)
  const suffixed = containers
    .filter((c) => (c.name && suffixPattern.test(c.name)) || c.names?.some(matchesSuffixed))
    .sort((a, b) => (a.name ?? a.names?.[0] ?? '').localeCompare(b.name ?? b.names?.[0] ?? ''))

  return suffixed[0]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
