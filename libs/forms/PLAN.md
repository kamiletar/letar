# PLAN.md — @letar/forms

План развития UI-библиотеки компонентов форм.

---

## 🔄 [2026-08-13] Фаза 9: паритет Vue-полей (57/57) — разворот решения Фазы 7.8

**Запросил:** Ками напрямую (через координатора). Назначено forms-dev.

**Контекст:** `forms-vue` (5 полей) и `forms-vue-shadcn` (6 полей) изначально задуманы как
**архитектурный пруф границы** `@letar/forms-core`, не как полный порт — оба README прямо
говорят «56 полей React-скина сюда не переносились и не планируются», «это был бы второй Ark UI
под Vue — месяцы работы, заказчика на это нет» (Фаза 7.8). Формулировка «заказчика нет» из Фазы
7.8 сама была неточной рамкой: `@letar/forms` — не коммерческий заказ, а высказывание Ками как
веб-архитектора ([[project_forms_distribution]] §2026-07-08). Решение Фазы 7.8 отменяется не
потому что «нашёлся клиент», а потому что Ками сам решил довести Vue-адаптер до полноты как часть
этого высказывания. Отсюда следствие для объёма и качества: ориентир — архитектурная цельность и
завершённость, не минимально достаточный набор под конкретное приложение-потребителя.

**Задача:** довести `forms-vue` (headless, поверх `@tanstack/vue-form`) и `forms-vue-shadcn`
(Reka UI скин) до паритета с React (`@letar/forms` 57 полей / `@letar/forms-shadcn` 47+
портированных). Обе README задачи сами перечисляют, чего не хватает — таблицы «Поля (N штук)» и
«Что НЕ входит в скоуп» в каждом README являются стартовым чек-листом гэпа.

**Статус:** ⏳ план по этапам отправлен QuietRidge 2026-08-13 (тред `forms-vue-parity-phase9`,
письмо #199) — 7 этапов по группам полей (нативные HTML → select/Reka → маски/документы →
числовые/датные виджеты → тяжёлые peer-deps → survey/table → form-docs), плюс архитектурный
вопрос на согласование: вынести общий композиционный слой `forms-vue` (`createField`/
`provideAppForm`) так, чтобы `forms-vue-shadcn` переиспользовал его вместо дублирования (аналог
роли `forms-react` для двух React-скинов). Целевое число полей уточнено по факту:
`list_fields` отдаёт **61**, не 57 (3 document-поля добавились после Фазы 8, число «57/57» в
заголовке этой записи устарело). Ждёт подтверждения перед стартом Этапа 1.

**Системная защита прозы (2026-08-13):** тест-страж `field-registry.integration.spec.ts` защищает
код (`fields.md` ↔ реестр), но не руками написанные числа в README — они разошлись дважды
(«49 vs 56», затем «56/57 vs 61»). Добавлен второй страж —
`libs/form-mcp/src/data/doc-field-count.integration.spec.ts` — сверяет число в
`libs/forms/README.md` (диаграмма архитектуры, уже поправлено на 61) с реальным размером реестра.
Числа в README Vue-скинов (`forms-vue`, `forms-vue-shadcn`) и в
`apps/form-docs/content/docs/guides/porting-framework.mdx` намеренно НЕ включены в
`LIVE_MENTIONS` — это доля портированных полей, часть этой же Фазы 9, правь их вместе с самой
Vue-работой и добавляй туда же в `LIVE_MENTIONS`, когда числа станут актуальными.

**Найдена ещё одна точка того же рассинхрона, вне scope этой правки:** таблица библиотек в
`.claude/rules/libs.md` хардкодит «47/56 полей» (forms-shadcn), «5 полей» (forms-vue), «6 полей»
(forms-vue-shadcn) — те же числа, что путаются в README, но guard-тест их не покрывает (это не
README `@letar/forms*`, а служебный rules-файл). Делать сейчас рано — числа всё ещё в движении
из-за этой же Фазы 9. Когда Vue-паритет устаканится: либо убрать числа из `libs.md` в пользу общей
фразы («Vue-скин, headless» без счётчика), либо расширить `LIVE_MENTIONS` в
`doc-field-count.integration.spec.ts` на этот файл тоже.

**Связанная задача в документации:** [`apps/form-docs/PLAN.md` → P7](/apps/form-docs/PLAN.md) —
переключатели Framework (React/Vue) × Skin (Chakra/shadcn), спроектированы 2026-08-13 по ресёрчу
чужих решений (TanStack, Ark UI, shadcn, Radix, Zag, Nuxt UI, Park UI, Docusaurus). Три следствия
именно для этой фазы:

- **Ось Framework в доках не ждёт полного паритета** — недостающие Vue-поля показываются
  `disabled`-вкладкой (паттерн Park UI), переключатель работает публичным индикатором прогресса
  Фазы 9. Поэтому «доки ждут 61/61» — неверная предпосылка при планировании этапов.
- **Живое Vue-демо для доков строить не нужно.** Демо остаётся React: так у Ark UI, Zag, Park UI,
  Reka UI и Radix — все пятеро независимо показывают демо на одном стеке и переключают только код.
  Не закладывать эту работу в этапы Фазы 9.
- ⚠️ **Раскладка Vue-примеров влияет на доки.** Этап 0 в P7 переводит примеры документации на
  чтение с диска из реальных файлов (паттерн Ark UI: у них 63 компонента и 14 примеров слайдера —
  файлы с **одинаковыми именами** в React и Svelte). Если Vue-примеры сразу класть по тем же
  именам, что React-аналоги, доки получат паритет структурно, без ручной синхронизации. Учесть
  при планировании раскладки — переделывать потом дороже.

