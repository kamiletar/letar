/**
 * Модуль получения контекста из SocratiCode через HTTP API.
 * SocratiCode запускается как stdio MCP-сервер, поэтому мы
 * обращаемся к нему напрямую через его REST API (Qdrant + Ollama).
 */

/** Один чанк из индекса SocratiCode */
export interface CodeChunk {
  /** Путь к файлу относительно корня проекта */
  filePath: string
  /** Фрагмент кода/текста */
  content: string
  /** Оценка релевантности (0..1) */
  score: number
  /** Номер строки начала (если известен) */
  startLine?: number
  /** Номер строки конца (если известен) */
  endLine?: number
}

/** Конфигурация поиска */
export interface RetrieveConfig {
  /** URL Qdrant */
  qdrantUrl?: string
  /** URL Ollama для эмбеддингов */
  ollamaUrl?: string
  /** Модель для эмбеддингов */
  embedModel?: string
  /** Имя коллекции в Qdrant */
  collection?: string
  /** Порог релевантности (0..1) */
  minScore?: number
}

const DEFAULT_RETRIEVE_CONFIG: Required<RetrieveConfig> = {
  qdrantUrl: 'http://localhost:6333',
  ollamaUrl: 'http://localhost:11434',
  embedModel: 'nomic-embed-text:latest',
  collection: 'letar_code',
  minScore: 0.35,
}

/**
 * Создаёт эмбеддинг для текста через Ollama.
 */
async function createEmbedding(text: string, config: Required<RetrieveConfig>): Promise<number[]> {
  const response = await fetch(`${config.ollamaUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.embedModel,
      input: text,
      // Принудительно на CPU — не конкурируем с llama-server за VRAM
      options: { num_gpu: 0 },
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Ошибка Ollama embed: ${response.status}`)
  }

  const data = (await response.json()) as { embeddings?: number[][] }
  const embedding = data.embeddings?.[0]
  if (!embedding || embedding.length === 0) {
    throw new Error('Ollama вернул пустой эмбеддинг')
  }
  return embedding
}

/** Тип точки из Qdrant */
interface QdrantPoint {
  id: string | number
  score: number
  payload?: {
    filePath?: string
    file_path?: string
    content?: string
    text?: string
    startLine?: number
    start_line?: number
    endLine?: number
    end_line?: number
  }
}

/**
 * Ищет релевантные чанки в Qdrant по вектору.
 */
async function searchQdrant(vector: number[], limit: number, config: Required<RetrieveConfig>): Promise<QdrantPoint[]> {
  const response = await fetch(`${config.qdrantUrl}/collections/${config.collection}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
      score_threshold: config.minScore,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    // Если коллекция не найдена — возвращаем пустой результат
    if (response.status === 404) return []
    throw new Error(`Qdrant ответил ${response.status}`)
  }

  const data = (await response.json()) as { result?: QdrantPoint[] }
  return data.result ?? []
}

/**
 * Нормализует точку Qdrant в CodeChunk.
 * SocratiCode может использовать разные имена полей в зависимости от версии.
 */
function normalizeChunk(point: QdrantPoint): CodeChunk | null {
  const p = point.payload
  if (!p) return null

  const filePath = p.filePath ?? p.file_path ?? ''
  const content = p.content ?? p.text ?? ''
  if (!filePath && !content) return null

  return {
    filePath,
    content,
    score: point.score,
    startLine: p.startLine ?? p.start_line,
    endLine: p.endLine ?? p.end_line,
  }
}

/**
 * Ищет top-K релевантных чанков по смысловому запросу.
 * Использует прямой доступ к Qdrant (минуя MCP).
 */
export async function retrieveChunks(query: string, limit = 10, config: RetrieveConfig = {}): Promise<CodeChunk[]> {
  const cfg = { ...DEFAULT_RETRIEVE_CONFIG, ...config }

  try {
    const vector = await createEmbedding(query, cfg)
    const points = await searchQdrant(vector, limit, cfg)

    return points
      .map(normalizeChunk)
      .filter((c): c is CodeChunk => c !== null)
      .sort((a, b) => b.score - a.score)
  } catch (error) {
    // Возвращаем пустой массив если RAG недоступен — сервер продолжит без контекста
    console.error('[letar-consultant] RAG недоступен:', error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Форматирует список чанков в строку для включения в промпт.
 */
export function formatChunksForPrompt(chunks: CodeChunk[]): string {
  if (chunks.length === 0) {
    return '(контекст из кодовой базы недоступен — отвечай на основе общих знаний о monorepo)'
  }

  return chunks
    .map((chunk, i) => {
      const location = chunk.startLine ? `${chunk.filePath}:${chunk.startLine}` : chunk.filePath
      return `### [${i + 1}] ${location} (score: ${chunk.score.toFixed(2)})\n\`\`\`\n${chunk.content.slice(
        0,
        800
      )}\n\`\`\``
    })
    .join('\n\n')
}
