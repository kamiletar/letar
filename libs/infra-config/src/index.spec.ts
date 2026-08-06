import { describe, expect, it } from 'vitest'
import {
  APP_PORTS,
  getAppPort,
  getCurrentServer,
  getServerForApp,
  HARD_GATED_APPS,
  resolveDeployServer,
  SERVER_APPS,
} from './index'

describe('HARD_GATED_APPS', () => {
  it('содержит активные коммерческие приложения (PLAN-INFRA.md §18.7)', () => {
    expect(HARD_GATED_APPS).toEqual(['archetest', 'dsperevod', 'svoichuzhie', 'aboi', 'aprel8008', 'studio'])
  })

  it('каждое hard-gated приложение известно SERVER_APPS (не опечатка в имени)', () => {
    for (const app of HARD_GATED_APPS) {
      expect(SERVER_APPS[app]).toBeDefined()
    }
  })
})

describe('resolveDeployServer', () => {
  it('production резолвится через SERVER_APPS для hard-gated приложений', () => {
    for (const app of HARD_GATED_APPS) {
      expect(resolveDeployServer(app, 'production')).toBe(SERVER_APPS[app])
    }
  })

  it('staging всегда резолвится на s3, независимо от production-сервера приложения', () => {
    for (const app of HARD_GATED_APPS) {
      expect(resolveDeployServer(app, 'staging')).toBe('s3')
    }
  })

  it('неизвестное приложение падает на s2 (fallback)', () => {
    expect(getServerForApp('несуществующее-приложение')).toBe('s2')
    expect(resolveDeployServer('несуществующее-приложение')).toBe('s2')
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
