import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
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
import { buildAppBriefs, readAppBriefs, scoreAppBriefs } from './app-briefs'
import { splitOf } from './cli'
import { buildCases, evaluate } from './eval'
import { abGroup, appendLog, decide, LOG_MAX_BYTES, MAX_ATTEMPTS, runScoutHook, scoutQuery } from './hook-core'
import { hubMetrics, spearman, topFrequency } from './hubs'
import { indexPath } from './index-store'
import { judgeGroups, judgeItems, loadLabels } from './judge'
import { readMatrixStore, writeMatrixStore } from './matrix-store'
import { mineSession, normalizeKnowledgePath, parseHumanText, type SessionRecord } from './mine-transcripts'
import { generatePhrases, loadPhraseStore, readPhraseRows } from './phrases'
import { isProbe, pickRows, reportSession, summarize } from './report'
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
    const files = readdirSync(join(home, 'logs')).filter((f) => f.endsWith('.jsonl'))
    expect(files).toHaveLength(2)
    const rotated = files.find((f) => f !== 'briefs.jsonl')
    expect(rotated).toMatch(/^briefs-\d{8}-\d{6}\.jsonl$/)
    expect(readFileSync(join(home, 'logs', 'briefs.jsonl'), 'utf8')).toBe('{"n":2}\n')
    expect(existsSync(join(home, 'logs', rotated as string))).toBe(true)
  })

  it('appendLog уводит в архив лог, первой строке которого больше недели', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    const now = Date.parse('2026-10-20T00:00:00Z')
    appendLog(home, { ts: '2026-10-01T00:00:00Z', n: 1 }, 'briefs.jsonl', LOG_MAX_BYTES, now)
    appendLog(home, { ts: '2026-10-20T00:00:00Z', n: 2 }, 'briefs.jsonl', LOG_MAX_BYTES, now)
    expect(readdirSync(join(home, 'logs')).filter((f) => f.endsWith('.jsonl'))).toHaveLength(2)
    expect(readFileSync(join(home, 'logs', 'briefs.jsonl'), 'utf8')).toContain('"n":2')
  })

  it('appendLog удаляет архивы, где запросы доживут до 90 дней, и не трогает свежие и чужие', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    const logs = join(home, 'logs')
    mkdirSync(logs)
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const old = join(logs, 'briefs-20260101-000000.jsonl')
    const fresh = join(logs, 'briefs-20260901-000000.jsonl')
    const other = join(logs, 'asks-20260101-000000.jsonl')
    for (const f of [old, fresh, other]) {
      writeFileSync(f, '{}\n')
    }
    utimesSync(old, new Date(now - 84 * day), new Date(now - 84 * day))
    utimesSync(fresh, new Date(now - 10 * day), new Date(now - 10 * day))
    utimesSync(other, new Date(now - 200 * day), new Date(now - 200 * day))
    appendLog(home, { ts: new Date(now).toISOString() }, 'briefs.jsonl', LOG_MAX_BYTES, now)
    expect(existsSync(old)).toBe(false)
    expect(existsSync(fresh)).toBe(true)
    expect(existsSync(other)).toBe(true)
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

describe('judge', () => {
  const items = [
    { path: 'a.md', title: 'A', summary: 'аннотация a' },
    { path: 'b.md', title: 'B', summary: 'аннотация b' },
    { path: 'c.md', title: 'C', summary: 'аннотация c' },
  ]

  function fakeServer(reply: () => string) {
    return Bun.serve({
      port: 0,
      fetch: () => Response.json({ choices: [{ message: { content: reply() } }] }),
    })
  }

  it('loadLabels читает jsonl, ключ sessionId и path через табуляцию', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-labels-'))
    const file = join(dir, 'labels.jsonl')
    writeFileSync(
      file,
      [
        JSON.stringify({ sessionId: 's1', path: 'a.md', label: 2, judge: 'qwen3.5-9b' }),
        'битая строка',
        JSON.stringify({ sessionId: 's2', path: 'a.md', label: 0, judge: 'qwen3.5-9b' }),
      ].join('\n'),
    )
    const labels = loadLabels(file)
    expect(labels.size).toBe(2)
    expect(labels.get('s1\ta.md')?.label).toBe(2)
    expect(labels.get('s2\ta.md')?.label).toBe(0)
    expect(loadLabels(join(dir, 'нет.jsonl')).size).toBe(0)
  })

  it('judgeItems разбирает массив оценок из ответа', async () => {
    const server = fakeServer(() => 'Ответ: [2, 0, 1]')
    try {
      const labels = await judgeItems('запрос', items, { url: `http://127.0.0.1:${server.port}`, timeoutMs: 500 })
      expect(labels).toEqual({ labels: [2, 0, 1] })
    } finally {
      server.stop(true)
    }
  })

  it('мусор дважды даёт unparsed, вторая попытка успевает', async () => {
    let calls = 0
    const server = fakeServer(() => (++calls === 1 ? 'не знаю' : '[1,1,1]'))
    try {
      const url = `http://127.0.0.1:${server.port}`
      expect(await judgeItems('запрос', items, { url, timeoutMs: 500 })).toEqual({ labels: [1, 1, 1] })
      const bad = fakeServer(() => '[2,2]')
      try {
        expect(await judgeItems('запрос', items, { url: `http://127.0.0.1:${bad.port}`, timeoutMs: 500 }))
          .toEqual({ error: 'unparsed' })
      } finally {
        bad.stop(true)
      }
    } finally {
      server.stop(true)
    }
  })

  it('закрытый порт — unreachable быстро', async () => {
    const server = fakeServer(() => '[0,0,0]')
    const url = `http://127.0.0.1:${server.port}`
    server.stop(true)
    const started = performance.now()
    expect(await judgeItems('запрос', items, { url, timeoutMs: 500 })).toEqual({ error: 'unreachable' })
    expect(performance.now() - started).toBeLessThan(2000)
  })
})

