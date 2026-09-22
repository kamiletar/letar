import { describe, expect, it } from 'vitest'
import {
  APP_PORTS,
  BUILD_ON_S1_APPS,
  E2E_GATED_APPS,
  getAppPort,
  getCurrentServer,
  getServerForApp,
  HARD_GATED_APPS,
  isBuiltOnS1,
  resolveDeployServer,
  SERVER_APPS,
} from './index'

describe('HARD_GATED_APPS', () => {
  it('уравнен с E2E_GATED_APPS целиком — все прод-деплои проходят e2e (2026-09-22, PLAN-INFRA.md §18.7)', () => {
    expect(HARD_GATED_APPS).toEqual([
      'archetest',
      'dsperevod',
      'svoichuzhie',
      'aboi',
      'aprel8008',
      'studio',
      'auth-hub',
      'grandslamcup',
      'time',
      'aira-web',
      'domwellbes',
      'kami',
      'form-example',
      'driving-school',
      'mandala',
    ])
  })

  it('каждое hard-gated приложение уже под warn-only гейтом (E2E_GATED_APPS)', () => {
    // Hard gate — ужесточение warn-only, а не альтернатива ему: приложение сначала набирает
    // историю зелёных прогонов в E2E_GATED_APPS, только потом попадает сюда.
    for (const app of HARD_GATED_APPS) {
      expect(E2E_GATED_APPS).toContain(app)
    }
  })

  it('каждое hard-gated приложение известно SERVER_APPS (не опечатка в имени)', () => {
    for (const app of HARD_GATED_APPS) {
      expect(SERVER_APPS[app]).toBeDefined()
    }
  })
})

describe('resolveDeployServer', () => {
  it('hard-gated приложение вне BUILD_ON_S1_APPS остаётся на SERVER_APPS до отдельного решения', () => {
    // Две независимые оси: HARD_GATED_APPS — только про обязательный зелёный e2e перед прод-деплоем
    // (читает libs/deploy-mcp отдельно от resolveDeployServer). BUILD_ON_S1_APPS — только про то, ГДЕ
    // собирается образ. С 2026-09-22 они пересекаются (grandslamcup/time/aira-web/domwellbes/kami/
    // driving-school/mandala — в обоих: прошли отдельный пилот тиража §157 ДО расширения e2e-гейта) —
    // это не отменяет защиту, а значит она применима только к тем hard-gated приложениям, для которых
    // перенос сборки на s1 ещё не согласован владельцем отдельно.
    for (const app of HARD_GATED_APPS) {
      if (BUILD_ON_S1_APPS.includes(app)) {
        continue
      }
      expect(resolveDeployServer(app, 'production')).toBe(SERVER_APPS[app])
    }
  })

  it('staging всегда резолвится на s1, независимо от production-сервера приложения', () => {
    for (const app of HARD_GATED_APPS) {
      expect(resolveDeployServer(app, 'staging')).toBe('s1')
    }
  })

  it('неизвестное приложение падает на s2 (fallback)', () => {
    expect(getServerForApp('несуществующее-приложение')).toBe('s2')
    expect(resolveDeployServer('несуществующее-приложение')).toBe('s2')
  })

  it('production резолвится на s1 ровно для приложений из BUILD_ON_S1_APPS', () => {
    for (const app of Object.keys(SERVER_APPS)) {
      const expected = BUILD_ON_S1_APPS.includes(app) ? 's1' : SERVER_APPS[app]
      expect(resolveDeployServer(app, 'production')).toBe(expected)
      expect(isBuiltOnS1(app)).toBe(BUILD_ON_S1_APPS.includes(app))
    }
  })

  // Долгоживущий процесс (MCP letar) передаёт свежепрочитанный список — он важнее значения, вычисленного
  // при импорте модуля (libs/deploy-mcp/src/build-on-s1.ts).
  it('явно переданный список перекрывает BUILD_ON_S1_APPS в isBuiltOnS1 и resolveDeployServer', () => {
    expect(isBuiltOnS1('pilot-app', ['pilot-app'])).toBe(true)
    expect(resolveDeployServer('pilot-app', 'production', ['pilot-app'])).toBe('s1')
    expect(resolveDeployServer('pilot-app', 'production', [])).toBe('s2')
    const [listed] = BUILD_ON_S1_APPS
    if (listed) {
      expect(resolveDeployServer(listed, 'production', [])).toBe(SERVER_APPS[listed])
    }
  })

  it('staging не зависит от переданного списка', () => {
    expect(resolveDeployServer('pilot-app', 'staging', [])).toBe('s1')
  })

  it('сборка на s1 не меняет сервер, где приложение ЗАПУСКАЕТСЯ (getServerForApp)', () => {
    for (const app of BUILD_ON_S1_APPS) {
      expect(getServerForApp(app)).toBe('s2')
    }
  })
})

describe('BUILD_ON_S1_APPS', () => {
  it('каждое приложение известно SERVER_APPS (не опечатка в имени)', () => {
    for (const app of BUILD_ON_S1_APPS) {
      expect(SERVER_APPS[app]).toBeDefined()
    }
  })

  it('не содержит приложений, которые перезапускают сами себя (release-фаза на s2 их отвергает)', () => {
    expect(BUILD_ON_S1_APPS).not.toContain('dashboard')
    expect(BUILD_ON_S1_APPS).not.toContain('dashboard-agent')
  })

  it('без дубликатов', () => {
    expect(new Set(BUILD_ON_S1_APPS).size).toBe(BUILD_ON_S1_APPS.length)
  })
})

describe('getAppPort', () => {
  it('возвращает известный порт из канона', () => {
    expect(getAppPort('dashboard')).toBe(3002)
    expect(getAppPort('dashboard-agent')).toBe(3100)
  })

  it('неизвестное приложение — undefined (нет безопасного дефолта для порта)', () => {
    expect(getAppPort('несуществующее-приложение')).toBeUndefined()
  })

  it('согласован с APP_PORTS', () => {
    for (const [app, port] of Object.entries(APP_PORTS)) {
      expect(getAppPort(app)).toBe(port)
    }
  })
})

describe('getCurrentServer', () => {
  it('без SERVER_NAME/подходящего hostname падает на s2', () => {
    const prev = process.env['SERVER_NAME']
    delete process.env['SERVER_NAME']
    try {
      expect(getCurrentServer()).toBe('s2')
    } finally {
      if (prev !== undefined) {
        process.env['SERVER_NAME'] = prev
      }
    }
  })
})
