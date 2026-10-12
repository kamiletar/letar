#!/usr/bin/env bun
// Очередь задач «одна задача — один файл».
//
// Проект — каталог, где лежит tasks/tasks.json (корень, apps/*, libs/*). Задача — файл
// tasks/<PREFIX>-<NNN>-<slug>.md с YAML-шапкой; закрытые лежат в tasks/done/<YYYY-MM>/.
// Список задач нигде не хранится: его собирает эта команда (`next`, `list`).
// Формат и поток работы — .claude/docs/tasks-per-file.md.
//
// Использование: bun scripts/tasks.mjs <команда> [аргументы]
//   projects | next [проект…] | list <проект> | show <ID> | new <проект> "<заголовок>"
//   start <ID> --owner <имя> | set <ID> ключ=значение… | block <ID> "<кто: что>" | unblock <ID>
//   note <ID> "<текст>" | done <ID> [--summary "<текст>"] [--dropped]
//   waiting [проект] [--on <кто>] | check [--staged]
// Корень монорепо: --root <dir> или TASKS_ROOT; иначе superproject текущего репозитория.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { parse, stringify } from 'yaml'
import { repoRoot } from './lib/repo-root.mjs'

export const STATUSES = ['idea', 'ready', 'doing', 'blocked', 'review', 'done', 'dropped']
export const SIZES = ['S', 'M', 'L']
export const CLOSED = ['done', 'dropped']
const KEY_ORDER = [
  'id',
  'title',
  'status',
  'size',
  'area',
  'priority',
  'blocked_by',
  'owner',
  'stage',
  'source',
  'created',
  'updated',
  'closed',
]
const STATUS_RU = {
  idea: 'идея',
  ready: 'готова',
  doing: 'в работе',
  blocked: 'ждёт',
  review: 'на проверке',
  done: 'сделана',
  dropped: 'отброшена',
}
const FILE_RE = /^([A-Z]{2,5})-(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/
const ID_RE = /^[A-Z]{2,5}-\d{3,}$/
const SECTIONS = ['Что и зачем', 'Приёмка', 'План', 'Журнал', 'Итог']
const README_MAX_LINES = 120
const BODY_WARN_LINES = 200
const STALE_DAYS = 3
const FROZEN_GROWTH_LIMIT = 5

// ───────────────────────── чистые функции ─────────────────────────

const TRANSLIT = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/** Транслитерация заголовка в slug: латиница, kebab-case, до 40 знаков. */
export function slugify(title) {
  const latin = [...String(title).toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('')
  const slug = latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return slug || 'task'
}

export function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Разбор файла задачи: { meta, body } либо { error }. Тело сохраняется как есть. */
export function parseTask(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) { return { error: 'нет YAML-шапки (--- … ---) в начале файла' } }
  let meta
  try {
    meta = parse(m[1])
  } catch (e) {
    return { error: `шапка не разбирается: ${String(e.message).split('\n')[0]}` }
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) { return { error: 'шапка не является словарём' } }
  return { meta, body: text.slice(m[0].length) }
}

/** Сборка файла: шапка в стабильном порядке ключей + нетронутое тело. */
export function serializeTask(meta, body) {
  const ordered = {}
  for (const key of KEY_ORDER) {
    if (key in meta) { ordered[key] = meta[key] }
  }
  for (const key of Object.keys(meta)) {
    if (!(key in ordered)) { ordered[key] = meta[key] }
  }
  return `---\n${stringify(ordered, { lineWidth: 0 })}---\n${body}`
}

export function matchesFrozen(path, pattern) {
  const re = new RegExp(
    `^${pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`,
  )
  return re.test(path)
}

/** Диапазон строк раздела «## Имя»: { start (строка заголовка), end (первая строка после) }. */
function sectionRange(lines, name) {
  const start = lines.findIndex((l) => l.trim() === `## ${name}`)
  if (start < 0) { return null }
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i
      break
    }
  }
  return { start, end }
}

