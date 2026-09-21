/**
 * Guard-тест: порт приложения в `APP_PORTS` совпадает с реальным production-портом контейнера.
 *
 * Читает РЕАЛЬНЫЙ монорепо (не фикстуры) — смысл именно в этом: тест ловит дрейф, который
 * возникнет от правки compose-файла или Dockerfile, а не регрессию собственного парсинга.
 * Парсинг проверяется отдельно, в `app-ports-production.spec.ts`. Мотивация и список источников —
 * шапка `app-ports-production.ts`.
 *
 * Приватные submodule в CI не выкачиваются: приложения без `docker-compose.production.yml`
 * пропускаются, а не валят тест. Чтобы пропуск не превратился в молчаливую зелень, тест
 * требует минимум сверенных приложений (по образцу `app-ports.guard.spec.ts`).
 */
import { describe, expect, it } from 'vitest'
import { findWorkspaceRoot } from './app-ports'
import {
  collectProductionPortDeclarations,
  findProductionPortDrift,
  formatProductionPortDrift,
} from './app-ports-production'
import { APP_PORTS } from './index'

/**
 * Минимум приложений, у которых compose реально прочитан. Публичных приложений в `APP_PORTS`
 * восемь (остальные шесть — приватные submodule, отсутствующие в CI); порог ниже с запасом на
 * два, чтобы вывод одного-двух приложений из канона не ронял тест, а массовый пропуск — ронял.
 */
const MIN_VERIFIED_APPS = 6

const workspaceRoot = findWorkspaceRoot()
const { declarations, skipped } = collectProductionPortDeclarations(workspaceRoot, APP_PORTS)

describe('сверка APP_PORTS с production-контейнером', () => {
  it('compose-файлы вообще прочитаны (защита от молчаливо зелёного теста)', () => {
    expect(
      declarations.length,
      `\nСверено ${declarations.length} из ${Object.keys(APP_PORTS).length} приложений, `
        + `пропущено (нет compose-файла): ${skipped.join(', ') || '—'}\n`,
    ).toBeGreaterThanOrEqual(MIN_VERIFIED_APPS)
  })

  it('порт в APP_PORTS совпадает с traefik server.port, PORT в compose и ENV PORT в Dockerfile', () => {
    const drift = findProductionPortDrift(declarations)
    expect(
      drift,
      `\n${formatProductionPortDrift(drift)}\n\n`
        + 'Числовое значение APP_PORTS (libs/infra-config/src/index.ts) — порт production-контейнера.\n'
        + 'Если контейнер сменил порт, правь APP_PORTS вместе с потребителями (dashboard app-metrics,\n'
        + 'dashboard-agent app-registry); если разошлась запись в APP_PORTS — правь её.\n',
    ).toEqual([])
  })
})
