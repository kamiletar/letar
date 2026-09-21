import { pretty } from '@letar/mcp-server-kit'
import { connectedClient, expectValidationError, textOf } from '@letar/mcp-test-kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentRequest } from './client'
import { LOG_BUDGET_CHARS } from './log-tools'
import { createDeployMcpServer } from './server'

// Мокаем сеть (SSH-туннель → dashboard-agent) — инструмент гоняем настоящим MCP-клиентом,
// как в .claude/docs/mcp-tool-handler-testing-pattern.md. Лог синтетический: реальный деплой для
// проверки запускать нельзя (только deploy-agent-dev).
vi.mock('./client', () => ({ agentRequest: vi.fn() }))
vi.mock('./config', () => ({
  originMainSha: vi.fn(),
  isAffectedSince: vi.fn(),
  changedPathsSince: vi.fn(),
}))

const connect = () => connectedClient(createDeployMcpServer)

const ESC = String.fromCharCode(27)

/** Таблица маршрутов Next.js 16 как её печатает `next build`. */
const ROUTE_TABLE = [
  'Route (app)',
  '┌ ○ /',
  '├ ○ /_not-found',
  '├ ● /[locale]',
  '│ ├ /ru',
  '│ └ /en',
  '├ ● /[locale]/blog/[slug]',
  '│ ├ /ru/blog/one',
  '│ ├ /ru/blog/two',
  '│ ├ /en/blog/one',
  '│ └ [+5 more paths]',
  '├ ƒ /[locale]/mandala/[slug]',
  '├ ƒ /api/health',
  '└ ƒ /admin',
  '',
  'ƒ Proxy (Middleware)',
  '',
  '○  (Static)   prerendered as static content',
  '●  (SSG)      prerendered as static HTML (uses generateStaticParams)',
  'ƒ  (Dynamic)  server-rendered on demand',
]

/**
 * Лог размера реального лога kami (там 2170 строк, ~258 тыс. символов), из-за которого
 * `deploy_status({ sinceLine: 0 })` падал с «exceeds maximum allowed tokens». Таблица маршрутов
 * и «интересные» строки лежат в известных местах; вся остальная масса — шум сборки.
 */
function buildBigLog(): { output: string[]; routeAt: number; tunnelAt: number; econnAt: number; migrationsAt: number } {
  const output: string[] = []
  const noise = (i: number) =>
    `#12 ${(i / 10).toFixed(1)} ${ESC}[2m▲ compiling${ESC}[0m module ${i} of the application bundle `
    + `${'x'.repeat(70)}`
  for (let i = 0; i < 900; i++) {
    output.push(noise(i))
  }
  const routeAt = output.length
  // Внутри docker build у строк вывода `next build` есть префикс «#NN секунды».
  ROUTE_TABLE.forEach((line, i) => output.push(`#17 ${(52 + i / 10).toFixed(1)} ${line}`))
  for (let i = 0; i < 700; i++) {
    output.push(noise(900 + i))
  }
  const tunnelAt = output.length
  output.push('[db-tunnel] ssh -L 15432:db:5432 поднят, порт 15432 открыт')
  for (let i = 0; i < 300; i++) {
    output.push(noise(1600 + i))
  }
  const econnAt = output.length
  output.push('Error: connect ECONNREFUSED 127.0.0.1:15432')
  output.push('    at TCPConnectWrap.afterConnect (node:net:1611:16)')
  output.push("PrismaClientInitializationError: Can't reach database server, code P1001")
  for (let i = 0; i < 100; i++) {
    output.push(noise(1900 + i))
  }
  const migrationsAt = output.length
  output.push('No pending migrations to apply.')
  for (let i = 0; i < 50; i++) {
    output.push(noise(2000 + i))
  }
  return { output, routeAt, tunnelAt, econnAt, migrationsAt }
}

const snapshot = (output: string[], extra: Record<string, unknown> = {}) => ({
  deployId: 'd1',
  app: 'kami',
  running: false,
  status: 'success',
  phases: [{ name: 'build', startedAt: '2026-09-21T10:00:00.000Z' }],
  truncatedLines: 0,
  output,
  totalLines: output.length,
  fromLine: 0,
  stalled: false,
  ...extra,
})