export function sectionText(body, name) {
  const lines = body.split('\n')
  const r = sectionRange(lines, name)
  if (!r) { return '' }
  return lines.slice(r.start + 1, r.end).join('\n').trim()
}

/** Дописывает строки в конец раздела (создаёт раздел, если его нет). Остальное тело не трогает. */
export function appendToSection(body, name, text) {
  const lines = body.split('\n')
  const r = sectionRange(lines, name)
  if (!r) {
    const base = body.replace(/\s+$/, '')
    return `${base}${base ? '\n\n' : ''}## ${name}\n\n${text}\n`
  }
  let last = r.end - 1
  while (last > r.start && lines[last].trim() === '') { last-- }
  const before = lines.slice(0, last + 1)
  if (last === r.start) { before.push('') }
  const after = lines.slice(r.end)
  const out = [...before, text, ...(after.length ? ['', ...after] : [''])]
  return out.join('\n')
}

export function emptyBody() {
  return SECTIONS.map((s) => `## ${s}\n`).join('\n')
}

/** Проверка одной задачи. relPath — путь внутри tasks/ (`LT-001-x.md` или `done/2026-10/LT-001-x.md`). */
export function validateTask({ relPath, text, project }) {
  const errors = []
  const warnings = []
  const where = `${project.name}: tasks/${relPath}`
  const name = relPath.split('/').pop()
  const nameMatch = FILE_RE.exec(name)
  if (!nameMatch) {
    errors.push(`${where} — имя файла не по шаблону <PREFIX>-<NNN>-<slug>.md`)
  } else if (nameMatch[1] !== project.prefix) {
    errors.push(`${where} — префикс ${nameMatch[1]} не совпадает с tasks.json (${project.prefix})`)
  }
  const parsed = parseTask(text)
  if (parsed.error) {
    errors.push(`${where} — ${parsed.error}`)
    return { errors, warnings, meta: null }
  }
  const { meta, body } = parsed
  for (const key of ['id', 'title', 'status', 'created']) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
      errors.push(`${where} — нет поля ${key}`)
    }
  }
  if (nameMatch && meta.id && meta.id !== `${nameMatch[1]}-${nameMatch[2]}`) {
    errors.push(`${where} — id в шапке (${meta.id}) не совпадает с именем файла`)
  }
  if (meta.status && !STATUSES.includes(meta.status)) {
    errors.push(`${where} — status «${meta.status}» не из списка ${STATUSES.join('|')}`)
  }
  if (meta.size !== undefined && meta.size !== '' && !SIZES.includes(meta.size)) {
    errors.push(`${where} — size «${meta.size}» не из списка ${SIZES.join('|')}`)
  }
  if ((meta.size === undefined || meta.size === '') && meta.status && meta.status !== 'idea') {
    errors.push(`${where} — size пуст, а статус не idea`)
  }
  if (meta.priority !== undefined && !(Number.isInteger(meta.priority) && meta.priority >= 1 && meta.priority <= 4)) {
    errors.push(`${where} — priority должен быть числом 1–4`)
  }
  const blockedBy = meta.blocked_by ?? []
  if (!Array.isArray(blockedBy)) { errors.push(`${where} — blocked_by должен быть списком`) }
  const closed = CLOSED.includes(meta.status)
  const inDone = /^done\/\d{4}-\d{2}\//.test(relPath)
  if (closed && !inDone) { errors.push(`${where} — закрытая задача должна лежать в tasks/done/<ГГГГ-ММ>/`) }
  if (!closed && inDone) { errors.push(`${where} — незакрытая задача лежит в done/`) }
  if (meta.status === 'doing' && !String(meta.owner ?? '').trim()) { errors.push(`${where} — doing без owner`) }
  if (meta.status === 'blocked' && !(Array.isArray(blockedBy) && blockedBy.length)) {
    errors.push(`${where} — blocked без blocked_by`)
  }
  if (closed && !sectionText(body, 'Итог')) { errors.push(`${where} — закрыта, а раздел «Итог» пуст`) }
  const bodyLines = body.split('\n').length
  if (bodyLines > BODY_WARN_LINES) {
    warnings.push(`${where} — тело ${bodyLines} строк (больше ${BODY_WARN_LINES}), режь задачу`)
  }
  if (meta.status === 'doing' && meta.size === 'L') {
    warnings.push(
      `${where} — в работе с размером L: режь до старта`,
    )
  }
  if (meta.status === 'doing' && daysSince(meta.updated) > STALE_DAYS) {
    warnings.push(`${where} — в работе без правок ${daysSince(meta.updated)} дн.`)
  }
  return { errors, warnings, meta }
}

