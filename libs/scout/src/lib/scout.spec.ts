import { Bm25, buildIndex } from './bm25'
import { BRIEF_HEADER, formatBrief, formatOneLine } from './brief'
import { parsePatternRegistry } from './collect'
import {
  DenseIndex,
  embedHash,
  formatQuery,
  fuseWithDense,
  hybridHits,
  phraseHash,
  phraseRanking,
  QUERY_CHARS,
  QUERY_INSTRUCTION,
} from './dense'
import { parseFrontmatter } from './frontmatter'
import { type DocHit, FORM_WORDS, layoutHits, mentionedIn, scout } from './search'
import {
  docCards,
  fieldCatalogCards,
  parseIndexEntries,
  parseSections,
  patternCard,
  toolCard,
  truncate,
} from './sources'
import { tokenize } from './text'

describe('tokenize', () => {
  it('стеммирует русский и английский, режет camelCase и kebab-case', () => {
    expect(tokenize('Формы с загрузкой')).toEqual(['форм', 'загрузк'])
    expect(tokenize('useFormErrorTab')).toEqual(['use', 'form', 'error', 'tab'])
    expect(tokenize('frozen-lockfile')).toEqual(['frozen', 'lockfil'])
  })

  it('отбрасывает стоп-слова, одиночные символы и приводит ё к е', () => {
    expect(tokenize('и в ещё ёлка a 7 418')).toEqual(['елк', '418'])
  })
})

describe('parseFrontmatter', () => {
  it('читает плоские и блочные значения, считает строку начала тела', () => {
    const src = [
      '---',
      'name: demo',
      'description: |',
      '  Первая строка',
      '  вторая',
      'model: "sonnet"',
      '---',
      '# Заголовок',
    ]
      .join('\n')
    const fm = parseFrontmatter(src)
    expect(fm.data).toEqual({ name: 'demo', description: 'Первая строка\nвторая', model: 'sonnet' })
    expect(fm.bodyLine).toBe(8)
    expect(fm.body).toBe('# Заголовок')
  })

  it('без frontmatter отдаёт весь текст телом', () => {
    expect(parseFrontmatter('# Просто док').data).toEqual({})
  })
})

describe('parseIndexEntries', () => {
  const index = [
    '## Формы',
    '- [forms](/.claude/docs/forms.md) ⭐ единственный подход к формам',
    '- [date-trap](/.claude/docs/date-trap.md) ⚠️ поле даты отдаёт **string**, см. [док](/x.md)',
    '- [plain](/.claude/docs/plain.md) обычный; ⚠️ упоминание в середине — не флаг',
  ].join('\n')

  it('флаги берутся только из маркеров в начале аннотации', () => {
    const [forms, trap, plain] = parseIndexEntries(index)
    expect(forms).toMatchObject({
      name: 'forms',
      path: '.claude/docs/forms.md',
      star: true,
      warn: false,
      topic: 'Формы',
    })
    expect(trap).toMatchObject({ warn: true, annotation: 'поле даты отдаёт string, см. док' })
    expect(plain).toMatchObject({ warn: false, star: false })
  })
})

describe('parseSections', () => {
  it('даёт номера строк и не принимает комментарий в блоке кода за заголовок', () => {
    const md = ['# Док', 'вступление', '## Симптом', '```bash', '# не заголовок', '```', '## Фикс', 'текст'].join('\n')
    const sections = parseSections(md)
    expect(sections.map((s) => [s.title, s.line])).toEqual([['Док', 1], ['Симптом', 3], ['Фикс', 7]])
  })
})

describe('truncate', () => {
  it('режет по границе слова', () => {
    expect(truncate('один два три четыре', 12)).toBe('один два…')
    expect(truncate('коротко', 50)).toBe('коротко')
  })
})

