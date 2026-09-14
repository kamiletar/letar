#!/usr/bin/env bun
/**
 * letar — объединённый MCP-сервер для всех наших TS-инструментов монорепо.
 *
 * Раньше — 9 отдельных stdio-процессов (studio-time, studio, umami, glitchtip, deploy, form,
 * synth, domwellbes-assist ×2 dev/prod). Теперь один процесс: каждая часть строится своей
 * существующей фабрикой (createXMcpServer из libs/*), подключается к внутреннему in-memory
 * MCP-клиенту, а наружу отдаётся один слитый список инструментов/ресурсов/промптов через
 * низкоуровневый Server. Код библиотек и их тесты (server.spec.ts через connectedClient) не
 * меняются — это тот же приём, что libs/mcp-test-kit использует в тестах, только применённый
 * ко всем частям разом.
 *
 * Приватная часть (domwellbes-assist — apps/domwellbes приватный submodule, может физически
 * отсутствовать на машине/CI) и synth подключаются через динамический import() за existsSync —
 * если файла нет или он бросает при импорте/старте, эта часть просто пропускается со
 * строкой в stderr, остальные части продолжают работать (см. mountPart/tryMount ниже).
 *
 * Запуск: bun .claude/mcp/letar.ts (см. .mcp.json), cwd — корень репозитория.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

// ─── Подключение фабрики к внутреннему in-memory клиенту (как mcp-test-kit connectedClient) ───

async function connectInMemory(server: McpServer): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'letar-internal', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return client
}

// ─── Глобальные таблицы маршрутизации, наполняются mountPart/mountAssist на старте ───

interface ToolEntry {
  name: string
  description?: string
  inputSchema: unknown
}

const toolDefs = new Map<string, ToolEntry>()
const toolDispatch = new Map<string, (args: Record<string, unknown> | undefined) => Promise<unknown>>()
const resourceDefs: unknown[] = []
const resourceTemplateDefs: unknown[] = []
const resourceDispatch = new Map<string, (uri: string) => Promise<unknown>>()
const promptDefs = new Map<string, unknown>()
const promptDispatch = new Map<string, (args: Record<string, unknown> | undefined) => Promise<unknown>>()

/** Подключает часть без переименований (studio-time/studio/umami/glitchtip/form) либо с точечным rename. */
async function mountPart(id: string, client: Client, rename: Record<string, string> = {}): Promise<void> {
  try {
    const { tools } = await client.listTools()
    for (const t of tools) {
      const externalName = rename[t.name] ?? t.name
      if (toolDefs.has(externalName)) {
        console.error(`[letar] дубликат имени инструмента "${externalName}" из части "${id}" — пропущен`)
        continue
      }
      toolDefs.set(externalName, { name: externalName, description: t.description, inputSchema: t.inputSchema })
      toolDispatch.set(externalName, (args) => client.callTool({ name: t.name, arguments: args }))
    }
  } catch (err) {
    console.error(`[letar] часть "${id}": listTools упал —`, err)
  }

  try {
    const { resources } = await client.listResources()
    for (const r of resources) {
      resourceDefs.push(r)
      resourceDispatch.set(r.uri, () => client.readResource({ uri: r.uri }))
    }
  } catch {
    // сервер может не объявлять capability resources — это не ошибка
  }

  try {
    const { resourceTemplates } = await client.listResourceTemplates()
    resourceTemplateDefs.push(...resourceTemplates)
  } catch {
    // capability отсутствует — норма
  }

  try {
    const { prompts } = await client.listPrompts()
    for (const p of prompts) {
      if (promptDefs.has(p.name)) {
        console.error(`[letar] дубликат имени промпта "${p.name}" из части "${id}" — пропущен`)
        continue
      }
      promptDefs.set(p.name, p)
      promptDispatch.set(
        p.name,
        (args) => client.getPrompt({ name: p.name, arguments: args as Record<string, string> }),
      )
    }
  } catch {
    // capability отсутствует — норма
  }
}

/** domwellbes-assist: dev и/или prod клиент с ОДИНАКОВОЙ схемой инструментов — сливаем в один
 * набор внешних имён с добавленным параметром target: "dev" | "prod" (по умолчанию dev). */
const ASSIST_RENAME: Record<string, string> = {
  screen_read: 'assist_screen_read',
  form_state: 'assist_form_state',
  form_fill: 'assist_form_fill',
  highlight: 'assist_highlight',
  dismiss: 'assist_dismiss',
  say: 'assist_say',
  suggest_navigate: 'assist_suggest_navigate',
  // assist_sessions и assist_wait уже с префиксом в исходнике — не переименовываем
}

