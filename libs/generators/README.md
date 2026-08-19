# @letar/generators

Локальный Nx-плагин с генераторами для монорепо `letar`. Не публикуется в npm — существует только
как workspace-пакет для `nx generate`.

## Генераторы

### `e2e-suite`

Скаффолдит новый Playwright e2e-сьют `apps/<app>-e2e` по конвенции, уже принятой в монорепо
(идентична `time-e2e`/`pravda-e2e`): `package.json` (`implicitDependencies`), `tsconfig.json`,
`eslint.config.mjs`, `playwright.config.ts` (baseURL/webServer на dev-порт приложения, три
браузерных проекта chromium/firefox/webkit), `.gitignore` (исключает `playwright/.auth/` —
cookie-сессии storageState — и артефакты прогонов), стартовый `src/homepage.spec.ts`.

```bash
nx g @letar/generators:e2e-suite <app>
# или с явным портом, если порт приложения нигде не объявлен
nx g @letar/generators:e2e-suite <app> --port=3033
```

Порт по умолчанию читается из `apps/<app>/.env` (`PORT=<число>` — единственное, что там должно
быть, см. `.claude/rules/env-files.md`), а если его там нет — из `.env.local` и `-p <порт>` в
`project.json` (так порт задают лендинги).

**Генератор не перезаписывает существующие сьюты** — если `apps/<app>-e2e` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** `nx e2e <app>-e2e` может зависнуть намертво в dev-режиме Next.js — см.
[`.claude/docs/e2e-testing.md`](/.claude/docs/e2e-testing.md) § «nx e2e зависает в dev-режиме» за
обходным путём (прогон `bunx playwright test` напрямую против вручную поднятого dev-сервера).

**Приватные приложения (`apps/<app>` — submodule на `letar-private-*`, см. `.gitmodules`):** по
конвенции `-e2e` для них тоже должен быть отдельным приватным submodule (образец — `aboi-e2e`,
`driving-school-e2e`, `domwellbes-e2e`), а не обычной директорией публичного `letar`. Генератор
детектирует это по `.gitmodules` автоматически:

- **Без `--linkSubmodule`** (по умолчанию) — генерирует `apps/<app>-e2e` как обычно, но выводит
  предупреждение с готовыми командами ручного переноса (создать приватный репозиторий через `gh`,
  запушить, подключить как submodule).
- **С `--linkSubmodule`** — после генерации сам выполняет перенос: `gh repo create
  kamiletar/letar-private-<app>-e2e --private`, инициализирует git и пушит содержимое
  `apps/<app>-e2e`, затем подключает его обратно как `git submodule add` и коммитит `.gitmodules`
  в `letar`.

```bash
nx g @letar/generators:e2e-suite <app> --linkSubmodule
```

⚠️ `--linkSubmodule` добавляет генератору побочные эффекты, обычно нехарактерные для чисто
локального Nx-генератора: сетевой вызов `gh` (создание GitHub-репозитория), `git push` в новый
приватный репозиторий и коммит в `letar`. Это осознанный компромисс — по умолчанию (без флага)
поведение остаётся полностью локальным, автоматизация — только по явному согласию. Требует
авторизованного `gh` (`gh auth status`) и SSH-доступа к `github.com:kamiletar/*`. При сбое на любом
шаге (репозиторий уже существует, push не прошёл, `apps/<app>-e2e` не удаляется из-за занятого nx
daemon на Windows) генератор останавливается с точным описанием, что уже сделано и какую команду
доделать вручную — не оставляет состояние без объяснения.

### `electron-app`

Скаффолдит новое минимальное Electron/Nextron-приложение `apps/<name>` — тот же каркас, что
руками собирался для `apps/poster-microtext-desktop`: Electron main + Next.js renderer
(статический экспорт `output: 'export'`, без сервера внутри приложения, вся логика через IPC),
Chakra UI v3, `webpack.config.js`/`electron-builder.yml`/`nextron.config.js` с уже впаянными
фиксами известных граблей (см. [`.claude/rules/electron.md`](/.claude/rules/electron.md) §
«Грабли»): `assetPrefix: './'` под `file://`, точная версия electron, `publish: null`.

```bash
nx g @letar/generators:electron-app <name>
# с явным displayName/description/private:
nx g @letar/generators:electron-app <name> --displayName="Моё приложение" --private
```

Версия `electron`/`electron-builder` в сгенерированном `package.json` берётся из корневого
`package.json` монорепо (диапазон `^x.y.z` пиннится до точной версии — electron-builder не умеет
скачивать бинарник по диапазону).