export function daysSince(dateStr) {
  if (!dateStr) { return 0 }
  const t = Date.parse(`${dateStr}T00:00:00`)
  if (Number.isNaN(t)) { return 0 }
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

// ───────────────────────── работа с диском ─────────────────────────

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function gitOk(cwd, args) {
  try {
    git(cwd, args)
    return true
  } catch {
    return false
  }
}

export function resolveRoot(rootArg) {
  if (rootArg) { return rootArg }
  if (process.env.TASKS_ROOT) { return process.env.TASKS_ROOT }
  try {
    const sup = execFileSync('git', ['rev-parse', '--show-superproject-working-tree'], { encoding: 'utf8' }).trim()
    if (sup) { return sup }
  } catch {
    // не git — упадёт ниже в repoRoot
  }
  return repoRoot()
}

function readProjectConfig(dir) {
  const cfgPath = join(dir, 'tasks', 'tasks.json')
  if (!existsSync(cfgPath)) { return null }
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  return { dir, tasksDir: join(dir, 'tasks'), name: cfg.project, prefix: cfg.prefix, frozen: cfg.frozen ?? [] }
}

export function discoverProjects(root) {
  const dirs = [root]
  for (const group of ['apps', 'libs']) {
    const base = join(root, group)
    if (!existsSync(base)) { continue }
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) { dirs.push(join(base, entry.name)) }
    }
  }
  return dirs.map(readProjectConfig).filter(Boolean)
}

function walkTaskFiles(project) {
  const out = []
  const visit = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) { visit(join(abs, entry.name), rel ? `${rel}/${entry.name}` : entry.name) }
      else if (entry.name.endsWith('.md')) { out.push(rel ? `${rel}/${entry.name}` : entry.name) }
    }
  }
  if (existsSync(project.tasksDir)) { visit(project.tasksDir, '') }
  return out.filter((rel) => rel !== 'README.md')
}

/** Загружает все задачи проекта: [{ relPath, abs, meta, body, num }]. Битые файлы пропускаются (их ловит check). */
export function loadTasks(project) {
  const tasks = []
  for (const relPath of walkTaskFiles(project)) {
    const abs = join(project.tasksDir, relPath)
    const parsed = parseTask(readFileSync(abs, 'utf8'))
    if (parsed.error || !parsed.meta.id) { continue }
    const num = Number(/-(\d+)$/.exec(parsed.meta.id)?.[1] ?? 0)
    tasks.push({ relPath, abs, meta: parsed.meta, body: parsed.body, num, project })
  }
  return tasks
}

export function nextNumber(project) {
  let max = 0
  for (const relPath of walkTaskFiles(project)) {
    const m = FILE_RE.exec(relPath.split('/').pop())
    if (m && m[1] === project.prefix) { max = Math.max(max, Number(m[2])) }
  }
  return max + 1
}

function loadAll(root) {
  const projects = discoverProjects(root)
  const byId = new Map()
  for (const project of projects) {
    project.tasks = loadTasks(project)
    for (const t of project.tasks) { byId.set(t.meta.id, t) }
  }
  return { projects, byId }
}

