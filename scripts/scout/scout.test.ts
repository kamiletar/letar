import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  Bm25,
  buildIndex,
  type Card,
  collectCards,
  DenseIndex,
  mentionedIn,
  scout,
  type ScoutResult,
} from '../../libs/scout/src/index'
import { splitOf } from './bench'
import { buildCases, evaluate } from './eval'
import { abGroup, appendLog, decide, MAX_ATTEMPTS, runScoutHook, scoutQuery } from './hook-core'
import { indexPath } from './index-store'
import { mineSession, normalizeKnowledgePath, parseHumanText, type SessionRecord } from './mine-transcripts'
import { EMBED_MODEL, loadVectorStore } from './vectors'

describe('decide', () => {
  const fresh = { attempts: 0, briefed: false }

  it('ищет по содержательному сообщению', () => {
    expect(decide('сделай форму заявки с датой', fresh)).toEqual({
      action: 'run',
      query: 'сделай форму заявки с датой',
    })
  })

  it('короткое сообщение тратит попытку, служебное — нет', () => {
    expect(decide('продолжай', fresh)).toMatchObject({ action: 'skip', reason: 'short', countsAttempt: true })
    expect(decide('<task-notification>…', fresh)).toMatchObject({
      action: 'skip',
      reason: 'service',
      countsAttempt: false,
    })
  })

  it('команда: задача в аргументах, голая команда пропускается', () => {
    expect(decide('/app починить деплой после обновления', fresh)).toEqual({
      action: 'run',
      query: '/app починить деплой после обновления',
    })
    expect(decide('/app', fresh)).toMatchObject({ action: 'skip', reason: 'no-args' })
  })

  it('одна справка на сессию и не больше трёх попыток', () => {
    expect(decide('сделай форму заявки с датой', { attempts: 1, briefed: true })).toMatchObject({ reason: 'briefed' })
    expect(decide('сделай форму заявки с датой', { attempts: MAX_ATTEMPTS, briefed: false })).toMatchObject({
      reason: 'exhausted',
    })
  })
})

describe('abGroup', () => {
  it('стабилен для сессии и делит поток примерно пополам', () => {
    expect(abGroup('abc')).toBe(abGroup('abc'))
    const groups = Array.from({ length: 400 }, (_, i) => abGroup(`s${i}`))
    const a = groups.filter((g) => g === 'A').length
    expect(a).toBeGreaterThan(150)
    expect(a).toBeLessThan(250)
  })
})

describe('разбор транскрипта', () => {
  it('сводит пути доков к виду от корня, приватные отбрасывает', () => {
    expect(normalizeKnowledgePath('C:\\web\\repo\\.claude\\docs\\forms.md')).toBe('.claude/docs/forms.md')
    expect(normalizeKnowledgePath('/x/.claude/worktrees/w1/.claude/rules/git.md')).toBe('.claude/rules/git.md')
    expect(normalizeKnowledgePath('C:/repo/.claude/private/docs/secret.md')).toBeUndefined()
    expect(normalizeKnowledgePath('C:/repo/src/index.ts')).toBeUndefined()
  })

  it('берёт задачу из аргументов команды и отбрасывает служебные вставки', () => {
    expect(
      parseHumanText(
        '<command-message>app</command-message>\n<command-name>/app</command-name>\n<command-args>починить вход</command-args>',
      ),
    )
      .toEqual({ text: 'починить вход', command: 'app' })
    expect(parseHumanText('<system-reminder>x</system-reminder>')).toBeUndefined()
  })

  it('mineSession: задача, доки до первой правки, скилы и субагенты, сайдчейны мимо', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scout-mine-'))
    const file = join(dir, 's.jsonl')
    const user = (text: string, extra = {}) => ({
      type: 'user',
      origin: { kind: 'human' },
      sessionId: 's1',
      timestamp: '2026-09-30T00:00:00Z',
      cwd: 'C:\\repo',
      message: { content: text },
      ...extra,
    })
    const tool = (name: string, input: object, extra = {}) => ({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name, input }] },
      ...extra,
    })
    const rows = [
      { type: 'attachment', attachment: {} },
      user('<system-reminder>шум</system-reminder>'),
      user('Сделай форму заявки с полем даты'),
      tool('Read', { file_path: 'C:\\repo\\.claude\\docs\\forms.md' }),
      tool('Skill', { skill: 'form-pipeline' }),
      tool('Read', { file_path: 'C:\\repo\\.claude\\docs\\secret.md' }, { isSidechain: true }),
      tool('Edit', { file_path: 'C:\\repo\\a.ts' }),
      tool('Read', { file_path: 'C:\\repo\\.claude\\rules\\git.md' }),
      tool('Agent', { subagent_type: 'code-quality-gate' }),
      user('нет, поле должно быть необязательным'),
      user('[Request interrupted by user]'),
    ]
    writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n'))
    const rec = await mineSession(file)
    expect(rec).toMatchObject({
      sessionId: 's1',
      task: 'Сделай форму заявки с полем даты',
      skills: ['form-pipeline'],
      agents: ['code-quality-gate'],
      followups: ['нет, поле должно быть необязательным'],
      interrupts: 1,
      firstEditStep: 3,
    })
    expect(rec?.docsRead).toEqual([
      { path: '.claude/docs/forms.md', step: 1, beforeEdit: true },
      { path: '.claude/rules/git.md', step: 4, beforeEdit: false },
    ])
  })
})

