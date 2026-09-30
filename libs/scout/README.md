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

| Экспорт                                                            | Что делает                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `collectCards(root)`, `parsePatternRegistry`                       | обходит `.claude/` (Node `fs`) и собирает карточки; `PATTERN_HINTS` — русские подсказки паттернов        |
| `docCards`, `toolCard`, `fieldCatalogCards`, `patternCard`         | чистые парсеры: док → карточка + секции; frontmatter → инструмент; каталог полей; паттерн формы          |
| `parseIndexEntries`, `parseSections`                               | записи `- [name](/path) [⭐\|⚠️] аннотация`; секции дока по заголовкам                                    |
| `buildIndex(cards)`, `Bm25`                                        | частоты термов с весами полей → `ScoutIndex`; Okapi BM25, `b = 0.9` по замеру                            |
| `scout(engine, query, options)`, `layoutHits`                      | раскладка: до 5 доков, до 3 ловушек, 1 инструмент; секции сводятся к доку                                |
| `mentionedIn`, `isFormCard`, `FORM_WORDS`                          | док назван в запросе по имени файла (в справку не идёт); признаки запроса про формы                      |
| `DenseIndex`, `embedTexts`, `embedHash`                            | матрица векторов, клиент эмбеддера llama-server, хеш текста карточки для сверки                          |
| `reciprocalRankFusion`, `fuseWithDense`, `fusedHits`, `hybridHits` | слияние BM25 и эмбеддингов (RRF)                                                                         |
| `phraseRanking`, `phraseHash`                                      | формулировки доков (doc2query): рейтинг по ним третьим списком слияния                                   |
| `formRanking`, `formatQuery`, `cardEmbedText`                      | рейтинг полей форм по косинусу; префикс-инструкция запроса; текст карточки для эмбеддера                 |
| `rerankTexts`, `cardRerankText`                                    | реранк — только для экспериментов, боевой путь его не использует                                         |
| `formatBrief(result, { fullItems })`, `formatOneLine`              | справка одним списком по очкам: первые `fullItems` с аннотацией, остальные строкой; строка для владельца |
| `tokenize`, `parseFrontmatter`, `INDEX_VERSION`                    | русский и английский стемминг; frontmatter; версия формата индекса                                       |

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
