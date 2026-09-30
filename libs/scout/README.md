# @letar/scout

Локальный скаут: индекс знаний монорепо (доки, правила, скилы, команды, субагенты) и короткая
справка для агента по тексту задачи. Устройство, режимы хука и замеры —
[local-scout](/.claude/docs/local-scout.md).

## API

```typescript
import { Bm25, buildIndex, collectCards, formatBrief, formatOneLine, scout } from '@letar/scout'

const index = buildIndex(collectCards('C:/web/letar')) // сериализуемый ScoutIndex
const engine = new Bm25(index) // инвертированный список строится при загрузке
const result = scout(engine, 'деплой упал на frozen-lockfile')
formatBrief(result) // справка для агента: доки, ловушки ⚠️, инструмент — с файл:строка
formatOneLine(result) // «🔎 скаут: 2 дока, 3 ловушки»
```

| Экспорт                         | Что делает                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `collectCards(root)`            | обходит `.claude/` (Node `fs`) и собирает карточки                              |
| `docCards`, `toolCard`          | чистые парсеры: док → карточка дока + карточки секций; frontmatter → инструмент |
| `parseIndexEntries`             | записи `- [name](/path) [⭐\|⚠️] аннотация` с разделом; флаги — только в начале  |
| `buildIndex(cards)`             | частоты термов с весами полей → `ScoutIndex`                                    |
| `Bm25`                          | Okapi BM25, `b = 0.9` по замеру                                                 |
| `scout(engine, query, options)` | раскладка: до 5 доков, до 3 ловушек, 1 инструмент; секции сводятся к доку       |
| `formatBrief`, `formatOneLine`  | текст справки и строка для владельца                                            |
| `tokenize`                      | русский и английский стемминг, camelCase/kebab-case, стоп-слова                 |

Индекс, логи и маркеры сессий живут вне репозитория (`SCOUT_HOME`) — библиотека о них не знает,
это дело `scripts/scout/`.

## Команды

```bash
nx test @letar/scout
nx lint @letar/scout
nx typecheck:tsgo @letar/scout
```

## Подключение к приложению

Не предназначена для приложений: её используют `scripts/scout/` и хук `.claude/hooks/scout-brief.ts`
относительным импортом. Если понадобится в приложении — по
[libs.md § Подключение к приложению](/.claude/rules/libs.md).
