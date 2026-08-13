# Form Develop App (shadcn) — план разработки

## Статус

Dev-харнесс для `@letar/forms-shadcn` (Фаза 7.3, `libs/forms/PLAN.md` §7.3). Каркас Chakra от
генератора заменён на Tailwind 4 + shadcn CSS-переменные (`src/app/globals.css`) — Chakra и
Tailwind 4 не уживаются в одном глобальном стиле. Демо-страница синхронизирована с полями
`@letar/forms-shadcn`: **47 из 56 портировано (v0.30.1)**. 9 полей в backlog до отдельной
исследовательской сессии по замене `use-mask-input`: `MaskedInput`, `CreditCard`, `Inn`, `Kpp`,
`Ogrn`, `Snils`, `Passport`, `Bik`, `BankAccount`. (Ранее здесь стояло «56 из 56, полный
паритет» — ошибочная формулировка, знаменатель был верным, но числитель включал эти 9
непортированных полей; исправлено 2026-08-11.)

## Фаза 0 — Фундамент ✅

- [x] Скаффолд приложения (`nx g @letar/generators:new-app`), Chakra-каркас снят
- [x] Tailwind 4 (`postcss.config.mjs` + `@theme inline` в `globals.css`, shadcn-переменные
      light/dark)
- [x] `@letar/forms-shadcn` подключена (`nx.implicitDependencies` + `paths` на все подпути
      `forms-core`/`forms-react`, `references` НЕ добавлены — известный `TS6305`-редирект,
      см. `.claude/rules/libs.md`)
- [x] `DemoForm` — временный локальный form-root (`useForm` + `DeclarativeFormContext`), пока у
      `@letar/forms-shadcn` нет своего `Form`/`createForm()`
- [x] Одна демо-страница со всеми 17 полями
- [x] Живая проверка в Chromium (Browser pane): ввод текста, чекбокс/switch, Rating (клик по
      звезде — `aria-checked` меняется), Tags (Enter добавляет тег — подтверждено настоящим
      `KeyboardEvent`, автоматизация клавиатуры в тестовом окружении иногда не проставляет
      `e.key`), typecheck/lint зелёные

## Фаза 1 — Продолжение к паритету ✅ (2026-08-10, одна сессия)

Демо-страница расширена с 17 до 32 полей вслед за `@letar/forms-shadcn` — по одному демо на
каждое новое поле, синхронно с его добавлением в библиотеку (Группа 2 форм-воркфлоу).

- [x] `FieldAddress`, `FieldDateRange`, `FieldDuration`, `FieldDateTimePicker`, `FieldPhone`,
      `FieldCurrency`, `FieldPercentage`, `FieldAutocomplete`, `FieldListbox`, `FieldRadioCard`,
      `FieldCheckboxCard`, `FieldCity`, `FieldOTPInput`, `FieldEditable`, `FieldColorPicker` — по
      демо-полю на каждое, с мок-провайдером адреса (`mockAddressProvider`) вместо реального
      DaData-токена (в песочнице его нет)
- [x] Живая проверка каждого нового поля в Chromium по ходу добавления (не одним прогоном в
      конце) — детали и находки по каждому полю в `libs/forms/PLAN.md` §7.3
- [x] `typecheck:tsgo`/`lint` зелёные после каждого добавления

## Фаза 2 — Продолжение к паритету (приоритет координатора) ✅

Приоритет от `QuietRidge` (тред `forms-phase7-3-shadcn`): Signature → FileUpload → Steps → Table →
RichText.

- [x] `FieldSignature` — демо-поле с `width={320} height={120}`, живая проверка в Chromium (draw
      mode через настоящий `MouseEvent` `dispatchEvent`, typed mode, очистка) — детали в
      `libs/forms/PLAN.md` §7.3
- [x] `FieldFileUpload` — демо-поле `variant="dropzone" maxFiles={3} showSize`, значение —
      `File[]` (`attachments`) — детали в `libs/forms/PLAN.md` §7.3
- [x] `FormSteps` — отдельная изолированная демо-форма (2 шага, `firstName`/`email`), живая
      проверка в Chromium (заполнение → «Далее» → индикатор отметил шаг завершённым → «Отправить»
      на последнем шаге → «Назад» вернул на первый) — детали в `libs/forms/PLAN.md` §7.3