function findProject(projects, name) {
  const p = projects.find((x) => x.name === name || x.prefix === name)
  if (!p) {
    throw new Error(
      `проект «${name}» не найден (известные: ${projects.map((x) => x.name).join(', ') || 'нет'})`,
    )
  }
  return p
}

function findTask(all, id) {
  const t = all.byId.get(id)
  if (!t) { throw new Error(`задача ${id} не найдена`) }
  return t
}

function isUnblocked(task, byId) {
  return (task.meta.blocked_by ?? []).every((b) => {
    if (!ID_RE.test(String(b))) { return false }
    const dep = byId.get(b)
    return dep && CLOSED.includes(dep.meta.status)
  })
}

function saveTask(task, meta, body) {
  meta.updated = today()
  writeFileSync(task.abs, serializeTask(meta, body))
}

// ───────────────────────── вывод ─────────────────────────

function line(t) {
  const size = (t.meta.size || '-').padEnd(1)
  return `${t.meta.id.padEnd(8)}${size}  P${t.meta.priority ?? 3}  ${t.meta.title}`
}

function sortQueue(a, b) {
  return (a.meta.priority ?? 3) - (b.meta.priority ?? 3) || a.num - b.num
}

function whoWaits(entry) {
  const s = String(entry)
  if (ID_RE.test(s)) { return 'задачи' }
  const i = s.indexOf(':')
  return i > 0 ? s.slice(0, i).trim() : 'прочие'
}

function renderNext(project, byId) {
  const open = project.tasks.filter((t) => !CLOSED.includes(t.meta.status))
  const doing = open.filter((t) => t.meta.status === 'doing').sort(sortQueue)
  const take = open.filter((t) => t.meta.status === 'ready' && isUnblocked(t, byId)).sort(sortQueue)
  const waiting = open.filter((t) =>
    t.meta.status === 'blocked' || (t.meta.status === 'ready' && !isUnblocked(t, byId))
  )
  const ideas = open.filter((t) => t.meta.status === 'idea')
  const review = open.filter((t) => t.meta.status === 'review')
  const out = []
  out.push(
    `${project.name} · в работе ${doing.length} · можно брать ${take.length} · ждут ${waiting.length} · идеи ${ideas.length}`
      + (review.length ? ` · на проверке ${review.length}` : ''),
  )
  if (doing.length) {
    out.push('', 'В РАБОТЕ')
    for (const t of doing) {
      out.push(`${line(t)}   ${t.meta.owner || '?'} · ${daysSince(t.meta.created)} дн.`)
    }
  }
  if (review.length) {
    out.push('', 'НА ПРОВЕРКЕ')
    for (const t of review.sort(sortQueue)) { out.push(line(t)) }
  }
  if (take.length) {
    out.push('', 'МОЖНО БРАТЬ')
    for (const t of take.slice(0, 10)) { out.push(`${line(t)}${t.meta.area ? `   ${t.meta.area}` : ''}`) }
    if (take.length > 10) {
      out.push(`(ещё ${take.length - 10}: bun scripts/tasks.mjs list ${project.name} --status ready)`)
    }
  }
  if (waiting.length) {
    const groups = new Map()
    for (const t of waiting) {
      const whos = new Set((t.meta.blocked_by ?? []).map(whoWaits))
      for (const w of whos.size ? whos : ['прочие']) { groups.set(w, (groups.get(w) ?? 0) + 1) }
    }
    const summary = [...groups].map(([w, n]) => `${w} ${n}`).join(' · ')
    out.push('', `ЖДУТ: ${summary}   → bun scripts/tasks.mjs waiting ${project.name}`)
  }
  const warn = []
  for (const t of doing) {
    if (daysSince(t.meta.updated) > STALE_DAYS) {
      warn.push(`⚠ ${t.meta.id} в работе без правок ${daysSince(t.meta.updated)} дн.`)
    }
  }
  if (warn.length) { out.push('', ...warn) }
  const compass = join(project.tasksDir, 'README.md')
  if (existsSync(compass)) { out.push(`Компас: ${relative(process.cwd(), compass).replaceAll('\\', '/')}`) }
  return out.join('\n')
}