**Этап 1 — отчёт (2026-08-13): архитектурная база готова, координатор ушёл в retired.**
`QuietRidge` подтвердила план (письмо #201, тред `forms-vue-parity-phase9`), уточнила вариант A
(подпуть `@letar/forms-vue/core`, не модуль внутри пакета) и разрешила старт, затем ушла в
retired (письмо #202) — дальнейшие отчёты идут сюда, в `PLAN.md`, не в agent-mail.

Сделано:

- **Новый подпуть `@letar/forms-vue/core`** (`forms-vue` 0.1.0 → 0.2.0) — `AppForm`, `createField`,
  `provideAppForm`, `useAppFormContext` переехали физически в `src/lib/core/`; корневой `.`
  реэкспорт не изменился. Композиционная логика разбора Zod-меты и обёртки `form.Field`
  дополнительно вынесена в новые `resolveFieldMeta`/`withFieldValidation` (`src/lib/core/field-wiring.ts`).
- **ESLint-барьер** (`eslint.config.mjs`) — файлам `forms-vue/src/core.ts`/`src/lib/core/**`
  запрещено импортировать что-либо из `src/lib/fields/**`, тем же механизмом
  (`no-restricted-imports` + негативная проба), что уже держит границу `forms-core`/`forms-react`.
- **`forms-vue-shadcn` переключён на реальное переиспользование** (0.1.0 → 0.2.0, ломающее —
  согласовано, пакет в beta): `createFieldPrimitives`, `FieldSelect`, `FieldCombobox` теперь
  вызывают `resolveFieldMeta`/`withFieldValidation` из `@letar/forms-vue/core` вместо
  продублированной копии той же логики. Своя специфика скина (`onErrorCaptured`,
  `uikit.ErrorFallback`) осталась на месте — это не подошло бы под общую обвязку.
- Интеграционный тест `AppForm` + все поля вместе (`app-form.spec.ts`) остался вне `core/` — он
  законно пересекает границу core/fields, барьер бы его заблокировал.
- Vitest-алиасы (`vitest.config.ts` обоих пакетов + `demo/vite.config.ts`) дополнены записью на
  подпуть `/core` — порядок ключей важен (подпуть перед голым пакетом, тот же нюанс, что и с
  `forms-core` в README).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

Дальше по плану Этапа 1 (нативные HTML-поля, ∼14 штук) — реализация в следующем заходе:
`String, Textarea, Number, NumberInput, Password, Checkbox, Switch, RadioGroup, NativeSelect,
Hidden, YesNo, Date, Time, Currency, Percentage`. Архитектурная база (подпуть + барьер + общая
обвязка) была предпосылкой для этого — без неё каждое новое поле в `forms-vue-shadcn` копировало
бы `resolveFieldMeta`/`withFieldValidation` заново.

**Этап 1 — отчёт (2026-08-13, продолжение): 11 нативных HTML-полей реализованы в headless-пакете,
8 из них — на `rekaUIKit`.**

- **`@letar/forms-vue` 0.2.0 → 0.3.0, 16 полей (было 5):** `FieldNumberInput`, `FieldPassword`,
  `FieldSwitch`, `FieldRadioGroup`, `FieldNativeSelect`, `FieldHidden`, `FieldYesNo`, `FieldDate`,
  `FieldTime`, `FieldCurrency`, `FieldPercentage` — плюс уже существовавшие Input/Textarea/Number/
  Checkbox/Select. Имена файлов (`field-number-input.ts`, `field-native-select.ts`, …) подобраны
  1:1 с React-скином (`libs/forms/src/lib/declarative/form-fields/**`) — требование координатора
  для будущего P7 (`apps/form-docs`), матчинг примеров по диску.
- **`@letar/forms-vue-shadcn` 0.2.0 → 0.3.0, 14 полей (было 6):** реализовано 8 из 11 новых —
  `FieldNumberInput`, `FieldPassword`, `FieldDate`, `FieldTime`, `FieldCurrency`, `FieldPercentage`,
  `FieldHidden`, `FieldYesNo`. Переиспользуют существующие Reka-примитивы (`Input`/`NumberInput`),
  новых не понадобилось.
- **Осознанно отложено на Этап 2:** `FieldSwitch`/`FieldRadioGroup`/`FieldNativeSelect` в
  `forms-vue-shadcn` — нужны новые Reka UI-примитивы (`Switch`/`RadioGroup`/`NativeSelect`,
  extended UIKit), которых пока нет в `rekaUIKit`. Этап 2 по плану и так посвящён
  «select-family на Reka UI (~9 полей)» — три поля естественно туда переезжают, не отдельная
  доработка.
- **Находка:** `createField`-фабрика (headless и shadcn) не поддерживает поля с локальным
  состоянием (`useFieldState` из React-версии нет) — `FieldPassword` в обоих пакетах пришлось
  собирать напрямую через `resolveFieldMeta`/`withFieldValidation` внутри `defineComponent`,
  чтобы `ref(visible)` жил в `setup()`, а не пересоздавался на каждый рендер внутри колбэка
  `render`. Тот же паттерн понадобится любому будущему полю с локальным UI-состоянием
  (например `FieldRating`, `FieldSlider` на Этапе 4).
- Тесты — расширен `app-form.spec.ts` в обоих пакетах, блок «Этап 1»: 8 новых тестов в
  `forms-vue`, 2 — в `forms-vue-shadcn` (рендер контролов + переключение видимости пароля).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный.

Дальше: Этап 2 (select-family на Reka UI, ~9 полей + три отложенных выше) — следующий заход.

**Этап 2 — отчёт (2026-08-13): три отложенных поля закрыты на `rekaUIKit` — `FieldRadioGroup`,
`FieldNativeSelect`, `FieldSwitch`. Headless `@letar/forms-vue` их уже имел (Этап 1), доработка
только в `forms-vue-shadcn`.**

- **`@letar/forms-vue-shadcn` 0.3.0 → 0.4.0, 17 полей (было 14):**
  - `RadioGroup`/`NativeSelect` добавлены в `UIKitExtendedPrimitives`-реализацию `rekaUIKit`
    (`ImplementedExtendedPrimitives` расширен с 3 до 5) — новые файлы
    `uikit/primitives/radio-group.ts` (`RadioGroupRoot`/`RadioGroupItem`/`RadioGroupIndicator` из
    `reka-ui`) и `uikit/primitives/native-select.ts` (обычный `<select>`), паритет разметки с
    React (`forms-shadcn/uikit/primitives/{radio-group,native-select}.tsx`).
  - `FieldSwitch` — **не через UIKit-контракт**: `Switch` не описан в `UIKitExtendedPrimitives`
    (тот же вывод, что уже был у React-скина — `forms-shadcn/field-switch.tsx` рисует
    `@radix-ui/react-switch` напрямую), поэтому Vue-версия рисует `SwitchRoot`/`SwitchThumb` из
    `reka-ui` напрямую внутри `createField`-рендера, не добавляя примитив в контракт.
  - `FieldRadioGroup`/`FieldNativeSelect` собраны как `FieldSelect`/`FieldNumberInput` —
    `options` вне контракта `createField`, напрямую через `useAppFormContext`/`resolveFieldMeta`/
    `withFieldValidation` + `FieldWrapper`.
- Тесты — `app-form.spec.ts`, блок «Этап 2» (4 новых): рендер контролов всех трёх полей, клик по
  radio-опции, выбор в native `<select>`, переключение `Switch`. Итог пакета — 11 тестов, все
  подтверждены прогоном `npx vitest run --reporter=verbose` (не только зелёный статус Nx).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue-shadcn` зелёный.
- `@letar/forms-vue` (headless) без изменений — все 3 поля были реализованы там ещё на Этапе 1.

**Этап 3 — отчёт (2026-08-13): маски/документы через `@letar/forms-core/mask`, 10 полей закрыты в
обоих Vue-пакетах.**

- **Новый composable `useMaskField`** — `libs/forms-vue/src/lib/core/use-mask-field.ts`, экспорт
  через `@letar/forms-vue/core`, единый для headless и Reka-скина. Vue-аналог React `useMaskField`
  (`forms-react`), оборачивает `MaskController`/`format`/`unformat` из `forms-core/mask`.
  `'live'`-режим — неконтролируемый `<input>` (`inputRef` без `value`/`onInput` в vnode-данных,
  DOM источник истины); `'blur'`/`'off'` — обычный контролируемый `<input>`.
  ⚠️ **Обязательно вызывать один раз в `setup()`**, не в render-замыкании — иначе `inputRef`
  терял бы стабильную идентичность между ре-рендерами (нет React `useCallback` с зависимостями,
  стабильность даёт сам факт однократного выполнения `setup()`) и `MaskController` пересоздавался
  бы на каждое нажатие клавиши, теряя каретку.
- **`@letar/forms-vue` 0.3.0 → 0.4.0, 26 полей (было 16):** `createDocumentField` (headless) +
  `FieldMaskedInput`, `FieldPassport`, `FieldINN` (`formatMode: 'off'`, переменная длина 10/12),
  `FieldKPP`, `FieldOGRN`, `FieldSNILS`, `FieldBIK`, `FieldBankAccount`, `FieldCorrAccount`,
  `FieldPhone` (форматтер `forms-core/phone`, НЕ через `useMaskField` — WebKit-safe, тот же выбор,
  что в React `field-phone.tsx`). Контрольные суммы — `@letar/forms-core/validators/ru`, 1:1 с
  React-версией.
- **`@letar/forms-vue-shadcn` 0.4.0 → 0.5.0, 27 полей (было 17):** тот же набор на Reka-скине,
  `document-field-base.ts` рисует сырой `<input>` в обход `rekaUIKit.Input` (`'live'`
  неконтролируемый, `UIKitInputProps` требует `value`/`onChange`) — тот же приём, что у
  `FieldPassword`. `FieldPhone` — контролируемое поле через `rekaUIKit.Input`.
- **`FieldCreditCard` сознательно отложен** — компаунд-поле (номер+expiry+CVC, автопереход
  фокуса, Luhn-валидация), без `useMaskField` вовсе (свои форматтеры `forms-core/credit-card`),
  объёмнее остальных девяти полей вместе — отдельный заход, не входит в Этап 3.
- Тесты — `app-form.spec.ts` обоих пакетов, блок «Этап 3»: живое форматирование через реальный
  `MaskController` (не мок — `@vue/test-utils` `.setValue()` идёт по пути `commitFullReplace` в
  `controller.ts`, т.к. jsdom не шлёт `beforeinput` при программной установке `.value`), ошибки
  валидации (ИНН, корр. счёт), форматирование телефона.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

**Этап 5 (часть 2) — отчёт (2026-08-13): Signature/Address/City закрыты в обоих Vue-пакетах.**
Из восьми полей Этапа 5 остался только `FieldRichText` — единственное, требующее нового
тяжёлого peer-dep (`@tiptap/vue-3`), намеренно вынесено в отдельный заход.

- **`@letar/forms-vue` 0.7.0 → 0.8.0, 39 полей (было 36):** `useSignatureField`
  (`@letar/forms-vue/core`) — 1:1 порт `useFieldState` React `field-signature.tsx` (рисование
  мышью/пальцем + typed-режим, экспорт PNG/SVG data URI); `useAddressSuggestions`
  (`@letar/forms-vue/core`) — общий для `FieldAddress`/`FieldCity`. `createDaDataProvider`/
  `AddressProvider` (`@letar/forms-core/address`) уже framework-agnostic — существовали до
  Фазы 9, порт не потребовался вовсе, Vue-специфика только в debounce/click-outside/клавиатуре.
- **`@letar/forms-vue-shadcn` 0.8.0 → 0.9.0, 40 полей (было 37):** тот же набор на Reka-скине,
  переиспользует оба composable, только Tailwind-разметка.
- **Находка, тот же класс, что в части 1:** оба composable (`useSignatureField`,
  `useAddressSuggestions`) должны вызываться один раз в `setup()`, не в render-замыкании
  `withFieldValidation` — иначе теряют стабильную идентичность `ref()`-состояния на каждый
  ре-рендер. Запись значения — через `form.setFieldValue` напрямую, `field` из render-замыкания
  composable не передаётся.
- **Осознанно не дедуплено:** чистые SVG-функции подписи (`buildSvgString`/`buildTypedSvgString`/
  `escapeXml`) не вынесены в `forms-core`, в отличие от дата/число-хелперов Этапа 4 — единственный
  потребитель здесь эта пара Vue-полей, выносить некуда переиспользовать.
- Тесты — `app-form.spec.ts` обоих пакетов, блок «Этап 5 (часть 2)»: рендер трёх полей,
  draw/typed-переключение подписи, рисование на canvas (2D-контекст замокан — jsdom его не
  реализует) + очистка, запрос адреса/города через мок-провайдер + выбор подсказки.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

**Этап 5 (продолжение) — отчёт (2026-08-13): `FieldRichText` закрывает Этап 5 целиком в обоих
Vue-пакетах.** Последнее из восьми полей этапа — WYSIWYG на Tiptap (`@tiptap/vue-3`, новый
peer-dep пакета).

- **`@letar/forms-vue` 0.8.0 → 0.9.0, 40 полей (было 39):** `FieldRichText` грузится лениво через
  новый `createLazyField` (`@letar/forms-vue/core`, на `defineAsyncComponent`) — Vue-идиоматичный
  выбор вместо повторения React `lazy()`+`Suspense`: `defineAsyncComponent` не требует от
  потребителя оборачивать поле в `<Suspense>` вручную, встроенный fallback-скелетон уже внутри.
  Реализация — в отдельном чанке `field-rich-text-impl.ts`, сам файл `field-rich-text.ts` — тонкая
  ленивая обёртка. Тулбар (жирный/курсив/подчёркнутый/зачёркнутый/код/H1-3/списки/цитата/
  ссылка/undo/redo) вынесен в общий `rich-text-actions.ts` (`@letar/forms-vue/core`) — таблица
  команд + русские `aria-label`, переиспользуется обоими скинами. Headless рисует кнопки
  текстовыми глифами (B/I/U/…), как уже принято у `FieldRating` (★/☆) — без иконки-либы.
- **`@letar/forms-vue-shadcn` 0.9.0 → 0.10.0, 41 поле (было 40):** тот же `FieldRichText` на
  Reka/Tailwind-скине, переиспользует `useRichTextField`/`RICH_TEXT_ACTIONS`/
  `RICH_TEXT_BUTTON_LABELS`/`createLazyField` из `@letar/forms-vue/core` без дублирования —
  собственные только Tailwind-разметка тулбара (иконки `lucide-vue-next`) и содержимого.
- **Тот же упрощённый scope, что у React `forms-shadcn`-версии** (Фаза 7.6, сама уже сокращение
  от Chakra-оригинала): без `imageUpload`/`ImagePopover`, кнопка `link` — `window.prompt`, не
  Popover-форма.
- **Находка — StarterKit v3 уже включает `Link`/`Underline` сам.** Отдельные
  `@tiptap/extension-link`/`@tiptap/extension-underline` в списке `extensions` дублировали то, что
  `@tiptap/starter-kit` и так регистрирует (`Link.configure(...)`/`Underline.configure(...)`
  внутри пакета) — `[tiptap warn]: Duplicate extension names found`. Убраны из зависимостей обоих
  Vue-пакетов, ссылка конфигурируется через `StarterKit.configure({ link: {...} })`.
- **Находка — версийный разъезд `@tiptap/vue-3`.** Caret `^3.29.2` у Bun резолвится в `3.30.1`,
  чей `peerDependencies` требует точно `@tiptap/core@3.30.1`/`@tiptap/pm@3.30.1` — при остальном
  tiptap-семействе воркспейса на `3.29.2` получаем рантайм-`SyntaxError` (`createWidgetDecoration`
  не экспортирован), не TS-ошибку. Пин точной версией `"3.29.2"` (без `^`) в корневом
  `package.json` и обоих `forms-vue*/package.json` — обязателен, пока апстрим не выровняет
  диапазоны.
- **Находка — двойная асинхронность в тестах.** Два независимых источника таймингов ловят
  `flushPromises()`+`nextTick()` врасплох: (1) `defineAsyncComponent`'s реальный `import()` под
  Vite/Vitest резолвится через несколько макротасков модульного графа, не микрозадачу — нужен
  цикл с реальным `setTimeout`; (2) `@tiptap/vue-3`'s `editor.state`/`isActive()` живут за
  `customRef`, чей `set()` вызывает `trigger()` только после двойного `requestAnimationFrame` —
  обновление тулбара после клика видно тестам только после двух кадров. Оба хелпера
  (`waitForLazyField`/`waitForEditorUpdate`) — в новом `app-form.stage5b.spec.ts` каждого пакета.
- Тесты — отдельный файл `app-form.stage5b.spec.ts` в обоих пакетах (не общий `app-form.spec.ts`,
  чтобы не раздувать его дальше): загрузка + рендер тулбара/редактора, клик по кнопке переключает
  `aria-pressed`, `toolbarButtons` сужает набор отрисованных кнопок.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах (38/38 тестов каждый).

**Этап 6 (часть 1) — отчёт (2026-08-13): FieldLikert/FieldMatrixChoice закрыты в обоих
Vue-пакетах.** Первые два поля Этапа 6 (survey/table) — портированы 1:1 из
`libs/forms-shadcn/src/lib/fields/{field-likert,field-matrix-choice}.tsx`.

- **`@letar/forms-vue` 0.9.0 → 0.10.0, 42 поля (было 40):** `FieldLikert` (значение `number`,
  1-based индекс точки; `anchors: string[]`/`showNumbers` — пропы сверх контракта `createField`)
  и `FieldMatrixChoice` (значение `Record<string, string | string[]>`; `rows`/`columns:
  MatrixRow[]/MatrixColumn[]`, три варианта `radio`/`checkbox`/`rating`, per-row
  required-подсветка). Оба собраны напрямую `defineComponent`+`h()`, тот же паттерн, что
  `FieldRadioGroup`/`FieldYesNo` — пропы-массивы вне контракта `createField`. Rating-звезда —
  текстовый глиф `★`, тот же принцип, что у `FieldRating`, без иконки-либы.
- **`@letar/forms-vue-shadcn` 0.10.0 → 0.11.0, 43 поля (было 41):** тот же набор на
  Reka/Tailwind-скине, те же Tailwind-классы, что в React-версии. Rating-звезда — `lucide-vue-next`
  `Star`, переиспользован тот же примитив, что уже подключён у `FieldRating`.
- **`disabled` — явный проп поля** (по умолчанию `false`), не производный от контекста формы —
  так уже сделано у `FieldCreditCard`/`FieldRadioGroup`/`FieldNativeSelect` в Reka-скине; React-версия
  берёт `disabled`/`readOnly` из `resolved` (`createField`), но у этих двух Vue-полей нет
  `createField`-обвязки вовсе (пропы-массивы вне контракта), поэтому расхождение осознанное.
- Тесты — новый файл `app-form.stage6.spec.ts` в обоих пакетах (с 0.9.0/0.10.0 тесты пакетов
  разбиты на файлы по этапам, не единый `app-form.spec.ts`).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.
- Осталось от Этапа 6: `TableEditor`/`DataGrid`/`Form.Group`/`Form.Steps` — отдельный заход.

**Этап 6 (часть 2) — отчёт (2026-08-13): FieldTableEditor закрыт в обоих Vue-пакетах.**
Портирован 1:1 из `libs/forms-shadcn/src/lib/table/field-table-editor.tsx` (+ подкомпоненты
`table-{header,row,footer,toolbar,cell}.tsx`, `use-table-columns.ts`, `use-table-navigation.ts`).

- **Находка про `@tanstack/vue-form` array-API** (проверялась перед стартом, не была очевидна
  заранее): подтверждена по исходникам пакета (`node_modules/.bun/@tanstack+vue-form@1.33.5.../
  dist/esm/types.d.ts` — `UseFieldOptions.mode?: 'value' | 'array'`, и `@tanstack/form-core@0.42.1/
  dist/esm/FieldApi.d.ts` — `pushValue`/`insertValue`/`replaceValue`/`removeValue`/`swapValues`/
  `moveValue` на любом `FieldApi` с массивным значением). Один и тот же `@tanstack/form-core` под
  React/Vue/Solid-обёртками — array-режим работает идентично, порт логики 1:1, без обходных путей.
- **`@letar/forms-vue` 0.10.0 → 0.11.0, 43 поля (было 42):** `h(form.Field, { name, mode: 'array'
  }, { default: ({ field }) => ... })`, каждая ячейка — отдельный вложенный `form.Field` по пути
  `${name}[i].col` (структурный контракт, на котором будет строиться `DataGrid`). Собственный
  Vue-компонент `TableCell` (не функция рендера) — иначе локальный буфер редактирования не
  переживёт перерисовку; автофокус — через `onVnodeMounted` конкретного `<input>`, не через
  `onMounted`/`watch` из `setup()` (переключение display↔edit происходит внутри
  render-замыкания `form.Field`-слота, где нет активного Vue-instance для обычных lifecycle-хуков).
- **Рефакторинг границы `core`/`fields` headless-пакета**: `resolveTableColumns`,
  `useTableNavigation`/`createTableContainerRef` и общие типы (`TableEditorController` и т.д.)
  перенесены из `lib/fields/table/` в `lib/core/` и экспортированы через `@letar/forms-vue/core` —
  иначе `@letar/forms-vue-shadcn` (по установленной границе пакетов — импортирует только
  `./core`, не корневой `.`, чтобы не тянуть headless-разметку) не смог бы их переиспользовать и
  задублировал бы логику резолва колонок и клавиатурной навигации.
- **`@letar/forms-vue-shadcn` 0.11.0 → 0.12.0, 44 поля (было 43):** та же логика из
  `@letar/forms-vue/core`, Tailwind-разметка подкомпонентов, `lucide-vue-next`
  (`GripVertical`/`X`), `onErrorCaptured` + `rekaUIKit.ErrorFallback` (тот же паттерн, что у
  остальных полей Этапа 6).
- **Упрощения объёма (сверх уже принятых в React shadcn-версии — sortable через нативный HTML5
  DnD, не `@dnd-kit`):** нет отдельного мобильного карточного вида (`TableMobileView`) — одна
  таблица с горизонтальным скроллом на всех размерах экрана, задокументировано в CHANGELOG.md
  обоих пакетов. Клавиатурная навигация (Tab/Enter/Escape/стрелки) и copy-paste из Excel (TSV) —
  оставлены без урезания: `@letar/forms-core/table` уже framework-agnostic, порта не потребовалось.
- Тесты — новый файл `app-form.stage6b.spec.ts` в обоих пакетах: рендер таблицы,
  добавление/удаление строки, редактирование ячейки, drag&drop-сортировка, copy-paste TSV.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах (50/50 тестов каждый).
- Осталось от Этапа 6: `DataGrid`/`Form.Group`/`Form.Steps` — отдельные заходы.

**Этап 6 (часть 3) — отчёт (2026-08-13): FieldDataGrid закрыт в обоих Vue-пакетах — Этап 6 полей
завершён.** Портирован из `libs/forms-shadcn/src/lib/fields/field-data-grid-impl.tsx` (+
`field-data-grid-types.ts`).

- **`@tanstack/vue-table` добавлен как peer/dev-зависимость** (`^8.21.3`, тот же мажор, что
  `@tanstack/react-table`) в оба Vue-пакета — не был установлен в воркспейсе, `npm pack`
  использован только для чтения исходников перед реализацией.
- **Три находки про API `@tanstack/vue-table`/`@tanstack/vue-form`, все задокументированы в
  JSDoc `libs/forms-vue/src/lib/core/use-data-grid.ts` и в CHANGELOG.md обоих пакетов:**
  1. Нет функции `flexRender` (в отличие от React) — только Vue-компонент `FlexRender`
     (`h(FlexRender, { render, props })`), обёрнуто локальной функцией-адаптером в обоих полях.
  2. Реактивность `useVueTable` держится на property-геттерах (`get columns() {...}`), не на
     `MaybeRef`-типизации (та документирует реактивность только для `data`) — подтверждено
     чтением исходника пакета. `onSortingChange`/`onColumnFiltersChange`/`onRowSelectionChange`
     без автораспаковки апдейтера (в отличие от React `useReactTable`).
  3. **Самая дорогая находка** (стоила падающего теста): `useField({ mode: 'array' })` не
     реактивен к точечной записи вложенного скаляра (`form.setFieldValue('items[i].col', v)`) —
     `meta._arrayVersion` бампается только структурными мутациями. В React это маскируется
     полным ре-рендером компонента на любой локальный `useState` (значит и `arrayField.state.value`
     читается заново каждый раз); в Vue `computed()` кеширует по графу зависимостей и не видит
     несвязанный `ref`. Фикс — собственный `editVersion` ref в `useDataGridField`, бампаемый в
     `setCellValue`, плюс чтение актуального значения через `form.getFieldValue(fullPath)`
     вместо прямого `fieldResult.state.value`.
- **`@letar/forms-vue` 0.11.0 → 0.12.0, 44 поля (было 43):** табличный wiring
  (`useDataGridField`/`useDataGridTable`/`exportDataGridCsv` — CSV-экспорт, `Blob`+
  `URL.createObjectURL`, чистая функция) в `lib/core/use-data-grid.ts`, разметка колонок —
  в `field-data-grid-impl.ts` (нативные `<input>`/`<table>`, BEM-классы `letar-field__data-grid*`).
- **`@letar/forms-vue-shadcn` 0.12.0 → 0.13.0, 45 полей (было 44):** та же логика из
  `@letar/forms-vue/core`, Tailwind-разметка + `rekaUIKit.Checkbox`/`FieldRoot`/`FieldLabel`/
  `FieldError`, `onErrorCaptured` → `rekaUIKit.ErrorFallback` (тот же паттерн, что у остальных
  полей Этапа 6).
- **Найденное упрощение относительно React-порта:** Vue-реактивные `Set` (`ref(new Set())`)
  поддерживают `.add()`/`.delete()` напрямую — не нужен `new Set(prev).add(x)`, как в React с
  иммутабельным state.
- **Сохранённые beta-упрощения React-версии:** без виртуализации, без resize/drag-reorder
  колонок, `columns` обязателен явно (без auto-резолва из schema), фильтр только текстовый
  contains.
- Тесты — новый файл `app-form.stage6c.spec.ts` в обоих пакетах: рендер после ленивой загрузки,
  сортировка по клику на заголовок, текстовый фильтр, пагинация, инлайн-редактирование ячейки,
  row-selection + bulk-delete, наличие кнопки CSV-экспорта.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах (57/57 тестов каждый).
- **Осталось от Этапа 6 в целом:** `Form.Group`/`Form.Steps` — form-level компоненты (не поля),
  отдельный заход.

**Этап 6 (часть 4, финал) — отчёт (2026-08-13): Form.Group/Form.Steps закрывают Этап 6 целиком в
обоих Vue-пакетах.** Портированы из `libs/forms-react/src/lib/context/form-group.tsx` +
`libs/forms-react/src/lib/steps/*` (хуки) и `libs/forms-shadcn/src/lib/steps/*.tsx` (Tailwind-скин).

- **`Form.Group`** — `libs/forms-vue/src/lib/core/form-group.ts`, `defineComponent` с
  `provide`/`inject` (`InjectionKey<FormGroupContextValue>`), экспортирован из `@letar/forms-vue`
  и из `@letar/forms-vue/core`. `libs/forms-vue-shadcn` не заводит свою версию — одна
  ре-экспорт-строка в `index.ts` из `@letar/forms-vue/core`, по аналогии с React-shadcn.
- **Находка, изменившая план по ходу работы:** ручное вычисление `fullPath` только в
  `create-field.ts`/`create-field-primitives.ts` (двух фабричных функциях) не сработало бы —
  ~56 других field-файлов вызывают `resolveFieldMeta`/`withFieldValidation` напрямую, минуя
  фабрики, и остались бы не в курсе вложенности `FormGroup`. Вместо точечного фикса вызов
  `useFormGroup()` централизован внутри самой `resolveFieldMeta` (`field-wiring.ts`) — она теперь
  возвращает `fullPath` в составе результата. Это свело правку каждого зависимого поля к
  механической замене двух строк (деструктуризация + аргумент `withFieldValidation`). Применено
  к 52 field-файлам в обоих пакетах (плюс вручную к двум фабрикам — 54 файла итого).
  `FieldDataGrid`/`FieldTableEditor` (array-mode поля) сознательно оставлены без учёта
  `FormGroup` — тот же уровень поддержки, что и в React-версии.
- **`Form.Steps`** — композаблы в `libs/forms-vue/src/lib/core/` (`step-types.ts`,
  `use-step-state.ts`, `use-step-navigation.ts`, `use-step-persistence.ts`,
  `form-steps-context.ts`), headless-разметка в `libs/forms-vue/src/lib/fields/form-steps/`
  (`FormSteps`, `FormStepsStep`, `FormStepsIndicator`, `FormStepsNavigation`,
  `FormStepsCompleted`, BEM-классы `letar-form-steps*`), Tailwind-скин в
  `libs/forms-vue-shadcn/src/lib/steps/` поверх тех же композаблов из `@letar/forms-vue/core`.
  Работает поверх собственного form-контекста Vue-пакетов (`useAppFormContext`/`AppForm`), без
  порта `useDeclarativeForm`.
- **Сохранённые beta-упрощения React-shadcn версии:** без интеграции с `Form.When`
  (`hiddenFields`/`segment`), без анимаций перехода (без `framer-motion`), индикатор — нативная
  разметка `<ol>`/`<button>`, не компонент UI-кита.
  - **Находка (Vue проще React здесь):** `setup()` в Vue выполняется один раз на экземпляр
    компонента (не на каждый рендер, как React function component) — в порт хуков не понадобилась
    `useRef`-мимикрия «последнего значения» для защиты замыканий от протухания, которая занимает
    заметную часть их React-реализации.
  - **Находка (Node 25 + jsdom + vitest):** встроенный глобальный `localStorage` в Node 25.2.1
    подменяет собой `window.localStorage` даже в jsdom-окружении заглушкой без `getItem`/
    `setItem`/`clear` (`localStorage === window.localStorage`, но методы `undefined`). В обоих
    Vue-пакетах не было `vitest.setup.ts` — добавлены (с полифиллом на `Map`, скопированным по
    паттерну `libs/forms/vitest.setup.ts`) и подключены через `test.setupFiles` в
    `vitest.config.ts`.
- **`@letar/forms-vue` 0.12.0 → 0.13.0** (без изменения числа полей — `Form.Group`/`Form.Steps`
  не поля). **`@letar/forms-vue-shadcn` 0.13.0 → 0.14.0** (аналогично).
- Тесты — новый файл `app-form.stage6d.spec.ts` в обоих пакетах (8 тестов каждый): вложенный путь
  поля через `FormGroup`, отсутствие регрессии для плоских полей без `FormGroup`, рендер только
  активного шага, блокировка перехода "Далее" невалидным полем, успешный переход при валидном
  поле, нелинейный `goToStep` через `Indicator`, `skipToEnd` → `Form.Steps.Completed`,
  персистенция текущего шага в `localStorage` между перемонтированиями.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

Этап 7 (последний по списку, отправленному QuietRidge) — `form-docs`, детали и статус ведутся в
`apps/form-docs/PLAN.md` (раздел "P7 — переключатели Framework × Skin"), не здесь. Кратко:
Этап 0 (единый источник примеров) и Этап 1 (механизм переключателя, опубликована ось Skin)
закрыты 2026-08-13.

✅ **Этап 2 закрыт (2026-08-13).** Ками решил включить ось раньше — минимум набрался после
закрытия Фазы 9 (61/61). `FrameworkSwitcher` (React ↔ Vue) добавлен рядом со Skin-переключателем;
включено на двух страницах с живым Vue-кодом (`fields/select`, `guides/table-editor`, источник —
`libs/forms-vue-shadcn/demo/examples/*.ts`), везде остальные страницы — Vue-вкладка disabled с
пометкой. Заодно перед включением сделана обязательная визуальная проверка Этапа 1 (пропущенная
при переносе из worktree) — найден и исправлен баг невалидной вложенности `<html>`/`<body>` на
`/demo/*`-страницах. Подробности — `apps/form-docs/PLAN.md` и `CHANGELOG.md` 0.3.0.

**⚠️ Поправка (2026-08-13, forms-dev): предыдущая строка была неверной — Фаза 9 НЕ завершена.**
При попытке взять следующую задачу (Angular-порт, разблокирован по плану после закрытия Фазы 9)
сверила реальный список полей React-скина (`find .../form-fields -iname "field-*.tsx"`,
исключая `*.spec.tsx` и инфраструктурные `field-{error,label,tooltip,wrapper}.tsx`) с тем, что
физически реализовано в `forms-vue`/`forms-vue-shadcn` (`field-*.ts`, минус
`field-utils.ts`/`*-impl.ts`/`document-field-base.ts`). Разошлось: **44 из 61**, не 61/61.
Пропущены целиком 17 полей, ни один этап плана 1-6 их не покрывал:

- **Select-семейство (недобор Этапа 2):** `Combobox`, `Autocomplete`, `Listbox`, `CascadingSelect`,
  `CheckboxCard`, `RadioCard`, `SegmentedGroup`, `ImageChoice`, `Tags` — Этап 2 в письме #196
  обещал «select-family на Reka UI (~9 полей)», реализовано фактически только 3
  (`RadioGroup`/`NativeSelect`/`Switch`, см. отчёт Этапа 2 выше) — остальные 9 из этой группы не
  были учтены при декомпозиции на этапы вовсе.
- **Документы (недобор Этапа 3):** `BirthCertificate`, `ForeignPassport`, `DepartmentCode` — Этап
  3 закрыл 10 из 13 РФ-документных полей, эти три пропущены при составлении списка.
- **Специализированные (не входили ни в один этап):** `Auto`, `Calculated`, `Editable`,
  `PasswordStrength`, `Schedule` — эта категория (`## Специализированные`/`## Опросные` часть
  `docs/fields.md`) не была выделена отдельной группой ни в исходном плане (письмо #196), ни в
  последующих подтверждениях координатора.

**Причина ошибки:** отчёты по каждому этапу проверялись прогоном тестов/типов/линта (всегда
зелёные), но ни разу — полным диффом списка полей против источника истины (`docs/fields.md`/
`list_fields`). «7 этапов, все зелёные» было принято за «7 этапов = все поля», хотя сама
декомпозиция на 7 этапов изначально не покрывала 100% списка.

**Статус:** ✅ Фаза 9 **закрыта** (2026-08-13) — Vue-паритет доведён до реального 61/61 Этапом 8
(отчёт частей 1 и 2 ниже). Решение о доделке принято Ками напрямую (в этой же сессии, без
координатора), координатор подтвердил объём и порядок закрытия отдельным письмом (thread
`forms-vue-parity-phase9`, #209).

**Этап 8 (часть 1) — отчёт (2026-08-13): три документных поля закрыты в обоих Vue-пакетах.**
Из 17 недостающих полей — три документных, недобор Этапа 3 (`docs/fields.md`: `BirthCertificate`/
`ForeignPassport`/`DepartmentCode`).

- **`@letar/forms-vue` 0.13.0 → 0.14.0, 47 полей (было 44):** `FieldForeignPassport`/
  `FieldDepartmentCode` — 1:1 порт через существующую фабрику `createDocumentField` (тот же
  паттерн, что документные поля Этапа 3, нового кода в `core` не потребовалось).
  `FieldBirthCertificate` — БЕЗ маски (MASK_ENGINE.md §7.1, критерий §5.3: римская часть серии
  переменной длины), свободный ввод с нормализацией гомоглифов/разделителей на `blur`, собран
  напрямую через `resolveFieldMeta`/`withFieldValidation`, как `FieldPassword`.
- **`@letar/forms-vue-shadcn` 0.14.0 → 0.15.0, 47 полей (было 44):** тот же набор на Reka-скине,
  `FieldBirthCertificate` — `onErrorCaptured`+`rekaUIKit.ErrorFallback`, тот же паттерн защиты
  рендера, что у остальных custom-полей пакета.
- **Находка при реализации:** `resolveFieldMeta` принимает `placeholder` четвёртым позиционным
  аргументом (обязателен для деструктуризации `label`/`required`/`fullPath` из результата) — забыла
  его в первой версии обоих `FieldBirthCertificate`, поймано `tsgo`, не тестами.
- Тесты — новый файл `app-form.stage8.spec.ts` в обоих пакетах: рендер контролов, нормализация
  гомоглифов на blur, форматирование масками ForeignPassport/DepartmentCode.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

**Этап 8 (часть 2, финал) — отчёт (2026-08-13): оставшиеся 14 полей закрыты в обоих Vue-пакетах.
Фаза 9 закрыта — 61/61.**

- **`@letar/forms-vue` 0.14.0 → 0.15.0, `@letar/forms-vue-shadcn` 0.15.0 → 0.16.0, 61/61 полей
  (было 47) в обоих пакетах.**
- **Select-семейство (9):** `FieldAutocomplete`, `FieldCombobox`, `FieldListbox`,
  `FieldCascadingSelect`, `FieldCheckboxCard`, `FieldRadioCard`, `FieldSegmentedGroup`,
  `FieldImageChoice`, `FieldTags`.
- **Специализированные (5):** `FieldAuto`, `FieldCalculated`, `FieldEditable`,
  `FieldPasswordStrength`, `FieldSchedule`.
- **`FieldCascadingSelect`** — зависимый select (список опций зависит от значения другого поля).
  `@tanstack/vue-form` не даёт прямого Vue-эквивалента React `form.Subscribe` для чтения значения
  постороннего поля с той же эргономикой — собран через `form.useStore(selector)` (Vue-идиоматичный
  реактивный `ref`), логика load/clear/disable-when-empty сохранена 1:1 с React-референсом.
- **`FieldCalculated`** — React-версия портирует `useSyncExternalStore` + `useDebounce`; Vue-версия
  сделана иначе — `form.useStore` + `watch(..., { deep: true })`, без отдельного debounce-хука
  (Vue watcher-и не требуют того же обхода). Не 1:1 порт кода, но 1:1 поведение.
- **`FieldSegmentedGroup` не имел референса в `forms-shadcn`** (только Chakra-оригинал в
  `libs/forms`) — обнаруженный при разборе слепой пятно того же рода, что и пропущенные
  документные поля Этапа 3: поле не попало ни в один из исходных 7 этапов декомпозиции. Портирован
  напрямую на `role="radiogroup"`/`role="radio"` (headless) и Reka-примитивы (skin) по логике
  Chakra-версии.
- **`FieldCombobox` в `forms-vue-shadcn` уже существовал** как незаэкспортированный WIP —
  добавлен экспорт; headless-версия в `forms-vue` написана с нуля по тому же контракту (только
  статичные `options`, фильтрация по подстроке, без асинхронного поиска — тот же скоуп-даунгрейд,
  что у React-референса).
- Новых peer-зависимостей не потребовалось — весь скин поверх уже подключённых `reka-ui`/
  `lucide-vue-next`/`@letar/tailwind-utils`. `FieldCheckboxCard`/`FieldRadioCard` в
  `forms-vue-shadcn` делят новую `lib/utils/card-class.ts` (аналог React `card-class.ts`).
- Тесты — `app-form.stage8-part2.spec.ts` в обоих пакетах (15 + 12 тестов).
- Проверено дважды: реализующим агентом и повторно вызывающей сессией —
  `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn --skip-nx-cache`
  зелёный на обоих пакетах.
- **Сверка по факту реестра (не по памяти/отчёту)** — 61 канонических имени из `form-mcp` →
  `list_fields` сопоставлены с фактическими экспортами `libs/forms-vue/src/index.ts`
  (`grep -oE "\bField[A-Za-z]+\b" | sort -u`), расхождений не осталось. Единственное
  структурное отличие имени — `String` в реестре соответствует Vue-экспорту `FieldInput`
  (решение Этапа 1, не расхождение).
- README обоих пакетов и таблица библиотек (`.claude/rules/libs.md`) обновлены на 61/61,
  устаревшие warning-блоки о неполном порте убраны.

**Фаза 9 полностью закрыта.** Angular-порт (Фаза 10) больше не заблокирован этим условием —
координатор форм уже прислал отдельное задание на Фазу 10 (тонкий пруф-адаптер, см. thread
`forms-angular-proof-phase10`), стартует следующим заходом этой же сессии.

**Этап 5 (часть 1) — отчёт (2026-08-13): PinInput/OTPInput/ColorPicker/FileUpload закрыты в обоих
Vue-пакетах.** Координатор в retired, отчёт сразу в план. Скоуп части ограничен намеренно (не
«слепая реализация всех восьми разом») — 4 поля без тяжёлых внешних peer-dep;
`RichText`/`Address`/`City`/`Signature` — следующая часть Этапа 5.

- **`@letar/forms-vue` 0.6.0 → 0.7.0, 36 полей (было 32):** общий composable `usePinInputField`
  (`libs/forms-vue/src/lib/core/use-pin-input-field.ts`, экспорт через `@letar/forms-vue/core`) —
  обработчики `input`/`keydown`(backspace)/`paste` для N однобуквенных ячеек, переиспользован
  `FieldPinInput` и `FieldOTPInput`, а также обоими полями `forms-vue-shadcn`. Отдельно
  экспортирован чистый хелпер `splitPinChars(value, count)`. `FieldColorPicker` — Vue-идиоматичное
  упрощение: нативный `<input type="color">` вместо Ark UI compound `ColorPicker.Root`
  (area/hue/alpha слайдеры Chakra-версии) — браузерный пикер уже даёт то же самое бесплатно, плюс
  hex-инпут и палитра свотчей. `FieldFileUpload` — нативный `<input type="file">` + drag&drop-зона,
  `processFileWithSecurity` (`@letar/forms-core/security`) переиспользован напрямую без порта
  (framework-agnostic).
- **`@letar/forms-vue-shadcn` 0.7.0 → 0.8.0, 37 полей (было 33):** тот же набор на Reka-скине.
  PIN/OTP — Tailwind-разметка ячеек поверх того же `usePinInputField`. `FieldColorPicker`/
  `FieldFileUpload` не входят в `ImplementedExtendedPrimitives` (`uikit-reka.ts`) — рисуются вне
  UIKit-контракта, тот же принцип, что у `FieldSwitch`/`FieldSlider`/`FieldRating`.
  `onErrorCaptured`+`rekaUIKit.ErrorFallback` — тот же паттерн защиты рендера, что у остальных
  полей пакета.
- **Находка, стоит зафиксировать для будущих полей:** `form.getFieldValue`/`form.setFieldValue` —
  НЕ Vue-реактивный источник. Первая версия `usePinInputField` держала
  `computed(() => splitPinChars(getValue(), count))`, где `getValue` читал `form.getFieldValue` —
  ячейки PIN не обновлялись при вводе (тест ловил пустую строку вместо введённой цифры). Фикс —
  рендерить массив символов из `field.state.value` (реактивный объект, доступный внутри
  `withFieldValidation`'а callback-а), а не из значения, прочитанного через `getValue()`.
  Composable оставляет `getValue()` только для синхронного чтения актуального значения внутри
  самих обработчиков событий — это не завязано на реактивность рендера. Задокументировано прямо в
  коде composable, чтобы не наступить повторно на масках/составных полях следующих этапов.
- Тесты — `app-form.spec.ts` обоих пакетов, блок «Этап 5 (часть 1)»: рендер всех четырёх полей,
  ввод цифры + автопереход фокуса между PIN-ячейками, backspace-навигация (headless), таймер
  повторной отправки OTP, выбор свотча `ColorPicker`, добавление/удаление файла `FileUpload`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах (forms-vue: 30/30 тестов, forms-vue-shadcn: 31/31).

Дальше: Этап 5 (продолжение) — `RichText` (Tiptap, лазy-загрузка по прецеденту Фазы 7.6),
`Signature` (canvas), `Address`/`City` (DaData-провайдер) — следующий заход.

**Этап 4 — отчёт (2026-08-13): дата/число-виджеты, 5 полей закрыты в обоих Vue-пакетах.**

- **Находка на входе в этап, отменяющая часть плана:** предыдущий отчёт предполагал
  предварительное сравнение Vue-библиотек дат (`@vuepic/vue-datepicker` vs `v-calendar`) с
  отчётом координатору до реализации. При чтении исходников React
  (`forms-shadcn/field-date-range.tsx`, `field-datetime-picker.tsx`, `field-duration.tsx`,
  `field-slider.tsx`, `field-rating.tsx`) выяснилось: ни одно из пяти полей группы не использует
  внешнюю библиотеку дат вовсе. `FieldDateRange`/`FieldDateTimePicker` — нативные
  `<input type="date"/"time">`, `FieldDuration` — существующий `NumberInput`,
  `FieldSlider` — Radix/Reka `Slider`-примитив (не датапикер), `FieldRating` — кнопки-звёзды.
  Сравнение библиотек снято с повестки как основанное на неверной посылке (план 2026-08-13 был
  составлен без чтения React-исходников группы) — координатору докладывать нечего, план скорректирован
  по факту, не отложен.
- **`@letar/forms-vue` 0.4.0 → 0.5.0, 31 поле (было 26):** `FieldDateRange` (два `<input
  type="date">` + опциональные кнопки-пресеты, без выпадающего меню — тот же выбор, что у
  React), `FieldDateTimePicker` (`date`+`time` рядом, значение — ISO-строка), `FieldDuration`
  (минуты, форматы `HH:MM`/`minutes`), `FieldSlider` (голый `<input type="range">` — headless
  без UIKit-абстракции), `FieldRating` (кнопки-звёзды на символах `★`/`☆`, без иконки-либы).
- **`@letar/forms-vue-shadcn` 0.5.0 → 0.6.0, 32 поля (было 27):** тот же набор на Reka-скине.
  `FieldDateRange`/`FieldDateTimePicker`/`FieldDuration` — сырой `<input>` в обход
  `rekaUIKit.Input` (тот же приём, что у документных полей Этапа 3) либо существующий
  `NumberInput`-примитив. `FieldSlider` — `reka-ui` `SliderRoot`/`SliderTrack`/`SliderRange`/
  `SliderThumb`, вне UIKit-контракта (нет `Slider` в `UIKitExtendedPrimitives`) — тот же принцип,
  что у `FieldSwitch`. `FieldRating` — иконка `Star` из `lucide-vue-next` (уже peer dependency
  пакета), тоже вне контракта.
- Тесты — `app-form.spec.ts` обоих пакетов, блок «Этап 4»: рендер контролов всех пяти полей,
  клик по пресету `DateRange`, комбинирование даты+времени, сложение часов/минут `Duration`,
  обновление `Slider` (headless — `setValue` на `<input type="range">`; Reka-скин —
  `ArrowRight`-keydown на сфокусированном `SliderThumb`, т.к. `SliderRoot` не нативный input),
  выбор звезды `Rating`.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах, включая прогон после `nx run-many -t format`.

**Этап 4 — дедупликация хелперов (2026-08-13):** три пары чистых функций (без Vue-специфики)
дублировались дословно между `forms-vue` и `forms-vue-shadcn` — `formatDate`/`getPresetRange` +
типы `DateRangeValue`/`DateRangePreset` (`field-date-range.ts`), `parseDateTime`/`combineDateTime`
(`field-datetime-picker.ts`), `minutesToHHMM`/`hhmmToMinutes` (`field-duration.ts`). Вынесены в
новый подпуть `@letar/forms-core/field-widgets` — по аналогии с `forms-core/mask` (Фаза 8) и
`forms-core/validators/ru`. Оба Vue-пакета импортируют хелперы оттуда, типы `DateRangeValue`/
`DateRangePreset` по-прежнему реэкспортируются из `field-date-range.ts` каждого пакета — внешние
импорты не ломаются.

- `@letar/forms-core` 0.6.1 → 0.7.0 (minor — новый публичный экспорт).
- `@letar/forms-vue` 0.5.0 → 0.5.1, `@letar/forms-vue-shadcn` 0.6.0 → 0.6.1 (patch — публичный API
  полей не меняется, только источник внутренних хелперов).
- **React-версии (`forms-shadcn/field-date-range.tsx` и т.д.) намеренно не тронуты.** Там та же
  логика существует, но в другой структуре — типы вынесены в отдельный `./types.ts`, а не собраны
  локально в файле поля. React-пакет стабилен и уже опубликован; выносить и его хелперы в тот же
  подпуть — отдельное решение с более широким blast radius (придётся мигрировать типы через
  `./types.ts`), которое не требовалось для закрытия Vue-дублирования. Если понадобится
  React↔Vue-дедупликация — заводить отдельным пунктом плана, не задним числом к этому отчёту.
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-core,@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный (одно pre-existing предупреждение oxlint в `forms-core/analytics/adapters/umami.ts`, не
  относится к этой правке).

Дальше: `FieldCreditCard` (компаунд, оба пакета, отложен с Этапа 3) → Этап 5 (тяжёлые peer-dep
поля: RichText/Address/City/ColorPicker/PinInput/OTPInput/Signature/FileUpload) → Этап 6
(survey/table: Likert/MatrixChoice/TableEditor/DataGrid, `Form.Group`/`Form.Steps`) — следующий
заход.

**Этап 3 (продолжение) — отчёт (2026-08-13): `FieldCreditCard` закрыт в обоих Vue-пакетах.**
Координатор ушёл в retired между предыдущим отчётом и этим — согласовывать не с кем, отчёт сразу
сюда.

- **Новый общий composable `useCreditCardField`** (`libs/forms-vue/src/lib/core/use-credit-card-field.ts`,
  экспорт через `@letar/forms-vue/core`) — вся логика (форматирование номера/срока/CVC, Luhn,
  автопереход фокуса `expiry`→`cvc`) в одном месте, переиспользуется `forms-vue-shadcn` без
  дублирования — тот же принцип, что `useMaskField` (Этап 3, основной заход). Поле не участвует в
  Zod-валидации через `withFieldValidation` (это составной виджет с тремя subfields, не одиночное
  schema-поле) — пишет напрямую через `form.setFieldValue`, как и обе React-версии.
- **`cardBrandIcon`** (тот же подпуть `core`) — Vue-порт `card-brand-icon.tsx` (Visa/Mastercard/
  Amex/МИР inline SVG, `h()` вместо JSX, разметка 1:1). Общий для обоих скинов — чистая
  презентация без формы, ESLint-барьер `core/**` этому не мешает (запрещён только импорт из
  `fields/**` внутрь `core/**`, не наоборот).
- **`@letar/forms-vue` 0.5.1 → 0.6.0, 32 поля (было 31):** `FieldCreditCard` — референсная
  HTML-разметка без UIKit-абстракции, как у остальных полей headless-пакета.
- **`@letar/forms-vue-shadcn` 0.6.1 → 0.7.0, 33 поля (было 32):** `FieldCreditCard` — Tailwind-
  разметка на голых `<input>` (мульти-part виджет не укладывается в `UIKitInputProps`, тот же
  приём, что у документных полей), `onErrorCaptured`+`rekaUIKit.ErrorFallback` для защиты рендера.
- **Находка при написании теста:** `formatExpiry('02')` (движок масок, mask `'99/99'`) отдаёт
  `'02'`, не `'02/'` — литерал-разделитель не дорисовывается, пока не подтверждён следующей
  цифрой (см. комментарий в `libs/forms-core/src/lib/mask/parts.ts:61`, «дорисовывается» — нет).
  Не баг, ожидаемое поведение движка (тот же принцип у обычных масок с телефоном/документами);
  первая версия теста ошибочно предполагала автодорисовку — поймано прогоном, не задокументировано
  отдельно, т.к. поведение уже описано в самом коде движка.
- Тесты — `app-form.spec.ts` обоих пакетов, блок «Этап 3 (продолжение)»: форматирование номера +
  определение бренда по номеру, Luhn-валидация на blur, smart month (`2` → `02`) + автопереход
  фокуса к CVC при заполнении срока, ограничение длины CVC по бренду (3 цифры для Visa).
- Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-vue,@letar/forms-vue-shadcn`
  зелёный на обоих пакетах.

Дальше: Этап 5 (тяжёлые peer-dep поля: RichText/Address/City/ColorPicker/PinInput/OTPInput/
Signature/FileUpload) — следующий заход.

---

## ✅ [2026-08-12] `useFormPersistence` — `excludeFields` для чувствительных полей + документация — закрыто

Задача QuietRidge (письмо #166, тред `form-feature-request`): у `useFormPersistence`
(`libs/forms/src/lib/declarative/form-persistence.tsx`) не было способа исключить поля из
снимка localStorage — недопустимо для паролей/номеров карт/CVV/срока действия. Плюс хук вообще
не был задокументирован в `libs/forms/README.md` — только JSDoc в файле, на практике не
подключался, потому что про него не вспоминали.

Реализовано: `FormPersistenceConfig.excludeFields?: string[]`, `saveValues` вычищает эти ключи
перед сериализацией (shallow omit), при восстановлении исключённые поля просто отсутствуют в
`savedData`. Тип пробрасывается автоматически через `<Form persistence={{...}}>` — правок в
`form-types.ts`/`use-form-features.ts` не потребовалось. Задокументировано в трёх местах:
`docs/form-level.md` (полное описание опции), `libs/forms/README.md` (новый раздел «Черновики
форм», как явно просила QuietRidge), `.claude/docs/forms.md` (по прямому запросу Ками в этом же
заходе). Версия `2.3.1` → `2.4.0`. Тесты — 2 новых в `form-persistence.spec.tsx` (не пишет
excludeFields в снимок; при восстановлении отсутствуют в `savedData`), `nx test forms` зелёный.

## ✅ [2026-08-11] `lazy()`-изоляция тяжёлых peer-deps четырёх полей — закрыто

По аудиту QuietRidge (тред `forms-phase7-3-shadcn`, письмо #33): `FieldRichText`, `FieldMaskedInput`,
`Form.Document.*` (`createDocumentField`) и `FieldDataGrid`/`FieldTableEditor` резолвили тяжёлые
peer-deps (`@tiptap/*`, `use-mask-input`, `@tanstack/react-table`+`react-virtual`) для ЛЮБОГО
потребителя соответствующего барreла — не только тех, кто реально использует эти поля. Применён
паттерн `Form.Captcha` (`lazy()` + dynamic `import()`) в `@letar/forms` (2.0.3) и
`@letar/forms-shadcn` (0.18.1, только `FieldRichText` — остальные три поля там ещё не портированы).
Публичный API не изменился. Детали — CHANGELOG обоих пакетов.

## Backlog (запросы от агентов)

### [2026-08-13] Angular-порт — третий фреймворк экосистемы

**Статус обновлён 2026-08-13 (тот же день): разворот.** Ками напрямую попросил не ждать
закрытия Фазы 9 — начать сейчас, но минимально: тонкий пруф-адаптер на ~10 простых полях,
тот же паттерн, что был у `forms-vue` в Фазе 7.8, до расширения до полного порта в Фазе 9.
Задача отправлена forms-dev (письмо #210, тред `forms-angular-proof-phase10`): новый пакет
`@letar/forms-angular`, headless, без skin, без демо/доков — только доказать, что граница
`forms-core` держится на третьем фреймворке. Приоритет относительно Этапа 8 (Vue) — на
усмотрение forms-dev, обе задачи открыты параллельно. Раздел ниже — исходное рассуждение
«почему не сейчас», уже не действующее как блокер, оставлено для истории решения.

- **Запросил:** Ками напрямую (через координатора), тред обсуждения — этот же разговор, не
  agent-mail.
- **Приоритет:** low — намеренно после Фазы 9, не параллельно ей.
- **Цель:** охват всех трёх крупных фронтенд-лагерей (React/Vue/Angular) как часть той же
  стратегии охвата OSS, что и Vue-порт ([[project_forms_distribution]]) — не заказ конкретного
  приложения-потребителя, `@letar/forms` внутри монорепо остаётся только на React.
- **Почему не сейчас:** Angular-разработчики по умолчанию ожидают Reactive Forms/сигналы, а не
  headless-библиотеку поверх стороннего стейт-менеджера — рынок для headless-подхода там уже
  сложился иначе, чем в React/Vue. Смысла запускать порт есть, но с более высокой ценой входа,
  чем был у Vue; начинать до того как устоится паттерн `forms-core` + два готовых скина (React,
  Vue) — рискованно дублировать архитектурные решения, которые ещё могут измениться в ходе
  Фазы 9.
- **Статус:** ✅ пруф закрыт (2026-08-13) — см. отчёт ниже.

**Финальное решение по последовательности (2026-08-13, тот же день, разговор с Ками):** пруф на
10 полях сделан, добавляется в form-docs третьей опцией переключателя (Этап 3, тред
`form-docs-p7-etap3-angular-framework`). **Полный порт до 61/61 подтверждён как следующий шаг**
— Ками сначала хочет посмотреть на пруф в доках, затем даёт добро на расширение тем же путём,
что прошёл Vue (Фаза 7.8 → Фаза 9). Скин Angular Material поверх headless-ядра — отдельная
задача **после** полного порта, не раньше (скинить 10 полей бессмысленно). **Не начинать полный
порт сам по себе** — ждать явного подтверждения «посмотрел, давай дальше» от Ками, не по
умолчанию сразу после деплоя доков.

✅ **Этап 3 закрыт (2026-08-13/14).** `FrameworkSwitcher` в `form-docs` расширен до трёх опций
(React/Vue/Angular); живой пример — `fields/number`, новый файл
`libs/forms-angular/demo/examples/number-demo.ts`. Детали и верификация — в
`apps/form-docs/PLAN.md` (запись «✅ Этап 3») и `apps/form-docs/CHANGELOG.md` (0.4.0). Деплой —
через `QuietRidge`/`BlackCove`, не отсюда.

## Фаза 10: `@letar/forms-angular` — разведочный пруф ✅ закрыт [2026-08-13]

Новый пакет `libs/forms-angular/` (`version 0.1.0`), headless, без skin/демо/доков. Пруф
подтверждён: `forms-core` не потребовал ни одной правки под третий фреймворк.

- **10 полей закрыто** (зеркало Этапа 1 Vue-порта): String, Textarea, Number, Password,
  Checkbox, Switch, RadioGroup, NativeSelect, Date, YesNo.
- **`getFieldMeta`/`unwrapSchema`** (`@letar/forms-core/schema`) читаются напрямую в
  `field-meta.ts` — тот же контракт, что у React/Vue, без адаптации ядра.
- **Валидатор** — нативный Angular `ValidatorFn` поверх `schema.safeParse()` (`zod-validator.ts`),
  подключается как обычный validator `FormControl`. Осознанно **не** через `@tanstack/angular-form`
  (хотя пакет существует) — задача была доказать границу именно на нативных Angular-примитивах
  (Reactive Forms + signals), не повторить паттерн TanStack-семейства в третий раз.
- **`FormRootService`** (Angular DI, `providers` не `viewProviders` — иначе не виден
  content-projected полям) — эквивалент Vue `provide`/`inject` контекста формы.
- **Реактивность — signals без Zone.js**, `provideZonelessChangeDetection()` (Angular 20+),
  `zone.js` не в зависимостях.
- **Peer/dev-deps:** `@angular/core`/`@angular/common`/`@angular/forms` `^22.0.0` (peer) +
  `@angular/compiler`/`@angular/platform-browser`/`@angular/platform-browser-dynamic` (dev,
  `22.1.2`), `zod ^4.0.0`.

**Находки для будущего расширения (если решим идти дальше пруфа):**

1. **Сигнальные `input()`/`output()` не резолвятся в JIT** на границе компонента, потребляемого
   другим standalone-компонентом через property binding (`NG0303`) — используются legacy
   `@Input()`/`@Output()`-декораторы. Расширение до полного порта потребует либо остаться на
   legacy API, либо подключить `@angular/compiler-cli`/полноценный AOT-билд.
2. **Тестирование Angular через Vitest (не Karma) работает** —
   `provideZonelessChangeDetection()` + `TestBed` + Vitest + jsdom, 10/10 тестов зелёных. Два
   технических нюанса: (а) Angular-декораторы нельзя объявлять инлайн в `*.spec.ts` (Vitest 4
   транформирует спеки отдельным путём без поддержки decorator-синтаксиса) — только в обычных
   `.ts`-хостах (`src/lib/testing/stage{1,2}-host.component.ts`); (б) Vite 8 использует `oxc` по
   умолчанию — публичного эквивалента `experimentalDecorators` там нет, `vitest.config.ts`
   форсирует `esbuild` (`oxc: false`) с `tsconfigRaw.experimentalDecorators`.
3. Нет вложенности `FormGroup` (только плоские поля), нет skin — осознанно вне скоупа разведки.

Проверено: `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular --skip-nx-cache`
зелёный (реализующим агентом и повторно вызывающей сессией).

**Решение, требующее координатора/Ками:** расширять ли `forms-angular` до полного порта (как
случилось с Vue после Фазы 7.8) или оставить пруфом — не принято в этой сессии, ждёт ответа.

## Фаза 11: `@letar/forms-angular` — полный порт до 61/61, тем же путём что Vue (Фаза 9)

Решение принято: расширяем `forms-angular` до полного порта (Фаза 9 Vue — образец). Идёт
поэтапно, зеркалом уже закрытых Vue-этапов.

### Stage A: +7 полей (NumberInput, Currency, Percentage, Slider, Rating, Hidden, Time) — done [2026-08-14]

Первый этап полного порта — 7 самых простых полей сверх уже закрытых 10 (Этап 1–2). Портированы
как UI-обвязка поверх `@letar/forms-core` (без единой правки в самом ядре), контракт пропсов
1:1 с Vue-версией (`libs/forms-vue/src/lib/fields/field-{number-input,currency,percentage,slider,
rating,hidden,time}.ts`):

- `FieldNumberInputComponent` (`min`/`max`/`step`), `FieldCurrencyComponent` (`currency`/`min`/
  `max`/`step`), `FieldPercentageComponent` (`min`/`max`/`step` с дефолтами 0/100/1) — обычные
  `[formControl]`-обёртки над `<input type="number">`, тот же паттерн, что `FieldNumberComponent`.
- `FieldSliderComponent`/`FieldRatingComponent` — оба заводят собственный `signal` (`sliderValue`/
  `ratingValue`), подписанный на `ctrl.events`: приложение zoneless
  (`provideZonelessChangeDetection()`), а `FormControl.value` сам по себе не реактивен для
  шаблона — без явной подписки интерполяция значения не обновлялась бы после первого рендера.
  Тот же приём, что `FieldBase` уже применяет для `hasError`/`errorMessage`.
- `FieldHiddenComponent` — не рендерит DOM (`template: ''`), значение `@Input() value`
  применяется к контролу через `effect()` один раз при первом появлении `control()` — то же
  принятое ограничение нереактивности `@Input()` после монтирования, что документировано для
  `name`/`label`/`placeholder` в `FieldBase`.
- `FieldTimeComponent` — `<input type="time">`, зеркало `FieldNumberComponent`.

Текущий счёт: **17/61** (10 из Этапа 1–2 + 7 Stage A). Тесты — `app-form.stage-a.spec.ts`
(host-компонент `testing/stage-a-host.component.ts`, тот же приём выноса `@Component` из
`*.spec.ts`, что у stage1/stage2). `nx run-many -t lint typecheck:tsgo test
--projects=@letar/forms-angular` зелёный.

### Stage B: +11 документных полей РФ (движок масок) — done [2026-08-14]

Второй, архитектурно самый сложный этап: INN, BIK, OGRN, SNILS, KPP, Passport, BankAccount,
CorrAccount, ForeignPassport, DepartmentCode, BirthCertificate. Портированы с зеркалом Vue-версии
(`libs/forms-vue/src/lib/fields/field-{inn,bik,ogrn,snils,kpp,passport,bank-account,
foreign-passport,department-code,birth-certificate}.ts` + `document-field-base.ts`), контрольные
суммы — `@letar/forms-core/validators/ru` напрямую (`validateInn10/12`, `validateBik`,
`validateOgrn`, `validateSnils`, `validateKpp`, `validateForeignPassport`,
`validateDepartmentCode`, `validateBirthCertificate`/`normalizeBirthCertificate`).

Ключевое архитектурное решение — `DocumentFieldBase` (`src/lib/core/document-field-base.ts`),
abstract-класс для 10 из 11 полей (не `BirthCertificate` — у него нет структурной маски, тот же
выбор что в Vue). Angular не может, в отличие от Vue, писать поля как функциональную фабрику
компонента (`createDocumentField(config)`) — `@Component` обязан висеть на классе, поэтому конфиг
Vue распался на `abstract readonly mask` + `readonly formatMode` (`'live'`/`'off'`) +
`readonly maxLength` + `@Input() override placeholder` (свой default в каждом из 10 тонких
наследников) + `abstract validateDocument()`. Общая разметка — не копия в 10 файлах, а одна
константа `DOCUMENT_FIELD_TEMPLATE`, подставляемая в `template:` каждого наследника.

Второе решение, отличающее эти поля от всех остальных `Field*` в пакете: шаблон **не** биндит
`[formControl]="ctrl"`. `FormControlDirective` (`ControlValueAccessor`) записывала бы в контрол
ровно то, что видно в `<input>.value` — то есть отформатированную строку, а не raw, что сломало
бы инвариант «в `FormControl`/Zod-схему уходит unformatted значение» (тот же приём, что в Vue
`use-mask-field.ts`: `'live'`-режим рендерит `<input>` без `value`/`onInput`, источник истины —
DOM, `MaskController` пишет туда напрямую через `setRangeText` и сам вызывает `ctrl.setValue(raw)`
в колбэке `onChange`). Вместо `ControlValueAccessor` — `@ViewChild('inputEl')` + ручной
`attach()`/`detach()` контроллера в `ngAfterViewInit`/`ngOnDestroy`.

Третье: двойной источник ошибки. `hasError`/`errorMessage` базового `FieldBase` валидируют
против Zod-подсхемы, которую подставило приложение-потребитель (может быть простым `z.string()`,
без `zRu.inn()`). Контрольная сумма документа не должна зависеть от того, что написал потребитель
в своей схеме (defence-in-depth, тот же принцип, что у `config.validate` в Vue/React-скинах) —
поэтому `documentErrorMessage` (свой сигнал, пересчитывается на `ctrl.valueChanges`) и
`hasDocumentError`/`displayErrorMessage`, приоритет над ошибкой из Zod, 1-в-1 порядок
`showError = hasError || !!customError` из Vue-версии.

Текущий счёт: **28/61** (17 из Этапа 1–2 + Stage A + 11 Stage B). Тесты —
`app-form.stage-b.spec.ts` (17 тестов: рендер всех 11 полей, маска группирует ввод у СНИЛС/
паспорта/кода подразделения, контрольная сумма валидная/невалидная у ИНН/БИК/ОГРН/СНИЛС,
формат-проверки у КПП/загранпаспорта/расчётного и корр. счетов, нормализация свидетельства о
рождении на blur), host-компонент `testing/stage-b-host.component.ts`. `nx run-many -t lint
typecheck:tsgo test --projects=@letar/forms-angular` зелёный, `nx format` (dprint) применён.

### Stage C: +1 поле (Phone) — done [2026-08-14]

Третий этап — одно поле, `FieldPhoneComponent`. Отличается от всех Stage A/B полей: форматирует
через чистый JS-форматтер `@letar/forms-core/phone` (`formatPhoneNumber`/`stripPhoneNumber`), не
через движок масок (`MaskController`) — единственное «масочное» поле во всех трёх скинах
(React/Vue/Angular), которое обходит движок сознательно: `MaskController` заполняет слоты
посимвольно и не может ретроактивно распознать междугородний trunk-префикс (ведущая `8` в РФ),
см. комментарий в `libs/forms-core/src/lib/phone/format-phone.ts`. Вместо этого — пересчёт всей
строки на каждый `input` (controlled `onChange`, тот же приём, что в React/Vue).

`[formControl]` не используется — тот же выбор, что у `DocumentFieldBase` (Stage B): в `<input>`
отображается форматированное значение, в `FormControl` — то, что диктует `autoUnmask`. Но, в
отличие от `DocumentFieldBase` (там `FormControl` всегда получает raw), контракт `autoUnmask`
здесь 1-в-1 с Vue/React (`libs/forms-vue/src/lib/fields/field-phone.ts`,
`libs/forms-shadcn/src/lib/fields/field-phone.tsx`): `false` (default) — `FormControl` хранит
форматированную строку (совпадает с `<input>.value`); `true` — только цифры
(`stripPhoneNumber(formatted)`, включая код страны, вшитый в маску литералом — `autoUnmask` не
гоняет значение через `normalizePhoneDigits` повторно). Сознательное расхождение с
`DocumentFieldBase`: Phone обязан остаться совместимым с уже задокументированным Vue/React API
(`forms-vue/README.md`), на который ориентируются потребители, портирующие форму между скинами.

Текущий счёт: **29/61** (17 из Этапа 1–2 + Stage A + Stage B + Stage C). Тесты —
`app-form.stage-c.spec.ts` (5 тестов: рендер `input[type="tel"]`, форматирование в DOM,
`autoUnmask: false` → `FormControl` хранит форматированную строку, `autoUnmask: true` →
`FormControl` хранит raw-цифры, снятие trunk-префикса), host-компонент
`testing/stage-c-host.component.ts`. `nx run-many -t lint typecheck:tsgo test
--projects=@letar/forms-angular` зелёный, `nx format` (dprint) — без изменений.

### Stage D: +4 поля с составным значением (DateRange, DateTimePicker, Duration, Schedule) — done [2026-08-14]

Четвёртый этап — первые поля Angular-порта со значением-объектом, а не примитивом. Зеркало
`libs/forms-vue/src/lib/fields/field-{date-range,datetime-picker,duration,schedule}.ts`, утилиты
переиспользованы напрямую из `@letar/forms-core/field-widgets` (`getPresetRange`,
`DATE_RANGE_PRESET_LABELS`, `combineDateTime`/`parseDateTime`, `hhmmToMinutes`/`minutesToHHMM`) —
без единой правки в `forms-core`.

Ключевое архитектурное решение: `FieldBase.control` уже даёт **один** `FormControl` на всё
значение поля, независимо от того, примитив это или составной объект (`{start,end}` у DateRange,
`WeeklySchedule` у Schedule) — Stage D не потребовал никакого нового механизма вроде вложенного
`FormGroup`, просто использует существующий контракт буквально. Все четыре компонента НЕ вешают
`[formControl]="ctrl"` ни на один из своих под-инпутов (у каждого своя часть составного значения,
`FormControlDirective` этого не различает) — вместо этого собственный `signal`, синхронизируемый
через `effect()` + `ctrl.events.subscribe()` (тот же приём, что `FieldRatingComponent`/
`FieldSliderComponent`, Stage A: приложение zoneless, `FormControl.value` сам по себе не
реактивен для шаблона), и ручные `ctrl.setValue()`/`ctrl.markAsTouched()` по
`input`/`change`/`click`.

`FieldScheduleComponent` — самое сложное поле пакета целиком (toggle дня, время open/close,
копирование понедельника на будни, предупреждение `close > open`). Типы
`WeeklySchedule`/`ScheduleDaySchedule`/`DayOfWeek` и константы (порядок дней, русские названия,
дефолтный рабочий график) — портированы локально в файл компонента, не вынесены в `forms-core`:
тот же выбор, что и в Vue-версии, они специфичны скину, а не ядру. `<input type="checkbox"
role="switch">` вместо отдельного примитива — тот же приём, что у headless `FieldSwitchComponent`
(Этап 1–2).

Текущий счёт: **33/61** (29 из Этапа 1–2 + Stage A/B/C + Stage D). Тесты —
`app-form.stage-d.spec.ts` (9 тестов: DateRange — сборка `{start,end}` из двух инпутов и клик по
пресету, DateTimePicker — комбинирование date+time в ISO-строку, Duration — пересчёт часы+минуты
→ суммарные минуты и Zod-валидация `min`, Schedule — рендер 7 дней, выключение дня даёт `null` в
контроле, копирование понедельника на будни), host-компонент `testing/stage-d-host.component.ts`.
`nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный.

### [2026-08-11] tsup роняет `'use client'` в lazy-чанках (forms + forms-shadcn) — не чинить без сигнала

- **Запросил:** forms-dev (найдено при publish-prep `forms-shadcn`, письмо #49)
- **Приоритет:** low — вероятно безвредно, не подтверждённая проблема
- **Описание:** tsup выбрасывает директиву `'use client'` из собранных lazy-чанков
  (`field-rich-text-impl.js`, `field-data-grid-impl.js` и т.п.) с предупреждением "Module level
  directives cause errors when bundled". Не новое и не специфичное для `forms-shadcn` — `dist/*.js`
  уже опубликованного `@letar/forms` страдает тем же. Скорее всего безвредно: директива нужна на
  границе клиент/сервер, а `React.lazy`+`import()` внутри поля срабатывает уже из клиентского
  поддерева (обёртка поля directive сохраняет) — новую границу чанк не создаёт.
- **Статус:** backlog, не назначено. Не чинить проактивно — ждать реального репорта от Next.js
  App Router потребителя (пока такого не было ни у одного из ~20 приложений на `@letar/forms`).

### [2026-08-11] Рассинхрон источников истины по числу полей: form-mcp/docs/fields.md (49) vs реальность (56)

- **Запросил:** forms-dev (найдено при докрутке `forms-shadcn` до release-ready, тред
  `forms-phase7-3-shadcn`, письмо #45)
- **Приоритет:** medium — вводит в заблуждение внешних потребителей и AI-агентов, но не блокирует
  разработку
- **Описание:** `mcp__form-mcp__list_fields` и `libs/forms/docs/fields.md` отдают **49** полей —
  без `FieldCity` и всех 7 document-полей (`FieldInn`/`Kpp`/`Ogrn`/`Snils`/`Passport`/`Bik`/
  `BankAccount`). Реальный подсчёт по файлам `src/lib/declarative/form-fields/**/field-*.tsx`
  (минус инфраструктурные error/label/tooltip/wrapper/type-mapper) даёт **56** — с City и
  document-полями. `form-mcp` — авторитетный источник именно для AI-ассистентов (`list_fields`
  используется во всех формах согласно `.claude/rules/forms.md`), так что расхождение реально
  вводит в заблуждение агентов, не только людей.
- **Не в зоне резервации forms-dev по forms-shadcn** — `file_reservation_paths` не включает
  `libs/form-mcp`. Нужна отдельная резервация на `libs/form-mcp` + `libs/forms/docs/fields.md`.
- **Статус:** ✅ уже закрыто раньше, чем назначено повторно (2026-08-12, forms-dev). Письмо #70
  координатора (тред `forms-form-mcp-field-count-sync`) переоткрывало этот же пункт бэклога, но
  фикс уже был сделан в Фазе 7.6 (см. запись «7.6 `llms.txt` + усиление MCP» ниже, `form-mcp`
  v1.0.3): `CATEGORY_MAP` чинил именно рассинхрон заголовков, из-за которого пропадала вся секция
  документных полей, плюс добавлена ранее недокументированная `FieldCity`. Проверено заново
  2026-08-12 через живые вызовы `list_fields`/`get_field_props`/`get_field_example` — все 57
  полей на месте, включая `City` и 7 `Document.*`. Ответ координатору — письмо #73.

### [2026-08-11] Свой mask-движок вместо use-mask-input — ✅ закрыто Фазой 8

**Поправка (2026-08-13, forms-dev):** этот пункт бэклога устарел — написан до реализации, не
обновлён после. Работа полностью сделана в [«Фаза 8: Собственный mask-движок ✅ закрыта
2026-08-12»](#фаза-8-собственный-mask-движок--закрыта-2026-08-12) (реализация, доки, MCP, демо —
всё закрыто, `forms-core/mask` уже используется во всех масочных полях React- и Vue-скинов, см.
отчёт Этапа 3 Фазы 9 выше). Ниже — оригинальный текст запроса, оставлен для истории.

- **Запросил:** Ками (через QuietRidge)
- **Приоритет:** medium — после задачи `lazy()`-изоляции тяжёлых полей (не блокирует её)
- **Контекст:** `use-mask-input` (обёртка над Inputmask.js) — тяжёлая зависимость, уже один раз
  давшая WebKit-баг (мутация DOM в обход React), из-за которого её выпилили из `FieldPhone` и
  заменили на свой форматтер `formatPhoneNumber` (`forms-core/phone`). Та же библиотека сейчас
  используется в 9 местах: `FieldMaskedInput`, generic zod-meta тип `'maskedInput'`
  (`field-type-mapper.tsx`), и 7 document-полей (`FieldInn`/`Kpp`/`Ogrn`/`Snils`/`Passport`/`Bik`/
  `BankAccount`, все через `document-field-base.tsx`). Именно поэтому `forms-shadcn` сознательно
  пропустила `MaskedInput`/`CreditCard` при портировании — тащить `use-mask-input` в новый скин с
  той же WebKit-историей не хотелось.
- **⚠️ Формат работы — НЕ обычная задача форм-дева с ходу.** Ками прямо сказал: нужна отдельная
  **исследовательская сессия**, а не сразу реализация. Библиотечное решение, продуманное, с
  разбором разных кейсов (не только 7 российских документов + generic maskedInput — заложить
  расширяемость на будущее). Сессия должна:
  1. Найти актуальные боли существующих mask-библиотек (Inputmask.js, imask, react-input-mask,
     их issue-трекеры) — что именно ломается у них в проде (курсор, paste, backspace через
     литералы, IME/мобильная клавиатура, controlled-value конфликты типа WebKit-бага, который
     уже поймали на `FieldPhone`).
  2. Найти best practice современных решений (что делают библиотеки нового поколения, если такие
     есть, какие паттерны API/архитектуры признаны удачными).
  3. Только после этого — предложить архитектуру своего движка (framework-free, в `forms-core`,
     по аналогии с уже проверенным `formatPhoneNumber`).
  4. **Ками лично контролирует качество и возможности** — не автономная реализация как остальные
     56 полей, решение по объёму/API согласовывается с ним до и во время работы, не постфактум
     в отчёте.
- **Статус:** ✅ **исследование проведено 2026-08-12** (Ками инициировал сессию лично), **и сама
  реализация закрыта тем же днём Фазой 8** (см. поправку 2026-08-13 в заголовке этого пункта —
  ниже описан только этап исследования, реализацию искать в разделе «Фаза 8»). Результат
  исследования — [MASK_ENGINE.md](./MASK_ENGINE.md): боли существующих библиотек с цитатами
  мейнтейнеров, разбор архитектуры современных решений, UX/a11y-доказательная база, предложенная
  архитектура.
  - **Готовое брать не во что:** `imask` без коммитов с октября 2024, `react-input-mask` мёртв
    с 2018, у `Inputmask` 645 открытых issue (баги 2015–2020), `use-mask-input` — обёртка над
    последним. Мейнтейнеры всех трёх написали, что чинить не будут: undo — «probably this never
    be fixed», Android — «There is no way to prevent or control the input», paste — «I do not
    think this can be fixed correctly».
  - **Замер веса:** `use-mask-input` = 91.3 KB raw / **25.5 KB brotli** — больше, чем весь
    `@letar/forms` с 56 полями (109 KB raw / 20 KB brotli).
  - **Замер использования:** `FieldMaskedInput` и `Form.Document.*` — **ноль** продуктовых
    применений (только 4 демо/доковых страницы), а `Field.Phone` на собственном форматтере — 30
    файлов приложений. Обратную совместимость блюсти не перед кем.
  - ⚠️ **Найден баг с потерей данных в проде** (не в чужой библиотеке, в нашем
    `formatPhoneNumber`): ввод `89185568172` (привычный формат с восьмёрки) даёт
    `+7 (891) 855-68-17` вместо `+7 (918) 556-81-72` — восьмёрка уходит в номер, последняя цифра
    молча теряется, маска при этом выглядит заполненной. Воспроизведено в Chrome 148 на
    `form-develop-app`. Чинится отдельно от движка, см. запись ниже.
  - **Продуктовый вывод:** маска уместна только при фиксированной длине и канонических
    разделителях. **ИНН (10 или 12 цифр, без разделителей) маскировать не нужно** — только
    ограничение длины и валидация контрольной суммы. СНИЛС/паспорт/ОГРН/БИК — подходят.
  - **Решения владельца (2026-08-12):** дефолтный режим — `'live'` (не `'blur'`, вопреки
    рекомендации исследования); undo — свой стек состояний; API `MaskedInputFieldProps`
    проектируется заново без наследия imask. Подробности и следствия — MASK_ENGINE.md §8.

### [2026-08-12] `formatPhoneNumber` теряет цифру при вводе номера с `8`

- **Найдено:** forms-dev, при исследовательской сессии по mask-движку (см. запись выше)
- **Приоритет:** high — молчаливое искажение данных пользователя в проде, 30 файлов приложений
- **Описание:** `formatPhoneNumber` (`@letar/forms-core/phone`) отбрасывает ведущую `7` через
  эвристику `leadingLiteralDigits`, но не знает про российский междугородний префикс `8`. Ввод
  `89185568172` → `+7 (891) 855-68-17` (правильно `+7 (918) 556-81-72`): восьмёрка занимает
  первую позицию кода региона, последняя цифра отбрасывается. Ошибки не показывается, маска
  выглядит полностью заполненной — пользователь не может заметить подмену. Затрагивает и
  Chakra-, и shadcn-скин (общий форматтер).
- **Статус:** ✅ **исправлено 2026-08-12** — `@letar/forms` 2.0.4, `@letar/forms-core` 0.2.1,
  `@letar/forms-shadcn` 0.31.1 (скин правок не потребовал, форматтер общий).
  - Междугородний префикс снимается по таблице `TRUNK_PREFIXES` (`'7' → '8'`, РФ + Казахстан)
    и **только при переполнении маски**, а не по первой цифре — иначе ломались бы коды регионов,
    сами начинающиеся с восьмёрки (812 СПб, 843 Казань, 861 Краснодар, 8482 Тольятти).
  - TDD: 7 новых тестов (4 падали до фикса), включая регресс-защиту на питерский номер и на
    страну без trunk-префикса. `forms-core` 395/395, `FieldPhone` 11/11 и 4/4 в скинах.
  - Проверено в браузере: `89185568172` → `+7 (918) 556-81-72`, `8123456789` → `+7 (812) 345-67-89`.
  - ⚠️ Остался хвост: при **посимвольном** вводе группировка становится окончательной только на
    последней цифре (до этого пользователь видит `+7 (891) 855-68-1…`). Отличить префикс от кода
    региона раньше невозможно в принципе — только по общему числу цифр. При вставке из буфера
    и автозаполнении работает сразу. Полноценное решение — препроцессоры вставки/автозаполнения
    в будущем mask-движке (MASK_ENGINE.md §7.2).

### [2026-08-09] Checkbox: клик по label/тексту не переключает состояние (от svoichuzhie)

- **Запросил:** SunnyTower
- **Приоритет:** high
- **Описание:** `FieldCheckbox` (`src/lib/declarative/form-fields/boolean/field-checkbox.tsx`)
  рендерит Chakra v3 `Checkbox.Root` как `<label data-part="root">` вокруг скрытого `<input>` +
  `<div data-part="control">` (визуальный квадратик) + `<span data-part="label">` (текст). Клик
  по `<label>` целиком — включая клик прямо по тексту рядом с чекбоксом — **не переключает
  checked-состояние вообще**. Работает только клик именно по `[data-part="control"]` (или
  напрямую по `<input>` с `force`). Реальный пользователь, кликающий интуитивно по тексту
  (стандартное ожидание для `<label>`), не сможет отметить чекбокс. Не гонка/timing —
  воспроизведено детерминированно через Playwright trace (0 успехов из множества попыток за
  15с). Похоже, Zag.js checkbox-машина (через Ark UI) вешает обработчик клика конкретно на
  `control`, не на `root`/`label`, и не полагается на нативное browser-поведение label→input
  forwarding. Найдено на `svoichuzhie` (`03-subscription.spec.ts`, форма подписки в footer) —
  деплой был заблокирован e2e-гейтом, диагностика через `trace.zip` на staging (BlackCove,
  Deploy Agent). Обход на уровне теста — клик по `[data-part="control"]` вместо `label`
  (`apps/svoichuzhie-e2e/src/03-subscription.spec.ts`, коммит `241802c9`) — но сам компонент
  остаётся сломан для живых пользователей во всех приложениях на `@letar/forms` `Field.Checkbox`.
- **Статус:** ✅ расследовано 2026-08-09 (forms-dev) — **не баг `FieldCheckbox`**, закрыто без
  изменений в `libs/forms`. Реальная причина найдена и подтверждена и в jsdom (RTL/vitest), и в
  реальном Chromium (Claude Browser pane, dev-сервер svoichuzhie на месте):
  - Плоский текстовый `Form.Field.Checkbox` (без вложенных элементов в `label`) переключается
    штатно кликом в ЛЮБУЮ точку `<label>`, включая текст — воспроизведено юнит-тестом
    (`userEvent.click` по тексту лейбла) и реальным кликом в Chromium на `form-develop-app`
    (`newsletter` чекбокс). Исходное предположение «Zag.js вешает toggle только на `control`,
    не на `root`/`label`» — неверно: `getRootProps()` из `@zag-js/checkbox` действительно не
    делает toggle сама, но нативное browser-поведение `<label>`→`<input>` forwarding работает и
    переключает скрытый `<input>`, откуда идёт `onChange`/`onCheckedChange` в форму.
  - Настоящая причина именно у `svoichuzhie` — `SubscribeForm` (`apps/svoichuzhie/src/app/_components/subscribe-form.tsx`)
    оборачивает часть текста согласия в `<a href="/privacy">`. Текст переносится на 2 строки, и
    геометрический ЦЕНТР bounding box всего `<label>` (куда `Playwright.click()` кликает по
    умолчанию) физически попадает ВНУТРЬ этой ссылки — подтверждено вычислением
    `getBoundingClientRect()` прямо на dev-сервере (`centerIsInsideLink: true`). Клик по ссылке
    **тоже переключает чекбокс** (проверено), но **ОДНОВременно уводит навигацией на `/privacy`**
    (реальный клик по `<a href>`), после чего Playwright-локаторы на исходной странице
    (`consentCheckbox.isChecked()`/`toBeChecked()`) обращаются к отсутствующим/detached элементам
    и падают детерминированно на каждой попытке — это и дало «0 успехов за 15с», а не отказ
    toggle-логики.
  - **Рекомендация владельцу svoichuzhie:** добавить `target="_blank" rel="noopener"` на `<a
    href="/privacy">` внутри `Checkbox.Label` в `subscribe-form.tsx` — убирает уводящую навигацию
    с текущей страницы (заодно человечнее: пользователь не теряет заполненную форму, кликнув
    политику). Обход в `03-subscription.spec.ts` (клик по `[data-part="control"]`, коммит
    `241802c9`) можно оставить как есть — он корректен и не создаёт проблем, откатывать не
    обязательно.
  - Общий вывод для всех потребителей `@letar/forms`: `Form.Field.Checkbox` с обычным текстовым
    `label` — безопасен и работает предсказуемо. Вкладывать в `label` навигирующую ссылку без
    `target="_blank"` — общий footgun (клик по ссылке одновременно переключает чекбокс И уводит
    со страницы), стоит иметь в виду при консент-чекбоксах в других приложениях (152-ФЗ паттерн
    встречается не только у svoichuzhie).
  - Полная переписка и цепочка экспериментов — в agent-mail, тред `form-svoichuzhie-checkbox-label`.

---

## ✅ v1.4.2 (2026-07-16) — фикс GET-утечки данных в URL до hydration

Найдено кросс-приложенческим аудитом логин-форм монорепо (находка auth-hub v0.6.4): корневой
`<form>` в `FormSimple` и `FormWithApi` (`src/lib/declarative/form-root/`) не имел
`method="post"` — до гидрации React форма сабмитится нативным GET, чувствительные поля (пароли и
т.п.) попадают в URL/history/Referer/access-логи. Риску были подвержены **все** приложения на
`@letar/forms`, не только точечные raw-формы вне библиотеки. Фикс — аддитивный HTML-атрибут,
`onSubmit`+`preventDefault()` как и раньше перехватывает сабмит до навигации браузера — поведение
форм не меняется, breaking changes нет.

---

## Текущее состояние (Фаза 1) ✅

### Реализовано

| Компонент                           | Описание                                      | Статус |
| ----------------------------------- | --------------------------------------------- | ------ |
| `useAppForm`                        | Хук формы из `createFormHook`                 | ✅     |
| `withForm`                          | HOC для композиции форм                       | ✅     |
| `fieldContext`, `formContext`       | Контексты TanStack Form                       | ✅     |
| `useFieldContext`, `useFormContext` | Хуки доступа к контекстам                     | ✅     |
| `FormGroup`                         | Контекст для группировки полей                | ✅     |
| `FormField`                         | Контекст для именования полей                 | ✅     |
| `TanStackFormField`                 | Интеграция с TanStack Form field API          | ✅     |
| `ChakraFormField`                   | Chakra UI v3 Field с автоматическими ошибками | ✅     |
| `FormGroupList`                     | Поддержка массивов с операциями               | ✅     |
| `FormGroupListItem`                 | Обёртка элемента массива                      | ✅     |
| `createForm()`                      | Фабрика для app-specific форм                 | ✅     |
| `extraSelects` в createForm         | Расширение Select компонентами                | ✅     |
| `extraComboboxes` в createForm      | Расширение Combobox компонентами              | ✅     |

### Структура файлов

```
libs/forms/
├── src/
│   ├── index.ts                    # Публичный API
│   ├── lib/
│   │   ├── context.ts              # createFormHookContexts
│   │   ├── form-hook.ts            # createFormHook + useAppForm + withForm
│   │   ├── form-group.tsx          # FormGroup + useFormGroup
│   │   ├── form-field.tsx          # FormField + useFormField
│   │   ├── tanstack-form-field.tsx # TanStackFormField + useTanStackFormField
│   │   ├── chakra-form-field.tsx   # ChakraFormField
│   │   ├── form-group-list.tsx     # FormGroupList + FormGroupListItem
│   │   └── types.ts                # BaseFieldProps и типы
├── package.json
├── vite.config.mts
└── tsconfig.json
```

---

## Фаза 2: Field компоненты ✅

Готовые к использованию field компоненты с интеграцией Chakra UI v3.

### Реализованные компоненты (37)

**Текстовые поля:**

| Компонент                     | Описание                          | Статус |
| ----------------------------- | --------------------------------- | ------ |
| `Form.Field.String`           | Текстовое поле (text, email, url) | ✅     |
| `Form.Field.Textarea`         | Многострочный текст               | ✅     |
| `Form.Field.Password`         | Пароль с toggle visibility        | ✅     |
| `Form.Field.PasswordStrength` | Пароль с индикатором силы         | ✅     |
| `Form.Field.Editable`         | Inline редактирование             | ✅     |
| `Form.Field.RichText`         | WYSIWYG редактор (Tiptap)         | ✅     |

**Числовые поля:**

| Компонент                | Описание                   | Статус |
| ------------------------ | -------------------------- | ------ |
| `Form.Field.Number`      | Простое числовое поле      | ✅     |
| `Form.Field.NumberInput` | Числовое поле со стрелками | ✅     |
| `Form.Field.Slider`      | Ползунок для диапазонов    | ✅     |
| `Form.Field.Rating`      | Рейтинг звёздами           | ✅     |
| `Form.Field.Currency`    | Денежное поле              | ✅     |
| `Form.Field.Percentage`  | Процентное поле            | ✅     |

**Дата и время:**

| Компонент                   | Описание                       | Статус |
| --------------------------- | ------------------------------ | ------ |
| `Form.Field.Date`           | Поле даты                      | ✅     |
| `Form.Field.Time`           | Поле времени                   | ✅     |
| `Form.Field.DateRange`      | Диапазон дат с пресетами       | ✅     |
| `Form.Field.DateTimePicker` | Дата и время вместе            | ✅     |
| `Form.Field.Duration`       | Длительность (HH:MM)           | ✅     |
| `Form.Field.Schedule`       | Редактор недельного расписания | ✅     |

**Выбор из списка:**

| Компонент                   | Описание                       | Статус |
| --------------------------- | ------------------------------ | ------ |
| `Form.Field.Select`         | Стилизованный Select           | ✅     |
| `Form.Field.NativeSelect`   | Нативный браузерный Select     | ✅     |
| `Form.Field.Combobox`       | Searchable select с группами   | ✅     |
| `Form.Field.Autocomplete`   | Текстовое поле с подсказками   | ✅     |
| `Form.Field.Listbox`        | Listbox single/multi selection | ✅     |
| `Form.Field.RadioGroup`     | Группа радиокнопок             | ✅     |
| `Form.Field.RadioCard`      | Card-based radio selection     | ✅     |
| `Form.Field.SegmentedGroup` | Segmented control              | ✅     |

**Множественный выбор:**

| Компонент                 | Описание                   | Статус |
| ------------------------- | -------------------------- | ------ |
| `Form.Field.Checkbox`     | Чекбокс                    | ✅     |
| `Form.Field.CheckboxCard` | Card-based multi selection | ✅     |
| `Form.Field.Switch`       | Переключатель              | ✅     |
| `Form.Field.Tags`         | Ввод тегов                 | ✅     |

**Специализированные:**

| Компонент                | Описание                         | Статус |
| ------------------------ | -------------------------------- | ------ |
| `Form.Field.PinInput`    | Ввод PIN/OTP кода                | ✅     |
| `Form.Field.OTPInput`    | OTP код с таймером resend        | ✅     |
| `Form.Field.ColorPicker` | Выбор цвета                      | ✅     |
| `Form.Field.FileUpload`  | Загрузка файлов                  | ✅     |
| `Form.Field.Phone`       | Телефон с маской                 | ✅     |
| `Form.Field.MaskedInput` | Универсальная маска              | ✅     |
| `Form.Field.Address`     | Адрес с автодополнением (DaData) | ✅     |

### Архитектура (v0.28.0)

Все field-компоненты используют общие утилиты для устранения дублирования кода:

```typescript
// field-utils.ts — работа с ошибками
import { formatFieldErrors, hasFieldErrors } from './field-utils'

// use-resolved-field-props.ts — резолв пропсов из схемы и контекста
import { useResolvedFieldProps } from './use-resolved-field-props'
```

**Паттерн компонента:**

```typescript
export function FieldExample({ name, label, placeholder, helperText, required, disabled, readOnly, ...rest }) {
  const {
    form,
    fullPath,
    label: resolvedLabel,
    placeholder: resolvedPlaceholder,
    helperText: resolvedHelperText,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, placeholder, helperText, required, disabled, readOnly })

  return (
    <form.Field name={fullPath}>
      {(field) => {
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        // ...
        {
          hasError && <Field.ErrorText>{formatFieldErrors(errors)}</Field.ErrorText>
        }
      }}
    </form.Field>
  )
}
```

### Выполненные задачи

- [x] Реализовать все 37 field-компонентов
- [x] Создать утилиты `field-utils.ts` и `use-resolved-field-props.ts`
- [x] Рефакторинг всех компонентов на общие утилиты (v0.28.0)
- [x] Исправить баги с form-level disabled/readOnly
- [x] Обновить `createForm()` с новыми типами
- [x] Обновить документацию

### Оставшиеся задачи

**Тестирование:**

- [ ] Написать E2E тесты для каждого компонента (частично — 25 демо-тестов есть)
- [x] Unit-тесты P0-P1: Phone, FileUpload, Currency, Percentage, Slider, Switch, Time, Duration, NativeSelect, RadioGroup (v0.83.0)
- [x] Unit-тесты P2: Combobox, ImageChoice, Likert, MatrixChoice, YesNo, Hidden, Textarea, Password, PasswordStrength, MaskedInput, DateRange, DateTimePicker (v0.83.0)
- [x] Unit-тесты P3: CreditCardSchema, KPP validator, table-utils (6 функций), captcha verify, useConversationalState (v0.84.0)

---

## Фаза 3: Form компоненты ✅

Компоненты уровня формы для типичных паттернов.

### Реализованные компоненты

| Компонент                           | Описание                                        | Статус |
| ----------------------------------- | ----------------------------------------------- | ------ |
| `Form.Button.Submit`                | Кнопка отправки с автоматическим loading        | ✅     |
| `Form.Button.Reset`                 | Кнопка сброса формы                             | ✅     |
| `Form.Errors`                       | Отображение глобальных ошибок формы             | ✅     |
| `Form.DirtyGuard`                   | Предупреждение при уходе с несохранённой формой | ✅     |
| `Form.When`                         | Условный рендеринг полей                        | ✅     |
| `Form.Steps`                        | Контейнер для мультистеп форм                   | ✅     |
| `Form.Steps.Step`                   | Отдельный шаг                                   | ✅     |
| `Form.Steps.Indicator`              | Индикатор прогресса                             | ✅     |
| `Form.Steps.Navigation`             | Навигация между шагами                          | ✅     |
| `Form.Steps.CompletedContent`       | Контент после завершения                        | ✅     |
| `Form.OfflineIndicator`             | Индикатор оффлайн режима                        | ✅     |
| `Form.SyncStatus`                   | Статус синхронизации                            | ✅     |
| `Form.Group.List.Button.Add`        | Кнопка добавления элемента                      | ✅     |
| `Form.Group.List.Button.Remove`     | Кнопка удаления элемента                        | ✅     |
| `Form.Group.List.Button.DragHandle` | Ручка для перетаскивания (DnD)                  | ✅     |

### Задачи

- [x] Реализовать `Form.Button.Submit` — кнопка отправки
- [x] Реализовать `Form.Button.Reset` — кнопка сброса
- [x] Реализовать `Form.Errors` — отображение ошибок формы
- [x] Реализовать `Form.DirtyGuard` — предупреждение при уходе
- [x] Реализовать `Form.When` — условный рендеринг
- [x] Реализовать `Form.Steps` — мультистеп формы
- [x] Реализовать `Form.OfflineIndicator` — индикатор оффлайн
- [x] Обновить документацию

---

## Фаза 4: DevTools и отладка ✅

Интеграция TanStack Form DevTools для отладки форм.

### Задачи

- [x] Установить `@tanstack/react-devtools` и `@tanstack/react-form-devtools`
- [x] Интегрировать в form-develop-app
- [x] Интегрировать в driving-school
- [x] Интегрировать в premium-rosstil
- [x] Интегрировать в imot (+ создан /api/model + QueryProvider)

### Интеграция

```typescript
// apps/*/query-provider.tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

// В JSX:
{
  process.env.NODE_ENV === 'development' && (
    <TanStackDevtools
      plugins={[
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel />, defaultOpen: false },
        formDevtoolsPlugin(),
      ]}
    />
  )
}
```

---

## Рефакторинг кода ✅

Улучшения архитектуры и качества кода.

### v0.50.0 — DRY/SOLID рефакторинг

- [x] **SelectionFieldLabel** — общий компонент для label+tooltip в selection полях (устранено дублирование в 12 файлах)
- [x] **useGroupedOptions** — хук группировки опций (Combobox, Listbox, Select)
- [x] **getOptionLabel** — утилита для получения label опции (заменяет `typeof opt.label === 'string'` паттерн)
- [x] **zod-utils.ts** — централизованные `unwrapSchema`, `unwrapSchemaWithRequired` (устранено дублирование в 4 файлах)
- [x] **extractConstraints** — generic handler pattern для constraint extraction в schema-constraints.ts
- [x] **Защита от циклов** — WeakSet + MAX_DEPTH=20 в schema-traversal.ts
- [x] **SWITCH_STYLES** — константы вместо magic numbers в field-schedule.tsx
- [x] **FormSteps декомпозиция** — разбит на хуки: `useStepState`, `useStepPersistence`, `useStepNavigation`
- [x] **LinkPopover** — модальное окно вместо `window.prompt()` в field-rich-text.tsx
- [x] **try/catch для JSON.parse** — в field-rich-text.tsx

**Результат:** ~500 строк дублирования устранено, улучшена maintainability и robustness.

### v0.28.0 — Предыдущий рефакторинг

- [x] **Удаление дубликатов FieldLabel/FieldTooltip** — удалены дублирующиеся файлы из `form-fields/`
- [x] **Унификация Selection через createField** — 8 компонентов переведены на createField factory:
  - FieldRadioGroup, FieldSegmentedGroup — простые, без state
  - FieldSelect — useMemo для collection через useFieldState
  - FieldRadioCard — useCallback для keyboard navigation
  - FieldCheckboxCard — простой, без state
  - FieldListbox — useMemo для collection и groups
  - FieldCombobox — сложный с useState, useDebounce, useMemo, useQuery
  - FieldAutocomplete — аналогично Combobox, упрощённый
  - **Результат:** -165 строк кода, унифицированный паттерн

### Планируемые задачи

- [x] **Унификация Options interfaces** — BaseOption, GroupableOption, RichOption в option-types.ts
- [x] **Общий FieldSize тип** — FieldSize, FieldSizeWithoutXs, FieldSizeExtended в size-types.ts
- [x] **useAsyncSearch хук** — общая логика debounce + search для Combobox/Autocomplete

---

## Фаза 5: Расширенные возможности ✅

Продвинутые паттерны и интеграции.

### Реализованные возможности

- [x] **localStorage Persistence** ✅ — сохранение данных формы в localStorage:
  - ✅ Автоматическое сохранение при изменении (с debounce)
  - ✅ Восстановление при перезагрузке страницы
  - ✅ **Dialog** для подтверждения восстановления ("Восстановить данные?" / "Начать заново")
  - ✅ Настраиваемый ключ хранилища
  - ✅ TTL (время жизни черновика) — `ttl` опция в `FormPersistenceConfig`
  - ✅ Кнопка "Очистить черновик" — `ClearDraftButton` компонент в результате хука

### Планируемые возможности

Все основные возможности реализованы. `useOfflineForm` доступен через `@letar/forms/offline`.

> **Примечание:** File Upload, Rich Text, Autocomplete, Multi-select (Tags), Date Range реализованы в Фазе 2.

### localStorage Persistence API

```tsx
// Использование через хук
const persistence = useFormPersistence<MyFormData>({
  key: 'recipe-form-draft',
  ttl: 24 * 60 * 60 * 1000, // 24 часа — черновик протухнет через сутки
  debounceMs: 500, // Задержка автосохранения
  dialogTitle: 'Восстановить черновик?',
  dialogDescription: 'Обнаружен несохранённый черновик.',
  clearDraftButtonText: 'Очистить черновик',
})