function fixtureEngine() {
  const entries = parseIndexEntries([
    '## Формы',
    '- [forms-guide](/.claude/docs/forms-guide.md) ⭐ единственный подход к формам и валидации',
    '- [date-field-string](/.claude/docs/date-field-string.md) ⚠️ поле даты в форме отдаёт строку вместо Date',
    '## Деплой',
    '- [lockfile-drift](/.claude/docs/lockfile-drift.md) ⚠️ frozen lockfile роняет деплой всех приложений',
  ].join('\n'))
  const byPath = new Map(entries.map((e) => [e.path, e]))
  const doc = (path: string, markdown: string) => docCards({ path, markdown, entry: byPath.get(path) })
  const cards = [
    ...doc('.claude/docs/forms-guide.md', '# Формы\n## Поля\nполя формы, дата, загрузка файлов\n## Отправка\nsubmit'),
    ...doc('.claude/docs/date-field-string.md', '# Дата строкой\n## Симптом\nonSubmit получает строку даты'),
    ...doc('.claude/docs/lockfile-drift.md', '# Lockfile\n## Симптом\nдеплой падает на frozen-lockfile'),
    toolCard(
      'skill',
      '.claude/skills/form-pipeline/SKILL.md',
      '---\nname: form-pipeline\ndescription: форма из схемы, поля даты и валидация\n---',
      'x',
    ),
    toolCard(
      'skill',
      '.agents/skills/deploy-check/SKILL.md',
      '---\ndescription: проверка деплоя\n---\n# Деплой',
      'deploy-check',
    ),
  ]
  return new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
}

describe('scout', () => {
  it('раскладывает доки, ловушки и инструмент, сводя секции к одному доку', () => {
    const result = scout(fixtureEngine(), 'форма с полем даты')
    expect(result.docs.map((d) => d.path)).toEqual(['.claude/docs/forms-guide.md'])
    expect(result.docs[0].star).toBe(true)
    expect(result.traps.map((d) => d.path)).toEqual(['.claude/docs/date-field-string.md'])
    expect(result.tool).toMatchObject({ kind: 'skill', name: 'form-pipeline' })
  })

  it('ссылается на строку совпавшей секции', () => {
    const result = scout(fixtureEngine(), 'деплой frozen-lockfile')
    expect(result.traps[0]).toMatchObject({ path: '.claude/docs/lockfile-drift.md' })
    expect([1, 2]).toContain(result.traps[0].line)
    expect(result.docs).toEqual([])
  })

  it('на запрос без совпадений отдаёт пусто, а справка — пустую строку', () => {
    const result = scout(fixtureEngine(), 'рецепт борща')
    expect(result.matched).toBe(0)
    expect(formatBrief(result)).toBe('')
    expect(formatOneLine(result)).toBe('')
  })
})

describe('formatBrief и formatOneLine', () => {
  it('начинается с шапки и склоняет счётчики', () => {
    const result = scout(fixtureEngine(), 'форма с полем даты')
    const brief = formatBrief(result)
    expect(brief.split('\n')[0]).toBe(BRIEF_HEADER)
    expect(brief).toContain('.claude/docs/forms-guide.md:')
    expect(brief).toContain('скил `form-pipeline` (Skill)')
    expect(formatOneLine(result)).toBe('🔎 скаут: 1 док, 1 ловушка, скил form-pipeline')
  })
})

describe('formatBrief v2: один список по очкам', () => {
  const hit = (name: string, score: number, extra: Partial<DocHit> = {}): DocHit => ({
    path: `.claude/docs/${name}.md`,
    line: 1,
    title: `Заголовок ${name}`,
    summary: `Аннотация ${name}`,
    score,
    ...extra,
  })
  const base = { query: 'q', fields: [], matched: 5 } as const

  it('ловушка с большим счётом идёт выше дока и помечена ⚠️', () => {
    const brief = formatBrief({ ...base, docs: [hit('doc', 1)], traps: [hit('trap', 2, { warn: true })] })
    const lines = brief.split('\n')
    expect(lines).toContain('Что посмотреть:')
    const first = lines.findIndex((l) => l.startsWith('- '))
    expect(lines[first]).toContain('⚠️ .claude/docs/trap.md:1')
    expect(lines[first + 1]).toContain('- .claude/docs/doc.md:1')
    expect(brief).not.toContain('Доки:')
  })

  it('5 пунктов при fullItems 3: три с аннотацией, два коротких под «Ещё:»', () => {
    const docs = [5, 4, 3, 2].map((n) => hit(`d${n}`, n))
    const traps = [hit('t1', 1, { warn: true, section: 'Раздел' })]
    const brief = formatBrief({ ...base, docs, traps }, { fullItems: 3 })
    const lines = brief.split('\n')
    const more = lines.indexOf('Ещё:')
    expect(more).toBeGreaterThan(0)
    const head = lines.slice(lines.indexOf('Что посмотреть:') + 1, more)
    const tail = lines.slice(more + 1)
    expect(head).toHaveLength(3)
    expect(head.every((l) => l.includes(' — Аннотация'))).toBe(true)
    expect(tail).toEqual([
      '- .claude/docs/d2.md:1 — Заголовок d2',
      '- ⚠️ .claude/docs/t1.md:1 — § Раздел',
    ])
  })

  it('пустой результат — пустая строка', () => {
    expect(formatBrief({ ...base, docs: [], traps: [] })).toBe('')
  })
})

