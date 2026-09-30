/**
 * Замер второй справки в момент первой правки файла (хука нет — только цифры).
 *
 * Вопрос: сколько доков, прочитанных агентом уже ПОСЛЕ первой правки, дала бы справка, построенная
 * по пути правимого файла, сверх того, что показала первая справка (по тексту задачи).
 *
 * ⚠️ Имена приложений живут только в данных сессий: в коде и тестах — вымышленные.
 */
import { mentionedIn, type ScoutResult } from '../../libs/scout/src/index'
import { splitOf } from './cli'
import type { SessionRecord } from './mine-transcripts'

/** Сколько пунктов во второй справке и в первой — как у справки хука */
export const EDIT_BRIEF_K = 8
/** Как в хуке: запрос к поиску обрезается до этой длины */
export const TASK_QUERY_CHARS = 600
/** Доля сессий (по дате), на которой считается частотная справка по каталогу */
export const HISTORY_SHARE = 0.7

/** Служебные сегменты пути: слова из них поиску ничего не дают */
const SERVICE_SEGMENTS = new Set(['src', 'app', 'lib', 'components', 'index'])

/** Запрос первой справки — как в eval-случаях: команда и задача */
export function sessionQuery(s: SessionRecord): string {
  return [s.command ? `/${s.command}` : '', s.task].join(' ').trim()
}

/**
 * Эталон второй справки: доки, прочитанные после первой правки, которых не было до неё
 * и в задаче, не `loaded` и не совпадающие с правимыми путями.
 */
export function editGold(s: SessionRecord, known: Set<string>, loaded: (path: string) => boolean): string[] {
  const query = sessionQuery(s)
  const edited = new Set(s.editPaths ?? [])
  const before = new Set(s.docsRead.filter((d) => d.beforeEdit).map((d) => d.path))
  return [
    ...new Set(
      s.docsRead
        .filter((d) =>
          !d.beforeEdit && known.has(d.path) && !before.has(d.path) && !loaded(d.path) && !edited.has(d.path)
          && !mentionedIn(query, d.path)
        )
        .map((d) => d.path),
    ),
  ]
}

/**
 * Текст запроса из пути правимого файла: сегменты без расширения, служебные (`src`, `app`, …)
 * отброшены, `(admin)` → `admin`, `[id]` → `id`. Имя приложения — сегмент `apps/<имя>/…`.
 */
export function pathQueryText(editPath: string): string {
  const parts = editPath.split('/').filter(Boolean)
  const last = parts.length - 1
  const words = parts.map((part, i) => {
    const bare = i === last ? part.replace(/\.[^.]+$/, '') : part
    return bare.replace(/^[([]+|[)\]]+$/g, '')
  })
  return words.filter((w) => w && !SERVICE_SEGMENTS.has(w.toLowerCase())).join(' ')
}

/** Каталог правки: до `depth` первых сегментов каталога файла (`apps/<имя>/src`) */
export function dirPrefix(editPath: string, depth: number): string {
  return editPath.split('/').slice(0, -1).slice(0, depth).join('/')
}

/** `path` лежит под каталогом `prefix` (пустой префикс не совпадает ни с чем) */
function under(path: string, prefix: string): boolean {
  return prefix !== '' && path.startsWith(`${prefix}/`)
}

/**
 * Справка по каталогу — частотная, как справка приложения: доки, прочитанные после первой правки
 * в сессиях истории, чей первый правимый путь лежит под тем же префиксом. Префикс — 3 сегмента
 * каталога, нет истории — 2, нет и её — пусто.
 */
