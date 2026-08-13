# PLAN.md — form-docs

Документационный сайт @letar/forms на Fumadocs.

## Текущее состояние ✅

- 41 MDX-страниц руководств (EN)
- 41 MDX-страниц (RU) — **100% coverage**
- 3 API reference страницы (EN + RU)
- 35 interactive demo-страниц
- Fumadocs MDX + Next.js 16
- Поиск по документации (Fumadocs flexsearch)
- `sitemap.ts` — docs через Fumadocs source API + demo-страницы (PLAN-INFRA.md §33)

## P0 — Критичное ✅

- [x] 3 новых guide: analytics, server-errors, undo-redo
- [x] server-errors.ru.mdx — русская версия

## P1 — Улучшения ✅

- [x] Русские версии: analytics.ru.mdx, undo-redo.ru.mdx
- [x] Восстановлены 5 demo-страниц (calculated, documents, security, signature, utility) — фикс: добавлен ChakraProvider
- [x] auto-fields.mdx + .ru.mdx — guide FromSchema / AutoFields
- [x] mcp.mdx + .ru.mdx — guide MCP Server для AI-ассистентов

## P2 — UX ✅

- [x] Поиск по документации (Fumadocs built-in flexsearch + кастомный SearchDialog)
- [x] Favicon (icon.svg уже был в src/app/)

## P3 — Полная русификация ✅ (v0.1.6)

- [x] 22 оставшихся перевода гайдов на русский (100% RU coverage)
- [x] 5 новых демо-страниц: table-editor, smart-autofill, credit-card, captcha, matrix-choice
- [x] Исправлены 4 сломанных демо: analytics, undo-redo, comparison, depends-on (standalone imports)
- [x] tsconfig path для @letar/forms/analytics

## P4 — SEO ✅ (v0.1.8)

- [x] `sitemap.ts` — источник данных `source.getLanguages()` (Fumadocs source API), а не
      статический список путей: docs-страницы с `alternates.languages` (EN/RU), главная на
      обоих языках, 35 демо-страниц `/demo/*` без локализации. Закрывает PLAN-INFRA.md §33.

## P5 — llms.txt ✅ (v0.1.9)