const FIELD_CATALOG = [
  '# Поля',
  '## Контакты',
  '| Компонент | Назначение |',
  '| --- | --- |',
  '| `Form.Field.Phone` | Телефон с маской |',
  '| `Form.Field.Email` | Адрес электронной почты |',
  '## Даты',
  '| `Form.Field.Date` | Дата, календарь |',
  '| `Form.Field.Date` | повтор строки не даёт второй карточки |',
  '## Пропсы',
  '| `mask` | не поле |',
  '### Phone — маска и формат',
  'маска +7, формат E.164',
].join('\n')

const PATTERN_REGISTRY = [
  'export const patterns = [',
  '  {',
  "    name: 'contact-form',",
  "    title: 'Контактная форма',",
  '    description:',
  "      'Имя, телефон и почта с согласием на обработку',",
  '  },',
  ']',
].join('\n')

function formsEngine() {
  const cards = [
    ...fieldCatalogCards('libs/forms/docs/fields.md', FIELD_CATALOG),
    ...parsePatternRegistry('libs/form-mcp/src/data/pattern-registry.ts', PATTERN_REGISTRY).map(patternCard),
    ...docCards({ path: 'libs/forms/docs/form-level.md', markdown: '# Форма\n## Телефон и почта\nполя контактов' }),
    ...docCards({ path: '.claude/docs/deploy.md', markdown: '# Деплой\nтелефон дежурного' }),
  ]
  return new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
}

describe('каталог полей и паттерны форм', () => {
  it('карточка на компонент из таблицы, ссылка на подробный раздел, таблицы пропсов пропущены', () => {
    const cards = fieldCatalogCards('libs/forms/docs/fields.md', FIELD_CATALOG)
    expect(cards.map((c) => c.title)).toEqual(['Form.Field.Phone', 'Form.Field.Email', 'Form.Field.Date'])
    expect(cards[0]).toMatchObject({ kind: 'field', line: 12, summary: 'Телефон с маской (Контакты)' })
    expect(cards[2].line).toBe(8)
  })

  it('реестр паттернов читается текстом, включая перенесённое описание', () => {
    const [pattern] = parsePatternRegistry('reg.ts', PATTERN_REGISTRY)
    expect(pattern).toEqual({
      name: 'contact-form',
      title: 'Контактная форма',
      description: 'Имя, телефон и почта с согласием на обработку',
      path: 'reg.ts',
      line: 3,
    })
  })

  it('запрос про форму даёт полки полей и паттерна, справка советует get_form_pattern', () => {
    const result = scout(formsEngine(), 'форма с телефоном и почтой', { formQuorum: 2 })
    expect(result.fields.map((f) => f.name)).toContain('Form.Field.Phone')
    expect(result.pattern?.name).toBe('contact-form')
    const brief = formatBrief(result)
    expect(brief).toContain('Поля формы (@letar/forms):')
    expect(brief).toContain('get_form_pattern("contact-form")')
    expect(formatOneLine(result)).toMatch(/поля [\w, ]*Phone/)
  })

  it('BM25: без слов про формы, кворума и поля в верхушке выдачи полки пусты', () => {
    const engine = formsEngine()
    const query = 'телефон дежурного'
    const hits = engine.search(query, 500)
    // Карточка поля первая в выдаче — по умолчанию этого хватает
    expect(layoutHits(engine.cards, hits, query).fields.map((f) => f.name)).toEqual(['Form.Field.Phone'])
    const strict = layoutHits(engine.cards, hits, query, { formRankGate: 0, formQuorum: 99 })
    expect(strict.fields).toEqual([])
    expect(strict.pattern).toBeUndefined()
  })

  it('эмбеддинги: полка по косинусу, слова про формы снижают порог, паттерн — по своему порогу', () => {
    const engine = formsEngine()
    const card = (id: string) => engine.cards.find((c) => c.id === id)!
    const forms = (field: number, pattern: number) => ({
      fields: [
        { card: card('field:Form.Field.Phone'), score: field },
        { card: card('field:Form.Field.Email'), score: field - 0.05 },
        { card: card('field:Form.Field.Date'), score: field - 0.3 },
      ],
      patterns: [{ card: card('pattern:contact-form'), score: pattern }],
    })
    // Кворум выключен: в крошечной фикстуре все карточки про формы
    const run = (query: string, field: number, pattern: number) =>
      layoutHits(engine.cards, engine.search(query, 500), query, { forms: forms(field, pattern), formQuorum: 99 })
    const strong = run('телефон дежурного', 0.6, 0.7)
    expect(strong.fields.map((f) => f.name)).toEqual(['Form.Field.Phone', 'Form.Field.Email'])
    expect(strong.pattern?.name).toBe('contact-form')
    expect(run('телефон дежурного', 0.52, 0.54).fields).toEqual([])
    const worded = run('поле телефона в анкете', 0.52, 0.54)
    expect(worded.fields.map((f) => f.name)).toContain('Form.Field.Phone')
    expect(worded.pattern?.name).toBe('contact-form')
  })
})

