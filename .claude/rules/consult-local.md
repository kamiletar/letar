# letar-consultant — Локальный AI-консультант по монорепо

**Когда использовать:** когда у тебя низкая уверенность по специфике letar или нужна «вторая голова» для синтеза ответа.

## Инструменты

### `consult_letar` — главный инструмент

Вызывай когда:

- SocratiCode нашёл файлы, но **нужно объяснение или рекомендация** по ним
- Вопрос про **архитектурный выбор** специфичный для letar («как здесь принято делать X?»)
- Нужно **сравнить паттерны** из разных частей монорепо
- **Низкая уверенность** в конвенции — лучше спросить локальную модель

```typescript
mcp__letar - consultant__consult_letar({
  question:
    'Как в letar реализована мультитенантность в driving-school? Какой паттерн использовать для нового приложения?',
  mode: 'architecture', // navigation | architecture | convention | auto
  chunks: 10, // количество чанков из RAG (3–20)
})
```

### `consultant_status` — диагностика

Вызывай если `consult_letar` вернул ошибку или ведёт себя странно:

```typescript
mcp__letar - consultant__consultant_status()
```

## Режимы (mode)

| Режим          | Когда использовать                                 |
| -------------- | -------------------------------------------------- |
| `navigation`   | «Где находится логика X?», «В каком файле Y?»      |
| `architecture` | «Какой паттерн для Z?», «Как реализованы аналоги?» |
| `convention`   | «Как правильно написать по стандартам letar?»      |
| `auto`         | По умолчанию — модель сама определит               |

## Приоритет инструментов

```
Точное имя символа → codebase_symbol (SocratiCode)
Семантический поиск → codebase_search (SocratiCode)
Нужна рекомендация/синтез → consult_letar (letar-consultant)
Архитектурный совет → consult_letar(mode: 'architecture')
Проверка конвенций → consult_letar(mode: 'convention')
```

## Технические детали

- **Движок:** llama.cpp server (`localhost:8080`) — быстрее Ollama, нативный MXFP4 на Blackwell
- **Модель:** Gemma 4 26B MXFP4 (~15.5 ГБ, полностью в VRAM RTX 5080, ~62 т/с)
- **API:** OpenAI-совместимый `/v1/chat/completions` (работает и с Ollama если нужен fallback)
- **RAG:** Qdrant (`localhost:6333`) + nomic-embed-text через Ollama
- **Таймаут:** до 2 минут (обычно 10–20 сек на Gemma 4 при полном VRAM)
- **Запуск сервера:** `.\scripts\llm\start-llm-server.ps1`
- **Fallback на Ollama:** поменяй `OLLAMA_URL` на `http://localhost:11434` в `.mcp.json`

## Если не работает

1. `consultant_status` — статус llama.cpp/Ollama и Qdrant
2. Убедись что llama-server запущен: `.\scripts\llm\start-llm-server.ps1`
3. SocratiCode должен быть запущен для Qdrant (`codebase_status`)
4. Для Ollama fallback: смени порт на 11434 и модель на `qwen2.5-coder:14b` в `.mcp.json`