async function mountAssist(devClient: Client | undefined, prodClient: Client | undefined): Promise<void> {
  const primary = devClient ?? prodClient
  if (!primary) {
    return
  }
  let tools: Awaited<ReturnType<Client['listTools']>>['tools']
  try {
    ;({ tools } = await primary.listTools())
  } catch (err) {
    console.error('[letar] assist: listTools упал —', err)
    return
  }

  for (const t of tools) {
    const externalName = ASSIST_RENAME[t.name] ?? t.name
    const baseSchema = (t.inputSchema ?? { type: 'object', properties: {} }) as {
      type: string
      properties?: Record<string, unknown>
      required?: string[]
    }
    const schema = {
      ...baseSchema,
      properties: {
        ...baseSchema.properties,
        target: {
          type: 'string',
          enum: prodClient ? ['dev', 'prod'] : ['dev'],
          default: 'dev',
          description: 'dev — локальный dev-сервер владельца, prod — реальный сайт domwellbes.ru',
        },
      },
    }
    toolDefs.set(externalName, { name: externalName, description: t.description, inputSchema: schema })
    toolDispatch.set(externalName, (args) => {
      const { target, ...rest } = args ?? {}
      const chosen = target === 'prod' ? prodClient : devClient
      if (!chosen) {
        throw new Error(
          target === 'prod'
            ? 'target="prod" недоступен: ASSIST_MCP_SECRET_PROD не задан в apps/domwellbes/.env.local'
            : 'assist dev недоступен',
        )
      }
      return chosen.callTool({ name: t.name, arguments: rest })
    })
  }
}

// ─── Динамический импорт части: файл может отсутствовать (приватный submodule) или падать ───

async function tryImport(absPath: string): Promise<Record<string, unknown> | undefined> {
  if (!existsSync(absPath)) {
    return undefined
  }
  try {
    return (await import(pathToFileURL(absPath).href)) as Record<string, unknown>
  } catch (err) {
    console.error(`[letar] не удалось импортировать ${absPath} —`, err)
    return undefined
  }
}

// ─── Сборка всех частей ───