describe('hybridHits', () => {
  it('без серверов остаётся на BM25 и не бросает', async () => {
    const engine = fixtureEngine()
    const dead = { url: 'http://127.0.0.1:9', timeoutMs: 300 }
    const { hits, stages } = await hybridHits(engine, 'форма с полем даты', { embed: dead, rerank: dead })
    expect(stages).toEqual(['bm25'])
    expect(hits.map((h) => h.card.id)).toEqual(engine.search('форма с полем даты', 500).map((h) => h.card.id))
  })
})

describe('исправления по ревью', () => {
  it('BM25 не даёт NaN на словах, совпадающих с членами Object.prototype', () => {
    const card = toolCard('skill', '.agents/skills/x/SKILL.md', '---\ndescription: constructor toString\n---', 'x')
    const index = buildIndex([card], 'test')
    for (const engine of [new Bm25(index), new Bm25(JSON.parse(JSON.stringify(index)))]) {
      const hits = engine.search('constructor')
      expect(hits.length).toBe(1)
      expect(Number.isFinite(hits[0].score)).toBe(true)
    }
    // Старый индекс: у tf есть прототип, чужой `constructor` не считается частотой
    const legacy = JSON.parse(JSON.stringify(index))
    Object.setPrototypeOf(legacy.cards[0].tf, { constructor: 5 })
    delete legacy.cards[0].tf.constructor
    const hits = new Bm25(legacy).search('constructor')
    expect(hits.every((h) => Number.isFinite(h.score))).toBe(true)
  })

  it('embedHash стабилен, зависит от текста карточки и заполняется в индексе', () => {
    const make = (description: string) =>
      toolCard('skill', '.agents/skills/x/SKILL.md', `---\ndescription: ${description}\n---`, 'x')
    const a = make('первый текст')
    expect(embedHash(a)).toMatch(/^[0-9a-f]{16}$/)
    expect(embedHash(a)).toBe(embedHash(make('первый текст')))
    expect(embedHash(a)).not.toBe(embedHash(make('второй текст')))
    expect(buildIndex([a], 'test').cards[0].embedHash).toBe(embedHash(a))
  })

  it('formatQuery сжимает длинный запрос: начало и конец, короткий не трогает', () => {
    const prefix = `Instruct: ${QUERY_INSTRUCTION}\nQuery: `
    const formatted = formatQuery('а'.repeat(2000) + 'б'.repeat(3000))
    const body = formatted.slice(prefix.length)
    expect(formatted.startsWith(prefix)).toBe(true)
    expect(body.length).toBe(1200 + 3 + 300)
    expect(body).toBe(`${'а'.repeat(1200)}\n…\n${'б'.repeat(300)}`)
    const short = 'x'.repeat(QUERY_CHARS)
    expect(formatQuery(short)).toBe(prefix + short)
  })

  it('справка из одного паттерна не пустая, в строке для владельца он назван', () => {
    const result = {
      query: 'q',
      docs: [],
      traps: [],
      fields: [],
      matched: 1,
      pattern: { name: 'contact-form', summary: 'Контактная форма', path: 'reg.ts', line: 3, score: 1 },
    }
    expect(formatBrief(result)).toContain('get_form_pattern("contact-form")')
    expect(formatOneLine(result)).toBe('🔎 скаут: паттерн contact-form')
  })

  it('реестр паттернов: экранированная кавычка и двойные кавычки', () => {
    const source = String.raw`  {
    name: 'one',
    title: 'Doesn\'t break',
    description: 'Don\'t stop here',
  },
  {
    name: "two",
    title: "Say \"hi\"",
    description:
      "Double \"quoted\" text",
  },`
    const [one, two] = parsePatternRegistry('reg.ts', source)
    expect(one).toMatchObject({ name: 'one', title: "Doesn't break", description: "Don't stop here" })
    expect(two).toMatchObject({ name: 'two', title: 'Say "hi"', description: 'Double "quoted" text' })
  })

  it('FORM_WORDS: формы и поля — да, формула, формат и прочее — нет', () => {
    for (const yes of ['форма заявки', 'полем ввода', 'в полях анкеты', 'login form']) {
      expect(FORM_WORDS.test(yes), yes).toBe(true)
    }
    for (
      const no of ['формула сметы', 'сформировать отчёт', 'формально верно', 'формат даты', 'информация', 'платформа']
    ) {
      expect(FORM_WORDS.test(no), no).toBe(false)
    }
  })

  it('служебный скил — scope service, и раскладка не делает его инструментом', () => {
    const command = (name: string, description: string) => ({
      ...toolCard('skill', `.agents/skills/${name}/SKILL.md`, `---\ndescription: ${description}\n---`, name),
      scope: 'service' as const,
    })
    const cards = [command('end-session', 'завершение сессии деплой'), command('old-deploy', 'Устарел: деплой env')]
    const engine = new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
    expect(engine.cards.map((c) => c.scope)).toEqual(['service', 'service'])
    const hits = engine.search('деплой', 500)
    expect(hits.length).toBe(2)
    expect(layoutHits(engine.cards, hits, 'деплой').tool).toBeUndefined()
  })
})