const mockAgent = (data: unknown) => vi.mocked(agentRequest).mockResolvedValue({ success: true, data })

async function callStatus(args: Record<string, unknown>) {
  const { client } = await connect()
  const result = await client.callTool({ name: 'deploy_status', arguments: { server: 's1', deployId: 'd1', ...args } })
  return { result, out: textOf(result) }
}

describe('deploy_status — без фильтров', () => {
  beforeEach(() => {
    vi.mocked(agentRequest).mockReset()
  })

  it('короткий лог отдаётся прежним форматом, байт в байт', async () => {
    const data = snapshot(['строка 1', 'строка 2'])
    mockAgent(data)
    const { out } = await callStatus({ sinceLine: 0 })
    expect(out).toBe(`## Деплой на s1\n\n${pretty(data)}`)
  })

  it('output не массив строк (дрейф версий агента) — прежний формат, без падения', async () => {
    const data = { deployId: 'd1', output: 'строкой', running: false }
    mockAgent(data)
    const { out, result } = await callStatus({ routeTable: true })
    expect(result.isError).toBe(false)
    expect(out).toBe(`## Деплой на s1\n\n${pretty(data)}`)
  })

  it('огромный лог с sinceLine: 0 обрезается по бюджету, начало + подсказка продолжения', async () => {
    const { output } = buildBigLog()
    mockAgent(snapshot(output))
    const { out, result } = await callStatus({ sinceLine: 0 })
    expect(result.isError).toBe(false)
    expect(out.length).toBeLessThan(LOG_BUDGET_CHARS + 3_000)
    expect(out).toContain('Лог обрезан до лимита ответа')
    // Курсор: листаем вперёд, значит отдано начало лога, а не хвост.
    expect(out).toContain('module 0 of the application bundle')
    expect(out).not.toContain('No pending migrations')
    const next = out.match(/"nextSinceLine": (\d+)/)
    expect(next).not.toBeNull()
    expect(out).toContain(`Продолжить чтение: sinceLine: ${next?.[1]}`)
    expect(out).not.toContain(ESC)
  })

  it('без курсора обрезанный лог — хвост (свежее), с указанием, как читать начало', async () => {
    const { output } = buildBigLog()
    mockAgent(snapshot(output))
    const { out } = await callStatus({})
    expect(out).toContain('Лог обрезан до лимита ответа')
    expect(out).toContain('Показан хвост')
    expect(out).toContain('No pending migrations to apply.')
    expect(out).not.toContain('module 0 of the application bundle')
  })

  it('заголовок JSON остаётся: фазы и totalLines видны и при обрезке', async () => {
    const { output } = buildBigLog()
    mockAgent(snapshot(output))
    const { out } = await callStatus({ sinceLine: 0 })
    expect(out).toContain('"phases"')
    expect(out).toContain(`"totalLines": ${output.length}`)
  })
})

