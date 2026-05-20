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
mcp__letar -
  consultant__consult_letar({
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

- **Движок:** llama.cpp server (`localhost:8080`)
- **Модель (дефолт):** Qwen2.5-Coder-14B-Instruct Q4_K_M (~8.5 ГБ VRAM, 7+ ГБ свободно)
- **Gemma 4 26B** — через `-UseGemma4`, но 97% VRAM → shared memory overflow в RAM
- **API:** OpenAI-совместимый `/v1/chat/completions`
- **RAG:** Qdrant (`localhost:6333`) + nomic-embed-text через Ollama (CPU-only, `num_gpu: 0`)
- **Таймаут:** до 2 минут (обычно 15–30 сек на Qwen2.5-14B)
- **Запуск сервера:** `.\scripts\llm\start-llm-server.ps1`
- **С Gemma 4:** `.\scripts\llm\start-llm-server.ps1 -UseGemma4`

## Если не работает

1. `consultant_status` — статус llama.cpp/Ollama и Qdrant
2. Убедись что llama-server запущен: `.\scripts\llm\start-llm-server.ps1`
3. SocratiCode должен быть запущен для Qdrant (`codebase_status`)
4. Для Ollama fallback: смени порт на 11434 и модель на `qwen2.5-coder:14b` в `.mcp.json`
