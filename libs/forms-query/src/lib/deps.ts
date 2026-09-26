import type { FieldDeps } from '@letar/forms-core/uikit'

/** «Пусто» для зависимости — то же правило, что `isEmptyDepValue` в `forms-core`: `0` и `false` — значения */
function isEmptyDep(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/** `deps` для поля без `dependsOn` (поле передаёт `{}`; при вызове адаптера вручную аргумент можно опустить) */
export const NO_DEPS: FieldDeps = Object.freeze({})

/**
 * Родители «готовы» для запроса: своя `depsReady` из настроек адаптера либо «все значения `deps` непустые».
 * Поле передаёт в хук только `deps`, а не флаг готовности, поэтому адаптер судит сам — по тому же правилу по
 * умолчанию, что и поле (§18.2). Своя `depsReady` поля (проп) должна совпадать с настройкой адаптера.
 * Без зависимостей (`deps = {}`) — всегда готово.
 */
export function areQueryDepsReady<TDeps extends FieldDeps>(
  deps: TDeps,
  depsReady?: (deps: TDeps) => boolean,
): boolean {
  if (depsReady) {
    return depsReady(deps)
  }
  return Object.values(deps).every((value) => !isEmptyDep(value))
}