describe('deploy_status — grep', () => {
  beforeEach(() => {
    vi.mocked(agentRequest).mockReset()
  })

  it('возвращает только совпавшие строки с номерами, а не весь лог', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out, result } = await callStatus({ grep: 'ECONNREFUSED' })
    expect(result.isError).toBe(false)
    expect(out.length).toBeLessThan(3_000)
    expect(out).toContain(`${big.econnAt}: Error: connect ECONNREFUSED 127.0.0.1:15432`)
    expect(out).toContain('совпадений: 1')
    expect(out).not.toContain('module 100 of')
    // «output» из JSON убран — вместо него описан просмотренный диапазон.
    expect(out).not.toContain('"output"')
    expect(out).toContain(`"scannedLines": ${big.output.length}`)
  })

  it('фильтр не уходит агенту: grep/routeTable — забота deploy-mcp, а не dashboard-agent', async () => {
    mockAgent(snapshot(['a']))
    await callStatus({ grep: 'a', context: 1, routeTable: true, sinceLine: 5 })
    expect(agentRequest).toHaveBeenCalledWith('s1', { path: '/api/deploy/status?deployId=d1&sinceLine=5' })
  })

  it('по умолчанию подстрока без учёта регистра; спецсимволы regex воспринимаются буквально', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out } = await callStatus({ grep: '/[locale]/blog/[slug]' })
    // Как регулярка `[locale]` — класс символов и нашла бы почти всё; как подстрока — ровно одну строку.
    expect(out).toContain('совпадений: 1')
    expect(out).toContain('├ ● /[locale]/blog/[slug]')
    const ci = await callStatus({ grep: 'no pending MIGRATIONS' })
    expect(ci.out).toContain(`${big.migrationsAt}: No pending migrations to apply.`)
  })

  it('regex: true — альтернативы; ловит и ECONNREFUSED, и P1001', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out } = await callStatus({ grep: 'ECONNREFUSED|P1001', regex: true })
    expect(out).toContain('совпадений: 2')
    expect(out).toContain('ECONNREFUSED')
    expect(out).toContain('code P1001')
  })

  it('context: строки вокруг помечены «-», у совпадения «:», несмежные группы разделены «--»', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out } = await callStatus({ grep: 'ECONNREFUSED|No pending', regex: true, context: 1 })
    expect(out).toContain(`${big.econnAt}: Error: connect ECONNREFUSED`)
    expect(out).toContain(`${big.econnAt + 1}- `)
    expect(out).toContain(`${big.migrationsAt}: No pending migrations to apply.`)
    expect(out).toContain('\n--\n')
  })

  it('нумерация сквозная: с учётом строк, вытесненных агентом', async () => {
    mockAgent(snapshot(['раз', 'два ERR', 'три'], { truncatedLines: 170, fromLine: 170, totalLines: 173 }))
    const { out } = await callStatus({ grep: 'err' })
    expect(out).toContain('171: два ERR')
  })

  it('нет совпадений — так и сказано, и есть пометка про вытесненное агентом начало', async () => {
    mockAgent(snapshot(['раз', 'два'], { truncatedLines: 170, fromLine: 170, totalLines: 172 }))
    const { out, result } = await callStatus({ grep: 'nope' })
    expect(result.isError).toBe(false)
    expect(out).toContain('Совпадений нет среди 2 просмотренных строк')
    expect(out).toContain('Первые 170 строк лога вытеснены на агенте')
  })

  it('много совпадений — ответ ограничен и честно говорит, сколько показано', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out } = await callStatus({ grep: 'compiling' })
    expect(out.length).toBeLessThan(LOG_BUDGET_CHARS + 3_000)
    expect(out).toContain('Обрезано по лимиту ответа')
    // «compiling» есть только в шумовых строках: всё, кроме таблицы, туннеля, ошибок и миграций.
    const noiseLines = big.output.filter((l) => l.includes('compiling')).length
    expect(out).toMatch(new RegExp(`показано \\d+ из ${noiseLines} совпадений`))
    expect(out).toContain('sinceLine:')
  })

  it('ANSI-цвета в лог-ответе вычищены', async () => {
    mockAgent(snapshot([`${ESC}[31mERROR${ESC}[0m: boom`]))
    const { out } = await callStatus({ grep: 'boom' })
    expect(out).toContain('0: ERROR: boom')
    expect(out).not.toContain(ESC)
  })

  it('сверхдлинная строка обрезается с пометкой', async () => {
    mockAgent(snapshot([`needle ${'x'.repeat(5_000)}`]))
    const { out } = await callStatus({ grep: 'needle' })
    expect(out).toMatch(/… \[\+\d+ симв\.\]/)
    expect(out.length).toBeLessThan(2_000)
  })

  it('некорректный regex — ошибка до обращения к агенту', async () => {
    const { client } = await connect()
    const result = await client.callTool({
      name: 'deploy_status',
      arguments: { server: 's1', grep: '(unclosed', regex: true },
    })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('некорректное регулярное выражение')
    expect(agentRequest).not.toHaveBeenCalled()
  })

  it.each([
    ['regex', { regex: true }],
    ['context', { context: 2 }],
  ])('%s без grep — ошибка, а не молчаливое игнорирование', async (_name, args) => {
    const { client } = await connect()
    const result = await client.callTool({ name: 'deploy_status', arguments: { server: 's1', ...args } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('только вместе с grep')
    expect(agentRequest).not.toHaveBeenCalled()
  })

  it.each([
    ['пустой grep', { grep: '' }],
    ['grep длиннее 200', { grep: 'x'.repeat(201) }],
    ['context больше 10', { grep: 'x', context: 11 }],
    ['отрицательный context', { grep: 'x', context: -1 }],
    ['grep не строка', { grep: 5 }],
  ])('%s — ошибка валидации без запроса к агенту', async (_name, args) => {
    const { client } = await connect()
    await expectValidationError(client, 'deploy_status', { server: 's1', ...args })
    expect(agentRequest).not.toHaveBeenCalled()
  })
})

