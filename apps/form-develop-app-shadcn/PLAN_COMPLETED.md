# Form Develop App (shadcn) — выполненные задачи

## Фаза 4 — Разбивка на отдельные демо-страницы (2026-08-13, Этап 0 Фазы 9 P7 `form-docs`)

Единая мега-страница (556 строк, все 47 полей + 6 beta-компонентов в одной форме) разбита на 16
отдельных страниц `src/app/<name>-demo/page.tsx` — паритет гранулярности с `form-develop-app`
(Chakra-версия, эталон). Нужно для чтения-с-диска документацией `form-docs`: один файл = один
пример, мега-страница этому не соответствовала.

- 10 страниц с группировкой простых полей 3–5 шт. по смыслу (`basic-fields-demo`, `select-demo`,
  `choice-demo`, `date-time-demo`, `numeric-demo`, `interactive-demo`, `contact-demo`,
  `specialized-demo`, `auth-fields-demo`, `survey-demo`) + 6 страниц по одному beta/compound
  компоненту (`steps-demo`, `table-editor-demo`, `rich-text-demo`, `schedule-demo`,
  `data-grid-demo`, `auto-fields-demo`) — итого 16.
- Новый `_components/demo-page-layout.tsx` (`DemoPageLayout`/`SubmittedDataPreview` на Tailwind,
  аналог Chakra-версии из `form-develop-app`) + `_components/index.ts` барrel.
- `src/app/page.tsx` — список ссылок вместо самой формы.
- Попутный фикс: `tsconfig.json` не содержал `paths` на `@letar/tailwind-utils` и
  `@letar/forms-core/mask` — оба подключились к `forms-shadcn`/`forms-react` уже после того, как
  приложение было заведено, и `typecheck:tsgo` был красным ещё до этой сессии (тот же класс
  проблемы, что `.claude/rules/libs.md` документирует как «новый внутренний слой ломает всех
  потребителей сразу»).
- `typecheck:tsgo`/`oxlint` зелёные. `next build` не верифицирован — блокирован worktree-средой
  сессии (нет слинкованных `node_modules`, Turbopack не находит пакет `next` относительно
  `turbopack.root`), не связано с содержимым правки. Подробности — `PLAN.md`.

## Фаза 3 — Полный паритет 56/56 (2026-08-11, одна сессия, forms-dev)

`@letar/forms-shadcn` достиг полного паритета с `@letar/forms` (Chakra-скин) — 44→56 из 56 полей.
12 полей, каждое отдельным коммитом (lib + demo) с тестами и полным doc-циклом: `FieldYesNo`,
`FieldNumberInput`, `FieldPasswordStrength`, `FieldTime`, `FieldCascadingSelect`,
`FieldImageChoice`, `FieldSchedule`, `FieldLikert`, `FieldMatrixChoice`, `FieldDataGrid`,
`FieldCalculated`, `FieldAuto` (0.19.0→0.30.0).

- `FieldCascadingSelect` — не `createField()`-поле (как `FormSteps`/`FieldTableEditor`),
  компонует `form.Subscribe` напрямую.
- `FieldDataGrid` — первое поле с новым peer-dep `@tanstack/react-table`, изолировано через
  `lazy()` + dynamic `import()` (тот же паттерн, что `FieldRichText`). Демо — изолированная
  форма с таблицей сотрудников (сортировка, фильтр, инлайн-редактирование, rowSelection,
  CSV-экспорт). Живая проверка рендера/данных — в Chromium; сортировка по клику заголовка —
  через RTL (`fireEvent.click`), не через Browser pane (raw `dispatchEvent(MouseEvent)` не
  триггерит React-обработчик в JS-харнессе — известный класс артефакта, не баг компонента).
- `FieldCalculated` — `useComputedValue` framework-free скопирован дословно из Chakra-версии.
- `FieldAuto` (последнее, замкнуло паритет) — `DemoForm` расширен опциональным `schema`-пропом
  (нужен только этому полю), демо — изолированная форма с 5 полями на все ветки
  диспетчеризации (string/textarea/number/switch/enum). Живая проверка в Chromium подтвердила
  все теги элементов и enum-опции.