- [x] `/llms.txt` (Route Handler) — стандарт llmstxt.org, ручной курируемый указатель на ключевую
      документацию (не автогенерация из Fumadocs source API — список должен остаться компактным).
      Фаза 7.6 `libs/forms/PLAN.md`, задача от координатора `QuietRidge` (msg #54).

## P6 — гайды по портированию ✅

- [x] `custom-uikit.mdx` + `.ru.mdx` — реализация `UIKit`-контракта голым HTML/CSS без Chakra/shadcn
- [x] `porting-framework.mdx` + `.ru.mdx` — процессный разбор переноса на Vue (`forms-vue`/
      `forms-vue-shadcn` как живой кейс, не причёсанный reference постфактум)
      Фаза 7.8 → Поток 2 `libs/forms/PLAN.md`, задача от координатора `QuietRidge` (msg #61).

## P7 — переключатели Framework × Skin ⏳ (спроектировано 2026-08-13, реализация не начата)

**Запросил:** Ками напрямую (через координатора `QuietRidge`, 2026-08-13).

**Задача:** на страницах документации — два независимых переключателя:

- **Framework:** React ↔ Vue
- **Skin:** для React — Chakra (`@letar/forms`) ↔ shadcn (`@letar/forms-shadcn`); для Vue —
  headless (`@letar/forms-vue`) ↔ Reka UI (`@letar/forms-vue-shadcn`)

**Почему два переключателя, а не один селектор из 4 комбинаций:** независимые оси масштабируются
на новые фреймворки/скины без пересборки списка (2×2 сейчас, N×M потом). Совпадает с тем, как
разделили оси shadcn (`base` × `style`), Park UI и Nuxt UI — независимо друг от друга.

⚠️ **Ось Skin для Vue асимметрична React-стороне.** `forms-vue` — не второй дизайн-скин, а голая
референсная HTML-вёрстка без CSS (см. «Что не входит в скоуп» в его README). Подписывать честно
(`Headless` / `Reka UI`), не притворяться парой уровня Chakra/shadcn.

### Проверенные факты о текущем состоянии (замер 2026-08-13)

Эти цифры измерены, не оценены — не пересчитывать заново без причины:

| Факт                        | Значение                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| MDX-файлов в `content/docs` | 118 (EN + RU)                                                                                                         |
| tsx-блоков во всех доках    | 516                                                                                                                   |
| файлов, содержащих `<Form.` | 102 из 118                                                                                                            |
| страниц полей               | **6 категорийных** (`string`/`number`/`date`/`select`/`specialized`/`index`) — одна страница на категорию, не на поле |
| гайдов                      | 48 × 2 языка                                                                                                          |
| демо-страниц                | ~35, роут `/demo/*`, **вне** `[lang]` (не локализованы)                                                               |
| Fumadocs                    | `fumadocs-ui`/`fumadocs-core` 16.14.2, `fumadocs-mdx` 15.2.2                                                          |

**Что уже даёт Fumadocs из коробки** (`fumadocs-ui/components/ui/tabs`, проверено по исходнику
`dist/components/ui/tabs.js`):

- `groupId` — синхронизирует все `<Tabs>` с этим id: внутри страницы через модульный `listeners`
  Map, между страницами через `sessionStorage`
- `persist` — дополнительно `localStorage`, память между сессиями
- `updateAnchor` — пишет хеш в URL (для якорей таба, **не** для передачи выбора)
- верхнеуровневый `Tabs` из `fumadocs-ui/components/tabs` наследует эти пропсы
  (`Omit<…, 'value' | 'onValueChange'>`), отдельно ничего писать не нужно

**Чего Fumadocs НЕ даёт:** выбор не попадает в URL — ссылкой «смотри Vue-вариант» поделиться
нельзя. Это дописывается поверх (см. решение 1).

**Демо уже изолированы iframe** (`src/components/demo-container.tsx` → `<iframe src="/demo/…">`,
`src/app/demo/layout.tsx` — свой `<html>` без Fumadocs). CSS Chakra, Tailwind и Vue не конфликтуют
в принципе — это снимает главное техническое ограничение для переключаемых демо.

**Демо одних и тех же полей сейчас живут в четырёх местах:** `apps/form-develop-app` (Chakra),
`apps/form-develop-app-shadcn`, `libs/forms-vue-shadcn/demo` (Vite-харнесс) и ~35 собственных копий
внутри `form-docs`. Переключатели — повод это схлопнуть, а не завести пятое место.

### Архитектурные решения

Каждое опирается на проверенный ресёрч чужих решений (TanStack, Ark UI, Zag.js, Nuxt UI, Park UI,
shadcn/ui, Radix, Reka UI, Docusaurus, VeeValidate) — не на предпочтения. Источник каждого —
в скобках.

**1. Хранение выбора: приоритет `URL → localStorage → дефолт`.**
Дефолт — React + Chakra. URL-носитель — query-параметры (`?fw=vue&skin=shadcn`).
Обоснование: к этой же цепочке независимо пришли TanStack (`URL params > DB > localStorage >
'react'`, комментарий в `FrameworkSelect.tsx`) и Docusaurus (PR #8225: `query string > localStorage

> defaultValue`). Смысл — ссылка из чата/issue/поиска всегда открывает то, что в ней написано;
> хранилище работает только когда URL молчит.

⛔ **Cookie как носитель — не использовать.** Цена измерена живьём на `ark-ui.com` (13.08.2026):
`cache-control: private, no-cache, no-store` (CDN-кеш документации выключен полностью),
`canonical` отсутствует, `Vary` не содержит `Cookie`. Следствие: **Googlebot без cookie видит
только React, Vue/Svelte/Solid-документация в индекс не попадает вовсе.** Для нас это убивает
всю затею (цель `@letar/forms` — OSS-охват, см. `libs/forms/PLAN.md` Фаза 7).
Подтверждение из первоисточника: Google [Managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
— использовать разные URL, а не cookie; [Inside Googlebot 03.2026](https://developers.google.com/search/blog/2026/03/crawler-blog-post)
— WRS работает stateless и **очищает localStorage между запросами**, краулер всегда видит дефолт.

**2. Все варианты рендерятся в HTML на этапе сборки**, переключатель только показывает/прячет.
Тогда индексируются все, `canonical` — self-referencing на URL без параметров, дублей в индексе
нет. Google [mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing):
прятать эквивалентный контент в табы **разрешено**; не разрешено — подгружать основной контент
по действию пользователя.
⛔ Отсюда: `<Tabs lazy>` и паттерн «Show code» для основных примеров — противопоказаны.

**3. Отложенная гидратация — обязательна.**
Читать `localStorage`/query в `useEffect`, **не** в инициализаторе стора. Валидировать значение
против enum, оборачивать доступ к storage в `try/catch` (quota/privacy-mode).
Обоснование: [docusaurus#5653](https://github.com/facebook/docusaurus/issues/5653) — **открыт
с 2021**. Если дефолт вычисляется в браузере, SSR отдаёт одну вкладку, React гидратирует другую,
и результат хуже мигания: стейт React содержит одно, DOM показывает другое, и **клик по видимой
вкладке не работает** (`setState` в то же значение — no-op). Тот же вывод независимо получили
Nuxt UI (комментарий в `FrameworkTabs.vue`: чтение реальной cookie в `setup` оставляет табы
неотзывчивыми) и TanStack (`usePersistedEnumStore.ts` — эталонная реализация, у них же рядом
живёт более старый ошибочный eager-вариант).

**4. Живое демо — одно, на React. Переключается только код.**
Совпало у **пяти** проектов независимо: Ark UI (демо всегда React, хотя доки на 4 фреймворка),
Zag.js (56 демо, все `.tsx`), Park UI, Reka UI (демо всегда Tailwind), Radix Primitives (демо одно
на все CSS-либы). Никто не платит за N живых реализаций — и это не читается как обман.

**Исключение для оси Skin — демо переключаемое.** У нас цена почти нулевая: iframe уже изолирует
CSS, а `form-develop-app` и `form-develop-app-shadcn` уже существуют. Плюс весь смысл скина именно
в том, как он выглядит — показывать shadcn-код рядом с Chakra-виджетом бессмысленно.
Для оси Framework Vue-демо **не строим** — следуем индустрии.

**5. Отсутствующий вариант — неактивная вкладка с пометкой.**
Лучшие найденные механики: вкладка не рисуется вовсе (shadcn фильтрует по наличию страницы) или
рисуется `disabled` (Park UI: `<Tabs.Trigger disabled={!sourceCode}>`). Для нас правильнее
`disabled` — видно, что вариант существует и в работе.
⛔ **Худшее — молча подставить первый вариант:** TanStack `FrameworkContent.tsx` делает
`panels.find(...) || panels[0]`, то есть **Vue-разработчик видит React-код и не знает об этом**.
⛔ **Второе худшее — пустая страница-обещание:** `docs/framework/vue/guides/testing.md` в TanStack
Query — 35 байт, только `id` и `title`. На сайте: пункт в меню есть, заголовок есть, содержания
нет, а React-версия того же файла — полноценный гайд.

**6. Заголовки разделов сделать нейтральными — до включения переключателей.**
Сейчас заголовки содержат имя API: `## Form.Field.Select`. В shadcn это `FieldSelect`. Если
переключать заголовки — ломаются якоря, оглавление справа и поиск.
Обоснование: [docusaurus#8764](https://github.com/facebook/docusaurus/issues/8764) закрыт как
**wontfix** — заголовки внутри табов попадают в TOC все разом, а менять TOC под активную вкладку
без hydration-сдвигов мейнтейнеры не взялись.
Решение: `## Select`, конкретное имя API — внутри переключаемого блока. Побочная польза: раздел
становится про сущность, а не про конкретный биндинг.

**7. Внутренний поиск фильтровать по активному варианту.**
Иначе: выбрал Vue, нашёл метод, кликнул — попал на React-страницу.
Обоснование: [TanStack/query#6770](https://github.com/TanStack/query/issues/6770) — ровно эта
жалоба, чинилась двумя PR. У Docusaurus та же проблема ([#5880](https://github.com/facebook/docusaurus/issues/5880))
привела к включению `contextualSearch` **по умолчанию**.

**8. A11y: переключатель, меняющий URL, делать ссылками, а не dropdown-ом.**
Бесплатно получаются доступное имя, средний клик, «открыть в новой вкладке» и индексируемость
(так у shadcn). Найденные дефекты у других — назидательные: у `tanstack.com` триггер без
`aria-label` (скринридер слышит «React, кнопка», но не знает, что это выбор фреймворка) и выбранный
пункт помечен только визуально, без `aria-checked`; у `ark-ui.com` `aria-labelledby` указывает на
**несуществующий** элемент — доступное имя оборвано.

**9. Смена дефолта в будущем — редирект 307, не 301.**
shadcn делает `permanent: false` намеренно — чтобы смена дефолта не оставила пользователей,
застрявших в кеше браузера.

### Этапы реализации

**Этап 0 (делать ПЕРВЫМ, до любого UI) — единый источник кода примеров.**
Сейчас 516 tsx-блоков написаны руками в MDX, отдельно от живых демо. С четырьмя вариантами
рассинхрон гарантирован.
Целевая механика — как у Ark UI: пример = **реальный файл** в демо-приложении, доки читают его
с диска на сборке. У них 63 компонента и 14 примеров слайдера — файлы с одинаковыми именами
в React и Svelte, паритет виден структурно. Плюс CI-страж (`scripts/src/check-nodes.ts`), который
падает, если один компонент рендерит разные DOM-узлы в разных фреймворках.
Альтернатива для прозы (не для кода) — транcклюзия TanStack Query: `ref:` на исходный файл +
`replace:` словарь подстановок + парные `[//]: # 'Region'` для точечного переопределения; у них
так живут 48 Vue-файлов, и проза физически не может разойтись.
⚠️ В Fumadocs 16 **нет** встроенного `remark-code-import` — есть `remark-code-tab`
(`fumadocs-core/mdx-plugins`). Плагин чтения с диска надо добавить или написать свой.

✅ **Гранулярность источника у всех трёх sandbox-приложений выровнена 2026-08-13** — механика
«читать файл с диска» технически возможна для всех. Проверено 2026-08-13:

| Приложение                   | Структура                                                                                        | Годится для чтения-с-диска |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| `form-develop-app`           | 35 файлов, один пример на файл (`*-demo/page.tsx`)                                               | ✅ да, уже сейчас          |
| `form-develop-app-shadcn`    | 16 файлов, один пример/группа на файл (`*-demo/page.tsx`)                                        | ✅ да (2026-08-13)         |
| `libs/forms-vue-shadcn/demo` | ✅ разбит 2026-08-13 — `demo/examples/*.ts`, один файл на пример (6 файлов) + `App.ts`-навигация | ✅ да, готово              |

Дублирование между ними реальное, не мнимое: сценарий `Calculated` (цена × количество − скидка)
независимо написан в `form-develop-app/calculated-demo`, в `form-develop-app-shadcn/numeric-demo`
и в `form-docs/demo/calculated` — уже разошёлся в деталях (язык, формат валюты, набор сценариев).

**Оба приложения разбиты (2026-08-13) — Этап 0 закрыт целиком.**

✅ **`libs/forms-vue-shadcn/demo`.** `App.ts` (59 строк, все 6 полей сразу) разбит на
`demo/examples/{string,number,select,combobox,textarea,checkbox}-demo.ts` — по файлу на поле,
каждый самодостаточен (своя Zod-схема, свой `AppForm`). `demo/examples/index.ts` — реестр
`demoExamples`. `App.ts` стал навигационной оболочкой (`<select>` + `ref`, без роутер-либы).
Проверено: `bunx vite build demo` зелёный, `nx run-many -t lint typecheck:tsgo
test --projects=@letar/forms-vue-shadcn` зелёный. Подробности — CHANGELOG `libs/forms-vue-shadcn`.

✅ **`form-develop-app-shadcn`.** Разбит на отдельные файлы-примеры той же гранулярности, что
`form-develop-app`: 10 страниц группируют простые поля по смыслу (3–5 на страницу —
`basic-fields-demo`, `select-demo`, `choice-demo`, `date-time-demo`, `numeric-demo`,
`interactive-demo`, `contact-demo`, `specialized-demo`, `auth-fields-demo`, `survey-demo`) + 6
страниц по одному beta/compound-компоненту (`steps-demo`, `table-editor-demo`, `rich-text-demo`,
`schedule-demo`, `data-grid-demo`, `auto-fields-demo`). Детали — `apps/form-develop-app-shadcn/PLAN.md`.

Замер, зачем это нужно: в TanStack Form при ручном дублировании Vue-гайд `validation.md` отстал
от React **на три месяца** (два React-only улучшения 2026 года не доехали — видно по git-истории).
У shadcn паритет держится не тестом, а инструкцией для ИИ-агента в `.cursor/rules/registry-bases-parity.mdc`,
и их собственный `registry/bases/README.md` уже устарел (говорит про две базы, а их три).

**Этап 1 — механизм двух осей, включена только ось Skin.** ✅ (2026-08-13, v0.2.0)
Паритет `forms-shadcn` с Chakra **закрыт** (Фаза 8, Этап 6, 2026-08-12) — ось Skin ничем не
заблокирована. Строим полный механизм (обе оси, URL + storage, a11y, disabled-состояния), но
публикуем пока только переключатель скинов. UI делается **один раз** — ось Framework потом просто
включается в готовом механизме, переделки нет.
Сюда же: нейтральные заголовки (решение 6), фильтрация поиска (решение 7), схлопывание
дублирующихся демо (см. «четыре места» выше).

**Что сделано:**

- **Механизм чтения кода с диска на сборке** (Fumadocs 16 не имеет `remark-code-import`) —
  реализован как асинхронный серверный компонент, а не remark-плагин (второй вариант, разрешённый
  постановкой задачи): `src/components/code-file/{read-example-file.ts,highlighted-code.tsx,code-file.tsx}`.
  `CodeFile` читает файл через `fs.readFileSync` (путь — от корня монорепо, вычисляется через
  `process.cwd()`, а не `import.meta.url`, потому что после `next build` серверный бандл лежит в
  `.next/server/...` и путь к исходнику компонента больше не совпадает со структурой репозитория)
  и подсвечивает через `fumadocs-core/highlight` (Shiki) — тот же визуальный `CodeBlock`, что и у
  ручных ```tsx-блоков в MDX. Проверено по исходникам `fumadocs-core`/`fumadocs-ui` 16.14.2 в
  `node_modules` основного чекаута (в этом worktree `node_modules` нет) — не вживую.
- **Переключатель Framework × Skin** — `src/lib/skin.ts` (типы, enum, ключи) +
  `src/components/skin/{skin-context,skin-switcher,skin-code-switcher,skin-code-file}.tsx`.
  Хранение: URL query (`?skin=`/`?fw=`) → localStorage → дефолт (Chakra/React), чтение **только**
  в `useEffect` (решение 3). Оба варианта Chakra/shadcn — в HTML на сборке всегда, переключение —
  через CSS `hidden`, без lazy-подгрузки (решение 2). UI — ссылки `<a href="?skin=...">` с
  `aria-current`, обычный клик перехватывается JS, средний клик/Ctrl+клик отдаются браузеру
  (решение 8). Framework типизирован и учитывается хранилищем, но UI-переключателя для него нет —
  Этап 2. `SkinCodeFile` поддерживает `disabled`-вкладку через необязательный `shadcn`-путь
  (решение 5) — не подставляет Chakra-вариант молча.
  `SkinProvider` подключён в `src/app/[lang]/docs/layout.tsx` — общий на весь докс-раздел.
- **Proof of concept на 2 страницах** (не все 516 блоков — следующая механическая миграция):
  `fields/select.mdx`+`.ru.mdx` и `guides/table-editor.mdx`+`.ru.mdx`, оба читают
  `select-demo`/`table-editor-demo` из `form-develop-app` и `form-develop-app-shadcn`.
- **Нейтральные заголовки (решение 6)** — 86 заголовков в 16 файлах (`## Form.Field.Select` →
  `## Select` + `**API:** \`Form.Field.Select\``строкой ниже). Двухсегментные namespace-заголовки
  (`Form.Group`,`Form.When`,`Form.Watch`,`Form.Subscribe`,`Form.DirtyGuard`,`Form.FromSchema`,`Form.AutoFields`,`Form.DebugValues`,`Form.InfoBlock`,`Form.Divider`,`Form.Errors`,`Form.Steps`) намеренно **не** тронуты — вопрос закрыт
  2026-08-13 (`forms-dev`): сверено грепом экспортов`libs/forms-shadcn/src`vs`libs/forms/src`.
  Из 12 API`forms-shadcn`реально экспортирует **только`Form.Steps`** (`lib/steps/*`) — у
  остальных 11 (`Group`/`When`/`Watch`/`Subscribe`/`DirtyGuard`/`FromSchema`/`AutoFields`/`DebugValues`/`InfoBlock`/`Divider`/`Errors`) в shadcn-скине реализации нет вообще — это не
  «разный API одной фичи», а пробел паритета shadcn-скина (техдолг`libs/forms/PLAN.md`, Фаза 8,
  отдельно от P7). Нейтрализовать заголовок можно только у`Form.Steps`(он один на оба скина);
  11 остальных оставить как есть (`## Form.Group` и т.п.), пока shadcn их не реализует.
- **Поиск (решение 7)** — `route.ts` получил `buildIndex` с опциональным тегом `skins` из
  frontmatter, механизм заведён, но клиент **не** фильтрует по тегу активного скина: сегодня ни
  одна страница `skins:` не объявляет (весь контент валиден для обоих скинов — один URL с
  переключаемым кодом внутри, не раздельные страницы per-skin), а `containsAll`-фильтр по тегу
  исключает нетегированные документы — включить его сейчас означало бы пустой поиск для всего
  сайта. Попутно исправлен реальный баг: `search.tsx` использовал `type: 'fetch'` (ждёт
  серверной фильтрации по query), а `route.ts` экспортирует только `staticGET` (полный индекс без
  фильтрации, кэш на сборке) — несовпадение означало, что поиск, вероятно, не фильтровал
  результаты по `query` на сервере вовсе. Заменено на `client: staticClient(...)`
  (`fumadocs-core/search/client/orama-static`), клиентскую фильтрацию.

**Прагматичное решение по живому демо (пункт задания «Реши прагматично»):** iframe в
`<DemoContainer>` остаётся Chakra-only в Этапе 1. Переключение iframe вместе с осью Skin
(исключение из решения 4) не реализовано — у form-docs нет собственного shadcn-iframe-таргета,
`form-develop-app-shadcn` не задеплоен и не встроен как iframe-источник; строить такую
инфраструктуру untested в этом окружении (нет `node_modules`, нет способа визуально проверить)
рискованнее, чем отложить. `SkinCodeFile` уже даёт переключаемый **код** для тех же примеров —
компромисс для Этапа 1, доработка iframe — по мере необходимости, не блокирует.

✅ **Проверено после мержа в обычный чекаут (2026-08-13):** `nx typecheck:tsgo form-docs` и
`nx lint form-docs` — зелёные. По ходу проверки найдено и исправлено два реальных бага, не
видных без реального `node_modules`:

- `src/app/api/search/route.ts` — `buildIndex` типизировал `structuredData` как `unknown`,
  несовместимо с ожидаемым `StructuredData` (`fumadocs-core/mdx-plugins`) — TS2322. Поправлено на
  корректный тип.
- `src/components/code-file/read-example-file.ts` — guard от выхода за пределы монорепо был
  через `absolute.startsWith(MONOREPO_ROOT)` (сравнение строк на абсолютном пути пропускает
  соседний каталог с совпадающим префиксом, `/repo` матчит `/repo-evil`) — заменено на
  `relative()` + проверку на `..`/абсолютность, поймано semgrep-правилом
  `letar-path-traversal-naive-startswith-guard` при коммите.

✅ **`nx build form-docs` починено (2026-08-13, отдельная сессия).** Было две наложившиеся
причины, обе — в `next.config.mjs`:

- `createMDX()` без `macro: false` — дефолтный `macro.include` у fumadocs-mdx (`**/*.ts`,
  `**/*.tsx` по всему workspace, не только MDX) навешивал `fumadocs-mdx/webpack/macro`-loader на
  любой TS-файл в монорепо, включая `libs/glitchtip/src/client/index.ts`; loader падал на
  `export interface`. Фича макроса в form-docs нигде не используется — отключена.
- Даже без macro-loader'а сборка всё равно падала на том же файле с «no loaders configured» —
  без `transpilePackages`/`experimental.externalDir` Next.js ограничивает свой ts/js loader
  `include: [dir]` (`shouldIncludeExternalDirs` в `next/dist/build/webpack-config.js`) и не
  видит `.ts` вне `apps/form-docs`. Добавлен `transpilePackages: ['@letar/glitchtip']`.

162/162 страниц собираются и пререндерятся, `typecheck:tsgo`/`lint` зелёные. Подробности —
`CHANGELOG.md` 0.2.1.

✅ **Визуальная проверка в браузере выполнена (2026-08-13, отдельная сессия forms-dev).**
`nx dev form-docs` через Claude Browser: Skin-переключатель на `fields/select` (en, оба скина,
код реально переключается — проверено видимостью `<pre>`) и `guides/table-editor` (ru) работает;
поиск (`/api/search`, статический orama-индекс) находит релевантные страницы по запросу "select";
заголовки нейтральные на обоих языках. Найден и исправлен один реальный баг: `app/demo/layout.tsx`
объявлял собственные `<html>`/`<body>` внутри уже существующего корневого `app/layout.tsx` —
невалидная вложенность тегов, hydration mismatch на каждой загрузке `/demo/*`. Заменено на
`<div>`-обёртку. Подробности — `CHANGELOG.md` 0.3.0.

Попутно найден отдельный, не связанный с этой задачей баг в live-демо `table-editor`
(sortable-строки Chakra `TableEditor` рендерят `<div>` внутри `<tr>` — невалидный HTML) —
вынесен отдельной задачей (spawn_task), не чинился в этом заходе (вне scope P7).

✅ **Этап 2 — ось Framework включена (2026-08-13).** `FrameworkSwitcher` (React ↔ Vue) добавлен
рядом со Skin-переключателем внутри `SkinCodeSwitcher`; `SkinCodeFile` получил новый опциональный
проп `vue`. Framework — верхняя ось, Skin виден только внутри React (у Vue-пруфа нет скинов).
Включено на двух страницах с живым Vue-кодом:

- `fields/select` → `libs/forms-vue-shadcn/demo/examples/select-demo.ts` (уже существовал)
- `guides/table-editor` → `libs/forms-vue-shadcn/demo/examples/table-editor-demo.ts` (новый,
  тот же набор данных/колонок, что React-пример, зарегистрирован в `demo/examples/index.ts`)

Везде остальные страницы Vue-вкладка рисуется `disabled` с пометкой (решение 5) — без явного
`vue`-пропа в `SkinCodeFile` это происходит автоматически, без правки каждой страницы. ~514
инлайн-блоков кода в MDX (не через `SkinCodeFile`) не тронуты — не входит в этот заход.

Проверено: `nx run-many -t lint typecheck:tsgo test --projects=form-docs,@letar/forms-vue-shadcn`
и `nx build form-docs` (162 страницы, включая `select`/`table-editor`, оба скина+Vue читаются на
сборке) — зелёные. В браузере: переключение на Vue скрывает Skin-переключатель и показывает живой
Vue-код (`import { AppForm } from '@letar/forms-vue'`), выбор сохраняется между страницами через
localStorage (`letar-forms-docs-framework`).

**Что увидит пользователь после деплоя:** переключатель Framework на 2 страницах
(`fields/select`, `guides/table-editor`) — React показывает Chakra/shadcn как раньше, Vue
показывает один живой пример без деления на скины. На остальных ~160 страницах — Vue-вкладка
недоступна с пометкой «скоро», без какого-либо визуального переключателя на инлайн-блоках кода
(они не через `SkinCodeFile`). Не полный паритет UI между React и Vue-разделами документации —
честный минимум-индикатор прогресса Фазы 9→10, как и было задумано.

✅ **Этап 3 — Angular третьей опцией (2026-08-13).** `FRAMEWORK_VALUES` расширен до
`['react', 'vue', 'angular']`, `FrameworkSwitcher`/`SkinCodeSwitcher`/`SkinCodeFile` обобщены —
`unavailable` для Framework теперь собирается по факту наличия каждого пропа (`vue`/`angular`),
не завязана на ровно два значения. У Angular-пруфа, как и у Vue, нет деления на скины.

Выбор поля: из 10 полей Angular-пруфа (String/Textarea/Number/Password/Checkbox/Switch/
RadioGroup/NativeSelect/Date/YesNo) ни одно не пересекалось с уже занятыми страницами
(`fields/select` показывает Select/Combobox в живом примере, не NativeSelect; `guides/table-editor`
вне скоупа пруфа вообще) — выбрано Number, у него уже была категорийная страница `fields/number`,
но без секции "Full example" (Этап 1 подключил `SkinCodeFile` только к `select`/`table-editor`).
Добавлена новая секция на `fields/number`(.ru).mdx:

- React → `apps/form-develop-app{,-shadcn}/src/app/numeric-demo/page.tsx` (уже существовал)
- Vue → `libs/forms-vue-shadcn/demo/examples/number-demo.ts` (уже существовал)
- Angular → `libs/forms-angular/demo/examples/number-demo.ts` (новый файл, паттерн usage —
  `<letar-app-form [schema] [initialValue] (formSubmit)>` + `<letar-field-number name="quantity" />`,
  зеркалит `stage2-host.component.ts` из самого пакета)

Остальные страницы (включая `select`/`table-editor`, у которых нет Angular-примера) показывают
Angular-вкладку `disabled` автоматически — механизм общий, ничего не потребовалось трогать вручную
на других страницах.

Проверено: браузер (три вкладки переключаются, disabled честный на непокрытых страницах, Skin
скрыт при Vue/Angular), `nx run-many -t lint typecheck:tsgo test --projects=form-docs` и
`nx build form-docs` — зелёные.

⚠️ Точное число полей брать из `mcp__form-mcp__list_fields`, не из документов: на 2026-08-13 оно
**61** (после Фазы 8 добавились 3 document-поля), и в разных файлах ещё встречаются устаревшие
«56»/«57». Ни одно из них не считать источником истины.

**Этап 2 — включение оси Framework.**
Полного паритета Vue ждать **не требуется**: недостающие поля показываются `disabled`-вкладкой
с честной пометкой (решение 5), и переключатель работает публичным индикатором прогресса Фазы 9
(`libs/forms/PLAN.md`). Момент включения — когда наберётся осмысленный минимум полей, решает Ками.

⚠️ **Изменение решения от 2026-08-13.** Ранее в этом пункте стояло «делать всё целиком после
закрытия Фазы 9» — из опасения переделывать UI дважды. Ресёрч показал, что опасение снимается
поэтапным **включением** одного механизма, а `disabled`-вкладки для неготовых вариантов —
нормальная практика (Park UI). Прежняя формулировка задерживала готовую ось Skin без выигрыша.

### Антипаттерны — чего не делать

Все — с подтверждёнными issue, не гипотезы:

- ⛔ **Молчаливая подстановка чужого варианта** — TanStack `FrameworkContent.tsx` (см. решение 5)
- ⛔ **Пустая страница-обещание** вместо отсутствующей — TanStack `testing.md`, 35 байт
- ⛔ **Потеря выбора при уходе в другой раздел** — Zag.js: `formatUrl` добавляет сегмент фреймворка
  только для группы `components`; ушёл в Guides — выбор Vue потерян молча. Плюс их
  `FrameworkProvider` подключён к одной ветке роутов, а селект рендерится на всех и **выглядит
  рабочим**. Живые жалобы: [tanstack.com#412](https://github.com/TanStack/tanstack.com/issues/412)
  (open), [#139](https://github.com/TanStack/tanstack.com/issues/139) + регресс
  [#146](https://github.com/TanStack/tanstack.com/issues/146)
- ⛔ **Два источника истины для одного выбора** — [docusaurus#8473](https://github.com/facebook/docusaurus/issues/8473):
  `groupId` (localStorage) конфликтовал с `queryString` (URL), синхронизация сломалась на сайте
  самого Docusaurus
- ⛔ **Хранить индекс вкладки вместо метки** — Nuxt UI `code-group-<sync>` хранит `"0"`/`"1"`; две
  группы с одним ключом, но разным порядком вкладок рассинхронизируются
- ⛔ **Механическое копирование идиом между фреймворками** — целая серия: Solid-пример сломан
  деструктуризацией ([TanStack/form#1347](https://github.com/TanStack/form/issues/1347)), Vue-пример
  с `filter` вместо `filter.value` ([query#7371](https://github.com/TanStack/query/issues/7371)),
  нереактивный `queryKey` в официальном примере ([query#9782](https://github.com/TanStack/query/issues/9782)),
  `className` вместо `class` в Astro-вкладке ([shadcn-ui/ui#8165](https://github.com/shadcn-ui/ui/issues/8165), open)
- ⛔ **Расхождение «человеческой» и «машинной» поверхности** — у Ark UI HTML фильтруется по cookie
  (один фреймворк), а `.mdx`-эндпоинт отдаёт 84 КБ со всеми четырьмя подряд; у TanStack наоборот.
  У нас есть `/llms.txt` и `form-mcp` — выбрать одну философию осознанно и держать её
- ⛔ **Прыжки скролла при переключении связанных групп** — [docusaurus#9858](https://github.com/facebook/docusaurus/issues/9858),
  [starlight#2746](https://github.com/withastro/starlight/issues/2746) (при `scroll-behavior: smooth`
  компенсация анимируется; фикс — `behavior: 'instant'`)

### Что осталось непроверенным

- **FormKit** — рендерер доков (`formkit/docs-ui-2`) приватный, 404. Их механику переключателя
  Vue/React проверить не удалось; видно только, что ось у них одна на всю страницу, включая прозу
  (шорткод `:FrameworkText{vue="…" react="…"}`)
- Отдельного документа Google про «cookie-based content variation» и риск клоакинга **найти не
  удалось** — по этим терминам выдаются SEO-блоги, не первоисточник. Вывод про cookie в решении 1
  опирается на измеренные последствия у Ark UI + документы про multi-regional/Googlebot, а не на
  прямой запрет
- Base UI, Kobalte, Melt — не исследовались

---

**Последнее обновление:** 2026-08-13