**Генератор не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** сгенерированное приложение — минимальный работающий каркас без бизнес-логики
(экран показывает только версию Electron). Дальше: заменить иконку, дописать `main/services/` и
`main/ipc/*.handlers.ts`, при необходимости завести приватный submodule — все шаги описаны в
сгенерированном `README.md`. Nextron не поддерживает `nx generate` из коробки — второй референс для
более сложного приложения (БД, автообновление, сканер) — `apps/label-printer-desktop`.

### `new-lib`

Скаффолдит новую shared-библиотеку `libs/<name>` (`@letar/<name>`) по актуальной конвенции монорепо
(сверено с `libs/format-utils`/`libs/validation-utils`, а не только со старым `new-lib.md`):
`package.json`, `project.json` (`typecheck`/`typecheck:tsgo`/`oxlint`/`lint`/`test`), `tsconfig.json` +
`tsconfig.lib.json` + `tsconfig.spec.json` (композитная схема с раздельным spec-конфигом — обязательна
для vitest 4 + vite 8 oxc, см. `.claude/docs/unit-testing.md`), `vitest.config.ts`, `eslint.config.mjs`,
`README.md`, стартовые `src/index.ts` / `src/lib/feature.ts` / `src/lib/feature.spec.ts`.

```bash
nx g @letar/generators:new-lib <name>
# с описанием для README:
nx g @letar/generators:new-lib <name> --description="Утилиты для X"
# React-каркас (jsx/dom в tsconfig, jsdom + @vitejs/plugin-react в vitest.config.ts, .tsx-компонент):
nx g @letar/generators:new-lib <name> --react
```

По умолчанию каркас framework-free (Node-окружение в `vitest.config.ts`, только `.ts`-файлы) — это
верный дефолт для utility-библиотек. **`--react`** переключает на React-вариант, которого без флага
приходилось каждый раз дописывать руками (`libs/forms-react`, `libs/ui`): `jsx: "react-jsx"` и
`lib: [..., "dom", "dom.iterable"]` в `tsconfig.lib.json`/`tsconfig.spec.json`, `environment: "jsdom"` +
`plugins: [react()]` в `vitest.config.ts`, `vitest.setup.ts` с `@testing-library/jest-dom/vitest`,
`peerDependencies.react` в `package.json`, и стартовый `src/lib/feature.tsx` — минимальный React-компонент
вместо чистой функции (тест — через `@testing-library/react`).

**Генератор не перезаписывает существующие библиотеки** — если `libs/<name>` уже есть, падает с понятной
ошибкой.

⚠️ **После генерации** библиотеку нужно подключить к приложению — процедура описана в
[libs.md](/.claude/rules/libs.md#подключение-к-приложению) (коротко: обязательное там одно —
`nx.implicitDependencies` в `package.json` приложения).

### `new-app`

Скаффолдит новое минимальное Next.js приложение `apps/<name>` — чистый каркас Chakra UI v3 + MDX без
типового boilerplate, который иначе приходится вычищать руками после `nx g @nx/next:application`
(`global.css`, `.swcrc`, `next.config.js`, `api/hello`) — см. полный ручной процесс в
[`.claude/commands/create/new-app.md`](/.claude/commands/create/new-app.md), который этот генератор
заменяет для шагов 1–13 (структура, тема, provider'ы, MDX, vitest).

```bash
nx g @letar/generators:new-app <name>
# с явным портом/именем/описанием/приватностью:
nx g @letar/generators:new-app <name> --port=3033 --displayName="Моё приложение" --private
# с ZenStack/Prisma-каркасом:
nx g @letar/generators:new-app <name> --withDb
```

Порт по умолчанию — **следующий за максимальным занятым** `3xxx` (продолжение последовательности, а не
первая дырка в ней). Занятые порты собираются из `apps/*/.env`, `apps/*/.env.local` и `-p <порт>` /
`--port=<порт>` в `apps/*/project.json` — часть приложений (лендинги) объявляет порт только там.
`3000` не выдаётся никогда: это дефолт `next dev` без `-p`.

Сгенерированное приложение **осознанно минимально** — без БД, форм, аутентификации, PWA. Это
отправная точка, а не копия `grandslamcup`/`driving-school` — те эталоны несут специфику (Serwist,
Better Auth, cookie-баннер и т.д.), которую не всем новым приложениям нужно тащить с первого дня.

**`--withDb`** добавляет ZenStack/Prisma-инфраструктуру, которую иначе приходится копировать руками
из другого приложения (`apps/aboi`, `apps/studio`): `prisma.config.ts` (плейсхолдер
`DATABASE_URL`/`SHADOW_DATABASE_URL` — реальные значения кладутся в `.env.local`, см.
`.claude/rules/env-files.md`), `schema.zmodel`-заготовка (только `datasource`/`generator client`/
`plugin prisma`/`plugin typescript`/`plugin policy`/`plugin formSchema` — без единой модели, их
дальше пишешь по `.claude/rules/database.md`), и таргеты `zenstack:generate`/`db:generate`/
`db:push`/`db:migrate`/`db:studio` в `project.json`. Для `--private` вдобавок добавляется
`src/generated/` в сгенерированный `.gitignore` submodule'а (публичным приложениям это не нужно —
корневой `.gitignore` монорепо уже исключает `/apps/**/src/generated/`).

