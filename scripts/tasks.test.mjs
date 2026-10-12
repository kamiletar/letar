// Тесты scripts/tasks.mjs. Запуск: bun test scripts/tasks.test.mjs
// CLI вызывается с --root <tmp>; сам скрипт не копируется — иначе не найдётся пакет `yaml`.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendToSection, emptyBody, matchesFrozen, parseTask, sectionText, slugify } from './tasks.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'tasks.mjs')

let tmp
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'tasks-test-'))
})
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function cli(args, { cwd = tmp, env = {}, root = true } = {}) {
  const full = root ? [...args, '--root', tmp] : args
  const r = spawnSync('bun', [SCRIPT, ...full], { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

function project(dir, name, prefix, frozen = []) {
  mkdirSync(join(dir, 'tasks'), { recursive: true })
  writeFileSync(join(dir, 'tasks', 'tasks.json'), JSON.stringify({ project: name, prefix, frozen }))
}

function taskFile(dir, relPath, meta, body = '\n## Что и зачем\n\nтекст\n\n## Итог\n') {
  const m = {
    id: 'LT-001',
    title: 'Тест',
    status: 'ready',
    size: 'S',
    area: 'x',
    priority: 3,
    blocked_by: [],
    owner: '',
    stage: '',
    source: '',
    created: '2026-10-01',
    updated: '2026-10-01',
    ...meta,
  }
  const yaml = Object.entries(m).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')
  const abs = join(dir, 'tasks', relPath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, `---\n${yaml}\n---\n${body}`)
  return abs
}

describe('чистые функции', () => {
  test('slugify: кириллица и кавычки', () => {
    expect(slugify('Пометка «без НДС» на витрине')).toBe('pometka-bez-nds-na-vitrine')
    expect(slugify('!!!')).toBe('task')
    expect(slugify('а'.repeat(100)).length).toBeLessThanOrEqual(40)
  })
  test('parseTask: тело сохраняется как есть', () => {
    const r = parseTask('---\nid: LT-001\n---\n\n## Итог\n\nтекст\n')
    expect(r.meta.id).toBe('LT-001')
    expect(r.body).toBe('\n## Итог\n\nтекст\n')
    expect(parseTask('нет шапки').error).toBeTruthy()
  })
  test('appendToSection: дописывает только в свой раздел', () => {
    const body = `\n${emptyBody()}`
    const out = appendToSection(body, 'Журнал', '- запись')
    expect(sectionText(out, 'Журнал')).toBe('- запись')
    expect(sectionText(out, 'Итог')).toBe('')
    expect(sectionText(out, 'План')).toBe('')
  })
  test('matchesFrozen: * не пересекает /', () => {
    expect(matchesFrozen('docs/plans/PLAN-INFRA-1.md', 'docs/plans/PLAN-INFRA*.md')).toBe(true)
    expect(matchesFrozen('docs/plans/sub/PLAN-INFRA-1.md', 'docs/plans/PLAN-INFRA*.md')).toBe(false)
    expect(matchesFrozen('PLAN.md', 'PLAN.md')).toBe(true)
  })
})

describe('команды', () => {
  test('new: номер учитывает done/, шапка и slug', () => {
    project(tmp, 'letar', 'LT')
    taskFile(
      tmp,
      'done/2026-09/LT-007-old.md',
      { id: 'LT-007', status: 'done', closed: '2026-09-30' },
      '\n## Итог\n\nготово\n',
    )
    const r = cli(['new', 'letar', 'Пометка «без НДС»', '--size', 'S', '--status', 'ready'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('LT-008')
    const file = readdirSync(join(tmp, 'tasks')).find((f) => f.startsWith('LT-008-'))
    expect(file).toBe('LT-008-pometka-bez-nds.md')
    const text = readFileSync(join(tmp, 'tasks', file), 'utf8')
    expect(text).toContain('id: LT-008')
    expect(text).toContain('## Журнал')
  })

  test('start без --owner — ошибка', () => {
    project(tmp, 'letar', 'LT')
    taskFile(tmp, 'LT-001-a.md', {})
    expect(cli(['start', 'LT-001']).code).toBe(1)
    const ok = cli(['start', 'LT-001', '--owner', 'repo-dev'])
    expect(ok.code).toBe(0)
    expect(readFileSync(join(tmp, 'tasks', 'LT-001-a.md'), 'utf8')).toContain('status: doing')
  })

  test('note дописывает в «Журнал» и не трогает остальное тело', () => {
    project(tmp, 'letar', 'LT')
    const abs = taskFile(tmp, 'LT-001-a.md', {}, '\n## Что и зачем\n\nописание\n\n## Журнал\n\n## Итог\n')
    expect(cli(['note', 'LT-001', 'сделал шаг']).code).toBe(0)
    const body = parseTask(readFileSync(abs, 'utf8')).body
    expect(sectionText(body, 'Журнал')).toMatch(/^- \d{4}-\d{2}-\d{2}: сделал шаг$/)
    expect(sectionText(body, 'Что и зачем')).toBe('описание')
  })

  test('done: без «Итога» — ошибка; с --summary — файл в done/<ГГГГ-ММ>/', () => {
    project(tmp, 'letar', 'LT')
    taskFile(tmp, 'LT-001-a.md', {}, '\n## Итог\n')
    expect(cli(['done', 'LT-001']).code).toBe(1)
    const ok = cli(['done', 'LT-001', '--summary', 'готово'])
    expect(ok.code).toBe(0)
    const month = new Date().toISOString().slice(0, 4)
    const dir = join(tmp, 'tasks', 'done')
    const sub = readdirSync(dir)[0]
    expect(sub.startsWith(month)).toBe(true)
    const text = readFileSync(join(dir, sub, 'LT-001-a.md'), 'utf8')
    expect(text).toContain('status: done')
    expect(text).toContain('closed:')
    expect(existsSync(join(tmp, 'tasks', 'LT-001-a.md'))).toBe(false)
  })

  test('next: блокер скрывает задачу, после done блокера она появляется', () => {
    project(tmp, 'letar', 'LT')
    taskFile(tmp, 'LT-001-a.md', { id: 'LT-001', title: 'Первая' })
    taskFile(tmp, 'LT-002-b.md', { id: 'LT-002', title: 'Вторая', blocked_by: ['LT-001'] })
    let out = cli(['next', 'letar']).out
    expect(out).toContain('Первая')
    expect(out.split('МОЖНО БРАТЬ')[1].split('ЖДУТ')[0]).not.toContain('Вторая')
    expect(cli(['done', 'LT-001', '--summary', 'ок']).code).toBe(0)
    out = cli(['next', 'letar']).out
    expect(out).toContain('Вторая')
  })

  test('проект в apps/x/tasks находится; waiting --on группирует', () => {
    project(join(tmp, 'apps', 'x'), 'x', 'XX')
    taskFile(join(tmp, 'apps', 'x'), 'XX-001-a.md', { id: 'XX-001', status: 'blocked', blocked_by: ['kami: решение'] })
    taskFile(join(tmp, 'apps', 'x'), 'XX-002-b.md', {
      id: 'XX-002',
      status: 'blocked',
      blocked_by: ['upstream: релиз'],
    })
    expect(cli(['projects']).out).toContain('apps/x')
    const w = cli(['waiting', '--on', 'kami']).out
    expect(w).toContain('XX-001')
    expect(w).not.toContain('XX-002')
  })
})

describe('check', () => {
  test('ловит неверный статус, id ≠ имя, закрытую вне done/, дубль id', () => {
    project(tmp, 'letar', 'LT')
    taskFile(tmp, 'LT-001-a.md', { id: 'LT-001', status: 'wat' })
    taskFile(tmp, 'LT-002-b.md', { id: 'LT-009' })
    taskFile(tmp, 'LT-003-c.md', { id: 'LT-003', status: 'done' }, '\n## Итог\n\nок\n')
    taskFile(tmp, 'LT-004-d.md', { id: 'LT-004' })
    taskFile(tmp, 'done/2026-10/LT-004-e.md', { id: 'LT-004', status: 'done' }, '\n## Итог\n\nок\n')
    const r = cli(['check'])
    expect(r.code).toBe(1)
    expect(r.err).toContain('status «wat»')
    expect(r.err).toContain('не совпадает с именем файла')
    expect(r.err).toContain('должна лежать в tasks/done/')
    expect(r.err).toContain('id LT-004 повторяется')
  })

  test('doing без owner и blocked без blocked_by — ошибки', () => {
    project(tmp, 'letar', 'LT')
    taskFile(tmp, 'LT-001-a.md', { id: 'LT-001', status: 'doing' })
    taskFile(tmp, 'LT-002-b.md', { id: 'LT-002', status: 'blocked' })
    const r = cli(['check'])
    expect(r.err).toContain('doing без owner')
    expect(r.err).toContain('blocked без blocked_by')
  })

  test('README.md в 121 строку — ошибка, в 120 — нет', () => {
    project(tmp, 'letar', 'LT')
    writeFileSync(join(tmp, 'tasks', 'README.md'), 'x\n'.repeat(120))
    expect(cli(['check']).code).toBe(0)
    writeFileSync(join(tmp, 'tasks', 'README.md'), 'x\n'.repeat(121))
    const r = cli(['check'])
    expect(r.code).toBe(1)
    expect(r.err).toContain('121 строк')
  })

  test('два проекта с одним префиксом — ошибка', () => {
    project(tmp, 'letar', 'LT')
    project(join(tmp, 'apps', 'x'), 'x', 'LT')
    const r = cli(['check'])
    expect(r.code).toBe(1)
    expect(r.err).toContain('префикс LT повторяется')
  })
})

describe('check --staged', () => {
  function sh(args) {
    const r = spawnSync('git', args, { cwd: tmp, encoding: 'utf8' })
    if (r.status !== 0) { throw new Error(r.stderr) }
  }
  function repo() {
    sh(['init', '-q'])
    sh(['config', 'user.email', 't@t'])
    sh(['config', 'user.name', 't'])
    project(tmp, 'letar', 'LT', ['PLAN.md'])
    writeFileSync(join(tmp, 'PLAN.md'), '# План\n')
    sh(['add', '.'])
    sh(['commit', '-q', '-m', 'init'])
  }
  const grow = (n) => {
    writeFileSync(join(tmp, 'PLAN.md'), `# План\n${'строка\n'.repeat(n)}`)
    sh(['add', 'PLAN.md'])
  }
  const staged = (env) => cli(['check', '--staged'], { root: false, env })

  test('рост замороженного файла на 6 строк — код 1, на 5 — код 0', () => {
    repo()
    grow(6)
    const bad = staged()
    expect(bad.code).toBe(1)
    expect(bad.err).toContain('заморожен')
    grow(5)
    expect(staged().code).toBe(0)
  })

  test('GIT_ALLOW_FROZEN_PLAN_GROWTH=1 — код 0 и предупреждение', () => {
    repo()
    grow(10)
    const r = staged({ GIT_ALLOW_FROZEN_PLAN_GROWTH: '1' })
    expect(r.code).toBe(0)
    expect(r.err).toContain('GIT_ALLOW_FROZEN_PLAN_GROWTH')
  })

  test('застейдженная задача с неверным статусом ловится из индекса', () => {
    repo()
    taskFile(tmp, 'LT-001-a.md', { id: 'LT-001', status: 'wat' })
    sh(['add', 'tasks/LT-001-a.md'])
    const r = staged()
    expect(r.code).toBe(1)
    expect(r.err).toContain('status «wat»')
  })
})
