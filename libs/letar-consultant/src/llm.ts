/**
 * Клиент для локального Ollama LLM.
 * Поддерживает стриминг и non-streaming режимы.
 */

/** Конфигурация Ollama */
export interface OllamaConfig {
  /** URL сервера Ollama (по умолчанию localhost:11434) */
  baseUrl?: string
  /** Модель для инференса */
  model?: string
  /** Максимальное количество токенов в ответе */
  maxTokens?: number
  /** Температура генерации */
  temperature?: number
  /** Таймаут запроса в мс */
  timeoutMs?: number
}

/** Сообщение для Ollama chat API */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Ответ Ollama */
export interface OllamaResponse {
  text: string
  /** Количество токенов в ответе */
  evalCount?: number
  /** Время генерации в наносекундах */
  evalDuration?: number
}

const DEFAULT_CONFIG: Required<OllamaConfig> = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5-coder:14b',
  maxTokens: 2048,
  temperature: 0.3,
  timeoutMs: 120_000,
}

/**
 * Отправляет сообщения в Ollama и возвращает полный ответ.
 * Использует /api/chat endpoint с streaming=false для простоты.
 */
export async function ollamaChat(
  messages: ChatMessage[],
  config: OllamaConfig = {},
): Promise<OllamaResponse> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const url = `${cfg.baseUrl}/api/chat`

  const body = {
    model: cfg.model,
    messages,
    stream: false,
    options: {
      num_predict: cfg.maxTokens,
      temperature: cfg.temperature,
    },
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama ответил ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as {
      message?: { content?: string }
      eval_count?: number
      eval_duration?: number
    }

    return {
      text: data.message?.content ?? '',
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Возвращает список доступных моделей в Ollama.
 */
export async function listOllamaModels(baseUrl = DEFAULT_CONFIG.baseUrl): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) return []
    const data = (await response.json()) as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) ?? []
  } catch {
    return []
  }
}

/**
 * Проверяет доступность Ollama.
 */
export async function checkOllamaHealth(baseUrl = DEFAULT_CONFIG.baseUrl): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}
