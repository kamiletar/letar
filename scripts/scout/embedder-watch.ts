#!/usr/bin/env bun
/**
 * Сторож эмбеддера скаута (llama-server на 8090). Раньше сервер стартовал только при входе в Windows:
 * упал или завис — хуки молча сутками работали на одном BM25. Сторож проверяет здоровье и, если
 * сервер лежит или завис, запускает или перезапускает его через `SCOUT_HOME/start-embedder.vbs`
 * (та же запускалка, что у задачи Планировщика `scout-embedder`).
 *
 * Состояния: `ok` отвечает; `loading` грузит модель (503); `slow` ответил со второй попытки
 * (видеокарта занята — не трогаем); `down` порт закрыт; `hung` порт открыт, но не отвечает.
 * Любой исход, кроме `ok`/`none`, пишется в `SCOUT_HOME/logs/watchdog.jsonl`. Функция не бросает.
 *
 * Запуск: bun scripts/scout/embedder-watch.ts [--check]
 *   --check — только диагноз, без запуска и убийства (печатает `state=… ms=…`)
 *   без флага — полный `ensureEmbedder` (печатает `state=… action=…`)
 */
import { spawn, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { embedTexts } from '../../libs/scout/src/index'
import { scoutHome } from './paths'
import { EMBED_URL } from './vectors'

export type EmbedderState = 'ok' | 'loading' | 'slow' | 'down' | 'hung'
export type WatchAction = 'none' | 'start' | 'restart' | 'cooldown' | 'no-launcher' | 'not-ours' | 'remote'

export interface WatchResult {
  state: EmbedderState
  action: WatchAction
  ms: number
  pid?: number
}

export interface WatchDeps {
  health(url: string, timeoutMs: number): Promise<'ok' | 'loading' | 'refused' | 'timeout'>
  /** Настоящий запрос на эмбеддинг (`embedTexts(['прогрев'])`): сервер отвечает на /health и при зависшей модели */
  probe(url: string, timeoutMs: number): Promise<boolean>
  /** Кто держит порт на адресе `host`; чужой слушатель общего адреса (`::`, `0.0.0.0`) не в счёт — см. `pickListener` */
  findListener(port: number, host: string): { pid: number; name: string } | undefined
  kill(pid: number): void
  launch(launcher: string): void
  sleep(ms: number): Promise<void>
  now(): number
}

/** Пауза между запусками и перезапусками: маркер `state/embedder-restart` */
export const RESTART_COOLDOWN_MS = 10 * 60 * 1000
/** Сколько копий `logs/embedder-*.log` оставляем */
export const KEEP_EMBEDDER_LOGS = 5

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])
const SERVER_NAME = /^llama-server(\.exe)?$/i

export interface Listener {
  pid: number
  name: string
  /** Адрес привязки: `127.0.0.1`, `::`, `0.0.0.0`… */
  address: string
}

/**
 * Кого считать хозяином порта эмбеддера. На Windows привязка к `127.0.0.1:порт` уживается с чужой
 * привязкой к общему адресу того же порта (`[::]:8090` у стороннего приложения): пока наш
 * сервер жив, запросы идут ему, упал — тому, кто на общем адресе. Поэтому сначала ищем свой
 * `llama-server`, затем слушателя ровно на нашем адресе; чужой на общем адресе порт «не держит».
 */
export function pickListener(listeners: Listener[], host: string): Listener | undefined {
  const ours = listeners.find((l) => SERVER_NAME.test(l.name))
  if (ours) {
    return ours
  }
  const addresses = host === 'localhost' ? ['127.0.0.1', '::1'] : [host]
  return listeners.find((l) => addresses.includes(l.address))
}

const defaultDeps: WatchDeps = {
  async health(url, timeoutMs) {
    try {
      const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(timeoutMs) })
      // Не 2xx и не 503 — на порту отвечает не наш сервер (чужой слушатель общего адреса): считаем, что нашего нет
      return response.status === 503 ? 'loading' : response.ok ? 'ok' : 'refused'
    } catch (e) {
      const name = (e as { name?: unknown } | null)?.name
      return name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'refused'
    }
  },
  async probe(url, timeoutMs) {
    try {
      await embedTexts(['прогрев'], { url, timeoutMs })
      return true
    } catch {
      return false
    }
  },
  findListener(port, host) {
    // Все слушатели порта: PID и адрес из Get-NetTCPConnection, имя процесса из Get-Process
    const script =
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { `
      + `$p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; "$($_.OwningProcess)|$($p.ProcessName)|$($_.LocalAddress)" }`
    const out = spawnSync('powershell', ['-NoProfile', '-Command', script], {
      encoding: 'utf8',
      timeout: 15_000,
      windowsHide: true,
    })
    const listeners = String(out.stdout ?? '').split('\n').flatMap((line): Listener[] => {
      const [pid, name, address] = line.trim().split('|')
      return Number(pid) > 0 ? [{ pid: Number(pid), name: name ?? '', address: address ?? '' }] : []
    })
    return pickListener(listeners, host)
  },
  kill(pid) {
    process.kill(pid)
  },
  launch(launcher) {
    spawn('wscript.exe', [launcher], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
  },
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
}

function fileStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${
    p(d.getSeconds())
  }`
}