describe('buildCases', () => {
  it('эталон — известные доки до первой правки и проектные инструменты', () => {
    const session = {
      sessionId: 's',
      startedAt: '',
      cwd: '',
      task: 'сделай форму заявки с датой',
      docsRead: [
        { path: '.claude/docs/forms.md', step: 1, beforeEdit: true },
        { path: '.claude/docs/late.md', step: 9, beforeEdit: false },
        { path: '.claude/docs/deleted.md', step: 2, beforeEdit: true },
      ],
      skills: ['form-pipeline'],
      agents: ['general-purpose'],
      commands: [],
      followups: [],
      interrupts: 0,
      toolCalls: 10,
    } satisfies SessionRecord
    const known = new Set(['.claude/docs/forms.md', '.claude/docs/late.md'])
    expect(buildCases([session], known, new Set(['form-pipeline']))).toEqual([
      {
        sessionId: 's',
        query: 'сделай форму заявки с датой',
        goldDocs: ['.claude/docs/forms.md'],
        goldTools: ['form-pipeline'],
      },
    ])
  })
})

describe('runScoutHook', () => {
  function fakeRepo() {
    const root = mkdtempSync(join(tmpdir(), 'scout-repo-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    writeFileSync(join(root, 'nx.json'), '{}')
    writeFileSync(
      join(root, '.claude', 'docs', 'INDEX.md'),
      '## Формы\n- [date-field](/.claude/docs/date-field.md) ⚠️ поле даты в форме отдаёт строку\n',
    )
    writeFileSync(
      join(root, '.claude', 'docs', 'date-field.md'),
      '# Дата строкой\n## Симптом\nформа отдаёт дату строкой в onSubmit\n',
    )
    return { root, home: mkdtempSync(join(tmpdir(), 'scout-home-')) }
  }

  it('тень: справка считается и пишется в лог, агенту ничего не уходит', async () => {
    const { root, home } = fakeRepo()
    process.env.SCOUT_MODE = 'shadow'
    const run = await runScoutHook({ session_id: 'a', prompt: 'форма отдаёт дату строкой' }, root, home)
    expect(run.output).toBeUndefined()
    // Векторов в SCOUT_HOME нет — полка форм откатывается на BM25 без сетевого вызова
    expect(run.log).toMatchObject({ mode: 'shadow', shown: false, forms: 'no-vectors' })
    expect(String((run.log?.traps as string[] | undefined)?.[0])).toStartWith('.claude/docs/date-field.md:')
    expect(JSON.parse(readFileSync(join(home, 'state', 'a.json'), 'utf8'))).toEqual({ attempts: 1, briefed: true })
  })

  it('режим on: additionalContext для агента и одна строка для владельца; повтор молчит', async () => {
    const { root, home } = fakeRepo()
    process.env.SCOUT_MODE = 'on'
    const first = await runScoutHook({ session_id: 'b', prompt: 'форма отдаёт дату строкой' }, root, home)
    expect(first.output).toMatchObject({
      systemMessage: '🔎 скаут: 1 ловушка',
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit' },
    })
    expect(await runScoutHook({ session_id: 'b', prompt: 'ещё про форму и дату строкой' }, root, home)).toEqual({})
    delete process.env.SCOUT_MODE
  })
})

describe('splitOf', () => {
  it('детерминирован и отдаёт около 20% в test', () => {
    expect(splitOf('session-1')).toBe(splitOf('session-1'))
    const tests = Array.from({ length: 1000 }, (_, i) => splitOf(`id-${i}`)).filter((x) => x === 'test').length
    expect(tests).toBeGreaterThanOrEqual(150)
    expect(tests).toBeLessThanOrEqual(250)
  })
})

describe('scoutQuery', () => {
  it('без векторов отдаёт no-vectors и те же доки, что чистый scout', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scout-repo-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    writeFileSync(
      join(root, '.claude', 'docs', 'INDEX.md'),
      '## Формы\n- [date-field](/.claude/docs/date-field.md) ⚠️ поле даты в форме отдаёт строку\n',
    )
    writeFileSync(
      join(root, '.claude', 'docs', 'date-field.md'),
      '# Дата строкой\n## Симптом\nформа отдаёт дату строкой в onSubmit\n',
    )
    const engine = new Bm25(buildIndex(collectCards(root)))
    const query = 'форма отдаёт дату строкой'
    const got = await scoutQuery(engine, mkdtempSync(join(tmpdir(), 'scout-home-')), query, { store: null })
    expect(got.forms).toBe('no-vectors')
    expect(got.result.docs).toEqual(scout(engine, query).docs)
    expect(got.ms).toBeGreaterThanOrEqual(0)
  })
})

describe('устойчивость хука', () => {
  const fieldCard: Card = {
    id: 'field:Form.Field.Phone',
    kind: 'field',
    path: 'libs/forms/docs/fields.md',
    line: 1,
    title: 'Form.Field.Phone',
    summary: 'телефон',
    fields: [{ text: 'телефон клиента', weight: 3 }],
  }

  it('векторы с чужим хешем поля → stale-vectors, без spawn при свежем маркере', async () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    mkdirSync(join(home, 'state'), { recursive: true })
    // Свежий маркер: requestVectorRefresh ничего не запускает
    writeFileSync(join(home, 'state', 'refresh-requested'), '')
    const engine = new Bm25(buildIndex([fieldCard]))
    const store = {
      dense: new DenseIndex([fieldCard.id], new Float32Array([1, 0]), 2),
      hashById: new Map([[fieldCard.id, 'чужой-хеш']]),
    }
    const got = await scoutQuery(engine, home, 'форма с телефоном клиента', { store }, home)
    expect(got.forms).toBe('stale-vectors')
  })

  it('loadVectorStore: чужая модель в meta → undefined, своя → хранилище', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    const write = (model: string) => {
      writeFileSync(
        join(home, 'vectors.json'),
        JSON.stringify({ model, dims: 2, ids: ['a'], hashes: ['h'] }),
      )
      writeFileSync(join(home, 'vectors.f32'), Buffer.from(new Float32Array([1, 0]).buffer))
    }
    write('другая-модель')
    expect(loadVectorStore(home)).toBeUndefined()
    write(EMBED_MODEL)
    expect(loadVectorStore(home)?.hashById.get('a')).toBe('h')
  })

  it('appendLog ротирует файл больше порога', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    appendLog(home, { n: 1 })
    appendLog(home, { n: 2 }, 'briefs.jsonl', 5)
    const files = readdirSync(join(home, 'logs'))
    expect(files).toHaveLength(2)
    const rotated = files.find((f) => f !== 'briefs.jsonl')
    expect(rotated).toMatch(/^briefs-\d{8}-\d{6}\.jsonl$/)
    expect(readFileSync(join(home, 'logs', 'briefs.jsonl'), 'utf8')).toBe('{"n":2}\n')
    expect(existsSync(join(home, 'logs', rotated as string))).toBe(true)
  })

  it('indexPath: разный для разных корней, один для одного корня в разной записи', () => {
    expect(indexPath('h', 'C:\\web\\a')).not.toBe(indexPath('h', 'C:\\web\\b'))
    if (process.platform === 'win32') {
      expect(indexPath('h', 'C:\\x')).toBe(indexPath('h', 'c:/x'))
    }
  })
})

