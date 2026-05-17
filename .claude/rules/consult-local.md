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

- **Модель:** `qwen2.5-coder:14b` (≈9 ГБ VRAM, оптимально для 16 ГБ)
- **RAG:** Qdrant (`localhost:6333`) + nomic-embed-text через Ollama
- **Таймаут:** до 2 минут на ответ — это нормально для 14B модели
- **Fallback:** если Qdrant недоступен — отвечает только на основе конвенций из промпта
- **Замена модели:** через env `LETAR_CONSULTANT_MODEL=qwen2.5-coder:32b` в `.mcp.json`

## Если не работает

1. `consultant_status` — проверить статус Ollama и Qdrant
2. `ollama list` — убедиться что модель скачана
3. `ollama pull qwen2.5-coder:14b` — скачать модель
4. SocratiCode должен быть запущен для Qdrant (вызови `codebase_status`)