Формы (`@letar/forms`) и аутентификация (Better Auth) каркасом **не** создаются — это отдельные шаги
после того, как в `schema.zmodel` появятся реальные модели (`.claude/docs/forms.md`, `.claude/docs/auth.md`).

**Генератор не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с понятной
ошибкой.

⚠️ **После генерации остаются ручные шаги** (намеренно не автоматизированы, см. `.claude/commands/create/new-app.md`
§14+): приватный submodule, регистрация в Dashboard/`deploy-affected.sh`, бэкапы, `docker-compose.production.yml` +
`output: 'standalone'`, e2e-gate, MCP postgres, ПДн-чеклист (если приложение собирает персональные
данные — см. `.claude/docs/personal-data.md`).

### `theme-check-integrate`

Подключает `apps/<app>` к гейту сырых UI-цветов/теней/transition-длительностей (`theme:check`) —
скрипт, доказавший пользу в `apps/domwellbes` и вручную перенесённый на `apps/studio`/`apps/aboi`
(три конфигурации набраны до выноса в generator, см.
[`.claude/docs/theme-hardcode-gate-coverage.md`](/.claude/docs/theme-hardcode-gate-coverage.md) —
там же обоснование, почему выносить не раньше второго реального потребителя).

Сама проверка (обход файлов, regex-правила, allowlist-логика) живёт в
[`libs/theme-check`](/libs/theme-check/README.md) (`@letar/theme-check`) — сгенерированный скрипт
всего лишь тонкая обёртка, передающая `ignoredDirectories`/`allowedMatches`/`guidance` конкретного
приложения. Генератор также сам дописывает `@letar/theme-check` в `dependencies`/
`nx.implicitDependencies` приложения и (если это потребовалось) прогоняет `bun install` перед
первым `theme:check` — иначе `node` не найдёт пакет.

```bash
nx g @letar/generators:theme-check-integrate <app>
# с нестандартным каталогом исходников:
nx g @letar/generators:theme-check-integrate <app> --sourceDir=app-src
```

Генерирует `apps/<app>/scripts/check-theme-hardcodes.mjs` (regex-проверка HEX/rgb/hsl-цветов,
теней, `transition`/`transitionDuration` с сырой длительностью, `scale()` в `transform` вне
шкалы темы) и таргет `theme:check` в `project.json`, подключённый в `dependsOn` у `lint`.

- **`ignoredDirectories` подбирается автоматически по факту**: `generated` — всегда, `pdf`/`assets`
  — только если такой каталог реально существует в `src/` приложения (найдено scan'ом дерева, не
  предполагается вслепую).
- **`themePrefix`** — `<sourceDir>/theme/`, даже если такого каталога ещё нет (с предупреждением:
  без него ни один файл не освобождён от общих правил — так и было у `studio`/`aboi` до первого
  прогона).
- **`allowedMatches` генерируется пустым**, с комментарием-памяткой про три задокументированных
  класса легитимных исключений (metadata Next.js, satori/`next/og`, рендер без Chakra-провайдеров,
  одноразовый декоративный эффект) — заполняется руками по итогам первого прогона, генератор
  сознательно не пытается угадать allowlist за человека.

**Генератор не перезаписывает существующий `scripts/check-theme-hardcodes.mjs`** — если он уже
есть (в том числе с ручным allowlist), файл пропускается с предупреждением; повторный запуск
идемпотентен и на таргете `theme:check` (не дублирует `dependsOn` у `lint`).

⚠️ **Первый прогон почти всегда находит реальные нарушения** — это не баг генератора. Каждая
находка — либо настоящий баг (сырой цвет мимо Chakra-пропа, `transition="all N s"` вместо явного
`transitionProperty`, см. фикс в `aboi`/`grandslamcup`), либо легитимное исключение, которое
дописывается в `allowedMatches` с пояснением. Без `--skipChecks` генератор сам прогоняет
`nx run <app>:theme:check` после генерации и печатает инструкцию по обоим случаям.