- Детали реализации каждого поля (протечки границы, beta-упрощения, находки тестов) —
  в `libs/forms/PLAN.md` §7.3, источник истины, не дублируется здесь.
- `typecheck:tsgo`/`lint`/`test` зелёные на каждом шаге. Счётчик страницы на тот момент: «56 из
  56 полей, полный паритет с `@letar/forms`».
- ⚠️ **Поправка (2026-08-11, v0.30.1):** формулировка «56 из 56» была ошибочной — знаменатель
  (56, реальный подсчёт по файлам `@letar/forms`, включая `City` и document-поля) верный, но
  числитель ошибочно включал 9 непортированных полей (`MaskedInput`, `CreditCard`, 7
  document-полей — backlog до исследовательской сессии по замене `use-mask-input`). Актуальный
  счётчик — 47 из 56, см. `PLAN.md`.

## Фаза 2 — Table/RichText (2026-08-10…11, forms-dev, приоритет координатора закрыт)

Завершение приоритетного списка `QuietRidge` (Signature → FileUpload → Steps → **Table → RichText**).
Демо-страница дополнена 34→36 полями плюс двумя не-Field compound/beta-компонентами.

- Демо `FieldTableEditor` (v0.17.0) — **не Field**, отдельная изолированная форма с array-полем
  `items` (позиции заказа), кастомные колонки с `computed`/`format`, `sortable`, `selectable`,
  footer `aggregate: 'sum'`. Коммиты: `b5fa70a3` (forms-shadcn), `ba67dab2`
  (form-develop-app-shadcn), `82fa8b3f` (forms/PLAN.md).
- Демо `FieldRichText` (v0.18.0) — отдельная изолированная форма с Tiptap-редактором,
  `defaultValues.content` заполнен непустым HTML для проверки начального рендера. Коммиты:
  `24491976` (forms-shadcn), `33d7ab63` (form-develop-app-shadcn), `2dfed284` (forms/PLAN.md).
- Детали реализации (протечки границы, beta-упрощения, находки тестов, живая проверка) — в
  `libs/forms/PLAN.md` §7.3, источник истины, не дублируется здесь.
- `typecheck:tsgo`/`lint` зелёные на каждом шаге.

## Фаза 2 — Signature/FileUpload/Steps (2026-08-10, forms-dev, приоритет координатора)

Продолжение к паритету с `@letar/forms-shadcn` по приоритету координатора `QuietRidge`
(Signature → FileUpload → Steps → Table → RichText). Демо-страница дополнена 33→34 полями плюс
одним не-Field compound-компонентом.

- Демо `FieldSignature` (v0.14.0) — canvas-рисование + typed mode, `width={320} height={120}`.
- Демо `FieldFileUpload` (v0.15.0) — `variant="dropzone" maxFiles={3} showSize`, значение
  `attachments: File[]`. Живая проверка в Chromium: `DataTransfer`+`change`-событие на скрытом
  инпуте (реальный путь браузера) → файл появился в списке (имя+размер), удаление вернуло поле в
  пустое состояние.
- Демо `FormSteps` (v0.16.0) — **не Field**, отдельная изолированная 2-шаговая форма
  (`firstName`/`email`) вне основной демо-формы (`FormSteps` скрывает неактивные шаги — несовместимо
  с плоским списком остальных 34 полей на одной странице). Живая проверка: заполнение обязательного
  поля блокирует переход при пустом значении, «Далее» → следующий шаг + индикатор отмечает
  пройденный шаг галочкой, «Далее»→«Отправить» на последнем шаге, «Назад» возвращает.
- Детали реализации каждого поля/компонента (протечки границы, beta-упрощения, негативные
  контроли) — в `libs/forms/PLAN.md` §7.3, источник истины, не дублируется здесь.
- `typecheck:tsgo`/`lint` зелёные на каждом шаге.
- Коммиты: `41cc3925`/`b79bef83`/`333a514a` (Signature), `ab20d945`/`57ba9133`/`097fb2e2`
  (FileUpload), `84fededc`/`c058e161`/`f7861684` (Steps).