- [x] `FieldTableEditor` — отдельная изолированная демо-форма (array-поле `items`, кастомные
      колонки с `computed`/`format`, `sortable`, `selectable`, footer `aggregate: 'sum'`), живая
      проверка в Chromium (добавление строки, inline-редактирование через `input`-события,
      удаление строки, select-all → bulk-delete кнопка с счётчиком) — детали в
      `libs/forms/PLAN.md` §7.3
- [x] `FieldRichText` — отдельная изолированная демо-форма (Tiptap-редактор, `defaultValues`
      с непустым HTML), приоритетный список координатора (Signature → FileUpload → Steps →
      Table → RichText) закрыт — детали в `libs/forms/PLAN.md` §7.3

## Фаза 3 — Разбивка на отдельные демо-страницы ✅ (Этап 0, Фаза 9 P7 `form-docs`)

Единая мега-страница `src/app/page.tsx` (556 строк, все 47 полей + 6 beta-компонентов в одной
форме) разбита на 16 отдельных страниц-примеров `src/app/<name>-demo/page.tsx` — той же
гранулярности, что у `apps/form-develop-app` (эталон). Причина — техническая: чтение-с-диска
документацией `form-docs` (P7) работает только там, где один файл = один пример.

- [x] `_components/demo-page-layout.tsx` — `DemoPageLayout`/`SubmittedDataPreview` на Tailwind
      (аналог Chakra-версии из `form-develop-app`, но без Chakra — приложение на Tailwind 4)
- [x] `_components/index.ts` — barrel-экспорт `DemoForm` + layout-компонентов
- [x] 10 страниц с группировкой простых полей по смыслу (3–5 полей на страницу):
      `basic-fields-demo`, `select-demo`, `choice-demo`, `date-time-demo`, `numeric-demo`,
      `interactive-demo`, `contact-demo`, `specialized-demo`, `auth-fields-demo`, `survey-demo`
- [x] 6 страниц — по одному beta/compound-компоненту на страницу (как и было раньше, они и в
      мега-странице были отдельными изолированными формами): `steps-demo`, `table-editor-demo`,
      `rich-text-demo`, `schedule-demo`, `data-grid-demo`, `auto-fields-demo`
- [x] `src/app/page.tsx` — теперь список ссылок на все 16 демо (было — сама мега-форма)
- [x] Попутный фикс двух пробелов в `tsconfig.json`: `@letar/tailwind-utils` и
      `@letar/forms-core/mask` не были прописаны в `paths` (библиотека `forms-shadcn` начала их
      импортировать после того, как приложение было заведено — тот же класс проблемы, что описан
      в `.claude/rules/libs.md` § «Потребителю нужны paths и на транзитивные `@letar/*`»). Без
      фикса `typecheck:tsgo` был красным ещё до этой сессии.
- [x] `typecheck:tsgo`/`oxlint` зелёные. `nx build`/`next build` не верифицированы в этой
      сессии — среда worktree без слинкованных `node_modules` (`@letar/*` резолвятся только через
      `paths`, которых Turbopack для собственного поиска пакета `next` не использует) даёт
      «Could not find the Next.js package», не связанную с содержимым правки; см. коммит.

## Бэклог

- [ ] `createForm()`/`Form`-root для `@letar/forms-shadcn` (если понадобится за пределами этого
      харнесса) — отдельная задача, зафиксирована в `libs/forms/PLAN.md` §7.3
- [ ] E2E-тесты (по аналогии с `form-develop-app-e2e`), если харнесс станет постоянным
      регрессионным гейтом, а не только визуальной песочницей
- [ ] Демо для оставшихся 9 полей backlog (`MaskedInput`, `CreditCard`, 7 document-полей) по мере
      их портирования в `forms-shadcn`
- [ ] Живая проверка `nx build`/`next build` в обычном (не worktree) окружении — подтвердить, что
      попутный фикс `tsconfig.json` (`@letar/tailwind-utils`, `@letar/forms-core/mask`) закрывает
      прод-билд полностью, не только `typecheck:tsgo`