## Рассмотренные и отклонённые генераторы

### `new-crud-admin` — отклонён (2026-08-05), пересмотрен и отклонён повторно (2026-08-11)

При третьей паре одинаковых по форме CRUD-сущностей в одном приложении (`apps/domwellbes`:
`houses`, `materials`+`materials/categories`, `works`+`works/categories`) встал вопрос — не пора
ли выносить сам скелет (`page.tsx` списка, `new/page.tsx`, `[id]/page.tsx`,
`_components/<entity>-form.tsx`, `_schemas/<entity>.schema.ts`, `_actions/<entity>.action.ts`) в
генератор по аналогии с `new-app`/`e2e-suite`.

Решено пока не делать:

- Все три повторения — **внутри одного приложения**, не между приложениями. Остальные
  генераторы (`new-app`, `e2e-suite`, `electron-app`) выносят инфраструктуру, повторяющуюся
  между приложениями монорепо — это другой уровень переиспользования.
- Различия между сущностями уже не тривиальны: `houses` несёт дополнительные секции
  (`house-extras-section.tsx`, `house-images-section.tsx`), которых нет у `materials`/`works`.
  Параметризовать генератор пришлось бы не по «списку полей», а по произвольному набору
  доп-секций — то есть шаблон превратился бы в условную логику генерации, а не в подстановку
  имён (как у `new-app`).
- Шаблон ещё не устоялся — три образца в одном приложении показывают форму паттерна, но не
  доказывают, что она не изменится на четвёртой сущности другого домена. Генератор, зафиксировавший
  преждевременно неправильную форму, дороже переписать, чем скопировать вручную ещё раз.

