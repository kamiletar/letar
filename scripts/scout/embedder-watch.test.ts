import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureEmbedder, KEEP_EMBEDDER_LOGS, type WatchDeps } from './embedder-watch'

const URL_LOCAL = 'http://127.0.0.1:8090'

/** Подставные зависимости: настоящих процессов и сети нет; счётчики вызовов — в `calls` */
function fakes(overrides: Partial<WatchDeps> = {}) {
  const calls = { kill: [] as number[], launch: [] as string[], sleep: 0 }
  const deps: Partial<WatchDeps> = {
    health: async () => 'ok',
    probe: async () => true,
    findListener: () => ({ pid: 4242, name: 'llama-server' }),
    kill: (pid) => calls.kill.push(pid),
    launch: (launcher) => calls.launch.push(launcher),
    sleep: async () => {
      calls.sleep++
    },
    ...overrides,
  }
  return { deps, calls }
}

function homeWithLauncher(withLauncher = true): string {
  const home = mkdtempSync(join(tmpdir(), 'scout-watch-'))
  if (withLauncher) {
    writeFileSync(join(home, 'start-embedder.vbs'), '')
  }
  return home
}

function journalLines(home: string): Array<Record<string, unknown>> {
  const file = join(home, 'logs', 'watchdog.jsonl')
  return existsSync(file)
    ? readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>)
    : []
}

describe('ensureEmbedder', () => {
  it('сервер отвечает → ok/none, журнал пуст', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes()
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'ok', action: 'none' })
    expect(calls.launch).toHaveLength(0)
    expect(journalLines(home)).toHaveLength(0)
  })

  it('порт закрыт (refused) → запуск через запускалку, строка в журнале', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({ health: async () => 'refused' })
    const res = await ensureEmbedder(home, URL_LOCAL, deps)
    expect(res).toMatchObject({ state: 'down', action: 'start' })
    expect(calls.launch).toEqual([join(home, 'start-embedder.vbs')])
    expect(calls.kill).toHaveLength(0)
    expect(journalLines(home)[0]).toMatchObject({ state: 'down', action: 'start' })
  })

  it('маркер моложе 10 минут → cooldown, запускалка не вызвана', async () => {
    const home = homeWithLauncher()
    mkdirSync(join(home, 'state'), { recursive: true })
    writeFileSync(join(home, 'state', 'embedder-restart'), '')
    const { deps, calls } = fakes({ health: async () => 'refused' })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'down', action: 'cooldown' })
    expect(calls.launch).toHaveLength(0)
  })

  it('второй вызов подряд упирается в маркер первого (атомарно)', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({ health: async () => 'refused' })
    expect((await ensureEmbedder(home, URL_LOCAL, deps)).action).toBe('start')
    expect((await ensureEmbedder(home, URL_LOCAL, deps)).action).toBe('cooldown')
    expect(calls.launch).toHaveLength(1)
  })

  it('/health ok, но два провала probe → убить слушателя и запустить заново (restart)', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({ probe: async () => false })
    const res = await ensureEmbedder(home, URL_LOCAL, deps)
    expect(res).toMatchObject({ state: 'hung', action: 'restart', pid: 4242 })
    expect(calls.kill).toEqual([4242])
    expect(calls.launch).toHaveLength(1)
    expect(calls.sleep).toBeGreaterThanOrEqual(1)
  })

  it('слушатель не llama-server → not-ours, не убиваем и не запускаем', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({
      probe: async () => false,
      findListener: () => ({ pid: 777, name: 'node' }),
    })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'hung', action: 'not-ours', pid: 777 })
    expect(calls.kill).toHaveLength(0)
    expect(calls.launch).toHaveLength(0)
  })

  it('зависший, но никто не слушает порт → как down: запуск без убийства', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({
      health: async () => 'timeout',
      probe: async () => false,
      findListener: () => undefined,
    })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'down', action: 'start' })
    expect(calls.kill).toHaveLength(0)
    expect(calls.launch).toHaveLength(1)
  })

  it('probe провалился, затем удался → slow, без действий', async () => {
    const home = homeWithLauncher()
    let n = 0
    const { deps, calls } = fakes({ probe: async () => ++n > 1 })
    const res = await ensureEmbedder(home, URL_LOCAL, deps)
    expect(res).toMatchObject({ state: 'slow', action: 'none' })
    expect(calls.kill).toHaveLength(0)
    expect(calls.launch).toHaveLength(0)
    expect(journalLines(home)[0]).toMatchObject({ state: 'slow', action: 'none' })
  })

  it('нет запускалки → no-launcher, ничего не убито', async () => {
    const home = homeWithLauncher(false)
    const { deps, calls } = fakes({ probe: async () => false })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'hung', action: 'no-launcher' })
    expect(calls.kill).toHaveLength(0)
    expect(calls.launch).toHaveLength(0)
  })

  it('сервер грузит модель (loading) → без действий', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({ health: async () => 'loading' })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'loading', action: 'none' })
    expect(calls.launch).toHaveLength(0)
    expect(calls.kill).toHaveLength(0)
  })

  it('удалённый адрес → remote, ничего не трогаем', async () => {
    const home = homeWithLauncher()
    const { deps, calls } = fakes({ health: async () => 'refused' })
    expect(await ensureEmbedder(home, 'http://10.0.0.5:8090', deps)).toMatchObject({ state: 'down', action: 'remote' })
    expect(calls.launch).toHaveLength(0)
    expect(calls.kill).toHaveLength(0)
  })

  it('внутренняя ошибка не бросается: down/none и поле error в журнале', async () => {
    const home = homeWithLauncher()
    const { deps } = fakes({
      health: async () => {
        throw new Error('сломалось')
      },
    })
    expect(await ensureEmbedder(home, URL_LOCAL, deps)).toMatchObject({ state: 'down', action: 'none' })
    expect(String(journalLines(home)[0].error)).toContain('сломалось')
  })

  it('копий embedder-*.log остаётся не больше пяти; прежний лог сохраняется', async () => {
    const home = homeWithLauncher()
    const logs = join(home, 'logs')
    mkdirSync(logs, { recursive: true })
    for (let i = 1; i <= 7; i++) {
      writeFileSync(join(logs, `embedder-2026010${i}-000000.log`), 'старый')
    }
    writeFileSync(join(logs, 'embedder.log'), 'причина падения')
    const { deps } = fakes({ health: async () => 'refused' })
    await ensureEmbedder(home, URL_LOCAL, deps)
    const copies = readdirSync(logs).filter((f) => /^embedder-\d{8}-\d{6}\.log$/.test(f))
    expect(copies.length).toBeLessThanOrEqual(KEEP_EMBEDDER_LOGS)
    expect(copies.some((f) => readFileSync(join(logs, f), 'utf8') === 'причина падения')).toBe(true)
  })
})