## Фаза 1 — Продолжение к паритету (2026-08-10, одна сессия, forms-dev)

Демо-страница расширена с 17 до 32 полей вслед за `@letar/forms-shadcn` (v0.5.1 → v0.13.0),
по демо-полю на каждое новое поле, в том же коммите/заходе, что добавление поля в библиотеку.

- Новые демо: `FieldAddress` (мок-провайдер адреса), `FieldDateRange` (пресеты
  сегодня/эта-неделя/этот-месяц), `FieldDuration`, `FieldDateTimePicker`, `FieldPhone`
  (`showFlag`), `FieldCurrency`, `FieldPercentage`, `FieldAutocomplete` (список городов),
  `FieldListbox` (группировка Frontend/Backend), `FieldRadioCard`/`FieldCheckboxCard`
  (тариф/дополнения с описаниями), `FieldCity` (тот же мок-провайдер, что Address), `FieldOTPInput`
  (с колбэком `onResend`), `FieldEditable`, `FieldColorPicker`.
- `mockAddressProvider` — общий мок для `FieldAddress`/`FieldCity`, фильтрует статичный список
  улиц/данные без `data.city` — демонстрирует UI/интеграцию, не подменяет реальный DaData.
- Каждое поле проверено живьём в Chromium (Browser pane) сразу после добавления — не одним
  прогоном в конце сессии. Детали проверок и найденные по ходу особенности примитивов
  (`UIKitInputProps` без `min`/`max`/`id`, `react-hooks/rules-of-hooks` на хуках внутри `render()`
  и т.д.) — в `libs/forms/PLAN.md` §7.3, не дублируются здесь (там источник истины по каждому полю).
- `typecheck:tsgo`/`lint` зелёные на каждом шаге.
- Коммиты (по одному на добавление демо, вперемешку с коммитами `libs/forms-shadcn`):
  `a8ed653f`, `bfed19d8`, `ea5d3445`, `927ba573`, `8cc22d9e`, `46b87cd4` и другие — полный список
  в `git log --oneline -- apps/form-develop-app-shadcn` за 2026-08-10.

## Фаза 0 — Фундамент (2026-08-10)

- Сгенерирован каркас приложения (`nx g @letar/generators:new-app form-develop-app-shadcn`, 2026)
- Chakra-каркас генератора заменён на Tailwind 4 + shadcn CSS-переменные (`postcss.config.mjs`,
  `src/app/globals.css` с `@theme inline` и oklch-палитрой light/dark) — под `@letar/forms-shadcn`,
  который не совместим с Chakra в одном глобальном стиле
- `@letar/forms-shadcn` подключена: `nx.implicitDependencies`, `paths` на все подпути
  `forms-core`/`forms-react` в `tsconfig.json` **без** `references` (известный `TS6305`-редирект
  из `.claude/rules/libs.md`, пойман сразу при генерации)
- `DemoForm` (`src/app/_components/demo-form.tsx`) — временный локальный form-root на `useForm`
  (`@tanstack/react-form`) + `DeclarativeFormContext`, пока у `@letar/forms-shadcn` нет своего
  `Form`/`createForm()`
- Демо-страница со всеми 17 полями `@letar/forms-shadcn` на момент создания харнесса
- Живая проверка в Chromium (Browser pane): ввод текста, чекбокс/switch, Rating, Tags (Enter
  добавляет тег — подтверждено через ручной `dispatchEvent(KeyboardEvent)`, штатный `computer{key}`
  инструмента браузерной автоматизации в этой среде не всегда проставляет `event.key`)
- `typecheck:tsgo`/`lint` зелёные. Юнит-тестов нет — харнесс визуальный, не регрессионный гейт
  (в отличие от `form-develop-app` с его 21 e2e)
- Порт 3026, добавлен в `.claude/launch.json`
- Коммиты: `c47b0259` (приложение), `e9387253` (launch.json)