// Подписка на изменения формы
useEffect(() => {
  return form.store.subscribe(() => {
    persistence.saveValues(form.state.values)
  })
}, [form.store, persistence.saveValues])

// Отображение времени сохранения
{persistence.savedAt && (
  <Text fontSize="sm" color="gray.500">
    Черновик от {new Date(persistence.savedAt).toLocaleTimeString()}
  </Text>
)}

// Кнопка очистки черновика
<persistence.ClearDraftButton />

// Диалог восстановления
<persistence.RestoreDialog />
```

### Dialog восстановления

При обнаружении сохранённых данных показывается Dialog:

```
┌─────────────────────────────────────────┐
│  Восстановить несохранённые данные?     │
│                                         │
│  Обнаружен черновик от 15:30.           │
│  Хотите продолжить редактирование?      │
│                                         │
│  [Начать заново]  [Восстановить]        │
└─────────────────────────────────────────┘
```

---

## Правила проектирования схемы БД для Combobox

Для корректной работы `Form.Field.Combobox` с TanStack Query и ZenStack hooks необходимо соблюдать следующие правила:

### 1. Обязательные поля для поиска

Каждая модель, используемая в Combobox, должна иметь:

```prisma
model Entity {
  id    String @id @default(cuid())
  label String // Отображаемое значение (обязательно)
  // или
  name  String // Альтернативное имя поля
}
```

### 2. Индексы для производительности

```prisma
model Entity {
  id    String @id @default(cuid())
  label String

  @@index([label]) // Индекс для поиска
}
```

### 3. Конвенция для ZenStack hooks

```typescript
// Combobox автоматически использует:
// - useFindMany{Model} для загрузки
// - where: { label: { contains: searchTerm, mode: 'insensitive' } }

