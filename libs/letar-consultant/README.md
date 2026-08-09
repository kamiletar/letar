# @letar/letar-consultant

Локальный AI-консультант по монорепо letar — MCP-сервер по stdio, даёт агенту инструмент
`consult_letar` как «вторую голову» для синтеза архитектурных решений и объяснений поверх
данных, которые уже нашёл SocratiCode. Использование в сессии описано в
[consult-local.md](/.claude/rules/consult-local.md) — этот README про саму библиотеку
(архитектуру и модули), не про то, когда её вызывать.

## Архитектура

```
вопрос → retrieve.ts (RAG: Qdrant + Ollama-эмбеддинги) → prompt.ts (системный промпт
       + конвенции letar + найденный контекст) → llm.ts (OpenAI-совместимый chat API,
       llama.cpp/Ollama) → ответ с цитатами файлов
```

- **`retrieve.ts`** — обращается к Qdrant напрямую по HTTP (минуя MCP SocratiCode), эмбеддинг
  вопроса получает через Ollama (`nomic-embed-text`, принудительно `num_gpu: 0` — не
  конкурирует с llama-server за VRAM). При недоступности RAG возвращает пустой список чанков,
  не бросает исключение — сервер отвечает без контекста.
- **`prompt.ts`** — константный системный промпт с ключевыми конвенциями letar (стек,
  запрет `export default`, `@letar/forms`, `zod/v4` + `.strip()`, ZenStack access control) +
  режимные инструкции (`navigation`/`architecture`/`convention`).
- **`llm.ts`** — клиент OpenAI-совместимого `/v1/chat/completions`, работает как с llama.cpp
  (`baseUrl: http://localhost:8080`), так и с Ollama (`http://localhost:11434`) — эндпоинт
  один и тот же на обеих сторонах.
- **`server.ts`** — собирает MCP-сервер (`@modelcontextprotocol/sdk`) с двумя инструментами.
- **`cli.ts`** — точка входа: поднимает сервер на `StdioServerTransport`.

## Инструменты MCP

| Инструмент          | Действие                                                                               |
| ------------------- | -------------------------------------------------------------------------------------- |
| `consult_letar`     | Вопрос → RAG-контекст из Qdrant → ответ локальной LLM с цитатами файлов                |
| `consultant_status` | Диагностика: доступность Ollama/llama.cpp, загруженные модели, статус коллекций Qdrant |

### `consult_letar`

```typescript
{
  question: string      // мин. 10 символов, на русском или английском
  mode?: 'navigation' | 'architecture' | 'convention' | 'auto'  // дефолт 'auto'
  files?: string[]       // доп. файлы для контекста (пути от корня репо) — принимается схемой,
                          // текущая реализация server.ts его не использует при построении промпта
  chunks?: number        // 3–20, дефолт 10 — сколько чанков брать из RAG
}
```

Вызов из сессии — через сам MCP, не через прямой импорт:

```typescript
mcp__letar - consultant__consult_letar({
  question: 'Как в letar реализована мультитенантность в driving-school?',
  mode: 'architecture',
  chunks: 10,
})
```

## Установка и запуск

Регистрируется в корневом `.mcp.json` как `letar-consultant`:

```json
"letar-consultant": {
  "type": "stdio",
  "command": "cmd",
  "args": ["/c", "bun", "run", "libs/letar-consultant/src/cli.ts"],
  "env": {
    "LETAR_CONSULTANT_MODEL": "gemma-4-26B-A4B-it-MXFP4_MOE.gguf",
    "OLLAMA_URL": "http://localhost:8080",
    "QDRANT_URL": "http://localhost:6333"
  }
}
```

Ручной запуск (для отладки вне MCP-клиента):

```bash
nx serve letar-consultant
```

## Переменные окружения

| Переменная               | Назначение                                                       | Дефолт                  |
| ------------------------ | ---------------------------------------------------------------- | ----------------------- |
| `LETAR_CONSULTANT_MODEL` | Имя модели для chat-запросов                                     | `gemma-4`               |
| `OLLAMA_URL`             | Базовый URL LLM-сервера (llama.cpp слушает 8080, Ollama — 11434) | `http://localhost:8080` |
| `QDRANT_URL`             | URL Qdrant (индекс SocratiCode)                                  | `http://localhost:6333` |

## Технические детали

- **Движок:** llama.cpp server (OpenAI-совместимый API) как основной путь, Ollama — fallback
  на порту 11434 с моделью `qwen2.5-coder:14b`.
- **RAG:** Qdrant (`localhost:6333`, коллекция `letar_code`) + `nomic-embed-text` через Ollama
  (CPU-only). Порог релевантности `minScore: 0.35`.
- **Таймауты:** эмбеддинг — 15с, поиск в Qdrant — 10с, chat-запрос — 120с по умолчанию.

Если сервер не отвечает — сначала `consultant_status`, затем поднять LLM-сервер
(`.\scripts\llm\start-llm-server.ps1`) и убедиться, что Qdrant поднят через SocratiCode
(`codebase_status`). Подробный разбор режимов и troubleshooting —
[consult-local.md](/.claude/rules/consult-local.md).

## Команды

```bash
nx serve letar-consultant   # запуск MCP-сервера по stdio (для отладки)
nx test letar-consultant
nx lint letar-consultant
nx typecheck:tsgo letar-consultant
```