describe('deploy_status — routeTable', () => {
  beforeEach(() => {
    vi.mocked(agentRequest).mockReset()
  })

  it('вырезает таблицу маршрутов из огромного лога, с легендой и без остального шума', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out, result } = await callStatus({ routeTable: true })
    expect(result.isError).toBe(false)
    expect(out.length).toBeLessThan(4_000)
    expect(out).toContain(`строки ${big.routeAt}–${big.routeAt + ROUTE_TABLE.length - 1}`)
    expect(out).toContain('Route (app)')
    expect(out).toContain('├ ● /[locale]/blog/[slug]')
    expect(out).toContain('(Static)')
    expect(out).toContain('(SSG)')
    expect(out).toContain('(Dynamic)')
    expect(out).not.toContain('module 100 of')
    expect(out).not.toContain('No pending migrations')
  })

  it('сводка: значки маршрутов и число перечисленных путей у параметрических', async () => {
    mockAgent(snapshot(buildBigLog().output))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('Маршрутов по значкам: ○ static ×2, ● SSG ×2, ƒ dynamic ×3')
    expect(out).toContain('● /[locale]/blog/[slug] — путей перечислено: 3, «ещё»: 5 (всего 8)')
    expect(out).toContain('● /[locale] — путей перечислено: 2')
    // ƒ-маршрут с параметром: значок виден, путей нет — и это подписано.
    expect(out).toContain('ƒ /[locale]/mandala/[slug] — путей перечислено: 0 (список путей пуст)')
    // Статические и API-маршруты без параметров в список параметрических не попадают.
    expect(out).not.toContain('/api/health —')
  })

  it('терпим к префиксу docker и ANSI — как и в реальном логе сборки', async () => {
    const output = ROUTE_TABLE.map((l) => `#17 52.3 ${ESC}[1m${l}${ESC}[0m`)
    mockAgent(snapshot(output))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('● /[locale]/blog/[slug] — путей перечислено: 3, «ещё»: 5 (всего 8)')
    expect(out).not.toContain(ESC)
  })

  it('без docker-префикса (голый `next build`) — то же самое', async () => {
    mockAgent(snapshot(ROUTE_TABLE))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('● /[locale]/blog/[slug] — путей перечислено: 3, «ещё»: 5 (всего 8)')
  })

  it('несколько сборок в одном логе — все таблицы, с нумерацией', async () => {
    mockAgent(snapshot([...ROUTE_TABLE, 'между сборками', ...ROUTE_TABLE]))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('Таблица маршрутов Next.js (1 из 2)')
    expect(out).toContain('Таблица маршрутов Next.js (2 из 2)')
  })

  it('таблицы нет — так и сказано, с пометкой про вытесненное агентом начало', async () => {
    mockAgent(snapshot(['шум', 'шум'], { truncatedLines: 170, fromLine: 170, totalLines: 172 }))
    const { out, result } = await callStatus({ routeTable: true })
    expect(result.isError).toBe(false)
    expect(out).toContain('Таблица маршрутов Next.js')
    expect(out).toContain('Не найдена среди 2 просмотренных строк')
    expect(out).toContain('Первые 170 строк лога вытеснены на агенте')
  })

  it('оборванная таблица (нет легенды) — блок отдан, но помечен как возможно неполный', async () => {
    mockAgent(snapshot(ROUTE_TABLE.slice(0, 8)))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('Легенда «(Static)/(SSG)/(Dynamic)» не найдена')
    expect(out).toContain('├ ● /[locale]')
  })

  it('routeTable: false — не фильтр: работает обычный путь', async () => {
    const data = snapshot(['a', 'b'])
    mockAgent(data)
    const { out } = await callStatus({ routeTable: false })
    expect(out).toBe(`## Деплой на s1\n\n${pretty(data)}`)
  })

  it('вместе с grep: оба раздела в одном ответе', async () => {
    const big = buildBigLog()
    mockAgent(snapshot(big.output))
    const { out } = await callStatus({ routeTable: true, grep: 'tunnel' })
    expect(out).toContain('### Таблица маршрутов Next.js')
    expect(out).toContain('### grep «tunnel»')
    expect(out).toContain(`${big.tunnelAt}: [db-tunnel]`)
    expect(out.length).toBeLessThan(LOG_BUDGET_CHARS)
  })

  // ── таблица, сохранённая самим агентом (dashboard-agent ≥ 0.18.1, PLAN-INFRA-6.md §157) ──

  /** Блок так, как его отдаёт агент: без пустых строк, со сквозными номерами. */
  const agentBlock = (fromLine: number, over: Record<string, unknown> = {}) => ({
    fromLine,
    toLine: fromLine + ROUTE_TABLE.length - 1,
    complete: true,
    lines: ROUTE_TABLE.filter((l) => l !== ''),
    ...over,
  })

  it('таблица вытеснена из output, но сохранена агентом — берётся оттуда', async () => {
    // Начало лога (170 строк, среди них таблица) агент уже выбросил: в output её нет вовсе.
    const output = Array.from({ length: 300 }, (_, i) => `шум ${i}`)
    mockAgent(
      snapshot(output, {
        truncatedLines: 170,
        fromLine: 170,
        totalLines: 470,
        routeTables: [agentBlock(60)],
      }),
    )
    const { out, result } = await callStatus({ routeTable: true })
    expect(result.isError).toBe(false)
    expect(out).toContain('Таблица маршрутов Next.js — строки 60–')
    expect(out).toContain('сохранена агентом отдельно')
    expect(out).toContain('Маршрутов по значкам: ○ static ×2, ● SSG ×2, ƒ dynamic ×3')
    expect(out).toContain('● /[locale]/blog/[slug] — путей перечислено: 3, «ещё»: 5 (всего 8)')
    expect(out).not.toContain('Не найдена')
  })

  it('блок агента в ответ без routeTable не просачивается: ни в обычный вид, ни в обрезанный', async () => {
    mockAgent(snapshot(['короткий лог'], { routeTables: [agentBlock(3)] }))
    const short = await callStatus({ sinceLine: 0 })
    expect(short.out).not.toContain('Route (app)')
    expect(short.out).not.toContain('routeTables')

    mockAgent(snapshot(buildBigLog().output, { routeTables: [agentBlock(900)] }))
    const big = await callStatus({ sinceLine: 0 })
    expect(big.out).toContain('Лог обрезан до лимита ответа')
    expect(big.out).not.toContain('routeTables')
  })

  it('агент новый, блока не встретил — сказано про это, а не про «старый агент»', async () => {
    mockAgent(snapshot(['шум'], { routeTables: [] }))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('Не найдена среди 1 просмотренных строк')
    expect(out).toContain('Агент сохраняет таблицу отдельно')
    expect(out).not.toContain('версия < 0.18.1')
  })

  it('старый агент без поля routeTables — сказано про версию, разбор идёт по строкам лога', async () => {
    mockAgent(snapshot(['шум']))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('версия < 0.18.1')
  })

  it('поле routeTables неверной формы игнорируется: ищем в логе, ответ не падает', async () => {
    mockAgent(snapshot(ROUTE_TABLE, { routeTables: [{ fromLine: 'x' }, null, 42] }))
    const { out, result } = await callStatus({ routeTable: true })
    expect(result.isError).toBe(false)
    expect(out).toContain('● /[locale]/blog/[slug] — путей перечислено: 3, «ещё»: 5 (всего 8)')
  })

  it('оборванный блок агента (нет легенды) помечен как возможно неполный', async () => {
    mockAgent(snapshot(['шум'], { routeTables: [agentBlock(10, { complete: false, lines: ROUTE_TABLE.slice(0, 6) })] }))
    const { out } = await callStatus({ routeTable: true })
    expect(out).toContain('Легенда «(Static)/(SSG)/(Dynamic)» не найдена')
  })
})
