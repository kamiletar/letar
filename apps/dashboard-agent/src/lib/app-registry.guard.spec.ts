/**
 * Guard-тест: локальная копия портов в `app-registry.ts` НЕ должна расходиться со значениями
 * канона `@letar/infra-config`. Дрейф значений (не набора приложений — тот у dashboard-agent
 * свой) ловится здесь, а не в проде.
 *
 * Тот же паттерн, что и `server-config.guard.spec.ts` рядом — см. его заголовок за объяснением,
 * почему это копия, а не прямой импорт.
 */

import { describe, expect, it } from 'vitest'
// eslint-disable-next-line @nx/enforce-module-boundaries -- см. server-config.guard.spec.ts
import { APP_HOSTS as CANON_APP_HOSTS, APP_PORTS as CANON_APP_PORTS } from '../../../../libs/infra-config/src/index'
import { APP_HOSTS, APP_PORTS } from './app-registry'

describe('app-registry — синхронизация портов с @letar/infra-config', () => {
  it('каждый порт локальной копии совпадает с каноном', () => {
    for (const [app, port] of Object.entries(APP_PORTS)) {
      expect(CANON_APP_PORTS[app], `порт "${app}" отсутствует в каноне`).toBeDefined()
      expect(port).toBe(CANON_APP_PORTS[app])
    }
  })

  it('каждый дефолтный host локальной копии совпадает с каноном (без учёта env-override)', () => {
    for (const [app, host] of Object.entries(APP_HOSTS)) {
      if (app === 'dashboard-agent') {
        continue // self-reference на 'localhost', в каноне — имя контейнера
      }
      expect(CANON_APP_HOSTS[app], `host "${app}" отсутствует в каноне`).toBeDefined()
      expect(host).toBe(CANON_APP_HOSTS[app])
    }
  })
})