describe('judgeGroups', () => {
  const lab = (sessionId: string, path: string, label: 0 | 1 | 2) =>
    [`${sessionId}\t${path}`, { sessionId, path, label, judge: 'qwen3.5-9b' }] as const

  it('считает по делу, нужен, покрытие и согласие; неразмеченный случай не входит в метрики', () => {
    const labels = new Map([
      lab('s1', 'a', 2),
      lab('s1', 'b', 0),
      lab('s1', 'c', 1),
      lab('s2', 'a', 0),
      // s3: 'b' не размечен
      lab('s3', 'a', 2),
    ])
    const ref = new Map([lab('s1', 'a', 1), lab('s1', 'b', 1), lab('s2', 'a', 0)])
    const [g] = judgeGroups(
      [{
        group: 'все',
        cases: [
          { sessionId: 's1', paths: ['a', 'b', 'c'] },
          { sessionId: 's2', paths: ['a'] },
          { sessionId: 's3', paths: ['a', 'b'] },
        ],
      }],
      labels,
      ref,
    )
    expect(g.cases).toBe(3)
    expect(g.covered).toBe(2)
    expect(g.coverage).toBeCloseTo(2 / 3)
    // @1: s1 → 1, s2 → 0
    expect(g.relevant1).toBeCloseTo(0.5)
    // @3: s1 → 2/3, s2 → 0/1 (справка короче k — делим на показанное)
    expect(g.relevant3).toBeCloseTo(1 / 3)
    expect(g.needed3).toBeCloseTo(1 / 6)
    // пары: s1a (≥1 и ≥1 — да), s1b (0 против 1 — нет), s2a (0 и 0 — да)
    expect(g.agreementPairs).toBe(3)
    expect(g.agreement).toBeCloseTo(2 / 3)
  })

  it('пустая группа не даёт NaN', () => {
    const [g] = judgeGroups([{ group: 'test', cases: [] }], new Map(), new Map())
    expect(g).toMatchObject({ cases: 0, coverage: 0, relevant3: 0, agreement: null })
  })
})

describe('общее хранилище матриц', () => {
  it('readMatrixStore: чужая модель и неверная длина → undefined; запись → чтение возвращает то же', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    const matrix = new Float32Array([1, 0, 0, 1])
    writeMatrixStore(home, 'm', { model: 'другая-модель', dims: 2, ids: ['a', 'b'], hashes: ['x', 'y'] }, matrix)
    expect(readMatrixStore(home, 'm')).toBeUndefined()
    writeMatrixStore(home, 'm', { model: EMBED_MODEL, dims: 2, ids: ['a', 'b', 'c'], hashes: ['x', 'y', 'z'] }, matrix)
    expect(readMatrixStore(home, 'm')).toBeUndefined()
    writeMatrixStore(home, 'm', { model: EMBED_MODEL, dims: 2, ids: ['a', 'b'], hashes: ['x', 'y'] }, matrix)
    const got = readMatrixStore(home, 'm')
    expect(got?.meta.ids).toEqual(['a', 'b'])
    expect(Array.from(got?.matrix ?? [])).toEqual([1, 0, 0, 1])
    expect(readMatrixStore(home, 'нет')).toBeUndefined()
  })
})

