import type { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { collectAppPorts, MIN_DEV_PORT, resolveAppPort, resolveNextFreePort } from './ports'

describe('collectAppPorts', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('читает PORT из .env', () => {
    tree.write('apps/my-app/.env', 'PORT=3005\n')

    expect(collectAppPorts(tree, 'my-app')).toEqual([3005])
  })

  it('читает PORT из .env, даже если выше идут комментарии и пустые строки', () => {
    tree.write('apps/my-app/.env', '# Порт dev сервера\n\nPORT=3004\n')

    expect(collectAppPorts(tree, 'my-app')).toEqual([3004])
  })

  it('не путает SOCKET_PORT с PORT', () => {
    tree.write('apps/my-app/.env', 'PORT=3003\nSOCKET_PORT=4003\n')

    expect(collectAppPorts(tree, 'my-app')).toEqual([3003])
  })

  it('читает PORT из .env.local (порт может лежать только там)', () => {
    tree.write('apps/my-app/.env.local', 'PORT=3002\n')

    expect(collectAppPorts(tree, 'my-app')).toEqual([3002])
  })

  it('читает порт из project.json — `next dev -p <порт>`', () => {
    tree.write(
      'apps/my-app/project.json',
      JSON.stringify({ targets: { dev: { options: { command: 'next dev -p 3008' } } } })
    )

    expect(collectAppPorts(tree, 'my-app')).toEqual([3008])
  })

  it('читает порт из project.json — `--port=<порт>`', () => {
    tree.write(
      'apps/my-app/project.json',
      JSON.stringify({ targets: { dev: { options: { command: 'next dev --port=3009' } } } })
    )

    expect(collectAppPorts(tree, 'my-app')).toEqual([3009])
  })

  it('игнорирует порты вне диапазона 3xxx (react-native --port 8083)', () => {
    tree.write(
      'apps/my-app/project.json',
      JSON.stringify({ targets: { start: { options: { command: 'react-native start --port 8083' } } } })
    )

    expect(collectAppPorts(tree, 'my-app')).toEqual([])
  })

  it('возвращает пустой массив, если приложение порт нигде не объявляет', () => {
    tree.write('apps/my-app/package.json', '{}')

    expect(collectAppPorts(tree, 'my-app')).toEqual([])
  })
})

describe('resolveAppPort', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('берёт порт из .env', () => {
    tree.write('apps/my-app/.env', 'PORT=3005\n')

    expect(resolveAppPort(tree, 'my-app')).toBe(3005)
  })

  it('берёт порт из project.json, если .env нет', () => {
    tree.write(
      'apps/my-app/project.json',
      JSON.stringify({ targets: { dev: { options: { command: 'next dev -p 3015' } } } })
    )

    expect(resolveAppPort(tree, 'my-app')).toBe(3015)
  })

  it('возвращает undefined, если порт нигде не объявлен', () => {
    tree.write('apps/my-app/package.json', '{}')

    expect(resolveAppPort(tree, 'my-app')).toBeUndefined()
  })
})

describe('resolveNextFreePort', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('продолжает последовательность от максимального занятого порта, а не затыкает дырки', () => {
    // 3000, 3001, 3002 свободны — но новое приложение должно продолжить ряд, а не откатиться в начало
    tree.write('apps/a/.env', 'PORT=3003\n')
    tree.write('apps/b/.env', 'PORT=3024\n')

    expect(resolveNextFreePort(tree)).toBe(3025)
  })

  it('никогда не выдаёт 3000 — это дефолт Next.js', () => {
    expect(resolveNextFreePort(tree)).toBe(MIN_DEV_PORT)
    expect(MIN_DEV_PORT).toBe(3001)
  })

  it('учитывает приложения, объявляющие порт только в project.json', () => {
    tree.write('apps/a/.env', 'PORT=3010\n')
    tree.write(
      'apps/landing/project.json',
      JSON.stringify({ targets: { dev: { options: { command: 'next dev -p 3015' } } } })
    )

    expect(resolveNextFreePort(tree)).toBe(3016)
  })

  it('учитывает приложения, объявляющие порт только в .env.local', () => {
    tree.write('apps/a/.env', 'PORT=3005\n')
    tree.write('apps/dashboard/.env.local', 'PORT=3030\n')

    expect(resolveNextFreePort(tree)).toBe(3031)
  })

  it('учитывает 3000, если он всё-таки кем-то занят', () => {
    tree.write('apps/a/.env', 'PORT=3000\n')

    expect(resolveNextFreePort(tree)).toBe(3001)
  })
})