/** Маркер паузы, атомарно (`wx`), как `takeLock` в `warmup.ts`: старт сессии бывает у нескольких сессий разом */
function takeMarker(path: string, now: number): boolean {
  mkdirSync(join(path, '..'), { recursive: true })
  try {
    writeFileSync(path, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    try {
      if (now - statSync(path).mtimeMs < RESTART_COOLDOWN_MS) {
        return false
      }
      writeFileSync(path, String(process.pid))
      return true
    } catch {
      return false
    }
  }
}

/** Запускалка перезаписывает `embedder.log`: сохраняем прежний, иначе причина падения теряется */
function rotateEmbedderLog(home: string, now: number): void {
  try {
    const dir = join(home, 'logs')
    const log = join(dir, 'embedder.log')
    if (existsSync(log) && statSync(log).size > 0) {
      copyFileSync(log, join(dir, `embedder-${fileStamp(new Date(now))}.log`))
    }
    const copies = readdirSync(dir).filter((f) => /^embedder-\d{8}-\d{6}\.log$/.test(f)).sort().reverse()
    for (const old of copies.slice(KEEP_EMBEDDER_LOGS)) {
      rmSync(join(dir, old), { force: true })
    }
  } catch {
    // копии логов — удобство, запуск от них не зависит
  }
}

function journal(home: string, entry: Record<string, unknown>): void {
  try {
    const dir = join(home, 'logs')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'watchdog.jsonl'), `${JSON.stringify(entry)}\n`)
  } catch {
    // журнал — удобство
  }
}

/** Диагноз по пп. 1–3: без запуска и убийства */
async function diagnose(url: string, d: WatchDeps): Promise<{ state: EmbedderState; remote: boolean }> {
  const remote = !LOCAL_HOSTS.has(new URL(url).hostname)
  const health = await d.health(url, 2000)
  if (remote) {
    return {
      state: health === 'ok' ? 'ok' : health === 'loading' ? 'loading' : health === 'refused' ? 'down' : 'hung',
      remote,
    }
  }
  if (health === 'loading') {
    return { state: 'loading', remote }
  }
  if (health === 'refused') {
    return { state: 'down', remote }
  }
  if (health === 'ok' && (await d.probe(url, 5000))) {
    return { state: 'ok', remote }
  }
  // Ответ на /health без эмбеддинга или таймаут: даём шанс занятой видеокарте
  await d.sleep(5000)
  return { state: (await d.probe(url, 15_000)) ? 'slow' : 'hung', remote }
}

/** Проверить эмбеддер и при необходимости поднять; никогда не бросает */
export async function ensureEmbedder(home: string, url: string, deps: Partial<WatchDeps> = {}): Promise<WatchResult> {
  const d: WatchDeps = { ...defaultDeps, ...deps }
  const started = d.now()
  let state: EmbedderState = 'down'
  let action: WatchAction = 'none'
  let pid: number | undefined
  let error: string | undefined
  try {
    const diag = await diagnose(url, d)
    state = diag.state
    if (diag.remote) {
      action = 'remote'
    } else if (state === 'down' || state === 'hung') {
      const launcher = join(home, 'start-embedder.vbs')
      if (!existsSync(launcher) || process.platform !== 'win32') {
        action = 'no-launcher'
      } else if (!takeMarker(join(home, 'state', 'embedder-restart'), d.now())) {
        action = 'cooldown'
      } else {
        let proceed = true
        if (state === 'hung') {
          const target = new URL(url)
          const listener = d.findListener(Number(target.port) || 80, target.hostname)
          if (listener && !SERVER_NAME.test(listener.name)) {
            // Порт держит чужой процесс: убивать нельзя
            action = 'not-ours'
            pid = listener.pid
            proceed = false
          } else if (listener) {
            d.kill(listener.pid)
            pid = listener.pid
            action = 'restart'
            await d.sleep(1000)
          } else {
            // Никто не слушает — это `down`
            state = 'down'
            action = 'start'
          }
        } else {
          action = 'start'
        }
        if (proceed) {
          rotateEmbedderLog(home, d.now())
          d.launch(launcher)
        }
      }
    }
  } catch (e) {
    state = 'down'
    action = 'none'
    pid = undefined
    error = String((e as Error)?.message ?? e).slice(0, 200)
  }
  const result: WatchResult = { state, action, ms: d.now() - started, ...(pid === undefined ? {} : { pid }) }
  if (state !== 'ok' || action !== 'none') {
    journal(home, { ts: new Date(d.now()).toISOString(), ...result, ...(error ? { error } : {}) })
  }
  return result
}

if (import.meta.main) {
  if (process.argv.includes('--check')) {
    const started = performance.now()
    let state: EmbedderState
    try {
      state = (await diagnose(EMBED_URL, defaultDeps)).state
    } catch {
      state = 'down'
    }
    console.log(`state=${state} ms=${Math.round(performance.now() - started)}`)
  } else {
    const result = await ensureEmbedder(scoutHome(), EMBED_URL)
    console.log(`state=${result.state} action=${result.action}`)
  }
}