describe('генерация формулировок', () => {
  it('ошибка сервера на одном доке не роняет остальные', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scout-repo-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    const names = ['a', 'b', 'c']
    writeFileSync(
      join(root, '.claude', 'docs', 'INDEX.md'),
      `## Разное\n${names.map((n) => `- [${n}](/.claude/docs/${n}.md) док ${n}`).join('\n')}\n`,
    )
    for (const n of names) {
      writeFileSync(join(root, '.claude', 'docs', `${n}.md`), `# Док ${n}\nтекст ${n}\n`)
    }
    let calls = 0
    const server = Bun.serve({
      port: 0,
      fetch: (req) => {
        if (new URL(req.url).pathname === '/health') {
          return new Response('ok')
        }
        return ++calls === 2
          ? new Response('boom', { status: 500 })
          : Response.json({
            choices: [{ message: { content: 'добавь поле даты в форму\nпочему форма падает при отправке' } }],
          })
      },
    })
    try {
      const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
      const cards = collectCards(root).filter((c) => c.kind === 'doc')
      const res = await generatePhrases(root, cards, home, { url: `http://127.0.0.1:${server.port}` })
      expect(res).toEqual({ done: 2, skipped: 1 })
      expect(readPhraseRows(home).size).toBe(2)
    } finally {
      server.stop(true)
    }
  })
})

describe('формулировки к докам', () => {
  it('loadPhraseStore: чужая модель и неверная длина матрицы → undefined, своя → хранилище', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    const write = (model: string, floats: number[]) => {
      writeFileSync(
        join(home, 'phrase-vectors.json'),
        JSON.stringify({ model, dims: 2, ids: ['doc:a.md', 'doc:a.md'], hashes: ['h', 'h'] }),
      )
      writeFileSync(join(home, 'phrase-vectors.f32'), Buffer.from(new Float32Array(floats).buffer))
    }
    write('другая-модель', [1, 0, 0, 1])
    expect(loadPhraseStore(home)).toBeUndefined()
    write(EMBED_MODEL, [1, 0, 0])
    expect(loadPhraseStore(home)).toBeUndefined()
    write(EMBED_MODEL, [1, 0, 0, 1])
    expect(loadPhraseStore(home)?.hashByPath.get('a.md')).toBe('h')
  })

  it('scoutQuery с формулировками → hybrid+phrases, без них → hybrid', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scout-repo-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    writeFileSync(
      join(root, '.claude', 'docs', 'INDEX.md'),
      '## Формы\n- [date-field](/.claude/docs/date-field.md) поле даты в форме отдаёт строку\n',
    )
    writeFileSync(join(root, '.claude', 'docs', 'date-field.md'), '# Дата строкой\nформа отдаёт дату строкой\n')
    const engine = new Bm25(buildIndex(collectCards(root)))
    const id = 'doc:.claude/docs/date-field.md'
    const dense = new DenseIndex([id], new Float32Array([1, 0]), 2)
    const store = { dense, hashById: new Map<string, string>() }
    for (const c of engine.cards) {
      if (c.kind === 'field' || c.kind === 'pattern') {
        store.hashById.set(c.id, c.embedHash)
      }
    }
    // Фейковый эмбеддер: вектор запроса всегда [1, 0]
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ data: [{ index: 0, embedding: [1, 0] }] }),
    })
    try {
      const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
      const embedUrl = `http://127.0.0.1:${server.port}`
      const phrases = {
        index: new DenseIndex([id], new Float32Array([1, 0]), 2),
        hashByPath: new Map([['.claude/docs/date-field.md', 'h']]),
      }
      const query = 'форма отдаёт дату строкой'
      const withPhrases = await scoutQuery(engine, home, query, { store, phrases, embedUrl }, root)
      expect(withPhrases.docsSource).toBe('hybrid+phrases')
      const without = await scoutQuery(engine, home, query, { store, phrases: null, embedUrl }, root)
      expect(without.docsSource).toBe('hybrid')
    } finally {
      server.stop(true)
    }
  })
})