// ───────────────────────── check ─────────────────────────

function checkReadmeLength(project, text) {
  const n = text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
  return n > README_MAX_LINES ? [`${project.name}: tasks/README.md — ${n} строк (лимит ${README_MAX_LINES})`] : []
}

function checkProjectsUnique(projects) {
  const errors = []
  const names = new Map()
  const prefixes = new Map()
  for (const p of projects) {
    if (!/^[A-Z]{2,5}$/.test(String(p.prefix))) {
      errors.push(`${p.name}: prefix «${p.prefix}» не по шаблону ^[A-Z]{2,5}$`)
    }
    if (names.has(p.name)) { errors.push(`имя проекта ${p.name} повторяется (${names.get(p.name)} и ${p.dir})`) }
    if (prefixes.has(p.prefix)) {
      errors.push(`префикс ${p.prefix} повторяется у ${prefixes.get(p.prefix)} и ${p.name}`)
    }
    names.set(p.name, p.dir)
    prefixes.set(p.prefix, p.name)
  }
  return errors
}

function checkWorktree(root) {
  const errors = []
  const warnings = []
  const projects = discoverProjects(root)
  errors.push(...checkProjectsUnique(projects))
  for (const project of projects) {
    const ids = new Map()
    for (const relPath of walkTaskFiles(project)) {
      const res = validateTask({ relPath, text: readFileSync(join(project.tasksDir, relPath), 'utf8'), project })
      errors.push(...res.errors)
      warnings.push(...res.warnings)
      const id = res.meta?.id
      if (id) {
        if (ids.has(id)) { errors.push(`${project.name}: id ${id} повторяется (${ids.get(id)} и ${relPath})`) }
        ids.set(id, relPath)
      }
    }
    const readme = join(project.tasksDir, 'README.md')
    if (existsSync(readme)) { errors.push(...checkReadmeLength(project, readFileSync(readme, 'utf8'))) }
  }
  return { errors, warnings, count: projects.length }
}

/** Режим pre-commit: работает в текущем репозитории (может быть submodule), читает ИНДЕКС. */
function checkStaged() {
  const top = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim()
  const errors = []
  const warnings = []
  const staged = git(top, ['diff', '--cached', '--name-only', '--no-renames', '-z']).split('\0').filter(Boolean)
  const tracked = git(top, ['ls-files', '-z']).split('\0').filter(Boolean)
  const show = (p) => git(top, ['show', `:${p}`])
  const cfgPaths = tracked.filter((p) => /(^|\/)tasks\/tasks\.json$/.test(p))
  const projects = []
  for (const cfgPath of cfgPaths) {
    const cfg = JSON.parse(show(cfgPath))
    const dir = cfgPath.replace(/tasks\/tasks\.json$/, '').replace(/\/$/, '')
    projects.push({ dir, name: cfg.project, prefix: cfg.prefix, frozen: cfg.frozen ?? [] })
  }
  errors.push(...checkProjectsUnique(projects))
  const allowGrowth = process.env.GIT_ALLOW_FROZEN_PLAN_GROWTH === '1'
  for (const project of projects) {
    const base = project.dir ? `${project.dir}/` : ''
    const taskPrefix = `${base}tasks/`
    const taskFiles = tracked.filter((p) =>
      p.startsWith(taskPrefix) && p.endsWith('.md') && p !== `${taskPrefix}README.md`
    )
    const idByFile = new Map()
    for (const full of taskFiles) {
      const rel = full.slice(taskPrefix.length)
      const m = /-(\d+)-/.exec(rel.split('/').pop())
      const key = `${rel.split('/').pop().split('-').slice(0, 2).join('-')}`
      if (m) {
        if (idByFile.has(key) && idByFile.get(key) !== full) {
          errors.push(`${project.name}: id ${key} повторяется (${idByFile.get(key)} и ${full})`)
        }
        idByFile.set(key, full)
      }
    }
    for (const full of staged) {
      if (!tracked.includes(full)) { continue }
      if (full === `${taskPrefix}README.md`) {
        errors.push(...checkReadmeLength(project, show(full)))
      } else if (taskFiles.includes(full)) {
        const res = validateTask({ relPath: full.slice(taskPrefix.length), text: show(full), project })
        errors.push(...res.errors)
        warnings.push(...res.warnings)
      }
      const relToProject = project.dir ? full.slice(base.length) : full
      if (!full.startsWith(base)) { continue }
      if (project.frozen.some((pattern) => matchesFrozen(relToProject, pattern))) {
        const stat = git(top, ['diff', '--cached', '--numstat', '--no-renames', '--', full]).trim().split('\t')
        const growth = Number(stat[0]) - Number(stat[1])
        if (growth > FROZEN_GROWTH_LIMIT) {
          const msg =
            `${full} — файл заморожен: рост на ${growth} строк. Задачу заведи через \`tasks new\`, журнал и итог пиши в файл задачи`
          if (allowGrowth) { warnings.push(`${msg} (пропущено: GIT_ALLOW_FROZEN_PLAN_GROWTH=1)`) }
          else { errors.push(msg) }
        }
      }
    }
  }
  return { errors, warnings, count: projects.length }
}

