# Выполненные задачи — @letar/forms

## 2026-08-13 — Compile-time проверка рассинхрона `form-compound-types.ts`

Задача Ками напрямую: `libs/forms/src/lib/declarative/index.ts` собирает `Form` через
`Object.assign(FormRoot, {...}) as unknown as FormComponent` — каст полностью отключает
структурную проверку TypeScript. Уже стреляло дважды: Фаза 8 Этап 7 (`ForeignPassport`/
`DepartmentCode`/`BirthCertificate` были в реализации `FormDocument`, но не в типе) и фантомный
`OGRNIP` (тип обещал поле, которого в реализации не было никогда).

**Решение:** `libs/forms/src/lib/declarative/assert-same-keys.ts` — compile-time-only
`AssertSameKeys<Impl, Declared>` (сравнивает `keyof` двух типов, не форму пропсов по каждому
полю) + generic-функция `assertSameKeys<AssertSameKeys<...>>()`, вызов которой не типизируется,
если ключи разошлись — ошибка `TS2344` указывает точный список разошедшихся ключей
(`onlyInImplementation`/`onlyInDeclaredType`) прямо в месте вызова.

Подключено для `FormField`, `FormDocument`, `FormButton`, `ListButton` (`Group.List.Button`) —
плоских compound-объектов без call signature. `Group`/`Steps`/сама форма исключены сознательно:
у них реальная сигнатура (forwardRef/generic-обёртки) может расходиться с упрощённым inline-типом
не по вине рассинхрона полей — точное сравнение дало бы шум на корректном коде.

Проверено негативным тестом: временное удаление `ForeignPassport` из `FormDocument` валит
`typecheck:tsgo` с точным указанием поля; возврат поля — снова зелено.

Коммит: `0fdea746`.

## 2026-08-12 — Фаза 7.8 → Поток 1+2: Reka UI-скин для Vue + гайды по портированию

