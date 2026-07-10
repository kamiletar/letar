# ТЗ: Редактура статей @letar/forms для публикации на Хабре

## Цель

Адаптировать 14 статей (`articles/00-13`) для публикации на habr.com (личный аккаунт). Аудитория — от начинающих разработчиков до сеньёр-архитекторов. Результат: готовые к публикации статьи с визуалами, бенчмарками и правильным тоном.

**Экосистема (3 npm пакета, 4 GitHub репо):**

- [@letar/forms](https://github.com/kamiletar/letar/tree/main/libs/forms) — основная библиотека (v0.80.0)
- [@letar/zenstack-form-plugin](https://github.com/kamiletar/letar/tree/main/libs/zenstack-form-plugin) — ZenStack плагин (v2.1.0)
- [@letar/form-mcp](https://github.com/kamiletar/letar/tree/main/libs/form-mcp) — MCP сервер для AI
- [letar-forms-example](https://github.com/kamiletar/letar/tree/main/apps/form-example) — живые примеры (forms-example.letar.best)

**Публикация:** личный аккаунт, 2 статьи в неделю, первую публикуем отдельно как пробный шар и корректируем подход по фидбэку.

**Порядок работы:**

1. ~~Часть 6 → разработка (testing utilities, URL prefill) + обновление всех GitHub README~~ **ВЫПОЛНЕНО (2026-04-10)**
2. ~~Часть 1 → бенчмарки, тесты, визуалы~~ **ВЫПОЛНЕНО (2026-04-05)**
3. ~~Часть 2 → редактура статей~~ **ВЫПОЛНЕНО (2026-04-05)** — шапки, финалы, спойлеры для всех 14 статей
4. ~~Часть 5 → вставка нераскрытых фич в статьи~~ **ВЫПОЛНЕНО (2026-04-10)**
5. Часть 4 → финальный чеклист перед каждой публикацией — **НЕ НАЧАТО**
6. Часть 3 → публикация по графику — **НЕ НАЧАТО**

### Статус подготовки (обновлено 2026-04-05)

| Артефакт                      | Статус        | Файл                                            |
| ----------------------------- | ------------- | ----------------------------------------------- |
| benchmarks.md                 | done          | `articles/benchmarks.md`                        |
| test-results.md               | done          | `articles/test-results.md`                      |
| SVG: vanilla vs letar         | done          | `articles/images/01-vanilla-vs-letar.svg`       |
| SVG: Context API tree         | done          | `articles/images/03-context-tree.svg`           |
| PNG: All Fields (3 шт)        | done          | `articles/images/04-all-fields-*.png`           |
| GIF: мультистеп               | done          | `articles/images/05-multistep.gif` (80 KB)      |
| GIF: groups & arrays          | done          | `articles/images/06-groups-arrays.gif` (71 KB)  |
| SVG: ZenStack pipeline        | done          | `articles/images/08-zenstack-pipeline.svg`      |
| SVG: offline архитектура      | done          | `articles/images/09-offline-architecture.svg`   |
| Шапки статей (TL;DR, уровень) | done          | Все 14 статей (00-13)                           |
| Финалы (ссылки, навигация)    | done          | Все 14 статей (00-13)                           |
| Testing utilities             | done          | @letar/forms/testing entry point (2026-04-10)   |
| URL Prefill                   | done          | useUrlPrefill + generatePrefillUrl (2026-04-10) |
| GitHub README                 | done          | 3 репо обновлены (2026-04-10)                   |
| Часть 5: нераскрытые фичи     | done          | Все 7 фич вставлены в 8 статей (2026-04-10)     |
| КДПВ (обложки)                | **не начато** | P2 визуалы                                      |

---

## Часть 1: Подготовка (перед редактурой)

### 1.1. Собрать бенчмарки и метрики

Запустить и зафиксировать конкретные цифры для вставки в статьи:

| Что замерить                                                    | Для какой статьи | Как                                                     |
| --------------------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Строки кода: vanilla React vs @letar/forms (одна и та же форма) | 01               | Написать обе версии, посчитать LOC                      |
| Размер бандла @letar/forms (gzip)                               | 12               | `nx build form-components` → `du -sh dist/`             |
| Tree-shaking: сколько весит минимальный импорт                  | 12               | Bundlephobia или webpack-bundle-analyzer                |
| Время рендера формы (10 полей, 50 полей, 100 полей)             | 01, 04           | React DevTools Profiler или `performance.now()` в тесте |
| Время генерации из ZenStack schema (10/50/100 полей)            | 08               | `time nx zenstack:generate driving-school`              |
| Количество re-renders при вводе в поле                          | 01, 03           | React DevTools Profiler, `useRenderCount()`             |
| Размер IndexedDB при offline (1/10/100 форм)                    | 09               | DevTools Application → IndexedDB                        |
| npm install time (cold)                                         | 00, 12           | `time bun add @letar/forms`                             |
| Количество TypeScript ошибок при неправильном имени поля        | 02               | Скриншот IDE с подсветкой ошибки                        |

**Формат результатов:** Записать в `articles/benchmarks.md`:

```markdown
## Бенчмарки (@letar/forms v0.80, 2026-04-XX)

### Размер бандла

- Full: XX KB (gzip)
- Minimal (1 поле): XX KB (gzip)
- Tree-shaking efficiency: XX%

### Производительность

- Рендер 10 полей: XX ms
- Рендер 50 полей: XX ms
- Рендер 100 полей: XX ms
- Re-renders при вводе: X (vs React Hook Form: X, vs Formik: X)

### Генерация

- ZenStack generate (10 моделей): XX s
- ZenStack generate (50 моделей): XX s
```

### 1.2. Собрать тесты и их результаты

Запустить тесты и зафиксировать:

```bash
nx test form-components --coverage
```

Записать в `articles/test-results.md`:

- Количество тестов
- Покрытие (statements, branches, functions, lines)
- Скриншот coverage report
- Список тестовых сценариев (сгруппировать по фичам)

### 1.3. Подготовить визуалы

Следуя `articles/visuals-needed.md`, создать все визуалы. Приоритет:

**P0 (без них не публиковать):**

1. ~~Скриншот "vanilla React vs @letar/forms" (статья 01)~~ — **DONE** `01-vanilla-vs-letar.svg`
2. ~~GIF мультистеп переходов (статья 05)~~ — **DONE** `05-multistep.gif` (80 KB)
3. ~~GIF drag & drop массива (статья 06)~~ — **DONE** `06-groups-arrays.gif` (71 KB)
4. ~~Галерея полей в сетке (статья 04)~~ — **DONE** `04-all-fields-*.png` (3 скриншота)

**P1 (желательно до публикации):**

5. ~~Диаграмма ZenStack pipeline (статья 08)~~ — **DONE** `08-zenstack-pipeline.svg`
6. ~~Диаграмма offline архитектуры (статья 09)~~ — **DONE** `09-offline-architecture.svg`
7. GIF автогенерации формы из схемы (статья 07) — **не начато**
8. Скриншот MCP в Claude Code (статья 11) — **не начато**
9. ~~Диаграмма Context API дерева (статья 03)~~ — **DONE** `03-context-tree.svg`

**P2 (до публикации конкретной статьи):**

10. КДПВ (обложки) для каждой статьи — **не начато**
11. GIF переключения языка (статья 10) — **не начато**
12. GIF offline sync цикла (статья 09) — **не начато**
13. Скриншот npm page (статья 12) — **не начато**

**Инструменты:**

- Скриншоты: `form-develop-app` → Playwright screenshot или ручные
- GIF: Chrome DevTools MCP → `gif_creator` или OBS Studio
- Диаграммы: Excalidraw (https://excalidraw.com), экспорт SVG
- Обложки: Figma или Excalidraw, формат 780×440px

**Именование файлов:** `articles/images/XX-описание.{png|gif|svg}`

---

## Часть 2: Редактура каждой статьи

### 2.0. Общие правила для ВСЕХ статей

Каждая статья должна пройти эти правки:

#### A. Структура (добавить в начало)

```markdown
# [Заголовок — см. рекомендованные ниже]

> **Уровень сложности:** Простой / Средний / Сложный

**TL;DR:**

- Пункт 1 (главный вывод)
- Пункт 2
- Пункт 3

**Кому полезно:**

- 🟢 Junior: [что узнает]
- 🔵 Middle: [что узнает]
- 🔴 Senior: [что узнает]

---
```

#### B. Тон и подача (проверить и исправить)

- [ ] НЕ начинается с "Мы/Наша команда/Наша библиотека"
- [ ] Начинается с проблемы, боли или интересного факта
- [ ] Нет фраз "лучшая библиотека", "уникальное решение" — только факты
- [ ] npm install НЕ в первых 3 абзацах (перенести в конец или в спойлер)
- [ ] Есть личный опыт ("мы обожглись на...", "в продакшене сломалось...")
- [ ] Есть честное признание ограничений ("пока не поддерживаем...", "здесь React Hook Form лучше потому что...")
- [ ] Комментарии в коде — на русском

#### C. Двойная аудитория (добавить блоки)

Для **начинающих** — в каждой статье минимум 1 спойлер:

```markdown
<details>
<summary>Что такое Zod и зачем он нужен (если не знакомы)</summary>

[Объяснение базовой концепции в 5-7 предложений]
[Ссылка на документацию]

</details>
```

Для **сеньёров** — секция "Под капотом":

```markdown
## Под капотом

[Как это реализовано внутри. Паттерны, которые можно переиспользовать
в своих проектах даже без этой библиотеки]
```

#### D. Вставить бенчмарки и метрики

Везде, где утверждается "быстрее/меньше/проще" — подставить конкретные цифры из `benchmarks.md`:

- "48 строк → 5 строк" → указать точные LOC из бенчмарка
- "быстрее" → указать ms из Profiler
- "легче" → указать KB из bundle analysis

#### E. Финал статьи (добавить в конец каждой)

```markdown
---

## Попробовать

- 📖 [Документация](https://forms.letar.best)
- 🎮 [Живые примеры](https://forms-example.letar.best)
- 💻 [GitHub](https://github.com/kamiletar/letar/tree/main/libs/forms)
- 🤖 [MCP для AI](https://www.npmjs.com/package/@letar/form-mcp)

<details>
<summary>Установка</summary>

\`\`\`bash
bun add @letar/forms
\`\`\`

[Минимальный пример из статьи 00]

</details>

---

**[Навигация по серии]**
← Предыдущая: [Название](#)
→ Следующая: [Название](#)

---

**Вопрос для обсуждения:** [Конкретный вопрос, провоцирующий дискуссию]
```

#### F. Хабр-специфичное форматирование

- Заголовки: H2 (`##`) для разделов, H3 (`###`) для подразделов
- Код: тройные backticks с указанием языка (`tsx`, `typescript`, `bash`, `zmodel`)
- Спойлеры: `<details><summary>Заголовок</summary>...</details>`
- Таблицы: с выравниванием `| --- |`
- Изображения: `![alt](url)` с осмысленным alt-текстом
- Ссылки: привязаны к словам, не голые URL
- Нет emoji в заголовках (Хабр не любит)

---

### 2.1. Статья 01 — "Формы в React: почему больно"

**Рекомендуемый заголовок:** "Формы в React: 2 поля = 48 строк. Почему в 2026 это всё ещё боль?"

**Уровень:** Простой
**Хабы:** React, JavaScript, TypeScript, Программирование
**Теги:** react, forms, typescript, zod, react-hook-form, formik, tanstack-form

**Правки:**

- [ ] Сократить с 490 до ~350 строк (убрать повторы в сравнении библиотек)
- [ ] Добавить таблицу "9 проблем → какая библиотека решает какую" (одним взглядом)
- [ ] Вставить P0 визуал: скриншот "до/после" (vanilla vs @letar/forms)
- [ ] Вставить бенчмарк: LOC, re-renders, bundle size в сравнении
- [ ] Добавить спойлер "Что такое Compound Components" для начинающих
- [ ] Добавить секцию "Под капотом: почему TanStack Form, а не React Hook Form" для сеньёров
- [ ] Усилить личный опыт: "мы переписали 10 приложений и вот что поняли"
- [ ] В сравнительной таблице библиотек указать реальные star counts и npm downloads
- [ ] Добавить конкретный вопрос в конце: "Какую библиотеку форм вы используете в 2026? Доросли ли нативные формы React до продакшена?"

---

### 2.2. Статья 02 — "Zod .meta()"

**Рекомендуемый заголовок:** "Zod .meta() — одна схема для валидации, UI и доступности"

**Уровень:** Средний
**Хабы:** React, TypeScript, Программирование
**Теги:** zod, typescript, forms, validation, dry, single-source-of-truth

**Правки:**

- [ ] Добавить спойлер "Что такое Zod v4 и чем отличается от v3" для начинающих
- [ ] Визуализировать "было 80 строк → стало 8 строк" (код рядом или diff)
- [ ] Добавить секцию "Под капотом: как работает unwrapping" с упрощённой диаграммой
- [ ] Добавить сравнение: как ту же задачу решают в React Hook Form (register + rules) и Formik (yup + JSX)
- [ ] Вставить скриншот IDE с TypeScript подсказками (autocomplete из .meta())
- [ ] Вопрос: "Используете ли вы Zod v4 .meta() в своих проектах? Для чего?"

---

### 2.3. Статья 00+03 — Quick Start + Compound Components (ОБЪЕДИНИТЬ)

**Рекомендуемый заголовок:** "От первой формы до архитектуры: Compound Components, Context и createForm()"

**Уровень:** Средний
**Хабы:** React, TypeScript, Программирование
**Теги:** react, compound-components, context-api, design-patterns, forms

**Правки:**

- [ ] Объединить 00 (119 строк) и 03 (408 строк) в одну статью ~400 строк
- [ ] Начать с Quick Start (установка + первая форма за 5 строк)
- [ ] Плавно перейти к "а как это устроено внутри?" (Compound Components)
- [ ] Добавить спойлер "Что такое Compound Components паттерн" (для джунов)
- [ ] Добавить спойлер "Что такое Context API" (для джунов)
- [ ] Добавить секцию "Под капотом: Object.assign трюк для namespace" для сеньёров
- [ ] Диаграмма Context API дерева (P1 визуал)
- [ ] Сравнительная таблица: Compound Components vs JSON-config (плюсы/минусы) — сохранить из 03
- [ ] Показать спектр контроля: FromSchema → AutoFields → Field.\* → useAppForm
- [ ] Вопрос: "Compound Components или JSON-конфиг? Что используете и почему?"

---

### 2.4. Статья 04 — "50+ полей" (РАЗБИТЬ НА 2)

#### Статья 04a: "50+ готовых полей для React-форм: от String до CreditCard"

**Уровень:** Простой
**Хабы:** React, TypeScript, JavaScript
**Теги:** react, forms, ui-components, field-types, open-source

**Правки:**

- [ ] Оставить базовые категории: текст (7), числа (6), даты (6), выбор (10), специальные (7)
- [ ] Вставить P0 визуал: галерея 16 полей в сетке (скриншот)
- [ ] Каждое поле — 2-3 строки описания + минимальный код
- [ ] Добавить ссылки на живые примеры каждого поля
- [ ] Алгоритм автоматического выбора поля (таблица: Zod тип → компонент)
- [ ] Вопрос: "Каких полей вам не хватает в вашей form-библиотеке?"

#### Статья 04b: "Российские документы, платежи и опросы в React-формах за 1 строку"

**Уровень:** Простой
**Хабы:** React, TypeScript, JavaScript
**Теги:** react, forms, inn, snils, payments, surveys, russian-documents

**Правки:**

- [ ] Вынести: опросные (4), табличные (2), платёжные (1), защита (1), утилитарные (3), российские документы (9)
- [ ] Усилить секцию российских документов (ИНН, СНИЛС, паспорт) — это уникально для Хабра
- [ ] Добавить валидацию российских документов (контрольные суммы ИНН, формат СНИЛС)
- [ ] Показать как создать кастомное поле (before/after)
- [ ] Вопрос: "Какие российские документы и форматы нужны в формах, которых нет в этом списке?"

---

### 2.5. Статья 05 — "Мультистеп"

**Рекомендуемый заголовок:** "Мультистеп формы в React: пошаговая валидация, условные шаги и анимации"

**Уровень:** Средний
**Хабы:** React, TypeScript
**Теги:** react, forms, multi-step, wizard, conditional-rendering, ux

**Правки:**

- [ ] Вставить P0 визуал: GIF переходов между шагами
- [ ] Добавить спойлер "Зачем разбивать форму на шаги" (UX исследования, статистика abandonment)
- [ ] Вставить бенчмарк: сколько ms занимает переход между шагами
- [ ] Добавить реальный кейс: "в автошколе форма регистрации была 30 полей, abandon rate = X%, после разбиения на шаги = Y%"
- [ ] Секция "Под капотом: как работает validateOnNext" для сеньёров
- [ ] Вопрос: "Сколько шагов — оптимально? Ваш опыт с мультистеп формами?"

---

### 2.6. Статья 06 — "Массивы и группы"

**Рекомендуемый заголовок:** "Вложенные формы в React: массивы, drag & drop и когда использовать таблицы"

**Уровень:** Сложный
**Хабы:** React, TypeScript
**Теги:** react, forms, arrays, nested-objects, drag-and-drop, dnd-kit

**Правки:**

- [ ] Вставить P0 визуал: GIF drag & drop
- [ ] Добавить спойлер "Что такое вложенные объекты в формах" для начинающих
- [ ] Сравнительная таблица: Form.Group.List vs Form.Field.TableEditor — когда что использовать
- [ ] Вставить бенчмарк: рендер с 5/20/100 элементами в массиве
- [ ] Упомянуть виртуализацию для больших списков
- [ ] Секция "Под капотом: генерация путей (user.addresses[0].city)" для сеньёров
- [ ] Вопрос: "Как вы решаете drag & drop в формах? dnd-kit, react-beautiful-dnd, или свой велосипед?"

---

### 2.7. Статья 07+08 — FromSchema + ZenStack (ОБЪЕДИНИТЬ)

**Рекомендуемый заголовок:** "От БД до UI за 5 минут: ZenStack → Zod → React-форма"

**Уровень:** Сложный
**Хабы:** React, TypeScript, PostgreSQL, Программирование
**Теги:** react, forms, zenstack, prisma, code-generation, crud, single-source-of-truth

**Правки:**

- [ ] Объединить 07 (350 строк) и 08 (350 строк) в ~450 строк
- [ ] Начать с проблемы: "одну сущность описываем 3 раза: в БД, в Zod, в JSX"
- [ ] Показать полный pipeline: schema.zmodel → @form.\* директивы → zenstack:generate → Zod схемы → Form.FromSchema → UI
- [ ] Добавить спойлер "Что такое ZenStack и Prisma" для тех, кто не знаком
- [ ] Добавить спойлер "Что такое ORM" для начинающих
- [ ] Вставить P1 визуал: диаграмма pipeline (Excalidraw)
- [ ] Вставить бенчмарк: время генерации для разного количества моделей
- [ ] 4 уровня контроля: FromSchema → AutoFields → Compound → useAppForm (диаграмма)
- [ ] CRUD пример: полный цикл create + edit для одной модели
- [ ] Секция "Под капотом: как @form.\* директивы трансформируются в .meta()" для сеньёров
- [ ] Вопрос: "Генерируете ли вы формы из схемы БД? Какие инструменты используете?"

---

### 2.8. Статья 09 — "Offline-first"

**Рекомендуемый заголовок:** "Offline-first формы: как не потерять данные при обрыве связи"

**Уровень:** Сложный
**Хабы:** React, JavaScript, PWA
**Теги:** react, forms, offline-first, pwa, indexeddb, service-worker, sync

**Правки:**

- [ ] Вставить P1 визуал: диаграмма offline архитектуры (Excalidraw)
- [ ] Добавить реальный кейс с метриками: "инструкторы автошколы в поле — X% форм спасено от потери"
- [ ] Сравнительная таблица: persistence vs offline vs autosave (уже есть, улучшить)
- [ ] Добавить таблицу лимитов IndexedDB по браузерам (Chrome, Firefox, Safari, мобильные)
- [ ] Спойлер "Что такое IndexedDB и Service Worker" для начинающих
- [ ] Секция "Под капотом: стратегии retry и conflict resolution" для сеньёров
- [ ] Вставить бенчмарк: размер IndexedDB при 1/10/100 сохранённых формах
- [ ] Вопрос: "Как вы решаете offline-сценарии в своих приложениях? PWA, optimistic updates, или просто показываете ошибку?"

---

### 2.9. Статья 10 — "i18n"

**Рекомендуемый заголовок:** "i18n в React-формах: русские падежи, RTL и 120 переводов без боли"

**Уровень:** Средний
**Хабы:** React, TypeScript, JavaScript
**Теги:** react, forms, i18n, internationalization, next-intl, localization

**Правки:**

- [ ] Усилить русскую специфику: падежи, род ("1 файл, 2 файла, 5 файлов")
- [ ] Показать ICU plural rules для русского (3 формы vs английский — 2 формы)
- [ ] Спойлер "Что такое ICU MessageFormat" для начинающих
- [ ] Добавить пример: одна форма на 3 языках (RU/EN/AR) с живой ссылкой
- [ ] Вставить P2 визуал: GIF переключения языка
- [ ] Вставить бенчмарк: "0 re-renders при переключении языка"
- [ ] Вопрос: "Как вы локализуете формы? next-intl, react-i18next, или свой велосипед?"

---

### 2.10. Статья 11 — "MCP + AI"

**Рекомендуемый заголовок:** "MCP: как научить AI генерировать production-ready формы"

**Уровень:** Средний
**Хабы:** Машинное обучение, React, TypeScript
**Теги:** mcp, ai, claude, cursor, forms, code-generation, developer-tools

**Правки:**

- [ ] Начать с демо: "вот что AI сгенерировал за 10 секунд" (скриншот результата)
- [ ] Потом объяснить как это работает (MCP)
- [ ] Вставить P1 визуал: скриншот сеанса в Claude Code
- [ ] Спойлер "Что такое MCP (Model Context Protocol)" для начинающих
- [ ] Сравнение: что AI генерирует БЕЗ MCP (50 строк React Hook Form cruft) vs С MCP (правильный компонент)
- [ ] Список 6 MCP tools с кратким описанием каждого
- [ ] Конфигурация для Claude Code И для Cursor (оба)
- [ ] Добавить предупреждение о безопасности: какие данные отправляются AI
- [ ] Вопрос: "Используете ли вы AI для генерации форм? MCP, Copilot, или промпт-инжиниринг?"

---

### 2.11. Статья 13 — "Analytics"

**Рекомендуемый заголовок:** "67% пользователей бросают форму. Как найти, где именно"

**Уровень:** Простой
**Хабы:** React, Аналитика, JavaScript
**Теги:** react, forms, analytics, conversion, umami, yandex-metrika, abandonment

**Правки:**

- [ ] Начать с шокирующей статистики: "67% форм не отправляются. Вы знаете, на каком поле?"
- [ ] Добавить реальный кейс: "мы нашли, что поле X теряет 40% → убрали → конверсия +15%"
- [ ] Вставить скриншот дашборда с метриками (Umami или custom)
- [ ] Сравнительная таблица: SaaS ($200/мес) vs встроенная аналитика ($0)
- [ ] Показать все 4 адаптера (Umami, Яндекс Метрика, GA4, PostHog) с кодом
- [ ] Спойлер "Что такое funnel analysis" для начинающих
- [ ] Секция "Под капотом: как трекаются события на уровне поля" для сеньёров
- [ ] Вопрос: "Отслеживаете ли вы abandon rate форм? Какие инструменты используете?"

---

### 2.12. Статья 12 — "Open Source ретроспектива"

**Рекомендуемый заголовок:** "2 года, 50+ компонентов, 10 продакшенов: как мы опенсорсили form-библиотеку"

**Уровень:** Простой
**Хабы:** Open Source, React, Программирование
**Теги:** open-source, react, forms, retrospective, lessons-learned

**Правки:**

- [ ] Усилить "что сломалось" — минимум 3 конкретных провала с последствиями
- [ ] Добавить метрики: npm downloads, GitHub stars, contributors, issues (открытые/закрытые)
- [ ] Добавить результаты тестов: покрытие, количество тестов (из test-results.md)
- [ ] Показать стек зависимостей (P1 визуал: диаграмма)
- [ ] Добавить "что бы мы сделали иначе" (3 пункта)
- [ ] Roadmap: что дальше (без дат, но с приоритетами)
- [ ] Скриншоты npm page и GitHub repo (P2)
- [ ] Вопрос: "Опенсорсили ли вы свои внутренние инструменты? Что было самым сложным?"

---

## Часть 3: Порядок и график публикации

### Рекомендуемый порядок

| Неделя | Статья | Заголовок                                                  |
| ------ | ------ | ---------------------------------------------------------- |
| 1 (вт) | 01     | "Формы в React: 2 поля = 48 строк..."                      |
| 1 (пт) | 02     | "Zod .meta() — одна схема для валидации, UI и доступности" |
| 2 (вт) | 00+03  | "От первой формы до архитектуры..."                        |
| 2 (пт) | 04a    | "50+ готовых полей для React-форм..."                      |
| 3 (вт) | 04b    | "Российские документы, платежи и опросы..."                |
| 3 (пт) | 05     | "Мультистеп формы в React..."                              |
| 4 (вт) | 06     | "Вложенные формы в React: массивы, drag & drop..."         |
| 4 (пт) | 07+08  | "От БД до UI за 5 минут..."                                |
| 5 (вт) | 09     | "Offline-first формы..."                                   |
| 5 (пт) | 10     | "i18n в React-формах..."                                   |
| 6 (вт) | 11     | "MCP: как научить AI генерировать..."                      |
| 6 (пт) | 13     | "67% пользователей бросают форму..."                       |
| 7 (вт) | 12     | "2 года, 50+ компонентов..."                               |

**Итого:** 13 публикаций за 7 недель (2 в неделю, вторник + пятница).

### Правила публикации

- Публиковать вт/пт утром (10:00-12:00 МСК) — пик активности Хабра
- Не публиковать если в топе горячая новость (поглотит внимание)
- Первые 2 часа после публикации — активно отвечать на комментарии
- Каждая статья ссылается на предыдущие (навигация по серии)

---

## Часть 4: Финальный чеклист перед каждой публикацией

- [ ] TL;DR в начале
- [ ] "Кому полезно" блок
- [ ] Уровень сложности указан
- [ ] Минимум 1 спойлер для начинающих
- [ ] Секция "Под капотом" для сеньёров (где применимо)
- [ ] Все утверждения "быстрее/меньше" подкреплены цифрами из benchmarks.md
- [ ] Визуалы P0 вставлены
- [ ] КДПВ (обложка) готова
- [ ] npm install в спойлере в конце, не в начале
- [ ] Нет прямой рекламы ("наша библиотека лучше")
- [ ] Есть личный опыт / честные ошибки
- [ ] Конкретный вопрос для дискуссии в конце
- [ ] Навигация по серии (← предыдущая / следующая →)
- [ ] Живые ссылки на примеры проверены
- [ ] Хабы и теги указаны
- [ ] Длина: 1500-4000 слов (5-15 мин чтения)
- [ ] Проверено на Хабр-предпросмотре
- [ ] GitHub README всех 3 пакетов обновлены (секции 6.3-6.5)
- [ ] Версии в README совпадают с npm

---

## Часть 5: Нераскрытые фичи — добавить в статьи

Эти возможности **уже реализованы**, но не раскрыты в статьях. Добавить в соответствующие статьи:

### 5.1. Honeypot + Rate Limiting (security/)

**Куда:** Статья 04b (специальные поля) или отдельный блок в статье 01
**Что показать:**

- `Form.Honeypot` — скрытое поле-ловушка для ботов
- `Form.RateLimiter` — клиентский троттлинг повторных сабмитов
- Почему это лучше CAPTCHA для простых форм (0 friction для пользователя)
- Код: 2-3 строки для добавления защиты

### 5.2. ConversationalMode (Typeform-style)

**Куда:** Статья 07+08 (FromSchema + автогенерация) — отдельная секция
**Что показать:**

- GIF: один вопрос на экране, анимация fade-in-up, прогресс-бар
- Когда использовать: опросы, онбординг, NPS
- Код: `<Form mode="conversational">` — одна строка меняет весь UX
- Сравнение: обычная форма vs conversational (конверсия в опросах)

### 5.3. FormBuilder (drag & drop визуальный конструктор)

**Куда:** Статья 07+08 — секция "Для no-code сценариев"
**Что показать:**

- GIF: перетаскивание полей, настройка свойств, экспорт JSON-схемы
- Кейс: менеджер собирает форму без программиста
- Связка: FormBuilder → JSON schema → FormFromSchema → готовая форма

### 5.4. Autocomplete Map (30+ HTML autocomplete атрибутов)

**Куда:** Статья 02 (Zod .meta()) — секция про accessibility
**Что показать:**

- Таблица: поле → autocomplete атрибут (email → "email", phone → "tel", cc-number → "cc-number")
- Почему важно: мобильные браузеры подставляют данные из автозаполнения
- Факт: 30+ маппингов из коробки, включая кредитные карты и адреса
- Это бесплатная accessibility, которую большинство библиотек не делает

### 5.5. FormComparison (diff-view)

**Куда:** Статья 12 (Open Source) — секция "DX фичи" или статья 04b
**Что показать:**

- Скриншот: "было → стало" для каждого поля (changed подсвечены)
- Кейс: аудит изменений, модерация, approval flow
- Код: `<FormComparison before={old} after={new} onlyChanged />`

### 5.6. FormSkeleton (автоскелетон из схемы)

**Куда:** Статья 00+03 (Quick Start + архитектура)
**Что показать:**

- Скриншот/GIF: пока данные грузятся → скелетон точно повторяет форму
- Код: `<FormSkeleton schema={schema} />` — одна строка
- Сравнение: ручной скелетон (20 строк) vs автоматический (1 строка)

### 5.7. FormReadOnlyView (readonly-режим)

**Куда:** Статья 04b (специальные поля) или 07+08
**Что показать:**

- Скриншот: та же форма, но в режиме "только просмотр" (красиво отформатировано)
- Кейс: карточка клиента, квитанция, подтверждение заказа
- Код: `<FormReadOnlyView schema={schema} data={values} />`

---

## Часть 6: Задания на разработку (перед публикацией)

### 6.1. Testing Utilities — `@letar/forms/testing`

**Приоритет:** Высокий (без этого сеньёры на Хабре не примут всерьёз)
**Статья:** Отдельная (14-я) или секция в статье 12

**Что реализовать:**

```typescript
// libs/forms/src/testing/index.ts
export { expectFieldError, expectNoErrors } from './assertion-helpers'
export { fillField, fillForm } from './fill-helpers'
export { createMockSchema } from './mock-schema'
export { renderForm } from './render-form'
export { expectSubmitCalledWith, submitForm } from './submit-helpers'
```

**API:**

```tsx
import { expectFieldError, fillField, renderForm, submitForm } from '@letar/forms/testing'

// 1. Рендер формы с моком
const { form, getByField } = renderForm(ContactForm, {
  defaults: { name: '', email: '' },
  onSubmit: vi.fn(),
})

// 2. Заполнение полей (поддержка всех типов: String, Select, Date, etc.)
await fillField('name', 'Иван')
await fillField('email', 'ivan@test.com')
await fillField('birthDate', new Date('1990-01-15'))
await fillField('role', 'admin') // Select — по значению или лейблу

// 3. Сабмит и проверка
await submitForm()
expect(form.onSubmit).toHaveBeenCalledWith({
  name: 'Иван',
  email: 'ivan@test.com',
})

// 4. Проверка ошибок валидации
await fillField('email', 'not-an-email')
await submitForm()
expectFieldError('email', 'Некорректный email')

// 5. Мультистеп
await goToStep(2)
expectActiveStep(2)

// 6. Snapshot для FormReadOnlyView
expectReadOnlySnapshot(schema, data).toMatchSnapshot()
```

**Требования:**

- [ ] Работает с Vitest и Jest
- [ ] Поддержка @testing-library/react
- [ ] Типизация: `fillField<T>(name: keyof T, value: T[name])` — автокомплит имён полей
- [ ] Хелперы для мультистеп (goToStep, expectActiveStep)
- [ ] Хелперы для массивов (addItem, removeItem, expectItemCount)
- [ ] Хелперы для FormComparison и FormReadOnlyView
- [ ] Экспорт из `@letar/forms/testing` (отдельный entry point, не попадает в основной бандл)
- [ ] Документация: `docs/testing.md`
- [ ] Тесты на сами хелперы (мета-тесты)

**Влияние на статьи:**

- Добавить секцию "Тестирование" в статью 01 (кратко) и 12 (подробно)
- Возможно отдельная статья "Как тестировать React-формы без боли" — потенциальный хит

---

### 6.2. URL Prefill — `useUrlPrefill()`

**Приоритет:** Средний (частый вопрос, простая реализация)
**Статья:** Секция в статье 00+03 или 05

**Что реализовать:**

```typescript
// libs/forms/src/lib/declarative/use-url-prefill.ts
export function useUrlPrefill<T>(options: UrlPrefillOptions<T>): Partial<T>
```

**API:**

```tsx
// Вариант 1: проп на форме
;<Form
  urlPrefill={{
    enabled: true,
    // Разрешённые поля (whitelist — безопасность!)
    fields: ['name', 'email', 'phone', 'utm_source'],
    // Маппинг URL-параметров на поля формы
    mapping: { user_name: 'name', mail: 'email' },
    // Очистить URL после применения (убирает параметры из адресной строки)
    cleanUrl: true,
  }}
/>

// Вариант 2: хук
const prefilled = useUrlPrefill({
  schema: contactSchema,
  fields: ['name', 'email'],
})
// prefilled = { name: 'Иван', email: 'ivan@test.com' }
// из URL: ?name=Иван&email=ivan@test.com

// Вариант 3: генерация ссылки (для маркетинга)
const url = generatePrefillUrl('/contact', {
  name: 'Иван',
  email: 'ivan@test.com',
})
// → "/contact?name=%D0%98%D0%B2%D0%B0%D0%BD&email=ivan%40test.com"
```

**Требования:**

- [ ] Whitelist полей (без whitelist — не работает, безопасность)
- [ ] Валидация значений через Zod schema перед применением
- [ ] Маппинг параметров (utm_source → internalField)
- [ ] Очистка URL после применения (replaceState)
- [ ] Поддержка массивов: `?tag=react&tag=forms` → `tags: ['react', 'forms']`
- [ ] Поддержка вложенных: `?address.city=Moscow` → `{ address: { city: 'Moscow' } }`
- [ ] Утилита `generatePrefillUrl()` для создания ссылок
- [ ] Работает с Next.js `useSearchParams()` и vanilla React
- [ ] Тесты
- [ ] Документация: секция в `docs/form-level.md`

**Влияние на статьи:**

- Добавить пример в статью 00+03: "Маркетинговые ссылки с автозаполнением формы"
- Упомянуть в статье 05 (мультистеп): "prefill + переход на конкретный шаг"

---

### 6.3. Обновить GitHub README (`kamiletar/letar/tree/main/libs/forms`) — ПЕРЕД первой публикацией

**Приоритет:** Критический (первое что увидит читатель с Хабра)
**Текущее состояние:** https://github.com/kamiletar/letar/tree/main/libs/forms

**Проблемы:**

1. Версия **0.58.0** — отстала от реальной 0.80.0
2. **"40+ полей"** в 3 местах — уже **50+**
3. **Нет GIF/скриншота** — первое что видит человек, перешедший из статьи
4. Не упомянуты ключевые фичи: Analytics, Undo/Redo, ConversationalMode, FormBuilder, FormComparison, FormSkeleton, FormReadOnlyView, Security (honeypot), Captcha
5. **Нет ссылки** на https://forms-example.letar.best (живые примеры)
6. **Нет бейджа** bundle size

**Что сделать:**

#### A. Шапка README (первый экран — решает остаётся ли человек)

```markdown
# @letar/forms

Declarative form library for React — **50+ field types**, multi-step, offline-first, analytics, AI-powered.

[![npm version](https://img.shields.io/npm/v/@letar/forms)](https://www.npmjs.com/package/@letar/forms)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@letar/forms)](https://bundlephobia.com/package/@letar/forms)
[![license](https://img.shields.io/npm/l/@letar/forms)](./LICENSE)

📖 [Documentation](https://forms.letar.best) · 🎮 [Live Examples](https://forms-example.letar.best) · 🤖 [MCP for AI](https://www.npmjs.com/package/@letar/form-mcp)

![hero](./images/hero.gif) ← GIF: заполнение формы с автовалидацией, 3-5 секунд
```

#### B. Добавить секции (которых нет)

После существующих секций добавить:

```markdown
### Offline Support (PWA)

\`\`\`tsx

<Form offline={{ actionType: 'SAVE_REPORT' }} onSubmit={save}>
  <Form.OfflineIndicator />
  ...
</Form>
\`\`\`

### Security

\`\`\`tsx

<Form honeypot rateLimit={{ maxSubmits: 3, windowMs: 60000 }}>
  <Form.Captcha provider="turnstile" />
  ...
</Form>
\`\`\`

### Analytics

\`\`\`tsx

<Form analytics={{ adapter: 'umami', siteId: '...' }}>
  ...
  <Form.Analytics.Panel />  {/* dev-only dashboard */}
</Form>
\`\`\`

### Undo / Redo

\`\`\`tsx

<Form history>
  <Form.History.Controls />  {/* Ctrl+Z / Ctrl+Shift+Z */}
  ...
</Form>
\`\`\`

### Conversational Mode (Typeform-style)

\`\`\`tsx
<Form.Conversational schema={SurveySchema} onSubmit={save} />
\`\`\`

### Form Comparison (Diff View)

\`\`\`tsx
<FormComparison before={oldData} after={newData} onlyChanged />
\`\`\`

### Read-Only View

\`\`\`tsx
<FormReadOnlyView schema={Schema} data={values} />
\`\`\`

### Skeleton Loading

\`\`\`tsx
<FormSkeleton schema={Schema} /> {/_ auto-generated loading state _/}
\`\`\`

### Visual Form Builder

\`\`\`tsx
<FormBuilder onExport={(schema) => console.log(schema)} />
\`\`\`
```

#### C. Обновить цифры

- [ ] `40+` → `50+` везде (3 места в текущем README)
- [ ] Версия внизу: `0.58.0` → актуальная
- [ ] Peer dependencies: проверить актуальные версии (zod >= 3.24.0 — может уже 4.x)
- [ ] Bundle size таблица (если есть данные)

#### D. Добавить визуал

- [ ] **Hero GIF** (3-5 сек): заполнение формы → валидация → сабмит. Формат 800×500px
- [ ] Или **Hero скриншот**: форма с разными полями (Rating, Currency, DateRange, ColorPicker)
- [ ] Положить в `images/` в репозитории letar-forms

#### E. Обновить letar-forms-example README

Репозиторий `kamiletar/letar/tree/main/apps/form-example` тоже нуждается в проверке:

- [ ] Ссылка на https://forms-example.letar.best работает
- [ ] Скриншот главной страницы примеров
- [ ] Инструкция по локальному запуску

#### F. Синхронизировать

После обновления GitHub README — синхронизировать изменения обратно в монорепо:

- [ ] `libs/forms/README.md` — обновить версию и цифры
- [ ] `package.json` в letar-forms npm — проверить что version совпадает

---

### 6.4. Обновить GitHub README (`kamiletar/letar/tree/main/libs/zenstack-form-plugin`)

**Приоритет:** Высокий (упоминается в статье 08)
**Текущее состояние:** https://github.com/kamiletar/letar/tree/main/libs/zenstack-form-plugin

**Проблемы:**

1. Нет бейджей (npm version, downloads)
2. Нет hero-визуала "было → стало"
3. Нет ссылки на live examples
4. Версия v2.1.0 — проверить актуальность

**Что сделать:**

- [ ] Добавить бейджи:
  ```markdown
  [![npm version](https://img.shields.io/npm/v/@letar/zenstack-form-plugin)](https://www.npmjs.com/package/@letar/zenstack-form-plugin)
  [![license](https://img.shields.io/npm/l/@letar/zenstack-form-plugin)](./LICENSE)
  ```
- [ ] Добавить hero-пример "было → стало" в самое начало (после заголовка):
  ```markdown
  **Before:** describe entity 3 times (Prisma model + Zod schema + JSX form)
  **After:** one `schema.zmodel` with `@form.*` directives → everything generated
  ```
- [ ] Добавить ссылки:
  ```markdown
  📖 [Documentation](https://forms.letar.best/guides/zenstack-plugin)
  🎮 [Live Examples](https://forms-example.letar.best/examples/zenstack)
  ```
- [ ] Проверить и обновить версию (v2.1.0 → актуальная)
- [ ] Добавить секцию "Related" с ссылками на @letar/forms и @letar/form-mcp (уже есть внизу form-mcp, добавить аналогично)

---

### 6.5. Обновить GitHub README (`kamiletar/letar/tree/main/libs/form-mcp`)

**Приоритет:** Высокий (упоминается в статье 11)
**Текущее состояние:** https://github.com/kamiletar/letar/tree/main/libs/form-mcp

**Проблемы:**

1. **"40+ fields"** — упомянуто 5 раз, уже 50+
2. Нет бейджей (npm version)
3. Нет GIF/скриншота работы в IDE
4. Не упомянуты новые категории полей: Survey (Likert, MatrixChoice, YesNo, ImageChoice), Table (TableEditor, DataGrid), Document (INN, SNILS, Passport и ещё 6), Payment (CreditCard), Protection (Captcha), Utility (Hidden, Calculated, Auto)

**Что сделать:**

- [ ] `40+` → `50+` везде (5 мест: заголовок, description, field-registry, list_fields, form-docs://fields)
- [ ] Добавить бейджи:
  ```markdown
  [![npm version](https://img.shields.io/npm/v/@letar/form-mcp)](https://www.npmjs.com/package/@letar/form-mcp)
  [![license](https://img.shields.io/npm/l/@letar/form-mcp)](./LICENSE)
  ```
- [ ] Добавить **скриншот или GIF**: сеанс в Claude Code — промпт "создай форму контакта" → сгенерированный код. Это главный selling point
- [ ] Обновить таблицу **Field Categories** — добавить недостающие:
  ```markdown
  | **Survey** | Likert, MatrixChoice, YesNo, ImageChoice |
  | **Table** | TableEditor, DataGrid |
  | **Document** | INN, KPP, OGRN, BIK, BankAccount, CorrAccount, SNILS, Passport |
  | **Payment** | CreditCard |
  | **Protection** | Captcha (Turnstile, reCAPTCHA, hCaptcha) |
  | **Utility** | Hidden, Calculated, Auto |
  ```
- [ ] Добавить ссылки на docs и examples:
  ```markdown
  📖 [Documentation](https://forms.letar.best)
  🎮 [Live Examples](https://forms-example.letar.best)
  ```
- [ ] Обновить `data/field-registry.ts` — добавить новые поля в реестр (если ещё не добавлены)

---

_Создано: 2026-04-04_
_Обновлено: 2026-04-04 — добавлены нераскрытые фичи, задания на разработку, обновление всех GitHub README_