describe('онлайн-отчёт', () => {
  it('пробы хука отличаются от живых сессий', () => {
    expect(isProbe('probe-1')).toBe(true)
    expect(isProbe('0a1b2c3d-probe')).toBe(false)
  })

  const OLD = new Date(Date.now() - 3 * 3600 * 1000)
  const transcript = (docs: string[], age = OLD) => {
    const dir = mkdtempSync(join(tmpdir(), 'scout-report-'))
    const file = join(dir, 's.jsonl')
    const rows = [
      { type: 'user', origin: { kind: 'human' }, sessionId: 's1', message: { content: 'поправь поле формы' } },
      ...docs.map((d) => ({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'C:\\web\\letar\\.claude\\docs\\' + d } }],
        },
      })),
    ]
    writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n'))
    utimesSync(file, age, age)
    return file
  }
  const row = {
    sessionId: 's1',
    mode: 'shadow',
    shown: false,
    query: 'поправь поле формы',
    docs: ['.claude/docs/x-y.md:1'],
  }

  it('подсказанный и открытый док — попадание, точность 1', async () => {
    const rep = await reportSession(row, transcript(['x-y.md']))
    expect(rep.hits).toEqual(['.claude/docs/x-y.md'])
    expect(rep.missed).toEqual([])
    expect(summarize([rep])[0]).toMatchObject({ sessions: 1, withBrief: 1, precision: 1 })
  })

  it('неподсказанный док попадает в missed', async () => {
    const rep = await reportSession(row, transcript(['x-y.md', 'other-doc.md']))
    expect(rep.missed).toEqual(['.claude/docs/other-doc.md'])
    expect(summarize([rep])[0].recall).toBe(0.5)
  })

  it('свежий транскрипт — «в работе», в метрики не входит; нет файла — «не найден»', async () => {
    const rep = await reportSession(row, transcript(['x-y.md'], new Date()))
    expect(rep.status).toBe('in-progress')
    expect(summarize([rep])).toEqual([])
    expect((await reportSession(row, undefined)).status).toBe('no-transcript')
  })
})

function sessionOf(command: string | undefined, paths: string[], startedAt = '2026-09-01T00:00:00Z'): SessionRecord {
  return {
    sessionId: `s-${Math.random()}`,
    startedAt,
    cwd: '',
    command,
    task: 'задача',
    docsRead: paths.map((path, step) => ({ path, step, beforeEdit: true })),
    skills: [],
    agents: [],
    commands: [],
    followups: [],
    interrupts: 0,
    toolCalls: 1,
  }
}

describe('buildAppBriefs', () => {
  const none = () => false

  it('частота — по сессиям, два чтения в одной сессии дают одно очко', () => {
    const sessions = [
      sessionOf('app-a', ['a.md', 'a.md', 'b.md']),
      sessionOf('app-a', ['b.md']),
      sessionOf('app-a', ['b.md', 'c.md']),
    ]
    expect(buildAppBriefs(sessions, { loaded: none }).apps['app-a']).toEqual(['b.md', 'a.md', 'c.md'])
  })

  it('отбрасывает loaded и сессии без команды', () => {
    const sessions = [
      sessionOf('app-a', ['rule.md', 'a.md']),
      sessionOf('app-a', ['rule.md']),
      sessionOf('app-a', ['a.md']),
      sessionOf(undefined, ['x.md', 'x.md']),
    ]
    const got = buildAppBriefs(sessions, { loaded: (p) => p === 'rule.md' })
    expect(got.apps['app-a']).toEqual(['a.md'])
    expect(got.global).toEqual(['a.md'])
  })

  it('приложение с двумя сессиями не попадает в apps, общий список остаётся', () => {
    const sessions = [
      sessionOf('app-a', ['a.md']),
      sessionOf('app-a', ['a.md']),
      sessionOf('app-b', ['b.md']),
      sessionOf('app-b', ['b.md']),
      sessionOf('app-b', ['b.md']),
    ]
    const got = buildAppBriefs(sessions, { loaded: none })
    expect(Object.keys(got.apps)).toEqual(['app-b'])
    expect(got.global).toEqual(['b.md', 'a.md'])
  })

  it('при равной частоте порядок — по пути, K обрезает список', () => {
    const sessions = Array.from({ length: 3 }, () => sessionOf('app-a', ['z.md', 'm.md', 'a.md']))
    expect(buildAppBriefs(sessions, { loaded: none, k: 2 }).apps['app-a']).toEqual(['a.md', 'm.md'])
  })
})

describe('scoreAppBriefs', () => {
  it('строит справку на ранней части и меряет на поздней', () => {
    const early = ['01', '02', '03', '04', '05', '06', '07'].map((d) =>
      sessionOf('app-a', ['a.md'], `2026-08-${d}T00:00:00Z`)
    )
    const late = ['a.md', 'other.md', 'a.md'].map((p, i) => sessionOf('app-a', [p], `2026-09-0${i + 1}T00:00:00Z`))
    const got = scoreAppBriefs([...late, ...early], () => false)
    expect(got.train).toBe(7)
    expect(got.app).toEqual({ sessions: 3, read: 3, found: 2, hitSessions: 2 })
  })
})

