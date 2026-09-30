#!/usr/bin/env bun
/**
 * Справка приложения: что агенты обычно читают в сессиях, открытых командой `/<app>`.
 *
 * Хук на голую `/<app>` не может искать по тексту (его нет), поэтому справка считается заранее
 * по истории сессий: для каждой команды — доки, которые читали в наибольшем числе её сессий.
 * Результат — `SCOUT_HOME/app-briefs.json`; строит его еженедельный прогон.
 *
 * ⚠️ Имена приложений живут только в `SCOUT_HOME` (вне репозитория): в коде, тестах и доках
 * реальных имён нет.
 *
 * Запуск: bun scripts/scout/app-briefs.ts --build [--sessions <файл>]
 *         bun scripts/scout/app-briefs.ts --app <имя>
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { arg, readJsonl } from './cli'
import { findRepoRoot } from './index-store'
import type { SessionRecord } from './mine-transcripts'
import { scoutDataDir, scoutHome } from './paths'

/** Сколько доков в справке приложения */
export const APP_BRIEF_K = 8
/** Меньше сессий в истории — статистика шумит, берём общий список */
export const APP_BRIEF_MIN_SESSIONS = 3

export interface AppBriefs {
  builtAt: string
  k: number
  /** Самые читаемые доки по всем сессиям с командой */
  global: string[]
  /** Команда → самые читаемые доки её сессий; только команды с достаточной историей */
  apps: Record<string, string[]>
}

/** Пути по убыванию числа сессий, где док прочитан; при равенстве — по пути */
function topDocs(sessions: SessionRecord[], k: number, loaded: (path: string) => boolean): string[] {
  const freq = new Map<string, number>()
  for (const s of sessions) {
    // Два чтения в одной сессии — одно очко
    for (const path of new Set(s.docsRead.map((d) => d.path))) {
      if (!loaded(path)) {
        freq.set(path, (freq.get(path) ?? 0) + 1)
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, k)
    .map(([path]) => path)
}

/**
 * Справки по истории сессий. Пути — как в `docsRead[].path`; `loaded(path)` — правило грузится
 * харнессом само, его не советуем.
 */
export function buildAppBriefs(
  sessions: SessionRecord[],
  opts: { k?: number; minSessions?: number; loaded: (path: string) => boolean },
): AppBriefs {
  const k = opts.k ?? APP_BRIEF_K
  const minSessions = opts.minSessions ?? APP_BRIEF_MIN_SESSIONS
  const withCommand = sessions.filter((s) => s.command)
  const byCommand = new Map<string, SessionRecord[]>()
  for (const s of withCommand) {
    byCommand.set(s.command!, [...(byCommand.get(s.command!) ?? []), s])
  }
  const apps: Record<string, string[]> = {}
  for (const [command, list] of [...byCommand.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (list.length >= minSessions) {
      apps[command] = topDocs(list, k, opts.loaded)
    }
  }
  return { builtAt: new Date().toISOString(), k, global: topDocs(withCommand, k, opts.loaded), apps }
}

export interface AppBriefScore {
  /** Сессий в проверке */
  sessions: number
  /** Прочитано доков (уникальных в сессии), из них найдено в справке */
  read: number
  found: number
  /** Сессий, где справка угадала хоть один док */
  hitSessions: number
}

/**
 * Замер справок: делит сессии с командой по дате (первые `trainShare` — история, остальные —
 * проверка), строит справки на истории и считает, сколько прочитанного они назвали.
 * В проверку идут сессии хоть с одним прочитанным не-`loaded` доком.
 */
export function scoreAppBriefs(
  sessions: SessionRecord[],
  loaded: (path: string) => boolean,
  trainShare = 0.7,
): { app: AppBriefScore; global: AppBriefScore; train: number } {
  const sorted = sessions.filter((s) => s.command).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const cut = Math.floor(sorted.length * trainShare)
  const train = sorted.slice(0, cut)
  const briefs = buildAppBriefs(train, { loaded })
  const score = (pick: (command: string) => string[]): AppBriefScore => {
    const out: AppBriefScore = { sessions: 0, read: 0, found: 0, hitSessions: 0 }
    for (const s of sorted.slice(cut)) {
      const read = new Set(s.docsRead.map((d) => d.path).filter((p) => !loaded(p)))
      if (!read.size) {
        continue
      }
      const list = new Set(pick(s.command!))
      const found = [...read].filter((p) => list.has(p)).length
      out.sessions++
      out.read += read.size
      out.found += found
      out.hitSessions += found ? 1 : 0
    }
    return out
  }
  return {
    app: score((command) => briefs.apps[command] ?? briefs.global),
    global: score(() => briefs.global),
    train: train.length,
  }
}

/** `SCOUT_HOME/app-briefs.json`; нет файла или он битый — `undefined` (хук молчит) */
export function readAppBriefs(home: string): AppBriefs | undefined {
  try {
    const data = JSON.parse(readFileSync(join(home, 'app-briefs.json'), 'utf8')) as AppBriefs
    return data && typeof data === 'object' && Array.isArray(data.global) && data.apps && typeof data.apps === 'object'
      ? data
      : undefined
  } catch {
    return undefined
  }
}

/** Атомарная запись: `.tmp` → `rename`, чтобы хук не прочёл половину файла */
export function writeAppBriefs(home: string, briefs: AppBriefs): void {
  const file = join(home, 'app-briefs.json')
  writeFileSync(`${file}.tmp`, JSON.stringify(briefs))
  renameSync(`${file}.tmp`, file)
}

async function main() {
  const home = scoutHome()
  if (process.argv.includes('--build')) {
    const root = findRepoRoot()
    if (!root) {
      console.error('Не найден корень репозитория')
      process.exit(1)
    }
    const dir = scoutDataDir()
    const live = join(dir, 'sessions-live.jsonl')
    const file = arg('--sessions') ?? (existsSync(live) ? live : join(dir, 'sessions.jsonl'))
    const sessions = readJsonl<SessionRecord>(file)
    // Динамически: hook-core сам импортирует этот файл, статический импорт дал бы цикл
    const { freshIndex } = await import('./hook-core')
    const loadedPaths = new Set(freshIndex(root, home).cards.filter((c) => c.loaded).map((c) => c.path))
    const briefs = buildAppBriefs(sessions, { loaded: (p) => loadedPaths.has(p) })
    writeAppBriefs(home, briefs)
    console.log(
      `Приложений: ${Object.keys(briefs.apps).length}, общий список: ${briefs.global.length} (сессии: ${file})`,
    )
    return
  }
  const app = arg('--app')
  const briefs = readAppBriefs(home)
  if (!app || !briefs) {
    console.error('Запуск: bun scripts/scout/app-briefs.ts --build [--sessions <файл>] | --app <имя>')
    process.exit(app ? 1 : 2)
  }
  for (const path of briefs.apps[app] ?? briefs.global) {
    console.log(path)
  }
}

if (import.meta.main) {
  await main()
}