Задача Ками через координатора `QuietRidge` (тред `forms-phase7-3-shadcn`, письмо #61) —
продолжение письма #58 (Vue-пруф границы, `libs/forms-vue`): полноценный Reka UI-скин + гайд по
портированию на свой фреймворк/стили.

**Поток 1 — `libs/forms-vue-shadcn` (`@letar/forms-vue-shadcn` 0.1.0).** Vue-аналог
`@letar/forms-shadcn`: `UIKit`-контракт из `forms-core` реализован на Reka UI (бывший Radix Vue) +
Tailwind + cva, 6 полей (Input/Number/Checkbox/Textarea/Select/Combobox).

- **Контракт не потребовал изменений.** `UIKitCorePrimitives<TNode>`/`UIKitExtendedPrimitives<TNode>`
  в `forms-core` уже были обобщены (`TNode = unknown`) — инстанцированы как
  `UIKitCorePrimitives<UINode>`, `UINode = VNode | string | null` (единственная типовая деталь,
  специфичная Vue: `VNode`, в отличие от React-овского `ReactNode`, не включает `string`).
- Примитивы (`rekaUIKit`) — обычные функции `(props) => VNode`, не `defineComponent`: контракт
  `(props) => TNode` совпадает буквально, без обёртки под компонент.
- Композиционный слой (`createFieldPrimitives`) — не копия React-версии: ошибку рендера поля ловит
  `onErrorCaptured` в `setup()`, не классовый `ErrorBoundary` (паттерна которого в Vue нет).
  `FieldSelect`/`FieldCombobox` (доп. проп `options`, вне контракта фабрики) собраны напрямую по
  `useAppFormContext`.
- Тесты — vitest + `@vue/test-utils`, 5 сценариев. Полифиллы `ResizeObserver`/
  `hasPointerCapture`/`scrollIntoView` — стандартный минимум для Radix/Reka-компонентов в jsdom.
- Демо — минимальный dev-харнесс на голом Vite (`nx run @letar/forms-vue-shadcn:demo`, порт 5173,
  `.claude/launch.json`), не Nx-приложение. Продакшн-сборка чистая (2322 модуля).

**Поток 2 — гайды в `apps/form-docs`** (`content/docs/guides/custom-uikit.mdx` +
`porting-framework.mdx`, оба EN+RU). Первый — как реализовать `UIKit`-контракт голым HTML/CSS без
Chakra/shadcn. Второй — честный процессный разбор переноса на Vue (решения из Потока 1 как есть,
включая то, что не перенеслось 1:1 — error boundary, обход `createField` для Select/Combobox).
Проверено в Browser pane — все 4 страницы рендерятся.

Коммиты: `a5c494bf` (forms-vue-shadcn), `ff993569` (гайды form-docs), `f8aa4cb8` (PLAN.md).

## 2026-08-11 (2) — Фаза 7.6: `llms.txt` + фикс `form-mcp`/`docs/fields.md`

Задача координатора `QuietRidge` (тред `forms-phase7-3-shadcn`, msg #54), два независимых потока.

**`form-mcp` v1.0.3.** `field-registry.ts` → `CATEGORY_MAP` ждал ключ `'Российские документы'`,
реальный заголовок секции в `docs/fields.md` — `## Документные поля (Россия)`. Несовпадение строк
молча роняло всю секцию из парсера — `list_fields`/`get_field_props`/`get_field_example` (общий
`fieldRegistry`) не знали про `INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/`Passport`. Заодно
найдено: `FieldCity` отсутствовал в `docs/fields.md` целиком, хотя экспортируется как
`Form.Field.City` — не парсер-баг, поле не было задокументировано. Добавлена строка в
«Специализированные», счётчик в шапке файла поправлен 56 → 57. Ручная проверка (`bun run` с
реальными путями): `total: 57, has city/inn/bik: true, document count: 7`.

**`llms.txt` для `apps/form-docs`** — см. `apps/form-docs/PLAN_COMPLETED.md`, сессия
2026-08-11 (2).

Коммиты: `9d2b9fc5` (form-mcp), `a029f6f9` (forms docs/PLAN), `043f764c` (form-docs llms.txt),
`e258912c` (launch.json).

## 2026-08-10 — Фаза 7.3, шаги 3-5: `@letar/forms-react`, фикс публикации типов, подготовка shadcn

Thread `forms-phase7-1-core-split`. Коммиты `858a000b`, `7fbd1b5d`, `d1c755fa` + шесть коммитов
внутри приватных submodule (по одному `tsconfig.json` в каждом).

### Шаги 3-4 — композиционный слой вынесен в новый пакет (`858a000b`, v1.6.0)

Блокер прошлой сессии снят решением Ками: заводим третий пакет, правило «`forms-core` не
импортирует ни один фреймворк» (2026-07-08) не ослабляем. Инструкция координатора «перенести
`createField` в `forms-core`» была невыполнима как написана — это React-код.

```
forms-core  →  forms-react  →  forms (Chakra) / forms-shadcn
```

**Переехало:** `createField`, `FieldWrapper`, `FieldErrorBoundary`, контекст формы, `FormGroup`,
хуки поля (`useResolvedFieldProps`, `useDeclarativeField`, `useAsyncFieldValidation`,
`useAsyncSearch`, `useDebounce`), `field-utils`, `autocomplete-map`, React-часть i18n,
UI-независимые типы (`BaseFieldProps`, `DeclarativeFormContextValue`, `ResolvedFieldProps`).

**Осталось в скине сознательно** (отклонение от буквы задания, координатор одобрил задним
числом, письмо 1452): `uikit-chakra.tsx`, `field-label.tsx`, `field-tooltip.tsx`,
`selection-field-label.tsx`, `field-error.tsx` (вынесен из `create-field.tsx`, чтобы развязать
цикл с `uikit-chakra`), `use-grouped-options.ts`, `form-group-list-sortable.tsx`. Это Chakra-код,
он и есть реализация контракта — в UI-library-free пакет он физически не может переехать.

**Механизм связывания — фабрика `createFieldPrimitives(uikit)`, вызываемая один раз на уровне
модуля скина** (`form-fields/base/primitives.ts`). Не контекст и не проп: компоненты должны быть
стабильны по ссылке, иначе React размонтирует поддерево поля на каждой перерисовке формы.
`FieldPrimitivesUIKit` намеренно уже полного `UIKit` — скину хватит четырёх примитивов
(`FieldRoot`/`FieldLabel`/`FieldError`/`ErrorFallback`), остальные он подключает по мере
миграции своих полей.

**Ни одно из 56 полей не правилось** — реэкспорт-шимы на местах переехавших модулей, публичный
API не изменился.

**Граница `forms-react`** — тег `type:core-react` (`depConstraints`) + `no-restricted-imports`
против `@chakra-ui/*`, `@ark-ui/*`, `@radix-ui/*`, иконок и против самих скинов. Обе половины
подтверждены негативной пробой. Ядро закрыто и от нового слоя: `type:core` не зависит ни от
`type:ui`, ни от `type:core-react`.

**Проверки:** 678 тестов `forms` + 76 `forms-react` (было 754 в одном; файлов 99 → 95 + 4 —
сходится файл-в-файл); `typecheck:tsgo` зелёный на 20 потребителях, включая шесть приватных;
живая проверка в Chromium на `form-develop-app` — рендер `fields-demo`, валидация
(`data-invalid` + `error-text`), async-путь (`Username занят`).

### Побочно закрыт техдолг 7.1 — неполные `paths` у потребителей

Приложения держали 9 подпутей `forms-core` из 15. Пока библиотека их не импортировала, всё было
зелёное; первое же использование `/uikit`, `/i18n`, `/address` из нового слоя положило всех
разом. Диагностика при этом вводит в заблуждение: где тип попадает в сигнатуру поля, `TS2307`
превращается в каскад `TS2322` вида «`{ name: string }` не совместим с `StringFieldProps`».

Дописан полный набор во все 17 приложений. Попутно выяснено: симлинк создаёт `bun install` и
лежит он в `<пакете>/node_modules/@letar/` (корневого `node_modules/@letar` в репо нет вовсе); а
приложения на «смешанной модели» `include` (`animatrona`, `label-printer-desktop`) требуют ещё и
glob, иначе `TS6307`. Записано в `.claude/rules/libs.md` — это общая механика монорепо.

### Фикс публикации типов (`7fbd1b5d`)

Дефект жил с Фазы 7.1: `noExternal` инлайнит внутренние `@letar/*` только в JS-бандл, а в
`dist/*.d.ts` оставались импорты `@letar/forms-core/...`, которых в npm нет. Сборка при этом
успешна — ломается только установка опубликованного пакета, поэтому 7.2 его не заметила.

**Почему `dts: { resolve: [...] }` выглядел неработающей опцией:** tsup строит `external` для
dts-прохода как `dependencies + peerDependencies` (`getProductionDeps`), и всё оттуда rollup
помечает внешним **до** плагинов — резолвер не вызывается вовсе. Подтверждено замером: под
`DEBUG=tsup:ts-resolve` в логе на 1310 строк нет ни одного bare-пакета, только относительные
пути.

**Фикс structural:** `@letar/forms-core`/`@letar/forms-react` переехали в `devDependencies` —
это внутренние слои, а не npm-пакеты, потребитель их не устанавливает. Пока они в
`dependencies`, любой флаг резолва мёртв.

**Проверено путём настоящего потребителя:** `npm pack` → установка тарбола в чистый проект вне
монорепо → `tsc --noEmit` зелёный. Позитивный контроль — внешние зависимости остались импортами;
негативный — `name={42}` даёт `TS2322`, то есть типы настоящие, а не `any`. Nx-граф цел (рёбра
строятся по импортам в коде).

### Шаг 5 — подготовка (`d1c755fa`)

Установлены десять Radix-примитивов + `class-variance-authority`, `clsx`, `tailwind-merge`
(`tailwindcss` 4.3.3 и `lucide-react` уже были). Проверено компиляционной пробой с негативным
контролем (`tone="rainbow"` → `TS2322`).

Решение по организации скина — прямые Radix + `cva`/`tailwind-merge`, **не** `shadcn` CLI;
обоснование, цена (потребителю нужен Tailwind 4 + `@source` на путь пакета) и порядок работ
записаны в `PLAN.md` §7.3.

### Открытые вопросы (ждут решения координатора/Ками)

1. **Два разных `BaseFieldProps`.** Наружу экспортируется legacy-тип из `src/lib/types.ts`
   (`label?: string`, существует с первого коммита, от старого `ChakraFormField`-API), а поля
   используют другой — из `forms-react`. Внешний потребитель не может присвоить
   `StringFieldProps` в `BaseFieldProps`. Не регресс; переименование — breaking change.
2. **Площадка для shadcn-демо.** `form-docs` уже на Tailwind 4 (Fumadocs), `form-develop-app` и
   `form-example` на Chakra и потребуют отдельной настройки.

## 2026-08-09 — Фикс рассинхрона версии в build:npm (dist/package.json vs package.json)

Найдено при диагностике Фазы 7.2 (сессия forms-dev), зафиксировано отдельно от самого фикса
`.d.ts`-генерации: `build:npm` копировал `package.publish.json` → `dist/package.json` голым
`cp`, а у `package.publish.json` было своё поле `version` (`1.2.0`), не связанное с
`libs/forms/package.json` (`1.4.8`) — прямая публикация ушла бы на npm с устаревшей версией.

**Фикс.** `version` убрано из `package.publish.json`. `dist/package.json` теперь собирает
`scripts/write-publish-package-json.mjs` — читает `version` из `package.json` (источник истины)
и мёржит его с шаблоном `package.publish.json`. Шаг в `project.json` (`build:npm`) заменён с
`cp package.publish.json dist/package.json` на `node scripts/write-publish-package-json.mjs`.

**Проверено:** `nx run "@letar/forms:build:npm" --skip-nx-cache` зелёный целиком (tsup + DTS +
все `cp`-шаги), `dist/package.json` содержит `version: "1.4.9"`, совпадающую с
`libs/forms/package.json`.

## 2026-08-09 — Фаза 7.2: standalone-проверка вне монорепо + фикс сломанной npm-публикации

Thread `forms-phase7-1-core-split`, логическое продолжение Фазы 7.1.

**Диагностика.** Собрала `@letar/forms` в npm-виде (`nx run "@letar/forms:build:npm"`), запаковала
через `npm pack`, установила в чистый scratch-проект вне монорепо (свой `node_modules`, без
`@letar/source` condition) и написала минимальную форму с `Form.Field.Phone` (тянет
`@letar/forms-core/phone`). Рантайм (JS) резолвится из коробки — `noExternal: ['@letar/forms-core']`
в `tsup.config.ts` полностью инлайнит `forms-core` в бандл `forms`, живой Node ESM-импорт
`@letar/forms/fields/specialized` подтверждён. Но нашла реальный баг: `build:npm` падал на шаге
`tsc --project tsconfig.publish.json` (80 ошибок TS6059/TS6307) — `tsconfig.publish.json` не
обновлялся вместе с ростом subpath-экспортов `forms-core` за Фазу 7.1 (8 путей из нынешних 15,
`rootDir: "src"` исключал `forms-core` из программы). Публикация на npm не проходила бы вообще, а
при частичном прогоне ушёл бы пакет без единого `.d.ts` — TS-потребитель получил бы `TS7016`.
Не чинила сходу — архитектурный вопрос, зафиксировала два варианта решения, передала
координатору/Ками.

**Фикс (решение Ками — вариант б).** Декларации теперь генерирует сам `tsup` (`dts: true`)
синхронно со списком `entry`, вместо отдельного `tsc`-прохода — рассинхрон `paths` больше
невозможен структурно. Убран `tsc`-шаг из `build:npm`, из `tsconfig.publish.json` убраны
`composite`/`outDir`/`rootDir` (принадлежали tsc-project-build режиму, tsup их не использует),
`paths` догнан до всех 15 subpath-экспортов. Побочная находка при отладке: сразу после включения
`dts: true` (ещё с `composite: true`) всплыл второй, независимый TS6307 — по соседним файлам
внутри самого `libs/forms/src` (composite требует явный файл-лист даже для tsup-мульти-entry
прохода). Снятие `composite` закрыло оба класса ошибок разом.

**Проверено:** `build:npm` целиком зелёный (все 12 `.d.ts`, все `cp`-шаги отработали),
`typecheck:tsgo` и весь тестовый набор `forms` зелёные. Финальная проверка — тот же scratch-проект:
`npm pack` → чистая переустановка → `tsc --noEmit` без ошибок; негативный контроль (заведомо
неверный проп на `Form.Field.Phone`) даёт `TS2322` — типы настоящие, не `any`-заглушка.

Изменённые файлы: `tsup.config.ts`, `project.json`, `tsconfig.publish.json`. v1.4.8.

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этапы 4–5 (завершение фазы)

Продолжение (thread `forms-phase7-1-core-split`). Закрывают Фазу 7.1 целиком.

**Этап 4** — зафиксирован TS-интерфейс `UIKit` под `@letar/forms-core/uikit` (~20 примитивов из
аудита связанности 2026-07-05). Реализованы и используются (`UIKitCorePrimitives`): `FieldRoot`,
`FieldLabel`, `FieldError`, `Input`, `Checkbox`, `Select`. Типизированы, но без адаптера
(`UIKitExtendedPrimitives`, опциональны в составе `UIKit`): `NumberInput`, `NativeSelect`,
`Combobox`, `RadioGroup`, `SegmentGroup`, `PinInput`, layout-примитивы. Три показательных поля
(`Field.String` — текстовое, `Field.Checkbox` — бинарное, `Field.Select` — выборное со сложным
compound-API и порталом) переведены на потребление контракта вместо прямого импорта Chakra;
`chakraUIKit` (`libs/forms/.../base/uikit-chakra.tsx`) — единственное место, где контракт
связывается с конкретной UI-библиотекой. Публичный API `@letar/forms` не изменился, 750/750
тестов зелёные, `nx run-many -t typecheck:tsgo --projects=forms,forms-core` зелёный.

**Побочная находка и фикс** (не про Этап 4 напрямую, но обнаружена при работе с той же
`vitest.config.ts`): предыдущая сессия закоммитила (`ad318324`) вычисление `formsCoreAlias` из
`forms-core/package.json` → `exports`, но не подключила его — старый ручной alias-список
остался активным, а вычисленная переменная висела неиспользуемой (ESLint warning). При
подключении (`...formsCoreAlias` вместо ручного списка) вскрылась вторая, более глубокая
проблема: `rollup-plugin-alias` (через который Vite резолвит объектные `resolve.alias`) матчит
по префиксу, и ключ `@letar/forms-core` без подпути обязан идти **после** всех подпутей — иначе
перехватывает `/schema`, `/utils` и т.д. до того, как до них доходит очередь. `Object.entries`
на `exports` даёт `.` первым (объект exports так и оформлен), поэтому наивное подключение
`formsCoreAlias` без сортировки ломало 70 из 98 тестовых файлов разом. Фикс — сортировка по
длине ключа по убыванию перед сборкой alias-объекта.

**Этап 5** — документация: `libs/forms/README.md` (раздел «Архитектура: framework-free ядро +
Chakra-адаптер»), `libs/forms/CHANGELOG.md` + версия 1.4.7, `libs/forms-core/README.md`
(написан с нуля — генератор оставил только заглушку `<!-- Опиши публичный API здесь -->`, README
описывает архитектурный принцип, таблицу всех 15 subpath-экспортов и раздел про UIKit-контракт).
`apps/form-develop-app`/`form-docs`/`form-example` не тронуты — Этап 4 внутренний рефакторинг
без нового пользовательского API, наглядного демо-эффекта нет.

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этапы 1–3б

Делегировано `forms-coordinator` (thread `forms-phase7-1-core-split`). Создан новый Nx-проект
`libs/forms-core` — dependency-free ядро `@letar/forms` (Clean Architecture / DIP, решение Ками
2026-07-08). Три этапа закрыты, каждый отдельным коммитом с полным гейтом
(`typecheck:tsgo`/`test`/`lint` + `nx run-many -t typecheck:tsgo --all` по всему монорепо).

**Этап 1** — каркас `libs/forms-core` (теги `scope:shared`/`type:core`/`owner:letar`), пилотный
модуль `validators/ru` (476 строк, 9 файлов) перенесён целиком. Граница ядра держится на двух
ESLint-правилах: `depConstraints` (`type:core notDependOnLibsWithTags: ['type:ui']`) +
`no-restricted-imports` на `**/forms-core/src/**/*.ts` против `react`/`@chakra-ui/*`/
`@tanstack/react-*` — подтверждена негативной пробой (временный импорт Chakra в ядро валит
`nx lint forms-core`, без него — зелёный).

**Этап 2** — Zod-мета-движок (~2030 строк, 9 файлов: `schema-constraints`, `schema-traversal`,
`constraint-hints`, `common-meta`, `with-ui-meta`, `schema-meta`, `zod-utils`, `types/meta-types`,
`types/size-types`) под `@letar/forms-core/schema`. Карго-культный `'use client'` снят со всех —
чистые TS-функции без единого runtime-импорта фреймворка.

**Этап 3а/3б** — `server-errors/`, `utils/` (deepEqual+safeStringify), `security/file-security.ts`,
`offline/` (offline-service+types), `captcha/` (verify+types), `analytics/` (types+4 адаптера).
React-зависимые части (хуки, компоненты) остались в `libs/forms`.

**Ключевые находки** (детали и объяснения — в `PLAN.md` § Фаза 7.1):

- резолв `@letar/forms-core` в приложениях-потребителях требует ДВА независимых механизма
  одновременно: `paths` в `tsconfig.json` (~20 приложений) И реальная workspace-зависимость
  `"@letar/forms-core": "workspace:*"` в `libs/forms/package.json` + `bun install` — приложения
  вроде `dashboard` резолвят `@letar/forms` вообще без `paths`, только через `customConditions`;
- «framework-free» ≠ «platform-free»: `file-security.ts` (DOM API — Image/document/canvas) и
  `offline-service.ts` (динамический `await import('idb-keyval')`, не пойманный статическим
  грепом аудита) — framework-free, но требуют `lib: dom` в tsconfig ядра и `fake-indexeddb/auto`
  в его vitest-окружении, которого у `forms-core` изначально не было вовсе;
- ловушка TS6307 у приложений со «смешанной моделью» `include` (`animatrona`,
  `label-printer-desktop`) — нужен явный glob на `../../libs/forms-core/src/**/*.ts`.

Публичный API `@letar/forms` не изменился — все перенесённые модули стали тонкими
реэкспорт-шимами. Побочно найден и зафиксирован отдельной задачей (уже закрыт, см. запись выше)
баг Rules of Hooks в `document-field-base.tsx`.

**Остаток Фазы 7.1** (записан в `PLAN.md`, следующая сессия `/forms-dev`): Этапы 3в-3г
(credit-card/format-phone/table-utils/dadata «хвост», `i18n/create-form-error-map.ts`), Этап 4
(UIKit-контракт ~20 примитивов + перевод 3 пилотных полей), Этап 5 (документация 6 групп +
отчёт координатору).

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этап 3в-3г

Продолжение (thread `forms-phase7-1-core-split`). Перенесены пять оставшихся Chakra-free/React-free
модулей под новые subpath-экспорты `@letar/forms-core`:

- `./credit-card` — `luhn`, `detectBrand`/`getBrandInfo`, `formatExpiry`/`isExpiryValid`,
  `formatCardNumber`/`stripCardNumber`/`maxFormattedLength`, `creditCardSchema`. В `libs/forms`
  остались только Chakra-компоненты `CreditCardField`/`CardBrandIcon` (импортируют утилиты из
  `@letar/forms-core/credit-card` напрямую).
- `./phone` — `format-phone.ts` (чистый JS форматтер по маске, добавлен в v1.4.4 для фикса
  WebKit-бага с DOM-мутирующими mask-библиотеками). `field-phone.tsx` импортирует из
  `@letar/forms-core/phone`.
- `./table` — `table-utils.ts` целиком + Chakra/React-free часть `table-types.ts` (`TableColumnDef`,
  `CellFieldType`, `ResolvedColumn`, `TableFooterDef`, `CellCoord`, `TableNavigationState`).
  `TableEditorFieldProps`/`TableEditorContextValue` (используют `ReactNode`) остались в
  `libs/forms` и реэкспортируют чистые типы обратно — то же разделение, что и раньше для похожих
  React+Chakra компонентов.
- `./address` — `createDaDataProvider` + `AddressProvider`/`AddressSuggestion`/`SuggestionOptions`.
  `providers/index.ts` в `libs/forms` стал тонким реэкспорт-шимом (потребители `field-address.tsx`/
  `field-city.tsx`/`create-form.tsx` не поменялись — импортируют из локального `./providers`).
- `./i18n` — `createFormErrorMap` + `TranslateFunction`/`TranslateParams` (тип функции перевода).
  React Context (`FormI18nProvider`/`useFormI18n`) остался в `libs/forms/i18n`, импортирует типы и
  `createFormErrorMap` из `@letar/forms-core/i18n` и реэкспортирует их для обратной совместимости
  публичного пути `@letar/forms/i18n`.

**Находка:** `libs/forms/vitest.config.ts` резолвит `@letar/forms-core/*` НЕ через `node_modules`
(там симлинка вообще нет — резолв в приложениях идёт через `customConditions`/`exports`, но
`vitest.config.ts` библиотеки использует явный `resolve.alias` per-subpath), а вручную прописанным
`resolve.alias` на каждый subpath. Добавление нового subpath-экспорта в `forms-core/package.json`
без зеркальной записи в этом alias-массиве ломает **все** тесты `libs/forms` разом (66 из 98 файлов
упали на одной ошибке `Failed to resolve import "@letar/forms-core/i18n"") — потому что почти
каждый спек транзитивно тянет`libs/forms/src/index.ts`, а тот тянет`i18n`. Починка — добавить
alias`'@letar/forms-core/<subpath>': resolve(__dirname, '../forms-core/src/lib/<subpath>/index.ts')`одновременно с добавлением subpath в`forms-core/package.json`. Гейт:`nx run-many -t
typecheck:tsgo,test --projects=forms,forms-core` — 750/750 тестов, typecheck зелёный.

Публичный API `@letar/forms` не изменился — реэкспорт-шимы. Остаток: Этап 4 (UIKit-контракт) и
Этап 5 (документация 6 групп).

## 2026-08-09 — Техдолг: rules-of-hooks в document-field-base.tsx (не false-positive)

- **`createDocumentField`** (`document/document-field-base.tsx`, используется FieldInn/FieldOgrn/
  FieldBik/FieldSnils/FieldKpp) вызывал `useCallback` прямо в теле render-callback, переданного в
  `createField()` — та же категория нарушения Rules of Hooks, что и в `FieldDataGrid`
  (2026-07-07, см. запись ниже), только для одной хук-функции (`maskRef`), а не пяти.
- Запись от 2026-07-07 называла это «известным false-positive» — неверно: `oxlint`
  (`react-hooks(rules-of-hooks)`) указывал на реальную проблему, просто раньше её не чинили.
- Фикс — по паттерну "Field with local state" из JSDoc `create-field.tsx`: `maskRef` вынесен в
  `useFieldState` (второй параметр `createField()`, вызывается ДО `form.Field`, hooks-safe),
  наружу передаётся через `fieldState.maskRef`.
- Верификация: `nx lint forms` — `rules-of-hooks` для файла ушла (остались только
  предсуществующие `curly`, не в скоупе этой правки); `nx test forms` — зелёный; публичный API
  `createDocumentField`/`DocumentFieldConfig` не менялся.

## 2026-07-08 — Стратегия дистрибуции (Фаза 7) + Clean Architecture

Планировочная сессия (без изменений кода). Определено направление распространения `@letar/forms`
на широкую OSS-аудиторию — зафиксировано в `PLAN.md` → **Фаза 7** и в memory (`project_forms_distribution`).

- **Анализ рынка (веб):** рынок ушёл в Tailwind/shadcn (дефолт новых проектов); RHF доминирует форм-стейт;
  ниша schema-first zod→form открыта. **Chakra-лок = потолок охвата**, несовместим с целью «все React-devs».
- **Аудит связанности по коду:** вся Chakra в `declarative/` (153/177), 54/66 файлов полей тянут её напрямую;
  обёртка поля уже централизована в `form-fields/base/`. UIKit-интерфейс ≈ 20 примитивов. ~50 файлов уже
  Chakra-free (`validators` 9/9 чистый — идеальный первый кандидат в core).
- **Центральное решение (Clean Architecture / DIP):** `forms-core` **не импортирует ни один фреймворк** —
  фреймворк это деталь, зависимость идёт внутрь. React-адаптер — первый плагин.
- **Vue:** делаем **тонкий пруф-адаптер** (5–8 полей поверх `@tanstack/vue-form`) как тест на фальсификацию
  границы (второй потребитель доказывает, что абстракция настоящая), НЕ полный порт. Противовес записан:
  SOLID — слуга, не господин; предохранитель от speculative generality.
- **Roadmap:** 7.1 расслоение core → 7.2 standalone вне монорепо → 7.3 shadcn-beta (20 полей) → 7.4 замер →
  7.5 docs+SEO → 7.6 llms.txt/MCP → 7.7 open-core сервис → 7.8 Vue-пруф (после 7.1). Модель — open-core.
- **Следующий шаг:** 7.1 — TS-контракт UIKit + вынести `validators` в dependency-free core.

**Доработка воркфлоу (`.claude/commands/forms-dev.md`, коммит 6b38a76):** разбор показал, что `/forms-dev` не
лишний (концурренси-замок на `libs/forms` при многих параллельных сессиях), но устарел и не видел roadmap.
Исправлено: обязать читать `libs/forms/PLAN.md` целиком (не только Backlog) → активная фаза; расширить
file-reservations на будущие пакеты Фазы 7 (`forms-core` + скины + Vue); явно выделить, что доки
(`form-docs`) и примеры (`form-example`) — отдельные аппы и обязательны; версия 0.56→1.4, 40+→56 полей.

## 2026-07-07 — Техдолг: rules-of-hooks в FieldDataGrid

- **`field-data-grid.tsx`** — `useMemo`/`useReactTable`/`useRef`/`useVirtualizer` вызывались внутри
  `{(arrayField) => {...}}` render-prop callback `<form.Field mode="array">` — реальное нарушение
  Rules of Hooks, не только придирка линтера. Заменено на `useField({ form, name, mode: 'array' })`
  верхнего уровня (тот же хук, на котором построен сам `<form.Field>`, поведение идентично) —
  все хуки теперь на верхнем уровне компонента.
- Заодно `eqeqeq`: `value != null` → явное сравнение с `null`/`undefined`.
- Обнаружено при аудите техдолга после планового `bun update` (сравнение typecheck/lint до/после
  показало, что ошибка предсуществующая, не от обновления зависимостей).
- Верификация: `nx run @letar/forms:oxlint` — чисто (кроме известного false-positive в
  `document-field-base.tsx`, не в этом файле), `typecheck:tsgo` и `test` — чисто.
- Публичный API (`DataGridFieldProps`) не менялся.

## v0.80.0 (2026-04-04) — DX фичи (Фаза 6)

- mapServerErrors() — автомаппинг Prisma/ZenStack/Zod ошибок (24 теста, 10M+ ops/sec)
- useFormHistory + HistoryControls — Undo/Redo Ctrl+Z/Y (3 теста)
- Form.Analytics — field-level аналитика + 4 адаптера (9 тестов, 25M+ ops/sec)
- FormReadOnlyView — режим чтения (9 render-тестов)
- FormSkeleton — loading state из Zod-схемы (5 тестов)
- FormComparison — diff-view (8 тестов)
- FormDependsOn — каскадный рендеринг

## v0.78.0 — Captcha + CreditCard

- Form.Captcha (Turnstile/reCAPTCHA/hCaptcha)
- Form.Field.CreditCard (brand detection, Luhn, SVG)

## v0.58.0 — Англификация + Address Provider

- 118 файлов переведены на английский
- Pluggable AddressProvider + DaData

## v0.50.0 — DRY/SOLID рефакторинг

- ~500 строк дублирования устранено
- SelectionFieldLabel, useGroupedOptions, zod-utils

## Фазы 1-5 (v0.1.0 — v0.50.0)

- 50+ field компонентов
- 20+ form-level компонентов
- Offline support, i18n, localStorage persistence
- TanStack Form DevTools интеграция
- createForm() фабрика с extraSelects/Comboboxes/Fields

### Фикс типа Form.Field.Signature (2026-08-04)

`form-compound-types.ts`: тип поля `Signature` был вручную выписанным литералом,
разошедшимся с реальным `SignatureFieldProps` (объявлял несуществующие `penColor`/`mode`/
`readOnly`, не знал про рабочие `strokeColor`/`strokeWidth`/`allowTyped`/`typedFont`/
`exportFormat`). Рантайм-привязка была верной, ломался только typecheck потребителей
(`form-develop-app`). Заменён на прямую ссылку на `SignatureFieldProps`.

---

**Последнее обновление:** 2026-08-04