describe('readAppBriefs', () => {
  it('нет файла или битый JSON — undefined', () => {
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    expect(readAppBriefs(home)).toBeUndefined()
    writeFileSync(join(home, 'app-briefs.json'), '{oops')
    expect(readAppBriefs(home)).toBeUndefined()
  })
})

describe('справка приложения в хуке', () => {
  function fakeAppRepo(withBriefs = true, withApp = true) {
    const root = mkdtempSync(join(tmpdir(), 'scout-repo-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    writeFileSync(join(root, 'nx.json'), '{}')
    writeFileSync(
      join(root, '.claude', 'docs', 'INDEX.md'),
      '## Формы\n- [date-field](/.claude/docs/date-field.md) ⚠️ поле даты в форме отдаёт строку\n',
    )
    writeFileSync(join(root, '.claude', 'docs', 'date-field.md'), '# Дата строкой\n## Симптом\nформа отдаёт дату\n')
    if (withApp) {
      mkdirSync(join(root, 'apps', 'app-a'), { recursive: true })
    }
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    if (withBriefs) {
      const briefs = { builtAt: '', k: 8, global: ['.claude/docs/date-field.md', '.claude/docs/gone.md'], apps: {} }
      writeFileSync(join(home, 'app-briefs.json'), JSON.stringify(briefs))
    }
    return { root, home }
  }

  it('голая /app: лог kind app, appBriefed без briefed; повтор молчит', async () => {
    const { root, home } = fakeAppRepo()
    process.env.SCOUT_MODE = 'on'
    const run = await runScoutHook({ session_id: 'app1', prompt: '/app-a' }, root, home)
    expect(run.log).toMatchObject({
      kind: 'app',
      command: 'app-a',
      shown: true,
      docs: ['.claude/docs/date-field.md:1'],
    })
    expect(run.log).not.toHaveProperty('query')
    const context = (run.output?.hookSpecificOutput as { additionalContext: string }).additionalContext
    expect(context).toContain('Справка скаута по приложению')
    expect(context).not.toContain('gone.md')
    expect(JSON.parse(readFileSync(join(home, 'state', 'app1.json'), 'utf8'))).toMatchObject({
      briefed: false,
      appBriefed: true,
    })
    expect(await runScoutHook({ session_id: 'app1', prompt: '/app-a' }, root, home)).toEqual({})
    delete process.env.SCOUT_MODE
  })

  it('без каталога apps/<имя> или без app-briefs.json — молчим', async () => {
    const noApp = fakeAppRepo(true, false)
    expect(await runScoutHook({ session_id: 'app2', prompt: '/app-a' }, noApp.root, noApp.home)).toEqual({})
    const noFile = fakeAppRepo(false, true)
    expect(await runScoutHook({ session_id: 'app3', prompt: '/app-a' }, noFile.root, noFile.home)).toEqual({})
  })
})

describe('report: справка приложения и поиска в одной сессии', () => {
  it('две строки одной сессии дают две записи, в разных группах', async () => {
    const rows = [
      { sessionId: 's1', mode: 'shadow', shown: false, kind: 'app' as const, docs: ['a.md:1'] },
      { sessionId: 's1', mode: 'shadow', shown: false, docs: ['b.md:1'], query: 'q' },
    ]
    const picked = pickRows(rows)
    expect(picked).toHaveLength(2)
    const reports = await Promise.all(picked.map((r) => reportSession(r, undefined)))
    expect(reports.map((r) => r.kind)).toEqual(['app', undefined])
    const groups = summarize(reports.map((r) => ({ ...r, status: 'ok' as const }))).map((g) => `${g.group}|${g.kind}`)
    expect(groups.sort()).toEqual(['shadow/тень|app', 'shadow/тень|поиск'])
  })
})

describe('хабы: метрики', () => {
  it('частота считается один раз на запрос; метрики — доля мест и максимум', () => {
    const rankings = [['a', 'b'], ['a', 'c'], ['a', 'b']]
    expect(topFrequency(rankings).get('a')).toBe(3)
    const m = hubMetrics(rankings, 1)
    expect(m.maxFreq).toBe(1)
    expect(m.top10Share).toBeCloseTo(3 / 6, 10)
  })

  it('spearman: монотонная связь даёт 1, обратная -1, константа 0', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10)
    expect(spearman([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10)
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0)
  })
})
