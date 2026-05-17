/**
 * MCP-сервер letar-consultant.
 * Даёт Claude Code инструмент consult_letar — «спросить локальную LLM о монорепо».
 * Архитектура: вопрос → RAG (Qdrant) → промпт → Ollama → ответ с цитатами.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { checkOllamaHealth, listOllamaModels, ollamaChat } from './llm.js'
import { buildMessages, type ConsultMode } from './prompt.js'
import { retrieveChunks } from './retrieve.js'

export interface LetarConsultantOptions {
  /** Модель Ollama (по умолчанию qwen2.5-coder:7b) */
  model?: string
  /** URL Ollama */
  ollamaUrl?: string
  /** URL Qdrant */
  qdrantUrl?: string
  /** Максимум чанков из RAG */
  maxChunks?: number
  /** Максимум токенов в ответе */
  maxTokens?: number
}

/** Создаёт MCP-сервер letar-consultant */
export function createLetarConsultantServer(options: LetarConsultantOptions = {}): McpServer {
  const {
    model = process.env['LETAR_CONSULTANT_MODEL'] ?? 'gemma-4',
    // llama.cpp server по умолчанию на 8080; Ollama fallback — 11434
    ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:8080',
    qdrantUrl = process.env['QDRANT_URL'] ?? 'http://localhost:6333',
    maxChunks = 10,
    maxTokens = 2048,
  } = options

  const server = new McpServer(
    { name: '@letar/letar-consultant', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  // ─── TOOL: consult_letar ────────────────────────────────────────────────────

  server.tool(
    'consult_letar',
    [
      'Консультация с локальной LLM о монорепо letar.',
      'Используй когда нужна "вторая голова" по специфике letar:',
      '- навигация: где находится логика X, какой компонент отвечает за Y',
      '- архитектура: какой паттерн использовать, как реализованы аналоги',
      '- конвенции: как правильно написать по стандартам letar',
      'Модель знает кодовую базу через RAG (Qdrant + nomic-embed-text).',
    ].join('\n'),
    {
      question: z.string().min(10).describe('Вопрос о монорепо letar на русском или английском'),
      mode: z
        .enum(['navigation', 'architecture', 'convention', 'auto'])
        .optional()
        .default('auto')
        .describe(
          'Режим: navigation (где что находится), architecture (паттерны), convention (конвенции letar), auto (автоопределение)',
        ),
      files: z
        .array(z.string())
        .optional()
        .describe('Дополнительные файлы для контекста (пути относительно корня репо)'),
      chunks: z
        .number()
        .int()
        .min(3)
        .max(20)
        .optional()
        .default(10)
        .describe('Количество чанков из RAG (3–20, по умолчанию 10)'),
    },
    async ({ question, mode = 'auto', chunks = maxChunks }) => {
      // 1. Получаем релевантный контекст из Qdrant
      const codeChunks = await retrieveChunks(question, chunks, {
        ollamaUrl,
        qdrantUrl,
        embedModel: 'nomic-embed-text:latest',
      })

      // 2. Строим сообщения для LLM
      const messages = buildMessages(question, codeChunks, mode as ConsultMode)

      // 3. Запрашиваем ответ у Ollama
      let answer: string
      try {
        const response = await ollamaChat(messages, {
          model,
          ollamaUrl,
          maxTokens,
          temperature: 0.3,
        })
        answer = response.text

        // Добавляем метаинформацию в конец ответа
        const tokenInfo = response.evalCount ? ` | токены: ${response.evalCount}` : ''
        const timeInfo = response.evalDuration
          ? ` | время: ${(response.evalDuration / 1e9).toFixed(1)}с`
          : ''
        const chunksInfo = codeChunks.length > 0 ? ` | найдено чанков: ${codeChunks.length}` : ' | RAG недоступен'

        answer += `\n\n---\n*letar-consultant (${model}${tokenInfo}${timeInfo}${chunksInfo})*`
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: [
                `❌ Ошибка при запросе к Ollama: ${errMsg}`,
                '',
                '**Диагностика:**',
                `- Модель: \`${model}\``,
                `- URL Ollama: \`${ollamaUrl}\``,
                '',
                'Проверь что модель скачана: `ollama list`',
                `Для скачивания: \`ollama pull ${model}\``,
              ].join('\n'),
            },
          ],
          isError: true,
        }
      }

      return {
        content: [{ type: 'text', text: answer }],
      }
    },
  )

  // ─── TOOL: consultant_status ────────────────────────────────────────────────

  server.tool(
    'consultant_status',
    'Проверяет состояние letar-consultant: доступность Ollama, загруженные модели, статус RAG.',
    {},
    async () => {
      const ollamaOk = await checkOllamaHealth(ollamaUrl)
      const models = ollamaOk ? await listOllamaModels(ollamaUrl) : []

      // Проверяем Qdrant
      let qdrantOk = false
      let qdrantCollections: string[] = []
      try {
        const resp = await fetch(`${qdrantUrl}/collections`, { signal: AbortSignal.timeout(3000) })
        if (resp.ok) {
          qdrantOk = true
          const data = (await resp.json()) as { result?: { collections?: Array<{ name: string }> } }
          qdrantCollections = data.result?.collections?.map((c) => c.name) ?? []
        }
      } catch {
        // Qdrant недоступен
      }

      const hasInferenceModel = models.some(
        (m) => !m.includes('nomic-embed') && !m.includes('embed'),
      )
      const currentModelAvailable = models.some((m) => m.startsWith(model.split(':')[0] ?? ''))

      const lines = [
        '## Статус letar-consultant',
        '',
        `**Ollama** (${ollamaUrl}): ${ollamaOk ? '✅ доступен' : '❌ недоступен'}`,
        ollamaOk ? `**Модели**: ${models.join(', ') || '(нет)'}` : '',
        ollamaOk
          ? `**Текущая модель** (\`${model}\`): ${
            currentModelAvailable ? '✅ доступна' : '❌ не найдена — запусти: `ollama pull ' + model + '`'
          }`
          : '',
        !hasInferenceModel && ollamaOk
          ? `⚠️ Нет inference-модели. Рекомендуется: \`ollama pull qwen2.5-coder:7b\``
          : '',
        '',
        `**Qdrant** (${qdrantUrl}): ${qdrantOk ? '✅ доступен' : '❌ недоступен'}`,
        qdrantOk ? `**Коллекции**: ${qdrantCollections.join(', ') || '(нет — индекс не создан)'}` : '',
        !qdrantOk ? '⚠️ Запусти SocratiCode для поднятия Qdrant' : '',
        '',
        '**Команды для запуска:**',
        '```',
        '# Скачать модель (если нет):',
        `ollama pull ${model}`,
        '# Поднять Qdrant (через SocratiCode):',
        '# вызови mcp__socraticode__codebase_status',
        '```',
      ]
        .filter((l) => l !== '')
        .join('\n')

      return { content: [{ type: 'text', text: lines }] }
    },
  )

  return server
}