// ───────────────────────── CLI ─────────────────────────

const BOOL_FLAGS = new Set(['staged', 'dropped'])

export function parseArgs(argv) {
  const pos = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      if (BOOL_FLAGS.has(key)) {
        flags[key] = true
      } else {
        const val = argv[++i]
        if (val === undefined) { throw new Error(`у флага --${key} нет значения`) }
        flags[key] = key === 'blocked-by' ? [...(flags[key] ?? []), val] : val
      }
    } else {
      pos.push(a)
    }
  }
  return { pos, flags }
}

function need(value, what) {
  if (value === undefined || value === '') { throw new Error(`не хватает аргумента: ${what}`) }
  return value
}

function validateField(key, value) {
  if (key === 'status') {
    if (!STATUSES.includes(value)) { throw new Error(`status «${value}» не из списка ${STATUSES.join('|')}`) }
    if (CLOSED.includes(value)) { throw new Error('закрывать — командой `done`, не `set`') }
    return value
  }
  if (key === 'size') {
    if (value !== '' && !SIZES.includes(value)) { throw new Error(`size «${value}» не из списка ${SIZES.join('|')}`) }
    return value
  }
  if (key === 'priority') {
    const n = Number(value)
    if (!(Number.isInteger(n) && n >= 1 && n <= 4)) { throw new Error('priority — число 1–4') }
    return n
  }
  if (key === 'blocked_by') { return value === '' ? [] : value.split(';').map((s) => s.trim()).filter(Boolean) }
  if (['title', 'area', 'owner', 'stage', 'source'].includes(key)) { return value }
  throw new Error(`поле «${key}» через set менять нельзя`)
}