export function catalogBrief(
  editPath: string,
  history: SessionRecord[],
  opts: { k?: number; loaded: (path: string) => boolean; exclude?: Set<string> },
): string[] {
  const k = opts.k ?? EDIT_BRIEF_K
  for (const depth of [3, 2]) {
    const prefix = dirPrefix(editPath, depth)
    const sessions = history.filter((s) => s.editPaths?.[0] && under(s.editPaths[0], prefix))
    if (!sessions.length) {
      continue
    }
    const freq = new Map<string, number>()
    for (const s of sessions) {
      for (const path of new Set(s.docsRead.filter((d) => !d.beforeEdit).map((d) => d.path))) {
        if (!opts.loaded(path) && !opts.exclude?.has(path)) {
          freq.set(path, (freq.get(path) ?? 0) + 1)
        }
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, k)
      .map(([path]) => path)
  }
  return []
}

/** Пути справки (доки и ловушки одним списком по очкам), как её видит агент */
export function briefPaths(result: ScoutResult): string[] {
  return [...result.docs, ...result.traps].sort((a, b) => b.score - a.score).map((h) => h.path)
}

export const VARIANTS = ['P-путь', 'P-задача+путь', 'P-каталог', 'P-смесь'] as const
export type Variant = (typeof VARIANTS)[number]

export interface EditBriefCase {
  session: SessionRecord
  gold: string[]
  /** Первые пункты первой справки */
  first: string[]
  /** Вторая справка по вариантам */
  second: Record<Variant, string[]>
}

/** Смесь: первые 4 из «задача+путь» и первые 4 из каталога, без повторов */
export function mixBrief(taskPath: string[], catalog: string[], k = EDIT_BRIEF_K): string[] {
  const half = Math.floor(k / 2)
  const out = taskPath.slice(0, half)
  for (const p of catalog.slice(0, half)) {
    if (!out.includes(p)) {
      out.push(p)
    }
  }
  return out
}

export interface EditBriefDeps {
  search: (query: string) => Promise<ScoutResult>
  known: Set<string>
  loaded: (path: string) => boolean
}

/** Сессии из живой выгрузки, чьи id есть в замороженной, с путём правки; по дате */
export function editSessions(live: SessionRecord[], frozen: SessionRecord[]): SessionRecord[] {
  const ids = new Set(frozen.map((s) => s.sessionId))
  return live
    .filter((s) => ids.has(s.sessionId) && s.editPaths?.length)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/** Дата, с которой начинается проверочная часть: после первых `HISTORY_SHARE` сессий */
export function cutDate(sessions: SessionRecord[]): string {
  return sessions[Math.floor(sessions.length * HISTORY_SHARE)]?.startedAt ?? ''
}

/** Первая справка, вторая по каждому варианту и эталон — на каждую сессию с непустым эталоном */
export async function buildEditCases(sessions: SessionRecord[], deps: EditBriefDeps): Promise<EditBriefCase[]> {
  const history = sessions.slice(0, Math.floor(sessions.length * HISTORY_SHARE))
  const cases: EditBriefCase[] = []
  for (const session of sessions) {
    const gold = editGold(session, deps.known, deps.loaded)
    if (!gold.length) {
      continue
    }
    const editPath = session.editPaths![0]
    const first = briefPaths(await deps.search(sessionQuery(session))).slice(0, EDIT_BRIEF_K)
    const shown = new Set(first)
    const fresh = (paths: string[]) => paths.filter((p) => !shown.has(p) && !deps.loaded(p)).slice(0, EDIT_BRIEF_K)
    const pathText = pathQueryText(editPath)
    const byPath = fresh(briefPaths(await deps.search(pathText)))
    const byTaskPath = fresh(briefPaths(await deps.search(`${session.task.slice(0, TASK_QUERY_CHARS)} ${pathText}`)))
    // История без самой сессии: проверочная сессия не подсказывает сама себе
    const catalog = catalogBrief(editPath, history.filter((h) => h !== session), {
      loaded: deps.loaded,
      exclude: shown,
    })
    cases.push({
      session,
      gold,
      first,
      second: {
        'P-путь': byPath,
        'P-задача+путь': byTaskPath,
        'P-каталог': catalog,
        'P-смесь': mixBrief(byTaskPath, catalog),
      },
    })
  }
  return cases
}

export interface EditScore {
  sessions: number
  gold: number
  /** Эталон, найденный второй справкой (её пункты уже без показанных в первой) */
  found: number
  hitSessions: number
  /** Эталон, который уже назвала первая справка — вторая его не добавляет */
  coveredByFirst: number
}

export function scoreEditCases(cases: EditBriefCase[], variant: Variant): EditScore {
  const out: EditScore = { sessions: 0, gold: 0, found: 0, hitSessions: 0, coveredByFirst: 0 }
  for (const c of cases) {
    const second = new Set(c.second[variant])
    const first = new Set(c.first)
    const found = c.gold.filter((p) => second.has(p)).length
    out.sessions++
    out.gold += c.gold.length
    out.found += found
    out.hitSessions += found ? 1 : 0
    out.coveredByFirst += c.gold.filter((p) => first.has(p)).length
  }
  return out
}

export interface EditGroup {
  name: string
  cases: EditBriefCase[]
}

/**
 * Группы замера: dev и test — по `splitOf`; «проверка» — сессии после даты отсечки (единственная
 * честная часть для каталога, ему нужна история до неё).
 */
export function editGroups(cases: EditBriefCase[], cut: string): EditGroup[] {
  const check = cases.filter((c) => c.session.startedAt >= cut)
  const of = (list: EditBriefCase[], split: 'dev' | 'test') =>
    list.filter((c) => splitOf(c.session.sessionId) === split)
  return [
    { name: 'dev', cases: of(cases, 'dev') },
    { name: 'test', cases: of(cases, 'test') },
    { name: 'проверка', cases: check },
    { name: 'проверка dev', cases: of(check, 'dev') },
    { name: 'проверка test', cases: of(check, 'test') },
  ]
}