describe('evaluate: неупомянутые эталоны и лишнее', () => {
  const hit = (path: string) => ({ path, line: 1, title: path, summary: '', score: 1 })
  const result = (query: string, paths: string[]): ScoutResult => ({
    query,
    docs: paths.map(hit),
    traps: [],
    fields: [],
    matched: paths.length,
  })
  const a = '.claude/docs/first-doc.md'
  const b = '.claude/docs/second-doc.md'
  const c = '.claude/docs/third-doc.md'
  const cases = [
    { sessionId: '1', query: 'сделай, см. first-doc.md', goldDocs: [a, b], goldTools: [] },
    { sessionId: '2', query: 'просто задача', goldDocs: [c], goldTools: [] },
  ]
  const answers: Record<string, string[]> = { 'сделай, см. first-doc.md': [a, c], 'просто задача': [b] }

  it('novelRecall5 считает только неупомянутые, redundancy — долю лишних показанных', async () => {
    const { metrics } = await evaluate(
      (q) => result(q, answers[q]),
      cases,
      undefined,
      { redundant: (q, p) => mentionedIn(q, p) },
    )
    // неупомянутые эталоны: b (случай 1, не найден) и c (случай 2, не найден) → 0 из 2
    expect(metrics.novelGold).toBe(2)
    expect(metrics.novelRecall5).toBe(0)
    expect(metrics.novelCases).toBe(2)
    // упомянутый эталон a найден
    expect(metrics.mentionedRecall5).toBe(1)
    // показано 3 пункта, лишний один (a в первом запросе)
    expect(metrics.redundancy).toBeCloseTo(1 / 3)
  })

  it('без redundant redundancy равна нулю', async () => {
    const { metrics } = await evaluate((q) => result(q, answers[q]), cases)
    expect(metrics.redundancy).toBe(0)
  })
})