function run(argv) {
  const { pos, flags } = parseArgs(argv)
  const [cmd, ...args] = pos
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(
      readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join(
        '\n',
      ),
    )
    return 0
  }
  if (cmd === 'check' && flags.staged) {
    return report(checkStaged())
  }
  const root = resolveRoot(flags.root)
  if (cmd === 'check') { return report(checkWorktree(root)) }
  const all = loadAll(root)

  switch (cmd) {
    case 'projects': {
      for (const p of all.projects) {
        const counts = {}
        for (const t of p.tasks) { counts[t.meta.status] = (counts[t.meta.status] ?? 0) + 1 }
        const summary = STATUSES.filter((s) => counts[s]).map((s) => `${s} ${counts[s]}`).join(' · ')
        console.log(
          `${p.name.padEnd(22)}${p.prefix.padEnd(6)}${relative(root, p.dir).replaceAll('\\', '/') || '.'}   ${
            summary || 'пусто'
          }`,
        )
      }
      return 0
    }
    case 'next': {
      const targets = args.length ? args.map((n) => findProject(all.projects, n)) : all.projects
      console.log(targets.map((p) => renderNext(p, all.byId)).join('\n\n'))
      return 0
    }
    case 'list': {
      const p = findProject(all.projects, need(args[0], 'проект'))
      let tasks = p.tasks
      if (flags.status) { tasks = tasks.filter((t) => t.meta.status === flags.status) }
      if (flags.area) { tasks = tasks.filter((t) => t.meta.area === flags.area) }
      for (const t of tasks.sort(sortQueue)) { console.log(`${line(t)}   [${t.meta.status}]`) }
      return 0
    }
    case 'show': {
      const t = findTask(all, need(args[0], 'ID'))
      console.log(relative(process.cwd(), t.abs).replaceAll('\\', '/'))
      console.log(readFileSync(t.abs, 'utf8'))
      return 0
    }
    case 'new': {
      const p = findProject(all.projects, need(args[0], 'проект'))
      const title = need(args[1], 'заголовок')
      const status = flags.status ?? 'idea'
      if (!STATUSES.includes(status) || CLOSED.includes(status)) {
        throw new Error(`status «${status}» для новой задачи недопустим`)
      }
      const meta = {
        id: `${p.prefix}-${String(nextNumber(p)).padStart(3, '0')}`,
        title,
        status,
        size: validateField('size', flags.size ?? ''),
        area: flags.area ?? '',
        priority: flags.priority ? validateField('priority', flags.priority) : 3,
        blocked_by: flags['blocked-by'] ? validateField('blocked_by', flags['blocked-by'].join(';')) : [],
        owner: '',
        stage: '',
        source: flags.source ?? '',
        created: today(),
        updated: today(),
      }
      if (meta.status === 'blocked' && !meta.blocked_by.length) {
        throw new Error('для status=blocked нужен --blocked-by')
      }
      if (meta.status !== 'idea' && !meta.size) {
        throw new Error(
          'для статуса, отличного от idea, нужен --size S|M|L',
        )
      }
      const slug = flags.slug ? slugify(flags.slug) : slugify(title)
      mkdirSync(p.tasksDir, { recursive: true })
      const abs = join(p.tasksDir, `${meta.id}-${slug}.md`)
      writeFileSync(abs, serializeTask(meta, `\n${emptyBody()}`))
      console.log(`${meta.id} ${relative(process.cwd(), abs).replaceAll('\\', '/')}`)
      return 0
    }
    case 'start': {
      const t = findTask(all, need(args[0], 'ID'))
      const owner = need(flags.owner, '--owner <имя>')
      if (CLOSED.includes(t.meta.status)) { throw new Error(`${t.meta.id} уже закрыта`) }
      const meta = { ...t.meta, status: 'doing', owner }
      saveTask(t, meta, t.body)
      console.log(`${meta.id} → в работе (${owner})`)
      return 0
    }
    case 'set': {
      const t = findTask(all, need(args[0], 'ID'))
      const meta = { ...t.meta }
      const pairs = args.slice(1)
      if (!pairs.length) { throw new Error('не хватает аргумента: ключ=значение') }
      for (const pair of pairs) {
        const i = pair.indexOf('=')
        if (i < 1) { throw new Error(`«${pair}» — нужен вид ключ=значение`) }
        const key = pair.slice(0, i)
        meta[key] = validateField(key, pair.slice(i + 1))
      }
      saveTask(t, meta, t.body)
      console.log(`${meta.id} обновлена`)
      return 0
    }
    case 'block': {
      const t = findTask(all, need(args[0], 'ID'))
      const who = need(args[1], '"кто: чего ждём"')
      const meta = { ...t.meta, status: 'blocked', blocked_by: [...(t.meta.blocked_by ?? []), who] }
      saveTask(t, meta, t.body)
      console.log(`${meta.id} → ждёт (${who})`)
      return 0
    }
    case 'unblock': {
      const t = findTask(all, need(args[0], 'ID'))
      const meta = { ...t.meta, blocked_by: [] }
      if (meta.status === 'blocked') { meta.status = 'ready' }
      saveTask(t, meta, t.body)
      console.log(`${meta.id} → ${meta.status}`)
      return 0
    }
    case 'note': {
      const t = findTask(all, need(args[0], 'ID'))
      const text = need(args[1], '"текст"')
      saveTask(t, { ...t.meta }, appendToSection(t.body, 'Журнал', `- ${today()}: ${text}`))
      console.log(`${t.meta.id}: запись в журнал добавлена`)
      return 0
    }
    case 'done': {
      const t = findTask(all, need(args[0], 'ID'))
      let body = t.body
      if (flags.summary) { body = appendToSection(body, 'Итог', flags.summary) }
      if (!sectionText(body, 'Итог')) {
        throw new Error(`раздел «Итог» пуст: впиши итог в файл или передай --summary "<текст>"`)
      }
      const status = flags.dropped ? 'dropped' : 'done'
      const meta = { ...t.meta, status, closed: today() }
      saveTask(t, meta, body)
      const dest = join(t.project.tasksDir, 'done', today().slice(0, 7), t.abs.split(/[\\/]/).pop())
      if (dest !== t.abs) {
        mkdirSync(dirname(dest), { recursive: true })
        const relToProject = relative(t.project.dir, t.abs).replaceAll('\\', '/')
        if (gitOk(t.project.dir, ['ls-files', '--error-unmatch', '--', relToProject])) {
          git(t.project.dir, ['mv', '--', relToProject, relative(t.project.dir, dest).replaceAll('\\', '/')])
        } else {
          renameSync(t.abs, dest)
        }
      }
      console.log(`${meta.id} → ${status}, файл: ${relative(process.cwd(), dest).replaceAll('\\', '/')}`)
      if (meta.stage) {
        console.log(`Напоминание: time_stage_close({ app: "${t.project.name}", stage: "${meta.stage}" })`)
      }
      return 0
    }
    case 'waiting': {
      const targets = args[0] ? [findProject(all.projects, args[0])] : all.projects
      const groups = new Map()
      for (const p of targets) {
        for (const t of p.tasks) {
          if (t.meta.status !== 'blocked') { continue }
          for (const entry of t.meta.blocked_by ?? []) {
            const who = whoWaits(entry)
            if (flags.on && who !== flags.on) { continue }
            if (!groups.has(who)) { groups.set(who, []) }
            groups.get(who).push(`${line(t)}   ← ${entry}`)
          }
        }
      }
      if (!groups.size) { console.log('Никто никого не ждёт.') }
      for (const [who, rows] of groups) {
        console.log(
          `${who} (${rows.length})\n${rows.map((r) => `  ${r}`).join('\n')}`,
        )
      }
      return 0
    }
    default:
      throw new Error(`неизвестная команда «${cmd}» (bun scripts/tasks.mjs help)`)
  }
}

function report({ errors, warnings, count }) {
  for (const w of warnings) { console.warn(`⚠️  ${w}`) }
  for (const e of errors) { console.error(`❌ ${e}`) }
  if (errors.length) {
    console.error(`Ошибок: ${errors.length}`)
    return 1
  }
  console.log(`Очереди задач в порядке (проектов: ${count})`)
  return 0
}

if (import.meta.main) {
  try {
    process.exit(run(process.argv.slice(2)))
  } catch (e) {
    console.error(`❌ ${e.message}`)
    process.exit(1)
  }
}