// Пример кастомной интеграции:
<Form.Field.Combobox
  name="userId"
  label="Пользователь"
  useQuery={(search) =>
    useFindManyUser({
      where: { name: { contains: search, mode: 'insensitive' } },
      take: 20,
    })}
  getLabel={(user) => user.name}
  getValue={(user) => user.id}
/>
```

### 4. Группировка результатов

Для группировки добавить поле категории:

```prisma
model Product {
  id       String @id @default(cuid())
  name     String
  category String // Поле для группировки

  @@index([name])
  @@index([category])
}
```

```tsx
<Form.Field.Combobox name="productId" groupBy={(product) => product.category} />
```

---

## Метрики успеха

| Метрика               | Цель | Текущее                                                      |
| --------------------- | ---- | ------------------------------------------------------------ |
| Компоненты контекстов | 6    | 6 ✅                                                         |
| Field компоненты      | 56   | 56 ✅                                                        |
| Form компоненты       | 20+  | 20+ ✅                                                       |
| Утилиты рефакторинга  | 2    | 2 ✅                                                         |
| Тестовое покрытие     | >80% | ~95% ✅ (112 файлов, 1074 теста)                             |
| Документация          | 100% | 100% ✅ (docs/fields.md: 56 полей, docs/analytics.md создан) |
| DX фичи (Фаза 6)      | 7    | 7 ✅                                                         |

---

## Приоритеты

1. ~~**Критический** — Фаза 2 (field компоненты)~~ ✅ Завершено
2. ~~**Высокий** — Фаза 3 (form компоненты)~~ ✅ Завершено
3. ~~**Средний** — Фаза 4 (DevTools)~~ ✅ Завершено
4. ~~**Низкий** — Фаза 5 (расширенные возможности)~~ ✅ Завершено
5. ~~**Средний** — Тестирование~~ ✅ 112 файлов, 1074 теста
6. ~~**Высокий** — Фаза 6 (DX фичи)~~ ✅ Завершено (v0.80.0)
7. ~~**Средний** — Аудит документации~~ ✅ v0.84.2 — 56 полей в docs/fields.md, analytics.md создан

---

## Технический долг / Known Issues

### Исправлено в v0.28.0

- [x] **Баги с form-level disabled/readOnly** — все 37 field-компонентов теперь корректно наследуют `disabled` и `readOnly` из контекста формы
- [x] **Дублирование кода** — создан рефакторинг с `useResolvedFieldProps` и `formatFieldErrors`/`hasFieldErrors`

### React Hooks в render callbacks

Следующие компоненты используют React hooks (`useMemo`, `useCallback`) внутри render callbacks `form.Field`, что нарушает правила hooks. Это вызывает предупреждения в консоли:

```
Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks.
```

**Требуется рефакторинг:**

- [x] `Form.Field.Schedule` — извлечь внутренний контент в отдельный компонент (ScheduleContent в v0.50.0)

**Уже исправлено:**

- [x] `Form.Field.ColorPicker` — исправлено извлечением `ColorPickerFieldContent`

---

## Backlog / Очередь задач

### Запросы от агентов

#### [2026-07-22] `Form.Field.Phone` — не проходит ввод в WebKit e2e (от dsperevod) ✅ ГОТОВО

- **Запросил:** root-weaver
- **Приоритет:** high
- **Описание:** `apps/dsperevod-e2e/src/callback-drawer.spec.ts` — все 4 теста (маска телефона + 3 сценария отправки) падают **только в WebKit**, все — на шаге ввода телефона (`phoneInput.pressSequentially('9185568172', { delay: 20 })` не приводит к ожидаемому значению маски). Chromium/Firefox проходят. Обнаружено §18.7 Тираж M1 batch2 (staging-e2e-гейт), не диагностировано глубоко — не в скоупе root-weaver (компонент `FieldPhone`, `libs/forms/src/lib/declarative/form-fields/specialized/field-phone.tsx`, использует `use-mask-input`/`withMask`, юнит-тестов на реальный ввод клавиш нет, только рендер/начальное значение — `field-phone.spec.tsx`). Подозрение: `withMask`/событийная модель WebKit (Safari) не синхронизируется с `pressSequentially` так же, как Chromium/Firefox — известный класс проблем у masked-input библиотек в WebKit.
- **Статус:** ✅ готово — v1.4.4 (коммит `58eb9d1b`), маска телефона переписана на чистый JS
  форматтер вместо `use-mask-input` (imask мутировал DOM в обход React, конфликтовало с
  controlled `value` при быстром посимвольном вводе в WebKit). Готово к перепроверке
  `dsperevod-e2e --project=webkit` со стороны root-weaver/dsperevod (thread
  `form-dsperevod-phone-webkit`, ответ forms-dev 2026-08-09)

#### [2026-06-12] Провайдер Yandex SmartCaptcha для Form.Captcha (от svoichuzhie) ✅ ГОТОВО

- **Запросил:** MagentaRaven
- **Приоритет:** high
- **Описание:** новый провайдер `smartcaptcha` рядом с turnstile/recaptcha/hcaptcha (`libs/forms/src/lib/captcha/`). Причина: РФ-проект (152-ФЗ) — Turnstile/reCAPTCHA отправляют IP и телеметрию браузера на зарубежные серверы (трансграничная передача ПДн), SmartCaptcha хранит данные в РФ. Серверная верификация: `POST https://smartcaptcha.yandexcloud.net/validate`. Нужно к Фазе 1–2 svoichuzhie (регистрация фан-клуба, подписка) — сейчас не блокирует (идёт Фаза 0, дизайн).
- **Статус:** ✅ готово — v1.4.5 (коммит `4c99c228`), провайдер `smartcaptcha` рядом с
  turnstile/recaptcha/hcaptcha, `<Form.Captcha provider="smartcaptcha">` +
  `verifyCaptcha(token, { provider: 'smartcaptcha', ... })`. `theme` проп не поддерживается
  Yandex SmartCaptcha (игнорируется). Документация: form-docs guides/captcha.mdx, демо в
  form-develop-app/form-example. Готово к использованию в svoichuzhie (Фаза 1–2)

#### [2026-08-04→2026-08-12] Серверный код forms не под `src/server/` — граница `no-restricted-imports` его не видит — ✅ закрыто

- **Запросил:** GoldCreek (аудит границ `src/server/` на auth/pin-auth/cdek/forms), назначено
  QuietRidge (письмо #171)
- **Приоритет:** low
- **Описание:** `src/lib/captcha/verify.ts` (серверная верификация CAPTCHA) и `src/lib/server-errors/*` (экспортируется как `./server-errors` в `exports`) лежали в `src/lib/`, а не в `src/server/`. Правило `no-restricted-imports` в корневом `eslint.config.mjs` матчит только `**/src/server/**` — эти файлы были вне его области. Нарушений не было (React/Chakra не тянули), но граница не защищала от будущей регрессии.
- **Статус:** реализовано по паттерну `@letar/auth`. Файлы перенесены физически:
  `src/lib/captcha/verify.ts` → `src/server/captcha/verify.ts`,
  `src/lib/server-errors/*` → `src/server/server-errors/*`. `exports["./server-errors"]` в
  `libs/forms/package.json` обновлён на новый физический путь (имя экспорта не изменилось —
  `@letar/forms/server-errors` работает как раньше). Добавлен новый подпуть
  `exports["./captcha/server"]` — `verifyCaptcha` раньше был доступен только из корневого
  барreля (`@letar/forms`, там и остался), явного subpath не существовало вовсе, хотя доки
  (`form-docs/guides/captcha.mdx`) уже ошибочно ссылались на несуществующий `@letar/forms/captcha`
  — исправлено на реальный `@letar/forms/captcha/server` везде (доки en+ru, демо
  `form-develop-app/captcha-demo`, JSDoc в `verify.ts`). `tsup.config.ts` — новый entry
  `captcha/server`, путь `server-errors` обновлён. `paths` на `@letar/forms/server-errors`
  обновлены во всех 19 приложениях-потребителях (batch sed, проверено `typecheck:tsgo` на
  `form-develop-app`/`driving-school`, `nx build form-docs`). `@letar/forms-core` не тронут —
  у него нет React нигде в принципе, граница `src/server/` актуальна только для Chakra-скина.

### Документация и DX

- [x] **Улучшить документацию по обработке ошибок** — добавлено в `.claude/docs/forms.md`:
  - Паттерны возврата ошибок из Server Actions (простой и расширенный)
  - Обработка серверных ошибок в `onSubmit` (toast, fieldErrors)
  - Отображение глобальных ошибок формы (`<Form.Errors />`)
  - Типизация результатов (discriminated unions)

### Концепция переиспользуемых форм ✅

Реализовано через `createForm()`:

- App-specific формы (`DrivingSchoolForm`, `ImotForm`, `PremiumRosstilForm`)
- Автогенерируемые Select для всех ENUM'ов
- Combobox для асинхронного поиска моделей
- `withUIMeta` для обогащения ZenStack схем

---

## Англификация и Address Provider (v0.58.0) ✅

### Англификация для npm

- [x] Все JSDoc/комментарии/runtime ошибки переведены на английский (118 файлов)
- [x] Default UI строки на английском: "Save", "Reset", "Unsaved changes", "Leave", "Stay"
- [x] `build:npm` копирует `README.en.md` → `dist/README.md` + `README.ru.md`
- [x] 513 тестов обновлены и проходят

### Pluggable Address Provider

- [x] `AddressProvider` интерфейс для подключаемых сервисов геокодинга
- [x] `createDaDataProvider()` — встроенный провайдер DaData (Россия)
- [x] `createForm({ addressProvider })` — провайдер задаётся один раз
- [x] Приоритет: field prop → createForm context → token fallback → env
- [x] Обратная совместимость: `token` prop продолжает работать
- [x] `AddressValue.data` обобщён до `Record<string, unknown>`

---

## Фаза 6: Developer Experience — новые фичи ✅

> **Источник:** Исследование болей разработчиков с формами в React (апрель 2026).
> Реализовано в v0.80.0. 59 unit/render тестов + 13 E2E + 16 бенчмарков.

### 6.1 Form.Analytics — встроенная аналитика форм ✅

| Задача                                                                  | Статус |
| ----------------------------------------------------------------------- | ------ |
| `useFormAnalytics()` — хук трекинга (focus/blur/error/abandon/complete) | ✅     |
| `FormAnalyticsProvider` — контекст для трекинга                         | ✅     |
| `Form.Analytics.Panel` — dev-only панель                                | ✅     |
| `Form.Analytics.Funnel` — воронка мультистеп форм                       | ✅     |
| Adapter: Umami                                                          | ✅     |
| Adapter: Яндекс Метрика (goals + params)                                | ✅     |
| Adapter: Google Analytics 4                                             | ✅     |
| Adapter: PostHog                                                        | ✅     |
| Subpath export: `@letar/forms/analytics`                                | ✅     |
| analytics-demo страница (form-develop-app)                              | ✅     |
| Документация: guides/analytics.mdx + .ru.mdx                            | ✅     |
| Статья 13-analytics.md                                                  | ✅     |
| Тесты                                                                   | ✅     |

### 6.2 useFormHistory — Undo/Redo ✅

| Задача                                              | Статус |
| --------------------------------------------------- | ------ |
| `useFormHistory()` — хук с history stack + debounce | ✅     |
| Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)           | ✅     |
| `Form.History.Controls` — кнопки Undo/Redo          | ✅     |
| Persistence в sessionStorage (опционально)          | ✅     |
| undo-redo-demo страница (form-develop-app)          | ✅     |
| Документация: guides/undo-redo.mdx + .ru.mdx        | ✅     |
| Тесты                                               | ✅     |

### 6.3 mapServerErrors() — маппинг серверных ошибок ✅

| Задача                                                        | Статус |
| ------------------------------------------------------------- | ------ |
| `mapServerErrors()` — утилита с автодетектом формата          | ✅     |
| Парсеры: Zod flatten, Prisma (P2002/P2003), ZenStack, custom  | ✅     |
| `serverErrorMapper` в createForm middleware                   | ✅     |
| server-errors-demo страница (form-develop-app)                | ✅     |
| Обновить docs/zenstack.md — секция "Обработка ошибок мутаций" | ✅     |
| Документация: guides/server-errors.mdx + .ru.mdx              | ✅     |
| Обновить .claude/docs/forms.md — заменить ручной паттерн      | ✅     |
| Тесты                                                         | ✅     |

### 6.4 Form.ReadOnly — режим "только чтение" ✅

| Задача                                           | Статус |
| ------------------------------------------------ | ------ |
| `<Form readOnly>` — проп для всей формы          | ✅     |
| `<Form.ReadOnlyView>` — отдельный компонент      | ✅     |
| readonly-demo страница (form-develop-app)        | ✅     |
| Документация: guides/readonly-view.mdx + .ru.mdx | ✅     |

### 6.5 Form.Skeleton — Loading state ✅

| Задача                                                 | Статус |
| ------------------------------------------------------ | ------ |
| `<Form.Skeleton schema={S}>` — автоматический skeleton | ✅     |
| `<Form loading={true}>` — skeleton внутри формы        | ✅     |
| skeleton-demo страница (form-develop-app)              | ✅     |
| Документация: guides/form-skeleton.mdx + .ru.mdx       | ✅     |

### 6.6 Form.Comparison — Diff-view ✅

| Задача                                                      | Статус |
| ----------------------------------------------------------- | ------ |
| `<Form.Comparison original={old} current={new} schema={S}>` | ✅     |

### 6.7 Каскадная валидация (Form.DependsOn) ✅

| Задача                                                     | Статус |
| ---------------------------------------------------------- | ------ |
| `<Form.DependsOn field="x" schema={{ a: zodA, b: zodB }}>` | ✅     |

---

## Фаза: MCP Server + NPM + Claude Code Plugin

Детальный план: [`libs/form-mcp/PLAN.md`](../form-mcp/PLAN.md)

MCP сервер для AI-ассистентов — предоставляет полный контекст о 56 field-компонентах, паттернах форм и @form.\* директивах через tools/resources/prompts. Три этапа:

1. **Локальный MCP** (`libs/form-mcp/`) — для монорепо ✅ Phase 1 готов
2. **NPM пакет** (`@letar/form-mcp`) — для пользователей библиотеки
3. **Claude Code Plugin** — hooks, skills, автономный agent

---

## Form as State Manager ✅ (v1.4.0, 2026-05-22)

> Источник: статья 14-forms-as-state.md, 2026-05-22. Паттерны фильтров, URL-синхронизации и dashboard-контролов выявили пробелы в API.

### 1. `useFormUrlSync` — двусторонняя URL-синхронизация (приоритет: высокий)

Сейчас `useUrlPrefill` — только чтение (URL → форма). Нужен хук с двусторонней синхронизацией:

```ts
const form = useFormUrlSync(FilterSchema, {
  fields: ['search', 'category', 'minPrice'], // whitelist
  debounce: 300,
  replace: true, // router.replace вместо push
})
// form.initialValue считывается из URL при маунте
// при изменении значений → router.replace автоматически
```

- [x] Хук `useFormUrlSync(schema, options)` в `@letar/forms`
- [x] Поддержка Next.js `useRouter` и нативного `history.pushState`
- [x] Сериализация: `z.array` → повторяющиеся params (`?status=a&status=b`)
- [x] Тесты + демо в form-develop-app
- [x] Документация: обновить `guides/filters-state.mdx` и `guides/url-prefill.mdx`

### 2. `Form.Subscribe debounce` — встроенный debounce (приоритет: средний)

Сейчас debounce требует ручного `Form.Watch` + `setTimeout`. Нужен prop:

```tsx
<Form.Subscribe debounce={300}>{(values) => <ProductList filters={values} />}</Form.Subscribe>
```

- [x] Prop `debounce?: number` на `Form.Subscribe`
- [x] Prop `debounce?: number` на `useTypedFormSubscribe`
- [x] Тесты: убедиться что промежуточные значения не тригерят render

### 3. `onSubmit` опциональный (приоритет: средний)

Для no-submit форм (фильтры, контролы) сейчас нужен `onSubmit={async () => {}}`. Неочевидно и многословно. Сделать опциональным — когда `onSubmit` не передан, форма работает в режиме state-container без submit-логики.

- [x] `onSubmit` опциональный в `Form` props
- [x] Документация: добавить пример в `guides/filters-state.mdx`

### 4. `useFormRef` — доступ к инстансу снаружи дерева (приоритет: средний)

Для кнопки «Сбросить фильтры» в тулбаре страницы, которая живёт вне `<Form>`:

```tsx
const filterRef = useFormRef()

// В тулбаре (вне <Form>):
<Button onClick={() => filterRef.current?.reset()}>Сбросить всё</Button>

// В форме:
<Form formRef={filterRef} schema={FilterSchema} ...>
```

- [x] Prop `formRef` на `Form`
- [x] Хук `useFormRef()` возвращает `RefObject<FormApi>`
- [x] Тесты

### 5. `useActiveFiltersCount(defaults)` — счётчик активных фильтров (приоритет: низкий)

Частая потребность: бейдж «Фильтры (3)» над кнопкой открытия панели фильтров:

```tsx
const count = useActiveFiltersCount(defaultFilters)
// count = количество полей, значение которых != defaults

return <Button>Фильтры {count > 0 && <Badge>{count}</Badge>}</Button>
```

- [x] Хук `useActiveFiltersCount(defaults: Partial<T>): number`
- [x] Сравнение через deep-equal (учитывает массивы)
- [x] Документация

---

## Публикация на Хабре

Полное ТЗ по подготовке 14 статей к публикации: [ARTICLE.md](./ARTICLE.md)

### Статус (обновлено 2026-04-05)

| Этап                         | Статус        | Детали                                                  |
| ---------------------------- | ------------- | ------------------------------------------------------- |
| Часть 1: бенчмарки           | **done**      | `benchmarks.md`, `test-results.md`                      |
| Часть 1: визуалы P0          | **done**      | 4 SVG + 2 GIF + 3 PNG                                   |
| Часть 1: визуалы P1          | **частично**  | 3/5 SVG сделано, GIF автогенерации и MCP скриншот — нет |
| Часть 1: визуалы P2          | **не начато** | КДПВ, GIF i18n/offline, npm скриншот                    |
| Часть 2: редактура           | **done**      | Все 14 статей (00-13): шапка, спойлеры, финалы          |
| Часть 5: нераскрытые фичи    | **не начато** | Honeypot, Conversational, FormBuilder и др.             |
| Часть 4: финальный чеклист   | **не начато** | Перед каждой публикацией                                |
| Часть 6.1: testing utilities | **не начато** | `@letar/forms/testing` entry point                      |
| Часть 6.2: URL prefill       | **не начато** | `useUrlPrefill()` хук                                   |
| Часть 6.3-6.5: GitHub README | **не начато** | 3 пакета: forms, zenstack-plugin, form-mcp              |
| Часть 3: публикация          | **не начато** | 13 статей, 7 недель, вт/пт                              |

---

## Фаза 7: Стратегия дистрибуции (широкий OSS-охват) 🎯

> Направление принято 2026-07-05 (обсуждение с Kami). Цель: распространить `@letar/forms`
> на максимум React-разработчиков. Модель — **open-core** (ядро бесплатно, сервис вокруг форм — платно).

### Ключевой вывод анализа рынка (июль 2026)

- Рынок ушёл в **Tailwind/shadcn** (shadcn ~115k⭐, дефолт новых проектов). Chakra — меньшинство.
- Форм-стейт держит **React Hook Form** (~12M/нед). Мы на TanStack Form — растёт, но меньшинство.
- Ниша **schema-first zod→form** открыта: десятки генераторов, ни один не доминирует.
- **Chakra-лок = потолок охвата.** Аудитория «все React-devs» несовместима с Chakra-only.
- Наши редкие козыри: 56 полей, ZenStack `@form.*` (форма из схемы БД), offline/security/i18n,
  **MCP-сервер** (в 2026 llms.txt/MCP реально приводит юзеров через AI-ассистентов).

### Центральное решение: headless-ядро + UI-скины (модель AutoForm)

Инвертировать зависимость от Chakra. Целевая архитектура:

```
@letar/forms-core     ← Zod-мета + constraints + валидаторы + маппинг ошибок + i18n-словари
   ↓ потребляет UIKit-интерфейс (~20 примитивов)
@letar/forms-chakra   @letar/forms-shadcn   (@letar/forms-mui — потом)
```

### Архитектурный принцип (Clean Architecture / DIP) — решение Kami 2026-07-08

Фреймворк — это **деталь** (внешнее кольцо). Зависимость идёт **внутрь**: не ядро зависит от
React, а React-адаптер зависит от абстракций ядра.

- **Жёсткое правило:** `forms-core` **не импортирует ни один фреймворк** (ни React, ни Chakra, ни Vue) —
  чистые TS-функции, а не React-хуки, где это возможно. Не «React-free где получится», а точка.
- **React-адаптер = первый плагин** над ядром.
- **Второй фреймворк — это тест на фальсификацию границы**, а не «доброта к комьюнити». Абстракция с одним
  потребителем почти всегда протекает; настоящий seam доказывается только вторым потребителем (как тест
  доказывает код). Отсюда Vue-пруф (7.8) — верификация, а не тщеславие.
- **Противовес (тоже решение Kami):** SOLID — слуга, не господин. Антипаттерн — speculative generality /
  «архитектурный космонавт». Граница проведена + стрелка внутрь + задеплоено = архитектура уже честная;
  N адаптеров для этого не нужны. Знать, где остановиться — часть добродетели.

### Аудит связанности (факт по коду, 2026-07-05)

- **Chakra-free уже сейчас** (переезжают почти как есть в `forms-core`): `validators/`, `server-errors/`,
  `i18n/`, `utils/`, `contexts/`, `captcha/providers/` (0 Chakra); `analytics/` (1/9), `offline/` (2/8),
  `history/` (1/4) — логика чистая, на Chakra только UI-панели/индикаторы.
- **Вся связанность в `declarative/`: 153 из 177 файлов.** Точнее — **54 из 66 файлов полей** тянут Chakra напрямую.
- Обёртка поля (`Field.Root/Label/Error`) уже централизована в `form-fields/base/` (`field-wrapper.tsx`,
  `create-field.tsx`, `field-label.tsx`). Контролы (`Input`, `NumberInput`, `Select`, `Combobox`…) — размазаны по полям.
- **UIKit-интерфейс ≈ 20 примитивов:** FieldRoot/Label/Error/Helper + Input/NumberInput/Select/NativeSelect/
  Combobox/Checkbox/RadioGroup/SegmentGroup/PinInput + layout (Box/HStack/VStack/Text/Button/IconButton).

### Roadmap

