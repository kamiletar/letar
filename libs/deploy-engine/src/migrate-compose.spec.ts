import { describe, expect, it } from 'vitest'
import { migrateComposeToRollout } from './migrate-compose.js'

describe('migrateComposeToRollout', () => {
  it('мигрирует простой compose (db + app, без healthcheck) — как aprel8008 до фикса', () => {
    const input = `services:
  db:
    image: postgres:16-alpine
    container_name: aprel8008-db
    restart: always
    ports:
      - '5447:5432'
    networks:
      - kami-network

  app:
    image: aprel8008:latest
    container_name: aprel8008-app
    restart: unless-stopped
    ports:
      - '3023:3023'
    depends_on:
      db:
        condition: service_healthy
    networks:
      - kami-network

networks:
  kami-network:
    external: true
`
    const result = migrateComposeToRollout(input, 'aprel8008')

    expect(result.changed).toBe(true)
    expect(result.yaml).not.toContain('container_name: aprel8008-app')
    expect(result.yaml).toContain('container_name: aprel8008-db') // db не трогаем
    expect(result.yaml).not.toMatch(/app:\n[\s\S]*?ports:/) // ports у app снят (проверяем ниже точнее)
    expect(result.yaml).toContain('image: aprel8008:${DEPLOY_TAG:-latest}')
    expect(result.yaml).toContain('stop_grace_period: 30s')
    expect(result.yaml).toMatch(/letar\.rollout: ['"]?true['"]?/)
    expect(result.yaml).toContain('aliases:')
    expect(result.yaml).toContain('- aprel8008-app')
    // db сохранил свой ports (не сервис app)
    expect(result.yaml).toContain("- '5447:5432'")

    // healthcheck отсутствовал — должно быть предупреждение с подсказкой порта
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/healthcheck отсутствует/)
    expect(result.warnings[0]).toContain('3023')
  })

  it('мигрирует compose с redis-зависимостью — как animatrona-tracker до фикса', () => {
    const input = `services:
  db:
    image: postgres:16-alpine
    container_name: animatrona-tracker-db
    networks:
      - kami-network

  redis:
    image: redis:7-alpine
    container_name: animatrona-tracker-redis
    networks:
      - kami-network

  app:
    image: animatrona-tracker:latest
    container_name: animatrona-tracker-app
    restart: always
    mem_limit: 1024m
    ports:
      - '\${PORT:-3010}:3010'
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - kami-network
    logging:
      driver: 'json-file'

networks:
  kami-network:
    external: true
`
    const result = migrateComposeToRollout(input, 'animatrona-tracker')

    expect(result.changed).toBe(true)
    expect(result.yaml).not.toContain('container_name: animatrona-tracker-app')
    expect(result.yaml).toContain('container_name: animatrona-tracker-db')
    expect(result.yaml).toContain('container_name: animatrona-tracker-redis')
    expect(result.yaml).toContain('image: animatrona-tracker:${DEPLOY_TAG:-latest}')
    expect(result.yaml).toContain('- animatrona-tracker-app')
    // depends_on на оба сервиса сохранён нетронутым
    expect(result.yaml).toContain('redis:')
    expect(result.yaml).toContain('condition: service_healthy')

    expect(result.warnings[0]).toContain('3010')
  })

  it('добавляет letar.rollout к уже существующим labels, не трогая healthcheck — как svoichuzhie', () => {
    const input = `services:
  app:
    image: svoichuzhie:latest
    container_name: svoichuzhie-app
    restart: unless-stopped
    mem_limit: 512m
    memswap_limit: 512m
    ports:
      - '3021:3021'
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:3021/api/health || exit 1']
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 40s
    networks:
      - kami-network

networks:
  kami-network:
    external: true
`
    const result = migrateComposeToRollout(input, 'svoichuzhie')

    expect(result.changed).toBe(true)
    expect(result.yaml).not.toContain('container_name: svoichuzhie-app')
    // healthcheck уже был — не должно быть предупреждения
    expect(result.warnings).toHaveLength(0)
    // существующий healthcheck сохранён как есть
    expect(result.yaml).toContain('http://127.0.0.1:3021/api/health')
    expect(result.yaml).toContain('mem_limit: 512m')
  })

  it('идемпотентна — повторный прогон на уже смигрированном compose ничего не меняет', () => {
    const input = `services:
  app:
    image: kami:\${DEPLOY_TAG:-latest}
    restart: always
    stop_grace_period: 30s
    labels:
      letar.rollout: 'true'
    healthcheck:
      test: ['CMD-SHELL', 'wget -q --spider http://0.0.0.0:3005/ || exit 1']
    networks:
      kami-network:
        aliases:
          - kami-app

networks:
  kami-network:
    external: true
`
    const result = migrateComposeToRollout(input, 'kami')

    expect(result.changed).toBe(false)
    expect(result.warnings).toHaveLength(0)
  })

  it('бросает ошибку, если нет сервиса app', () => {
    const input = `services:\n  db:\n    image: postgres:17-alpine\n`
    expect(() => migrateComposeToRollout(input, 'foo')).toThrow('Сервис "app" не найден')
  })
})