describe('mentionedIn', () => {
  const zod = '.claude/docs/zod-per-package-pin-drift.md'

  it('имя файла с .md в запросе — упомянут, регистр не важен', () => {
    expect(mentionedIn('см. ZOD-per-package-pin-drift.md и дальше', zod)).toBe(true)
  })

  it('слаг с дефисом без .md — упомянут, если стоит отдельным словом', () => {
    expect(mentionedIn('прочти zod-per-package-pin-drift перед правкой', zod)).toBe(true)
    expect(mentionedIn('(zod-per-package-pin-drift)', zod)).toBe(true)
  })

  it('короткое имя без дефиса без .md — обычное слово, не упоминание', () => {
    expect(mentionedIn('поправь auth в приложении', '.claude/docs/auth.md')).toBe(false)
    expect(mentionedIn('открой auth.md', '.claude/docs/auth.md')).toBe(true)
  })

  it('слаг как часть более длинного слага — не упоминание', () => {
    expect(mentionedIn('см. zod-per-package-pin', '.claude/docs/zod-per.md')).toBe(false)
    expect(mentionedIn('см. zod-per-package', '.claude/docs/zod-per.md')).toBe(false)
    expect(mentionedIn('см. my-zod-per', '.claude/docs/zod-per.md')).toBe(false)
  })
})

describe('layoutHits: лишнее не советуем', () => {
  const engine = () => {
    const doc = (path: string, extra: Partial<{ loaded: boolean }> = {}) =>
      docCards({ path, markdown: '# Деплой\n## Симптом\nдеплой падает' }).map((c) => ({ ...c, ...extra }))
    const cards = [
      ...doc('.claude/docs/deploy-mentioned.md'),
      ...doc('.claude/docs/deploy-other.md'),
      ...doc('.claude/rules/deploy-loaded.md', { loaded: true }),
    ]
    return new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
  }
  const paths = (r: { docs: Array<{ path: string }>; traps: Array<{ path: string }> }) =>
    [...r.docs, ...r.traps].map((d) => d.path).sort()

  it('не показывает док, названный в запросе, и правило с loaded', () => {
    const e = engine()
    const result = layoutHits(
      e.cards,
      e.search('деплой падает, см. deploy-mentioned.md', 500),
      'деплой падает, см. deploy-mentioned.md',
    )
    expect(paths(result)).toEqual(['.claude/docs/deploy-other.md'])
  })

  it('с dropMentioned и dropLoaded = false показывает всё', () => {
    const e = engine()
    const q = 'деплой падает, см. deploy-mentioned.md'
    const result = layoutHits(e.cards, e.search(q, 500), q, { dropMentioned: false, dropLoaded: false, minRelative: 0 })
    expect(paths(result)).toEqual([
      '.claude/docs/deploy-mentioned.md',
      '.claude/docs/deploy-other.md',
      '.claude/rules/deploy-loaded.md',
    ])
  })
})