- [x] **7.1 Расслоение `forms-core`** — вынести Chakra-free логику + определить UIKit-интерфейс.
      Ценно само по себе (чистит архитектуру), даже оставаясь только на Chakra.
      ✅ **Завершено 2026-08-09** (делегировано forms-dev, thread
      `forms-phase7-1-core-split`). Готово: Этап 1 (каркас `libs/forms-core`, пилот
      `validators/ru`, граница без React/Chakra проверена негативной пробой линта), Этап 2
      (Zod-мета-движок, ~2030 строк — самая ценная часть ядра), Этапы 3а/3б (`server-errors/`,
      `utils/`, `security/file-security.ts`, `offline/`, `captcha/`, `analytics/adapters/`), Этапы
      3в-3г (коммит `80545685`) — пять новых subpath-экспортов `forms-core`: `./credit-card`
      (luhn, detectBrand/getBrandInfo, formatExpiry/isExpiryValid, formatCardNumber,
      creditCardSchema), `./phone` (WebKit-safe форматтер из v1.4.4), `./table` (table-utils +
      Chakra-free часть table-types), `./address` (createDaDataProvider),
      `./i18n` (createFormErrorMap). `nx typecheck:tsgo,test --projects=forms,forms-core`:
      750/750 тестов зелёные, affected-typecheck по потребителям (form-develop-app, form-docs,
      form-example, dashboard, animatrona, grandslamcup, label-printer-desktop) — все ошибки
      pre-existing, не связаны с переносом.
      ✅ **Находка закрыта окончательно** (коммит `ad318324` добавил вычисление
      `formsCoreAlias` из `exports`, но не подключил его — старый ручной список остался
      активным, отсюда ESLint-warning про неиспользуемую переменную; довершено в рамках
      Этапа 4, 2026-08-09): `resolve.alias` теперь `...formsCoreAlias` вместо ручного списка.
      Подключение вскрыло вторую, более глубокую проблему — `rollup-plugin-alias` матчит
      объектные алиасы по префиксу, и bare `@letar/forms-core` (без подпути, идёт первым в
      `Object.entries(exports)` из-за `.` в начале) перехватывал `/schema`, `/utils` и другие
      подпути раньше их собственной записи, ломая 70/98 тестов. Фикс — сортировка ключей по
      длине по убыванию перед сборкой alias-объекта. Рассинхрон между `exports` и alias теперь
      структурно невозможен, а не просто починен разово.
      Публичный API `@letar/forms` не менялся — реэкспорт-шимы.
      **Этап 4** — `@letar/forms-core/uikit`: TS-контракт `UIKit` (~20 примитивов). Три
      показательных поля переведены на контракт вместо прямого импорта Chakra: `Field.String`
      (текстовое), `Field.Checkbox` (бинарное), `Field.Select` (самое структурно сложное —
      compound API + портал). `chakraUIKit` в `base/uikit-chakra.tsx` — единственное место, где
      контракт связывается с Chakra; будущий `forms-shadcn` даст свою реализацию без изменений
      в самих полях. Остальные примитивы (`NumberInput`/`NativeSelect`/`Combobox`/`RadioGroup`/
      `SegmentGroup`/`PinInput` + layout) типизированы, добавятся по мере миграции полей.
      **Этап 5** — документация всех 6 групп: `libs/forms/README.md` (раздел про архитектуру),
      CHANGELOG + v1.4.7, `libs/forms-core/README.md` написан с нуля (таблица 15
      subpath-экспортов, раздел про UIKit, архитектурный принцип). Demo-приложения не тронуты —
      внутренний рефакторинг без нового пользовательского API. Коммиты: `e2c0026d` (Этап 4),
      `a310995d` (Этап 5). Итог всей фазы — `libs/forms/PLAN_COMPLETED.md`.
      **Фаза 7.1 полностью завершена 2026-08-09.**
      - ✅ **Этап 1 закрыт (2026-08-09):** каркас `libs/forms-core` (Nx-проект, теги
      `scope:shared`/`type:core`/`owner:letar`), пилотный модуль `validators/ru` (476 строк, 9
      файлов) перенесён из `libs/forms` целиком, `@letar/forms/validators/ru` теперь тонкий
      реэкспорт — публичный API не изменился. Граница ядра держится на двух независимых
      ESLint-правилах (`depConstraints` для `type:core` + `no-restricted-imports` на
      `**/forms-core/src/**/*.ts` против `react`/`@chakra-ui/*`/`@tanstack/react-*`) —
      подтверждено негативной пробой (временный импорт `Box` из Chakra в ядро валит `nx lint
        forms-core`, без импорта — зелёный). `nx run-many -t typecheck:tsgo --all` зелёный по
      всему монорепо (кроме 5 предсуществующих несвязанных проблем — Prisma-дрейф в
      `form-example`, `webkitRequestFullscreen` в `grandslamcup`, TS6310 project-references в
      `animatrona-main`/`-renderer`, не относящиеся к forms-core падения в
      `label-printer-desktop`).
      - **Находка при внедрении:** резолв `@letar/forms-core` в приложениях-потребителях идёт
      ДВУМЯ независимыми механизмами одновременно, оба пришлось завести — иначе часть
      приложений не собирается: (1) `paths` в `apps/*/tsconfig.json` (~20 приложений,
      механически) — нужен для приложений, у которых `@letar/forms` разрешается через явный
      alias; (2) реальная workspace-зависимость `"@letar/forms-core": "workspace:*"` в
      `libs/forms/package.json` + `bun install` — материализует symlink
      `libs/forms/node_modules/@letar/forms-core`, нужен для приложений вроде `dashboard`,
      которые резолвят `@letar/forms` вообще без `paths`, только через
      `customConditions: ["@letar/source"]` + `exports` в `package.json` (см.
      `.claude/rules/libs.md` § «Подключение к приложению»). Три приложения
      (`label-printer-desktop`, `animatrona`) с «смешанной моделью» `include`
      (`../../libs/forms/src/**/*.ts` в списке) дополнительно требовали такой же строки для
      `forms-core` — иначе TS6307, ровно ловушка из
      [lib-entry-points.md](/.claude/docs/lib-entry-points.md).
      - ✅ **Этап 2 закрыт (2026-08-09):** Zod-мета-движок перенесён целиком (9 файлов,
      ~2030 строк: `schema-constraints.ts`, `schema-traversal.ts`, `constraint-hints.ts`,
      `common-meta.ts`, `with-ui-meta.ts`, `schema-meta.ts`, `zod-utils.ts`,
      `types/meta-types.ts`, `types/size-types.ts`) под новый subpath
      `@letar/forms-core/schema`. Карго-культный `'use client'` снят со всех — они чистые TS
      без единого runtime-импорта фреймворка (были просто помечены директивой без причины).
      Все 7 flat-файлов в `libs/forms` стали тонкими реэкспорт-шимами (тот же паттерн, что
      `validators/ru/index.ts` в Этапе 1) — внутренние относительные импорты (`./zod-utils`,
      `./schema-constraints` и т.п.) по всей `declarative/` не пришлось трогать. Единственная
      находка при переносе: `schema-meta.ts` импортировал `FieldUIMeta` через барrel `./types`
      (тянущий `field-types.ts` с `ReactNode` — React-зависимый), пришлось переключить на
      прямой `./types/meta-types` — иначе ядро унесло бы React-тип транзитивно. 4 spec-файла
      (`schema-constraints`, `schema-traversal`, `constraint-hints`, `with-ui-meta`) переехали
      вместе с реализацией — тестировать через реэкспорт-шим смысла нет. Тот же двойной
      механизм резолва из Этапа 1 (`paths` в ~20 `apps/*/tsconfig.json` + subpath в
      `package.json`) повторён для `@letar/forms-core/schema`. `nx run-many -t typecheck:tsgo
        --all` — те же 5 предсуществующих несвязанных падений, что после Этапа 1, регрессий нет.
      - ✅ **Этап 3а закрыт (2026-08-09):** первый батч остальных чистых модулей —
      `server-errors/` (существующий публичный subpath `@letar/forms/server-errors`,
      переехал целиком, включая bench), `utils/` (только `deepEqual`+`safeStringify`;
      `useFormStoreSubscribe` остался в адаптере — React-хук) и
      `declarative/security/file-security.ts` (только он; `honeypot.tsx`/`rate-limiter.ts`
      остались — React-хуки). Новые subpath'ы: `@letar/forms-core/server-errors`,
      `@letar/forms-core/utils`, `@letar/forms-core/security`. **Находка:** 5 файлов в
      `libs/forms` импортировали `deepEqual`/`safeStringify`/`processFileWithSecurity`
      напрямую по относительному пути в обход барreля (`../utils/deep-equal` и т.п.) —
      пришлось поправить каждый отдельно, реэкспорт-шим их не подхватывает. **Находка 2:**
      `file-security.ts` framework-free (без React/Chakra), но использует DOM API
      (`Image`, `document`, `canvas`) напрямую — понадобился `"lib": ["dom", ...]` в
      `tsconfig.lib.json`/`tsconfig.spec.json` ядра (не только `es2022`, которого по
      умолчанию хватало остальным модулям). Framework-free ≠ platform-free — это разные оси.
      - ✅ **Этап 3б закрыт (2026-08-09):** второй батч — `offline/` (только
      `offline-service.ts`+`types.ts`; React-хуки `use-offline-form.ts`,
      `use-offline-status.ts`, `use-sync-queue.ts` и компоненты-индикаторы остались в
      адаптере), `captcha/` (только `verify.ts`+`types.ts`; `captcha-context.tsx`,
      `captcha-field.tsx` остались — React), `analytics/` (`types.ts` + все 4 адаптера
      `adapters/*.ts`; `use-form-analytics.ts` и `analytics-panel.tsx` остались — React).
      Новые subpath'ы: `@letar/forms-core/offline`, `/captcha`, `/analytics`.
      **Находка, крупнее предыдущих:** `offline-service.ts` framework-free, но делает
      `await import('idb-keyval')` — **динамический** импорт реального npm-пакета, который
      статический грep по `from '...'` в исходном аудите Фазы 7 не ловил вообще. Тесты
      падали не из-за резолва (idb-keyval хоистится в root `node_modules`), а из-за
      отсутствия окружения: `canUseIDB()` проверяет `typeof indexedDB !== 'undefined'`, а
      голый jsdom не реализует IndexedDB — нужен `fake-indexeddb/auto` (был в
      `libs/forms/vitest.setup.ts`, но `forms-core` не имел вообще никакого setup-файла).
      Заодно понадобился и localStorage-полифилл оттуда же. **Вывод для будущих батчей:**
      аудит на «framework-free» по статическим импортам недостаточен — платформенные API
      (DOM, IndexedDB, localStorage, `fetch`) и **динамические** импорты npm-пакетов нужно
      проверять раздельно, тестовый прогон — единственный надёжный сигнал полноты миграции
      окружения, само по себе успешное `typecheck` этого не ловит.
      - ✅ **Этап 4 закрыт (2026-08-09):** зафиксирован TS-интерфейс `UIKit` под
      `@letar/forms-core/uikit` (~20 примитивов). Реализованы и используются:
      `FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`. Типизированы без
      адаптера: `NumberInput`/`NativeSelect`/`Combobox`/`RadioGroup`/`SegmentGroup`/`PinInput` +
      layout. Три показательных поля (`Field.String`, `Field.Checkbox`, `Field.Select` —
      текстовое/бинарное/выборное со сложным compound-API) переведены на потребление контракта
      через `chakraUIKit` вместо прямого импорта Chakra. Публичный API не менялся, 750/750
      тестов зелёные. Побочно найден и исправлен баг предыдущей сессии: вычисленный
      `formsCoreAlias` в `vitest.config.ts` был добавлен, но не подключён; при подключении
      вскрылась вторая проблема — `rollup-plugin-alias` матчит по префиксу, bare
      `@letar/forms-core` обязан сортироваться после всех подпутей. Детали —
      `PLAN_COMPLETED.md`.
      - ✅ **Этап 5 закрыт (2026-08-09):** документация всех 6 групп — `libs/forms/README.md`
      (раздел про архитектуру ядра), `CHANGELOG.md` + версия 1.4.7, `libs/forms-core/README.md`
      (написан с нуля, был заглушкой генератора). Demo-приложения не тронуты — внутренний
      рефакторинг без нового пользовательского API.
      - **🎉 Фаза 7.1 полностью завершена.** Итог: `libs/forms-core` — самостоятельный
      dependency-free пакет с 15 subpath-экспортами + типовым UIKit-контрактом, готовый фундамент
      под 7.3 (shadcn-скин) и 7.8 (Vue-пруф).
- [x] **7.2 Standalone-проверка** — ✅ диагностика + фикс завершены 2026-08-09 (forms-dev). Ками
      выбрал вариант (б): `tsup dts: true` вместо отдельного `tsc --project tsconfig.publish.json`
      прохода (тот же structural-fix принцип, что и у vitest-alias находки). Thread
      `forms-phase7-1-core-split`.
      - **Метод:** `nx run "@letar/forms:build:npm"` → `npm pack` дистрибутив → чистый scratch-проект
      ВНЕ монорепо (`C:\Users\Kami\...\Temp\...\scratchpad\forms-standalone-check`, свой
      `node_modules`, без `@letar/source` condition) → `npm install <tarball>` → минимальная форма
      с `Form.Field.Phone` (тянет `@letar/forms-core/phone`) → `tsc --noEmit` + рантайм-резолв
      через `node --input-type=module -e "import('@letar/forms/fields/specialized')"`.
      - **Рантайм (JS) — работает из коробки.** `noExternal: ['@letar/forms-core']` в
      `tsup.config.ts` инлайнит весь `forms-core` внутрь бандла `forms` — в `dist/*.js` нет ни
      одного нерезолвленного `import`/`require` на `@letar/forms-core` (только оставленные
      esbuild source-комментарии с путём). ESM-резолв subpath `@letar/forms/fields/specialized`
      через обычный `node_modules` подтверждён живым импортом в Node — экспорты (`FieldPhone` и
      другие) приходят корректно.
      - **🔴 `.d.ts`-генерация для публикации СЛОМАНА — до этой сессии, не мной внесено.**
      `nx run "@letar/forms:build:npm"` падает на шаге `tsc --project tsconfig.publish.json`:
      80 ошибок TS6059 (`forms-core` не под `rootDir: "src"` пакета `forms`) + TS6307 (файлы
      `forms-core` не входят в `include` `tsconfig.publish.json`). Из-за этого `tsc`-шаг падает
      ДО того как отработают `cp package.publish.json dist/package.json` и остальные —
      `dist/package.json`/`README`/`LICENSE` тоже не создаются при обычном прогоне таргета.
      Итог — если бы кто-то опубликовал `@letar/forms` на npm прямо сейчас через
      `nx run "@letar/forms:build:npm" && npm publish`, публикация вообще не прошла бы (build
      падает с ненулевым кодом); при принудительном/частичном прогоне ушёл бы пакет без единого
      `.d.ts` — TS-потребитель получил бы `TS7016: Could not find a declaration file`, что и
      воспроизведено в scratch-проекте (единственная оставшаяся ошибка `tsc --noEmit` после того,
      как я вручную дособрал `dist/` через `cp`-шаги и добавила `@types/react` в сам scratch,
      чтобы не путать чужую ошибку со своей).
      - **Корень:** `tsconfig.publish.json` пакета `forms` не обновлялся вместе с ростом
      subpath-экспортов `forms-core` за Фазу 7.1 — в `paths` всего 8 записей (`validators/ru`,
      `schema`, `server-errors`, `utils`, `security`, `offline`, `captcha`, `analytics`), а
      `forms-core` сейчас отдаёт 15 (плюс `credit-card`/`phone`/`table`/`address`/`i18n`/`uikit`
      появились уже после того, как `tsconfig.publish.json` в последний раз правили). `rootDir`
      жёстко `"src"` — то же семейство TS6059/TS6307, что задокументировано в
      `.claude/docs/libs.md` для приложений-потребителей библиотек, только здесь внутри самой
      публикующей библиотеки.
      - **НЕ чинила** — по инструкции координатора это архитектурный вопрос (два варианта решения:
      (а) `rootDir` пакета `forms` расширить до общего корня + догнать `paths` до всех 15
      подпутей, либо (б) раз `forms-core` физически инлайнится и не существует для потребителя
      как отдельный пакет — можно генерировать `.d.ts` иначе, например через `dts: true` в самом
      `tsup` вместо отдельного `tsc`-прохода, что заодно избавит от рассинхрона `paths`). Решение
      — за координатором/Ками.
      - **Отдельно:** `forms-core` **не имеет и не должен получить свой `build:npm`** — комментарий
      в `tsup.config.ts` («`@letar/forms-core` — не npm-пакет, Фаза 7.1, ядро без публикации —
      вбандливается внутрь») говорит, что архитектурно пакет задуман только как internal-зависимость
      `forms` (и будущих `forms-shadcn`/`forms-vue`), не как самостоятельный npm-пакет. Заводить
      для него `build:npm`/`publish:npm` «по аналогии» с `forms`, как буквально просил первый
      пункт задачи, значило бы противоречить уже принятому архитектурному решению — не стала
      этого делать, зафиксировала расхождение здесь.
      - **✅ Фикс (вариант б) реализован и проверен 2026-08-09:**
      - `tsup.config.ts`: `dts: false` → `dts: true` — декларации теперь генерирует сам tsup
      (rollup-plugin-dts) per-entry, синхронно со списком `entry`, структурный рассинхрон
      `paths` больше невозможен по построению.
      - `project.json` → `build:npm`: убран отдельный шаг `tsc --project tsconfig.publish.json`
      из списка команд — декларации больше не генерируются вторым проходом.
      - `tsconfig.publish.json`: убраны `composite`/`outDir`/`rootDir` — они принадлежали
      tsc-project-build режиму (`composite: true` включал строгую проверку TS6307 «файл не в
      явном списке проекта», `rootDir: "src"` давал TS6059 на файлы `forms-core` вне
      `libs/forms/src`); ни одно из этих полей tsup не использует для `dts: true`. `paths`
      догнан до всех 15 subpath-экспортов `forms-core` (было 8), `include` явно добавил
      `../forms-core/src/**/*.ts` — на случай если rollup-plugin-dts начнёт учитывать
      `include` для отсутствующих в графе файлов.
      - Промежуточная находка при отладке: сразу после включения `dts: true` (ещё с
      `composite: true` в конфиге) сборка падала на **другом** TS6307 — уже не по
      `forms-core`, а по соседним файлам внутри самого `libs/forms/src` (например
      `field-editable.tsx` из `form-fields/text/index.ts`). Причина — `composite: true`
      заставляет TS требовать явный список файлов даже для tsup'ного мульти-entry прохода,
      где каждый entry обрабатывается как собственный синтетический "project ''". Снятие
      `composite` убрало сразу оба класса ошибок (и по `forms-core`, и по соседним файлам
      `forms`), не только тот, что был найден в диагностике.
      - **Проверка:** `nx run "@letar/forms:build:npm"` проходит целиком — 12 `.d.ts` для всех
      entry points (`index`, `offline`, `i18n`, `fields/*` ×6, `server-errors`, `analytics`,
      `validators/ru`), все `cp`-шаги (`package.json`/`README`/`LICENSE`/`CHANGELOG`)
      отрабатывают. `nx run "@letar/forms:typecheck:tsgo"` и `nx run "@letar/forms:test"`
      (весь тестовый набор) — зелёные, обычный workspace-путь не задет (`tsconfig.lib.json`
      отдельный от `tsconfig.publish.json`, тестировавшийся файл не участвует в build:npm).
      - **Финальная проверка в чистом scratch-проекте** (тот же вне монорепо, что и в
      диагностике): `npm pack` нового `dist/` → чистая переустановка (`rm -rf node_modules
          package-lock.json && npm install` — первая переустановка без чистки лока молча
      использовала закешированный по integrity-хешу старый tarball, версия `1.2.0` не менялась
      между итерациями теста, это артефакт тестового стенда, не продукта) → `tsc --noEmit`
      зелёный, exit code 0, `TS7016` больше нет. Негативный контроль — намеренно добавленный
      несуществующий проп `thisPropDoesNotExist` на `Form.Field.Phone` даёт `TS2322` с точным
      списком реальных пропсов поля: типы не `any`-заглушка, а настоящие сгенерированные
      декларации.
      - Изменённые файлы: `libs/forms/tsup.config.ts`, `libs/forms/project.json`,
      `libs/forms/tsconfig.publish.json`.
      - Полный отчёт — в тред `forms-phase7-1-core-split` (agent-mail).