**Сигнал для пересмотра:** тот же CRUD-скелет (список + форма + Server Actions create/update/delete

- `emptyToNull`-нормализация select'ов) появится в **другом** приложении почти без изменений —
  тогда переиспользование горизонтальное, а не внутри одного домена, и генератор оправдан так же,
  как `e2e-suite`. До тех пор — копировать вручную из `apps/domwellbes/src/app/(admin)/admin/works/`
  как референс (см. `.claude/docs/tree-model-parent-select.md` за паттерном self-referencing
  select'ов, который тоже сюда входит).

#### Пересмотр 2026-08-11: сигнал не наступил, вариативность выросла

В `apps/domwellbes` число CRUD-админок выросло до шести (`houses`, `works`, `portfolio`,
`testimonials`, `cases`, `team`). Проверка всех шести целиком показала, что доля «чистого»
скелета без надстроек **упала**, а не выросла:

- `testimonials` — единственная сущность без доп-секций (просто `Card.Root` с полями).
- `team` — свой `team-member-photo.tsx`.
- `works` — вложенный под-CRUD `works/categories/` (своя схема+форма+страницы).
- `portfolio` — своя `portfolio-images-section.tsx` (галерея).
- `cases` — **две** схемы (`construction-case.schema.ts` + `construction-case-stage.schema.ts`)
  и `case-stages-section.tsx`.
- `houses` — по-прежнему `house-extras-section.tsx` + `house-images-section.tsx`.

То есть 5 из 6 сущностей несут бизнес-специфичные надстройки поверх скелета — вывод про
«условную логику генерации вместо подстановки имён» подтвердился на бОльшей выборке, не
опровергся.

Заодно проверен «сигнал для пересмотра» — тот же скелет в **другом** приложении. Похожие
CRUD-админки нашлись в `mandala` (`admin/mandalas`), `kami`, `grandslamcup`, `dsperevod`,
`svoichuzhie` и других — но сверка `mandala/admin/mandalas` с `domwellbes` показала другую
структуру: отдельные `_actions/bulk-actions.ts`, `reorder-mandalas.action.ts`,
`mandalas-table.tsx`, тесты схемы. Горизонтальное сходство есть только на уровне концепции
(список + форма + Server Actions), не на уровне файлов — то есть сигнал для пересмотра тоже не
наступил.

**Итог:** решение не создавать генератор остаётся в силе. Копировать вручную: `testimonials` —
образец для простого CRUD без доп-секций, `works`/`portfolio`/`cases`/`houses` — образцы для
сущности с под-CRUD/галереей/доп-секциями (выбирать ближайший по структуре).

#### Пересмотр 2026-08-12: ещё 7 моделей проверены отдельно (Portfolio/Testimonial/Case/BlogPost/Promotion/Vacancy/TeamMember), вывод не изменился

Отдельная проверка семи CRUD-сущностей `apps/domwellbes` (`PortfolioProject`, `Testimonial`,
`ConstructionCase`, `TeamMember`, `BlogPost`, `Promotion`, `Vacancy`) с прицелом именно на
экономику генератора «content-crud» (поля + флаг обложки → schema-блок + Zod-схема + actions +
form + 3 admin-страницы + опционально публичные `list`/`[slug]`).

- **6 из 7** несут надстройку сверх типового скелета: `PortfolioProject` — Decimal-поле +
  галерея через `createImageGalleryActions`; `ConstructionCase` — дочерний CRUD
  `ConstructionCaseStage`; `Promotion` — диапазон дат `validFrom`/`validUntil`; `Vacancy` —
  деньги в копейках (`salaryFromKopecks`/`salaryToKopecks`); `Testimonial` — optional FK на
  `PortfolioProject` + юридически значимый флаг `isSample` (152-ФЗ); `TeamMember` — единственная
  без публичной `list`/`[slug]`-страницы вовсе (рендерится внутри `/portfolio`). Только
  `BlogPost` близок к чистому скелету (markdown-`content` + cover, без родного отклонения).
- Общий шаблонный костяк (список + `new` + `[id]`) держится стабильно на ~180–230 строк на все
  семь моделей, но это и есть тот самый «список полей» — специфика (галерея/подсущность/деньги/
  диапазон дат/FK) генератором в параметрической форме не покрывается, требует условной логики
  генерации, а не подстановки имён.
- **8-я модель по этому паттерну в ближайших планах не просматривается.** В `PLAN.md`/
  `ROADMAP.md` domwellbes раздел «контент доверия» (блог/акции/вакансии/команда) закрыт на
  М2.5–М3. Следующий кандидат (`StockBatch`, партии/сертификаты, М4) — другой домен (склад,
  маркировка), не slug/title-паттерн.

**Итог не изменился:** генератор не строим. Дополнительно к образцам 2026-08-11: `testimonials`
годится и как образец FK+юр.флага, `portfolio` — как образец Decimal-поля и полноценной галереи,
`cases` — как образец дочернего CRUD.

#### Будущее направление (не решение, заметка на вырост): либа примитивов вместо генератора сущности

Идея владельца 2026-08-12 — не «генератор всей сущности» (это решение выше не меняет), а
выделение **повторяющихся кусков** внутри паттерна в `libs/`, по аналогии с уже существующим
`createImageGalleryActions` (`@letar/admin-ui/server`, уже переиспользуется в `portfolio`).
Кандидаты, замеченные на этих 7+6 моделях:

- `set*CoverAction`/`set*PhotoAction` — почти идентичная реализация в `BlogPost`, `Promotion`,
  `Vacancy`, `TeamMember` (4 раза).
- «дочерний CRUD с FK на родителя + cascade delete» — `ConstructionCase`↔`Stage`,
  `works`↔`works/categories` — как готовый хелпер для actions.
- Zod-хелперы «деньги в копейках» (`Vacancy`), «диапазон дат» (`Promotion`) — в
  `@letar/validation-utils`.

Это снижает долю специфики, дописываемой руками при копировании образца, не пытаясь
параметризовать всю сущность целиком — риск ниже, чем у монолитного генератора, но выигрыш и
объём работы тоже меньше. Не запускать без отдельного явного запроса — здесь только зафиксирован
кандидат на будущее, приоритет и время не определены.

## Разработка нового генератора

1. `mkdir src/generators/<name>`, добавь `generator.ts` + `schema.json`/`schema.d.ts` + `files/`
   (шаблоны с суффиксом `__tmpl__`, dotfiles — `__dot__<name>__tmpl__`, EJS-синтаксис `<%= var %>`)
2. Зарегистрируй в `generators.json`
3. Покрой тестом на `createTreeWithEmptyWorkspace()` (см. `e2e-suite/generator.spec.ts`).
   ⚠️ Фикстура должна повторять **форму реальных данных**, а не удобную для проверки: баг
   автоподбора порта прожил незамеченным именно потому, что тест писал конфигурацию портов,
   которой в монорепо не бывает ([PLAN-INFRA.md §34](/PLAN-INFRA-2.md))
4. Не пиши заново то, что уже лежит в `src/utils/` — оно общее для всех генераторов:

| Утиль       | Что даёт                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `tree.ts`   | `templatesDirFor(import.meta.url)` — путь к `files/`; `assertTargetIsFree()` — проверка, что проект не затирается |
| `naming.ts` | `toDisplayName()`, `toCamelCase()` — kebab-case имя проекта в то, что идёт в шаблоны                              |
| `ports.ts`  | `resolveNextFreePort()` для нового приложения, `resolveAppPort()` для существующего                               |