describe('fuseWithDense', () => {
  it('док только из плотного списка попадает в голову, инструмент только из BM25 — в хвост с нулём', () => {
    const doc = (path: string, text: string) =>
      docCards({
        path,
        markdown: `# ${text}
`,
      })
    const cards = [
      ...doc('.claude/docs/alpha.md', 'альфа деплой деплой деплой'),
      ...doc('.claude/docs/beta.md', 'бета совсем другое'),
      toolCard(
        'skill',
        '.claude/skills/deployer/SKILL.md',
        '---\nname: deployer\ndescription: набор инструментов для сборки и деплой\n---',
        'x',
      ),
    ]
    const engine = new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
    const bm25 = engine.search('деплой', 500)
    expect(bm25.some((h) => h.card.path === '.claude/docs/beta.md')).toBe(false)
    // Плотный индекс знает только два дока; запрос ближе к beta
    const dense = new DenseIndex(
      ['doc:.claude/docs/alpha.md', 'doc:.claude/docs/beta.md'],
      Float32Array.from([1, 0, 0, 1]),
      2,
    )
    const fused = fuseWithDense(engine.cards, bm25, dense, Float32Array.from([0, 1]), { depth: 1 })
    const ids = fused.map((h) => h.card.id)
    expect(ids.slice(0, 2).sort()).toEqual(['doc:.claude/docs/alpha.md', 'doc:.claude/docs/beta.md'])
    const skill = fused.find((h) => h.card.kind === 'skill')
    expect(skill?.score).toBe(0)
    expect(ids.indexOf('skill:deployer')).toBeGreaterThanOrEqual(2)
  })
})

describe('phraseHash', () => {
  it('стабилен и зависит только от path и первых 3000 символов', () => {
    const body = 'а'.repeat(3000)
    expect(phraseHash('p.md', body)).toBe(phraseHash('p.md', body + 'хвост'))
    expect(phraseHash('p.md', body)).toMatch(/^[0-9a-f]{16}$/)
    expect(phraseHash('p.md', body)).not.toBe(phraseHash('q.md', body))
    expect(phraseHash('p.md', 'один')).not.toBe(phraseHash('p.md', 'другой'))
  })
})

describe('phraseRanking и fuseWithDense с extra', () => {
  const cards = ['a', 'b', 'c'].flatMap((n) =>
    docCards({
      path: `.claude/docs/${n}.md`,
      markdown: `# ${n}
`,
    })
  )
  const engine = new Bm25(JSON.parse(JSON.stringify(buildIndex(cards, 'test'))))
  const ids = ['doc:.claude/docs/a.md', 'doc:.claude/docs/b.md', 'doc:.claude/docs/c.md']
  // Собственные векторы доков: все далеки от запроса [0, 1], кроме c (слабо)
  const dense = new DenseIndex(ids, Float32Array.from([1, 0, 1, 0, 0.6, 0.8]), 2)
  const query = Float32Array.from([0, 1])

  it('док с близкой формулировкой выше дока без неё; док без формулировок идёт по своему вектору', () => {
    // У a две формулировки: далёкая и близкая (берётся максимум); у b формулировок нет; у c — далёкая
    const phrases = new DenseIndex([ids[0], ids[0], ids[2]], Float32Array.from([1, 0, 0, 1, 1, 0]), 2)
    const ranking = phraseRanking(engine.cards, phrases, dense, query)
    expect(ranking[0]).toBe(ids[0])
    expect(ranking).toContain(ids[1])
    expect(ranking).toHaveLength(3)
  })

  it('extra: док только из extra попадает в голову; без extra результат прежний', () => {
    const bm25 = engine.search('нет такого слова', 500)
    const without = fuseWithDense(engine.cards, bm25, dense, query, { depth: 1 })
    expect(without.map((h) => h.card.id)).toEqual([ids[2]])
    const withExtra = fuseWithDense(engine.cards, bm25, dense, query, { depth: 1, extra: [[ids[0]]] })
    expect(withExtra.map((h) => h.card.id).sort()).toEqual([ids[0], ids[2]].sort())
  })
})
