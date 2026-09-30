import { Bm25, buildIndex } from './bm25'
import { BRIEF_HEADER, formatBrief, formatOneLine } from './brief'
import { parsePatternRegistry } from './collect'
import { hybridHits } from './dense'
import { parseFrontmatter } from './frontmatter'
import { layoutHits, scout } from './search'
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
      'command',
      '.claude/commands/deploy-check.md',
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
