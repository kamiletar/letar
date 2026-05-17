/**
 * Клиент для локальной LLM через OpenAI-совместимый API.
 * Работает с llama.cpp (`llama-server --port 8080`)
 * и с Ollama (`/v1/chat/completions` эндпоинт).
 */

/** Конфигурация LLM-клиента */
export interface OllamaConfig {
  /** Базовый URL сервера (llama.cpp: http://localhost:8080, Ollama: http://localhost:11434) */
  baseUrl?: string
  /** Имя модели (llama.cpp игнорирует это поле — модель задаётся при старте сервера) */
  model?: string
  /** Максимальное количество токенов в ответе */
  maxTokens?: number
  /** Температура генерации (0 = детерминировано, 1 = творчески) */
  temperature?: number
  /** Таймаут запроса в мс */
  timeoutMs?: number
  /** URL Ollama (устаревший алиас baseUrl, для обратной совместимости) */
  ollamaUrl?: string
}

/** Сообщение для chat API */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Ответ от LLM */
export interface OllamaResponse {
  text: string
  /** Количество токенов в ответе */
  evalCount?: number
  /** Время генерации в миллисекундах */
  evalDuration?: number
}

const DEFAULT_CONFIG: Required<Omit<OllamaConfig, 'ollamaUrl'>> = {
  baseUrl: 'http://localhost:8080',
  model: 'gemma-4',
  maxTokens: 2048,
  temperature: 0.3,
  timeoutMs: 120_000,
}

/**
 * Нормализует конфиг — обрабатывает ollamaUrl как алиас baseUrl.
 */
function resolveConfig(config: OllamaConfig): Required<Omit<OllamaConfig, 'ollamaUrl'>> {
  const baseUrl = config.baseUrl ?? config.ollamaUrl ?? DEFAULT_CONFIG.baseUrl
  return {
    ...DEFAULT_CONFIG,
    ...config,
    baseUrl,
  }
}

/**
 * Отправляет сообщения через OpenAI-совместимый `/v1/chat/completions`.
 * Работает с llama.cpp server и Ollama.
 */
export async function ollamaChat(messages: ChatMessage[], config: OllamaConfig = {}): Promise<OllamaResponse> {
  const cfg = resolveConfig(config)
  const url = `${cfg.baseUrl}/v1/chat/completions`

  const body = {
    model: cfg.model,
    messages,
    stream: false,
    max_tokens: cfg.maxTokens,
    temperature: cfg.temperature,
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
      throw new Error(`LLM сервер ответил ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { completion_tokens?: number }
      timings?: { predicted_ms?: number }
    }

    const text = data.choices?.[0]?.message?.content ?? ''
    const evalCount = data.usage?.completion_tokens
    // llama.cpp возвращает timings.predicted_ms, переводим в мс
    const evalDuration = data.timings?.predicted_ms

    return { text, evalCount, evalDuration }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Возвращает список моделей.
 * llama.cpp: GET /v1/models, Ollama: GET /v1/models (оба совместимы).
 */
export async function listOllamaModels(baseUrl = DEFAULT_CONFIG.baseUrl): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) })
    if (!response.ok) return []
    const data = (await response.json()) as { data?: Array<{ id: string }> }
    return data.data?.map((m) => m.id) ?? []
  } catch {
    return []
  }
}

/**
 * Проверяет доступность LLM-сервера (llama.cpp или Ollama).
 */
export async function checkOllamaHealth(baseUrl = DEFAULT_CONFIG.baseUrl): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}