- [ ] **7.3 `@letar/forms-shadcn` beta** — 15–20 ходовых полей (Input/Textarea/Number/Select/Checkbox/Radio/Date).
      Покрывает ~80% форм. Тяжёлые (RichText/Table/Signature/Combobox) — «Chakra-only пока».
      🔄 **В работе с 2026-08-09 (forms-dev), но переосмыслена по ходу.** Аудит перед стартом
      показал: Этап 4 Фазы 7.1 закрыл только слой **контролов**, а сборка формы ниже уровня поля
      по-прежнему шла мимо контракта. Пока это не исправлено, shadcn-скин не может быть тонким —
      ему пришлось бы либо тянуть Chakra транзитивно через `@letar/forms`, либо дублировать всю
      form-wiring логику. Решение Ками — вариант (а): расширять слои, а не дублировать.
      - ✅ **Шаг 1 (аудит) закрыт.** Найдено 9 точек связанности композиционного слоя. Важная
      поправка к первоначальной оценке: `createForm()`, `form-context`, `form-root`
      (`FormSimple`/`FormWithApi`), `form-group-declarative`, `form-group-list-declarative` и
      большая часть `form-fields/base/` (`base-field`, `use-resolved-field-props`, `field-utils`,
      `use-debounce`, `use-async-search`, `use-async-field-validation`, `autocomplete-map`) —
      **уже Chakra-free**, вопреки опасению, что «composition завязан на Chakra целиком».
      Объём потребителей: `createField` — 38 файлов, `FieldLabel` — 27, `FieldWrapper` — 13.
      - ✅ **Шаг 2 (расширение контракта) закрыт** — v1.5.0 / forms-core v0.2.0. Добавлены
      примитивы `Tooltip`/`RequiredIndicator`/`ErrorFallback` + расширенные `Button`/`IconButton`;
      на контракт переведены `FieldWrapper`, `FieldErrorBoundary`, `FieldLabel` и обе кнопки
      массива. 754/754 теста зелёные (было 750 — +12 на `groupOptions`, +4 на
      `FieldErrorBoundary`, который вообще не был покрыт), оба негативных контроля пройдены,
      Add/Remove и `tone: 'danger'` проверены живым кликом в Chromium на `form-develop-app`.
      - **Две находки, каждая — отдельный класс протечки:**
      1. **Стилевые токены сквозь границу.** `FieldWrapper` красил рамку `css`-пропом
      (`borderColor: 'blue.200'`), кнопка удаления несла `colorPalette="red"` — типы сходились,
      но конкретная UI-библиотека протекала насквозь. Заменено семантикой: `validating?: boolean`
      у `FieldRoot`, `tone: 'danger'` у кнопок. Правило записано в `libs/forms-core/README.md`.
      2. **Протечка на уровне ДАННЫХ, а не рендера.** `useGroupedOptions` возвращал
      `createListCollection` — рантайм-структуру Ark UI, обязательную как проп `collection` для
      `Select`/`Combobox`/`Listbox`. Примитивом UIKit это не подменяется: у shadcn такой функции
      нет вовсе. Чистая группировка вынесена в `@letar/forms-core/uikit`
      (`groupOptions`/`hasGroups`/`getOptionLabel`), построение коллекции осталось адаптеру.
      - ✅ **Шаги 3-4 закрыты** — v1.6.0, новый пакет `@letar/forms-react` v0.1.0. Блокер снят
      решением Ками 2026-08-09: заводим третий пакет, правило «`forms-core` не импортирует ни
      один фреймворк» (2026-07-08) остаётся неприкосновенным. Инструкция «перенести в
      `forms-core`» была невыполнима как написана — это React (хуки, JSX,
      `@tanstack/react-form`), а ядро защищено двумя независимыми механизмами.
      - **Что переехало:** `createField`, `FieldWrapper`, `FieldErrorBoundary`, контекст формы,
      `FormGroup`, хуки поля (`useResolvedFieldProps`, `useDeclarativeField`,
      `useAsyncFieldValidation`, `useAsyncSearch`, `useDebounce`), `field-utils`,
      `autocomplete-map`, React-часть i18n, UI-независимые типы (`BaseFieldProps`,
      `DeclarativeFormContextValue`, `ResolvedFieldProps`).
      - **Что осталось в скине — намеренно:** `uikit-chakra.tsx`, `field-label.tsx`,
      `field-tooltip.tsx`, `selection-field-label.tsx`, `field-error.tsx` (вынесен из
      `create-field.tsx`), `use-grouped-options.ts`, `form-group-list-sortable.tsx`. Это Chakra-код,
      он и есть реализация контракта — в UI-library-free пакет он физически не может переехать,
      иначе новая линт-граница упала бы на первом же импорте.
      - **Механизм связывания:** `createFieldPrimitives(uikit)` — фабрика, вызываемая один раз на
      уровне модуля скина (`form-fields/base/primitives.ts`). Не контекст и не проп: компоненты
      должны быть стабильны по ссылке, иначе React размонтирует поддерево поля на каждой
      перерисовке формы.
      - **Ни одно из 56 полей не правилось** — на местах переехавших модулей стоят
      реэкспорт-шимы. Публичный API `@letar/forms` не изменился.
      - **Проверки:** 678 тестов в `forms` + 76 в `forms-react` (было 754 в одном — сходится
      файл-в-файл); `typecheck:tsgo` зелёный на 20 потребителях, включая шесть приватных;
      обе линт-границы `forms-react` (тег + `no-restricted-imports`) подтверждены негативной
      пробой; живая проверка в Chromium — рендер `fields-demo`, валидация с `data-invalid` +
      `error-text`, async-путь (`Username занят`).
      - **Побочная находка — техдолг 7.1.** Потребители держали 9 подпутей `forms-core` из 15.
      Всплыло сразу, как только композиционный слой начал импортировать `/uikit`, `/i18n`,
      `/address`. Дописан полный набор во все 17 приложений, чтобы следующее такое использование
      не ломало их заново.
      - ✅ **Дефект публикации `.d.ts` закрыт.** Был: `noExternal` инлайнит внутренние `@letar/*`
      только в JS, а в `dist/*.d.ts` оставались импорты `@letar/forms-core/...`, которых в npm
      нет (существовал с Фазы 7.1 — 7.2 закрыла проход сборки, но содержимое `.d.ts` не
      проверяли). **Причина, по которой `dts: { resolve: [...] }` выглядел неработающим:** tsup
      строит `external` для dts-прохода как `dependencies + peerDependencies`, и всё оттуда
      rollup помечает внешним **до** плагинов — резолвер не вызывается вообще (видно по
      `DEBUG=tsup:ts-resolve`: bare-пакетов в логе нет ни одного, только относительные пути).
      Фикс structural, а не точечный: внутренние слои переехали в `devDependencies`, где им и
      место — потребитель их не устанавливает. Проверено установкой `npm pack`-тарбола в чистый
      проект вне монорепо: `tsc --noEmit` зелёный, негативный контроль `name={42}` → `TS2322`.
      - ✅ **Побочная находка scratch-проверки закрыта (2026-08-10): два разных `BaseFieldProps`.**
      Решение Ками — переименовать легаси-тип. `src/lib/types.ts` (`label?: string`, старый
      `ChakraFormField`-API) → `LegacyFieldProps`; имя `BaseFieldProps` освобождено и теперь
      публично экспортирует реальный тип из `forms-react` (`label?: ReactNode`, `tooltip`,
      `asyncValidate`), от которого фактически наследуются все 56 полей. Мажорный бамп — v2.0.0.
      Проверено: ни одно приложение монорепо не импортировало `BaseFieldProps` напрямую.
      - ✅ **paths-находка letar-dev закрыта (2026-08-10): те же 6 подпутей `@letar/forms`
      (не `forms-core`) были неполными в 19 приложениях** (`/analytics`, `/i18n`, `/offline`,
      `/server-errors`, `/testing`, `/validators/ru`) — та же схема, что чинила аналогичный пробел
      у `forms-core`. Шесть private submodule (aboi, domwellbes, driving-school, dsperevod,
      studio, svoichuzhie) закоммичены и запушены отдельно внутри своих репо.
      - ✅ **Шаг 5 (`forms-shadcn`) — в работе, 32 из 56 полей на 2026-08-10** (детали каждого поля
      и находки — ниже по разделу). Добро координатора получено 2026-08-10. Зависимости установлены в корневой `package.json` по конвенции репо (реальные
      версии в корне, у библиотеки — `peerDependencies` с диапазоном): десять Radix-примитивов
      (`checkbox`, `select`, `radio-group`, `label`, `slot`, `popover`, `tooltip`, `switch`,
      `toggle-group`, `slider`) + `class-variance-authority` 0.7.1, `clsx` 2.1.1,
      `tailwind-merge` 3.6.0. `tailwindcss` 4.3.3 и `lucide-react` 1.30.0 уже были. Установка
      проверена компиляционной пробой (`Radix` + `cva` + `twMerge` + иконка) с негативным
      контролем: `tone="rainbow"` даёт `TS2322`, то есть типы настоящие, а не `any`.
      - **Решение по организации скина: прямые Radix-примитивы + `cva`/`tailwind-merge`, а НЕ
      `shadcn` CLI.** Причины: (1) CLI копирует готовые компоненты в проект и требует
      `components.json` со своим алиас-резолвом — для библиотеки в Nx это лишний слой генерации,
      который CLI потом не умеет обновлять; (2) нам нужны не компоненты shadcn как таковые, а
      реализация UIKit-контракта, поэтому копия shadcn-компонента была бы промежуточным слоем
      без пользы; (3) Radix + cva + tailwind-merge — ровно то, из чего shadcn и состоит, классы
      те же, визуальная совместимость сохраняется.
      - ⚠️ **Цена решения, которую надо задокументировать потребителю:** скин требует Tailwind 4 на
      стороне приложения, и в Tailwind 4 сканирование контента идёт через `@source` — без записи
      на путь пакета классы будут вычищены как неиспользуемые. Для наших приложений скин
      бесполезен (все на Chakra) — это пакет для внешней OSS-аудитории.
      - **Демо-площадка есть:** `apps/form-docs` уже на Tailwind 4 (`@import 'tailwindcss'` в
      `globals.css`, Fumadocs). `form-develop-app` и `form-example` — на Chakra, туда shadcn-демо
      не поставить без отдельной настройки.
      - ✅ **Каркас + первые 3 поля готовы (2026-08-10).** `libs/forms-shadcn` создан
      (`nx g @letar/generators:new-lib forms-shadcn --react`), `paths` на все 15 подпутей
      `forms-core` + `forms-react` в `tsconfig.lib.json`, `resolve.alias` в `vitest.config.ts`
      (та же `buildFormsCoreAlias`, что у `forms-react`, + вручную добавленный алиас на
      `forms-react`), тег `type:ui` (депендс-констрейнты те же, что у `@letar/forms`).
      - **`shadcnUIKit`** (`src/lib/uikit/uikit-shadcn.tsx`) реализует `UIKitCorePrimitives`
      целиком (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`) + `ErrorFallback`
      из extended — минимум, нужный `createFieldPrimitives` и трём полям. Прямые Radix-примитивы
      (`@radix-ui/react-checkbox`, `-label`, `-select`) + `cva`-стиль классов Tailwind (без cva
      как runtime-зависимости пока не понадобились варианты — только statiс-классы + `cn()`).
      - **Главная проверка архитектуры подтверждена: ни `forms-core`, ни `forms-react` не
      потребовалось менять.** `FieldString`/`FieldCheckbox`/`FieldSelect` — прямые аналоги
      Chakra-версий, тот же `createField`/`resolved`/`componentProps` API, только другой UIKit.
      - **Тесты:** 6 тестов (RTL + jsdom) на 3 поля через собственный `TestForm` (минимальный
      `useForm()` + `DeclarativeFormContext.Provider`, без полного `createForm()` — тот живёт в
      UI-скинах). Негативный контроль пройден (`type="rainbow"` → `TS2322` под `@ts-expect-error`).
      `Select`-тест не открывает выпадающий список (Radix `hasPointerCapture` не эмулируется в
      jsdom без мока) — проверяет только триггер/label.
      - ⚠️ **Известный пре-существующий лint-баг унаследован, не мой регресс:** `vitest.config.ts`
      падает на `@nx/enforce-module-boundaries` из-за относительного импорта
      `../forms-core/testing/vitest-alias` — та же ошибка уже есть у `forms-react` (не чинила,
      не в скоупе Шага 5).
      - ⚠️ **Живая браузерная проверка отложена до дев-харнесса.** `form-docs` технически на
      Tailwind 4, но там же живёт `ChakraProvider` для остальных демо — класть туда shadcn-демо
      сейчас означало бы ровно тот конфликт стилей, ради которого Ками решил не расширять
      `form-develop-app` (см. решение выше). Type-check + RTL-тесты — единственная проверка на
      этом шаге; визуальная — когда появится `form-develop-app-shadcn`.
      - **Известные упрощения beta** (см. `libs/forms-shadcn/README.md`): tooltip у `FieldLabel` —
      нативный `title`, не полноценный Radix Tooltip; нет группировки опций в `Select`.
      - ✅ **+5 полей (2026-08-10): Textarea/Number/RadioGroup/SegmentGroup/Date — 8 из 15-20.**
      Приоритет — по указанию координатора (покрыть ещё не проверенные UIKit-примитивы, а не
      плодить варианты String).
      - `NumberInput`/`RadioGroup`/`SegmentGroup` добавлены в `shadcnUIKit` (extended-контракт
      `forms-core` их уже типизировал в Этапе 4 — реализация только дописана, не менялся);
      `Textarea` и `Date` намеренно НЕ пошли через UIKit-примитив — тот же паттерн, что и у
      Chakra-скина (`libs/forms/.../form-fields/text/field-textarea.tsx` рисует Chakra
      `Textarea` напрямую внутри `FieldWrapper`, не через контракт): многострочный текст не
      входит в core-контракт, а `FieldWrapper` (Root+Label+Error) и так skin-agnostic сам по
      себе — оборачивать в отдельный примитив ради одного скина смысла не было.
      - `RadioGroup` — `@radix-ui/react-radio-group`; `SegmentGroup` — `@radix-ui/react-toggle-group`
      (`type="single"`, с защитой от снятия выбора кликом по активному сегменту — Radix
      ToggleGroup умеет выключать активный элемент, контракт `SegmentGroupProps` этого не
      предполагает). Оба пакета уже стояли в корневом `package.json` (установка Шага 5),
      добавлены в `peerDependencies` `libs/forms-shadcn/package.json` — были пропущены при
      установке, потому что тогда ещё ни одно поле их не использовало.
      - `FieldDate` — beta-упрощение, нативный `<input type="date">` через существующий core
      `Input` (контракт уже поддерживает `type`), не полноценный date picker с попапом —
      соразмерно тому, что уже документировано как beta-упрощение для `Select`/`FieldLabel`.
      - **Протечек границы не найдено** — все 5 полей легли на контракт без правок `forms-core`
      или `forms-react`.
      - **Проверки:** 18/18 тестов (RTL + jsdom, `npx vitest run` в `libs/forms-shadcn`, было
      6 → 18); `typecheck:tsgo` зелёный; негативный контроль на всех 5 новых полях одним
      прогоном (`min="rainbow"` → `TS2322`, `options` обязателен у RadioGroup/SegmentGroup,
      `rows="rainbow"` → `TS2322`, лишний проп у `FieldDate` → `TS2322`) — временный файл вне
      индекса, прогнан `tsgo --noEmit` и удалён, в git не попал.
      - ✅ **+5 полей (2026-08-10, тем же заходом): NativeSelect/Switch/Slider/Password/Combobox
      — 13 из 15-20.**
      - `NativeSelect` и `Combobox` добавлены в `shadcnUIKit` как extended-примитивы (оба уже
      типизированы в `forms-core` с Этапа 4, реализация только дописана). `Switch`/`Slider`
      рисуются напрямую в поле — их нет и в самом контракте `UIKitExtendedPrimitives`, тот же
      принцип, что у `Textarea`/`Date` (см. выше): расширять контракт примитивом, у которого
      пока один потребитель, не нужно.
      - **`FieldCombobox` — единственное поле с осознанным сужением скоупа против Chakra-версии:**
      только статичные `options`, фильтрация по вхождению подстроки в `label` на стороне
      поля (не в `shadcnUIKit.Combobox` — примитив принимает уже отфильтрованный список,
      симметрично тому, как Chakra-версия фильтрует в `useFieldState` до `Combobox.Root`).
      Без `useQuery`/debounce/группировки — портировать async-поиск целиком не входило в
      задачу «доказать контракт», это отдельный объём работы. Реализация — `Popover` (Radix)
      как якорь под текстовым инпутом + список `div[role=option]`, без `cmdk`/полноценного
      command-паттерна.
      - `FieldPassword` — `shadcnUIKit.Input` (уже в контракте) + toggle-кнопка видимости,
      без UIKit-примитива для самой кнопки (аналогично Chakra: там тоже `IconButton` вставлен
      напрямую, не через контракт).
      - **Протечек границы снова не найдено** — `forms-core`/`forms-react` не менялись.
      - **Побочная находка инфраструктуры:** Radix `Slider` вызывает `ResizeObserver` (меряет
      трек), которого нет в jsdom — тест падал `ResizeObserver is not defined` через
      `FieldErrorBoundary` (само по себе доказательство, что error boundary работает). Фикс —
      минимальный no-op стаб в `vitest.setup.ts`, тот же принцип, что уже описан для
      `Select`-теста в jsdom (Шаг 5, первая часть): окружение для тестов беднее браузера,
      дыры чинятся точечно по мере появления, не превентивно.
      - **Проверки:** 29/29 тестов (было 18); `typecheck:tsgo` зелёный; негативный контроль
      пройден на всех 5 полях одним прогоном (обязательные `options` у `NativeSelect`/
      `Combobox`, `min="rainbow"`/`maxLength="rainbow"` → `TS2322`, лишний проп у
      `FieldSwitch` → `TS2322`).
      - ✅ **+1 поле (2026-08-10, тем же заходом): PinInput — 14 из 15-20.**
      - `PinInput` добавлен в `shadcnUIKit` как extended-примитив (типизирован в `forms-core` с
      Этапа 4). Нативные `<input maxLength=1>` в ряд + `useRef`-массив для автоперехода
      фокуса между ячейками при вводе/Backspace — без сторонней либы, Radix не даёт
      готового PinInput-примитива, как и Chakra не использует Ark UI для этого поля тоже
      не через сторонний пакет.
      - **Известное упрощение (beta):** нет вставки кода из буфера обмена одним действием
      (paste на первую ячейку раскладывает по всем) — только посимвольный ввод.
      - Протечек границы не найдено.
      - **Проверки:** 32/32 теста (было 29); `typecheck:tsgo` зелёный; негативный контроль
      (`length="rainbow"` → `TS2322`, лишний `placeholder` → `TS2322`).
      - ✅ **+3 поля (2026-08-10, тем же заходом): Hidden/Rating/Tags — 17 из 15-20, план
      перевыполнен.**
      - `FieldHidden` — не идёт через `createField`/`UIKit` вообще: не рендерит DOM, только
      синхронизирует внешний `value` с form state через `useResolvedFieldProps` напрямую
      (`useEffect`), портирован как есть из Chakra-версии — там тоже без UIKit, потому что
      рендерить нечего.
      - `FieldRating` — ряд кнопок-звёзд (`lucide-react` `Star`), `FieldTags` — нативный инпут
      + чипы с Enter-добавлением. Оба не входят в UIKit-контракт, тот же принцип, что у
      `Switch`/`Slider`/`Textarea`/`Date`.
      - **Известные упрощения (beta):** `FieldTags` — только Enter добавляет тег, без
      кастомного `delimiter`/`addOnPaste` (вставка с несколькими разделителями не
      разбирается на несколько тегов).
      - Протечек границы не найдено — все 17 полей легли на существующий контракт без единой
      правки `forms-core`/`forms-react` за весь Шаг 5.
      - **Проверки:** 39/39 тестов (было 32); `typecheck:tsgo` зелёный; негативный контроль
      на всех 3 полях (лишний `label` у `FieldHidden`, `count="rainbow"`/`maxTags="rainbow"`
      → `TS2322`).
      - **Итог Шага 5 на 2026-08-10: 17 полей, план (15-20) выполнен в середине диапазона.**
      Оставшиеся кандидаты из плана Фазы 7.3 — RichText (Tiptap), FileUpload (своя
      инфраструктура загрузки), Address (DaData-провайдер), DateRange/DateTimePicker/Duration —
      каждый требует заметно больше инфраструктуры, чем уже смигрированные (внешние либы или
      сложная составная логика), и не добавляет новой уверенности в UIKit-контракте — все
      использованные им примитивы уже проверены. Решение о том, продолжать ли до полных 56 или
      остановиться здесь и перейти к дев-харнессу — за координатором/Ками.
      - ✅ **Решение принято (2026-08-10): остановиться на 17 ради визуальной проверки в
      дев-харнессе, не насовсем.** Оставшиеся поля (RichText/FileUpload/Address/DateRange/
      DateTimePicker/Duration и т.д. до полных 56) — не отменены, а отложены: 17 хватало,
      чтобы прогнать живую проверку в браузере и закрыть Шаг 5 как контрольную точку. Полный
      паритет с `@letar/forms` (Chakra-скин) — по-прежнему цель `forms-shadcn` в конце Фазы 7.3,
      просто не в этом заходе. Не считать 17 финальным скоупом при дальнейшем планировании.
      Поднял дев-харнесс.
      `apps/form-develop-app-shadcn` создан (`nx g @letar/generators:new-app`, Chakra-каркас
      заменён на Tailwind 4 + shadcn CSS-переменные — тот же конфликт стилей, из-за которого
      не расширяли `form-develop-app`). Демо-страница со всеми 17 полями через `DemoForm` —
      временный локальный form-root (`useForm` + `DeclarativeFormContext`), поскольку
      `@letar/forms-shadcn` пока не несёт свой `Form`/`createForm()` (отдельная задача,
      не входила в Шаг 5).
      - **Живая проверка в Chromium подтвердила все интерактивные поля**, включая находку
      инструмента автоматизации (не бага в коде): `computer{action:"key", text:"Return"}`
      в этом окружении не всегда проставляет `event.key === 'Enter'` — `FieldTags`
      выглядел сломанным, пока не проверили настоящим `KeyboardEvent({key:'Enter'})` через
      `dispatchEvent`, после чего тег добавился корректно. Стоит держать в голове при
      следующих e2e/browser-проверках `Enter`-логики в этом харнессе.
      - `paths` без `references` в `tsconfig.json` сразу — известный `TS6305`-редирект
      (`.claude/rules/libs.md`), пойман и исправлен на этапе генерации, не постфактум.
      - `typecheck:tsgo`/`lint` зелёные. Юнит-тестов нет — харнесс визуальный, не
      регрессионный гейт (в отличие от `form-develop-app` с его 21 e2e).
      - Зафиксирован триггер выноса CSS-переменных `globals.css` этого харнесса в саму
      библиотеку — не сейчас (единственный потребитель), а как только появится второй.
      Раздел «CSS-переменные для потребителей» в
      [`libs/forms-shadcn/README.md`](../forms-shadcn/README.md).
      - ✅ **Документационный цикл `forms-shadcn` закрыт (2026-08-10, forms-dev).** По итогам
      обсуждения с координатором (тред `forms-phase7-3-shadcn`) — README уже был release-ready
      (требования потребителя, CSS-переменные, таблица 17 полей, известные упрощения beta,
      подключение к приложению), не хватало только `CHANGELOG.md`. Создан по формату Keep a
      Changelog, версии 0.1.0→0.5.1 восстановлены из `git log -- libs/forms-shadcn/` (7
      коммитов, каждый — отдельная запись). `package.json` версия поднята 0.5.0 → 0.5.1 (сама
      запись о доккоммите). `createForm()`/`Form` для `forms-shadcn` — сознательно НЕ сделан в
      этом заходе, отдельная задача в бэклоге ниже (демо-харнесс работает на временном
      `useForm()+DeclarativeFormContext`, этого достаточно, пока задача — доказать
      `UIKit`-контракт, а не дать готовый паттерн внешним пользователям).
- [ ] **Backlog:** `createForm()`/`Form` form-root для `@letar/forms-shadcn` — сейчас пакет отдаёт
      только отдельные `Field*`-компоненты, сборка формы (`initialValue`/`onSubmit`/`Form.Button.Submit`
      и т.д.) у потребителя нет; `apps/form-develop-app-shadcn` временно обходится локальным
      `useForm()+DeclarativeFormContext`. Не блокирует 7.4/7.5 — нужен ближе к тому, как скин станет
      публичным npm-пакетом для внешних пользователей.
- ✅ **Унаследованный lint-баг `@nx/enforce-module-boundaries` в `vitest.config.ts` починен
  (2026-08-10, forms-dev).** Задача от координатора (тред `forms-phase7-3-shadcn`), баг был
  общий для `forms`/`forms-react`/`forms-shadcn` — все три относительным путём импортировали
  `buildFormsCoreAlias` из `libs/forms-core/testing/vitest-alias.ts`, лежавшего вне `src/` без
  записи в `exports`. Функция перенесена в `libs/forms-core/src/lib/testing/index.ts`, новый
  subpath-экспорт `@letar/forms-core/testing`. **Находка:** промежуточный реэкспорт-шим
  (`index.ts` → `export from './vitest-alias'`) не сработал — `vitest.config.ts` резолвится
  нативным Node-загрузчиком плагина `@nx/vitest` при построении графа проектов, а не
  Vite-бандлером; тот не умеет extensionless относительные импорты внутри `.ts`-модуля,
  полученного через bare-специфайер пакета (`Cannot find module '...vitest-alias'`), хотя
  прямой относительный импорт в самом `vitest.config.ts` это же самое разрешает без проблем.
  Фикс — вся реализация в одном файле `index.ts`, без внутреннего реэкспорта. Коммиты:
  `8dc49f3c` (forms-core), `7cc9cb46` (forms-react), `015fb539` (forms-shadcn), `68705f4c`
  (forms) — четыре отдельных, каждый по своему scope. Проверено: `nx lint`/`typecheck:tsgo`/
  `test` зелёные на всех четырёх пакетах (65с суммарно на тестах); остальные 38
  pre-existing проблем `nx lint forms` (`react-hooks/exhaustive-deps` и т.п.) — не в скоупе,
  не трогала.
- ✅ **`FieldAddress` добавлен — 18-е поле (2026-08-10, forms-dev), начало продолжения к
  паритету.** По уточнению координатора 17 полей — не финальный скоуп (см. выше). Переиспользует
  `shadcnUIKit.Combobox` (Popover + input, тот же примитив, что `FieldCombobox`) с
  async-подгрузкой подсказок из `AddressProvider` (`@letar/forms-core/address`) вместо
  статичного списка — провайдер резолвится в том же порядке, что у Chakra-версии (проп →
  `DeclarativeFormContext.addressProvider` → `token`-фолбэк на `createDaDataProvider`).
  Beta-упрощения: нет клавиатурной навигации стрелками/Escape по списку подсказок
  (Combobox-примитив UIKit её не поддерживает — только клик и Enter/Escape самого Popover) и
  нет визуального спиннера внутри инпута (`loading` прокинут как есть, текст «Загрузка...» в
  выпадающем списке). Протечек границы не найдено — легло на существующий `UIKit`-контракт без
  правок `forms-core`/`forms-react`.
  - Единственная находка: `eslint-disable-next-line react-hooks/exhaustive-deps` (портировано
    из Chakra-версии как есть) валит `nx lint forms-shadcn` — плагин `react-hooks` не
    зарегистрирован в этом воркспейсе, поэтому disable-комментарий на несуществующее правило сам
    по себе ошибка (`Definition for rule ... was not found`), тот же баг уже есть в
    `libs/forms/src/lib/utils/use-form-store-subscribe.ts` и в Chakra `field-address.tsx` (не
    чинила — не в скоупе). Обошла добавлением `fetchSuggestions` в зависимости эффекта вместо
    disable-комментария — `fetchSuggestions` стабилен по ссылке, пока не меняются
    `provider`/`minChars`/`locations`, включение в deps не добавляет лишних срабатываний.
  - **Проверки:** 5 новых RTL-тестов (44/44 в пакете, было 39), негативный контроль
    (`token={42}` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в Chromium на
    `apps/form-develop-app-shadcn` (мок-провайдер вместо DaData — токена в песочнице нет): ввод
    текста → debounce → подсказки в Popover → клик по подсказке → значение инпута обновилось,
    список закрылся — весь путь воспроизведён через `dispatchEvent`, а не только unit-тестами.
  - CHANGELOG/версия (`0.5.1` → `0.6.0`), README (таблица полей, «Известные упрощения») —
    обновлены.
- ✅ **`FieldDateRange` добавлен — 19-е поле (2026-08-10, forms-dev).** Опирается на уже
  проверенный `FieldDate` (нативный `<input type="date">`), два синхронизированных инпута
  (max начала = значение конца и наоборот) + опциональные пресеты (7 штук — сегодня/вчера/эта
  и прошлая неделя/этот и прошлый месяц/этот год).
  - **Находка 1:** UIKit-контракт `Input` не пропускает `min`/`max` (не нужны обычному
    текстовому полю) — пришлось рендерить нативный `<input>` напрямую с теми же tailwind-классами,
    что у `shadcnUIKit.Input`, вместо прогона через примитив контракта. Не протечка границы в
    смысле «контракт неполон для существующих полей» — просто DateRange первым понадобился
    HTML-атрибут, которого в контракте нет и не должно быть (остальные 18 полей его не используют).
  - **Находка 2:** `useId()` внутри `render`-функции `createField` валит
    `react-hooks/rules-of-hooks` — ESLint распознаёт хуки по имени функции-обёртки
    (`useFieldState` матчит как «это хук», `render` — нет). Решение — не городить id вообще:
    саб-лейблы С/По — `<span>`, не связанный `<label htmlFor>` (то же ограничение, что и с
    `min`/`max` — UIKit `Input` не пропускает `id` наружу).
  - **Пресеты — ряд кнопок, не выпадающее меню** (сознательное beta-упрощение, не находка):
    `@radix-ui/react-dropdown-menu` не установлена, заводить новую Radix-зависимость ради 7
    текстовых пунктов смысла не было — то же решение, каким был обход с Popover
    для Address/Combobox, только в другую сторону (там переиспользовали уже имеющийся Popover,
    здесь не стали добавлять новый примитив).
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 6 новых RTL-тестов (50/50 в пакете, было 44), негативный контроль
    (`orientation="diagonal"` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в
    Chromium на `form-develop-app-shadcn`: клик по пресету «Эта неделя» → оба инпута и
    крест-накрест min/max выставились верно (2026-08-10 — понедельник, диапазон
    2026-08-10..2026-08-16); ручное изменение начала через `dispatchEvent` пересчитало
    `end.min` синхронно.
  - CHANGELOG/версия (`0.6.0` → `0.7.0`), README — обновлены.
- ✅ **`FieldDuration` и `FieldDateTimePicker` добавлены — 20-е и 21-е поле (2026-08-10,
  forms-dev), одним заходом.** Обе опирались на уже проверенные примитивы: `FieldDuration` —
  на `shadcnUIKit.NumberInput` (полностью в UIKit-контракте, без единого обхода — в отличие от
  Address/DateRange), `FieldDateTimePicker` — на тот же паттерн нативного `<input>`, что
  `FieldDateRange` (UIKit `Input` не пропускает `min`/`max`/`step`).
  - `FieldDuration`: значение — число минут, формат `HH:MM` (два `NumberInput` рядом, клампинг
    часов/минут раздельно с пересчётом в минуты) или `minutes` (один `NumberInput`, клампинг
    напрямую). Тот же контракт значения, что у Chakra-версии.
  - `FieldDateTimePicker`: значение — строка ISO (`YYYY-MM-DDTHH:MM:00`), парсинг/сборка той же
    regex-схемой, что у Chakra. `type="time"` рендерится нативным `<input>` (не через UIKit —
    нужен `step` в секундах, которого в контракте нет), `type="date"` тоже нативный ради min/max.
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 9 новых RTL-тестов (59/59 в пакете, было 50), негативные контроли
    (`format="seconds"` → `TS2322` на Duration, `timeStep="15"` строкой вместо числа → `TS2322`
    на DateTimePicker), `typecheck:tsgo`/`lint` зелёные с первого прогона — обошлось без находок,
    характерных для предыдущих двух полей. Живая проверка в Chromium на
    `form-develop-app-shadcn`: изменение часов в Duration и раздельное изменение
    даты/времени в DateTimePicker (каждое сохраняет другую половину значения) — оба
    воспроизведены через `dispatchEvent`.
  - CHANGELOG/версия (`0.7.0` → `0.8.0`), README — обновлены.
- ✅ **`FieldPhone`, `FieldCurrency`, `FieldPercentage` добавлены — 22-е/23-е/24-е поля
  (2026-08-10, forms-dev), одним заходом.** Дешёвая тройка: `FieldPhone` вообще без новых
  Radix-зависимостей (переиспользует `@letar/forms-core/phone`, WebKit-safe форматтер маски
  из v1.4.4), `FieldCurrency`/`FieldPercentage` — тонкая обёртка вокруг уже проверенного
  `shadcnUIKit.NumberInput`.
  - `FieldPhone`: флаг страны (`showFlag`) — соседний `<span>`, не «приклеенный» бордер как
    `Group attached` у Chakra (в UIKit-контракте нет примитива для составных инпутов).
  - `FieldCurrency`/`FieldPercentage`: без живого Intl-форматирования значения внутри инпута
    при вводе (Chakra `NumberInput.Root formatOptions` форматирует посимвольно, аналога в
    UIKit-контракте нет) — символ валюты/`%` рядом с полем, определяется один раз через
    `Intl.NumberFormat().formatToParts` (Currency) или статичен (Percentage).
  - Протечек границы не найдено — все три легли на существующие примитивы/утилиты без единой
    правки `forms-core`/`forms-react`.
  - **Проверки:** 10 новых RTL-тестов (69/69 в пакете, было 59), негативные контроли
    (`country="XX"` → `TS2322` на Phone, `min="0"`/`max="100"` строкой вместо числа → `TS2322`
    на Currency/Percentage), `typecheck:tsgo`/`lint` зелёные с первого прогона. Единственная
    находка — не в коде: тест на плейсхолдер маски телефона сам был неверен (`mask.replace(/9/g,
    '_')` заменяет только цифру `9`, а не первый символ `+7` — литерал страны в маске остаётся),
    поймано и поправлено в самом тесте. Живая проверка в Chromium на
    `form-develop-app-shadcn`: ввод цифр телефона форматируется в маску `+7 (916) 123-45-67`
    вживую через `dispatchEvent`.
  - CHANGELOG/версия (`0.8.0` → `0.9.0`), README — обновлены.
- ✅ **`FieldAutocomplete` и `FieldListbox` добавлены — 25-е и 26-е поля (2026-08-10,
  forms-dev), одним заходом.** По пути пропущен `FieldMaskedInput` — сознательно, не забыто:
  Chakra-версия использует `use-mask-input` (imask), ту самую библиотеку, что пришлось выпилить
  из `FieldPhone` ещё в v1.4.4 Chakra-скина из-за WebKit-бага (мутация DOM в обход React,
  конфликт с controlled `value`). Реинтродукция той же зависимости в новый скин — не beta-
  упрощение, а реальный регресс; нужен общий framework-free mask-движок в `forms-core`
  (плейсхолдеры цифра/буква/алфанум, не только цифровые, как у `formatPhoneNumber`) — отдельная
  задача, не текущего захода. Также пропущен `FieldCreditCard` — у Chakra-версии это не
  `createField`-компонент, а отдельный compound (`CreditCardField`, 3 суб-поля с
  auto-focus-chain, brand-иконки, tooltip) — архитектурно не вписывается в паттерн остальных 26
  полей, отдельная оценка объёма нужна до начала.
  - `FieldAutocomplete`: переиспользует `shadcnUIKit.Combobox` (тот же примитив, что
    `FieldCombobox`), но `onInputChange` сразу пишет введённый текст в значение поля
    (`allowCustomValue`), не дожидаясь выбора из списка — как у Chakra-версии. Beta: только
    статичные `suggestions`, без `useQuery` (тот же статус, что у `FieldCombobox`); типы
    `emptyMessage`/`loadingMessage`/`size`/`variant`/`getLabel` из Chakra-версии сознательно НЕ
    портированы в props — примитив контракта их не поддерживает, декларировать неработающие
    пропы было бы вводящей в заблуждение поверхностью API.
  - `FieldListbox`: без отдельного Radix-примитива — обычные кнопки с `role="option"`/
    `aria-selected`, тот же визуальный класс, что у пунктов Combobox. Группировка через
    `groupOptions`/`getOptionLabel` из `@letar/forms-core/uikit` (framework-free утилита,
    добавлена ещё в Этапе 4 Фазы 7.1 — просто не была использована ни одним полем до сих пор).
  - Протечек границы не найдено — обе легли на существующие примитивы/утилиты.
  - **Проверки:** 11 новых RTL-тестов (80/80 в пакете, было 69), негативные контроли
    (`minChars="1"` строкой → `TS2322` на Autocomplete, `selectionMode="triple"` → `TS2322` на
    Listbox), `typecheck:tsgo`/`lint` зелёные с первого прогона. Живая проверка в Chromium на
    `form-develop-app-shadcn`: множественный выбор в Listbox (клики по разным опциям
    независимы — первая попытка теста показала ложный отрицательный результат из-за двух
    синхронных `dispatchEvent` без ре-рендера между ними, не бага компонента; с раздельными
    кликами оба выбора применились корректно), Autocomplete принял текст `Владивосток`,
    не входящий в `suggestions` — allowCustomValue подтверждён вживую.
  - CHANGELOG/версия (`0.9.0` → `0.10.0`), README — обновлены.
- ✅ **`FieldRadioCard` и `FieldCheckboxCard` добавлены — 27-е и 28-е поля (2026-08-10,
  forms-dev), одним заходом.** Тот же принцип, что у `FieldListbox` — вместо нового
  Radix-примитива обычные кнопки с ARIA-ролями (`role="radio"`/`role="radiogroup"` для
  RadioCard, `role="checkbox"`/`role="group"` для CheckboxCard), визуально card-стиль
  (border+ring на выборе) вместо мелких кружков/квадратов.
  - Beta: без `keyboardNavigation` (циклическая навигация стрелками, опциональна у
    Chakra-версии `FieldRadioCard`) — не портирована.
  - Протечек границы не найдено.
  - **Проверки:** 8 новых RTL-тестов (88/88 в пакете, было 80), негативные контроли
    (`orientation="diagonal"` → `TS2322` на обоих полях), `typecheck:tsgo`/`lint` зелёные с
    первого прогона. Живая проверка в Chromium на `form-develop-app-shadcn`: клик по карточке
    RadioCard/CheckboxCard переключает `aria-checked` вживую через `dispatchEvent`.
  - CHANGELOG/версия (`0.10.0` → `0.11.0`), README — обновлены.
- ✅ **`FieldCity` добавлен — 29-е поле (2026-08-10, forms-dev).** Тот же
  `AddressProvider`/`shadcnUIKit.Combobox`-паттерн, что `FieldAddress`, но значение — простая
  строка (имя города, извлечённое из `suggestion.data.city`/`.settlement`, фолбэк на
  `suggestion.value`), `bounds: { from: 'city', to: 'settlement' }` ограничивает подсказки.
  - **Известное ограничение (не протечка, архитектурный потолок примитива):** Chakra-версия
    сохраняет набранный вручную текст на `blur`, если пользователь не кликнул подсказку —
    `UIKitComboboxProps` не даёт колбэк `onBlur` (общий примитив с `FieldCombobox`/`FieldAddress`,
    им это не требовалось). Здесь значение обновляется только через выбор подсказки или полное
    стирание текста. Задокументировано в CHANGELOG/README как Known limitation, не тихо.
  - **Находка при написании теста (не регресс, вскрыла существующий паттерн):** тест с
    непустым `defaultValues` (`{ city: 'Казань' }`) вызвал React-warning «Cannot update a
    component while rendering a different component» — источник в самом паттерне инициализации
    `inputValue` из `field.state.value`, унаследованном от `FieldAddress`/Chakra: `useFieldState`
    не получает доступ к `field` (только `componentProps`), поэтому синхронизация с начальным
    значением поля вынужденно происходит в `render()` через ref-guard, а не в `useEffect`. У
    `FieldAddress` тот же код есть, просто ни один существующий тест не использует непустой
    `defaultValues` — путь остаётся непокрытым и предупреждение никогда не всплывало. Тест
    проходит (утверждения корректны), это только консольный warning в dev-режиме, не поломка —
    не чинила архитектуру походя (затронула бы и Address, и потенциально Chakra-паттерн), но
    зафиксировала здесь: если продолжать паттерн Address/City для будущих provider-полей —
    заранее знать про эту находку, возможный фикс — прокинуть `field` в `useFieldState` или
    переключить инициализацию на `useEffect` с зависимостью от `field.state.value`.
  - **Проверки:** 5 новых RTL-тестов (93/93 в пакете, было 88; тест на непустой
    `defaultValues` **специально оставлен** — фиксирует находку выше, а не скрывает её),
    негативный контроль (`token={42}` → `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая
    проверка в Chromium на `form-develop-app-shadcn` (мок-провайдер без `data.city` —
    подтверждён фолбэк на `suggestion.value`): ввод → debounce → подсказки → выбор → значение
    обновилось.
  - CHANGELOG/версия (`0.11.0` → `0.12.0`), README — обновлены.
- ✅ **Фикс находки выше (2026-08-10, forms-dev, задача от Ками, не из очереди `QuietRidge`):
  render-time `setState` в `FieldAddress`/`FieldCity` (обе версии — Chakra и shadcn) убран
  архитектурно, не патчем.** Симптом: React-warning «Cannot update a component while rendering a
  different component» на непустых `defaultValues` — `setInputValue()` вызывался синхронно в
  теле `render()`, которое исполняется внутри рендера `<form.Field>` (чужого компонента).
  - **Рассмотренные варианты и почему выбран не самый очевидный:**
    1. `useEffect` прямо внутри `render()` — технически исполняется в контексте `<form.Field>`
       (хук регистрируется по месту вызова), но нарушает Rules of Hooks: `<form.Field>` вызывает
       `children()` не на верхнем уровне своего рендера, а изнутри `useStore`/`useSyncExternalStore`
       — React ругается «Do not call Hooks inside useEffect(...), useMemo(...), or other built-in
       Hooks». Проверено эмпирически (полный тестовый прогон), отклонено.
    2. **Выбрано:** `CreateFieldOptions.useFieldState` теперь получает третий параметр —
       `FieldStateContext { form, fullPath }` — доступный уже на верхнем уровне `FieldComponent`,
       до монтирования `<form.Field>` (`libs/forms-react/src/lib/field/create-field-primitives.tsx`).
       `FieldAddress`/`FieldCity` читают живое значение поля через `useStore(form.store, () =>
       form.getFieldValue(fullPath))` (реэкспорт `@tanstack/react-store` из `@tanstack/react-form`)
       и синхронизируют `inputValue` в обычном `useEffect` внутри `useFieldState` — легальный
       хук на верхнем уровне компонента.
  - **Совместимость:** параметр добавлен третьим и опциональным по использованию — все ~30
    остальных полей `forms-shadcn`/`@letar/forms`, чей `useFieldState` объявлен с 2 параметрами,
    не меняются (TS допускает функцию с меньшим числом параметров там, где ожидается большее).
    `render()` обоих полей больше не читает `field.state.value` для инициализации — убрана
    мёртвая переменная и связанный `initializedRef`-паттерн в render-scope.
  - **Проверки:** `nx test forms,forms-react,forms-shadcn` — 0 предупреждений «Cannot update»/
    «Do not call Hooks» в полном прогоне (промежуточный вариант 1 выше давал предупреждение на
    каждый рендер обоих полей во всех их тестах — легко воспроизводимый негативный контроль),
    все тесты зелёные без изменения ассертов (тест
    «стирание текста сразу очищает значение поля» с непустым `defaultValues` — тот же, только
    warning больше не всплывает). `typecheck:tsgo`/`lint` зелёные на `forms`, `forms-react`,
    `forms-shadcn` (в `forms` есть 23 не связанных с этой правкой lint-ошибки — унаследованный
    долг, отдельная задача от `QuietRidge`, не мои файлы). Живая проверка в Chromium —
    `form-develop-app-shadcn`, City/Address с непустым `defaultValues`.
  - Не понадобилось трогать Chakra-версии сверх `field-address.tsx`/`field-city.tsx` — у них тот
    же баг был независимо (не унаследован от shadcn, симметричный паттерн), фикс идентичен через
    тот же новый `FieldStateContext`.
  - CHANGELOG/версия обоих пакетов — обновлены (см. ниже).
- ✅ **`FieldOTPInput`, `FieldEditable`, `FieldColorPicker` добавлены — 30-е/31-е/32-е поля
  (2026-08-10, forms-dev), одним заходом.** Три поля, у каждого свой уровень переиспользования
  готового.
  - `FieldOTPInput`: переиспользует `shadcnUIKit.PinInput` (тот же примитив, что
    `FieldPinInput`) + таймер повторной отправки поверх. Beta: только числовой ввод —
    `inputMode="numeric"` зашит в сам примитив, `type="alphanumeric"` из Chakra-версии не
    поддержан контрактом `UIKitPinInputProps`.
  - `FieldEditable`: клик по превью (кнопка) переключает в режим редактирования (нативный
    `<input>`/`<textarea>`). Beta: без `showControls` (набора Edit/Cancel/Submit-кнопок) —
    `submitOnBlur` + Enter/Escape покрывают тот же сценарий проще; только `activationMode`
    `click`/`none`, без `dblclick`/`focus`.
  - `FieldColorPicker`: нативный `<input type="color">` (системный picker браузера) + hex-инпут
    - свотчи — не полный Ark UI `ColorPicker.Root` с областью насыщенности/яркости и
      hue/alpha-слайдерами. Сознательное решение по объёму, не техническое ограничение контракта:
      портировать такой compound под Radix/tailwind — отдельная задача существенно большего
      размера, чем остальные 31 поле.
  - **Находка (поймана линтом, не в проде):** `useState`/`useDeclarativeForm`, вызванные внутри
    `render()` (а не `useFieldState()`), валят `react-hooks/rules-of-hooks` — ESLint распознаёт
    хуки по имени функции-обёртки (`useFieldState` матчит, `render` нет), тот же класс находки,
    что была на `FieldDateRange` с `useId()`. Обе исправлены переносом состояния в
    `useFieldState`.
  - Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 14 новых RTL-тестов (107/107 в пакете, было 93), негативные контроли
    (`activationMode="dblclick"` → `TS2322` на Editable, `swatches="red"` → `TS2322` на
    ColorPicker, `length="6"` → `TS2322` на OTPInput), `typecheck:tsgo`/`lint` зелёные после
    фикса находки выше. Отдельная находка в собственном тесте OTPInput — асинхронный клик
    resend без `waitFor` давал `act()`-warning в консоли (не баг компонента, только незавершённый
    промис в тесте) — исправлено добавлением `waitFor` на пост-условие.
  - Живая проверка в Chromium на `form-develop-app-shadcn`: Editable — клик → ввод → Enter →
    возврат в превью с новым текстом; ColorPicker — смена `<input type="color">` синхронизирует
    hex-инпут; OTPInput — посимвольный ввод во все 6 ячеек с автопереходом, подтверждено что это
    именно поле `smsCode` (не спутано с соседним `FieldPinInput` на той же странице — оба рядом
    используют один `data-slot="pin-input"`).
  - CHANGELOG/версия (`0.12.0` → `0.13.0`), README — обновлены.
- ✅ **Дедупликация кода после 15 новых полей — рефакторинг без изменения поведения (2026-08-10,
  forms-dev).** По итогам серии заходов (17→32 поля) накопились три идентичные копии:
  - `useAddressProvider` (`field-address.tsx`) и `useCityProvider` (`field-city.tsx`) — byte-for-byte
    одинаковый резолв провайдера (проп → `DeclarativeFormContext.addressProvider` → `token`-фолбэк).
    Вынесены в `useResolvedAddressProvider` (`lib/utils/use-address-provider.ts`).
  - `DATE_INPUT_CLASS`/`DATETIME_INPUT_CLASS` (`field-date-range.tsx`/`field-datetime-picker.tsx`) —
    та же строка tailwind-классов, что и у `shadcnUIKit.Input` (обход UIKit-контракта ради
    `min`/`max`/`step`, задокументированного «Находкой 1» на `FieldDateRange` выше). Вынесены в
    `NATIVE_INPUT_CLASS` (`lib/uikit/primitives/native-input-class.ts`), используется теперь и
    самим `Input`-примитивом — визуальный стиль синхронен при будущей смене темы.
  - `cardClass` (`field-radio-card.tsx`/`field-checkbox-card.tsx`) — идентичная реализация
    border+ring/opacity. Вынесена в `lib/utils/card-class.ts`.
  - Ни один из трёх случаев не был протечкой границы — все три копии жили внутри `forms-shadcn`,
    `forms-core`/`forms-react` не затронуты.
  - **Проверки:** 107/107 тестов (без изменений — рефакторинг переносит реализацию, не поведение),
    `typecheck:tsgo` зелёный. `lint` — 2 pre-existing `react-hooks/rules-of-hooks` ошибки в
    `field-address.tsx`/`field-city.tsx` (из отдельного, не связанного с этим рефакторингом
    исправления `useEffect` в `render()`) остались как есть — вне скоупа этой задачи, не трогала.
  - CHANGELOG/версия (`0.13.0` → `0.13.1`, patch — внутренний рефакторинг без изменения публичного API).
- ✅ **`FieldSignature` добавлен — 33-е поле (2026-08-10, forms-dev), первое из приоритетного
  списка координатора (Signature → FileUpload → Steps → Table → RichText, тред
  `forms-phase7-3-shadcn`).** Canvas-рисование мышью/пальцем + typed mode (текстовый ввод
  курсивом), переключатель режимов — две обычные кнопки, без нового Radix-примитива (у Chakra-версии
  это `SegmentGroup`, здесь не заводили новую зависимость ради переключателя из двух пунктов — тот
  же принцип, что у пресетов `FieldDateRange`). Логика геометрии штрихов и SVG-сборки
  (`escapeXml`/`buildSvgString`/`buildTypedSvgString`/`getCoords`) портирована из Chakra-версии
  как есть — заменена только UI-обвязка. Значение — data URI (`image/png` или `image/svg+xml`
  base64). Не входит в UIKit-контракт (нет примитива для canvas), тот же принцип, что у
  `Rating`/`Tags`/`ColorPicker`. Протечек границы `forms-core`/`forms-react` не найдено.
  - **Проверки:** 5 новых RTL-тестов (112/112 в пакете, было 107) — jsdom не реализует
    `HTMLCanvasElement.getContext`, поэтому тесты покрывают переключение режимов/видимость
    контролов, а не пиксельную отрисовку (тот же класс ограничения, что уже был у `ResizeObserver`
    для `Slider`). Негативный контроль (`exportFormat="jpeg"` → `TS2322`, `width="rainbow"` →
    `TS2322`), `typecheck:tsgo`/`lint` зелёные. Живая проверка в Chromium на
    `form-develop-app-shadcn` компенсирует пробел jsdom: реальный `MouseEvent`-штрих на canvas
    (`mousedown`→`mousemove`→`mouseup` через `dispatchEvent`) дал валидный `canvas.toDataURL()`
    (`data:image/png;base64,...`) и показал кнопку «Очистить»; typed mode — ввод текста показал
    «Очистить», клик по нему вернул canvas в пустое состояние с плейсхолдером; переключение
    draw↔typed корректно.
  - CHANGELOG/версия (`0.13.2` → `0.14.0`), README (таблица полей, «Известные упрощения») —
    обновлены. Демо-страница `form-develop-app-shadcn` дополнена (счётчик 32→33).
- ✅ **`FieldFileUpload` добавлен — 34-е поле (2026-08-10, forms-dev), второе из приоритетного
  списка координатора (Signature ✅ → FileUpload ✅ → Steps → Table → RichText, тред
  `forms-phase7-3-shadcn`).** Значение — `File[]`. Три варианта отображения (`button`/`dropzone`/
  `input`), портированы все из Chakra-версии. Не входит в UIKit-контракт (нет примитива
  `FileUpload` — у Chakra-версии это Ark UI `FileUpload.Root`, здесь нет ни Radix, ни Ark UI
  аналога) — вместо него скрытый нативный `<input type="file">`, триггер по клику на кнопку/
  дропзону, drag&drop через нативные `onDragOver`/`onDrop`. Превью изображений — `<img
  src={URL.createObjectURL(file)}>` вместо `FileUpload.ItemPreviewImage`. Security-проверка
  (`processFileWithSecurity` из `@letar/forms-core/security`) портирована без изменений —
  framework-free утилита, общая с Chakra-скином, протечек границы не найдено. Добавлена
  собственная клиентская проверка `maxFileSize` (без `security` тоже работает — Chakra-версия
  такой возможности не имела, `FileUpload.Root` Ark UI её делает сам).
  - **Проверки:** 5 новых RTL-тестов (117/117 в пакете, было 112) — jsdom не реализует
    `URL.createObjectURL`, поэтому тесты избегают `accept="image/*"` (та же стратегия обхода
    пробела jsdom, что у `FieldSignature`/canvas); покрыты выбор файла через `fireEvent.change`
    на скрытом инпуте, оба варианта (`button`/`dropzone`), `clearable=false`, удаление файла из
    списка. Негативный контроль (`variant="bogus"` → `TS2322`), `typecheck:tsgo`/`lint` (в т.ч.
    `oxlint(react-hooks/rules-of-hooks)` за `useRef` вне `useFieldState` и
    `next/no-img-element` за превью-`<img>`, оба исправлены) зелёные.
  - CHANGELOG/версия (`0.14.0` → `0.15.0`), README (таблица полей, «Известные упрощения») —
    обновлены. Демо-страница `form-develop-app-shadcn` дополнена (счётчик 33→34,
    `variant="dropzone" maxFiles={3} showSize`).
  - Живая проверка в Chromium: `DataTransfer`+`change`-событие на скрытом инпуте (реальный путь
    браузера для выбора файла) дало `field.handleChange` → в списке появились иконка, имя
    (`notes.txt`) и размер (`11 B`); клик по кнопке удаления вернул поле в пустое состояние.
- ✅ **`FormSteps` добавлен (2026-08-10, forms-dev), третье из приоритетного списка координатора
  (Signature ✅ → FileUpload ✅ → Steps ✅ → Table → RichText, тред `forms-phase7-3-shadcn`).**
  В отличие от предыдущих 34 полей — **не `createField()`-поле**, а compound-компонент
  форм-уровня (`FormSteps`, `.Step`, `.Indicator`, `.Navigation`, `.CompletedContent`), та же
  категория, что `Form.Steps` у Chakra-версии. Работает поверх `useDeclarativeForm()` из
  `@letar/forms-react` напрямую — не потребовался `createForm()`/`Form` (у `forms-shadcn` его
  всё ещё нет, отдельный пункт backlog). Framework-free логика (`use-step-state.ts` — регистрация/
  сортировка шагов; `use-step-navigation.ts` — переходы/валидация текущего шага, все нестабильные
  значения через рефы против бесконечного цикла регистрации; `use-step-persistence.ts` —
  localStorage) портирована из Chakra-версии практически без изменений. UI (индикатор с
  прогрессом, кнопки) — нативная разметка вместо Chakra `Steps.Root`/`Button`.
  - **Beta-упрощения (осознанно, не протечка границы):** без интеграции с `Form.When`
    (`hiddenFields` в оригинале — условное исключение полей шага из валидации) и без пропа
    `segment` (авто-обёртка `Form.Group` — в оригинале через `FormGroupDeclarative`, которого нет
    в `@letar/forms-react`; там есть похожий `FormGroup`/`useFormGroup`, но не идентичный API, не
    портировала ради экономии времени — можно добавить отдельной задачей, если понадобится). Без
    анимаций перехода между шагами (`framer-motion` — Chakra-версия тянет её как зависимость,
    здесь не добавляла новый peer ради первого прохода). Все три упрощения — за пределами того,
    что показывает 34 предыдущих поля (не связаны с `UIKit`-контрактом), задокументированы в
    README `forms-shadcn`.
  - **Проверки:** 5 новых RTL-тестов (122/122 в пакете, было 117) — сценарий из 2 шагов
    (`firstName` required → `email`), проверены: рендер только активного шага, блокировка
    перехода без заполнения обязательного поля, успешный переход, смена «Далее»→«Отправить» на
    последнем шаге, «Назад». Негативный контроль (`orientation="diagonal"` → `TS2322`),
    `typecheck:tsgo`/`lint` зелёные (два мелких фикса по ходу: unused `useState` в
    `form-steps-step.tsx` после удаления `when`-логики; `form.setFieldMeta` — явная аннотация типа
    параметра оказалась ýже контракта TanStack Form, убрана в пользу инференса — тот же код, что
    в оригинале, без аннотации проходит).
  - CHANGELOG/версия (`0.15.0` → `0.16.0`), README (новый раздел `FormSteps` с примером и
    beta-упрощениями) — обновлены. Демо-страница `form-develop-app-shadcn` дополнена отдельной
    изолированной 2-шаговой формой (не смешана с основной демо-формой — `FormSteps` скрывает
    неактивные шаги, что несовместимо с плоским списком остальных 34 полей на одной странице).
  - Живая проверка в Chromium: заполнение `firstName` + клик «Далее» → показался `email`-инпут
    второго шага, индикатор отметил первый шаг завершённым (галочка, `bg-primary`); на втором шаге
    кнопка «Далее» стала «Отправить»; клик «Назад» вернул на первый шаг с `firstName`-инпутом.
  - ✅ **Дедуп FormSteps-хуков в `@letar/forms-react` (2026-08-10, forms-dev).** Портирование
    `FormSteps` в shadcn-скин продублировало `use-step-state.ts`/`use-step-navigation.ts`/
    `use-step-persistence.ts` почти дословно (framework-free, не зависят ни от Chakra, ни от
    Radix — уже работали только с React + `@tanstack/react-form`). Построчное сравнение нашло
    один реальный сущностный разрыв: `hiddenFields`/`hideFieldsFromValidation`/
    `showFieldsForValidation` (интеграция с `Form.When`, условное скрытие полей от валидации) —
    есть только в Chakra-версии, у shadcn нет `Form.When` вовсе (см. beta-упрощения в
    `libs/forms-shadcn/README.md`).
    - Решение — вынести все три хука + типы `StepInfo`/`StepDirection` в `@letar/forms-react`,
      не дублировать. Разрыв не потребовал ветвления сигнатур: `hiddenFields` в
      `useStepNavigation` стал optional-параметром (`undefined` → фильтрация по пустому
      `Set`, поведение как было у shadcn — валидируются все поля шага); `useStepState`
      как и раньше всегда несёт `hiddenFields`-состояние — скины без `Form.When` просто не
      вызывают сеттеры, лишней абстракции/флага «включить hiddenFields» не потребовалось.
    - Второе найденное отличие — `STORAGE_PREFIX` в `useStepPersistence` (`'form-steps:'` у
      Chakra, `'form-steps-shadcn:'` у shadcn — чтобы оба скина одной формы не затирали друг
      другу прогресс в `localStorage`). Стало полем `storagePrefix?: string` конфига,
      по умолчанию `'form-steps:'`; `FormStepsRoot` (`forms-shadcn`) передаёт
      `'form-steps-shadcn:'` явно.
    - `FormStepsContextValue` **не унифицирован** — осознанно: у Chakra-версии в контексте
      ещё 6 chakra-специфичных полей (`orientation`/`size`/`variant`/`colorPalette`/`animated`/
      `animationDuration`), которых у shadcn нет и не будет (нативная разметка вместо
      `Steps.Root`). Обобщать под общий тип означало бы либо делать эти поля опциональными
      (падение типобезопасности без выигрыша), либо городить generic — не стоит экономии на
      двух похожих, но разных интерфейсах. `StepInfo`/`StepDirection` (без UI-специфики)
      вынесены как общие типы, `FormStepsContextValue` — как был, по одному на скин.
    - Публичный API обоих пакетов не изменился — `StepInfo`/`StepDirection` реэкспортируются
      из `form-steps-context.tsx` каждого скина, как раньше. Версии: `@letar/forms` `2.0.1` →
      `2.0.2`, `@letar/forms-shadcn` `0.16.0` → `0.16.1`, `@letar/forms-react` `0.2.0` → `0.2.1`
      (все три — patch, внутренний рефакторинг).
    - **Проверки:** `nx test forms` (без изменений в счёте), `nx test forms-shadcn` (без
      изменений в счёте), `typecheck:tsgo`/`lint` зелёные на всех трёх пакетах. Lint `forms`
      репортит 23 предсуществующих ошибки в несвязанных файлах (`form-comparison.tsx`,
      `use-form-analytics.ts`, `render-count.spec.tsx` и т.д.) — не в диффе этой задачи, не
      трогались.
- ✅ **`FieldTableEditor` добавлен (2026-08-10, forms-dev), четвёртое из приоритетного списка
  координатора (Signature ✅ → FileUpload ✅ → Steps ✅ → Table ✅ → RichText, тред
  `forms-phase7-3-shadcn`).** Как и `FormSteps` — не `createField()`-поле, а compound-компонент,
  компонующий `form.Field(mode="array")` напрямую. Портирован из `@letar/forms` (Chakra-скин)
  практически без изменений логики: `use-table-columns.ts`/`use-table-navigation.ts` (обе —
  framework-free, ни одной Chakra-зависимости в оригинале) скопированы дословно, `table-utils.ts`
  вообще не понадобился отдельным файлом — `@letar/forms-core/table` уже экспортирует
  `buildTSV`/`coerceValue`/`computeAggregate`/`formatCellValue`/`getDefaultRow`/`parseTSV`
  напрямую, а `@letar/forms-core/schema` даёт `traverseSchema`/`getZodConstraints` с тем же API,
  что использовала Chakra-версия. Сменилась только разметка: native `<table>`/`<thead>`/`<tbody>`/
  `<tfoot>` + Tailwind вместо `Table.Root`/`Table.Header`/`Table.Body`/`Table.Footer`, `FieldRoot`/
  `FieldLabel`/`FieldError` — те же примитивы UIKit-скина, что использует `createField()` (прямой
  импорт из `../uikit/primitives/*`, не `createField()`-обёртка, т.к. это не single-value поле).
  8 файлов в `libs/forms-shadcn/src/lib/table/` (types, context, cell, row, header, footer,
  toolbar, mobile-view, root) + `use-table-columns.ts`/`use-table-navigation.ts`.
  - **Beta-упрощение (осознанно, не протечка границы):** `sortable` — нативный HTML5 drag&drop
    (`draggable` на `<tr>` + `onDragStart`/`onDragOver`/`onDrop`, состояние перетаскиваемой строки
    — `useRef`, ячейка под курсором — `useState` для подсветки `border-t-primary`), не
    `@dnd-kit/sortable` — тот же принцип, что у `FormSteps` без `framer-motion`: не тянуть новый
    peer ради одной фичи в первом проходе (у `forms-shadcn` `@dnd-kit` вообще не было peer'ом,
    в отличие от `@letar/forms`, где `SortableWrapper`/`SortableItem`/`DragHandle` уже тянут его
    транзитивно через `FormGroupList`). Функционально эквивалентно (перетаскивание строк работает,
    вызывает `moveRow` → `arrayField.moveValue`), но без keyboard-DnD и анимации перестроения
    списка, которые даёт `@dnd-kit/sortable`. Задокументировано в README `forms-shadcn`.
  - **Cell-level редактирование:** enum-колонки — нативный `<select>` (не Radix `Select` — та же
    причина, что у Chakra-версии с `NativeSelect`: слишком тяжёлый примитив для inline-ячейки),
    boolean — нативный `<input type="checkbox">`, number/string — нативный `<input>`. Навигация
    Tab/Shift+Tab/Enter/Escape/стрелки между ячейками — `useTableNavigation`, портирован без
    изменений (работает через `data-row`/`data-col` DOM-атрибуты и `document.querySelector`
    внутри `containerRef`, framework-free независимо от UI-библиотеки).
  - **Проверки:** 11 новых RTL-тестов (133/133 в пакете, было 122) — рендер колонок/строк,
    computed-ячейка (не открывает inline-редактирование), inline-редактирование обычной ячейки
    (клик → `input` → `change` → `blur` → значение сохранено), пустая таблица (`emptyText`),
    добавление/удаление строки, `minRows`/`maxRows` (disabled-состояние кнопок), `selectable`
    (число чекбоксов), `readOnly` (скрыты toolbar/удаление), footer с `aggregate: 'sum'`.
    **Находка теста:** jsdom не применяет media queries — mobile-карточки и desktop `<table>`
    рендерятся в DOM одновременно (различаются только классами `hidden`/`md:block`, не реальным
    display), поэтому текстовые запросы дают дубли (лейбл колонки в шапке таблицы совпадает с
    лейблом поля в мобильной карточке) — решение: скоуп через `within(table)`, не общий
    `screen.getByText`. Негативный контроль (`size="bogus"` → `TS2322`), `typecheck:tsgo`/`lint`
    зелёные (один фикс по ходу: `no-empty-function` на плейсхолдер-рефе `addRowRef` — тот же
    паттерн, что в оригинале Chakra-версии, там просто другой eslint-конфиг это не ловил).
  - CHANGELOG/версия (`0.16.1` → `0.17.0`), README (таблица полей, новый раздел
    `FieldTableEditor`) — обновлены.
  - Живая проверка в реальном браузере (Chromium, `form-develop-app-shadcn`): изолированная форма
    с array-полем `items` (позиции заказа), computed-колонка «Итого» = `qty × price` с
    `format` в рубли, footer-сумма — 8970 ₽ по двум строкам. Добавление строки через toolbar-кнопку
    — новая пустая строка с `computed` = 0 ₽. Escape в режиме редактирования — откат без
    сохранения (проверено через настоящий `KeyboardEvent`, не эмуляцию). Удаление строки, чекбокс
    select-all → появление кнопки «Удалить выбранные (N)» со счётчиком, `draggable=true` на
    `<tr>` при `sortable`. **Находка:** программный `blur()`/`dispatchEvent(new Event('blur'))` из
    `javascript_tool` не закрывал inline-редактирование в этой сессии (Browser pane был свёрнут —
    `computer{action:"screenshot"}` отдельно вернул ошибку «pane is not displayed, not compositing
    frames») — вероятно документ без реального фокуса
    не доставляет focus/blur-события так же, как в активной вкладке. Не протечка границы: RTL-тест
    того же сценария (`fireEvent.blur`) зелёный, `KeyboardEvent`/`click()`-события в той же живой
    сессии отработали корректно (Escape, add/remove row, select-all) — похоже на артефакт
    свёрнутой панели превью, не баг компонента.
  - **`FieldRichText`** — пятое, последнее из приоритетного списка координатора (Signature ✅ →
    FileUpload ✅ → Steps ✅ → Table ✅ → **RichText** ✅) — паритет по этому списку закрыт.
    WYSIWYG-редактор на Tiptap, портирован из `@letar/forms` (Chakra-скин): тот же домен
    (`StarterKit`+`Underline`+`Link`+`Placeholder` extensions, `onUpdate` → `field.handleChange`,
    синхронизация `value` при внешнем изменении без прыжка курсора, `outputFormat: 'html' | 'json'`),
    другая обвязка — native `<button>`-тулбар вместо Chakra `IconButton`/`HStack`, Tailwind
    arbitrary-selector'ы (`[&_.tiptap_h1]:...`, `content-[attr(data-placeholder)]`) вместо Chakra
    `css`-пропа для стилизации содержимого и placeholder.
    - **Beta-упрощения:** без `imageUpload`/`ImagePopover` — вставка изображений с загрузкой на
      сервер не портирована (требует app-specific upload endpoint, не framework-free логика).
      Кнопка `link` — `window.prompt` вместо Popover-формы с полем ввода; тот же фолбэк уже
      существовал в Chakra `TOOLBAR_CONFIG.link.action` как запасной вариант без отдельного
      `LinkPopover` — здесь он стал основным путём, не запасным.
    - **Проверки:** 8 новых RTL-тестов (141/141 в пакете, было 133) — рендер contenteditable,
      label, тулбар по умолчанию/ограниченный `toolbarButtons`/скрытый `showToolbar={false}`,
      `readOnly` скрывает тулбар, `disabled` блокирует кнопки, негативный контроль типов.
      **Находка теста:** клик по кнопке форматирования (`toggleBold()`) не проверяется на реальное
      переключение `aria-pressed` — jsdom не реализует DOM Selection API до состояния, нужного
      ProseMirror, чтобы команда применилась к выделению; тест ограничен проверкой отсутствия
      краша. Тот же класс находки, что blur-события в `FieldTableEditor` — среда, не баг
      компонента.
    - CHANGELOG/версия (`0.17.0` → `0.18.0`), README (таблица полей, новый раздел
      `FieldRichText`), peer-зависимости `@tiptap/react`/`@tiptap/starter-kit`/
      `@tiptap/extension-link`/`@tiptap/extension-underline`/`@tiptap/extension-placeholder`
      (уже установлены в корне монорепо для `@letar/forms`, здесь заявлены как peer) — обновлены.
    - Живая проверка в реальном браузере (Chromium, `form-develop-app-shadcn`): изолированная
      форма с `defaultValues.content` непустым HTML — рендер `<strong>`/`<em>` подтверждён через
      `innerHTML` редактора, все кнопки тулбара присутствуют в DOM. Вставка текста через
      `document.execCommand('insertText', ...)` изменила содержимое и **не была откачена**
      эффектом синхронизации внешнего `value` — подтверждает, что `onUpdate` реально доходит до
      `field.handleChange` и обратно (petля `value` ↔ `editor` работает). Клик по кнопке
      «Полужирный» и `computer{action:"screenshot"}` не удалось проверить визуально в этой
      сессии — Browser pane не композитил кадры (`the Browser pane is not displayed`), тот же
      известный артефакт свёрнутой панели, что и в проверке `FieldTableEditor`; DOM/JS-проверки
      остаются валидными независимо от него.
- ✅ **Шаг 5 — 47 из 56 полей `forms-shadcn` портировано (2026-08-11, forms-dev),
  `@letar/forms-shadcn` 0.30.0.** Одна непрерывная сессия дожала оставшиеся 12
  полей вслед за приоритетным списком координатора (Signature→FileUpload→Steps→Table→RichText,
  все ✅ ранее): `FieldYesNo`, `FieldNumberInput`, `FieldPasswordStrength`, `FieldTime`,
  `FieldCascadingSelect`, `FieldImageChoice`, `FieldSchedule`, `FieldLikert`,
  `FieldMatrixChoice`, `FieldDataGrid`, `FieldCalculated`, `FieldAuto` — каждое отдельным
  коммитом (lib + демо), с тестами, README/CHANGELOG/версией по ходу.
  - **`FieldCascadingSelect`** — не `createField()`-поле (как `FormSteps`/`FieldTableEditor`),
    компонует `form.Subscribe` напрямую: рендер зависит от значения ДРУГОГО поля (`dependsOn`).
  - **`FieldDataGrid`** — первое поле, добавившее `@tanstack/react-table` в `peerDependencies`
    (`bun install` перерезолвил `libs/forms-shadcn/node_modules/@tanstack/react-table`).
    Изолировано через `lazy()` + dynamic `import()` (`field-data-grid-impl.tsx`) — тот же
    паттерн, что `FieldRichText` для `@tiptap/*`. Beta: без виртуализации
    (`@tanstack/react-virtual` — второй тяжёлый peer, тот же принцип отказа, что у
    `FieldTableEditor`), без resize/drag-reorder колонок, без auto-резолва из schema.
  - **`FieldCalculated`** — `useComputedValue` (`useSyncExternalStore` на `form.store`, защита
    от циклических зависимостей) скопирован framework-free дословно из Chakra-версии,
    `useDebounce` переиспользован из уже публичного экспорта `@letar/forms-react`.
  - **`FieldAuto`** (последнее, замкнуло паритет) — `traverseSchema` + поиск по dot-path,
    диспетчеризация на уже существующие поля пакета по базовому Zod-типу. Beta: без
    `renderFieldByType`/`meta.fieldType`-диспетчеризации на ~50 типов, которую даёт
    Chakra-версия — только string/number/boolean/date/enum.
  - Общий паттерн beta-упрощений по всем 12: одна разметка на все брейкпоинты (без раздельных
    мобильных/десктопных DOM-деревьев — `FieldLikert`/`FieldMatrixChoice`), без стрелочной
    клавиатурной навигации по ячейкам/точкам, без auto-резолва колонок/полей из schema там, где
    Chakra-версия это делает.
  - `FieldAuto` живая проверка — в Chromium (Browser pane): изолированная форма со своей
    Zod-схемой (`DemoForm` расширен опциональным `schema`-пропом под эту задачу — раньше был
    только `form`), все 5 веток диспетчеризации (string/textarea/number/switch/enum) подтверждены
    через `read_page`/`javascript_tool`, консоль чистая (только HMR WebSocket-шум прокси).
    `FieldDataGrid` — рендер/данные/rowSelection подтверждены в Browser pane; сортировка по
    клику заголовка проверена через RTL (`fireEvent.click`), не через Browser pane — известный
    класс артефактов JS-харнесса (raw `dispatchEvent(MouseEvent)` не триггерит React-обработчик
    так же, как реальный клик в этой сессии), не баг компонента.
  - `apps/form-develop-app-shadcn` синхронизирован по ходу — по демо-коммиту на каждое поле,
    финальный счётчик страницы «47 из 56 полей портировано».
  - ⚠️ **Формулировка "56 из 56 / полный паритет" — исправлена на "47 из 56" (2026-08-11,
    v0.30.1).** 56 — верный знаменатель (реальный подсчёт по файлам `@letar/forms`, включая
    `City` и 7 document-полей), но числитель ошибочно включал 9 полей, которые не портированы:
    `FieldMaskedInput`, `FieldCreditCard`, `FieldInn`, `FieldKpp`, `FieldOgrn`, `FieldSnils`,
    `FieldPassport`, `FieldBik`, `FieldBankAccount` — все ждут исследовательскую сессию по
    замене `use-mask-input` (backlog выше). Найдено при release-ready ревизии, решение
    зафиксировано координатором `QuietRidge` (тред `forms-phase7-3-shadcn`): знаменатель не
    занижать. Заодно найден попутный баг синхронизации источников истины на Chakra-стороне —
    `form-mcp`/`docs/fields.md` дают только 49 полей (без `City` и document-полей) — вне
    резервации `forms-shadcn`, координатор заводит отдельной backlog-записью.
  - Следующий шаг — 7.4 (замер трафика, всё ещё не начат — трафика нет) или publish-prep
    (`tsup.config.ts`/`package.publish.json`/entry-сплиттинг, задача координатора #47).
- [ ] **7.4 Замер трафика** → решение: доносить сложные поля или нет.
- [ ] **7.5 Docs-сайт на отдельном домене** + живые демо. SEO под `zod forms react`, `prisma form generator`.
- [x] **7.6 `llms.txt` + усиление MCP** (2026-08-11, задача координатора `QuietRidge` #54) —
      недоиспользованный козырь №1 закрыт:
  - **Фикс `form-mcp` (v1.0.3).** `field-registry.ts` терял 7 российских документных полей —
    `CATEGORY_MAP` ждал ключ `'Российские документы'`, реальный заголовок секции в
    `libs/forms/docs/fields.md` — `## Документные поля (Россия)`. Несовпадение строк, парсер
    молча пропускал секцию целиком. `list_fields`/`get_field_props`/`get_field_example` (все три
    читают общий `fieldRegistry`) теперь видят `INN`/`KPP`/`OGRN`/`BIK`/`BankAccount`/`SNILS`/
    `Passport`. Заодно найдено: `FieldCity` отсутствовал в `docs/fields.md` целиком (не баг
    парсера — поле было не задокументировано, хотя экспортируется как `Form.Field.City`) —
    добавлена строка в таблицу «Специализированные», счётчик в шапке файла поправлен 56 → 57.
  - **`llms.txt` (`apps/form-docs`, v0.1.9).** Route Handler `src/app/llms.txt/route.ts`, формат
    llmstxt.org — ручной курируемый список ключевых доков (Getting Started, Installation, Quick
    Start, createForm(), Field.\* Reference, API, ZenStack Plugin, Offline, i18n, MCP Server,
    demo, changelog, npm). Не автогенерация из Fumadocs source API — 90+ MDX-файлов с RU-дублями
    превратили бы компактный указатель в карту сайта (для карты сайта уже есть `sitemap.ts`).
    Проверено в Browser pane: `http://localhost:3020/llms.txt` отдаёт корректный markdown.
- [ ] **7.7 Open-core сервис** — hosted-приём сабмитов + дашборд ответов + аналитика (синергия со studio/Tochka).
      Free — вся библиотека и оба скина; платно — сервис вокруг форм, не урезание кода.
- [x] **7.8 Тонкий Vue-адаптер (архитектурный пруф границы)** (2026-08-12, задача координатора
      `QuietRidge` #58) — новая библиотека `libs/forms-vue` (`@letar/forms-vue` 0.1.0), 5 полей
      (Input/Textarea/Number/Checkbox/Select) поверх `@tanstack/vue-form`.
  - **Главный результат — граница подтверждена.** `forms-core` не потребовал ни одного изменения:
    `getFieldMeta` (`@letar/forms-core/schema`) читает `.meta({ ui: {...} })` той же Zod-схемы,
    что и React-скин, без единой модификации. DIP-граница, которую держали с 2026-07-08, реальна,
    не только на бумаге.
  - **Архитектура:** `AppForm` (`useForm` + `provide`/`inject` контекста `{form, schema}`) +
    `createField(displayName, render)` — Vue-эквивалент `createField` из `forms-react`, но с
    `defineComponent`/`h()` вместо JSX (файлы `.ts`, не `.vue` — так `typecheck:tsgo`/`tsc`
    проверяют их наравне с остальными библиотеками, без `vue-tsc`). `FieldSelect` (нужен доп.
    проп `options`) собран напрямую по тому же контексту, не через фабрику.
  - **Без UIKit-слоя.** Решение по вопросу из задачи координатора: одна референсная
    реализация на голом HTML/классах (`letar-field__*`), не полноценный свопаемый скин —
    для пруфа границы этого достаточно, второй дизайн-скин под Vue не нужен.
  - **Валидация:** `onChange: schema.shape[name]` — `@tanstack/vue-form` принимает Zod-схему
    напрямую (Standard Schema), отдельный адаптер не понадобился.
  - **Тесты:** vitest + `@vue/test-utils`, `libs/forms-vue/src/lib/app-form.spec.ts` (5 сценариев:
    метки из схемы, показ ошибки, блокировка невалидного сабмита, успешный сабмит, guard «поле
    вне `<AppForm>`»). `nx test/lint/typecheck:tsgo forms-vue` — зелёные.
  - **Побочные находки:** общий `.oxlintrc.json` включает `react-hooks/rules-of-hooks` для всех
    проектов — ложно триггерится на Vue composables (`useForm`, `useAppFormContext`), названных по
    конвенции `use*`, но не являющихся React Hook. Первый non-React `use*`-код в репо. Фикс —
    `libs/forms-vue/.oxlintrc.json` (`extends` корневого + `rules-of-hooks: off`) и свой
    `--config` в `project.json` таргета `oxlint`, без правки общего конфига.
  - **Демо** — не заводилось отдельным приложением (непропорционально объёму задачи, как и
    разрешала формулировка координатора), пример — в README.md пакета.
- [x] **7.8 → Поток 1: полноценный Reka UI-скин** (2026-08-12, задача Ками через координатора
      `QuietRidge` #61) — новая библиотека `libs/forms-vue-shadcn` (`@letar/forms-vue-shadcn`
      0.1.0), Vue-аналог `@letar/forms-shadcn`: `UIKit`-контракт на
      [Reka UI](https://reka-ui.com) (Radix Vue) + Tailwind + cva, 6 полей (Input/Number/
      Checkbox/Textarea/Select/Combobox).
  - **Контракт не пришлось заводить заново.** `UIKitCorePrimitives`/`UIKitExtendedPrimitives`
    (`forms-core/uikit/types.ts`) уже были типизированы обобщённо (`TNode = unknown`) — Vue-скин
    инстанцирует их как `UIKitCorePrimitives<UINode>`, `UINode = VNode | string | null`
    (Vue, в отличие от React, не типизирует `VNode` как надмножество строк — пришлось завести
    свой алиас типа под TNode, но не новый контракт).
  - **Архитектура:** `libs/forms-vue-shadcn` — отдельный пакет-скин, не расширение headless
    `forms-vue` (по аналогии `forms-react`+`forms-shadcn`, не смешение назначений). Примитивы
    (`rekaUIKit`) — обычные функции `(props) => VNode`, не `defineComponent`: контракт
    `(props) => TNode` совпадает буквально, без обёртки под компонент.
  - **Композиционный слой** (`createFieldPrimitives`, Vue-версия `forms-react`'овского) — не
    копия 1:1: ошибку рендера поля ловит `onErrorCaptured` в `setup()`, а не классовый
    `ErrorBoundary` (`getDerivedStateFromError`/`componentDidCatch` — паттерна которого в Vue
    нет). `FieldSelect`/`FieldCombobox` (нужен доп. проп `options`) собраны напрямую по
    `useAppFormContext`, не через фабрику — как и `FieldSelect` в headless `forms-vue`.
  - **Тесты:** vitest + `@vue/test-utils`, 5 сценариев. Полифиллы `ResizeObserver`/
    `hasPointerCapture`/`scrollIntoView` — стандартный минимум для Radix/Reka-компонентов в
    jsdom (`SelectContent`/`ComboboxContent` измеряют доступное место и позиционируются через
    `@floating-ui`, которых в jsdom нет).
  - **Демо** — минимальный dev-харнесс на голом Vite (`nx run @letar/forms-vue-shadcn:demo`,
    `.claude/launch.json`), не Nx-приложение (в монорепо нет Vue+Vite приложений). Продакшн-сборка
    (`vite build`) прошла чисто (2322 модуля) — интерактивную проверку в браузере не удалось
    провести в текущей сессии (сессия отклоняла навигацию на `localhost` — ограничение
    песочницы, не код).
  - **Гайд «портирование на свой фреймворк/стили»** (Поток 2 письма #61) — закрыт: два гайда в
    `apps/form-docs/content/docs/guides/` (`custom-uikit`, `porting-framework`), EN+RU каждый.
    Первый — как реализовать `UIKit`-контракт без Chakra/shadcn; второй — честный разбор процесса
    переноса на Vue (не причёсанный reference постфактум: почему `defineComponent`+`h()`, не
    `.vue`; почему примитивы — обычные функции, не компоненты; находка `UINode = VNode|string|null`;
    `onErrorCaptured` вместо классового `ErrorBoundary`; почему `FieldSelect`/`FieldCombobox` в обход
    фабрики). Проверено в Browser pane — все 4 страницы (`/en/` и `/ru/` для обеих) рендерятся,
    содержимое корректно.

### Оценка объёма

- MVP (7.1–7.4): реалистично. Простые поля — свап контрола в 1 строку через UIKit.
- Полные 56 полей под shadcn: месяцы (тяжёлые — Combobox с `createListCollection`, Table на tanstack-table, Date, Steps).
- **Vue-пруф (7.8):** недели, не месяцы — только 5–8 полей ради доказательства границы, НЕ полный порт.
- **⏳ [2026-08-12] Цель на перспективу (Ками):** полный паритет `forms-vue-shadcn` с `@letar/forms`
  (47/56, как и `forms-shadcn`) — не сейчас, отдельная будущая задача сопоставимого объёма с
  Шагом 5 Фазы 7.3 (React shadcn-скин, 17→47 полей). Не начинать без явного запроса — сейчас в
  работе/бэклоге других направлений (7.4/7.5/7.7) достаточно.
- **Бренд:** имя `@letar/forms` оставляем (решение Kami); дискаверабельность тянем позиционированием и docs-SEO, не именем.

### Порядок с учётом Clean Architecture

7.1 (расслоение core, dependency-free) — фундамент под всё. Затем параллельно: shadcn-скин (7.3, охват)
и Vue-пруф (7.8, верификация границы). Vue-пруф **строго после** 7.1 — до расслоения доказывать нечего.

---

## Идея на будущее: снизить порог входа для новичков (не в работе)

**[2026-08-12]** Ками: одна команда вроде `create-react-app`, чтобы юный тыжпрограммист (аналогия —
сам Ками в 15 лет) получил готовую основу для формошлёпства на `@letar/forms`, + аналог для Nx.

Два направления по упаковке — но **не по объёму**, разрыв в стоимости меньше, чем казалось
сначала (уточнено 2026-08-12 после чтения `libs/generators/README.md`):

1. **`@letar/generators` как публичный Nx-плагин** (`nx add @letar/generators` →
   `nx g @letar/generators:new-app`). ⚠️ Три причины, по которым это НЕ «дёшево, почти готово»:
   - README прямо и осознанно фиксирует: «Не публикуется в npm — существует только как
     workspace-пакет для `nx generate`» (строка 3). Публикация вне workspace-контекста — не
     формальность, а пересмотр архитектурного решения.
   - `new-app` **не подключает `@letar/forms` вообще** — «Формы каркасом не создаются, это
     отдельный шаг» (README, строка 154). Форм-обвязку писать с нуля в любом случае.
   - Шаблоны завязаны на конвенции монорепо: сканирование портов по `apps/*/.env`, детект
     приватных submodule по `.gitmodules`, наследование `tsconfig.next-app.json` и т.п. Внешнему
     потребителю это либо не нужно, либо не сработает — не «упаковать», а написать новый шаблон.
     Реальный объём: новый генератор (`new-form-app` или отдельный пакет) поверх существующей
     Nx-инфраструктуры генераторов (`src/utils/` — `tree.ts`/`naming.ts` переиспользуются), с формами
     и без монорепо-специфичных допущений.
2. **`npx create-letar-form-app`** (CRA/create-vite-стиль, без Nx) — тот же новый шаблон с формами,
   но без Nx-обвязки вокруг него и без tsconfig-пресетов монорепо (не тащить сюда — новичок утонет).

Оба варианта в основе требуют одного и того же: **шаблон проекта с уже вкрученным `createForm()`,
выбором скина (Chakra/shadcn) и минимальной демо-формой** — различается только то, как этот шаблон
раздаётся (`nx generate` из плагина vs `npx create-*`). Практический вывод — писать шаблон один раз,
двух реализаций генератора для двух путей раздачи, не двух независимых шаблонов.

**Побочная выгода (Ками, 2026-08-12):** отладка обоих инструментов — это заодно первая реальная
проверка, что `@letar/forms*`-пакеты нормально подтягивают npm-зависимости в **свежем проекте вне
монорепо `letar`**. Сейчас верификация публикации ограничена сборкой (`build:npm` + инспекция
`dist/package.json`, см. thread про `@letar/tailwind-utils` 2026-08-12) — реального `npm install`
в чистом проекте с нуля ни разу не делали. Найдёт то, что build-инспекция принципиально не видит:
конфликты peer-версий, отсутствующие в реестре транзитивные зависимости, проблемы резолва exports
у разных бандлеров потребителя (Vite/webpack, не только tsup самой библиотеки).

**Статус:** идея, не назначено. Порядок при инициации: сначала общий шаблон с формами, затем любая
из двух раздач — какая раньше понадобится (Nx-плагин, если Ками работает в своём Nx-воркспейсе;
`create-*` CLI, если аудитория — новички без Nx вообще).

---

## Фаза 8: Собственный mask-движок ✅ закрыта [2026-08-12]

> Исследование проведено 2026-08-12, результат и вся доказательная база — **[MASK_ENGINE.md](./MASK_ENGINE.md)**.
> Здесь только план реализации. Решения по развилкам приняты Ками (MASK_ENGINE.md §8) и
> в плане не переоткрываются.

### Зачем

Заменить `use-mask-input` (обёртку над Inputmask) собственным framework-free движком в
`forms-core`. Коротко почему: библиотека весит 25.5 KB brotli — больше, чем весь `@letar/forms`
с 56 полями (20 KB); `imask` без коммитов с октября 2024, `Inputmask` держит 645 открытых issue
с багами 2015–2020 годов; мейнтейнеры всех трёх проектов письменно отказались чинить undo, Android
и вставку. Продуктовых потребителей у `MaskedInput`/`Document.*` **ноль**, ломать нечего.

### Принятые решения (свод, детали — MASK_ENGINE.md §8)

| Развилка         | Решение                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| Дефолтный режим  | `'live'` — маска на каждое нажатие (`'blur'` и `'off'` остаются параметром) |
| Undo             | свой стек состояний (~100 записей)                                          |
| API              | проектируется заново, опции imask не переносятся                            |
| Коды регионов РФ | не разбирать; единый `+7 (999) 999-99-99` + функция группировки как хук     |

⚠️ Дефолт `'live'` переносит всю нагрузку на корректность реализации: объявление отвергнутых
символов, каретка и IME-guard из «желательного» становятся условием работоспособности. USWDS
провалили WCAG 3.3.3 именно на молчаливом съедании символа — повторять их баг нельзя.

---

### Этап 1. Ядро: чистые функции без DOM ✅ [2026-08-12]

📍 `libs/forms-core/src/lib/mask/` → новый subpath `@letar/forms-core/mask`

- [x] **Модель токенов.** Встроенные `9` (цифра), `a` (буква), `*` (буква или цифра),
      экранирование литералов (`\`). Пользовательские токены с двумя свойствами:
      `pattern` (алфавит — предикат по символу) и `transform` (замена символа:
      латиница→кириллица, гомоглифы). Опциональные позиции (`[...]`) для переменной
      длины хвоста. Встроенные токены не переопределяются пользовательскими (защита от опечатки
      в `customTokens`).
- [x] `format(raw, mask, opts)` / `unformat(value, mask, opts)` — прямое и обратное
      преобразование. `unformat` фильтрует по объединению паттернов всех input-токенов маски.
- [x] `formatToParts(raw, mask, opts)` — разметка каждого символа (`input` / `literal` /
      `placeholder`, плюс `filled: boolean`) — подтверждённая часть (`format()`) отдельно от
      незаполненного хвоста шаблона (подсказка формата, MASK_ENGINE.md §6.6).
- [x] `caretBoundary(value, mask, opts): boolean[]` — карта допустимых позиций каретки (рядом
      с любым input-символом; строго между литералами — запрещено). Переопределяема через
      `options.caretBoundary` (числовые форматы).
- [x] **`applyChange({ previousValue, inputType, addedValue, changeStart, changeEnd, mask, options })
      → { value, selectionStart, selectionEnd }`** — центральная функция. Каретка считается по
      числу input-символов слева от неё (не по дельте длины) — раздельно вычисляется для каждой
      из трёх веток.
  - [x] Три **раздельные** ветки `insert` / `deleteBackward` / `deleteForward` — Backspace/Delete
        без выделения раздвигают диапазон удаления до ближайшего input-символа в своём
        направлении, перескакивая литералы (не сам литерал удаляется).
  - [x] Позиционирование считать по **значащим символам слева**, не по смещению длины — раздельные
        raw-индексы `changeStart`/`changeEnd`, не арифметика на строках.
- [x] Ноль зависимостей, ноль импортов фреймворков (жёсткое правило Фазы 7) — весь модуль на
      чистом TS, без DOM API.

**Статус:** 30/30 юнит-тестов зелёные (vitest, без jsdom), `typecheck:tsgo`/`oxlint` чистые.
Приёмочные кейсы из таблицы ниже подтверждены: СНИЛС, код подразделения, номер карты, госномер
РФ (свой алфавит `АВЕКМНОРСТУХ` + латиница→кириллица transform + переменная длина региона 2/3
цифры через `[9]`) — все выражаются декларативно, без выделенного компонента. Гомоглифы
(свидетельство о рождении) — примитив `transform` подтверждён отдельным тестом; само поле маску
не использует (по критерию §5.3, вне скоупа Этапа 1). ИНН намеренно не тестировался на этом
уровне — «маска не применяется» решается на уровне `mask: (raw) => string | null` в
`Form.Field.MaskedInput` (Этап 3), не в `format()`.

⚠️ **Известное ограничение, осознанно не в скоупе Этапа 1:** `applyChange` не отличает цифры
вставленного текста от цифр, дублирующих ЛИТЕРАЛЫ маски (пасченный целиком номер с кодом страны
«+7 (900)…» в маску «+7 (999)…» — первая «7» уйдёт в первый input-слот, сдвинув остальное).
Тот же класс проблемы, что и найденный баг с префиксом «8» (§4, §7.2) — решается точечным
препроцессором вставки/автозаполнения, это открытая часть Этапа 4 (`FieldPhone` на движке).
Подробности и обоснование — комментарий над `applyChange` в `apply-change.ts`.

**Критерий готовности:** приёмочные кейсы (см. ниже) выражаются декларативно и проходят
юнит-тестами в Node, без jsdom и без браузера.

#### Приёмочные тесты модели токенов

| Кейс                        | Что доказывает                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| СНИЛС `999-999-999 99`      | базовый шаблон с литералами                                                |
| Код подразделения `999-999` | простейший случай; эталон «маска работает»                                 |
| Госномер РФ                 | свой алфавит (`АВЕКМНОРСТУХ`) + transform (латиница→кириллица) + хвост 2–3 |
| Свидетельство о рождении    | маска **не применяется** — движок обязан это уметь сказать, а не натянуть  |
| Телефон РФ                  | нормализация `8`/`+7`, выбор маски функцией                                |
| Номер карты                 | группировка по бренду, пользовательские пробелы сохраняются                |
| ИНН                         | маска **не применяется** (длина 10 или 12)                                 |

> Госномер — главный тест: если он не выражается декларативно и требует отдельного компонента
> на 230 строк (как сейчас в `driving-school`), модель токенов слабая и её надо доработать
> до перехода к этапу 2.

---

### Этап 2. DOM-контроллер ✅ [2026-08-12]

📍 `libs/forms-core/src/lib/mask/controller.ts` (DOM — но всё ещё без React)

- [x] `MaskController(element, options)` с `attach()` / `detach()`. Плюс `setMask()` (смена маски
      без пересоздания контроллера) и `setValue()` (программная гидратация, мимо undo-стека).
- [x] **Модель событий** — `keydown` НЕ перехватывает символы:
  - [x] `input` с двойным guard `composing || e.isComposing` — основной путь;
  - [x] `compositionend` — единственная точка применения маски при IME;
  - [x] `beforeinput` — **только** `historyUndo` / `historyRedo`;
  - [x] `keydown` — **только** запасные undo-хоткеи (не все браузеры шлют `beforeinput` с
        `historyUndo`/`historyRedo` единообразно).
- [x] **IME-guard.** `beforeinput`/`input` во время композиции не трогают `value`/каретку и не
      зовут `preventDefault()` — маска применяется только в `compositionend`, одним изменением
      по накопленному `event.data`.
- [x] **Детект автозаполнения** — все три механизма: `inputType === undefined` на `input` →
      «заменили всё значение»; CSS `:-webkit-autofill` + `animationstart` (стиль инжектится в
      `<head>` один раз при первом `attach()`); сверка значения в `queueMicrotask` при
      инициализации.
- [x] **Каретка**: установка + повторная через `setTimeout`; не трогается, если на момент
      повторной установки выделено всё текущее значение.
- [x] **Свой undo/redo-стек** (по умолчанию 100 записей `{ value, selectionStart, selectionEnd }`,
      настраивается через `historyLimit`). `setValue()` не создаёт точку в истории — Ctrl+Z после
      программной гидратации продолжает историю пользователя, как будто гидратации не было.
- [x] Запись значения: `setRangeText` для правок пользователя (сохраняет нативный undo-стек,
      единая крупная запись при полном переформатировании — MASK_ENGINE.md §3.1); прямое
      присвоение `.value` — только для внешнего `setValue()` (не пользовательская правка).

**Статус:** 11 новых юнит-тестов в jsdom (`controller.spec.ts`, всего 41/41 по всей `mask/`) —
посимвольный ввод, Backspace/Delete через литерал, правка в середине, выделить всё и заменить,
paste, автозаполнение, Ctrl+Z/Ctrl+Shift+Z, composition (IME), `setValue`. Живая проверка в
`form-develop-app` (Chromium через Browser pane, страница-скретч удалена после проверки) —
подтверждены все сценарии критерия готовности.

⚠️ **Найден и исправлен реальный баг именно живой проверкой, не jsdom-тестами.** `applyChange`
(Этап 1) классифицировал `previousValue` тем же алгоритмом raw-сканирования, что и свежий
ввод/paste — а маска с литеральной ЦИФРОЙ (код страны «7» в «+7 (999)…») получает на входе
собственный отформатированный текст, где эта литеральная «7» проходит паттерн токена `9` и
съедается движком как будто она введена пользователем, сдвигая всё вправо. Воспроизведено:
Backspace в уже заполненном номере телефона давал `"+7 (790) 123-45-6"` вместо `"+7 (901) 234-56-7"`.
Не поймано в юнит-тестах Этапа 1, потому что тестовые маски либо не имели литеральных цифр
(СНИЛС, код подразделения, госномер), либо для телефона тестировалась только вставка в ПУСТОЕ
поле (где `previousValue` пуст и классифицировать нечего) — ни один тест не редактировал уже
заполненное значение с масками, содержащими литеральную цифру. **Фикс:** новая функция
`classifyValue` (`classify-value.ts`) — классифицирует уже отформатированный `value` позиционно
(символ ↔ слот маски один-к-одному), а не как raw-поток; используется и в `applyChange`
(классификация `previousValue`), и в `caretBoundary` (был отдельный, идентичный по смыслу кусок
кода — теперь общий). Регресс-тест — `apply-change.spec.ts`. `unformat(addedValue, ...)` этим
фиксом не покрыт — вставка/paste ЧУЖОГО текста с дублирующей литеральной цифрой (например
скопированный целиком номер с кодом страны) остаётся известным ограничением Этапа 4
(см. предупреждение в `apply-change.ts` и README).

⚠️ **Ловушка проверки, подтверждена на практике:** `computer{key: "BackSpace"}` (и, судя по всему,
любая одиночная спецклавиша) в Browser pane не бьёт настоящий нативный `KeyboardEvent`, приводящий
к реальному редактированию `<input>` — событие `keydown` доходит, `beforeinput`/`input` не
генерируются вовсе, значение не меняется, и без явной проверки лога событий это молча выглядит
как «ничего не произошло», а не как ошибка. `computer{action:"type"}` для обычного текста работает
корректно (реальные `beforeinput`/`input` с `insertText`). Обход для Backspace/Delete/Undo и
подобного — диспатчить `InputEvent`/`CompositionEvent` вручную через `javascript_tool` (как и для
`Ctrl+A`, см. ниже) — это всё ещё проверка в РЕАЛЬНОМ Chromium (не jsdom), просто без OS-уровня
трансляции клавиши в событие.

---

### Этап 3. React-биндинг и `Form.Field.MaskedInput` — ✅ [2026-08-12]

- [x] Хук/биндинг в `forms-react` (`useMaskField`, `libs/forms-react/src/lib/field/use-mask-field.ts`)
      — ядро в DOM не пишет само, наружу отдаётся только сырое значение (`onValueChange`).
- [x] Новый `Form.Field.MaskedInput` (API с нуля, MASK_ENGINE.md §6.6) —
      `libs/forms/src/lib/declarative/form-fields/text/field-masked-input.tsx`. Опции imask
      (`showMaskOnFocus`, `placeholderChar`, `clearIncomplete`, `autoUnmask`) не перенесены —
      решение §8.3, продуктовых потребителей не было.
- [x] **Режимы**: `'live'` (дефолт) / `'blur'` / `'off'`. `'live'` держит `MaskController`
      (Этап 2) на неконтролируемом React `<input>` (`defaultValue`, DOM — источник истины);
      `'blur'`/`'off'` — обычный контролируемый инпут без DOM-контроллера (упрощение: там нет
      проблемы «каретка прыгает на каждое нажатие», ради которой Этап 2 вообще писан).
- [x] **`mask: string | string[] | ((raw) => string | null)`** — `string[]` резолвится выбором
      варианта с максимальным `unformat(raw, candidate).length`; функция и `null` — как в
      MASK_ENGINE.md §6.6 («для этого ввода маски нет, свободное поле»).
- [x] **Разделение `value` / `displayValue`** — `field.state.value` (сырое, из `useStore`) идёт
      в валидацию; `displayValue`/DOM-значение — только отображение.
- [x] **Обязательный `formatDescription`** (WCAG 3.3.2) — без него `console.error` в любой
      сборке (без `NODE_ENV`-гейта — см. предупреждение ниже) и без aria-describedby.
- [x] **Объявление отвергнутого символа** через `aria-live="polite"`, включено по умолчанию —
      `MaskController.onRejectedInput` (Этап 2, дополнено сейчас) → `useMaskField` →
      визуально-скрытый `<span aria-live="polite">` в поле. Только `polite`, недоступно снаружи
      переключить на `assertive`.
- [x] **`onPaste: 'normalize' | 'reject'`** — `'reject'` блокирует `insertFromPaste` на уровне
      `beforeinput` в самом `MaskController` (`onPasteMode`). Варианта `truncate` в типах нет.
- [x] Шаблон маски **не попадает в `value`** (структурно невозможно — `value`/`displayValue`
      разделены на уровне типов). Визуальная подсказка формата — **упрощённый вариант**: текст
      `formatDescription` рядом с label, а не позиционированный по символам `aria-hidden`-слой
      поверх `<input>` (приём USWDS). Полный слой остался нерешённым пунктом MASK_ENGINE.md §8
      («Судьба showMaskOnFocus») — не блокирует критерий готовности этапа, но и не закрыт.

**Статус:** 6 новых тестов `use-mask-field.spec.tsx` (forms-react) + 2 новых теста
`controller.spec.ts` (onRejectedInput/onPasteMode, forms-core) + 12 тестов
`field-masked-input.spec.tsx` (forms, переписаны под новый API) — все зелёные.
`nx typecheck:tsgo`/`nx lint` чисты на `forms-core`/`forms-react`/`forms`. Версии: `forms-core`
0.4.0→0.5.0, `forms-react` 0.2.1→0.3.0, `forms` 2.0.5→2.1.0.

⚠️ **`mask` в типе `MaskedInputFieldProps` — формально опционален**, не по решению API, а из-за
schema-driven `field-type-mapper.tsx` (`case 'maskedInput'`), где пропсы поля приходят единым
слабо типизированным `Record` из меты `ui.mask` — TS не может доказать, что `mask` там есть.
Без явного `mask` поле логирует `console.error` и работает как `Form.Field.String` (не зависает
в неопределённом состоянии). Сам `ui.mask` в Zod-мете по-прежнему нереализован — Этап 4.

⚠️ **`onValueChange`/`onRejectedInput` в зависимостях `useCallback` ref-колбэка** (`use-mask-field.ts`)
— смена их идентичности между рендерами пересоздаёт `MaskController` и теряет undo-стек. На
практике `field.handleChange` от TanStack Form достаточно стабилен, но это не гарантия API,
задокументированное как известное ограничение, не проверенное живой браузерной сессией (в
отличие от Этапа 2, где именно живая проверка нашла реальный баг).

✅ **Живая браузерная проверка (Browser pane, реальный Chromium) — проведена**, на `/masked-demo`
(`form-develop-app`, существующая демо-страница, не переписана под новый API — используется как
есть). Проверено: посимвольный live-ввод и форматирование (`passport` — `99 99 999999`, `snils` —
`999-999-999 99`), отказ символа не по алфавиту маски с объявлением через
`aria-live="polite"` (`liveText: "Символ не соответствует формату поля"`, значение поля не
изменилось), Backspace (через ручной `InputEvent('beforeinput'/'input', {inputType:
'deleteContentBackward'})` — та же ограниченность тулинга, что и в Этапе 2: `computer{action:
"key"}` не бьёт по нативному `beforeinput`). Багов не найдено. `useEffect`-синхронизация внешнего
`value` (сброс формы) живым Chromium не проверялась — только jsdom-тестами; стоит перепроверить
перед Этапом 4, если там появится реальный сценарий сброса формы с маской.

**Критерий готовности:** a11y-таблица MASK_ENGINE.md §6.6 закрыта (все 6 строк реализованы, кроме
позиционированного `aria-hidden`-оверлея — сознательно упрощён до текста у label). Поле работает
в `form-develop-app` (`/masked-demo`, существующая демо-страница, без переноса на новый API —
предупреждения в dev-консоли ожидаемы до Этапа 4/7).

---

### Этап 4. Миграция существующих полей и снятие зависимости — частично [2026-08-12]

- [x] ✅ **8 документных полей (`createDocumentField`) → новый движок.**
      `document-field-base.tsx` переведён с `use-mask-input` на `useMaskField`
      (`@letar/forms-react`, тот же хук, что у `Form.Field.MaskedInput`). Фабрика получила
      `formatMode?: 'live' | 'off'` и `maxLength?: number`; остальные 7 полей (`FieldPassport`,
      `FieldSNILS`, `FieldOGRN`, `FieldKPP`, `FieldBIK`, `FieldBankAccount`, `FieldCorrAccount`)
      не тронуты — их конфиг (`mask`, `validate`) не поменялся, движок совместим 1:1. Все 33
      теста `document-fields.spec.tsx` прошли без единой правки ожиданий.
- [x] ✅ **ИНН — маска снята** (длина 10 или 12, MASK_ENGINE.md §5.3). `FieldINN`:
      `mask: '9'` + `formatMode: 'off'` — только фильтрация «оставить цифры» (`unformat` не
      ограничивает длину количеством слотов маски, только алфавитом символа), без группировки
      литералами; `maxLength: 12` — HTML-ограничение длины. Валидация контрольной суммы (10/12)
      — как была, в `config.validate`, не менялась.
- [x] ✅ **Удалить `use-mask-input`** — убран из `package.json` корня, `libs/forms/package.json`
      (peerDependencies), `package.publish.json` (peerDependencies + peerDependenciesMeta),
      `tsup.config.ts` (external). `bun install` пересобрал `bun.lock` (1 пакет удалён). Живых
      импортов `use-mask-input` в репозитории не осталось — проверено grep по `from
      'use-mask-input'`/`import('use-mask-input')`, единственное совпадение — историческая
      запись в корневом `CHANGELOG.md`.
- [x] ✅ **Фантомные тесты** документных полей — уже закрыто раньше (коммит `c1fd99e9`, до этой
      сессии): `document-fields.spec.tsx` рендерит реальные компоненты через `Form.Document.*`
      и реальные `validate*` из `@letar/forms-core/validators/ru`, не локальные копии.
      Формулировка в PLAN.md была устаревшей.
- [x] ✅ [2026-08-12] **`FieldPhone`/`FieldCreditCard` — форматтеры переведены на общий движок,
      DOM-слой (`useMaskField`/`MaskController`) — сознательно НЕ тронут.**
      - `formatPhoneNumber` (`@letar/forms-core/phone`): раскладка цифр по слотам маски теперь
      вызывает `format()` из `@letar/forms-core/mask` вместо собственного ручного цикла.
      `normalizePhoneDigits()` (снятие кода страны + trunk-префикса `8`) вынесена отдельной
      экспортируемой функцией — это телефонная семантика, а не генерализуемая маска, движок
      её не знает. Все 18 pre-existing тестов (включая регресс-тесты trunk-бага §4 и
      Санкт-Петербурга/Казани/Краснодара) прошли без изменений — поведение идентично.
      - `formatCardNumber`/`formatExpiry` (`@letar/forms-core/credit-card`): группы бренда
      (`gaps`) собираются в маску движка (`9`×gap, разделитель — пробел) и раскладка
      делегирована тому же `format()`; цифры сверх суммы `gaps` (Visa 18/19-значная) движок
      физически не видит (маска фиксированной длины), поэтому хвост по-прежнему дописывается
      вручную без разделителя — как и раньше. `formatExpiry` — маска `99/99`. Все 45
      pre-existing тестов прошли без изменений + 2 новых на переполнение группы.
      - **Живой DOM-контроллер движка (`useMaskField`) НЕ используется для `FieldPhone` —
      осознанное архитектурное решение, не недосмотр.** Он заполняет слоты посимвольно и не
      может ретроактивно «передумать» про уже принятую первую цифру, когда становится ясно,
      что это был trunk-префикс, а не часть номера: 11-я цифра просто отклонится как
      избыточная, воспроизводя ровно тот баг §4, который `normalizePhoneDigits` чинит
      (проверено пошаговой симуляцией посимвольного ввода). Компонентный код `field-phone.tsx`
      (оба скина) остался без изменений — просто теперь вызывает engine-backed
      `formatPhoneNumber`.
      - `FieldCreditCard` (compound-компонент: номер + expiry + CVC, авто-переход между
      полями, бренд-иконка, статус-индикаторы, Luhn на blur) тоже остаётся на
      controlled-`onChange` архитектуре, не на `useMaskField` — переход на DOM-контроллер
      сломал бы авто-переход к следующему полю и smart-month паддинг (`2` → `02`), которые не
      являются задачей маскирования. Мигрировано ровно то, что действительно дублировало
      логику движка (группировка цифр), не более.
      - **Каретка при редактировании середины номера телефона** (баг из §4, «курсор прыгает в
      конец») — по-прежнему НЕ исправлена: требует посимвольного DOM-контроллера, который
      несовместим с trunk-логикой (см. выше). Отдельная, нерешённая задача.
- [ ] `ui.mask` в Zod-мете — **не найдено обещания в `form-docs`** при повторной проверке (grep
      по `ui.mask`/`ui: { mask` — ноль совпадений в `apps/form-docs/content/docs/**`), пункт
      либо устарел, либо относился к MDX, который с тех пор переписали. Директива `ui.mask` как
      таковая по-прежнему не реализована в `field-type-mapper.tsx` — если решим её делать,
      разумная точка входа: `mask` проп `MaskedInputFieldProps` уже принимает то же значение,
      что нужно было бы прокидывать из меты.

- [x] ✅ [2026-08-12] **Консолидация телефона с `@letar/format-utils/phone` — сделано** независимой
      параллельной сессией `letar-dev`, до старта Этапа 1 форм-дева. `libs/forms-core/src/lib/phone/masks.ts`
      (новый) — единый источник `PHONE_MASKS`/`PhoneCountry` (13 стран). `forms` и `forms-shadcn`
      импортируют оттуда, локальные копии убраны (`forms-shadcn` 0.31.1→0.31.2). `format-utils/phone.ts`
      удалён целиком (0.3.0→0.4.0, breaking) — `driving-school` переведён на `forms-core/phone` (RU-обёртка
      `src/lib/phone.ts`, 0.238.7→0.238.8), заодно получил уже известный trunk-префиксный фикс `8`.
      Коммиты (root, не запушены на момент записи): `cda94043`/`56d76605`/`3c9a8acc`/`1e111ba1`/`5bf0153d`.
      ⚠️ **Не входит в сделанное:** `FieldPhone` ещё не переведён на новый declarative mask-движок
      (Этапы 1–3 ещё не существуют) — консолидирован только форматтер/маски-словарь, не движок. Сам
      перевод `FieldPhone` на движок — по-прежнему открытая часть Этапа 4, выполнить после Этапа 3.
      Препроцессоры вставки/автозаполнения (хвост фикса 2.0.4) — тоже открыты, зависят от движка.
      `COUNTRY_FLAGS` в обоих `field-phone.tsx` остался задублирован — не трогали, вне заявленного скоупа.

**Критерий готовности:** ✅ `use-mask-input` не резолвится ни в одном графе сборки — достигнуто
(`nx typecheck:tsgo`/`nx lint`/`nx test` зелёные на `forms`/`forms-core`/`forms-react` после
удаления). Замер bundle size до/после в CHANGELOG — не сделан (не блокирует, можно добавить
отдельно). Открытый хвост Этапа 4 (перевод `FieldPhone` на движок, `FieldCreditCard`) —
самостоятельные подпункты, не мешающие считать «снятие зависимости» закрытым.

---

### ✅ Этап 5. Новые документы (запрос 2026-08-12) — закрыт

Форматы проверены, детали и предупреждения — MASK_ENGINE.md §7.1.

- [x] **Загранпаспорт** `99 9999999` + `zRu.foreignPassport()` — `Form.Document.ForeignPassport`,
      маска движка `formatMode: 'live'` (по умолчанию), без проверки серии по типу бланка.
- [x] **Код подразделения** `999-999` + `zRu.departmentCode()` — `Form.Document.DepartmentCode`,
      без проверки третьей цифры по списку 0–3. Подсказка «кем выдан» по справочнику ФМС —
      **не сделана** (была помечена как опциональная в исходном запросе, отдельная задача:
      нужен bundle справочника hflabs/fms-unit, 16 582 записей, это уже вопрос размера бандла,
      а не движка масок — не блокирует закрытие этапа).
- [x] **Свидетельство о рождении** — **без маски** (критерий §5.3, переменная длина римской
      части 1–5 знаков): `Form.Document.BirthCertificate`, свободный ввод (не составное поле —
      меньше кликов, тот же результат), `normalizeBirthCertificate()` вызывается на `blur`, не на
      каждый символ (иначе неоконченная римская часть искажается раньше времени). Нормализация:
      гомоглифы `|`/`l`/`1`/`І`→`I`, позиционное разведение `X`(латиница, римская часть)/`Х`
      (кириллица, буквы серии), раскладочные гомоглифы букв серии (A/В, E/Е, K/К и т.д.), чистка
      разделителей `-`, пробелов, `№`.
- [x] Валидаторы в `zRu` (`zRu.foreignPassport()`, `zRu.departmentCode()`,
      `zRu.birthCertificate()` + `validateForeignPassport`/`validateDepartmentCode`/
      `validateBirthCertificate`/`normalizeBirthCertificate`), тесты на каждый —
      `libs/forms-core/src/lib/validators/ru/__tests__/` (25 новых тестов) +
      `document-fields.spec.tsx` (13 новых тестов на уровне компонента).

⚠️ **Не валидировали** (сознательно, по предупреждению плана): серию загранпаспорта по типу
бланка, третью цифру кода подразделения по списку 0–3, регион по первым цифрам серии паспорта.

**Живая проверка в браузере не проводилась** для этого этапа — три новых поля используют ту же
инфраструктуру (`createDocumentField`/`useMaskField` для первых двух, обычный контролируемый
`Input` для третьего), что уже верифицирована живьём на Этапах 2–3; риск регрессии в самом
DOM-поведении минимален. Юнит/компонентные тесты покрывают форматирование, валидацию и
нормализацию на blur.

---

### Этап 6. shadcn-скин ✅ закрыт [2026-08-12]

- [x] Портировать 9 полей, отложенных именно из-за `use-mask-input`: `FieldMaskedInput`,
      `FieldCreditCard`, `FieldInn`, `FieldKpp`, `FieldOgrn`, `FieldSnils`, `FieldPassport`,
      `FieldBik`, `FieldBankAccount` (+ `FieldCorrAccount`, тот же модуль в Chakra-версии).
      Реализация: `createDocumentField` (`libs/forms-shadcn/src/lib/fields/document-field-base.tsx`) —
      новая фабрика для shadcn, аналог Chakra-версии; 7 конфигов полей 1:1 (маска/placeholder/
      validate из `@letar/forms-core/validators/ru` framework-агностичны). `FieldMaskedInput` —
      прямой перенос. `FieldCreditCard` — не через `useMaskField` (тот вообще не используется этим
      полем ни в одном скине), портирован на голые `<input>`/Tailwind, форматтеры
      `@letar/forms-core/credit-card` переиспользованы 1:1.
      Ключевая находка: `useMaskField('live')` отдаёт неконтролируемый `<input>` (`ref`+
      `defaultValue`, DOM — источник истины для `MaskController`), а контракт `UIKitInputProps`
      shadcn-скина требует `value`/`onChange` — оба скина одинаково обходят свой UIKit для этой
      группы полей, рендеря сырой `<input>` (Chakra — напрямую из `@chakra-ui/react`, shadcn —
      нативный `<input>` + `NATIVE_INPUT_CLASS` из `@letar/tailwind-utils`).
- [x] Обновить счётчик паритета в README (`libs/forms-shadcn/README.md`: 47/56 → 56/56).
      Демо-приложение (`apps/form-develop-app`/`apps/form-example`) — не обновлено, остаётся
      в Этапе 7 (документация/демо).

---

### Этап 7. Документация и MCP ✅ закрыт [2026-08-12]

- [x] `libs/forms/README.md` + `docs/fields.md` — новые поля, убрать упоминания `use-mask-input`
      как зависимости (они уже устарели для Phone и CreditCard).
      `fields.md` уже был полон (все 12 полей движка масок документированы по ходу Этапов
      4/5/6) — правок не потребовалось. `README.md`: добавлен раздел «Маски ввода» + ссылка на
      `MASK_ENGINE.md`, обновлена дата.
- [x] `apps/form-docs` — гайд по маскам: модель токенов, режимы, когда маска **не** нужна
      (критерий фиксированной длины), a11y-требования.
      Новый гайд `docs/guides/masks` (en+ru), отдельно от `russian-documents` (тот про готовые
      поля, этот — про механику движка). Сборка `nx build form-docs` подтвердила обе локали.
- [x] `apps/form-example`, `apps/form-develop-app` — демо новых полей.
      `CreditCard`/`MaskedInput`/`Phone` демо уже существовали и были полными. Документные демо
      (`form-example/examples/documents`, `form-develop-app/documents-demo`) не хватало 5 полей
      Этапов 5/6 (`CorrAccount`, `Passport`, `ForeignPassport`, `DepartmentCode`,
      `BirthCertificate`) — добавлены в оба приложения.
      **Побочная находка при typecheck `form-develop-app`:** ручной тип `FormComponent['Document']`
      (`form-compound-types.ts`, на него кастуется рантайм-объект `Form`) не обновили при
      добавлении Этапа 5 — `ForeignPassport`/`DepartmentCode`/`BirthCertificate` отсутствовали
      (TS2339 для любого TS-потребителя библиотеки), плюс фантомный `OGRNIP` без реализации.
      Исправлено, `nx typecheck:tsgo forms`/`form-develop-app` зелёные.
- [x] **`libs/form-mcp`** — `list_fields`, `get_field_props`, `get_field_example` для новых полей
      (координатор проверяет этот пункт отдельно).
      Все три тула читают `fields.md` динамически — код менять не пришлось. Добавлен
      регрессионный тест против реального `docsPath` (`field-registry.integration.spec.ts`),
      закрывающий класс инцидента «49 vs 56» из бэклога на будущее.
- [x] `libs/forms/CHANGELOG.md`, версии пакетов.
      `@letar/forms` 2.3.0 → 2.3.1 (patch — фикс типа + доки, без нового публичного API).

---

### Порядок и зависимости

```
Этап 1 (ядро) ──> Этап 2 (DOM) ──> Этап 3 (React+поле) ──> Этап 4 (миграция) ──> Этап 6 (shadcn)
                                                      └──> Этап 5 (новые документы)
                                                                    Этап 7 (доки) — по ходу
```

Этапы 1–3 последовательны строго. Этап 5 не блокируется этапом 4. Документацию вести по ходу,
а не в конце (правило `.claude/commands/forms-dev.md`: правка кода без синхронного обновления
`form-docs`/`form-example` = незавершённая задача).

**Точка остановки для пересмотра:** если на этапе 1 госномер не выражается декларативно —
не идти дальше, вернуться к модели токенов. Если на этапе 2 живой режим не даёт стабильной
каретки в WebKit — обсудить смену дефолта на `'blur'` (у нас уже был WebKit-инцидент,
`.claude/docs/` фиксирует этот класс).

### Оценка объёма

- Этапы 1–3 — ядро работы. Живой режим + свой undo-стек заметно дороже минимального варианта
  (это следствие принятых решений, а не раздувание скоупа).
- Этапы 4–6 — механические, объём предсказуем.
- Полного паритета с возможностями `Inputmask` **не добиваемся сознательно**: даты с диапазонами,
  валюты с плавающим разделителем, regex-маски и alternation — вне скоупа, для них есть
  отдельные поля.

### Задачи вне `libs/forms` (ОБЯЗАТЕЛЬНО после готовности движка — не опциональная уборка)

Ками прямо подтвердил (2026-08-12): дубли перевести на новый движок обязательно, не оставлять
как технический долг «когда-нибудь».

- `driving-school`: проверить, сводится ли `InputPlateNumber` (230 строк) к декларативной маске.
- ✅ [2026-08-12] СНИЛС/ИНН переведены на `zRu.snils()`/`zRu.inn.individual()` из
  `forms-core/validators/ru` — сделано `driving-school-dev` независимо (коммит `9edac34`,
  `passport.schema.ts`), не дожидаясь готовности движка: валидаторы с контрольной суммой уже
  были готовы в `forms-core`, новых фич не требовалось.
- Ревизия: не появились ли ещё копии телефонного форматтера.

---

## Связанные документы

- [README.md](./README.md) — описание и API библиотеки
- [ARTICLE.md](./ARTICLE.md) — ТЗ на публикацию статей на Хабре
- [TESTING_PLAN.md](./TESTING_PLAN.md) — план тестирования
- [apps/driving-school/TANSTACK_FORM_PLAN.md](../../apps/driving-school/TANSTACK_FORM_PLAN.md) — миграция форм driving-school
- [/.claude/docs/forms.md](../../.claude/docs/forms.md) — документация по формам

---

**Последнее обновление:** 2026-07-08 (v1.4.0) — Фаза 7: Clean Architecture (core dependency-free по DIP) + Vue-пруф-адаптер (7.8) как верификация границы, не полный порт