async function buildParts(): Promise<void> {
  // Пять фабрик без опций — config.ts каждой сам читает process.env/apps/*/.env.local
  // лениво через process.cwd() (совпадает с cwd stdio-процесса — корень репозитория).
  const plain: Array<{ id: string; path: string; factory: string; rename?: Record<string, string> }> = [
    { id: 'studio-time', path: 'libs/studio-time-mcp/src/server.ts', factory: 'createStudioTimeMcpServer' },
    { id: 'studio', path: 'libs/studio-mcp/src/server.ts', factory: 'createStudioAdminMcpServer' },
    { id: 'umami', path: 'libs/umami-mcp/src/server.ts', factory: 'createUmamiMcpServer' },
    { id: 'glitchtip', path: 'libs/glitchtip-mcp/src/server.ts', factory: 'createGlitchtipMcpServer' },
    {
      id: 'deploy',
      path: 'libs/deploy-mcp/src/server.ts',
      factory: 'createDeployMcpServer',
      rename: {
        list_servers: 'deploy_list_servers',
        git_status: 'deploy_git_status',
        agent_health: 'deploy_agent_health',
      },
    },
  ]

  for (const part of plain) {
    const mod = await tryImport(join(REPO_ROOT, part.path))
    if (!mod) {
      continue
    }
    try {
      const factory = mod[part.factory] as (() => McpServer) | undefined
      if (typeof factory !== 'function') {
        console.error(`[letar] часть "${part.id}": в модуле нет экспорта ${part.factory}`)
        continue
      }
      const server = factory()
      const client = await connectInMemory(server)
      await mountPart(part.id, client, part.rename)
    } catch (err) {
      console.error(`[letar] часть "${part.id}": не удалось построить сервер —`, err)
    }
  }

  // form-mcp: нужен docsPath (см. libs/form-mcp/src/cli.ts resolveDocsPath, монорепо-ветка)
  const formMod = await tryImport(join(REPO_ROOT, 'libs/form-mcp/src/index.ts'))
  if (formMod) {
    try {
      const factory = formMod['createFormMcpServer'] as ((opts: Record<string, unknown>) => McpServer) | undefined
      if (typeof factory === 'function') {
        const docsPath = process.env['FORM_MCP_DOCS_PATH'] ?? join(REPO_ROOT, 'libs', 'forms', 'docs')
        const server = factory({ docsPath, name: '@letar/form-mcp', version: '1.0.0' })
        const client = await connectInMemory(server)
        await mountPart('form', client)
      }
    } catch (err) {
      console.error('[letar] часть "form": не удалось построить сервер —', err)
    }
  }

  // synth: обычный публичный app, но подключаем тем же защищённым путём — файл всё равно может
  // не существовать (переезд/переименование) или упасть при импорте, остальные части не должны
  // от этого пострадать.
  const synthMod = await tryImport(join(REPO_ROOT, 'apps/synth/src/mcp/server.ts'))
  if (synthMod) {
    try {
      const factory = synthMod['createSynthMcpServer'] as ((opts: Record<string, unknown>) => McpServer) | undefined
      if (typeof factory === 'function') {
        const server = factory({
          baseUrl: process.env['SYNTH_MENTOR_URL'] ?? 'http://localhost:3022',
          token: process.env['SYNTH_MENTOR_TOKEN'],
          patchesDir: join(REPO_ROOT, 'apps', 'synth', 'patches'),
          name: '@letar/synth-mcp',
          version: '1.0.0',
        })
        const client = await connectInMemory(server)
        await mountPart('synth', client)
      }
    } catch (err) {
      console.error('[letar] часть "synth": не удалось построить сервер —', err)
    }
  }

  // domwellbes-assist: приватный submodule — файл может отсутствовать целиком (CI, чужая машина).
  // Секреты грузим сами (server.ts их не читает — принимает готовыми параметрами), тем же
  // каскадом, что apps/domwellbes/src/mcp/cli.ts (loadEnvCascade(appDir)).
  const assistMod = await tryImport(join(REPO_ROOT, 'apps/domwellbes/src/mcp/server.ts'))
  if (assistMod) {
    try {
      const envLoadMod = await tryImport(join(REPO_ROOT, 'libs/env-load/src/lib/env-load.ts'))
      const loadEnvCascade = envLoadMod?.['loadEnvCascade'] as ((dir: string) => void) | undefined
      loadEnvCascade?.(join(REPO_ROOT, 'apps/domwellbes'))

      const factory = assistMod['createAssistMcpServer'] as ((opts: Record<string, unknown>) => McpServer) | undefined
      if (typeof factory === 'function') {
        const devSecret = process.env['ASSIST_MCP_SECRET']
        const prodSecret = process.env['ASSIST_MCP_SECRET_PROD']

        let devClient: Client | undefined
        if (devSecret) {
          const devServer = factory({
            baseUrl: process.env['ASSIST_BASE_URL'] ?? 'http://localhost:3025',
            token: devSecret,
            name: '@letar/domwellbes-assist-mcp',
            version: '1.0.0',
          })
          devClient = await connectInMemory(devServer)
        } else {
          console.error('[letar] assist dev: ASSIST_MCP_SECRET не задан в apps/domwellbes/.env.local — пропущен')
        }

        let prodClient: Client | undefined
        if (prodSecret) {
          const prodServer = factory({
            baseUrl: process.env['ASSIST_BASE_URL_PROD'] ?? 'https://domwellbes.ru',
            token: prodSecret,
            name: '@letar/domwellbes-assist-mcp-prod',
            version: '1.0.0',
          })
          prodClient = await connectInMemory(prodServer)
        }

        await mountAssist(devClient, prodClient)
      }
    } catch (err) {
      console.error('[letar] часть "assist": не удалось построить сервер —', err)
    }
  }
}

// ─── Внешний сервер: один слитый список инструментов/ресурсов/промптов ───

async function main(): Promise<void> {
  await buildParts()

  const server = new Server(
    { name: '@letar/letar', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...toolDefs.values()],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const dispatch = toolDispatch.get(request.params.name)
    if (!dispatch) {
      return { content: [{ type: 'text', text: `Неизвестный инструмент "${request.params.name}"` }], isError: true }
    }
    try {
      return await dispatch(request.params.arguments)
    } catch (err) {
      return { content: [{ type: 'text', text: `Ошибка: ${(err as Error).message}` }], isError: true }
    }
  })

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: resourceDefs }))
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: resourceTemplateDefs,
  }))
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const dispatch = resourceDispatch.get(request.params.uri)
    if (!dispatch) {
      throw new Error(`Неизвестный ресурс "${request.params.uri}"`)
    }
    return dispatch(request.params.uri)
  })

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [...promptDefs.values()] }))
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const dispatch = promptDispatch.get(request.params.name)
    if (!dispatch) {
      throw new Error(`Неизвестный промпт "${request.params.name}"`)
    }
    return dispatch(request.params.arguments)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(
    `[letar] запущен: ${toolDefs.size} инструментов, ${resourceDefs.length} ресурсов, ${promptDefs.size} промптов`,
  )
}

void main()
