/**
 * Guard-тест: локальная копия `server-config.ts` НЕ должна расходиться с каноном
 * `@letar/infra-config`.
 *
 * Почему копия, а не импорт: `Dockerfile.production` dashboard-agent изолирован от
 * монорепо — при сборке копируется только `apps/dashboard-agent/{package.json,src,tsconfig}`,
 * `libs/` в контекст не попадает. Прямой импорт `@letar/infra-config` (workspace-пакет)
 * сломал бы `bun install`/`bun build` внутри контейнера. Поэтому маппинг продублирован
 * локально, а этот тест ловит дрейф на `nx test dashboard-agent` (локально + в CI).
 *
 * Канон импортируется ОТНОСИТЕЛЬНЫМ путём намеренно: spec-файлы исключены из
 * `bun build` (не reachable из index.ts) и из `tsconfig.json` (exclude), поэтому эта
 * зависимость на libs/ живёт только в тестовой среде и не протекает в Docker-артефакт.
 */

import { describe, expect, it } from 'vitest'
// Относительный импорт в чужой проект намеренно нарушает Nx-границы: dashboard-agent
// НЕ объявляет @letar/infra-config зависимостью в package.json (это сломало бы
// изолированный Docker-сборкой `bun install`, см. заголовок файла). Канон доступен
// только тестовой среде через относительный путь; в Docker-артефакт spec не попадает.
// eslint-disable-next-line @nx/enforce-module-boundaries -- см. комментарий выше
import {
  getServerForApp as canonGetServerForApp,
  SERVER_APPS as CANON_SERVER_APPS,
} from '../../../../libs/infra-config/src/index'
import { getServerForApp, SERVER_APPS } from './server-config'

describe('server-config — синхронизация с @letar/infra-config', () => {
  it('SERVER_APPS идентичен канону (тот же набор ключей и значений)', () => {
    expect(SERVER_APPS).toEqual(CANON_SERVER_APPS)
  })

  it('getServerForApp даёт тот же результат, что и канон, для всех приложений', () => {
    for (const app of Object.keys(CANON_SERVER_APPS)) {
      expect(getServerForApp(app)).toBe(canonGetServerForApp(app))
    }
  })

  it('getServerForApp для неизвестного приложения совпадает с каноном (fallback s2)', () => {
    expect(getServerForApp('__nonexistent__')).toBe(canonGetServerForApp('__nonexistent__'))
    expect(getServerForApp('__nonexistent__')).toBe('s2')
  })

  it('s3 не входит в production-маппинг (это staging-раннер, не сервер приложений)', () => {
    expect(Object.values(SERVER_APPS)).not.toContain('s3')
  })
})
