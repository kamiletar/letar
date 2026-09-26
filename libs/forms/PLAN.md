# PLAN.md — @letar/forms

План развития UI-библиотеки компонентов форм.

---

## Backlog (запросы от агентов)

### [2026-09-26] `Form.Inline.Select/Combobox/String` — контролируемое одиночное поле без формы-моста (от domwellbes)

- **Запросил:** domwellbes-dev (msg 2135), **предварительная оценка**: реализацию владелец ещё не подтвердил.
- **Приоритет:** normal. Ставим после этапа Д; связка с этапом Е — реестр `extraSelects/extraComboboxes` (§17)
  уже нужен для `Inline.Combobox.<Имя>`, поэтому раньше Е не начинать.
- **Проблема:** в domwellbes 55 форм вида `<Form schema={XFieldSchema} initialValue={{x}} onSubmit={async () => {}}
  dirtyGuard={false}>` + одно поле (46 Select, 7 Combobox, 2 String) + `Form.Watch` → `setState`: ~14 строк на
  поле, 43 схемы-однострочника, ручное сужение типа в `onChange`, статичный `initialValue` — внешний сброс state
  в поле не доходит.
- **Предложение:** `<Form.Inline.Select<T> value onValueChange options clearable size />`,
  `<Form.Inline.Combobox.Supplier value onValueChange clearable />`; внутри форма без схемы, `dirtyGuard=false`,
  no-op submit, поле + синхронизация `value` внутрь при внешнем изменении; `clearable` → `null` или `''` по опции.
- **Вопросы к ревью:** (1) есть ли готовое — по поиску в `libs/forms/src` нет (`form-simple` с optional
  `onSubmit` не найден); (2) место и имя (`Form.Inline.*` в `createForm`-неймспейсе, не пересекается с
  `Form.Field.*`/`Form.Select.*`); (3) оценка объёма — за `forms-dev` после решения владельца.
- **Статус:** ✅ владелец подтвердил реализацию 2026-09-26; очередь — после этапа Д (`Inline.Combobox.<Имя>`
  использует реестр этапа Е, поэтому детали согласовать с §17). Правило проекта («сырой Select запрещён») делает
  этот компонент законным путём для фильтров и построчных контролов. Перед началом — короткая архитектурная
  заметка в PLAN.md (контракт `value`/`onValueChange`, `clearable` → `null`/`''`, синхронизация внешнего `value`,
  a11y, скины).

### [2026-09-26] Select/Combobox: кастомный рендер значения/опций + `onUpdate` с кнопкой `Form.Field.Select.EditButton` (от владельца)

- **Запросил:** владелец (по опыту прежнего проекта: адрес доставки правился карандашом в модалке, без перехода
  на страницу; рендер по умолчанию библиотечный или свой, кнопка — слот). Развитие `onCreate` (2.17.0).
- **Приоритет:** normal. Этап Б опирается на этап А.
- **Проверено 2026-09-26:** кастомного рендера нет. `label` типизирован как `ReactNode`, но `Field.Select`
  сплющивает его в строку (`getOptionLabel` в `field-select.tsx`, нужен для `itemToString` коллекции Chakra),
  props `renderOption`/`renderValue` нет нигде в `libs`.
- **Этап А:** `renderOption(option, { selected })`, `renderValue(option)`, типизированное `data` в опции;
  контракт в `forms-core/uikit`, chakra + shadcn; Combobox — проверить поведение с нестроковым `label`.
- **Этап Б:** `onUpdate(option) → { label, value } | null` + кнопка редактирования. Имя слота решено владельцем:
  **`Form.Field.Select.EditButton`** (не `Form.Select.EditButton`: под `Form.Select.*` живут `extraSelects`
  приложения, коллизия с пользовательским ключом). Кнопка привязана к контексту опции, сама вызывает `onUpdate`.
- **Правила (уточнено владельцем 2026-09-26):** по умолчанию карандаш есть **и у каждой опции списка, и у
  выбранного значения** (на прежнем проекте владельца было так). У выбранного значения кнопка стоит рядом с
  триггером в `Control` (триггер — `<button>`, вложенная кнопка недопустима). В пункте списка клик по карандашу
  не должен выбирать пункт (stopPropagation на pointer/click) и закрывает выпадашку перед окном; для клавиатуры
  карандаш вне Tab-порядка (`tabIndex=-1`) + горячая клавиша на подсвеченном пункте (решить в реализации), иначе
  теряется навигация по списку — описать в доке. Свой `renderOption` может расставить `EditButton` иначе.
  Скрытие у конкретной опции — `editable: false` в опции. Правило дублей обратное
  `onCreate`: отредактированная подпись побеждает, пока приложение не перезапросит список, потом уступает свежей
  от приложения. Мультивыбор в первой версии вне охвата. `onDelete` не делаем.
- **Дополнение владельца (2026-09-26, через координатора):** по симметрии нужен слот
  `Form.Field.Select.CreateButton` для `onCreate` — тем же механизмом контекста.
- **Архитектура (2026-09-26):** развёрнутое описание обоих этапов для реализации — раздел
  [«Архитектура: кастомный рендер и слоты Select/Combobox»](#архитектура-кастомный-рендер-и-слоты-selectcombobox)
  ниже в этом файле (перед записью про миграцию `zenstack-form-plugin`).
- **Статус:** делегировано `forms-dev` 2026-09-26.

### ✅ [2026-09-26] `createForm({ dirtyGuard })` — защита от потери данных по умолчанию (закрыт forms 2.18.0, от domwellbes-dev)

- **Запросил:** `domwellbes-dev` (CobaltBay) через `forms-coordinator-dev`, тред `forms-dirtyguard-default`;
  владелец добавил: нужен проп для выключения (логин).
- **Решение:** опция `createForm({ dirtyGuard })` и проп формы `dirtyGuard`, тип `boolean | DirtyGuardOptions`,
  проп перебивает опцию, умолчание — выключено. `DirtyGuardScope` внутри формы раздаёт реестр ручных guard и
  монтирует автоматический; ручной `<Form.DirtyGuard />` перехватывает работу (нет дубля окна и
  `beforeunload`), `dirtyGuard={false}` ручной не отключает.
- **Скины:** только React-скин `@letar/forms`; у shadcn/vue/angular своего `createForm`/`Form.DirtyGuard` нет.
- **Проверено:** 15 новых тестов (`dirty-guard-auto.spec.tsx`), весь `forms` — 122 файла, 898 тестов.

### ✅ [2026-09-24] Три доработки по отчёту domwellbes о 2.17.0 (закрыт forms 2.17.1, от domwellbes-dev)

- **Запросил:** `domwellbes-dev` через `forms-coordinator-dev` (тред `forms-domwellbes-2026-09-24`, msg 2107).
- **1. i18n `Form.DirtyGuard` (normal) — ✅.** Ключи `formDirtyGuard.<проп>`, словарь ru/en, лестница
  `resolveStaticFormText`; пропсы остаются переопределением. Заодно исправлен тип базового
  `Form.DirtyGuard` (не знал про `dialogTitle`/`dialogDescription`/`confirmText`/`cancelText`).
  4 новых теста.
- **2. Док про обёртки (low) — ✅.** `docs/fields.md`: обёртка над Select/Combobox обязана пробрасывать
  `onCreate`/`createLabel`, пример для `useQuery` и async-фабрик.
- **3. Пробелы `DirtyGuard` (low, исследование) — вывод записан.** Программный `router.push` и «Назад»
  чисто не закрываются: `push` — вызов функции, перехватить снаружи нельзя без подмены роутера;
  `popstate` приходит после смены адреса, отменить нельзя, а обход через фиктивную запись `history`
  конфликтует с историей App Router. Ограничения задокументированы в `docs/form-level.md` и `form-docs`.
  Кандидат при появлении потребителя: `useDirtyGuardNavigate()` — хук, который возвращает
  `navigate(href)`, проверяет `isDirty` и показывает то же окно (нужен контекст от `DirtyGuard`).
- **Кандидат «при втором потребителе»:** `useCreateOption` — готовый хук диалога создания записи для
  `onCreate`. Сейчас один потребитель (`domwellbes`, в `apps/`), в `@letar/ui`/forms не выносим.
- **Не делаем:** `onCreate` для vue/angular (потребителей нет; см. запись выше).
- **`Field.Select` с `value: ''`:** Chakra — 2.16.12 (domwellbes), shadcn и vue-shadcn уже подменяют
  `''` служебным токеном (`field-select-empty-option.spec.ts`), vue/angular — нативный `<select>`. Правок нет.

### ✅ [2026-09-24] Persistence: устаревший черновик не удаляется, когда значения вернулись к исходным (закрыт forms 2.16.13, от domwellbes-dev)

- **Запросил:** `domwellbes-dev`, живая находка на созвоне (форма материала, карточка с вкладками).
- **Приоритет:** high — окно «Восстановить сохранённые данные?» появляется, хотя данные не менялись.
- **Сценарий:** изменил поле → черновик записан → сабмит упал с серверной ошибкой (черновик
  правильно остался) → вернул поле как было → перемонтировал форму → окно восстановления.
- **Причина:** `form-root/use-form-features.ts:186–189` — при совпадении с baseline запись
  пропускается (`return`), но старый черновик в `localStorage` остаётся. `form-persistence.tsx:257–300`
  при монтировании открывает окно, не сравнивая черновик с текущими значениями формы.
- **Предложение:** значения равны baseline → `clearSavedData()`; при загрузке черновик, равный
  текущим значениям, удалять молча. Регрессионный тест «изменил → вернул → перемонтировал».
- **Решение:** единая `toSnapshot` (без `sensitivePaths` и `excludeFields`) для baseline, живых
  значений и черновика; `clearSavedData()` при возврате к baseline (если черновик принят и не
  восстанавливается); тихое удаление равного baseline черновика при монтировании. Детали —
  `PLAN_COMPLETED.md`.
- **Статус:** ✅ закрыто (тред `forms-domwellbes-2026-09-24`, п.1 из 3).

### [2026-09-24] Persistence: не модальное уведомление вместо окна восстановления (от domwellbes-dev)

- **Запросил:** `domwellbes-dev`, пожелание владельца на созвоне: модальное окно при входе мешает.
- **Приоритет:** normal, после записи выше.
- **Предложение:** вариант отображения — полоса над формой «Есть несохранённый черновик от
  <время>. Восстановить / Удалить», не блокирует страницу; опционально кнопка «Сохранить черновик»
  или видимая отметка «Черновик сохранён». Модальное окно оставить вариантом по умолчанию или
  заменить — решает владелец библиотеки.
- **Статус:** ❌ отменено 2026-09-24. Владелец сказал, что против модального окна не возражает, его можно
  оформить темой. Предпосылка запроса («владелец не хочет модалку») пришла от `domwellbes-dev` без проверки
  у владельца. Если что-то не нравится во внешнем виде окна — правится тема/стиль, а не режим работы.

### [2026-09-24] Select/Combobox: «+ Добавить…» — создать запись справочника, не уходя из формы (от domwellbes-dev)

- **Запросил:** `domwellbes-dev`, пожелание владельца на созвоне: пользователь заполнил форму
  работы, нужной категории нет — ушёл её создавать и потерял ввод.
- **Приоритет:** high.
- **Предложение:** проп у `Field.Select` / `Field.Combobox` (например `onCreate`) — пункт
  «+ Добавить…» в списке (с текстом поиска для combobox) или кнопка рядом; колбэк приложения
  открывает своё окно создания и возвращает `{ label, value }`, поле добавляет опцию и выбирает её.
  Окно создания и server action — на стороне приложения.
- **Готового нет:** греп `onCreate|creatable|InlineCreate` по `libs/forms`, `libs/ui`,
  `libs/admin-ui` пуст (2026-09-24).
- **Статус:** ✅ закрыт в forms 2.17.0 / forms-core 0.15.0 / forms-shadcn 0.39.0 (2026-09-24):
  `onCreate(search) → { label, value } | null` у Select и Combobox в Chakra- и shadcn-скинах, контракт в
  `@letar/forms-core/uikit`. Демо, доки, пример и form-mcp (через `docs/fields.md`) синхронизированы.
  **Не сделано:** forms-vue, forms-vue-shadcn, forms-angular; async-поиск в shadcn Combobox.

### [2026-09-24] `onCreate` у Select/Combobox — паритет Vue и Angular (хвост от domwellbes-dev)

- **Запросил:** `forms-dev` по итогам forms 2.17.0; решение владельца — вести в плане, не делать сейчас.
- **Приоритет:** low — Chakra и shadcn закрыты, приложения на них уже могут использовать.
- **Что осталось:** `forms-vue`, `forms-vue-shadcn`, `forms-angular` (в каждом Select и Combobox). Основа —
  контракт `@letar/forms-core/uikit` (`CREATE_OPTION_VALUE`, `mergeCreatedOptions`, `shouldOfferCreate`).
- **Ловушки:** в `forms-vue`/`forms-angular` Select — нативный `<select>`, служебный пункт должен
  перехватываться до записи в форму; в `forms-vue-shadcn` (Reka) пустое значение опции недопустимо, для
  создания использовать токен (`CREATE_OPTION_VALUE`), не `''`.
- **Тоже долг:** async-поиск и подпись текущего значения в shadcn Combobox.
- **Статус:** ожидание. После реализации — цикл из 6 групп + form-mcp (`docs/fields.md`: убрать строку
  «Скины Vue, Vue-shadcn и Angular пока без `onCreate`»; то же в `form-docs` `select.mdx`/`select.ru.mdx`).

### ✅ [2026-09-23] Persistence-черновик воскресал сразу после успешного сабмита (закрыт forms 2.16.8, от пользователя)

- **Запросил:** пользователь напрямую — находка из domwellbes (`NIGHT_QUEUE_2026-09-22.md` §B3,
  `PLAN_OPEN_QUESTIONS.md:129-136`), воспроизводилась у владельца на форме дома.
- **Приоритет:** high — задевает любую форму с `persistence`, где пользователь не сразу уходит со
  страницы после успешного сабмита.
- **Причина:** `handleSubmit()` чистит черновик (`clearSavedData()`), но библиотека сама следом
  вызывает `form.reset(dataToSubmit)` (`usePostSubmitResetGuard`). Уведомление стора от `reset()`
  не совпадало с baseline-снимком времени монтирования (`subscribeToFormChanges`) — guard
  пропускал его как правку и debounced-запись писала только что отправленные данные обратно в тот
  же localStorage-ключ.
- **Решение:** `updateBaselineAfterClear()` в `use-form-features.ts`, детали и подтверждение
  red→green — `PLAN_COMPLETED.md`.
- **Статус:** ✅ закрыто.

### ✅ [2026-09-23] TanStack Form откатывал значения к `initialValue` на любом re-render после `reset()`, если форма untouched (закрыт forms 2.16.10)

- **Найдено:** побочно, при написании интеграционного теста к задаче выше (`<Form>` через
  настоящий TanStack Form, не изолированный `renderHook`).
- **Механизм:** `FormApi.update()` (`@tanstack/form-core`) сравнивает новый `options.defaultValues`
  с СОБСТВЕННЫМ предыдущим `defaultValues` формы — а `form.reset(dataToSubmit)` без опций
  перезаписывал этот внутренний `defaultValues` на `dataToSubmit`. Если форма untouched, любой
  следующий re-render (даже без смены React-ссылки `initialValue`) откатывал `state.values`
  обратно к пропу `initialValue`. `usePostSubmitResetGuard` не ловил этот случай: его
  корректирующий эффект сам зависел от смены ссылки `initialValue`, а `clearSavedData()`'ы
  `setState` внутри `useFormPersistence` вызывают именно такой «пустой» re-render.
- **Решение:** корневая причина устранена в `commitPostSubmitReset` — `form.reset(dataToSubmit,
  { keepDefaultValues: true })` снимает dirty-состояние, не перезаписывая
  `this.options.defaultValues`, поэтому рассинхрону с пропом `initialValue` неоткуда взяться.
  Корректирующий `useEffect` оставлен как защита от края, переведён на перепроверку на каждом
  рендере (без dependency array). Детали, red→green прогон нового интеграционного теста —
  `PLAN_COMPLETED.md`.
- **Статус:** ✅ закрыто, forms 2.16.10.

### ✅ [2026-09-23] `Form.When` внутри `Form.Steps` терял скрытое required-поле из `hiddenFields` (закрыт forms 2.16.11, от пользователя)

- **Запросил:** пользователь напрямую — находка не в скоупе фикса `Form.Steps.Navigation` (запись
  ниже), обнаружена при чтении `form-when.tsx:126` как соседний путь через тот же
  `extractFieldNames`.
- **Приоритет:** high — «Далее» блокируется required-полем, скрытым условием `Form.When`,
  которое пользователь физически не видит на экране.
- **Гипотеза не подтвердилась:** первоначальная версия (`Form.When`, единственный ребёнок которой
  — кастомный nullary-компонент, тот же паттерн, что в записи ниже) не воспроизвелась юнит-тестом
  — пока поле скрыто, оно не смонтировано, `FormStepsFieldRegistryContext` не включает его в
  `stepInfo.fieldNames` вовсе, этот путь уже работал благодаря фиксу 2.16.9.
- **Реальная причина оказалась в соседнем, более распространённом сценарии** — ПРЯМОЕ поле внутри
  `Form.When` (`<Form.When ...><Form.Field.String name="companyName" /></Form.When>`, без
  обёртки): статический `extractFieldNames` на уровне шага видит такое поле независимо от
  видимости, поэтому единственный механизм исключения из валидации — `hiddenFields`. `fieldNames`
  в `FormWhenContent` пересчитывался в новый МАССИВ на каждый посторонний ре-рендер, `stepsContext`
  тоже менял ссылку при регистрации соседних шагов — эффект перезапускался, его cleanup безусловно
  вызывал `showFieldsForValidation` при `!shouldRender`, а асимметрия `isFirstMount`/
  `prevShouldRender` не давала скрыть поле заново. `hiddenFields` пустел после первого же
  постороннего ре-рендера.
- **Решение:** стабилизация `fieldNames` по содержимому (тот же приём, что `fieldNamesRef` в
  `form-steps-step.tsx`) + переход с cleanup-based «отмены» на идемпотентную синхронизацию через
  `isHiddenRef`; восстановление на настоящий unmount — отдельный эффект с пустым deps.
- **⚠️ Известное ограничение, не задетое этим фиксом:** финальный сабмит формы по-прежнему
  валидируется по ПОЛНОЙ Zod-схеме независимо от `hiddenFields` (тот участвует только в
  `validateCurrentStep`, навигации между шагами) — если поле может остаться скрытым до конца
  визарда, схема должна сама делать его `.optional()`/условно обязательным (`.superRefine()`).
  `Form.When` не ослабляет схемную валидацию и не должен.
- **Тесты:** 5 новых кейсов в `form-when.spec.tsx` (скрытое/видимое поле, с nullary-обёрткой и без,
  плюс тест, фиксирующий текущий контракт финального сабмита) + полный прогон `nx test forms`
  859/859.
- **Статус:** ✅ закрыто.

### ✅ [2026-09-23] `Form.Steps.Navigation` пропускала валидацию, если поля шага вынесены в компонент (закрыт forms-react 0.11.2 / forms 2.16.9, от пользователя)

- **Запросил:** пользователь напрямую — репро на domwellbes `/admin/houses/new`: клик «Далее» на
  пустом шаге 1 (обязательные «Название»/«Slug») пропускал переход без единой ошибки валидации.
- **Приоритет:** high — задевает любую wizard-форму, где поля шага вынесены в отдельный
  компонент (`function BasicFields() { return <Field.String name="name" /> }`).
- **Причина:** `extractFieldNames` — статический обход JSX `children` шага — не видит поля
  внутри такого nullary-компонента: у `<BasicFields />` как элемента нет своего `props.children`.
  `fieldNames` шага оказывался пустым, `validateCurrentStep` считал шаг непроверяемым и
  пропускал его безусловно. Паттерн системный — так устроены все wizard-формы domwellbes (дом,
  работа, материал, программа финансирования) и onboarding driving-school, не только house-form.
- **Решение:** динамическая регистрация полей — `FormStepsFieldRegistryContext`
  (`@letar/forms-react`, no-op вне `Form.Steps`) + `useDeclarativeField` сообщает свой `fullPath`
  при монтировании; `FormStepsStep` объединяет эти пути со статическим списком (`mergeFieldNames`)
  и перерегистрирует шаг. Аддитивно, без изменений в потребителях (house-form.tsx и другие формы
  не тронуты).
- **Тесты:** 2 новых в `form-steps.spec.tsx` (блокировка на пустых required-полях, штатный
  переход на валидных) + полный прогон `nx test forms` 853/853, `nx test forms-react` 125/125.
- **Живая проверка:** domwellbes `/admin/houses/new`, dev-session `admin@domwellbes.ru` — пустой
  шаг 1 теперь блокируется сводкой ошибок, валидный переходит на «Классификация» как раньше.
- **Статус:** ✅ закрыто.

### ✅ [2026-09-22] Хардкод-дефолты `placeholder` вне Combobox/Autocomplete — 7 полей (закрыт forms 2.16.6, от пользователя)

- **Запросил:** пользователь напрямую, продолжение фикса Combobox/Autocomplete (2.16.4→2.16.5,
  запись ниже) — повторная сверка `grep` за пределами `form-fields/selection/` нашла ещё
  непочиненные литералы того же класса.
- **Приоритет:** normal
- **Описание:** `Field.Address` (`'Start typing address...'`), `Field.City` (`'Enter city'`),
  `Field.Signature` (`'Sign here'`), `Field.Editable` (`'Click to edit'`),
  `Field.PasswordStrength` (`'Enter password'`), `Field.RichText` (`'Start typing...'`) и юнит-
  подпись `'min'` у `Field.Duration` (`format="minutes"`, найден повторной проверкой расширенным
  паттерном — исходный `grep` из задачи не матчил многоточие).
- **Решение:** новый `field-default-strings.ts` (`form-fields/base/`) на общем
  `resolveStaticFormText`, отдельный от `selection-field-strings.ts` (разные поля, нет общего
  родителя). Приоритет проп → schema meta → перевод приложения → словарь → английский сохранён.
- **Тесты:** `field-default-strings.spec.ts` по образцу `selection-field-strings.spec.ts`,
  `nx test forms` 849/849, `nx lint forms`, `nx typecheck:tsgo forms`.
- **Статус:** ✅ закрыто. Работа велась параллельно основной сессии `forms-dev` (занята другой
  задачей) под временной identity agent-mail, конфликтов по файлам не было (file reservation).

### ✅ [2026-09-22] Дублирование лестницы резолва статичных UI-строк в трёх местах — заголовок `Form.Errors`, `minChars`, `form-persistence` (закрыт forms-core 0.13.1 / forms 2.16.5, от пользователя)

- **Запросил:** Ками напрямую — находка из сессии про локализацию `minChars` (2.16.3): три места
  независимо повторяли один и тот же порядок «перевод приложения по ключу → встроенный словарь по
  `locale` → английский/дефолт из пропов, если провайдера нет вовсе».
- **Описание:** `resolveDefaultErrorsTitle` (`form-errors.tsx`), `resolveMinCharsHint`
  (`min-chars-hint.ts`) и `localizeOrFallback` (`form-persistence.tsx`) — та же лестница, что уже
  унифицировалась 2026-09-15 (запись «Дублирование fallback-логики i18n» ниже), только на уровень
  выше: тогда извлекли внутренний примитив `resolveTranslation`, а порядок «i18n есть/нет →
  перевод → builtin по locale» каждое из трёх мест всё равно собирало заново.
- **Решение:** `resolveStaticFormText(i18n, key, resolveBuiltin, params?)` в
  `libs/forms-core/src/lib/i18n/resolve-static-text.ts` (framework-free, переиспользует
  `resolveTranslation` внутри). `resolveBuiltin(locale)` абстрагирует разницу между словарём с
  плюрализацией (`minCharsHint`) и fallback-текстом из пропов без своего словаря
  (`form-persistence`). Поведение всех трёх мест сохранено бит-в-бит. Параллельно (в той же
  сессии, соседней веткой работы) резолвер сразу переиспользован для локализации дефолтов
  `placeholder`/`loadingMessage`/`emptyMessage` Combobox/Autocomplete — см. запись ниже.
- **Тесты:** новая `resolve-static-text.spec.ts` в `forms-core`; `min-chars-hint.spec.ts`,
  `form-errors.spec.tsx`, `form-persistence.spec.tsx` — зелёные без правок ожиданий. `nx test
  forms` 843/843, `nx test forms-core` 561/561.
- **Статус:** ✅ закрыто, коммит `28297c82a`.

### ✅ [2026-09-22] Дефолты `placeholder`/`loadingMessage`/`emptyMessage` в Combobox/Autocomplete захардкожены по-английски (закрыт forms 2.16.4→2.16.5, от пользователя)

- **Запросил:** пользователь напрямую, продолжение фикса подсказки `minChars` (2.16.3, см. запись
  ниже) — рядом остались непочиненные литералы того же класса.
- **Приоритет:** normal
- **Решение:** `selection-field-strings.ts` (`resolveSelectionString`/`useSelectionString`),
  приоритет «явный проп/schema meta > перевод > встроенный словарь > английский» сохранён.
  Параллельно (независимая сессия `forms-dev` с той же fixed-identity, замечено по гонке в
  `lint`) появился общий резолвер лестницы `resolveStaticFormText` (`@letar/forms-core/i18n`) —
  сразу переиспользован вместо собственной копии. Обе части объединены в один коммит `28297c82a`
  (forms 2.16.5), координация зафиксирована в agent-mail (тред
  `forms-selection-strings-parallel-session`).
- **Тесты:** `selection-field-strings.spec.ts` + `resolve-static-text.spec.ts`,
  `nx test forms`/`forms-core` — 843+561 зелёных.

### ✅ [2026-09-22] `Form.Steps` — `CompletedContent` недостижим обычной навигацией + trigger-атрибуты не обновляются (закрыт forms-react 0.11.0 / forms 2.16.0, от form-develop-app-e2e)

- **Запросил:** временная identity `CoralGrove` (сессия form-develop-app-e2e), agent-mail, тред
  `form-steps-completed-content-unreachable`
- **Баг 1 (реальный, исправлен):** `form-steps.tsx:269` — `isLastStep: currentStep === stepCount - 1`;
  `use-step-navigation.ts:175-176` — `goToNext()` не пускал `currentStep` дальше `stepCount - 1`. На
  последнем реальном Step `Navigation` уже рисовала submit-кнопку вместо Continue — клик сразу
  вызывал `form.handleSubmit()`, `Form.Steps.CompletedContent` не рендерился через обычную
  навигацию никогда, только через `skipToEnd()`.
  - **Решение:** `FormSteps` теперь детектирует наличие `<Form.Steps.CompletedContent>` в дереве
    (`hasCompletedContent`, тем же механизмом, что и `countDeclaredSteps` — синхронный обход
    `children`, без ожидания эффектов) и передаёт его в контекст. `FormStepsNavigation` рендерит
    Submit по `hasCompletedContent ? isCompleted : isLastStep` — без `CompletedContent` поведение
    не меняется вовсе (Submit сразу на последнем шаге), с ним последний шаг сначала Continue →
    состояние "завершено" → уже там Submit. Граница `goToNext()` расширена с `nextStep <
    stepCountRef.current` до `nextStep <= stepCountRef.current` — безопасно для форм без
    `CompletedContent`, потому что для них `goToNext()` с последнего шага не вызывается вообще
    (кнопка там сразу Submit, не Continue).
- **Баг 2 (не был реальным багом):** ручная проверка `[data-part="trigger"]` "залипал" после
  `goToNext()`. Расследование в браузере показало: страница `/steps-demo` держит ДВЕ формы, у первой
  (`linear`) `Steps.Trigger` вообще не монтируется (`FormStepsIndicator`: `isClickable = clickable
  && !linear` → `false`), а `bun why @zag-js/steps` подтвердил единственную версию 1.43.3 (дублей
  нет — теория из триажа не подтвердилась). Document-wide `[data-part="trigger"]` без scope на
  форму молча матчил триггер ВТОРОЙ (non-linear) формы — классический паттерн unscoped-локатора
  (`.claude/docs/e2e-testing.md`). При точечной проверке (`page.locator` внутри нужной формы)
  триггер обновляется корректно и синхронно с `currentStep`, как и `[data-part="indicator"]`. Код
  библиотеки не менялся — только комментарии в e2e-тесте приведены в соответствие с находкой.
- **Тесты:** `apps/form-develop-app-e2e/src/steps-demo.spec.ts` — оба `test.fixme()` сняты, оба
  теста проходят (`nx e2e form-develop-app-e2e -- --project=chromium`, 15/15 зелёных). Комментарии
  про мнимый баг триггера переписаны. `form-steps.spec.tsx` — 2 новых интеграционных теста
  (с `CompletedContent`/без), `form-steps-navigation.spec.tsx` — 2 новых юнит-теста на
  `hasCompletedContent`. `nx test forms`/`forms-react` — 828/122 зелёных, `typecheck:tsgo`/`lint`
  чистые.
- **Документация:** `libs/forms/docs/form-level.md` и `apps/form-docs` (en/ru `multi-step.mdx`) —
  новый раздел про `CompletedContent`.
- **Статус:** ✅ закрыт

### ✅ [2026-09-22] `useFormServerAction.run` — сужение типа результата до `Exclude<TData, ActionFailure>` (закрыт forms-react 0.10.1 / forms 2.15.1, от координатора)

- **Запросил:** `forms-coordinator-dev` (agent-mail, тред `form-action-result-extract`), задача #1819
- **Описание:** после закрытия «Отказ Server Action значением» (пункт ниже) `run`'s тип результата
  оставался `TData` целиком — для action, обёрнутой в `catchActionFailure` (`TData = T |
  ActionFailure`), `onSuccess`/резолв `run` типизировались как union с `ActionFailure`, хотя
  рантайм уже отсекал отказ (бросал `ActionFailureError` до `onSuccess`). Блокировало миграцию
  domwellbes на импорты `@letar/forms` без ручного `as`/type guard на каждом вызове.
- **Решение:** `run: <TData>(action, onSuccess?: (result: Exclude<TData, ActionFailure>) => void)
  => Promise<Exclude<TData, ActionFailure>>`. Внутри — явное приведение `result as Exclude<TData,
  ActionFailure>` после рантайм-проверки `isActionFailure`: TS не сужает неограниченный generic
  `TData` через predicate внутри тела функции самостоятельно.
- **Тест на типы:** `use-form-server-action.typetest.ts` (`expectTypeOf` + instantiation
  expressions `run<...>`, TS 4.7+ — нужны, чтобы проверить поведение generic-метода на конкретном
  `TData`) — 4 случая: `T | ActionFailure`, `TData` без пересечения с `ActionFailure` (старые
  вызовы), `TData` структурно совпадающий с `ActionFailure` целиком без опционального `field`,
  вырожденный `TData = ActionFailure` → `never`. Проверено вручную через `tsgo --noEmit -p
  tsconfig.spec.json` (ни один типecheck-таргет `nx` не гоняет `tsconfig.spec.json` — то же самое
  относится и к прежнему `context.typetest.ts`, известный, не новый разрыв покрытия).
- **Проверено:** `nx test forms-react` (11 тестов, поведение не изменилось), `nx typecheck:tsgo
  forms-react/forms/aboi` — зелёные; 4 формы входа aboi (Better Auth) не задеты (`Exclude` для их
  `TData` — тождество). Демо/пример/гайд не трогали — `run(...)` там вызывается без `onSuccess`
  или без обращения к свойствам результата.
- **Статус:** ✅ закрыт

### ✅ [2026-09-22] `Form.Errors` — сводка показывает сырой ключ поля вместо подписи (закрыт forms 2.15.2, от domwellbes)

- **Запросил:** временная identity `BoldRobin` (сессия domwellbes, тред `forms-domwellbes-error-summary-field-key`)
- **Описание:** `extractAllErrors` (`libs/forms/src/lib/declarative/form-errors.tsx:88`) собирала
  сообщение как `` `${fieldPath}: ${issue.message}` `` — пользователь видел технический ключ
  (`consentAccepted`), а не подпись поля.
- **Решение:** контекст формы (`DeclarativeFormContextValue.schema`) уже несёт Zod-схему —
  оказалось достаточно резолвить подпись через существующий `getFieldMeta(schema, fieldPath).ui?.title`
  (`@letar/forms-core/schema`, тот же, что уже использует `table-columns.ts`), без нового реестра
  label и без риска лишнего ре-рендера при монтировании полей. Без схемы в контексте или без
  `ui.title` у конкретного поля — сводка показывает только `issue.message`, сырой ключ не
  примешивается вообще, ни в каком виде.
- **Проверено:** `form-errors.spec.tsx` — оба случая (с подписью из схемы / без схемы вовсе, обе
  ветки покрыты новыми тестами). Прогреп e2e на ассерты по текущему формату `<field>: <message>` —
  два совпадения (`domwellbes-e2e/src/lead-request.spec.ts`,
  `domwellbes-e2e/src/sign-up-consent.spec.ts`), оба уже используют locator, скоуп-нутый на
  `[data-part="error-text"]` под полем (написаны с расчётом на то же дублирование текста сводкой),
  формат сводки не читают напрямую — не задеты.
- **Статус:** ✅ закрыт

### ✅ [2026-09-21] Отказ Server Action значением: `ActionFailure`/`unwrapActionResult`/`useActionFormErrors` (закрыт forms-core 0.13.0 / forms-react 0.10.0 / forms 2.15.0, от domwellbes)

- **Запросил:** domwellbes-dev (agent-mail, тред `form-action-result-extract`)
- **Приоритет:** high
- **Описание:** в production Next.js стирает текст ошибки, брошенной из Server Action (код 441),
  включая нарушение unique. Пилот в domwellbes (`src/lib/action-result.ts`,
  `use-action-form-errors.ts`) возвращает отказ значением `{ error, field? }`, форма бросает его
  заново. Второй потребитель есть: mandala, svoichuzhie, driving-school, aboi (user-facing `throw` в
  `'use server'`). Предложено: `ActionFailure`/`UserFacingError`/`catchActionFailure`/
  `isUniqueViolation` в `@letar/forms-core/server-errors`, `useActionFormErrors` в `@letar/forms`,
  плюс `parseActionResultError` принимает `{ error }` без `success: false`.
- **Триаж (2026-09-21):** принято, делегировано `forms-dev` (agent-mail, тред `form-action-result-extract`).
  Раскладка домашнего приложения принята. Отступления от предложения: `parseActionResultError` не
  расширяется (защита `success === false`), вместо этого отдельный парсер отказа перед ним в цепочке
  `mapServerErrors`; на решение `forms-dev` — маркер в формате отказа (дак-тайпинг `{ error: string }`
  бросит и успешный результат с полем `error`); границы разбора имени unique-ограничения (подчёркивания,
  `@map`) — тестами и README.
- **Решение (2026-09-21):** в `@letar/forms-core/server-errors` — `ActionFailure` =
  `{ success: false; error; field? }` (подтип `ActionResultError`, маркер явный, значение собирает
  фабрика `actionFailure`), `unwrapActionResult`, `catchActionFailure`, `UserFacingError`,
  `ActionFailureError`, `isDbErrorCode`/`isUniqueViolation` (SQLSTATE из `dbErrorCode` и `cause.code`,
  P2002 не трогают), `uniqueFieldsFromConstraint`, парсер `parseActionFailureError` перед
  `parseErrorObject`. `useFormServerAction.run` сам узнаёт возвращённый отказ и бросает
  `ActionFailureError`; `useActionFormErrors(config?)` — тонкая обёртка `formRef` + `middleware`.
  Всё реэкспортировано из `@letar/forms` и `@letar/forms/server-errors` (подпуть без React — для
  Server Action).
- **Отступления от триажа:** `parseActionResultError` всё же научен `field` — но только при
  `success: false`, защита от ложного срабатывания сохранена (тест на `{ items, error }`); поле из
  имени ограничения выводится **только для `Table_field_key`** (три части) — составной ключ,
  `@@map("snake_case")` и `@map` неоднозначны, поля не будет, свой текст находится по хвосту имени
  через `uniqueMessages`. В библиотеке только общий текст дубля по `locale` (ru/en); тексты
  `slug`/`sku`/`inn` остаются в domwellbes.
- ⚠️ **Поведенческое изменение `run`:** action, вернувшая `{ success: false, error: string }`, теперь
  бросает вместо резолва. Потребители в монорепо — четыре формы входа aboi на Better Auth, они
  возвращают не такие значения.
- **Парити:** обёртки для Vue/Angular нет — там нет `useFormServerAction`; ядро (`ActionFailure`,
  `unwrapActionResult`, `catchActionFailure`, парсеры) framework-free и работает в любом скине.
- **Проверено:** тесты forms-core (`action-failure.spec.ts`), forms-react (`use-form-server-action`,
  `use-action-form-errors`), lint/typecheck трёх пакетов и трёх приложений. Живой прогон демо — в
  `form-develop-app` `/server-errors-demo`.
- **Дальше (за domwellbes-dev):** перейти на импорты `@letar/forms`, удалить пилот
  (`action-result.ts`, `use-action-form-errors.ts`, `db-errors.ts` в части unique) и вынести тексты
  `slug`/`sku`/`inn` в `uniqueMessages`. Тест на настоящей ORM-ошибке (`action-result.db.spec.ts`)
  остаётся в приложении — библиотека БД не знает.
- **Статус:** ✅ закрыт

### ✅ [2026-09-21] `Steps.Navigation`: пропсы кнопок с `data-*` (закрыт v2.14.22, от domwellbes)

- **Запросил:** domwellbes-dev (тред `form-domwellbes-steps-nav-assist-ids`, agent-mail 1784 от координатора)
- **Приоритет:** high
- **Описание:** `FormStepsNavigation` не принимал ни `data-*`, ни пропсов для кнопок. Режим наставника
  domwellbes находит элементы по `data-assist-id`, поэтому не мог подсветить «Создать» в мастерах.
- **Решение:** `prevProps`/`nextProps`/`submitProps`/`skipProps`, тип `FormStepsNavigationButtonProps` =
  пропсы кнопки (Chakra `ButtonProps` / атрибуты нативной `<button>`) без `onClick`/`disabled`/`loading`/
  `type` (в shadcn и Vue ещё и без `className`/`class`) + сигнатура `data-${string}`, так что литерал
  `{ 'data-assist-id': '…' }` пишется без `as`. Пропсы потребителя раскладываются **до** собственных
  атрибутов кнопки — служебные `onClick`/`disabled`/`type` перебить нельзя (тесты на это есть).
  «Далее» и «Отправить» — две разные кнопки: на последнем шаге `nextProps` не применяется, там
  `submitProps`. Не выбран `assistIdPrefix`: он вшивал бы в библиотеку знание о режиме наставника.
- **Паритет:** `@letar/forms` 2.14.22, `@letar/forms-shadcn` 0.38.0, `@letar/forms-vue` 0.16.0,
  `@letar/forms-vue-shadcn` 0.17.0. `@letar/forms-angular` компонента шагов не имеет (Фаза 11 его не
  портировала) — API там не нужен. `libs/form-mcp` `Steps.Navigation` не описывает — не менялся.
- **Проверка:** тесты во всех четырёх скинах (красные до фикса); живая проверка в `form-develop-app`
  `/steps-demo`: шаги 1–2 — `prev` и `next`, последний — `next` исчезает, `submit` встаёт на «Create
  Account» (`type="submit"`). Демо/доки: `form-develop-app` (+`-shadcn`), `form-docs` (гайд `multi-step`
  en/ru + `/demo/multi-step`), `form-example` (`/examples/multi-step`).
- **Статус:** ✅ закрыт, версия `@letar/forms` 2.14.22 сообщена в тред.

### ✅ [2026-09-19] Деплой `form-docs` 0.6.12 / `form-example` (закрыт: подтверждён 2026-09-19)

- **Итог:** `deploy-agent-dev` подтвердил деплой в треде `deploy-form-docs-form-example-20260919`
  (agent-mail 1753): оба на s2 успешно, собрано с HEAD `8b3202ae5` (содержит `3564baa57`); form-docs
  0.6.12 отдаёт `form.tooltip` на `/en/docs/guides/zenstack-plugin`, form-example 0.1.22 — 200 на
  `/examples/zenstack`; staging form-example на s1 тоже передеплоен. Запросы 1736/1737/1738 закрыты этим
  же деплоем. Вопрос был открыт из-за того, что подтверждение доставлено во входящие
  `forms-coordinator-dev`, а тот числился retired.

### ✅ [2026-09-21] Сколько обратных слэшей реально стоит в `@regex` схем приложений (закрыт: везде верно)

- **Контекст:** при документировании ловушек директив ([zenstack-form-meta-directive-pitfalls](/.claude/docs/zenstack-form-meta-directive-pitfalls.md))
  замером на `loadDocument` установлено: в `.zmodel` `\s` → `s`, `\\s` → `\s` (верно), `\\\\s` →
  `\\s` (неверно). Исходная заметка о находке называла вариант с четырьмя слэшами — возможно,
  это артефакт экранирования при пересказе, а не содержимое файла. Не проверено, какая форма
  стоит в `schema.zmodel` приложений; неверная форма не даёт ошибок — регулярка просто пропускает
  лишнее (например, пробелы в email).
- **Решение (2026-09-21):** просканированы все 191 `.zmodel` репозитория (включая выкачанные
  приватные submodule и `libs/*`) Node-скриптом по байтам файла, а не по выводу терминала.
  `@regex` со слэшем — один, слэши записаны парой `\\` (верно); в сгенерированной схеме
  рантайм-значение содержит `\s`/`\.`, прогон на примерах: пустая строка и адрес проходят, адрес с
  пробелом отвергается. Вариантов с одним или четырьмя слэшами в репо нет — версия «четыре
  слэша» из исходной заметки была артефактом экранирования при пересказе. Править схемы не
  пришлось. Уточнено попутно: нативный `@regex` в сгенерированном файле — TS-строка внутри
  `ZodUtils.addStringValidation`, а не `.regex(/…/)` (тот путь только у `form.props.pattern`);
  проверка в доке исправлена. Абзац про съедаемые слэши добавлен в README плагина и
  `.claude/skills/zenstack-helper/reference/form-directives.md`. Сторож добавлен
  2026-09-21: `scripts/check-zmodel-regex-backslashes.mjs`, gate `zmodel-regex-backslashes` в
  `bun scripts/check-all.mjs` (одиночный слэш перед классом или другим символом — ошибка, серия
  из трёх и больше слэшей — предупреждение); в CI покрытие неполное — приватные submodule не
  выкачаны. Он проверяет запись слэшей, а не смысл регулярки: семантику по-прежнему проверяют
  сверка сгенерированного файла и тест на схеме.

### ✅ [2026-09-19] `zenstack-form-plugin` — `title`/`placeholder`/`description` вставляются в код без экранирования (закрыт plugin v4.1.1, найдено при tooltip)

- **Запросил:** forms-dev (побочная находка, не запрос приложения).
- **Приоритет:** normal — на практике всплывёт только на тексте с апострофом.
- **Описание:** `generateUIMeta` (`model-generator.ts`) собирает `title: '${formMeta.title}'` в
  одинарных кавычках без экранирования. `@meta("form.title", "Цена d'or")` даст невалидный TS в
  сгенерированном файле. `tooltip` от этого защищён (`JSON.stringify`), три старых ключа — нет.
- **Как чинить:** тот же `JSON.stringify` для трёх ключей. Осторожно: тесты и сгенерированные
  файлы во всех приложениях (`git diff` по `src/generated/`) сейчас с одинарными кавычками — смена
  стиля кавычек шумит диффом, поэтому либо экранировать только при наличии `'`/`\`, либо принять
  разовый диф.
- **Решение:** `quoteTsString` (`ts-literal.ts`) экранирует `\`, `'`, переводы строк и U+2028/2029 и
  применяется также к `label` значений enum и строковому `@default`. Обычный текст остаётся
  байт-в-байт прежним: `zenstack generate` на `form-example`/`form-develop-app` дифа не даёт.
- **Доработка (plugin 4.1.2, 4.1.3):** остались вставки `'${…}'` из пользовательского текста —
  `constraints.startsWith`/`endsWith`/`contains`, `fieldType` (4.1.2) и `constraints.pattern` в
  regex-литерале `/…/` (4.1.3, `quoteRegexLiteral`: экранирует `/` и переводы строки). Остальные
  `'${…}'` в плагине — идентификаторы (модели, поля, enum-значения, ключи i18n), оставлены как есть.
- **Статус:** ✅ закрыт (plugin 4.1.1, докрыт 4.1.2 и 4.1.3).

### ✅ [2026-09-19] Директивы подсказки поля `@meta("form.tooltip.*")` в `zenstack-form-plugin` (закрыт plugin v4.1.0/form-mcp v2.1.0, от domwellbes-dev)

- **Решение:** `form.tooltip.<title|description|impact|example>` → `.meta({ ui: { tooltip } })`.
  Сверх запроса добавлен `example` (он есть в `FieldTooltipMeta`). `description` обязателен, как в
  `FieldTooltipMeta`: без него подсказка не генерируется и печатается warning (иначе литерал не
  прошёл бы typecheck). Неизвестный подключ (`form.tooltip.impakt`) — warning от
  `findUnknownMetaFormPaths`. Значение сериализуется `JSON.stringify`.
  Ограничение: тултип не попадает в файлы переводов i18n-режима (там только
  title/placeholder/description).
- **`minorUnitScale`:** проверено на реальном `zenstack generate` (`apps/form-example`, временно): в
  сгенерированной схеме `fieldProps: {"minorUnitScale":100}`, тест в `parser.spec.ts`/
  `model-generator.spec.ts`. Доходит до типизированных тегов через `useResolvedFieldProps`
  (forms-react v0.7.0).
- **Тесты:** parser (сборка tooltip, только impact, отличие от `form.description`, не-строка,
  неизвестный подключ, `minorUnitScale`), детектор опечаток, генератор (tooltip, кавычки, без
  description → warning, tooltip рядом с `fieldProps`), form-mcp (директива в реестре).
- **Демо/доки:** `form-develop-app` `/meta-syntax-demo`, `form-docs` guides/zenstack-plugin (ru/en),
  `form-example` (`Product.price`, проверено вживую: тултип показывает title/description/impact),
  README плагина, скилл `zenstack-helper`.
- **Первоначальный запрос (для истории):**
- **Запросил:** `domwellbes-dev` (через файл: `forms-coordinator-dev` сейчас retired, письмо не доставлено).
- **Приоритет:** high — блокирует переход приложения с ручных Zod-схем на схемы из `schema.zmodel`.
- **Что нужно:** плоские ключи `form.tooltip.title` / `form.tooltip.description` / `form.tooltip.impact`,
  результат в схеме — `.meta({ ui: { tooltip: { title, description, impact } } })` (то же `ui.tooltip`,
  что поля читают сегодня).
- **Зачем:** в приложении ~50 ручных `_schemas/*.schema.ts` держат `tooltip` у каждого поля («на что
  влияет»). `get_directives` его не знает — при переходе на генерацию приходится терять подсказку или
  ужимать до `form.description` (так сделан справочник поставщиков — пилот).
- **Заодно проверить:** `@meta("form.props.minorUnitScale", 100)` для `Field.Currency` в копейках
  доходит до поля в сгенерированной схеме.

### ✅ [2026-09-19] `useUrlPrefill` — тот же дефект: `window.location` читается в `useMemo` (закрыт v2.14.21, запросил forms-coordinator-dev по решению владельца)

- **Запросил:** forms-dev (побочная находка, не запрос приложения).
- **Приоритет:** normal — потребителей в репо только демо (`form-docs`, `form-example` `/url-prefill`).
- **Описание:** `useUrlPrefill` (`use-url-prefill.ts`) считает результат в `useMemo`, читая
  `window.location.search` в рендере — на SSR-странице первый клиентский рендер расходится с
  серверной разметкой (тот же механизм, что у `useFormUrlSync`, разбор в
  `.claude/docs/letar-forms-urlsync-window-read-in-render-hydration.md`). Другая семантика
  (prefill из маркетинговых ссылок, `cleanUrl`, валидация схемой), поэтому в фикс `useFormUrlSync` не вошёл.
- **Решение:** SSR и гидратация — `{}`, чтение URL один раз в `useEffect`; явный `searchParams` — синхронно.
  Демо `form-docs`/`form-example` `/url-prefill` проверены вживую (в т.ч. `cleanUrl: true`).
- **Статус:** ✅ закрыт (2.14.21).

### ✅ [2026-09-17] `useFormUrlSync` — Select-поле не подхватывает URL-параметр при полной перезагрузке (закрыт v2.14.20, от studio-dev)

- **Запросил:** studio-dev (`apps/studio/src/app/(owner)/owner/time/_components/time-entries-infinite-table.tsx`,
  фильтр `billable`/`status`/`kind` через `StudioForm.UrlSync`).
- **Приоритет:** high
- **Воспроизведение:** живой Playwright-прогон против `nx dev studio`, полная навигация (не SPA)
  на `/owner/time?billable=billable` — комбобокс на первом кадре показывает дефолт «Все записи»,
  а не «Только в счёт», хотя `window.location.search` уже корректен. Значение **само
  исправляется** через ~500–700мс без участия пользователя (см. root cause).
- **Root cause:** `readUrlValues` (`use-form-url-sync.ts`) читает `window.location.search`.
  На SSR-рендере `window` не определён → функция возвращает `defaults` — это баланс верный сам по
  себе. Но `useFormUrlSync` вызывает `readUrlValues` СИНХРОННО на каждом рендере, включая самый
  первый клиентский (гидратационный) — а на клиенте `window` уже определён и URL уже настоящий,
  поэтому первый клиентский рендер вычисляет ПРАВИЛЬНОЕ значение, которое расходится с
  SSR-разметкой («Все записи»). Из-за этого расхождения текста внутри `<Suspense fallback={<Spinner
  />}>` (`(tabs)/page.tsx`) React квалифицирует это как recoverable hydration error и
  ПЕРЕПЛАНИРУЕТ полный клиентский ре-рендер этого Suspense-поддерева асинхронно — именно этот
  отложенный ре-рендер и «чинит» значение через полсекунды-секунду. Самоисправление НЕ
  гарантировано: зависит от того, что компонент вообще обёрнут в Suspense, от таймингов
  React-scheduler, и вероятно ведёт себя иначе в prod-сборке (владелец сообщал, что в реальности
  комбобокс визуально остаётся неверным, а не мигает).
- **Механизм починки значения, когда он всё-таки срабатывает:** `FormSimple` создаёт форму через
  `useAppForm({ defaultValues: initialValue, ... })`; `initialValue` — новый объектный литерал на
  КАЖДОМ рендере (в хуке нет `useMemo`, комментарий «без useMemo чтобы оставаться тестируемым»).
  TanStack Form синхронизирует `state.values` с новым `defaultValues`, если форма не touched (тот
  же механизм задокументирован в `use-post-submit-reset-guard.ts`) — так отложенный ре-рендер с
  верным `initialValue` и долетает до поля.
- **Предлагаемый фикс:** сделать первый клиентский рендер детерминированно совпадающим с SSR
  (вернуть `defaults`, не читать `window` синхронно в рендере), а реальные URL-значения применять
  через `useEffect` после маунта (гарантированно клиентский, без гонки с hydration-recovery):
  ```tsx
  export function useFormUrlSync(options) {
    const { fields, defaults } = options
    const [initialValue, setInitialValue] = useState(defaults)
    useEffect(() => {
      setInitialValue(readUrlValues(fields, defaults))
      // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз на маунт
    }, [])
    return { initialValue }
  }
  ```
  Даёт короткую (доли кадра) вспышку дефолта вместо неопределённо долгого/невоспроизводимого
  зависания на нём. `readUrlValues` (чистая функция) не трогать — регрессия тестируется отдельно.
- **Затронутые приложения:** все потребители `useFormUrlSync` с полями `Select`/`Combobox` внутри
  SSR-страниц (не только studio) — баг системный, не app-specific.
- **Решение:** реализовано ровно как предложено (`useState` + `useEffect`), с одним уточнением: в
  state хранятся не готовый `initialValue`, а переопределения из URL — готовый объект залипал бы на
  `defaults` первого рендера. Без фильтров в URL лишнего ре-рендера нет. `readUrlValues` и
  `Form.UrlSync` не менялись. Тесты (`use-form-url-sync.spec.tsx`): первый рендер = defaults;
  `renderToString` + `hydrateRoot` без hydration-ошибок; внутри `<Form>` поле получает значение, а
  `UrlSync` не стирает параметр; изменение `defaults` подхватывается.
  Разбор — `.claude/docs/letar-forms-urlsync-window-read-in-render-hydration.md`.
- **Статус:** закрыто, `@letar/forms` 2.14.19 → 2.14.20 (thread
  `form-url-sync-hydration-mismatch-20260917`).

### ✅ [2026-09-15] `Field.FileUpload` — дефолтные тексты были захардкожены по-английски (от domwellbes-dev)

- **Запросил:** domwellbes-dev (`house-drawings-section.tsx` показывал «Upload file» в
  полностью русской форме, владелец заметил вживую).
- **Описание:** `dropzoneLabel`/`buttonText`/`placeholder` и счётчик файлов в `variant="input"`
  (`field-file-upload.tsx`) были захардкожены по-английски и не покрывались `FormI18nProvider`
  (тот локализует только сообщения валидации и подписи опций select). Единственное место в
  `form-fields` с таким расхождением — остальные компоненты уже на русском.
- **Решение:** дефолты переведены на русский (простой явный фикс, не через словарь i18n —
  единственное место такого рода в библиотеке, полноценная локализация избыточна).
  Переопределение через явные пропы работает как раньше.
- **Статус:** закрыто, v2.14.19.

### ✅ [2026-09-15] `apps/form-example` — отсутствовал `transpilePackages`, падал прод-деплой (от deploy-agent-dev)

- **Запросил:** deploy-agent-dev (отчёт о неудачном деплое, тред `deploy-request: form-docs,
  form-example`) — прогон случился по обычному запросу форм-координатора на деплой готовых фиксов
  `useFormServerAction`/`Field.Date`.
- **Описание:** `apps/form-example/next.config.ts` не содержал ключ `transpilePackages` вовсе (не
  пустой массив — отсутствующее поле). `instrumentation-client.ts` импортирует `libs/glitchtip` —
  внешний `.ts`-файл вне `apps/form-example`; без `transpilePackages` webpack не может его
  распарсить (`Module parse failed: Unexpected token` на `export interface`). Тот же класс
  ловушки уже разобран и закрыт в `form-docs` (см.
  `.claude/docs/transpile-packages-array-presence-not-content.md`) — там ключ есть с тем же
  комментарием, form-example его, по всей видимости, никогда не получил при заведении конфига.
- **Фикс:** добавлен `transpilePackages` со всеми `@letar/*`-пакетами, реально импортируемыми в
  `src/` (`analytics`, `demo-protection`, `forms`, `forms-core`, `glitchtip`, `pg-url`, `seo`).
  Локальный `nx build form-example` зелёный (46.5s). Коммит `4a744ea22`.
- **Статус:** закрыто, деплой запрошен повторно у deploy-agent-dev.

### ✅ [2026-09-15] `Field.Auto` с `meta.ui.fieldType` терял произвольные props (напр. `onComplete`)

- **Запросил:** auth-hub (найдено на `verify-email-code.tsx`, PLAN_EMAIL_CODE.md A.2) —
  делегировано через `.claude/rules/form-delegation.md`, зафиксировано в
  [.claude/docs/letar-forms-field-auto-fieldtype-drops-extra-props.md](/.claude/docs/letar-forms-field-auto-fieldtype-drops-extra-props.md).
- **Описание:** `FieldAuto` (`libs/forms/src/lib/declarative/form-fields/auto/field-auto.tsx`)
  имел два пути рендера — fallback по `zodType` спредил `{...baseProps}` целиком, а ветка
  `uiMeta?.fieldType` вызывала `renderFieldByType` с явно перечисленным подмножеством полей, не
  прокидывая остаточные props. Проп, отсутствующий в списке (`onComplete` у `PinInputFieldProps`
  и аналогичные у других специализированных полей), молча терялся — без ошибки, значение поля
  продолжало биндиться корректно.
- **Решение:** ветка `uiMeta?.fieldType` теперь собирает остаточные props (всё, что не попало в
  явно перечисленные `label`/`placeholder`/`helperText`/`required`/`disabled`/`readOnly`) и
  сливает их в `fieldProps` вместе с `uiMeta.fieldProps` (прямой JSX-проп приоритетнее —
  специфичнее, чем дефолт из схемы). `AutoFieldProps` получил index signature `[key: string]:
  unknown`, чтобы такие props типизированно принимались на `<Form.Field.Auto>`. Тест-регрессия —
  `field-auto.spec.tsx` (полный цикл через `<Form>` + `z.string().meta({ ui: { fieldType:
  'pinInput' } })`, проверено что без фикса тест красный).
- **Статус:** закрыто, v2.14.18.

### ✅ [2026-09-15] Дублирование fallback-логики i18n (t() → встроенный словарь → дефолт) в трёх местах (закрыт forms-core v0.12.5/forms-react v0.9.1/forms v2.14.16, от пользователя)

- **Запросил:** пользователь напрямую — заметил, что предыдущая сессия (локализация заголовка
  `Form.Errors`) добавила третью независимую реализацию уже дважды существовавшего паттерна.
- **Описание:** `combinedT` (Zod error map) и `getLocalizedValue` (title/placeholder/description
  полей) в `libs/forms-react/src/lib/i18n/form-i18n-provider.tsx`, и новая
  `resolveDefaultErrorsTitle` в `libs/forms/src/lib/declarative/form-errors.tsx` — три копии
  логики «попробовать `t(key)`, откатиться на fallback, если пусто/равно ключу/бросило
  исключение» (next-intl так сигналит отсутствие перевода).
- **Решение:** извлечён `resolveTranslation(t, key, params?)` в
  `libs/forms-core/src/lib/i18n/resolve-translation.ts`, переиспользован во всех трёх местах.
  Источники встроенных словарей (`createBuiltinTranslateFunction`, локальный `Record`) и
  итоговые дефолты остались на месте вызова — они действительно разные, унифицировать имело
  смысл только общую часть. Поведение не изменилось (проверено существующими тестами).
  Осознанно не тронут приватный `tryTranslate` в `create-form-error-map.ts` — несёт
  дополнительную проверку `result.startsWith(key)`, которой нет в трёх унифицированных местах.
- **Статус:** закрыто, коммит `e1e9bcbee`.

### ✅ [2026-09-15] `Form.Field.Date` несовместим с `Form.UrlSync` (закрыт v2.14.17, от letar-dev)

- **Запросил:** letar-dev (тред agent-mail `form-feature-request`, письмо от 2026-09-15 →
  forms-coordinator-dev)
- **Приоритет:** high (дата/диапазон дат — частый паттерн URL-фильтра, не разовый кейс)
- **Описание:** `FieldDate` всегда коммитит `new Date(raw)` в состояние формы независимо от
  наличия `schema`/её типа. `Form.UrlSync`/`isDefaultValue` сравнивает значение со строковым
  `defaults` через строгое `===` — поле навсегда «активно», в URL уезжает `Date.toString()`
  вместо `YYYY-MM-DD`. Найдено при миграции `apps/studio` owner/time фильтров на `@letar/forms`
  (коммит `d83bd8c`) — обход: `from`/`to` оставлены вне декларативной Field-системы.
- **Разбор:** [.claude/docs/letar-forms-field-date-urlsync-date-object.md](/.claude/docs/letar-forms-field-date-urlsync-date-object.md)
- **Предложенные варианты:** (1) `FieldDate` коммитит строку, если схема реально не требует
  `Date` (`zodType !== 'date'`); (2) `Form.UrlSync` учится сериализовывать/сравнивать `Date`
  корректно (`YYYY-MM-DD`, не голый `===`).
- **Фикс (вариант 1, по рекомендации координатора):** `field-date.tsx` уже получает
  `resolved.constraints.schemaType` (тот же сигнал, что `getZodConstraints` заполняет для
  min/max-хинтов) — новый `requiresDateValue = constraints?.schemaType === 'date'` управляет
  веткой `onChange`: коммитим `new Date(raw)` только когда схема поля реально `z.date()`/
  `z.coerce.date()`, иначе коммитим строку `YYYY-MM-DD`. Изолировано в `field-date.tsx`, `Form.UrlSync`
  не тронут — не нужна была отдельная функция резолва zodType, `getZodConstraints` уже вычисляет
  `schemaType` по пути поля и прокидывает его через `useResolvedFieldProps`.
- **Тесты:** 3 новых кейса в `field-date.spec.tsx` — без схемы коммитит строку, со схемой
  `z.string()` коммитит строку, со схемой `z.date()` коммитит `Date` (обратная совместимость).
- **Статус:** закрыто, `@letar/forms` 2.14.16 → 2.14.17.

### ✅ [2026-09-15] `Form.Errors` — дефолтный заголовок захардкожен на английском (от пользователя)

- **Запросил:** пользователь напрямую, живой браузерной проверкой на `aboi` sign-in
- **Приоритет:** normal
- **Описание:** `title = 'Please fix the following errors:'` не резолвился через
  `FormI18nProvider` (тот покрывал только подсказки полей, не этот компонент) — русскоязычные
  приложения получали смешение языков. Затронуто минимум 10 мест в `aboi` без явного `title`
  (auth-формы, checkout, gift-form, admin/products, profile/*).
- **Решение:** `libs/forms/src/lib/declarative/form-errors.tsx` — без явного `title`-пропа
  резолвится: перевод приложения по ключу `formErrors.title` (если `FormI18nProvider` получил
  `t`) → встроенный словарь по `locale` (ru/en) → прежний английский текст, если провайдера в
  дереве нет вовсе (backward-compat). Явный `title`-проп по-прежнему побеждает всегда.
  `@letar/forms` 2.14.13 → 2.14.14.
- **Тесты:** два новых кейса в `form-errors.spec.tsx` — локализованный дефолт из
  `FormI18nProvider(locale="ru")`, явный `title` побеждает и с провайдером.
- **Проверка:** живой браузерной проверкой на `apps/aboi` sign-in (неверные email/пароль) —
  заголовок стал «Пожалуйста, исправьте следующие ошибки:». Правку в `aboi` и других
  приложениях-потребителях делать не нужно — дефолт локализуется сам.

### ✅ [2026-09-14] Хелпер submit-оркестрации (pending/toast/server-error mapping в один вызов) (закрыт forms-react v0.9.0/forms v2.14.13/forms-core v0.12.4, от domwellbes-dev)

- **Запросил:** domwellbes-dev (тред `forms-submit-orchestration-helper`)
- **Приоритет:** normal
- **Описание:** аудит форм domwellbes нашёл собственный хук `useServerActionForm` (63
  потребителя), не использующий `mapServerErrors`/`applyServerErrors` — все серверные ошибки
  схлопываются в одну строку без field-level мэппинга. Документированный путь (`formRef` +
  `middleware.onError` + `mapServerErrors`/`applyServerErrors` + `<Form.Errors />`) существует
  и работает (образец — `material-form.tsx`), но ceremony оказалась выше порога, при котором
  разработчик тянется к самопальному хуку.
- **Решение:** `useFormServerAction(formRef, { fieldMap, toaster, successMessage })` в
  `@letar/forms-react` (framework-free относительно UI-скина, `libs/forms-react/src/lib/form/
  use-form-server-action.ts`) — реэкспортирован из `@letar/forms` v2.14.13 (единственный
  потребитель declarative `<Form>` сейчас; `forms-shadcn` не участвует — тот же класс, что
  `createAsyncActionQuery`, `formRef`/`AppFormApi` пока Chakra-скин-only концепция). `run(action,
  onSuccess?)` выполняет `action`, отслеживает `pending`, при ошибке сам вызывает
  `mapServerErrors`/`applyServerErrors` через `formRef` (без `middleware.onError`), опциональный
  toaster показывает `formErrors.join('. ')` или, если `formErrors` пуст (например `P2002` с
  попаданием в `fieldMap` — ошибка целиком ушла в конкретное поле), сообщения `fieldErrors`.
  `successMessage` опционален — без него `toaster.create({type:'success'})` не вызывается
  (молчаливый успех валиден, например перед `router.push`).
- **⚠️ Исправлено ПОСЛЕ первого закрытия (живой браузерной проверкой, не unit-тестами):**
  1. `run` изначально глотала ошибку (`return undefined` в catch) — из-за этого декларативный
     `<Form>` считал сабмит успешным и своим post-submit `reset()` стирал только что применённые
     через `applyServerErrors` field-level ошибки раньше, чем пользователь успевал их увидеть.
     Теперь `run` **перебрасывает** исходную ошибку после применения
     `mapServerErrors`/`applyServerErrors` и показа toast — тип `run` изменился с
     `Promise<TData | undefined>` на `Promise<TData>`. Вызывающему коду свой `try/catch`
     по-прежнему не нужен: `<Form>` сам ловит исключение из `onSubmit` там же, где уже ловит
     `throw` из `middleware.onError`.
  2. Даже после (1) ошибка визуально не отображалась на поле — `applyServerErrors`
     (`@letar/forms-core`) писала сообщение в плоский `meta.errors`, а TanStack Form
     пересчитывает `meta.errors` из `meta.errorMap` при каждом обновлении стора, так что прямой
     push переживал ровно до следующего пересчёта (тот же тик). Фикс — `errorMap.onServer`
     (штатный ключ TanStack Form для внешне применяемых ошибок), см. `@letar/forms-core`
     CHANGELOG v0.12.4. **Затрагивает ВСЕХ потребителей `applyServerErrors` монорепо-wide**, не
     только этот хук — включая существующие auth-страницы domwellbes и dsperevod.
  - Не в этом фиксе: сам `useServerActionForm` в domwellbes не удалён и 63 потребителя не
    мигрированы — задача закрывает только саму возможность в библиотеке; миграция потребителей
    на новый хук (или явное решение оставить как есть, раз старый хук работает) — на усмотрение
    domwellbes-dev, отдельная задача не заводилась.
- **Тесты:** `use-form-server-action.spec.ts` (forms-react) — pending true/false, onSuccess с
  результатом, toaster.success только при заданном `successMessage`, field-only ошибка
  (P2002+fieldMap) не трогает `setErrorMap`, toaster.error с сообщением поля при пустом
  `formErrors`, toaster.error+`setErrorMap` при form-level ошибке, formRef.current===null не
  роняет `run`, **ошибка перебрасывается** (`rejects.toBe`) во всех кейсах выше. Плюс
  `map-server-errors.spec.ts` (forms-core) — `applyServerErrors` пишет в `errorMap.onServer`, не
  в плоский `errors`, сохраняет соседние ключи `errorMap`, маппит несколько полей,
  form-level через `setErrorMap`.
- **Документация:** `docs/server-errors.md` §«useFormServerAction — та же связка в один вызов» —
  рядом с низкоуровневым путём (не заменяет его), README обеих библиотек (таблица «Что внутри» у
  forms-react, таблица документации у forms).
- **Ссылки:** `apps/domwellbes/src/_hooks/use-server-action-form.ts` (самопальный хук, 63
  потребителя), `apps/domwellbes/src/app/(admin)/admin/materials/_components/material-form.tsx`
  (правильный образец), `apps/domwellbes/src/app/(admin)/admin/warehouses/[id]/_components/
  stock-document-forms.tsx` (дубль error-стейта ×4 в одном файле), `libs/forms/docs/
  server-errors.md` § «С декларативным `<Form>`».

### ✅ [2026-09-14] Better Auth throw-bridge — `assertAuthOk` в `@letar/auth/client` (от domwellbes-dev)

- **Запросил:** domwellbes-dev
- **Приоритет:** normal
- **Описание:** `authClient.*` (Better Auth) возвращает `{ data, error }`, не бросает — контракт
  `@letar/forms` требует, чтобы `onSubmit` бросал. Паттерн `if (result.error) throw new
  Error(...)` продублирован в 4 auth-формах domwellbes.
- **Решение (пересмотрено в тот же день):** изначально закрыто только документацией — заводить
  хелпер под одного потребителя посчитали преждевременным. Владелец сообщил, что миграция
  auth-страниц aboi/dsperevod/studio/svoichuzhie на `@letar/forms` уже ставится в план — это
  четыре новых независимых потребителя того же паттерна на подходе, ждать «третьего по факту»
  больше не имело смысла (дублировать один и тот же `if (result.error) throw ...` ещё 4 раза,
  чтобы потом консолидировать — хуже, чем сделать это один раз сейчас). Добавлен
  `assertAuthOk(result, defaultMessage?)` + `AuthResultLike` в `@letar/auth/client`
  (`libs/auth/src/client/assert-auth-ok.ts`, v0.14.0) — структурный тип по образцу
  `ResendCapableAuthClient`, не завязан на полный клиент. `docs/server-errors.md` обновлён на
  реальный пример использования.
- **Ссылки:** `libs/auth/src/client/assert-auth-ok.ts` (+ `.spec.ts`, 5 тестов),
  `libs/forms/docs/server-errors.md` §«Better Auth — throw-bridge».
- **Статус:** закрыто.

### ✅ [2026-09-14] Добит неполный набор subpath-paths `@letar/forms-core` в `tsconfig.spec.json` (закрыт v2.14.11)

- **Контекст:** предыдущая запись (Canvas 2D, v2.14.10) явно отметила, что набор subpath-paths
  `@letar/forms-core` в `libs/forms/tsconfig.spec.json` неполный относительно
  `forms-core/package.json` exports — там было 9 подпутей из 18 (без учёта `.`).
- **Фикс:** добавлены недостающие 9 строк — `credit-card`, `edit-intent`, `phone`, `mask`,
  `field-widgets`, `table`, `address`, `i18n`, `uikit`. Класс ловушки — `.claude/rules/libs.md`
  § «Потребителю нужны paths и на транзитивные `@letar/*`, и на все их подпути»: пока внутренний
  слой `forms` не использовал недостающий подпуть — не всплывало, первое использование положило
  бы typecheck разом.
- **Проверка:** `nx typecheck:tsgo forms` и `nx test forms` зелёные; `scripts/check-lib-subpath-paths.mjs`
  без расхождений (⚠️ скрипт сканирует только `apps/*/tsconfig.json`, не `libs/*/tsconfig.spec.json`
  — это расхождение НЕ покрывает; см. заведённую отдельную задачу на расширение скрипта). 3 теста
  упали при полном прогоне (`table-selection.spec.tsx`, `field-rich-text.spec.tsx` ×2) — таймауты
  под нагрузкой, изолированный повтор тех же файлов дал 5/5 зелёных, к правке не относится.

### ✅ [2026-09-14] Вынос мока Canvas 2D в `@letar/forms-core/testing` (закрыт v2.14.10)

- **Контекст:** мок Canvas 2D API (детерминированный no-op для `HTMLCanvasElement.prototype.getContext('2d')`/`toDataURL`,
  ~50 строк) был найден и починен в `libs/forms/vitest.setup.ts` (2.14.9), затем превентивно
  скопирован дословно в `libs/forms-shadcn/vitest.setup.ts` (0.37.1) — два идентичных блока.
- **Фикс:** функция `mockCanvas2D()` вынесена в `libs/forms-core/src/lib/testing/index.ts`
  (подпуть `@letar/forms-core/testing`, уже существовал ради `buildFormsCoreAlias`). Реализация
  инлайн в `index.ts`, не в отдельном файле с реэкспортом — та же причина, что уже
  задокументирована у `buildFormsCoreAlias`: `vitest.setup.ts`/`vitest.config.mts` резолвятся
  нативным Node-загрузчиком Nx, который не умеет extensionless относительные импорты внутри
  `.ts`-модуля, полученного через bare-специфайер (`ERR_MODULE_NOT_FOUND` — обнаружено при
  первой попытке вынести в `mock-canvas-2d.ts`).
- **Затронуто:** `libs/forms/vitest.setup.ts` и `libs/forms-shadcn/vitest.setup.ts` теперь
  вызывают `mockCanvas2D()` вместо инлайн-блока. `libs/forms/tsconfig.spec.json` — добавлена
  строка `@letar/forms-core/testing` в `paths` (потребовалась typecheck'у, набор subpath-paths
  там и так неполный относительно `forms-core/package.json` exports — не расширялся сверх
  необходимого для этой задачи).
- **Не тронуто:** `forms-vue`/`forms-vue-shadcn`/`forms-angular` держат свои per-spec
  `beforeEach`-стабы (`app-form.stage5.spec.ts` ×2, `app-form.stage-g.spec.ts`) — другая форма
  (локальный минимальный `vi.fn()`-стаб на 2 метода, не глобальный `vitest.setup.ts` на ~25
  методов) и другая структура подключения, перенос не упрощает код без риска регрессии.
- **Проверка:** `nx test`/`typecheck:tsgo`/`lint` зелёные на `forms-core`, `forms`,
  `forms-shadcn`; `scripts/check-lib-subpath-paths.mjs` — без новых расхождений (1
  предсуществующий у `aboi`/`@letar/hooks`, не связан).

### ✅ [2026-09-14] Дедуп группировки опций по `group` между use-grouped-options.ts и uikit-chakra.tsx (закрыт v2.14.8)

- **Контекст:** прямое следствие предыдущего пункта (getGroup на Select, v2.14.7) — при его
  реализации инлайн-копия логики группировки была осознанным компромиссом («здесь инлайн, т.к.
  хук работает на `GroupableOption`, а UIKit-примитив — на сыром `UIKitSelectOption`»). Оказалось,
  что framework-free версия этой логики (`groupOptions`/`hasGroups`/`getOptionLabel`) уже
  существовала в `@letar/forms-core/uikit` (`group-options.ts`, выделена ещё в Фазе 7.3) — просто
  `uikit-chakra.tsx` про неё не знал.
- **Фикс:** `use-grouped-options.ts` (Combobox/Listbox) и Select-примитив `uikit-chakra.tsx`
  теперь оба вызывают `groupOptions`/`getOptionLabel` из `@letar/forms-core/uikit` вместо
  собственных копий построения `Map<string, T[]>`. Chakra-специфичной осталась только сборка
  `createListCollection`. Публичный API (`useGroupedOptions`, `getOptionLabel` из `base/index.ts`)
  не изменился.
- **Тесты:** без изменений (регресс на группировку уже покрыт `field-select.spec.tsx` из
  предыдущего пункта) — `nx test @letar/forms` 799/799, `typecheck:tsgo`/`lint` чисто.
- **Не сделано:** `forms-shadcn`-скин по-прежнему без группировки Select (как и в v2.14.7) —
  не в скоупе этой задачи.

### ✅ [2026-09-13] Form.Field.Select — группировка опций (optgroup) через getGroup (закрыт v2.14.7, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1533/1547, thread `forms-select-optgroup`)
- **Приоритет:** high
- **Описание:** `Form.Field.Combobox` уже поддерживает `getGroup?: (item) => string | undefined`
  (группировка в выпадающем списке, `field-combobox.tsx:79`), у `Form.Field.Select`
  (`field-select.tsx`) той же возможности нет вовсе — `SelectFieldProps` не содержит группировки,
  подтверждено чтением исходника (не «почти есть», а чистый пробел).
- **Фикс:** `getGroup?: (option: BaseOption<string | number>) => string | undefined` в
  `SelectFieldProps` (`field-select.tsx`) — символично с Combobox, но применяется к статичному
  `options`, без async-обёртки. Группировка реализована на уровне `UIKit`-контракта:
  `UIKitSelectOption.group?: string` добавлен в `@letar/forms-core` v0.12.2, Chakra-адаптер
  (`uikit-chakra.tsx`) строит `createListCollection` с `groupBy` при наличии хотя бы одной
  группы и рендерит `Select.ItemGroup`/`Select.ItemGroupLabel` (тот же паттерн, что
  `use-grouped-options.ts` уже использует для Combobox/Listbox — здесь инлайн, т.к. хук работает
  на `GroupableOption` декларативного слоя, а UIKit-примитив — на сыром `UIKitSelectOption`).
  Без `getGroup` поведение не меняется — плоский список.
- **Не в этом фиксе:** `forms-shadcn`-скин группировку Select не получил — координатор запросил
  только Chakra-скин (domwellbes использует его), задача явно скоуплена файлом `field-select.tsx`
  в `libs/forms`.
- **Тесты:** `field-select.spec.tsx` — 2 новых кейса (рендер с `getGroup` и выбранным значением;
  регресс — без `getGroup` список остаётся плоским). Открытие dropdown и визуальная проверка
  группировки — вручную через `form-develop-app` (`select-demo`, секция «Grouped Select»,
  подтверждено в браузере: опции разбиваются на Frontend/Backend/Mobile).
- **Демо:** `apps/form-develop-app/src/app/select-demo/page.tsx` — секция «Grouped Select
  (getGroup)».

### ✅ [2026-09-12] Автоматизировать создание async-Combobox (закрыт v2.14.6/forms-react v0.8.0, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1527/1529, topic `form-feature-request`)
- **Описание:** третий независимый вручную написанный async-поисковый Combobox подряд
  (`ComboboxStudent` в driving-school через ZenStack `useFindManyUser`,
  `useClientSearchOptions` в domwellbes через server action, `ComboboxMaterial` через `@fuzzy`) —
  одинаковый скелет (`useState`+`useEffect`+cancel-флаг) копипастился в каждое приложение.
- **Разведка показала более узкий скоуп, чем в запросе:** `Form.Field.Combobox` уже поддерживает
  `useQuery: AsyncQueryFn` и уже работает без единой строчки boilerplate для источников,
  синхронно отдающих `{data, isLoading, error}` (ZenStack-хуки — `ComboboxStudent` тому пример).
  Реальный дубль — не вся обвязка комбобокса, а только приведение **плоской async-функции**
  (server action, `@fuzzy`) к этой синхронной форме.
- **Решение (согласовано с владельцем):** НЕ генератор и НЕ обёртка над самим Combobox — один
  переиспользуемый хук `useAsyncActionQuery`/`createAsyncActionQuery` в `@letar/forms-react`
  v0.8.0, реэкспортирован из `@letar/forms` v2.14.6. `useQuery={createAsyncActionQuery(action)}`.
  Подробности API и cancel-flag против устаревших ответов — `docs/fields.md` §«Async-поиск в
  `Form.Field.Combobox`», CHANGELOG обоих пакетов.
- **Статус:** закрыто, ответ отправлен domwellbes-dev в тред `forms-async-combobox-generator`.

### ✅ [2026-09-12] Маска NumberInput с автоформатированием сбрасывается при удалении цифры (закрыт v2.14.3, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1523, thread `forms-numberinput-format-reset-domwellbes`,
  topic `bug`) — живое использование владельцем, отчёт без репро-скрипта.
- **Приоритет:** high — денежное поле с неработающим редактированием после форматирования это
  прямой UX-блокер, потенциально задевает все приложения с `Field.Currency`/группировкой разрядов.
- **Описание:** поле «Цена „от“, ₽» (`Form.Field.Currency`, авто-форматирование `5 000 000,00 ₽`)
  — после форматирования удаление одной цифры ломает форматирование вместо предсказуемого
  редактирования по разряду. Похоже на классическую проблему маски zag-js `NumberInput`
  (`formatValue(parseValue(...))`, курсор/парсер не понимает границу число/форматирование).
- **Делегировано:** forms-dev (msg 1525, тот же тред), с просьбой проверить `Field.Number`/
  `Field.Percentage` на тот же паттерн (`NumberInput.Root` + `formatOptions`) — если баг
  системный, а не point-fix одного поля.
- **Root cause:** полностью контролируемый `NumberInput.Root` (проп `value` задан всегда) —
  `useBindable` из `@zag-js/react` в контролируемом режиме всегда отдаёт внешний React-проп
  напрямую, а запись в DOM (`syncInputElement`) отложена на `requestAnimationFrame`. При быстром
  вводе (несколько `Backspace` подряд) React не успевает закоммитить новый проп до того, как raf
  перезаписывает поле устаревшим значением. Подтверждено системным — `Field.Currency` и
  `Field.Percentage` (оба с группировкой разрядов) проявляют заметно, `Field.Number`
  архитектурно тот же баг, но незаметно из-за `useGrouping: false`.
- **Фикс:** все три поля переведены на неконтролируемый `NumberInput.Root` (`defaultValue`, без
  `value`); общий хук `useUncontrolledNumberSync`
  (`form-fields/base/use-uncontrolled-number-sync.ts`) пробрасывает внешние изменения поля
  (`form.reset()`, программный `setFieldValue`) обратно через remount по `key`, отличая их от
  изменений, вызванных собственным `onValueChange` — сравнением с последним значением, которое
  поле само отправило наружу (а не boolean-флагом, который ошибочно взводился и на
  реформатирование при blur без реального изменения числа).
- **Тесты:** регресс на удаление цифры + на `Form.Button.Reset` после редактирования, во всех
  трёх числовых полях (`field-currency.spec.tsx`, `field-percentage.spec.tsx`,
  `field-number.spec.tsx`).
- **Отдельно найдено, не в скоупе этой задачи:** `Field.Currency` (и, вероятно, остальные два
  числовых поля) в отдельных сценариях удаления цифр схлопывается в `-9 007 199 254 740 991`
  (`-Number.MIN_SAFE_INTEGER`) — подтверждено воспроизводимым **и на коде до этого фикса**, то
  есть отдельный, не связанный с контролируемостью `NumberInput.Root` баг. Вынесено отдельной
  задачей (не блокирует этот фикс). **Закрыто 2026-09-12, см. пункт ниже.**

### ✅ [2026-09-12] `Field.Currency` пишет `Number.MIN_SAFE_INTEGER` при нажатии Home (закрыт v2.14.5)

- **Запросил:** делегировано из репро-шагов bug report о NumberInput (см. предыдущий пункт,
  «отдельно найдено, не в скоупе»).
- **Root cause:** это НЕ баг парсинга/`@internationalized/number` — гипотеза «NaN клэмпится в
  MIN_SAFE_INTEGER как sentinel» опровергнута (`@zag-js/utils` `clampValue`/`nan()` превращают
  `NaN` в `0`, не в min). Настоящая причина — `@zag-js/number-input` перехватывает клавишу **Home**
  как «прыжок к min» (та же логика, что у `<input type=range>`, `End` → прыжок к max),
  `event.preventDefault()` вызывается безусловно (`number-input.connect.mjs`), это не движение
  курсора. Если `min` не задан, машина подставляет дефолт `Number.MIN_SAFE_INTEGER`
  (`number-input.machine.mjs`). `Field.Currency` не читал `min`/`max` из
  `resolved.constraints.number` (Zod `.min()`/`.max()`) в отличие от уже корректного `Field.Number`
  — поэтому `z.number().min(0)` в схеме никак не доходил до `NumberInput.Root`, и Home записывал
  сентинел прямо в значение поля (репро «Home + 5×ArrowRight, затем Backspace» ломается уже на
  самом Home, Backspace лишь редактирует уже испорченную строку).
- **Фикс:** `field-currency.tsx` теперь читает `min`/`max` тем же паттерном `props > constraints`,
  что и `Field.Number`. `Field.Percentage` бага не имел — уже хардкодит `min=0, max=100`.
- **Тесты:** 2 регресс-теста в `field-currency.spec.tsx` — с `.min(0)` в схеме Home больше не
  пишет сентинел; без схемы/пропа поведение задокументировано как есть (не регрессия этого
  фикса, а pre-existing свойство, общее с `Field.Number`).
- **Не в скоупе:** поле совсем без `min`/`max` (ни пропом, ни через схему) всё ещё уязвимо к Home
  → `Number.MIN_SAFE_INTEGER` — то же самое верно и для `Field.Number` уже сегодня. Системный
  фикс (например: не позволять zag-js использовать сырой `Number.MIN_SAFE_INTEGER`/`MAX_SAFE_INTEGER`
  как значение поля, только как внутренний технический дефолт) не сделан — задокументирован как
  открытый вопрос ниже.
- **⚠️ Открытый вопрос:** стоит ли вводить общий safety-net на уровне `createField`/базового хука
  числовых полей — не пропускать `Number.MIN_SAFE_INTEGER`/`Number.MAX_SAFE_INTEGER` в
  `field.handleChange()` как реальное значение, если оно пришло от `INPUT.HOME`/`INPUT.END` без
  явно заданного бизнес-`min`/`max`? Требует решения владельца — задевает `Field.Number` тоже, не
  только `Field.Currency`.

### ✅ [2026-09-09] `useResolvedFieldProps` не резолвит `meta.fieldProps` в типизированных тегах (закрыт forms-react v0.7.0, архитектурная коррекция от Ками, тред `money-field-kopecks`)

- **Запросил:** Ками (владелец) — коррекция к запросу `Field.Percentage.minorUnitScale` от
  domwellbes-dev, не отдельная фича.
- **Приоритет:** normal, не blocking
- **Описание:** `@meta("form.props.<key>", value)` в `schema.zmodel` кладёт UI-проп в
  `.meta({ ui: { fieldProps: { <key>: value } } })`, и `renderFieldByType`/`renderSchemaField`
  спредит его в компонент — но **только** через `Form.Field.Auto`. Рекомендованный в
  `.claude/rules/forms.md` паттерн (явные `<AppForm.Field.Currency name="x" />`) через
  `useResolvedFieldProps` (`libs/forms-react/src/lib/field/use-resolved-field-props.ts`) тянет из
  `meta` только фиксированный список (title/placeholder/description/required/disabled/readOnly/
  options/tooltip/autocomplete) — произвольный `fieldProps` не резолвит вовсе. Значения вроде
  `minorUnitScale`/`currency` (факт о хранении данных, не о месте рендера) приходится дублировать
  JSX-пропом в каждом использовании вручную — источник ошибки максимальной цены (пропущенный
  `minorUnitScale` даёт правдоподобное, но неверное значение).
- **Фикс:** `useResolvedFieldProps` отдаёт сырой `meta.fieldProps` новым полем `fieldProps` в
  возвращаемом объекте; `createField` (`create-field-primitives.tsx`) мержит его в
  `componentProps` с приоритетом `props > meta` (`{ ...fieldProps, ...componentProps }`) —
  явный JSX-проп на компоненте побеждает значение из схемы. Единая точка для обоих UI-скинов
  (`@letar/forms` Chakra, `@letar/forms-shadcn`) — фикс подключён один раз в `forms-react` и
  действует в обоих без отдельной правки скина. `@meta("form.props.minorUnitScale", 100)` в
  `schema.zmodel` теперь работает одинаково что через `Form.Field.Auto`, что через
  `<AppForm.Field.Currency>`/`<AppForm.Field.Percentage>`.
- **Тесты:** `use-resolved-field-props.spec.ts` — 3 новых кейса (резолв `meta.fieldProps`,
  отсутствие ключа, несколько ключей без потери значений). `field-currency.spec.tsx` (Chakra) —
  2 интеграционных кейса через реальный `Form`+`schema`: резолв без JSX-пропа, приоритет
  `props > meta` на конкретном значении (`minorUnitScale`).

### ✅ [2026-09-09] Field.Percentage.minorUnitScale (закрыт v2.14.0/forms-shadcn v0.37.0, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1478, thread `money-field-kopecks`, topic `forms-task`) —
  зеркало `Field.Currency.minorUnitScale` (v2.13.0), только для базисных пунктов вместо копеек.
- **Приоритет:** normal, не urgent (domwellbes временно обходился live-recalc хинтом)
- **Кейс:** `financing-program.schema.ts` (domwellbes) — 4 поля в б.п.
  (`annualRateBps`, `minDownPaymentBps`, `maxDownPaymentBps`, `previewDownPaymentBps`).
- **Фикс:** `minorUnitScale?: number` добавлен в `PercentageFieldProps`, value-transform в
  `field-percentage.tsx` зеркалит `field-currency.tsx` (Chakra-скин). Регресс-тесты по образцу
  Currency (scale=1 без изменений, отображение major/minor, round-trip, пустое значение).
  Заодно закрыт смежный пробел в `forms-shadcn` — там `minorUnitScale` не было вовсе даже у
  `Currency` (не только у `Percentage`), добавлено на оба поля разом с тестами.
- **Не в этом фиксе:** архитектурная коррекция выше (`useResolvedFieldProps` не резолвит
  `meta.fieldProps`) — отдельная, не blocking задача, годится и после этого фикса.
- **Побочная находка (владелец спросил, почему нет в докс):** `FormFieldComponents['Currency'/
  'Percentage']` (`form-compound-types.ts`) — ручной упрощённый тип пропсов `Form.Field.Currency`/
  `Percentage` не включал `minorUnitScale` вообще (даже для уже выпущенного в v2.13.0 `Currency`),
  из-за чего голый `<Form.Field.Currency minorUnitScale={...} />` (не через `createForm()`) не
  компилировался. Это, по всей видимости, и есть причина, почему демо в `form-develop-app`/
  `form-docs`/`form-example` не добавили ни для v2.13.0, ни изначально для этого фикса — типы не
  давали. Тип исправлен, демо во всех трёх приложениях добавлены (Группы 2-4 воркфлоу).

### ✅ [2026-09-09] createForm() не переносит группу Form.Document.* на свой инстанс (закрыт v2.13.3, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1462, thread `document-group-not-exposed`, topic `form-feature-request`)
- **Приоритет:** normal
- **Описание:** `Form.Document.*` (ИНН/КПП/ОГРН/БИК/СНИЛС/паспорт) работает как обычная группа
  полей в контексте любого `Form`-дерева, но `createForm()` не переносила её на возвращаемый
  инстанс — в `Object.assign` внутри `create-form.tsx` группы не было, в типе `ExtendedForm` тоже.
  `MyAppForm.Document.INN` не существовал, был доступен только базовый `Form.Document.INN`.
- **Фикс:** `Document: Form.Document` добавлен в `Object.assign` и в тип `ExtendedForm`
  (`create-form.tsx`). Тест на app-инстансе в `create-form.spec.tsx`, пример в README.
  domwellbes может снять локальный обход в `apps/domwellbes/src/domwellbes-form/domwellbes-form.tsx`.

### ✅ [2026-09-09] createForm() не переносит Form.Subscribe и ещё 7 top-level компонентов (закрыт v2.13.4, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1477, thread `document-group-not-exposed`, topic `forms-task`) —
  тот же класс, что и `Document.*` выше, найден сразу следом.
- **Приоритет:** normal
- **Описание:** `Object.assign`/тип `ExtendedForm` в `create-form.tsx` не переносили `Subscribe`,
  `Watch`, `InfoBlock`, `Divider`, `OfflineIndicator`, `SyncStatus`, `Builder`, `FromTemplate` —
  тот же пропуск, что был у `Document`. Отдельно `DebugValues` переносился в рантайме, но не был
  объявлен в типе `ExtendedForm`.
- **Фикс:** все 9 добавлены в `Object.assign` и тип `ExtendedForm` разом (`create-form.tsx`).
  Регресс-тест на полный список top-level компонентов в `create-form.spec.tsx`, пример
  `AppForm.Subscribe` в README.

### ✅ [2026-09-09] FieldWrapper/helper-slot не резервирует высоту — поля «скачут» в сетке (закрыт v2.13.2/forms-shadcn v0.36.1, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1449, topic `form-feature-request`), делегировано `forms-dev`
- **Приоритет:** normal
- **Описание:** helper-slot под лейблом (helper-текст/текст ошибки) не резервировал фиксированную
  высоту — поля в одной `SimpleGrid`-строке получали разную высоту в зависимости от наличия
  подсказки/ошибки под инпутом.
- **Фикс:** `FieldError` (`libs/forms/src/lib/declarative/form-fields/base/field-error.tsx`) и его
  эквивалент в `forms-shadcn` (`uikit/primitives/field-error.tsx`) возвращали `null` при пустых
  `errorMessage`/`helperText`. Теперь всегда рендерят слот того же размера (`Field.HelperText`/
  `<p>`), скрытый через `visibility: hidden`/`invisible` + `aria-hidden` — место в layout
  сохраняется, скринридер контент не читает. Старый тест, проверявший именно отсутствие рендера,
  заменён на проверку скрытого слота. Проверено визуально на `form-develop-app` `/numeric-demo`.

### ✅ [2026-09-08] Sortable Group.List — hydration mismatch на `aria-describedby` (закрыт v2.13.1, от form-example-dev)

- **Запросил:** form-example-dev (обнаружено при работе над PLAN.md P0 «Groups — sortable
  drag&drop + вложенные массивы»)
- **Приоритет:** high
- **Описание:** `SortableWrapper` (`form-group-list-sortable.tsx`) рендерил `<DndContext>` без
  явного `id` — `@dnd-kit/utilities` `useUniqueId("DndDescribedBy", id)` без `value` брал номер
  из module-level счётчика, не детерминированного между SSR и клиентской гидратацией. Результат —
  hydration mismatch на `aria-describedby="DndDescribedBy-N"` на каждой странице с
  `Form.Group.List sortable` (воспроизведено на `/examples/groups`, секция 2).
- **Фикс:** `SortableWrapper` теперь требует обязательный проп `id: string` — `Group.List`/
  `Field.TableEditor` прокидывают уже вычисляемый детерминированный `fullPath` поля.
  ⚠️ Breaking для прямых потребителей `SortableWrapper` вне библиотеки — их не нашлось (грепом
  по `apps/*`). `typecheck:tsgo`/`lint` зелёные.

### ✅ [2026-09-09] `apps/form-example` не подключает `FormI18nProvider` (закрыт, от forms-coordinator-dev)

- **Запросил:** forms-coordinator-dev (аудит покрытия после фикса v2.12.3)
- **Описание:** аудит всех приложений на `<FormI18nProvider locale="ru">` (после фикса запятой,
  v2.12.3) нашёл, что `form-example` — showcase-витрина самой `@letar/forms` для внешних
  пользователей, реально использующая поля (`captcha-demo` и др. через `createForm`) — не
  оборачивает дерево в `FormI18nProvider` вовсе. Значит `Field.Number`/`Currency`/`Percentage` там
  работали только на точке (en-US default), запятая давала явную ошибку валидации.
- **Фикс:** `<FormI18nProvider locale="ru">` добавлен в `apps/form-example/src/components/providers.tsx`
  (образец — `apps/form-develop-app`). `typecheck:tsgo`/`lint` зелёные.

### ✅ [2026-09-09] `@letar/forms-shadcn` Field.Currency/Number не передавали `locale` (закрыт v0.36.0, от forms-coordinator-dev)

- **Запросил:** forms-coordinator-dev (аудит покрытия после фикса v2.12.3)
- **Описание:** фикс v2.12.3 (передача `locale` из `useFormI18n()` в `NumberInput.Root` +
  дефолтные `formatOptions`) был сделан только в Chakra-скине. `forms-shadcn` — отдельная
  реализация UIKit-контракта, `locale` не передавала вовсе ни в одном из четырёх числовых полей.
- **Уточнение к формулировке «тот же паттерн»:** оказалось архитектурно глубже. `shadcnUIKit.NumberInput`
  рендерил нативный `<input type="number">` — HTML5 value sanitization algorithm сбрасывает
  `.value` в `""` для любой строки с запятой ещё **до** `onChange`, JS-нормализация уже готового
  `e.target.value` восстановить это не может. Тот же ARIA-паттерн, что у `@zag-js/number-input`
  в Chakra-скине (текстовый инпут + ручной `role="spinbutton"`/`aria-value*`), пришлось повторить
  и здесь.
- **Фикс (v0.36.0):** `uikit/primitives/number-input.tsx` переведён на `type="text"` + ручной
  ARIA-контракт, разбор разделителя — нативный `Intl.NumberFormat(locale).formatToParts(1.1)`
  (без новой зависимости, beta-упрощение сохранено). `locale` проброшен через `useFieldState` →
  `useFormI18n()?.locale` во всех четырёх полях (`FieldNumber`/`FieldNumberInput`/`FieldCurrency`/
  `FieldPercentage`). `UIKitNumberInputProps` (`@letar/forms-core` 0.12.0→0.12.1) расширен полем
  `locale?: string`. Регресс-тесты (en-US точка / ru запятая / ru точка тоже работает) — во всех
  четырёх spec-файлах. `nx typecheck:tsgo`/`lint` зелёные, vitest 253/253.

### ✅ [2026-09-08] Русская запятая как десятичный разделитель — проверить Field.Number/NumberInput (закрыт v2.12.3, от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1401, topic `form-feature-request`), переслано `forms-coordinator-dev`
- **Триггер:** баг найден в собственном сыром `<Input>` domwellbes
  (`house-metrics-section.tsx:74`, `Number("234,65")` → `NaN`), но вопрос — системный: касается ли
  это `Form.Field.Number`/`NumberInput` (Chakra `NumberInput.Root`/zag-js).
- **Ответ на вопрос 1 — подтверждено, `Field.Number`/`NumberInput` были подвержены тому же
  классу бага, причём хуже: не `NaN`, а тихая обрезка на запятой (`"234,65"` → `234`).** Причина в
  два слоя: (а) поля не передавали `locale` в `NumberInput.Root`, zag-js использовал жёсткий
  `en-US`; (б) даже с `locale`, `@zag-js/number-input` без явного `formatOptions` парсит через
  голый `parseFloat` (`number-input.utils.ts`), locale в этой ветке не участвует вовсе —
  подтверждено регресс-тестом до фикса (получили `234`, не `NaN` и не `23465`). `Currency`/
  `Percentage` уже передавали `formatOptions`, им не хватало только `locale`.
- **Фикс (v2.12.3):** все четыре поля передают `locale` из `useFormI18n()?.locale`;
  `Number`/`NumberInput` дополнительно получили `formatOptions` по умолчанию
  (`{ useGrouping: false, maximumFractionDigits: 20 }` — воспроизводит прежний вид без
  provider/formatOptions). Требует `<FormI18nProvider locale="ru">` в дереве — без него поведение
  не меняется (en-US, как раньше). Регресс-тесты — `field-number-input.spec.tsx`,
  `field-currency.spec.tsx`.
- **Ответ на вопрос 2 (общая `parseLocaleNumber` утилита) — не нужна отдельно.** Библиотека
  переиспользует `@internationalized/number` через сам `NumberInput.Root`, поэтому для сырых
  инпутов вне `@letar/forms` (собственный код domwellbes) правильный путь — заменить их на
  `Form.Field.Number`/`Currency`, а не городить отдельный парсер. Если domwellbes не может
  перейти на `Field.*` в конкретном месте — завести отдельный точечный запрос с описанием, почему.
- **Ответ на вопрос 3 (подсветка невалидной ячейки в таблицах массового редактирования вне
  формы) — не проверялось, вне рамок этой задачи.** Кандидат на отдельный backlog-запрос, если
  понадобится домвэллбесу отдельно от перехода на `Field.*`.
- **Дополнение [2026-09-09]:** тот же класс бага в `forms-shadcn` (отдельная реализация полей)
  закрыт отдельной записью выше — v0.36.0.

### ✅ [2026-09-08] Денежное поле: transform копейки↔рубли на границе значения (закрыт v2.13.0, от domwellbes-dev)

- **Запросил:** domwellbes-dev (thread `money-field-kopecks`), отправлено `forms-coordinator-dev`
- **Приоритет:** normal
- **Описание:** `Form.Field.Currency` (`libs/forms/src/lib/declarative/form-fields/number/
  field-currency.tsx`) хранит и сериализует значение как рубли-float — нет transform для случая,
  когда БД/Prisma держит целое число копеек (частый паттерн `*Kopecks`-полей у ZenStack-моделей).
  Предложен опциональный проп `minorUnitScale` (по умолчанию `1`) по аналогии с value-transform
  паттерном `Form.Field.Slug` (`.../text/field-slug.tsx`): отображаемое значение =
  `field.state.value / minorUnitScale`, при вводе — `Math.round(displayed * minorUnitScale)`
  обратно в поле.
- **Масштаб (аудит domwellbes-dev, 2026-09-08):** минимум 9 мест с одним и тем же классом
  дублирования/бага в трёх приложениях — 5 в domwellbes (`estimate-contract-total.schema.ts`,
  `house.schema.ts`, `house-extra.schema.ts`, `house-option.schema.ts`,
  `vacancy.schema.ts:salaryFromKopecks/salaryToKopecks` — label «(в копейках)» без реальной
  конвертации), 3 в `financing-program.schema.ts` (родственный кейс — ввод буквально в копейках),
  1 в `svoichuzhie` (`price` без label-предупреждения вовсе). Domwellbes-специфичные 5 полей уже
  точечно исправлены локальным `kopecksToRub`/`rubToKopecks` (`apps/domwellbes/src/lib/forms.ts`)
  без ожидания библиотеки — задача не блокер.
- **Статус:** ожидание

### ✅ [2026-09-08] `zenstack-form-plugin` молча терял поля type-миксина (закрыт v4.0.1, от animatrona-ipfs-player-dev)

- **Запросил:** animatrona-ipfs-player-dev (msg 1324/1329, thread `form-plugin-mixin-fields-lost`)
- **Симптом:** `model X with XFields { ... }` — form-схема строилась только из полей самой модели,
  поля миксина (вместе с `@meta("form.*")`) молча пропадали. Exit 0, файл выглядел правдоподобно.
  Контрольный опыт: 4 поля напрямую в модели → все 4 в схеме; те же 4 через `with` (3 в миксине)
  → только 1. `enum`-файлы генерировались нормально (миксин парсится), просто `with` не
  разворачивался при сборке списка полей.
- **Причина:** `model.fields` в Langium AST — только собственные поля модели, поля миксина живут
  отдельно в `model.mixins` (`Array<Reference<TypeDef>>`). `extractModelInfo` итерировала только
  `model.fields`.
- **Фикс:** `collectAllFields(model)` в `model-generator.ts` — рекурсивно разворачивает
  `model.mixins` (включая миксин от миксина), 2 регресс-теста в `model-generator.spec.ts`.
  Подробности — CHANGELOG `libs/zenstack-form-plugin` v4.0.1, обновлён
  `.claude/docs/zenstack-shared-fragments-across-apps.md`.

### ✅ [2026-09-08] БЛОКЕР (закрыт v2.12.2): `Form.Steps` не регистрирует шаги внутри Chakra `Tabs.Content` (от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1315), пересланo `forms-dev` координатором (thread
  `forms-steps-empty-inside-tabs`)
- **Приоритет:** urgent — завтра (2026-09-09) заказчик заводит дом через админку domwellbes;
  редактирование созданного дома полностью сломано (форма создания вне табов работает).
- **Симптом:** `Form.Steps` внутри `Tabs.Content` (`UrlTabs`) рендерился с `stepCount=0`
  (`.chakra-steps__trigger`/`.chakra-steps__content` — 0 шт, `--percent: NaN%`). Тот же
  компонент вне табов (`/admin/houses/new`) работал нормально.
- **Root cause:** `Steps.Root count={stepCount}` монтировался с `count=0` на первом коммите —
  `stepCount` растёт `0 → N` только через несколько ре-рендеров (двухфазная async-регистрация
  каждого `Form.Steps.Step` через собственный `useEffect` + общий `claimedIndicesRef`). Внутри
  `Tabs.Content` `zag-js`-машина `Steps` (`@ark-ui/react`) не пересчитывала внутренний
  прогресс/видимость шагов при этом позднем изменении `count`; снаружи табов та же гонка была
  безобидна чисто по времени монтирования (не воспроизводится в jsdom-тестах — специфично
  реальному браузеру/Next.js dev).
- **Фикс (v2.12.1):** синхронный верхний предел числа шагов по дереву `children`
  (`countDeclaredSteps()` в `form-steps.tsx`), переданный в `Steps.Root` как
  `effectiveStepCount = Math.max(stepCount, declaredStepCount)` уже на первом рендере. Проверено
  живьём в domwellbes (`/admin/houses/[id]?tab=form` и `/admin/houses/new`).
- **⚠️ Регрессия (2026-09-08, тот же день):** domwellbes-dev перепроверил v2.12.1 на той же
  странице (полный ребилд `.next`) — форма всё ещё пустая. Глубокий дебаг с временными логами
  показал: React-стейт `@letar/forms` теперь корректен (`registerStep`/`sortedSteps.length===4`,
  `FormStepsStep`/`FormStepsIndicator` вызываются с правильными пропсами и `index` не -1), но
  **DOM всё равно пустой** — `Steps.List` 0 детей, ни один `Steps.Item`/`Steps.Content` от
  `@ark-ui/react` не попадает в закоммиченное дерево. Гипотеза: `count` на `Steps.Root`
  синхронизирует только CSS/aria корня, а сам `@ark-ui/react` Steps (`@zag-js/steps`) гейтит
  рендер `Item`/`Content` через собственный внутренний machine-реестр, не связанный с React-state
  `registerStep`/`count` вообще — два независимых источника truth. v2.12.1 чинит индикатор
  счётчика, но не корневую причину.
- **Live-репродукция (2026-09-08, forms-dev):** поднял `domwellbes` локально (`nx dev`),
  зашёл на ту же страницу (`/admin/houses/cmtmzxstk00phmkmx7qxr1nng?tab=form`), прямая навигация
  - скриншот сразу после — **воспроизвёл пустую форму**. Но проверка через `document.getElementById`
    сразу же (не через скриншот) показала: `Steps.List` **4 ребёнка**, `Steps.Content` для шага 0 —
    **реальные поля с данными** (`value="Дом «Лиственничный»"`), `hidden=false`. То есть DOM НЕ
    постоянно пуст — гипотеза о независимом machine-реестре zag-js не подтвердилась (у
    `@zag-js/steps` `steps.connect.mjs` нет никакого DOM-сканирования/коллекции вообще — `getItemProps`/
    `getContentProps` чистые генераторы пропсов из `count`/`step`, без внутреннего состояния
    реестра). Повторный скриншот через ~2с — форма полностью появляется сама, без вмешательства.
    Клик между шагами клиентским переходом (без полной навигации) — рендерится мгновенно, без
    вспышки вообще.
- **Настоящий root cause (найден live-дебагом):** `Form.Steps.Step` (не `Steps.Root`, это уже
  было пофикшено в v2.12.1) сам рендерит `null`, пока СОБСТВЕННЫЙ `useEffect` регистрации не
  присвоит ему `indexRef.current >= 0` — окно между первым коммитом и первым проходом эффектов.
  На боевой сборке это окно обычно суб-16мс и незаметно; на dev-сборке (Turbopack, HMR) —
  растягивается до заметных 1-2с, что и увидел domwellbes-dev при ручной проверке (либо
  инспектировал DOM в этом окне, либо их тестовая среда была так же дев-медленной).
- **Фикс (v2.12.2):** `assignDeclaredIndices()` в `form-steps.tsx` — клонирует `children`,
  назначая каждому `Form.Steps.Step` без `when` синхронный `__declaredIndex` по позиции в
  разметке (симметрично `countDeclaredSteps` из v2.12.1, только для индекса КОНКРЕТНОГО шага,
  не общего счётчика). `FormStepsStep` инициализирует `indexRef` этим значением вместо `-1` и
  синхронно клеймит его в `claimedIndicesRef` в теле рендера (тот же паттерн «безопасная
  мутация ref в рендере», что уже используется в файле для `sortedStepsRef`). Эффект
  регистрации не меняется — просто не переопределяет уже заклеймленный индекс. `when`-шаги не
  затронуты (индекс/видимость по-прежнему только асинхронные — не могут быть синхронными).
  Живая проверка на той же странице: прямая навигация + скриншот СРАЗУ (без задержки) —
  индикатор и все поля первого шага уже на месте, вспышки больше нет.
- **Статус:** закрыто (v2.12.2). 28/28 существующих тестов `form-steps*.spec.tsx` зелёные без
  изменений, typecheck/lint чистые.

### ✅ [2026-09-08] `Field.Slug` — auto-slug из соседнего поля (от domwellbes-dev)

- **Запросил:** domwellbes-dev (msg 1304)
- **Приоритет:** urgent по дедлайну (2026-09-09 заказчик заводит дом через `/admin/houses/new`),
  но **не блокер** — на своей стороне временно связали `name` → `slug` через публичный
  `useFieldActions`, без копии транслитерации.
- **Описание:** `<Form.Field.Slug name="slug" source="name" />` — зеркалит
  `slugify(values[source])` (`@letar/format-utils`, ГОСТ 7.79-2000) пока `slug` не отредактирован
  руками; синхронизация выключается навсегда после ручной правки; на форме редактирования
  автоподстановка по умолчанию выключена (`syncOnEdit` для явного включения); желательна кнопка
  «подставить из названия».
- **Общий охват:** slug-поле есть у домов/статей/категорий/товаров практически во всех
  приложениях монорепо с публичными адресами — не частный случай domwellbes.
- **Статус:** закрыто (v2.12.0, 2026-09-08). `useFieldState` синхронизирует `slug` c
  `slugify(source)` через `useStore(form.store, ...)` на путь соседнего поля (тот же groupPrefix) +
  `useEffect` от значения источника, пока `synced` не выключен ручным вводом в сам слаг
  (`markEdited`); дефолт `synced` вычисляется один раз при монтировании (ленивый инициализатор
  `useState`) — `false`, если значение слага на монтировании уже непустое и `syncOnEdit` не
  передан. Кнопка «↺» (`IconButton` в `InputGroup`, паттерн `field-password.tsx`) видна только при
  выключенной синхронизации. Проверено вживую в `form-develop-app` `/slug-demo` (create- и
  edit-сценарии, включая клик по кнопке восстановления) + 7 unit-тестов
  (`field-slug.spec.tsx`). Документация — `libs/forms/docs/fields.md` (число полей 57→58),
  `libs/forms/README.md` (63 поля). `domwellbes-dev` уведомлён в thread `forms-field-slug` —
  временный `useFieldActions`-обходной путь можно снести.

### ✅ [2026-09-08] `Field.Combobox` с начальным значением рендерится пустым (от domwellbes-dev)

- **Запросил:** domwellbes-dev, живая проверка формы состава дома
  (`apps/domwellbes` → `/admin/houses/<id>/?tab=items`, карандаш на строке).
- **Приоритет:** high — задевает любую форму редактирования с `Field.Combobox` во всём монорепо.
- **Симптом:** поле, открытое с непустым `initialValue`, показывает пустой инпут с плейсхолдером.
  Значение живо — сабмит без касания поля сохраняет прежний `value`. Соседние `Field.Number` в той
  же форме заполнены правильно, так что на форму в целом не грешишь.
- **Причина (по исходникам):** в `src/lib/declarative/form-fields/selection/field-combobox.tsx`
  `inputValue` берётся только из `useAsyncSearch(...)` и стартует пустой строкой, а инпут у
  `Combobox.Root` контролируемый (`inputValue={fieldState.inputValue}`). `value={[currentValue]}`
  выставляется верно — расходятся выбранное значение и отображаемый текст.
- **Почему больно:** поле выглядит незаполненным и обязательным (`*` + подсказка «Минимум 1
  символ»). Естественная реакция — начать печатать и выбрать из списка, а это молча
  переподвешивает позицию состава на другую работу/материал.
- **Предлагаемое поведение:** при монтировании (и при внешней смене `field.state.value`)
  подставлять в `inputValue` label опции с этим value из `options`; для async-варианта, где label
  ещё не загружен, нужен явный вход — `initialLabel` или `getLabelForValue`.
- **Статус:** закрыто (v2.11.5, 2026-09-08). `useFieldState` теперь синхронизирует `inputValue`
  с текущим значением поля на монтировании через `useStore(form.store, ...)` (паттерн из
  `field-city.tsx`/`field-address.tsx`): для статических `options` — поиском подходящей опции по
  `value`; для `useQuery` — через новый проп `initialLabel` (label для значения не всегда
  доступен на монтировании — асинхронный поиск ещё не выполнялся). Регресс-проверка —
  `apps/form-develop-app` `/fields-demo` (`country: 'us'` в `initialValues`, DOM-проверкой
  подтверждено `input.value === "United States"`); документация — `apps/form-docs`
  `content/docs/fields/select.mdx`/`.ru.mdx`, раздел «Editing an existing value with async
  search»/«Редактирование существующего значения при асинхронном поиске».

### ✅ [2026-09-08] Диалог восстановления черновика (`useFormPersistence`) захардкожен на английском (от domwellbes-dev)

- **Запросил:** domwellbes-dev, живая проверка пилота `Form.Steps` на форме дома
  (`apps/domwellbes/src/app/(admin)/admin/houses/_components/house-form.tsx`).
- **Статус:** закрыто (v2.11.3, 2026-09-08). Дефолты `dialogTitle`/`dialogDescription`/
  `restoreButtonText`/`discardButtonText` в `form-persistence.tsx` переведены на русский; диалог
  дополнительно читает переопределения через уже существующий `FormI18nProvider`/`useFormI18n`
  (`@letar/forms-react`) по ключам `formPersistence.restoreDialog.{title,description,
  restoreButton,discardButton}` — без провайдера или без перевода под ключом остаётся русский
  дефолт. Живая проверка в domwellbes (`/admin/houses/new`) — диалог на русском.
  `clearDraftButtonText` (кнопка "Clear draft" вне диалога) был намеренно не тронут в этой задаче
  — закрыт отдельно тем же днём (v2.11.4): дефолт "Очистить черновик", ключ
  `formPersistence.clearDraftButton`.

### ✅ [2026-09-07] `@tanstack/react-table` рассинхрон версии ломает `next build` (не `tsgo`) (от animatrona-dev)

- **Запросил:** animatrona-dev (msg 1263, bug-report)
- **Статус:** закрыто (v2.11.1, 2026-09-08). `"@tanstack/react-table"` в `libs/forms/package.json`
  забампан `^9.1.2` → `^9.2.4` в синхрон с корнем + `bun install`. Подтверждено чистым
  `nx build form-develop-app --skip-nx-cache` (`/data-grid-demo`, `/table-editor-demo`
  компилируются без TS-ошибок) — версия была единственной причиной, код за пределы API v9.1.x не
  выходил. Обходы `ignoreBuildErrors: true` у `label-printer-desktop`/`animatrona-player`/шаблона
  `generators:electron-app` теперь избыточны — их зона, снятие не входит в эту задачу, сообщено
  координатору отдельным пунктом.

## Архитектура: кастомный рендер и слоты Select/Combobox

> `renderOption`/`renderValue`, `data: TData`, `onUpdate`, слоты `EditButton`/`CreateButton` — этапы А и Б.
> Развёрнутое продолжение записи Backlog «[2026-09-26] Select/Combobox: кастомный рендер…» (вверху файла).
> Написано архитектором по заданию `forms-coordinator-dev` 2026-09-26, реализует `forms-dev`. Кода реализации
> здесь нет — только сигнатуры и наброски. Каждое утверждение о Chakra/Ark/zag/Radix сверено с исходниками в
> `node_modules`; ссылки вида `ZS/select.connect.mjs:261` — файл и строка (сокращения в §0). Пометка
> «(не проверено)» — то, что по исходникам подтвердить не удалось.

### 0. Версии и сокращения путей

Реально установлено (симлинк `libs/forms/node_modules/@chakra-ui/react`): Chakra UI **3.37.0** → Ark UI **5.39.0** →
zag **1.43.3**; shadcn-скин — `@radix-ui/react-select` **2.3.7**. Номера строк верны для этих версий; после
`bun update` Chakra/Ark/Radix пункты со ссылками перепроверить (поведение закрыто тестами из §12).

- `ZS/` = `node_modules/.bun/@zag-js+select@1.43.3/node_modules/@zag-js/select/dist/`
- `ZC/` = `node_modules/.bun/@zag-js+combobox@1.43.3/node_modules/@zag-js/combobox/dist/`
- `ZQ/` = `node_modules/.bun/@zag-js+dom-query@1.43.3/node_modules/@zag-js/dom-query/dist/`
- `ZF/` = `node_modules/.bun/@zag-js+focus-trap@1.43.3/node_modules/@zag-js/focus-trap/dist/`
- `ZL/` = `node_modules/.bun/@zag-js+collection@1.43.3/node_modules/@zag-js/collection/dist/`
- `ZM/` = `node_modules/.bun/@zag-js+core@1.43.3/node_modules/@zag-js/core/dist/merge-props.mjs`
- `ARK/` = `node_modules/.bun/@ark-ui+react@5.39.0+6f4b9a1cfb20c0ae/node_modules/@ark-ui/react/dist/components/`
- `CR/` = `node_modules/.bun/@chakra-ui+react@3.37.0+9493b15259d2b947/node_modules/@chakra-ui/react/dist/esm/theme/recipes/`
- `RX` = `node_modules/.bun/@radix-ui+react-select@2.3.7+2b23df507bdda662/node_modules/@radix-ui/react-select/dist/index.mjs`

### 1. Контекст, цели, не-цели

Референс владельца: адрес доставки правится карандашом в модальном окне, без перехода на страницу; карандаш есть
и у каждой опции списка, и у выбранного значения; рендер — библиотечный по умолчанию или свой, в своём кнопку
ставят куда угодно компонентом-слотом. `onCreate` (forms 2.17.0) — уже сделанная половина той же идеи.

**Цели.**

- **А.** `renderOption(option, state)`, `renderValue(option)`, типизированное `data: TData` в опции; нестроковый
  `label` перестаёт сплющиваться в строку, поиск и typeahead при этом не ломаются. Контракт —
  `@letar/forms-core/uikit`; скины Chakra (`@letar/forms`) и shadcn (`@letar/forms-shadcn`); Select и Combobox.
- **Б.** `onUpdate(option) → Promise<{ label, value, data? } | null>` и два слота на одной инфраструктуре
  контекста: `Form.Field.Select.EditButton` (для `onUpdate`) и `Form.Field.Select.CreateButton` (для `onCreate`,
  дополнение владельца). Те же слоты у `Form.Field.Combobox`. Плюс Combobox при пустом результате показывает
  «Ничего не найдено» и под ним пункт создания (§9.1).
- **В.** Поиск в `Field.Select`: быстрый фильтр по тексту внутри выпадашки, по умолчанию с 10 опций
  (`searchable`, §15). Только статичные опции, без `useQuery` — async остаётся за Combobox (§15.7).
- **Г.** Два равноправных источника данных: хук TanStack Query/ZenStack и промис `loadOptions` (server action,
  `fetch`); «ровно один источник» в типах; пакет `@letar/forms-query` с подпутём `/zenstack` (§16.8, §16.9).
- **Д.** Оптимистичный режим `onCreate`/`onUpdate`: результат виден сразу, подтверждение в фоне, отправка формы ждёт
  его (§16.7).
- **Е.** Автопривязка справочников из схемы: `@meta("form.fieldType", "Select.WorkCategory")` → `Form.AutoFields`
  и `Form.Field.Auto` берут компонент из реестра `createForm`; плагин генерирует типизированный список ключей (§17).
  Идёт после А–Д и их не блокирует.

**Не-цели.** Мультивыбор. `onDelete`/`DeleteButton` (место оставлено, §4.6). Скины vue/vue-shadcn/angular
(потребителей нет). `renderValue` у Combobox (значение там — текст инпута, §9). Окно редактирования — его делает
приложение, как у `onCreate`. `Field.NativeSelect` (deprecated), `Listbox`, `Autocomplete`, `CascadingSelect`.

### 2. Контракт типов

#### 2.1. `@letar/forms-core/uikit` — типы и чистые функции, без React

`types.ts` — все новые поля необязательные: vue/angular-скины компилируются без правок.

```ts
export interface UIKitSelectOption<TNode = unknown, TData = unknown> {
  value: string
  label: TNode
  /** Строка опции: itemToString коллекции, typeahead/поиск, подпись в триггере по умолчанию, проверка дублей onCreate */
  textValue?: string
  disabled?: boolean
  group?: string
  /** Данные приложения. Скин их не читает — только отдаёт в render-функции */
  data?: TData
  /** Итог, посчитанный полем (isOptionEditable): рисовать ли карандаш у пункта */
  editable?: boolean
}

/** Состояние пункта для renderOption. Подсветки нет сознательно: оба скина ставят `[data-highlighted]` — это CSS */
export interface UIKitOptionRenderState {
  selected: boolean
  disabled: boolean
}

/** Ручка выпадашки: скин заполняет её, поле вызывает перед окном приложения (§5) */
export interface UIKitSelectControl {
  close: () => void
  focusTrigger: () => void
}

/** Слоты, общие для Select и Combobox */
export interface UIKitSelectionSlotProps<TNode = unknown, TData = unknown> {
  /** Своё содержимое пункта; скин оборачивает его в свой ItemText. Служебный пункт «+ Добавить…» сюда не попадает */
  renderOption?: (option: UIKitSelectOption<TNode, TData>, state: UIKitOptionRenderState) => TNode
  /** Кнопки пункта по умолчанию (карандаш). Поле передаёт их, только если своего renderOption нет (§4.2) */
  renderOptionActions?: (option: UIKitSelectOption<TNode, TData>) => TNode
  /** Кнопки у выбранного значения — ВНЕ триггера (у Chakra — в IndicatorGroup) */
  controlActions?: TNode
  /** Подвал списка внутри Content, после пунктов (например CreateButton) */
  listFooter?: TNode
  /** Скин кладёт сюда { close, focusTrigger }, пока смонтирован Root */
  controlRef?: { current: UIKitSelectControl | null }
  /** F2: value подсвеченного пункта (список открыт) или выбранного (закрыт) — §7 */
  onEditHotkey?: (value: string) => void
  /** Локализованная подсказка для aria-describedby/title, когда onEditHotkey задан */
  editHotkeyHint?: string
}

export interface UIKitSelectProps<TNode = unknown, TData = unknown> extends UIKitSelectionSlotProps<TNode, TData> {
  // ...текущие поля без изменений; options: UIKitSelectOption<TNode, TData>[]
  /** Своя подпись выбранного значения. Рисуется ВНУТРИ триггера (<button>) — только фразовое содержимое, без кнопок */
  renderValue?: (option: UIKitSelectOption<TNode, TData>) => TNode
  /** Закрывает пробел: сейчас resolved.readOnly до Select не доходит вовсе (field-select.tsx:158–205) */
  readOnly?: boolean
}

export interface UIKitComboboxProps<TNode = unknown, TData = unknown> extends UIKitSelectionSlotProps<TNode, TData> {
  // ...текущие поля; options: UIKitSelectOption<TNode, TData>[]
  /** Содержимое пустого списка вместо текста «Ничего не найдено» (например CreateButton) */
  emptyContent?: TNode
}
// Этап В: emptyContent переезжает в UIKitSelectionSlotProps (нужен и Select в режиме поиска),
// UIKitSelectProps получает search?: UIKitSelectSearch — §15.4
```

`creatable-options.ts` — расширение без поломки (дефолт generic-а сохраняет прежний тип):

```ts
export interface CreatedOption<TData = unknown> {
  label: string
  value: string | number
  /** Новое, необязательное: данные для renderOption созданной опции */
  data?: TData
}
export type CreateOptionHandler<TData = unknown> = (search: string) => Promise<CreatedOption<TData> | null>
// этап Д (§16.7): (search, ctx: SelectionActionContext<TData>) — второй аргумент, совместимо
```

Новый `editable-options.ts` (экспорт через `uikit/index.ts`):

```ts
/** Что onUpdate возвращает полю */
export interface UpdatedOption<TData = unknown> {
  label: string
  /** Тот же value — правка подписи; другой — запись заменена (copy-on-write, §6) */
  value: string | number
  /** Передан — заменяет data опции; не передан — data остаётся прежней */
  data?: TData
}
export type UpdateOptionHandler<TOption, TData = unknown> = (option: TOption) => Promise<UpdatedOption<TData> | null>
// этап Д (§16.7): (option, ctx: SelectionActionContext<TData>) — второй аргумент, совместимо

/** Место под расширение: 'delete' добавится вместе с onDelete (§4.6) */
export type SelectionActionKind = 'create' | 'edit'

/** Запись локального наложения правок — одна на исходное value */
export interface OptionOverlayEntry {
  fromValue: string
  label: string
  value: string | number
  data?: unknown
  hasData: boolean
  /** Текст опции ПРИЛОЖЕНИЯ в момент клика. Его смена = «приложение перезапросило список» */
  baselineText: string
}

/** textValue → строковый (или числовой) label → String(value) */
export function getOptionText(option: { label?: unknown; textValue?: string; value: unknown }): string
/** onUpdate есть, editable !== false, не disabled, value !== '' и не служебный CREATE_OPTION_VALUE */
export function isOptionEditable(
  option: { value: unknown; disabled?: boolean; editable?: boolean },
  hasOnUpdate: boolean,
): boolean
/** Добавить/заменить запись по fromValue; у повторной правки baselineText остаётся от первой */
export function upsertOptionOverlay(
  overlay: readonly OptionOverlayEntry[],
  entry: OptionOverlayEntry,
): OptionOverlayEntry[]
/** Убрать устаревшие записи (§6). Нечего убирать — вернуть ТОТ ЖЕ массив (важно для setState, §6) */
export function pruneOptionOverlay<T extends { value: string | number; label?: unknown; textValue?: string }>(
  appOptions: readonly T[],
  overlay: readonly OptionOverlayEntry[],
): readonly OptionOverlayEntry[]
/** Наложить активные записи на итоговый список (§6) */
export function applyOptionOverlay<
  T extends { value: string | number; label?: unknown; textValue?: string; data?: unknown },
>(options: readonly T[], overlay: readonly OptionOverlayEntry[]): T[]
```

Существующая `getOptionLabel` (публичный экспорт) не удаляется: её тело делегирует `getOptionText`. Для текущих
данных (без `textValue`) результат тот же.

#### 2.2. Публичные типы полей (`libs/forms`, `types/option-types.ts` и `types/field-types.ts`)

```ts
export interface BaseOption<T = string, TData = unknown> {
  label: ReactNode
  value: T
  disabled?: boolean
  /** Строка для поиска, typeahead, подписи в триггере и проверки дублей, когда label — не строка */
  textValue?: string
  /** Данные приложения — приходят в renderOption/renderValue/onUpdate */
  data?: TData
  /** Этап Д (§16.7): запись ещё не подтверждена сервером — видна приглушённой, не выбирается и не правится */
  pending?: boolean
}
export interface GroupableOption<T = string, TData = unknown> extends BaseOption<T, TData> {
  group?: string
}
export interface EditableOptionFlag {
  /** false — у этой опции нет карандаша (этап Б) */
  editable?: boolean
}
export type SelectFieldOption<TData = unknown> = BaseOption<string | number, TData> & EditableOptionFlag
export type ComboboxFieldOption<T = string, TData = unknown> = GroupableOption<T, TData> & EditableOptionFlag
export interface OptionRenderState {
  selected: boolean
  disabled: boolean
  /** Этап Д: опция ждёт подтверждения (`option.pending` или своя оптимистичная правка/создание поля) */
  pending: boolean
}

export interface SelectFieldProps<TData = unknown> extends BaseFieldProps {
  options?: SelectFieldOption<TData>[]
  getGroup?: (option: SelectFieldOption<TData>) => string | undefined
  // этап А
  renderOption?: (option: SelectFieldOption<TData>, state: OptionRenderState) => ReactNode
  renderValue?: (option: SelectFieldOption<TData>) => ReactNode
  // этап Б
  onUpdate?: UpdateOptionHandler<SelectFieldOption<TData>, TData>
  onCreate?: CreateOptionHandler<TData>
  createLabel?: string
  /** false — без встроенного пункта «+ Добавить…»; кнопку ставит приложение (CreateButton в listFooter). По умолчанию true */
  createItem?: boolean
  /** Подвал выпадающего списка */
  listFooter?: ReactNode
  // этап В (§15)
  /** Поле поиска в выпадашке. По умолчанию 'auto' — при 10+ опциях (порог 9) */
  searchable?: SelectSearchable<TData>
  /** Пустой результат поиска: своё содержимое вместо «Ничего не найдено» (например с CreateButton) */
  renderEmpty?: (search: string) => ReactNode
  /** Опции ещё грузятся (`useFindMany`): спиннер, текст загрузки в списке и в триггере (§16.3, вопрос 23) */
  loading?: boolean
  // этап Д (§16.7) — оптимистичный режим; включается вызовом ctx.optimistic() в onCreate/onUpdate
  /** Подтверждение не пришло (null, ошибка, таймаут) — показанное уже откачено */
  onSettleError?: (info: SettleErrorInfo<TData>) => void
  /** Сколько ждать подтверждения, мс; по умолчанию 30 000, потом — как отказ */
  settleTimeout?: number
  // valueType, clearable, size, variant — без изменений
}

export interface ComboboxFieldProps<T = string, TData = unknown> extends BaseFieldProps {
  options?: ComboboxFieldOption<T, TData>[]
  // useQuery/getLabel/getValue/getGroup/getDisabled/... — без изменений
  // этап А
  renderOption?: (option: ComboboxFieldOption<T, TData>, state: OptionRenderState) => ReactNode
  /** Строка элемента запроса, когда getLabel возвращает ReactNode */
  getTextValue?: (item: TData) => string
  // этап Б
  getEditable?: (item: TData) => boolean
  onUpdate?: UpdateOptionHandler<ComboboxFieldOption<T, TData>, TData>
  onCreate?: CreateOptionHandler<TData>
  createLabel?: string
  createItem?: boolean
  listFooter?: ReactNode
  /** Пустой список: своё содержимое вместо emptyMessage (например с CreateButton) */
  renderEmpty?: (search: string) => ReactNode
  /** Догрузка выбранной записи по value (`useFindUnique`), когда её нет в выдаче (§16.4, вопрос 24) */
  useSelected?: (value: string) => { data?: TData | null; isLoading?: boolean }
  // этап Г (§16.8): промис-путь loadOptions/loadSelected/onLoadError, loading у статичных options;
  // «ровно один источник» — ComboboxFieldProps становится пересечением базы и объединения источников
  // этап Д (§16.7): onSettleError, settleTimeout — как у Select
}
```

Этап Д (§16.7) расширяет обработчики `CreateOptionHandler`/`UpdateOptionHandler` вторым аргументом
`ctx: SelectionActionContext<TData>` (`ctx.optimistic(preview)`), существующие обработчики его игнорируют.

- **Почему у Select generic только `TData`, без `TValue`.** С ограничением `TValue extends string | number` TS
  выводит из `options` литеральный union (`'roof' | 'base'`), и тогда `onCreate`/`onUpdate`, вернувшие новый id,
  перестают типизироваться. Значения Select остаются `string | number`, как сейчас.
- **Вывод `TData`.** `options={items.map((i) => ({ label: i.name, value: i.id, data: i }))}` → `TData = Item`;
  `renderOption`/`onUpdate` — стрелки без аннотации, контекстно-зависимые, TS выводит их параметр после `options`.
  У Combobox с `useQuery` `TData` уже есть (тип элемента запроса); поле кладёт `data: item` в опцию само.
- **`data` необязательна** (`TData | undefined`): у созданной через `onCreate` опции и у наложенной правки без
  `data` её честно нет. В доке — `option.data?.city`.
- ⚠️ Вывод проверить под `tsgo` compile-only тестом (§12): у tsgo был свой расхождение с tsc в выводе generic
  из колбэков (`.claude/docs/tsgo-generic-default-param-inference.md`).

#### 2.3. Слоты — `@letar/forms-react` (React без UI-библиотеки, общий для обоих скинов)

Новая папка `libs/forms-react/src/lib/selection/`: контексты, headless-хуки кнопок и состояние для
`useFieldState`. Визуал кнопок — в скинах.

```ts
export interface SelectionEditButtonProps {
  /** Своя иконка/текст; по умолчанию карандаш скина */
  children?: ReactNode
  /** По умолчанию «Изменить «<текст опции>»» (i18n formSelection.editOptionAria) */
  'aria-label'?: string
  /** По умолчанию «Изменить (F2)» (i18n formSelection.editOption + подсказка клавиши) */
  title?: string
}
export interface SelectionCreateButtonProps {
  /** По умолчанию «+ Добавить…» у Select и «+ Добавить "<поиск>"» у Combobox (createLabel, i18n) */
  children?: ReactNode
}
export interface SelectionSlotComponents {
  EditButton: (props: SelectionEditButtonProps) => ReactElement | null
  CreateButton: (props: SelectionCreateButtonProps) => ReactElement | null
}

/** Где стоит слот: в пункте, у значения (вне триггера) или внутри триггера (там слоты запрещены) */
export type SelectionSlotScope = 'option' | 'value' | 'value-text'

/** Контекст поля — ОДИН провайдер на поле, общий для всех слотов */
export interface SelectionActionsContextValue {
  pending: boolean
  canCreate: boolean
  hasOnUpdate: boolean
  interactive: boolean // !disabled && !readOnly
  search: string // текст поиска Combobox; '' у Select
  runCreate: () => void
  runEdit: (option: unknown, scope: 'option' | 'value') => void
  strings: SelectionActionStrings // edit, editAria(text), create, createWithSearch(search), hotkeyHint
}

/** Контекст опции — поле ставит его вокруг renderOption, renderOptionActions, controlActions, renderValue */
export interface SelectionOptionContextValue {
  option: unknown // публичная опция после наложения правок
  text: string // getOptionText(option), для aria-label
  editable: boolean
  scope: SelectionSlotScope
}

/** Headless: видимость, disabled, обработчики событий (stopPropagation — здесь, одинаково для скинов) */
export function useSelectionEditButton(props: SelectionEditButtonProps): SelectionEditButtonState | null
export function useSelectionCreateButton(props: SelectionCreateButtonProps): SelectionCreateButtonState | null
/** Для useFieldState поля: pending, mountedRef, overlay, createdOptions, controlRef и конвейер run (§5) */
export function useSelectionActionsState(options: UseSelectionActionsStateOptions): SelectionActionsState
```

Типизация статиков (`form-root/form-compound-types.ts` → `FormFieldComponents`, и дубль в `create-form.tsx` →
`ExtendedFormField`):

```ts
export type SelectFieldComponent =
  & (<TData = unknown>(props: SelectFieldProps<TData>) => ReactElement)
  & SelectionSlotComponents
export type ComboboxFieldComponent =
  & (<T extends string = string, TData = unknown>(props: ComboboxFieldProps<T, TData>) => ReactElement)
  & SelectionSlotComponents
// FormFieldComponents.Select: SelectFieldComponent; FormFieldComponents.Combobox: ComboboxFieldComponent
```

Навеска (набросок): `createField` возвращает не-generic `(props: P) => ReactElement`
(`forms-react/.../create-field-primitives.tsx:135–137`), поэтому generic и статики восстанавливаются приведением:

```ts
const FieldSelectBase = createField<SelectFieldProps, string | number, SelectFieldState>({/* ... */})
export const FieldSelect: SelectFieldComponent = Object.assign(
  FieldSelectBase as <TData = unknown>(props: SelectFieldProps<TData>) => ReactElement,
  { EditButton: SelectionEditButton, CreateButton: SelectionCreateButton },
)
```

`FieldCombobox` получает **те же самые** компоненты: `Form.Field.Combobox.EditButton === Form.Field.Select.EditButton`.
Поле определяется контекстом, а не тем, через какой статик слот взят. `assertSameKeys` (`declarative/index.ts:251`)
сверяет только набор ключей `Form.Field` — не меняется.

### 3. Как обойти сплющивание `label`

**Сейчас.** Chakra: `field-select.tsx:190–195` отдаёт в UIKit `label: getOptionLabel(opt)` — строку; `ReactNode`
превращается в `String(value)`. Сам примитив уже рисует `{opt.label}` в пункте (`uikit-chakra.tsx:219–231`, без
`ItemText`), коллекция — `itemToString: getOptionLabel` (`uikit-chakra.tsx:177`). Combobox:
`<Combobox.ItemText>{getOptionLabel(opt)}</Combobox.ItemText>` (`field-combobox.tsx:470, 479`). shadcn Select
рисует `opt.label` в `ItemText` (`forms-shadcn/.../primitives/select.tsx`), то есть `ReactNode` там уже работает.

**Решение.**

1. **Коллекция остаётся строковой:** `itemToString: getOptionText` (`textValue` → строковый `label` →
   `String(value)`). Что на ней держится: typeahead Select через `collection.search`
   (`ZS/select.machine.mjs:586–593, 637–644` → `ZL/list-collection.mjs:249`), подпись `valueAsString`
   (`ZS/select.machine.mjs:108`), `collection.toString()` с подписью внутри (`ZL/list-collection.mjs:432–440`) —
   поэтому смена подписи сама запускает `syncCollection` (`ZS/select.machine.mjs:125–127`). В Combobox — текст
   инпута при выборе пункта.
2. **Отрисовка — из опции:** поле передаёт `label` как есть плюс `textValue: getOptionText(opt)`. Скин:
   `<ItemText>{renderOption ? renderOption(o, state) : o.label}</ItemText>`. `state` поле считает само
   (`selected = String(value) === o.value`, `disabled = o.disabled`) — хуки zag для этого не нужны.
3. **Триггер.** `ValueText` Ark рисует `children || select.valueAsString || placeholder`
   (`ARK/select/select-value-text.js`). С `renderValue` — `children = renderValue(selected)`; вернул пустое —
   откат к строке. **Без `renderValue` в триггере строка (`getOptionText`), а не `ReactNode` из `label`:** триггер —
   `<button>` (`ZS/select.connect.mjs:150–160`), а `label` приложения может содержать блоки и кнопки. `ReactNode`
   в триггере — только явным `renderValue`.
4. **`ReactNode` без `textValue`** — однократный dev-only `console.warn` на поле: «у опции `<value>` нестроковый
   label без textValue — поиск и подпись в триггере покажут value».
5. **Выбранная опция для `renderValue`** ищется по value в итоговом списке (после созданных и правок). Не
   нашлась (async ещё не загрузился) — `children` нет, zag показывает подпись из своего кеша выбранных
   (`ZL/selection-map.mjs:4–15`: `collection.find(value) ?? selectedItemMap.get(value)`).

**Обратная совместимость.**

- Строковые `label` — поведение то же (`textValue` нет → берётся `label`).
- ⚠️ **Изменение поведения:** пункты с нестроковым `label` начнут рисовать сам `ReactNode` вместо `String(value)`.
  Это исправление (тип всегда был `ReactNode`), но в CHANGELOG — отдельной строкой «Изменения поведения». Перед
  релизом — греп потребителей (`label: <`, `label={<` рядом с `Field.Select`/`Combobox`).
- Содержимое пункта Chakra теперь в `Select.ItemText` (recipe `itemText: { flex: 1 }`, `CR/select.js:100–102`) —
  визуально то же, снапшоты могут сдвинуться.
- `getOptionLabel` получает `textValue` — для данных без `textValue` результат прежний.
- Новые поля UIKit необязательные — vue/angular не трогаем.

### 4. Слоты `EditButton` и `CreateButton`

#### 4.1. Слои

| Слой               | Что                                                                                                          | Где                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forms-core/uikit` | типы, `getOptionText`, `isOptionEditable`, функции наложения                                                 | `types.ts`, `creatable-options.ts`, новый `editable-options.ts`                                                                                                                 |
| `forms-react`      | два контекста, `useSelectionActionsState` (для `useFieldState`), headless-хуки кнопок                        | новый `src/lib/selection/`                                                                                                                                                      |
| скин               | визуал кнопок; где рисовать `controlActions`/`renderOptionActions`/`listFooter`; заполнение `controlRef`; F2 | `libs/forms`: `uikit-chakra.tsx`, новый `selection/selection-slots.tsx`; `forms-shadcn`: `primitives/select.tsx`, `primitives/combobox.tsx`, новый `fields/selection-slots.tsx` |
| поле               | состояние, сборка провайдеров, перевод публичной опции ↔ UIKit-опции                                         | `field-select.tsx`, `field-combobox.tsx` в обоих скинах                                                                                                                         |

Визуал: Chakra — `IconButton` + `LuPencil` (`react-icons/lu`, уже используется в `libs/forms`); shadcn — `<button>`

- `Pencil` из `lucide-react`.

#### 4.2. Провайдеры и где стоят кнопки по умолчанию

- **Контекст поля** — `render` поля оборачивает весь примитив в `<SelectionActionsProvider>`. Значение
  собирается в `render` из `fieldState` и `applyValue` (`field.handleChange` есть только в `render`, а хуки там
  запрещены — `createField` зовёт `render` внутри `<form.Field>`). Объект новый на каждый рендер, без memo:
  дёшево, слоты перерисовываются вместе с полем.
- **Контекст опции** — поле оборачивает:
  - вывод `renderOption` приложения → `scope: 'option'`;
  - кнопки по умолчанию → `renderOptionActions={props.renderOption ? undefined : (o) => o.editable ? <EditButton/> : null}`
    в провайдере `scope: 'option'`;
  - `controlActions` → `<EditButton/>` в провайдере выбранной опции, `scope: 'value'`, если значение выбрано,
    опция редактируема и поле `interactive`;
  - вывод `renderValue` → `scope: 'value-text'`.
- **Правило «свой рендер — свои кнопки»:** если задан `renderOption`, карандаш в пунктах автоматически НЕ
  рисуется — приложение ставит `<Form.Field.Select.EditButton />` в своём рендере там, где нужно (или не ставит).
  Карандаш у выбранного значения от `renderOption` не зависит. Автодетекция «есть ли EditButton в рендере»
  отвергнута: она работает только после эффекта (мигание) и неочевидна. Открытый вопрос №3.

#### 4.3. `EditButton` — поведение

| Ситуация                                                                     | Что рендерит                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| вне поля (нет контекста поля) или вне опции                                  | `null` + dev-предупреждение                        |
| `scope: 'value-text'` (внутри `renderValue`, то есть внутри `<button>`)      | `null` + dev-предупреждение про вложенную кнопку   |
| у поля нет `onUpdate`                                                        | `null` + dev-предупреждение                        |
| опция не редактируема (`editable: false`, `disabled`, value `''`, служебная) | `null`                                             |
| поле `disabled` или `readOnly`                                               | `null`                                             |
| идёт действие (`pending`)                                                    | кнопка `disabled`                                  |
| `scope: 'option'`                                                            | `tabIndex={-1}`, `aria-hidden`, гасит события (§7) |
| `scope: 'value'`                                                             | обычная кнопка в Tab-порядке, `aria-label`         |

Клик → `runEdit(option, scope)`. В пункте кнопка гасит `pointerdown`, `pointerup`, `click` (`stopPropagation`,
у `click` ещё `preventDefault`) — причины по каждому скину в §7.

#### 4.4. `CreateButton` — поведение

- Нет контекста поля → `null` + dev-предупреждение; у поля нет `onCreate` → `null`; `scope: 'value-text'` → `null`.
- Select: `runCreate()` → `onCreate('')`; с этапа В в режиме поиска — `onCreate(search.trim())` (§15.4).
  Combobox: `onCreate(search.trim())` — текст из контекста поля.
- Путь тот же, что у встроенного пункта «+ Добавить…»: закрыть список → окно приложения → результат →
  опция добавляется и выбирается (§5). Встроенный пункт (`CREATE_OPTION_VALUE`) переводится на тот же `runCreate`,
  `creatingRef` удаляется: один `pending` на поле — пункт, `CreateButton` и `EditButton` не запускаются
  параллельно.
- Внутри списка (`listFooter`, `renderEmpty`): атрибут `data-no-autofocus` — zag пропускает его при начальном
  фокусе (`ZQ/initial-focus.mjs:13`), фокус при открытии остаётся на Content. Кнопка гасит всплытие `keydown`
  Enter/Space — иначе Content превратит Enter в выбор подсвеченного пункта и `preventDefault` отменит нативную
  активацию кнопки (`ZS/select.connect.mjs:405–407, 417–419`).

#### 4.5. Встроенный пункт «+ Добавить…» и свой рендер

- В `renderOption` не попадает никогда (`isCreateOptionValue` — скин рисует его сам: `+ ${createLabel}`), карандаша
  не получает (`isOptionEditable` исключает `CREATE_OPTION_VALUE`).
- Отдельный `renderCreate` не вводим: текст — через `createLabel`; другое место — `createItem={false}` +
  `CreateButton` в `listFooter` (Select, Combobox) или в `renderEmpty` (Combobox, пустая выдача).
- «Рядом с меткой поля» так не сделать: метка — `<label>`, а `<button>` — labelable-элемент, внутри чужого
  `<label>` недопустим (HTML: label не содержит labelable-потомков, кроме своего контрола). Нужен отдельный слот
  `labelAddon` рядом с меткой, вне `<label>`, — в первую итерацию не входит (открытый вопрос №6).
- ⚠️ Клавиатура: в Select `CreateButton` из подвала достижим Tab-ом (`isValidTabEvent` пропускает Tab, когда в
  Content есть tabbable — `ZQ/initial-focus.mjs:17–25`). В Combobox фокус в инпуте, Tab уводит из поля — кнопка
  в подвале с клавиатуры недостижима. Поэтому в доке: `createItem={false}` у Combobox — только если у
  пользователя клавиатуры есть другой путь; по умолчанию оставлять встроенный пункт.

#### 4.6. `DeleteButton` — не делаем, место оставлено

- Расширение симметрично: `SelectionActionKind` получает `'delete'`, `SelectionSlotComponents` — `DeleteButton`,
  `onDelete(option) → Promise<boolean>`, конвейер `run` (§5) уже общий по виду действия, `OptionOverlayEntry` —
  флаг `removed` (опция скрыта до перезапроса; правило прюнинга «приложение больше не отдаёт value» ложится
  естественно).
- Почему не сейчас: владелец исключил; удаление записи справочника из формы необратимо и задевает другие
  сущности, которые на неё ссылаются. По правилу студии необратимое действие требует окна подтверждения со
  знанием о ссылках, а оно есть только у приложения. Выбранное значение после удаления повисает без подписи.
  Потребителя нет.

### 5. Поведение и состояния

**Конвейер `run`** (общий для edit и create, живёт в `forms-react`):

```
run(kind, option?, scope):
  1. pendingRef.current || !mountedRef.current → выход      // двойной клик, F2 дважды, пункт + кнопка
  2. pendingRef.current = true; setPending(true)
  3. edit: baselineText = текст опции ПРИЛОЖЕНИЯ (для §6)
  4. controlRef.current?.close()                             // Chakra: api.setOpen(false), ZS/select.connect.mjs:76–80
  5. scope === 'option' → controlRef.current?.focusTrigger() // синхронно; Chakra: api.focus(), ZS/select.connect.mjs:73–75
     scope === 'value'  → фокус остаётся на карандаше: он и вызвал окно
  6. обработчик приложения вызывается СИНХРОННО в том же обработчике события (как onCreate сейчас)
  7. .then(result => mounted && result && apply(kind, result, option))
     .finally(() => { pendingRef.current = false; mounted && setPending(false) })
     // reject не глотается — unhandled rejection, та же политика, что у onCreate (field-select.tsx:172–173)
```

**Почему фокус переводится синхронно — и почему этого достаточно.**

- zag Select при закрытии сам возвращает фокус на триггер, но в `raf` (`ZS/select.machine.mjs:320–334` → действие
  `focusTriggerEl`, `549–555`).
- Модальное окно Chakra (zag dialog) включает ловушку фокуса тоже в `raf` (`ZF/index.mjs:6–27`) и запоминает
  элемент, активный в момент включения (`ZF/focus-trap.mjs:609`), — туда вернёт фокус при закрытии.
- Без шага 5 активным в этот момент может оказаться карандаш внутри уже скрытого Content — и после закрытия
  окна фокус уйдёт в `body`. Синхронный `focusTrigger` делает результат независимым от порядка двух `raf`.
  Поздний `raf` Select-а внутри уже открытого окна ловушка вернёт обратно (`ZF/focus-trap.mjs:71–79`).
- Radix: при закрытии Content фокус возвращается на триггер в cleanup (`RX:466`, `onUnmountAutoFocus`); плюс
  явный `focusTrigger` через ref триггера.

**`apply` для edit:**

```
fromValue = String(option.value)
fromValue есть в createdOptions и НЕТ в опциях приложения → правим запись в createdOptions (label, value, data)
иначе → overlay = upsertOptionOverlay(overlay, { fromValue, label, value, data, hasData: 'data' in result, baselineText })
текущее значение поля === fromValue (проверка на момент РЕЗОЛВА) && String(result.value) !== fromValue
  → applyValue(result.value) с учётом valueType
Combobox: опция выбрана → setInputValue(result.label)
```

- Правка подписи при том же value **не** вызывает `handleChange`: форма не становится dirty, `dirtyGuard` не
  срабатывает. Смена value у выбранной опции — обычное изменение значения, форма dirty.
- Невыбранная опция после правки **не** выбирается: правка ≠ выбор (открытый вопрос №2).
- `null` — ничего не меняется; фокус там, куда вернуло окно; Combobox сохраняет текст поиска.
- `reject` — `pending` снят, повторный клик работает.
- `disabled` поле — слоты не рисуются, список не открывается. `readOnly` — слоты не рисуются; `readOnly`
  передаётся в UIKit (zag учитывает его в `isInteractive`, `ZS/select.machine.mjs:102`).
- Поле размонтировалось при открытом окне — результат игнорируется (`mountedRef`), `handleChange` не вызывается.
- Опции поменялись, пока окно открыто (async), — правка ложится по `fromValue` при следующем рендере; опции
  нет — запись инертна (§6).
- **apply для create** — как сейчас (`addCreatedOption` + `applyValue`), плюс `data`.
- **Окно приложения** — по образцу `useQuickCreate` потребителя `onCreate` (Promise + resolver, повторный вызов
  отвечает `null` старому обещанию). Урок оттуда в доку: без вложенного `<form>` в окне — React-событие `submit`
  всплывает из портала по дереву компонентов до внешней формы и отправляет её. Уточнение (§16.6): это про
  **сырой** `<form>`. Форма приложения на `@letar/forms` в окне безопасна — корень формы сам гасит всплытие
  (`e.preventDefault(); e.stopPropagation()`, `form-root/form-simple.tsx:221–223`, `form-with-api.tsx:239–241`).

### 6. Наложение правок и слияние с опциями приложения

**Конвейер опций в `useFieldState`:**

```
appOptions = componentProps.options ?? resolved.options ?? []   // Combobox: static options или из queryData
active     = pruneOptionOverlay(appOptions, overlay)            // нечего убирать → тот же массив
if (active !== overlay) setOverlay(active)                      // фиксировать в state, чтобы запись не «воскресла»
merged     = mergeCreatedOptions(appOptions, createdOptions)    // правило onCreate: приложение сильнее
withEdits  = applyOptionOverlay(merged, active)
final      = withEdits + служебный пункт создания (если onCreate и createItem !== false)
```

`setState` во время рендера того же компонента — разрешённый паттерн «подстройка state при смене пропсов»;
цикл конечен, потому что `pruneOptionOverlay` возвращает тот же массив, когда убирать нечего. Если линтер
`react-hooks` возразит — `useEffect` с тем же сравнением ссылок. Главное — фиксировать в state, а не только
выводить.

**Правило «правка побеждает до перезапроса, потом уступает»** формализовано по тексту опции приложения, а не по
ссылке на массив `options`: приложения пишут `options={data.map(...)}` прямо в рендере, ссылка новая каждый раз,
и сброс по ссылке съел бы правку сразу, до ответа сервера.

**`pruneOptionOverlay`** — запись устаревает только по положительному сигналу от приложения:

| Случай       | Запись устарела, когда                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| value тот же | в `appOptions` есть `fromValue`, и его текст ≠ `baselineText` (пришла свежая подпись) |
| value другой | в `appOptions` появился новый value (приложение знает о новой записи)                 |

Отсутствие `fromValue` в `appOptions` сигналом **не** считается: во время async-загрузки `options = []`, и сброс
по отсутствию вернул бы после загрузки старую подпись из кеша запроса.

**`applyOptionOverlay`:**

- value тот же — у опции `fromValue` заменить `label`, `textValue = label` и `data` (если `hasData`); `group`,
  `disabled`, `editable` остаются от приложения;
- value другой — опцию `fromValue` заменить на месте новой `{ label, value, data }`; если `fromValue` в списке нет —
  дописать в конец, как созданную, чтобы выбранное новое значение имело подпись.

**Крайние случаи.**

- Сервер вернул прежнюю подпись (правка не сохранилась или менялись только данные) — запись живёт до
  размонтирования поля. Лечится корректным `onUpdate`: возвращать то, что реально сохранено. Явный сигнал
  перезапроса — открытый вопрос №5.
- Приложение удалило опцию — запись инертна; выбранное значение висит без подписи, как у любого Select со
  значением вне `options`.
- Опции из schema meta (`resolved.options`, enum) не меняются — наложение живёт до размонтирования.
- Правка опции, созданной через `onCreate`, до перезапроса — правится запись в `createdOptions`, наложение не
  заводится; после перезапроса побеждает опция приложения (правило `onCreate`).
- Две правки одной опции подряд — `upsert` по `fromValue`, `baselineText` остаётся от первой.
- Правка с заменой value, затем правка уже новой опции — вторая запись по новому `fromValue`; первая уйдёт, когда
  приложение отдаст новый value.
- Ключи сравниваются как `String(value)` — как в `mergeCreatedOptions` (`creatable-options.ts:35–42`).

### 7. Клавиатура и a11y

**Что делает zag (Chakra).**

- Открытый Select: фокус на Content (`tabIndex: 0`, `ZS/select.connect.mjs:381`), пункты фокус не получают —
  подсветка через `aria-activedescendant` (`:378`). При открытии фокус получает первый tabbable внутри Content,
  иначе сам Content (`ZQ/initial-focus.mjs:6–16`); элемент с `tabIndex=-1` не tabbable
  (`ZQ/tabbable.mjs:134–138`). **Поэтому карандаш пункта обязан быть `tabIndex=-1`:** иначе при каждом открытии
  фокус прыгнет на первый карандаш, а Enter на нём Content превратит в выбор пункта.
- Content обрабатывает стрелки, Home/End, Enter/Space и typeahead по одному печатному символу без Ctrl/Meta
  (`ZS/select.connect.mjs:392–429`, `ZQ/typeahead.mjs:33–35`). Trigger — то же плюс стрелки влево/вправо
  (`:182–228`). **F2 не обрабатывает никто.**
- Обработчики, переданные в Ark-часть, вызываются раньше обработчиков zag: `callAll(props[key], result[key])`
  (`ZM:31–34`).
- Пункт Select выбирается по `onClick`, и выбор пропускается при `event.defaultPrevented`
  (`ZS/select.connect.mjs:261–265`). У Combobox такой проверки нет (`ZC/combobox.connect.mjs:383–389`) → карандаш
  универсально делает `stopPropagation` на `click`. Radix выбирает мышью по `pointerup`, остальными — по `click`
  (`RX:868–873`) → там карандаш гасит ещё `pointerup`/`pointerdown`.
- Content Combobox гасит `pointerdown` (`ZC/combobox.connect.mjs:317–320`) — при клике по карандашу фокус
  остаётся в инпуте.

**Горячая клавиша — рекомендую F2** (общепринятое «изменить/переименовать»: Проводник, Excel, VS Code):

- Select, список открыт: F2 на Content → `onEditHotkey(highlightedValue)` (из `useSelectContext()`); список
  закрыт: F2 на триггере → выбранное значение.
- Combobox: F2 в инпуте (его keymap F2 не трогает, `ZC/combobox.connect.mjs:190–245`) → подсвеченный пункт, если
  список открыт, иначе выбранное значение.
- Radix: F2 в `onKeyDown` пункта (фокус на самом пункте; свой обработчик вызывается до радиксового через
  `composeEventHandlers`, а радиксовый игнорирует keydown не от себя — `RX:890–893`); закрыт — на триггере.
- Нередактируемый пункт или нет подсветки — ничего не делаем, событие не гасим.
- **Отвергнуто:** Ctrl/Shift+Enter в Select — Content обрабатывает Enter без учёта модификаторов и не смотрит
  `defaultPrevented` (`ZS/select.connect.mjs:382–419`), пункт выбрался бы вместе с правкой. Буквы съест typeahead.
- macOS-ноутбуки: F2 = Fn+F2 — записать в доке.

**ARIA.**

- Карандаш в пункте: `aria-hidden="true"` + `tabIndex=-1`. У `role=option` дети презентационные (ARIA), вложенную
  кнопку скринридер всё равно не увидит, а `aria-hidden` сохраняет доступное имя пункта равным подписи —
  `getByRole('option', { name: 'Кровля' })` в тестах и e2e продолжает работать при включённом `onUpdate`. Правило
  axe `aria-hidden-focus` для `tabIndex=-1` должно проходить (не проверено — прогнать axe в e2e).
- Доступный путь для клавиатуры и скринридера: (1) карандаш у выбранного значения — обычная кнопка в Tab-порядке
  после триггера, `aria-label` «Изменить «<текст>»»; (2) F2 — `aria-keyshortcuts="F2"` на триггере и Content,
  визуально скрытая подсказка через `aria-describedby` Content (`editHotkeyHint`, i18n
  `formSelection.editHotkeyHint`).
- Новые i18n-ключи в `selection-field-strings.ts` (ru/en): `formSelection.editOption` («Изменить»),
  `formSelection.editOptionAria` («Изменить «{label}»»), `formSelection.editHotkeyHint` («F2 — изменить пункт»).
- **Видимость карандаша в пункте** (✅ решено владельцем 2026-09-26, уточнение к вопросу 8): на устройствах с
  наведением карандаш появляется только у подсвеченного пункта; на тач-устройствах виден всегда, приглушённый.
  - **Подсветка = наведение мыши + клавиатура.** zag подсвечивает пункт по `pointermove` мыши и снимает подсветку
    по `pointerleave` (Select: `ZS/select.connect.mjs:255–260, 266–272`, `ZS/select.machine.mjs:397–399`;
    Combobox: `ZC/combobox.connect.mjs:371–381`); стрелки ставят тот же `data-highlighted`
    (`ZS/select.connect.mjs:252`). Radix при наведении переводит DOM-фокус на пункт (`RX:877–883`), а
    `data-highlighted` ставит на пункт в фокусе (`RX:858`). Поэтому условие одно — `[data-highlighted]` у пункта,
    `:hover` не нужен. Наведение на сам карандаш подсветку не снимает: `pointermove` всплывает к пункту.
  - **Стиль (Chakra), на самом карандаше через `css`:** по умолчанию `opacity` приглушённая (тач);
    `'@media (hover: hover) and (pointer: fine)': { opacity: 0, visibility: 'hidden' }`;
    `'[data-part=item][data-highlighted] &': { opacity: 1, visibility: 'visible' }`. Готовые условия не подходят:
    `_hover` действительно уже под `@media (hover: hover)` (Chakra `preset-base.js:67–70`), но он про наведение на
    сам элемент. А `_groupHover` медиа-условием **не** обёрнут (`preset-base.js:114`) и залипал бы на таче.
    Свою обёртку вокруг `_hover` не делаем (`.claude/docs/chakra-hover-condition-already-media-gated.md`).
  - **Скрываем через `opacity` + `visibility`, не `display: none`:** место под карандаш всегда занято, текст
    пункта не прыгает при наведении, цель для мыши стабильна. `visibility: hidden` ещё и не пропускает клик по
    невидимому карандашу (у `opacity: 0` клик прошёл бы). Скрытый карандаш вне Tab-порядка (`tabIndex=-1`) и
    `aria-hidden` — как и видимый; путь с клавиатуры — F2.
  - **Гибридные устройства** (ноутбук с сенсорным экраном: основной указатель — мышь): касание пункт не
    подсвечивает (zag подсвечивает только при `pointerType === 'mouse'`, `ZS/select.connect.mjs:256`), поэтому
    карандаш при касании не появится; остаются мышь и F2. Принимаем.
  - **shadcn:** Select — то же правило по `data-highlighted` (Radix). Combobox shadcn подсветки не имеет (§10) —
    там `group-hover` Tailwind; обёрнут ли он в `@media (hover: hover)` в установленной версии Tailwind — **не
    проверено**, при реализации сверить, иначе обернуть вручную.
  - **Карандаш у выбранного значения** (рядом с триггером) виден всегда: он один на поле, шума нет, а скрытый
    по наведению был бы недоступен на таче и хуже находился бы с клавиатуры (он в Tab-порядке). Причин делать
    иначе не вижу.
- **Тач:** наведения нет — карандаш в пункте виден всегда (приглушённый, ярче на `[data-highlighted]`).
- **Цель 44px:** на `@media (pointer: coarse)` пункт `minH="11"`, карандаш 44×44; на мыши — `IconButton` `xs` с
  расширенной зоной нажатия (`_before` с отрицательным `inset`).
- **Фокус-ловушки:** Chakra Content — не ловушка, но Tab без tabbable внутри гасится
  (`ZS/select.connect.mjs:385–390` + `ZQ/initial-focus.mjs:17–25`). Radix Select — модальный, Tab гасится
  (`RX:500`). У окна приложения своя ловушка; возврат фокуса — §5.

### 8. Layout-ловушки

- **Карандаш у значения — в `Select.IndicatorGroup`, не в `Trigger`:** триггер — `<button>`
  (`ZS/select.connect.mjs:150–160`), вложенная кнопка — невалидный HTML. Порядок: `[ClearTrigger][EditButton][Indicator]`.
- `IndicatorGroup` — `position: absolute`, `pointerEvents: none` (`CR/select.js:37–47`); `ClearTrigger` сам
  включает `pointerEvents: auto` (`:122–128`) → карандашу то же `pointerEvents="auto"` и
  `focusVisibleRing="inside"`, как у `ClearTrigger`.
- Клик по карандашу у значения при открытом списке — это interact-outside: исключены только trigger и
  clearTrigger (`ZS/select.machine.mjs:444`). Список закроется сам с `restoreFocus = false` для фокусируемой цели
  (`:449`) — фокус остаётся на карандаше, это и нужно.
- **Триггер не резервирует место под иконки:** у `ValueText` только `maxW: 80%` и `lineClamp: 1`
  (`CR/select.js:118–121`). Третья иконка на узком поле наедет на текст → при `controlActions` триггеру
  `pe` на ширину группы. Проверка в e2e геометрией: правый край `ValueText` ≤ левого края `IndicatorGroup`.
- **Combobox:** отступ инпута считается селекторами `:has([data-part=trigger])`/`clear-trigger` через
  `--padding-factor` (`CR/combobox.js:20–33`) и о карандаше не знает → своё правило
  `&:has([data-letar-slot=edit-value])` увеличивает `--padding-factor` на один индикатор.
- **Пункт:** recipe `item` — flex, `justifyContent: space-between` (`CR/select.js:74–96`); `ItemIndicator` у
  невыбранных скрыт атрибутом `hidden` (`ZS/select.connect.mjs:290`). Карандаш между текстом и индикатором прыгал
  бы у выбранной строки → порядок `[ItemText flex=1 minW=0][ItemIndicator][карандаш flexShrink=0]`: карандаш
  всегда у правого края.
- **disabled-пункт:** `pointerEvents: none` (`CR/select.js:88–91`) — карандаш недостижим мышью, поэтому
  `isOptionEditable` исключает `disabled`.
- **Длинные подписи:** `ItemText` переносится (`minW=0`), карандаш не сжимается.
- **`renderValue` и обрезка:** `lineClamp: 1` (`display: -webkit-box`) обрезает только инлайн-содержимое;
  flex/блочный корень из `renderValue` клампом не режется. При `renderValue` скин ставит `ValueText`
  `display="flex" minW="0" overflow="hidden"`, текстовую часть приложение обрезает само (`truncate`). Только
  фразовое содержимое, без кнопок и ссылок.
- **Portal:** список в `Portal` (`uikit-chakra.tsx:211`) — стили, завязанные на DOM-предка поля, в `renderOption`
  не действуют; React-контекст через портал проходит.
- **Обрезка focus ring:** Content — `overflowY: auto` (`CR/select.js:54–72`). Карандашу пункта кольцо не нужно
  (`tabIndex=-1`); кнопкам в подвале — `focusVisibleRing="inside"` (аналог
  `.claude/docs/pressable-overflow-clips-focus-ring.md`).
- **Подвал `listFooter`:** Content скроллится сам → подвал `position: sticky; bottom: 0` на `bg.panel`.
- **Не рисовать два карандаша** для мобильного и десктопа через `display={{ base, md }}` — дубль в DOM
  (`.claude/docs/react-duplicate-responsive-dom.md`); один элемент с адаптивным размером.
- **Поле в flex-строке с одним `maxW`** схлопывается до стрелки (`.claude/docs/chakra-select-flex-item-maxw-collapse.md`),
  лишняя иконка это усилит — демо проверяет `w` + `maxW`.

### 9. Combobox

**Входит в обе итерации (Chakra).**

- **А:** `renderOption` (в `Combobox.ItemText`), `textValue`/`getTextValue`, `data` (в пути `useQuery` —
  `data: item` автоматически); нестроковый `label` в пунктах больше не сплющивается; инпут, фильтр `contains`,
  `shouldOfferCreate` и эффект начальной подписи работают по `getOptionText`.
- **`renderValue` нет:** значение Combobox — текст инпута, свой вид выбранного значения внутри поля ввода
  противоречит вводу.
- **Б:** `onUpdate`, карандаш в пунктах и у значения (`IndicatorGroup`: `[Spinner][Clear][Edit][Trigger]`), F2 в
  инпуте, `CreateButton` (`onCreate(search.trim())`), `listFooter`, `renderEmpty(search)` → `emptyContent`,
  `createItem`.

**Особенности.**

- **async:** наложение применяется к опциям из `queryData`; прюнинг — по тексту, отсутствие опции на текущей
  странице выдачи не сигнал (§6). Фильтрация по тексту — после наложения.
- **Выбранное значение вне текущей выдачи** (`initialLabel`): у карандаша значения нет полной опции →
  `onUpdate` получит `{ value, label: текущий текст инпута }` без `data`. Смягчение: поле кеширует последнюю
  выбранную опцию из `onValueChange` (`details.items[0]`) — после выбора в этой сессии `data` будет. Открытый
  вопрос №7.
- **`initialSearchValue`:** карандаш у значения — только при непустом value, а не по тексту инпута.
- После `onUpdate` выбранной опции — `setInputValue(label)`, как у `onCreate` (`field-combobox.tsx:407–412`).
- Закрытие: `useComboboxContext()` → `api.setOpen(false)` (`ZC/combobox.connect.mjs:96–100`); `CLOSE` текст не
  откатывает (`ZC/combobox.machine.mjs:455–462`: только `invokeOnClose` и `setFinalFocus`); `api.focus()` → инпут
  (`ZC/combobox.connect.mjs:93–95`).

#### 9.1. Пустой результат при `onCreate`: «Ничего не найдено» + создание (этап Б)

**Сейчас.** Совпадений нет → в коллекции остаётся один служебный пункт «+ Добавить "<текст>"»
(`field-combobox.tsx:341–349`). Сообщение о пустом результате рисуется только при `options.length === 0`
(`field-combobox.tsx:451–455`), а сам `Combobox.Empty` Ark возвращает `null`, если коллекция не пуста
(`ARK/combobox/combobox-empty.js:10`). Итог: пользователь не видит, что поиск ничего не нашёл, — только
предложение создать.

**Решение.** Признак пустоты — число **настоящих** совпадений (`baseOptions` без служебного пункта), а не размер
коллекции:

```
matches = 0, поиск ≥ minChars, не идёт загрузка:
  [сообщение: renderEmpty?.(search) ?? emptyMessage ?? «Ничего не найдено»]   ← не пункт коллекции
  [+ Добавить "<текст>"]                                                       ← служебный пункт, как сейчас
matches > 0: как сейчас (пункт создания в конце, если нет точного совпадения)
```

- Сообщение рисуется **своим** элементом, не `Combobox.Empty` (он погашен непустой коллекцией): `<Box>` со стилями
  слота `empty` рецепта (`css={useComboboxStyles().empty}` — хук экспортирован, Chakra
  `components/combobox/combobox.js:12, 78`; слот `empty` — `CR/combobox.js:138`), атрибуты
  `data-scope="combobox" data-part="empty"` и `role="presentation"`, как у Ark (`combobox-empty.js:11–12`). Строка —
  `formSelection.combobox.emptyMessage` (уже есть, `field-combobox.tsx:362`).
- Создание остаётся **пунктом коллекции**: стрелка вниз + Enter создают запись, как сейчас. Это единственный
  клавиатурный путь в Combobox — кнопка в подвале с клавиатуры недостижима (§4.5), поэтому переносить создание
  в `CreateButton` по умолчанию нельзя. При пустом результате пункт создания подсвечивается первым — Enter сразу
  создаёт.
- `createItem={false}` + `renderEmpty={(s) => <>Нет «{s}» <Form.Field.Combobox.CreateButton /></>}` — полная
  замена рендера пустого состояния, если приложению нужен именно вид «сообщение + кнопка».
- **Совместимость с уже задеплоенным потребителем `onCreate` (domwellbes).** Он передаёт свои `emptyMessage` на
  каждый справочник через обёртку над `FieldCombobox`. Меняется только одно: над пунктом создания появляется его
  же сообщение. Значение, подпись и роль служебного пункта прежние — e2e-селекторы по
  `getByRole('option', { name: '+ Добавить …' })` не ломаются, `onCreate(search)` вызывается так же. Сообщение,
  которое отсылает в раздел справочника («… Справочник — «Материалы → Производители»»), рядом с «+ Добавить»
  читается двусмысленно — сказать потребителю в заметке к релизу, править ли текст, решает он.
- Ровно то же правило действует у Select в режиме поиска (§15.4) — одна функция в `forms-core`
  (`resolveEmptyState(matches, search, hasCreate)`), два скина.

### 10. shadcn-скин

**Паритет:** те же пропсы и слоты, те же headless-хуки из `forms-react`; визуал — `Pencil` из `lucide-react`.

**Отличия Radix от zag** (`RX`):

- Фокус — настоящий DOM-фокус на пунктах (`tabIndex: -1`, фокус по `pointermove`, `:860–884`), не
  `aria-activedescendant` → «подсвеченный» пункт = `document.activeElement`; F2 — в `onKeyDown` пункта.
- Выбор мышью — `pointerup`, иначе `click` (`:868–873`) → карандаш гасит `pointerdown`/`pointerup`/`click`.
- Подпись триггера копируется порталом из `ItemText` выбранного пункта, только если у `Value` нет `children`
  (`:943`) → всегда передаём `children` у `Value` = `renderValue(sel) ?? getOptionText(sel)`. Тогда `ItemText` не
  портируется, и ни `renderOption`, ни карандаш в триггер не утекут. Typeahead — по `textValue` пункта
  (`:815–821, :1178`) → передавать `textValue`.
- Content модальный (FocusScope, скрытие остального от AT, блок внешних pointer-событий) → окно приложения при
  открытом списке недоступно; «сначала закрыть» обязательно. Закрытие — контролируемый `open` внутри примитива
  плюс ref триггера для `focusTrigger`.
- Карандаш у значения — сосед `Trigger` в обёртке `relative` (Radix `Root` своего DOM не рендерит).

**Не достичь / долг.**

- Существующая кнопка очистки — `span role="button"` **внутри** `Trigger` (`primitives/select.tsx`): невалидная
  вложенность, в этой задаче не чиним — записать долгом.
- Группы в shadcn Select не поддержаны (`getGroup` нет) — не расширяем.
- shadcn Combobox — Popover + `div role="option"` без клавиатурной навигации и подсветки → F2 нет; только
  карандаш мышью/тапом, карандаш у значения и `CreateButton` в подвале/пустом состоянии. Клавиатура Combobox —
  к уже записанному долгу shadcn Combobox (async-поиск).

### 11. Пространство имён и `extraSelects`

- `Form.Select.*` — `extraSelects` + `lazySelects` приложения (`create-form.tsx:368–371`), `Form.Combobox.*` —
  аналогично; `Form.Field.*` — поля библиотеки плюс `extraFields` поверх (`create-form.tsx:357–360`). Слоты — это
  статические члены компонента `Form.Field.Select`/`Form.Field.Combobox`, а не ключи `Form.Select`: ключ
  приложения `EditButton` в `extraSelects` их не перекрывает.
- Статики переживают `{ ...Form.Field, ...extraFields }`: копируется ссылка на функцию, свойства остаются на ней.
  Единственная коллизия — `extraFields: { Select: … }` заменяет поле целиком вместе со статиками;
  задокументировать (предупреждения в `createForm` сейчас нет).
- `lazySelects`: `createLazyComponent` оборачивает компонент приложения (`lazy-component.tsx:43–54`) — статики на
  ленивой обёртке не нужны: слот берётся из синхронного `Form.Field.Select` и находит поле через контекст,
  поэтому работает и в `renderOption` обёртки. `AppForm.Select.Status.EditButton` не существует и не нужен.
  Обёртки на `FieldCombobox` напрямую (async-фабрики приложений) получают `FieldCombobox.EditButton` так же.
- **Обёртки обязаны пробрасывать** `renderOption`/`renderValue`/`onUpdate`/`createItem`/`listFooter`/`renderEmpty` —
  тот же урок, что с `onCreate` (`docs/fields.md`, «Своя обёртка над Select/Combobox…»). Абзац дополнить.
- **SSR/RSC:** слоты — клиентские компоненты модуля `'use client'`; `renderOption` — функция, из Server Component
  не передаётся; `Form.Field.Select.EditButton` в серверном файле — «точка в клиентский модуль»
  (`.claude/docs/nextjs-compound-component-server-boundary.md`), то же ограничение, что у всего `Form.Field.*`.

### 12. План тестов

**Среда.** vitest + jsdom, как в `field-select-oncreate.spec.tsx`: заглушки `ResizeObserver`,
`scrollTo`/`scrollIntoView`; клики — `userEvent` (настоящие pointer-события: zag игнорирует программные, см.
заметку про NumberInput/Checkbox); F2 — `userEvent.keyboard('{F2}')`. Действия zag в `raf` (фокус на триггер)
ждать через `waitFor`. Radix (shadcn) — заглушки `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/
`scrollIntoView` и открытие через `pointerDown`, как в `forms-shadcn/.../field-select-oncreate.spec.tsx`.

**Этап А.**

1. `renderOption` рисует свой узел в пункте; `state.selected` верный; доступное имя пункта — из содержимого.
2. Typeahead на закрытом триггере и на открытом списке идёт по `textValue`.
3. `renderValue` — в триггере у выбранной; без значения — placeholder; `renderValue` вернул `null` — строка.
4. `ReactNode`-label без `renderValue`: триггер показывает `textValue`; без `textValue` — `String(value)` и
   одно dev-предупреждение.
5. Изменение поведения: пункт с `ReactNode`-label рисует узел, а не `String(value)`.
6. Типы: compile-only `*.spec.tsx`, который проходит `typecheck:tsgo` (`tsconfig.spec.json`): `TData` выводится из
   `options`, `// @ts-expect-error` на несуществующем поле `option.data`; литеральный union value не выводится.
7. Регрессия: `getGroup` + `renderOption`; служебный пункт `onCreate` в `renderOption` не попадает (spy);
   `value: ''` выбирается и показывается (`hasEmptyOption`, `uikit-chakra.tsx:167–171`); `valueType: 'number'`.
8. Combobox: `renderOption`, `getTextValue`, `data: item` из `useQuery`, фильтр по тексту, `initialLabel`.

**Этап Б.**

9. Карандаш есть в каждой опции при `onUpdate`; нет без `onUpdate`, при `editable: false`, `disabled`, value `''`.
   Видимость (jsdom наведение и медиа-запросы не эмулирует — проверяем состояние, не пиксели): у карандаша стоит
   маркер слота (`data-letar-slot="edit-option"`), `tabIndex=-1`, `aria-hidden`; после ArrowDown у подсвеченного
   пункта `data-highlighted`, у остальных нет; в DOM карандаш есть у всех редактируемых пунктов (скрытие — только
   стилем, не условным рендером). Карандаш у значения рендерится всегда, когда разрешён.
10. Клик по карандашу пункта: `onUpdate` получил публичную опцию с `data`; значение поля не изменилось; список
    закрыт до резолва; `document.activeElement` — триггер в момент вызова `onUpdate`.
11. Резолв `{ label: 'Новое', value: тот же }` у выбранной: подпись в списке и триггере обновилась; `isDirty` формы
    `false`.
12. Резолв с другим value у выбранной: значение поля — новое, старая опция заменена на месте.
13. `null` — ничего; `reject` — ловится как unhandled rejection (`window` `unhandledrejection`), `pending` снят,
    второй клик работает.
14. `pending`: второй клик по карандашу, клик по встроенному «+ Добавить…» и `CreateButton` игнорируются, кнопки
    `disabled`.
15. Наложение: перерендер с той же подписью — правка держится; с новой подписью от приложения — побеждает
    приложение; `options = []` (загрузка), затем прежняя подпись — правка держится; после прюнинга возврат к
    `baselineText` — запись не воскресает.
16. Созданная через `onCreate` → правка до перезапроса → подпись обновлена; приложение отдало value — побеждает
    приложение.
17. Карандаш у значения: виден при выбранной редактируемой опции; скрыт без значения, при `disabled`/`readOnly`;
    `trigger.contains(pencil) === false`; клик → `onUpdate` с выбранной опцией, список не открывается, фокус
    остаётся на карандаше.
18. F2: открыть, ArrowDown, F2 → `onUpdate` с подсвеченной; F2 на закрытом триггере → выбранная; F2 на
    нередактируемой — ничего; typeahead не сломан.
19. Свой `renderOption` без `EditButton` → карандашей в пунктах нет, у значения есть; с `EditButton` внутри —
    работает.
20. `EditButton` вне поля и внутри `renderValue` → `null` + предупреждение; в триггере нет вложенных `button`.
21. `CreateButton` в `listFooter`: Select → `onCreate('')`; Combobox с текстом → `onCreate(текст)`;
    `createItem={false}` убирает встроенный пункт; Enter на `CreateButton` не выбирает подсвеченный пункт.
22. При открытии списка с карандашами фокус на Content (`role=listbox`), а не на карандаше.
23. Доступное имя пункта не меняется от карандаша: `getByRole('option', { name: 'Кровля' })` при `onUpdate`.
24. Размонтирование при открытом окне → после резолва нет `handleChange` и ошибок.
25. shadcn: пункты 9, 10, 12, 17, 20, 21 плюс «pointerup по карандашу не выбирает пункт».
26. Регрессия `onCreate` целиком (`field-select-oncreate.spec.tsx`, `field-combobox-oncreate.spec.tsx` в обоих
    скинах) после перевода на общий `runCreate`.
27. Combobox, пустой результат при `onCreate` (§9.1): видны и сообщение (`emptyMessage` потребителя и
    дефолт), и `option` «+ Добавить "…"» с прежним именем; ArrowDown/Enter создают; при совпадениях сообщения нет;
    `renderEmpty` заменяет сообщение; без `onCreate` — прежний `Combobox.Empty`.

**Этап В (поиск в Select, §15).**

28. Порог: 9 опций — поля поиска нет, 10 — есть; `searchable={false}` при 50 — нет; `true` при 3 — есть;
    `{ threshold: 20 }`; служебный пункт создания в счёт не входит.
29. Смена числа опций в рантайме 9→10 и 10→9 (перерендер с новым `options`): значение и фокус не теряются,
    Root не перемонтируется (тот же DOM-узел триггера); при открытом списке с непустым поиском поле поиска не
    пропадает (§15.3).
30. Фильтр: без учёта регистра и диакритики (`contains`), по `getOptionText` (строка/`textValue`/подпись правки);
    свой `filter`; группы — пустые группы исчезают, заголовки групп в поиске не участвуют.
31. Выбранное значение, отфильтрованное из списка, остаётся в триггере; `value: ''` с опцией «Все» не
    сбрасывается, пока её не видно (`hasEmptyOption` по полному списку).
32. Клавиатура в поле поиска: печать, пробел, Home/End редактируют текст и ничего не выбирают; ArrowDown/Up
    двигают подсветку; первая подходящая подсвечена сразу после ввода; Enter выбирает её; Escape закрывает;
    Enter во время IME-композиции не выбирает.
33. Фокус: при открытии — поле поиска (мышь, клавиатура); на `pointer: coarse` — нет (клавиатура телефона не
    выскакивает); после выбора — триггер; при закрытии поиск сброшен.
34. Пусто: сообщение + пункт «+ Добавить "<поиск>"» → `onCreate(search)`; без поиска — «+ Добавить…» →
    `onCreate('')`; `renderEmpty`; `createItem={false}` + `CreateButton` в пустом состоянии.
35. Слоты не ломаются: `renderOption`, `renderValue` в триггере, карандаши и F2 из поля поиска (F2 → подсвеченная).
36. ARIA: поле поиска — `role=combobox`, `aria-controls` на List, `aria-activedescendant` = id подсвеченного
    пункта; Content — `role=dialog` с именем; `getByRole('option', { name })` работает.
37. Регрессия существующих Select (все спеки Select без изменений при ≤ 9 опциях), `getGroup`, `valueType: 'number'`,
    `onCreate`, `Form.UrlSync` с Select.

**ZenStack + Query (§16).** Unit — без TanStack Query: «рефетч» = перерендер с новыми `options` до или после резолва
промиса `onUpdate`/`onCreate`. Z1–Z5 — этап Б (шаг 3), Z6 — этап В, Z7–Z8 — этап Б (шаги 4 и 7).

- Z1–Z6 — как в §16.2 (новая подпись до резолва; старая подпись; нормализованный текст после резолва;
  copy-on-write; `onCreate` без дубля; `loading` у Select при `options = []` и непустом значении — текст загрузки
  в триггере вместо placeholder, спиннер, затем подпись).
- Z7 — Combobox `useSelected`: значения нет в выдаче → подпись из `useSelected().data`; `initialLabel` побеждает;
  при пустом value хук вызывается с `''` (приложение гасит `enabled`); карандаш у значения передаёт в `onUpdate`
  опцию с `data` из `useSelected`; правка → новый `data` от хука → подпись обновилась.
- Z8 — `RelationFieldProvider`: `data` — исходная запись в опциях; `RelationConfig.fieldProps` (`onUpdate`,
  `renderOption`) доходят до `SchemaFieldWithRelations`; relation + `fieldType: "combobox"` получает опции провайдера;
  `relation` не попадает в пропсы поля.

**Этап Г — источники данных (§16.8, §16.9).** L — ядро, промис-путь; unit с фейковыми промисами и таймерами vitest.

- L1 — дебаунс и `minChars`: быстрый ввод → один вызов `loadOptions` с последней строкой; ниже порога вызова нет;
  `minChars: 0` → вызов с `''` при открытии.
- L2 — отмена: новый ввод → `signal` прошлого запроса `aborted`; размонтирование → текущий `aborted`; `AbortError` не
  попадает в `error` и `onLoadError`.
- L3 — гонка: ответ старого запроса приходит позже нового и `signal` игнорирует → на экране результат нового.
- L4 — загрузка: прошлые результаты видны со спиннером, пока идёт новый запрос; первая загрузка — `loadingMessage`.
- L5 — ошибка: `errorMessage` + «Повторить» (доступна с клавиатуры, `getByRole('button')`); повтор зовёт загрузчик с
  той же строкой; прошлые результаты скрыты; `onLoadError` вызван один раз.
- L6 — после подтверждённого `onCreate`/`onUpdate` текущий поиск перезапрошен, новая подпись видна.
- L7 — `loadSelected`: значения нет в выдаче → подпись из `loadSelected`; повторное открытие не зовёт его снова;
  после `onUpdate` этой записи — зовёт; `initialLabel` побеждает.
- L8 — `useOptionsLoader`: смена `deps` отменяет прошлую загрузку; `reload`; `fieldProps` распыляются в Select
  (Chakra и shadcn) без лишних пропсов.
- L9 — типы (compile-only): `options` + `useQuery`, `options` + `loadOptions`, `useQuery` + `loadSelected` —
  `@ts-expect-error`; `loadOptions` без `getLabel` — ошибка; `TData` выводится из промиса; `Partial<…>` в
  `RelationConfig.fieldProps` компилируется. Dev-предупреждение при двух источниках через `any`.

Q — пакет `@letar/forms-query` (свои spec в `libs/forms-query`, настоящий `QueryClient` в тестах):

- Q1 — `fromSearchQuery`: хук получает `enabled: false` ниже `minChars` и `placeholderData`; при смене поиска прошлые
  данные не пропадают.
- Q2 — `useQueryOptions`: маппинг, `data: row`, `loading`; `isPending` → `pending: true`.
- Q3 — `useLoaderQuery`: повтор той же строки берётся из кэша (загрузчик вызван один раз); `invalidateQueries` по ключу
  → перезапрос; `signal` доходит до загрузчика.
- Q4 — `useInvalidateAfter`: обёрнутый `onCreate` резолвится **после** рефетча активного запроса по ключу.
- Q5 — `/zenstack`: `useZenStackOptions` помечает `$optimistic`; `useInvalidateModels(['WorkCategory'])`
  перезапрашивает запросы с ключом `getQueryKey('WorkCategory', …)` и не трогает другие модели.
- Q6 — совместимость (compile-only): `fieldProps`, `fromSearchQuery(...)`, `fromSelectedQuery(...)` принимаются
  `FieldSelect`/`FieldCombobox` из `@letar/forms` и из `@letar/forms-shadcn`.
- Q7 — «лишнего не тянет»: собранный `dist/index.js` пакета без `@zenstackhq/tanstack-query`; собранный
  `libs/forms/dist/index.js` без `@tanstack/react-query`.

**Этап Д — оптимистичный режим (§16.7).** O — unit в `libs/forms` (оба скина, где есть UI) и `forms-core` (реестр).

- O1 — create с `optimistic`: сразу после вызова — новая опция выбрана в триггере, приглушена, спиннер, `aria-busy`;
  значение **формы** прежнее (`form.getFieldValue`); после резолва — настоящий value в форме, одно изменение
  (`onFieldChange` вызван один раз).
- O2 — edit с `optimistic`: подпись сразу новая; резолв с другим value → замена на месте и переключение выбора
  (вопрос 4); резолв с тем же — без изменения значения формы.
- O3 — отказ: `null`, reject, таймаут (фейковые таймеры, `settleTimeout`) → откат опции и наложения, `onSettleError` с
  нужным `reason`; без `onSettleError` — встроенное сообщение, исчезает при следующем действии; reject после
  `optimistic` не становится необработанным.
- O4 — пока create ждёт, пользователь выбрал другое → в форме выбор пользователя; подтверждение не перебивает его;
  опция в списке есть, не выбрана.
- O5 — внешний `reset`/`setFieldValue` во время ожидания снимает ожидающий выбор.
- O6 — два create подряд: второй разрешён после `optimistic` первого; выбран второй; реестр ждёт оба.
- O7 — у опции в ожидании нет карандаша, F2 игнорируется; правка другой опции работает.
- O8 — отправка: Enter и клик по `Form.Button.Submit` во время ожидания → кнопка `loading`, `onSubmit` вызывается
  после подтверждения с **настоящим** value; отказ → `onSubmit` не вызван, фокус на поле; двойной клик — одна
  отправка; реестр пуст → `handleSubmit` в том же тике (регрессия существующих спеков корня формы без изменений).
- O9 — размонтирование поля во время ожидания → отправка не висит; размонтирование формы → ни ошибок, ни
  `handleChange`.
- O10 — черновик: `useFormPersistence` за время ожидания не сохраняет временный id (снимок значений без него);
  `UrlSync` не пишет его в URL; `DirtyGuard` считает форму изменённой, пока реестр не пуст.
- O11 — `pending`-опции приложения: не выбираются мышью, клавиатурой, typeahead и поиском Select; без карандаша;
  выбранная `pending` остаётся выбранной; скрыты, пока свой create поля в полёте.
- O12 — `optimistic` дважды → последний, dev-предупреждение; после резолва — игнор; обработчик без `optimistic` —
  регрессия этапа Б без изменений.
- O13 — реестр (`forms-core`): `settleAll` на пустом — `true` сразу; отказ одного → `false`; снятая запись не держит.

**Этап Е — автопривязка справочников (§17).** E — unit в `libs/forms` и `forms-core`, P — в
`libs/zenstack-form-plugin`, M — в `libs/form-mcp`.

- E1 — `parseFieldRegistryType` (`forms-core`): `'Select.WorkCategory'` → `{ namespace: 'Select', key: 'WorkCategory' }`;
  `'select'`, `'Select.'`, `'Foo.X'`, `'Select.workCategory'`, `'Select.A.B'` → `null`. Те же строки — в P1 (одно правило
  в двух местах).
- E2 — `Form.AutoFields` в форме инстанса: поле с `fieldType: 'Select.WorkCategory'` рендерит компонент из
  `extraSelects` с `name`/`label`/`placeholder`/`helperText`/`required` и `fieldProps` без `relation`; то же для
  `lazySelects` (после `Suspense`) и для `Combobox.`/`Listbox.`.
- E3 — `Form.Field.Auto` с ключом: тот же компонент, пропсы JSX перекрывают `fieldProps` (как сейчас в
  `field-auto.tsx:274`).
- E4 — ключа нет в реестре: dev → исключение, в тексте имя поля, ключ, список доступных ключей; production
  (`vi.stubEnv('NODE_ENV', 'production')`) → базовое поле по пространству (`combobox` для `Combobox.`), `console.error`
  один раз на два поля с одним ключом.
- E5 — `Form` без `createForm` + схема с ключом: dev → исключение с текстом про инстанс; production → базовое поле.
- E6 — ключ + `relation` на одном поле: рендерится компонент реестра, опции провайдера ему не передаются,
  dev-предупреждение.
- E7 — неизвестный встроенный `fieldType` (`'selct'`) → `FieldString` + dev-предупреждение; все известные типы — без
  предупреждений (регрессия).
- E8 — типы (compile-only): `AppForm.Select.Missing` — `@ts-expect-error`; `FormRegistryCheck` = `true` при полном
  реестре, ошибка при недостающем ключе и при инстансе с аннотацией `: ExtendedForm`; `createForm({})` и аннотация
  `: ExtendedForm` компилируются (обратная совместимость); `withUIMeta` с `fieldType: 'Select.X'` компилируется,
  `'Foo.X'` — `@ts-expect-error`.
- E9 — стабильность контекста: перерисовка корня формы не меняет ссылку значения `FormRegistryContext`.
- P1 — плагин: разбор ключей, снимок `form-registry-keys.ts` (дедуп, сортировка, пустые пространства — `[]`,
  `formRegistryUsages`), `index.ts` его экспортирует; без ключей — файл с пустыми списками.
- P2 — плагин: неверный ключ → ошибка generate с `Модель.поле`; `form.relation.model` на несуществующую модель и
  `labelField`/`descriptionField`, которых нет в модели, → предупреждение; ключ + `relation` → предупреждение.
- P3 — плагин: `form.props.*` + `form.relation.*` на одном поле → **один** ключ `fieldProps` с обоими (регрессия бага
  `model-generator.ts:923–928`); после `nx zenstack:generate form-develop-app` — `nx typecheck:tsgo form-develop-app`
  зелёный.
- P4 — плагин: ключ во фрагменте, импортированном в схему, попадает в `form-registry-keys.ts` (проверка допущения
  `mergeImports`, §17.1).
- M1 — `form-mcp`: `get_directives` содержит пример ключа и правило грамматики; описание `form.relation` совпадает с
  выходом плагина (`fieldProps.relation`, `fieldType` не ставится).

**e2e (`form-develop-app`, реальный браузер).** Демо «Адрес доставки»: карандаш пункта → окно → сохранить →
подпись обновилась, пункт не выбран; фокус после закрытия окна — на триггере (правка из пункта) и на карандаше
(правка значения); F2; геометрия триггера (§8) на узкой ширине и на мобильном вьюпорте; `pointer: coarse` — 44px;
axe на открытом списке (`aria-hidden-focus`). Ассерты скоупить на своё поле (`.claude/docs/e2e-testing.md`).
Видимость карандаша на настоящем наведении (Playwright, десктопный проект): до наведения карандаш пункта
`toBeHidden()` (visibility: hidden), `page.hover()` на пункт → `toBeVisible()`, увод мыши → снова скрыт; ArrowDown →
виден у подсвеченного; геометрия текста пункта до и после наведения совпадает (`boundingBox`) — раскладка не
прыгает. Мобильный проект (`hasTouch`, `isMobile`): карандаши видны без наведения. Карандаш у значения виден всегда.
Этап В: Select на 30 опций — поиск, выбор с клавиатуры, мобильный вьюпорт (нет автофокуса, поле поиска не
уезжает при скролле списка, шрифт поля ≥ 16px — иначе iOS зумит страницу), axe (`aria-dialog-name`,
`aria-required-children`).
ZenStack (§16.2, этап Б): демо на модели `Category` и настоящих `useFindMany`/`useCreate`/`useUpdate` — правка
карандашом → новая подпись в списке и триггере без перезагрузки, ровно один запрос `findMany` после `update`
(`page.waitForResponse`/счётчик запросов); создание из пустого поиска → запись выбрана, дубля нет. Этап В — там же
`loading`: медленный ответ (`page.route` с задержкой) → в триггере текст загрузки, затем подпись.
Этап Г: Combobox на server action (`loadOptions`) — ввод, отмена устаревших запросов (в сети лишние запросы
`cancelled` при `fetch`-варианте), ошибка через `page.route` → «Повторить» работает; демо на `@letar/forms-query` с
настоящими хуками ZenStack. Этап Д: оптимистичное создание на медленной мутации (`page.route` с задержкой) — окно
закрылось, новая категория выбрана сразу, нажатие «Сохранить» ждёт подтверждения и отправляет настоящий id (проверка
по телу запроса отправки); мутация с ошибкой (500) → выбор откатан, видно сообщение, форма не отправлена.
Этап Е: демо `Form.AutoFields` по модели с ключом `Select.WorkCategory` в `form-develop-app` — поле рисуется
компонентом реестра (роль `combobox`/кнопка создания из окна, а не текстовый `input`), создание из окна выбирает
новую запись; production-сборка с намеренно незарегистрированным ключом — базовый Select, страница не падает.

### 13. Порядок реализации для `forms-dev`

Каждый шаг — отдельный коммит, TDD (сначала падающий тест). Контракт и чистые функции — раньше скинов.

**Этап А** — `forms` 2.19.0, `forms-core` 0.16.0, `forms-shadcn` 0.40.0 (`forms-react` не меняется):

1. `forms-core`: `getOptionText`, `getOptionLabel` через неё; `textValue`/`data` в `UIKitSelectOption`;
   `UIKitOptionRenderState`; `renderOption`/`renderValue`/`readOnly` в контракте; `CreatedOption.data`;
   unit-тесты.
2. `libs/forms` типы: `BaseOption<T, TData>`, `SelectFieldOption`, `OptionRenderState`, `SelectFieldProps<TData>`,
   `ComboboxFieldProps` (`getTextValue`); `SelectFieldComponent`/`ComboboxFieldComponent` пока без статиков;
   compile-only тест вывода.
3. Chakra Select: `ItemText` + `renderOption`, `renderValue` в `ValueText`, `itemToString: getOptionText`,
   `readOnly`; в `field-select.tsx` убрать сплющивание; dev-предупреждение; тесты 1–7. Заодно исправить JSDoc над
   `FieldSelect` (`field-select.tsx:88–94`): он обещает «advanced features (search, clear, custom rendering)», а
   поиска нет. После этапа А честно: «clear, custom rendering (`renderOption`/`renderValue`)»; «search» вернуть
   в этапе В.
4. Chakra Combobox: тест 8.
5. shadcn Select/Combobox: `textValue` у `Item`, `Value` с `children`, `renderOption`.
6. Цикл синхронизации (ниже), версии, `bun.lock`.

**Этап Б** — `forms` 2.20.0, `forms-core` 0.17.0, `forms-react` 0.13.0, `forms-shadcn` 0.41.0:

> ✅ **Статус 2026-09-26:** шаги 1–5 выполнены (Chakra и shadcn, Select и Combobox; тесты 9–24, 26, 27; `asChild` у
> слотов; `Form.Field.Select` в составных типах стал generic — в 2.19.0 `o.data` было `unknown`). `forms-react`
> получил новый публичный слой `selection`, поэтому версия 0.13.0, а не 0.12.0. **Не сделано:** шаг 6 (e2e-демо и
> ZenStack-демо §16.2 — есть демо `apps/form-develop-app/src/app/edit-option-demo`), шаг 7 (relation-провайдер,
> ждёт ответов владельца на вопросы 24/25/27), `useSelected` (§16.4). form-mcp/README про `onUpdate` не обновлялись
> (про `onCreate` там тоже нет). У shadcn Combobox F2 нет — нет клавиатурной навигации по списку (долг).

1. `forms-core/uikit/editable-options.ts`: `isOptionEditable`, `upsert/prune/applyOptionOverlay`,
   `SelectionActionKind`, `UpdatedOption` — чистые функции, таблица случаев §6 целиком в unit-тестах.
2. `forms-react/selection/`: контексты, `useSelectionActionsState` (pending, mounted, overlay, created, `run`),
   headless-хуки кнопок; тесты с фейковым `controlRef`.
3. Chakra Select: слоты (`selection-slots.tsx`), `controlActions`/`renderOptionActions`/`listFooter`/`controlRef`/F2
   в `uikit-chakra.tsx`; `field-select.tsx`: `onCreate` на `runCreate` (удалить `creatingRef`), `onUpdate`,
   `createItem`; статики через `Object.assign`; типы в `form-compound-types.ts` и `create-form.tsx`; тесты 9–24, 26,
   Z1–Z5.
4. Chakra Combobox (§9), включая пустой результат при `onCreate` (§9.1, тест 27; `resolveEmptyState` — в
   `forms-core` шагом 1). Если владелец примет вопрос 24 — проп `useSelected` (§16.4) в
   `ComboboxFieldProps`/`use-async-search`, тест Z7.
5. shadcn (§10), тест 25; §9.1 в shadcn Combobox — тем же правилом.
6. Цикл синхронизации, e2e-демо (включая ZenStack-демо §16.2 на `Category`; адаптер `useUpdateCategory` в
   `apps/form-develop-app/src/lib/hooks.ts` — добавить).
7. Если владелец примет вопросы 25 и 27 — `relation-field-provider.tsx`: `data: record` в опциях,
   `RelationConfig.fieldProps`; `field-type-mapper.tsx`: опции провайдера в Combobox, `relation` не распылять в
   поле; тест Z8. Отдельный коммит, версии этапа Б покрывают (новые необязательные поля).

**Этап В** — `forms` 2.21.0, `forms-core` 0.18.0, `forms-react` 0.14.0, `forms-shadcn` 0.42.0 (подробно — §15.9):

> ✅ **Статус 2026-09-26:** шаги 1–4 выполнены (Chakra: поле поиска, порог 9 с гистерезисом, раскладка, подсветка
> первой, пустое состояние, `onCreate(search)`; shadcn: `searchable` в типах + dev-предупреждение). Проверено в
> браузере (`/select-search-demo`): печать, пробел, Home, Enter, Escape, стрелки, `aria-activedescendant`, пустой
> результат с «+ Добавить "…"». Отклонения от плана: `renderEmpty({ search })` (объект, как у Combobox, а не голая
> строка); `forms-react` 0.14.0 (0.13.0 занята этапом Б); `,` и `.` добавлены в карту раскладки («б», «ю»);
> `@letar/fuzzy-search` теперь зависит от `forms-core` и реэкспортирует раскладку оттуда. Не сделано: тест
> `pointer: coarse`/IME (в jsdom не эмулируются), e2e и Z6 (`loading` — вопрос 23), `form-mcp` (описание пропсов —
> из `docs/fields.md`, обновлён).

1. `forms-core`: `resolveSearchable`, `filterSelectionOptions`, `SELECT_SEARCH_THRESHOLD = 9`, типы
   `SelectSearchable`/`UIKitSelectSearch`; unit-тесты порога и фильтра.
2. `forms-react/selection/`: `useSelectionSearch` (строка поиска, гистерезис порога, сброс на закрытии).
3. Chakra: поле поиска в `uikit-chakra.tsx` (`composite: false`, `Select.List`, ARIA, клавиши, подсветка первой,
   автофокус), `field-select.tsx` — `searchable`, `renderEmpty`, `onCreate(search)`; JSDoc — вернуть «search»;
   тесты 28–37. Если владелец примет вопрос 23 — проп `loading` у Select (§16.3), тест Z6.
4. shadcn: проп в типах, `searchable` не действует, dev-предупреждение при `true` — долг (§15.6).
5. Цикл синхронизации, e2e; в CHANGELOG — «Изменения поведения»: у Select с 10+ опциями в выпадашке появилось
   поле поиска, выключается `searchable={false}`.

**Этап Г — источники данных** (§16.8, §16.9) — `forms` 2.22.0, `forms-core` 0.19.0, `forms-react` 0.15.0,
`forms-shadcn` 0.43.0, **новый** `forms-query` 0.1.0. Опирается на Б (`useSelected`, конвейер `run`) и В (`loading`):

1. `forms-core`: `LoadContext`, `LoadOptionsFn`, `LoadSelectedFn`, `OptionsSourceProps`; unit-тесты типов.
2. `forms-react`: общий источник поиска — промис-путь рядом с `useAsyncSearch` (дебаунс, `minChars`, отмена, номер
   запроса, прошлые результаты, `error`, повтор, кэш `loadSelected`); `useOptionsLoader`; тесты L1–L4, L7, L8.
3. `libs/forms`: `ComboboxFieldProps` → база & `ComboboxSource` (объединение, §16.8), `loading` у статичных `options`,
   «Повторить» в пустом состоянии, перезапрос после `onCreate`/`onUpdate`, dev-предупреждение; тесты L5, L6, L9.
   Перед этим шагом — `typecheck:tsgo` всех потребителей Combobox (объединение может сломать сборку приложений).
4. shadcn: `loading`, промис-путь в Combobox — тем же источником из `forms-react`.
5. `libs/forms-query`: каркас генератором, публикация, `fromSearchQuery`, `fromSelectedQuery`, `useQueryOptions`,
   `useLoaderQuery`, `useInvalidateAfter`, `/zenstack` → `useInvalidateModels` (`useZenStackOptions` — этап Д, ему
   нужен `pending`); тесты Q1–Q4, Q5 (часть про инвалидацию), Q6, Q7; правки `publish-npm.yml` (§16.9).
6. Цикл синхронизации + README и CHANGELOG `forms-query`; e2e этапа Г.

**Этап Д — оптимистичный режим** (§16.7) — `forms` 2.23.0, `forms-core` 0.20.0, `forms-react` 0.15.0,
`forms-shadcn` 0.44.0, `forms-query` 0.2.0. Опирается на Б (наложение, конвейер, `createdOptions`):

1. `forms-core`: `SelectionActionContext`, `SettleErrorInfo`, `BaseOption.pending`, `createPendingRegistry`; тест O13.
2. `forms-react`: `pending` в `DeclarativeFormContextValue`; фазы ожидания в `useSelectionActionsState` (временная
   опция, ожидающий выбор, таймаут, откат), `useSelectionEditButton` → `null` на опции в ожидании.
3. `libs/forms`: корни форм — `submitWhenSettled`, `submit()` в контексте, dev-предупреждение; `Form.Button.Submit`
   (`submitQueued`); `DirtyGuard`; Select/Combobox — `pending` в коллекции zag (disabled), рендер ожидания,
   `onSettleError`/`settleTimeout`, встроенное сообщение (i18n `formSelection.settleError`); тесты O1–O12.
4. shadcn: рендер ожидания и `pending` в Select/Combobox; прямые `handleSubmit` навигации шагов и OTP (§16.7,
   «Программный `form.handleSubmit()`») — на `submit()` из контекста; то же в `forms-react` и в навигации шагов
   `libs/forms`. Своего корня формы у shadcn нет (поиск `handleSubmit` по `libs/forms-shadcn/src` — только эти два
   места).
5. `forms-query` 0.2.0: `useZenStackOptions`, `isPending` в `useQueryOptions`; тест Q5 (часть про `$optimistic`).
6. Цикл синхронизации, e2e этапа Д; в CHANGELOG `forms` — «Изменения поведения»: отправка формы ждёт подтверждения
   оптимистичных действий (без них поведение не меняется).

**Этап Е — автопривязка справочников из схемы** (§17) — `forms` 2.24.0, `forms-core` 0.21.0,
`zenstack-form-plugin` 4.2.0, `form-mcp` 2.3.0 (`forms-react`, `forms-shadcn`, `forms-query` не меняются). От А–Д не
зависит по коду, идёт после них по очереди:

1. `zenstack-form-plugin`: починка двойного `fieldProps` (`model-generator.ts:923–928`) — отдельный коммит, patch-часть
   minor; тест P3.
2. `forms-core`: `FieldRegistryNamespace`, `FieldRegistryType` в `FieldComponentType`, `parseFieldRegistryType`; тест E1.
3. `libs/forms`: `FormRegistryContext` в `ExtendedFormRoot`, `RegistryField` и fallback в `SchemaFieldWithRelations` и
   `Form.Field.Auto`, dev-предупреждение в `default` у `renderFieldByType`; тесты E2–E7, E9.
4. `libs/forms`: generic `createForm`/`ExtendedForm` с умолчаниями `string`, `FormRegistryCheck`; тест E8. **Перед
   релизом** — `nx typecheck:tsgo` всех потребителей `createForm` (поиск `extraSelects|lazySelects` по `apps/` — 13
   файлов): generic превращает опечатки `AppForm.Select.X` и доступ по `string`-ключу в ошибки (Р16, вопрос 45).
5. `zenstack-form-plugin`: разбор и проверка ключей, проверка `form.relation.*` по моделям, `form-registry-keys.ts` в
   выходе и в `index.ts`; тесты P1, P2, P4; README (раздел «Ключи реестра», совместимость с `forms` ≥ 2.24.0).
6. `form-mcp`: `get_directives` — ключ и исправленное описание `form.relation`; `get_form_pattern` — паттерн
   «справочник по ключу из схемы»; тест M1.
7. Цикл синхронизации (ниже), e2e этапа Е; `libs/zenstack-fragments/README.md` — строка про ключи во фрагментах.

**Версии по этапам** (кто выпускается; `—` — не меняется):

| Этап                    | `forms` | `forms-core` | `forms-react` | `forms-shadcn` | `forms-query` | `zenstack-form-plugin` | `form-mcp` |
| ----------------------- | ------- | ------------ | ------------- | -------------- | ------------- | ---------------------- | ---------- |
| А — рендер              | 2.19.0  | 0.16.0       | —             | 0.40.0         | —             | —                      | —          |
| Б — слоты               | 2.20.0  | 0.17.0       | 0.13.0        | 0.41.0         | —             | —                      | —          |
| В — поиск в Select      | 2.21.0  | 0.18.0       | 0.14.0        | 0.42.0         | —             | —                      | —          |
| Г — источники данных    | 2.22.0  | 0.19.0       | 0.15.0        | 0.43.0         | 0.1.0 (новый) | —                      | —          |
| Д — оптимистичный режим | 2.23.0  | 0.20.0       | 0.16.0        | 0.44.0         | 0.2.0         | —                      | —          |
| Е — ключи реестра       | 2.24.0  | 0.21.0       | —             | —              | —             | 4.2.0                  | 2.3.0      |

`form-mcp` в этапах А–Д тоже обновляется (группа 6 цикла синхронизации — описания пропсов и паттерны), но это правки
данных без смены API; версию поднимает `forms-dev` по факту, в таблице не зафиксирована. Текущие версии: плагин
4.1.3, `form-mcp` 2.2.1.

В npm из них уходят `forms` (тег `forms-v*`), `forms-query` (тег `forms-query-v*`, §16.9) и `zenstack-form-plugin`
(тег `zenstack-form-plugin-v*`); `form-mcp` — по действующему тегу `form-mcp-v*` (в его `package.json` стоит
`"private": true` — как это сочетается с публикацией, не проверено); `forms-core`/`forms-react` вбандливаются,
`forms-shadcn` в `publish-npm.yml` отсутствует (как и раньше). Если к началу этапа текущие версии
уйдут вперёд — номера сдвигаются, порядок минорных шагов тот же.

**Цикл синхронизации из 6 групп** (`.claude/commands/forms-dev.md`) — после каждого этапа:

1. **`libs/forms`:** `CHANGELOG.md` (у этапа А — строка «Изменения поведения», §3), `package.json`, `README.md`
   (таблица пропсов Select/Combobox), `docs/fields.md` — раздел «Свой рендер опций и кнопки у опций» (F2 и Fn+F2
   на macOS, правило «свой рендер — свои кнопки», наложение правок, окно без вложенного `<form>`) и дополнение
   абзаца про обёртки.
2. **`apps/form-develop-app`:** демо `/select-render-demo` (адрес доставки с `data`, карандаш, F2, `CreateButton` в
   подвале) и расширение `/create-option-demo`; e2e.
3. **`apps/form-docs`:** `content/docs/fields/select.mdx` + `select.ru.mdx`, страница Combobox, API reference.
4. **`apps/form-example`:** пример «Адрес доставки — правка карандашом», расширить `examples/create-option`.
5. **`libs/forms/NEW_COMPONENTS.md`.**
6. **`libs/form-mcp`:** новые пропсы Select/Combobox в `get_field_props`/`get_field_example`; в `pattern-registry.ts`
   — паттерн «справочник с правкой и созданием из формы», если реестр ведёт такие паттерны. Этап В: `searchable` в
   `get_field_props`, правило выбора «Select или Combobox» (§15.7) в описании полей `list_fields`/`get_form_pattern`.

**ZenStack (§16) в цикле синхронизации:** в группе 1 — оба примера §16.6 и правила §16.2 (возвращать ответ сервера,
маркер `pending` для `$optimistic`, `keepPreviousData` у Combobox), разделы «Источники данных» (§16.8) и
«Оптимистичный режим» (§16.7) в `docs/fields.md`; в группе 3 — те же примеры в `select.mdx`/`select.ru.mdx` и на
странице Combobox, отдельная страница пакета `@letar/forms-query`; в группе 6 — паттерны «справочник из
ZenStack/Query» и «справочник на server action» в `get_form_pattern` и примеры
`form.props.searchable`/`form.props.searchable.threshold`/`form.props.createItem` в `get_directives`.
`zenstack-form-plugin` в этапах А–Д не меняется: новых директив нет (§16.5). В этапе Е меняется (§17): в группе 1 —
раздел «Ключи реестра в схеме» в `docs/fields.md` и README (таблица «ключ или `RelationConfig.fieldProps`», §17.5),
в группе 3 — та же страница в `form-docs`, в группе 6 — `get_directives`/`get_form_pattern`.

Вне `libs/forms` (не правка этого плана — сообщить координатору): `.claude/rules/forms.md` в пункте про
`Field.NativeSelect` говорит, что `Field.Select` закрывает мобильный UX «(поиск, кнопка очистки)». До этапа В
это неправда. Сейчас нужно «(кнопка очистки; поиск — с forms 2.21.0)», после этапа В — «(поиск с 10 опций,
кнопка очистки)».

После каждого bump версии — `bun scripts/check-lock-workspace-versions.mjs` и при расхождении отдельный коммит
`bun.lock` (правило `app-workflow.md` §3.5).

### 14. Риски и открытые вопросы

**Риски.**

- **Р1. Изменение поведения `ReactNode`-label** (§3): потребитель, который «чинил» это своим кодом, увидит двойную
  подпись. Смягчение — греп потребителей до релиза и строка в CHANGELOG.
- **Р2. Опора на внутренности zag/Radix** (порядок `raf`, `defaultPrevented`, `data-no-autofocus`): закрыто
  тестами §12 и e2e; при обновлении Chakra/Radix — прогон этих тестов обязателен.
- **Р3. `setState` в рендере** для прюнинга может не понравиться линтеру `react-hooks` — запасной вариант `useEffect`
  (§6).
- **Р4. Приведение типа у `createField`** (generic и статики): ошибка в сигнатуре не видна компилятору в реализации —
  её ловит только compile-only тест вывода (§12, п. 6).
- **Р5. Производительность:** значение контекста поля новое на каждый рендер — перерисовываются слоты поля; для
  списков в сотни пунктов нормально, виртуализации у Select всё равно нет.
- **Р6. Этап В меняет открытый список у существующих Select с 10+ опциями** (§15.8): поле поиска, автофокус, печать
  фильтрует вместо typeahead. Закрытое поле не меняется. Смягчение — строка «Изменения поведения» в CHANGELOG,
  `searchable={false}`, прогон e2e потребителей до релиза.
- **Р7. Поиск в Select держится на ручной ARIA и гашении трёх клавиш** поверх внутренностей zag (§15.2): обновление
  Chakra/Ark может сдвинуть порядок обработки. Закрыто тестами 32, 36 и axe в e2e.
- **Р8. Оптимистичный режим ZenStack** (`optimisticUpdate: true`) на время `create` кладёт в `options` временную
  строку с чужим id (§16.1–16.2). Смягчение (после решения по вопросу 28): маркер `pending` — такие строки видны, но не
  выбираются; `useZenStackOptions` ставит его сам; пока свой create поля в полёте, они скрыты (§16.7).
- **Р9. Этап Д меняет путь отправки всех форм** (`submitWhenSettled` в корнях, `Form.Button.Submit`, навигация шагов,
  OTP). Смягчение: при пустом реестре — `handleSubmit()` в том же тике, как сейчас; регрессия всех существующих спеков
  корня формы и шагов без изменений (тест O8); строка в «Изменения поведения».
- **Р10. Оптимистичный UI показывает несохранённое.** Отказ после того, как пользователь ушёл дальше, заметен только
  по сообщению поля или тосту приложения. Смягчение: отправка формы ждёт подтверждения и отменяется при отказе, выбор
  откатывается, `DirtyGuard` предупреждает об уходе во время ожидания.
- **Р11. «Ровно один источник» в типах Combobox** (объединение с `?: never`, §16.8) может сломать `typecheck`
  приложений, где сейчас передают и `options`, и `useQuery`, и распыление `Partial<…>`. Смягчение: прогон
  `typecheck:tsgo` всех потребителей до релиза этапа Г, compile-only тест L9; при массовых поломках — сначала только
  dev-предупреждение, объединение — следующим minor (вопрос 31).
- **Р12. Два публикуемых пакета с общими типами `forms-core`** (`forms` и `forms-query` вбандливают их каждый себе):
  при смене формы контракта опций пакеты разойдутся структурно. Смягчение: такие изменения — minor обоих сразу, тест
  совместимости Q6, таблица совместимых версий в README `forms-query` (§16.9).
- **Р13. Тихий фолбэк ключа в production** (§17.3): незарегистрированный ключ рисуется базовым Select, а
  `NODE_ENV=production` стоит и на staging — e2e не увидит исключения. Смягчение: e2e этапа Е проверяет поле по роли и
  кнопке создания; `console.error` с именем ключа; строка `FormRegistryCheck` ловит пропуск ещё на typecheck.
- **Р14. Рассинхрон версий плагина и форм** (§17.7): плагин 4.2 с `forms` < 2.24 — ключ молча становится текстовым
  полем (dev-предупреждение на неизвестный тип появляется только в 2.24). Смягчение: требование версии в README и
  CHANGELOG обоих пакетов.
- **Р15. Устаревший `form-registry-keys.ts`:** схему поправили, `zenstack:generate` не запустили — typecheck зелёный на
  старом списке. Смягчение: файл пишет тот же прогон, что и формы (без него устареют и сами схемы форм); в dev
  недостающий ключ — исключение. Проверяет ли CI актуальность сгенерированного кода — не проверено.
- **Р16. Generic `createForm` меняет типы у всех потребителей:** опечатки `AppForm.Select.X` и доступ
  `AppForm.Select[key]` со `key: string` станут ошибками typecheck. Опечатки — настоящие баги (сейчас падают в
  рантайме); динамический доступ — расширить тип ключа или аннотировать инстанс. Смягчение: прогон `typecheck:tsgo`
  всех потребителей до релиза (§13, этап Е, шаг 4), умолчания `string` у `ExtendedForm`.
- **Р17. «Магия» автопривязки:** поле в `AutoFields` рисуется компонентом из другого файла, при отладке неочевидно,
  откуда он. Смягчение: `displayName` `RegistryField(Select.X)`, места использования ключа в dev-сообщениях
  (`formRegistryUsages`), таблица §17.5 в доке.

**Открытые вопросы к владельцу** (по каждому — рекомендация):

✅ **2026-09-26 владелец принял рекомендации по всем вопросам 1–21** (14, 16, 18 — отдельно, с уточнениями ниже).
Дополнение владельца: приложения во всю используют **ZenStack (хуки `useFindMany*`/`useCreate*`/`useUpdate*`) и
TanStack Query** — сценарии, примеры в доке и взаимодействие `onCreate`/`onUpdate` с инвалидацией кэша нужно
проверять на этой связке — разобрано в §16 «ZenStack + TanStack Query», новые вопросы 22–28 (22 и 28 затем решены
владельцем) и 29–38.

✅ **2026-09-26 владелец принял рекомендации по вопросам 29–38** (оптимистичный режим, промис-источник, пакет
`@letar/forms-query`). ✅ Вопросы 23–27 приняты владельцем с рекомендациями в тот же день: 23 — `loading` у Select
(этап В), 24 — `useSelected` (этап Б), 25 — `RelationConfig.fieldProps` + `data` в опциях провайдера (этап Б),
26 — нет (`form.fieldType` со ссылкой на компонент не вводим), 27 — да (опции провайдера для relation + combobox).
Открытых вопросов нет.

🔄 **2026-09-26 владелец пересмотрел вопрос 26:** автопривязка справочников из схемы — этап Е (§17).
✅ Вопросы 39–45 приняты владельцем с рекомендациями в тот же день. Открытых вопросов нет.

1. **Горячая клавиша.** F2 для подсвеченного пункта и для выбранного значения на закрытом триггере? —
   _Рекомендую F2_ (стандарт, zag и Radix её не занимают; Ctrl/Shift+Enter конфликтуют с выбором, §7). Сделать
   ли клавишу настраиваемой пропом — нет, пока нет запроса.
2. **Выбирать ли опцию после правки**, если она не была выбрана? — _Рекомендую не выбирать:_ правка ≠ выбор,
   владелец и так сказал «клик по карандашу не выбирает пункт».
3. **Свой `renderOption` без `EditButton`** — карандашей в пунктах нет (явное правило), или авто-карандаш остаётся,
   пока его не выключат пропом? — _Рекомендую явное правило_ «свой рендер — свои кнопки» (§4.2): предсказуемо,
   без мигания.
4. **`onUpdate` вернул другой value** (запись заменена): заменять опцию на месте и переключать значение, если
   она была выбрана? — _Рекомендую да_ (§6); иначе форма ссылается на устаревшую запись.
5. **Явный сигнал «список перезапрошен»** на случай, когда сервер вернул прежнюю подпись: проп `optionsKey`
   (смена ключа сбрасывает все правки)? — _Рекомендую не делать в первой итерации_, описать в доке «возвращайте из
   `onUpdate` то, что реально сохранено»; добавить при первом реальном случае.
6. **`CreateButton` рядом с меткой поля** (слот `labelAddon` вне `<label>`) — нужен сразу? — _Рекомендую отложить:_
   подвал списка и пустое состояние Combobox закрывают сценарий, а метку делят все поля выбора.
7. **Combobox с `useQuery`:** значение, которого нет на текущей странице выдачи, уходит в `onUpdate` без `data`
   (только value и текст) — приемлемо? — _Рекомендую принять_ и описать; приложение само догружает запись по
   value. Проп `initialData` — только при реальном запросе.
   Дополнение (§16.4): для ZenStack есть штатный путь догрузки — проп `useSelected` (`useFindUnique` по value),
   вынесен отдельным вопросом 24; принятое решение по вопросу 7 без него остаётся в силе.
8. **Видимость карандаша на десктопе:** всегда (приглушённый) или только у подсвеченного пункта? —
   _Рекомендую всегда:_ находимость и одинаковое поведение с тачем, где наведения нет.
   ✅ **Решено владельцем 2026-09-26, уточнено:** «всегда» шумно на длинных списках. На устройствах с наведением
   карандаш в пункте появляется при наведении и при клавиатурной подсветке (`data-highlighted`), на таче виден
   всегда (приглушённый); скрытие — `opacity` + `visibility`, без сдвига раскладки. Карандаш у выбранного
   значения виден всегда. Детали — §7 «Видимость карандаша в пункте».
9. **`readOnly`-поле:** карандаш у значения скрыт? — _Рекомендую скрыть_, как у `disabled`: режим просмотра не
   правит справочники.
10. **Опция со значением `''`** («Все категории») по умолчанию не редактируема? — _Рекомендую да_ (это не запись
    справочника); явный `editable: true` её не включает, чтобы правило было одним.
11. **`createItem={false}` у Combobox** без клавиатурного пути к `CreateButton` (§4.5) — только предупреждение в
    доке? — _Рекомендую да_, без рантайм-запрета.
12. **shadcn Combobox без F2** (нет модели подсветки, §10) — принять долгом? — _Рекомендую принять_; чинить вместе с
    клавиатурой shadcn Combobox.
13. **Как делать поиск в Select:** поле поиска внутри выпадашки (а) или подмена на Combobox от порога (б)? —
    _Рекомендую (а)_ (§15.2): закрытое поле не меняется, `renderValue` и `value: ''` работают, при 9→10 нет
    перемонтирования, один путь рендера для всех слотов.
14. **Умолчание `searchable: 'auto'` с порогом 9 (поиск с 10 опций)** — включать у всех существующих Select? —
    _Рекомендую да_: меняется только открытый список (Р6). Глобальный переключатель
    `createForm({ selectSearchable })` — не делать сразу, добавить по первой просьбе потребителя.
    ✅ **Решено владельцем 2026-09-26: да**, `'auto'` с порогом 9 у всех Select, без глобального выключателя.
15. **Считать ли отключённые опции в порог?** — _Рекомендую да_: они занимают место в списке так же, как
    доступные. Служебный пункт «+ Добавить» и заголовки групп — не считать.
16. **Раскладка клавиатуры в фильтре** («rhjdkz» → «Кровля»)? Штатный `contains` её не учитывает (§15.3). —
    _Рекомендую не в первой итерации._ Если нужно — перенести чистую `correctKeyboardLayout` из
    `@letar/fuzzy-search` в `forms-core/uikit` (fuzzy-search реэкспортирует её оттуда) и искать по двум строкам.
    Прямую зависимость `@letar/forms` → `@letar/fuzzy-search` не заводить: forms публикуется в npm, fuzzy-search — нет.
    ✅ **Решено владельцем 2026-09-26: раскладка нужна, делаем в этапе В** (а не откладываем). Реализация как в
    рекомендации: `correctKeyboardLayout` (чистая функция, `libs/fuzzy-search/src/lib/keyboard-layout.ts`,
    RU↔EN по позиции клавиш, направление определяется автоматически) переезжает в `forms-core/uikit`,
    `@letar/fuzzy-search` реэкспортирует её оттуда; фильтр `Select searchable` и фильтр Combobox по статичным
    `options` совпадают, если подходит **исходная** строка ИЛИ **исправленная** (объединение, не замена: «ghbdtn»
    может быть настоящей латинской подписью). Тесты: «ghbdtn» → «Привет», «rhjdkz» → «Кровля», латинская опция
    находится по латинскому запросу, смешанный ввод не ломается. Async `useQuery` в Combobox вне охвата (два
    прогона запроса — забота приложения, `orchestrate-search` из `@letar/fuzzy-search`); отметить в доке.
17. **Печать на закрытом триггере открывает список с поиском** (как в системных списках)? — _Рекомендую нет_ в
    первой итерации: на закрытом триггере остаётся typeahead zag, поведение не меняется.
18. **Автофокус поля поиска на тач-устройствах** — _Рекомендую не фокусировать_ (`pointer: coarse`): иначе
    клавиатура телефона закрывает половину списка; поиск — по тапу в поле.
    ✅ **Решено владельцем 2026-09-26: да.** Тач (`pointer: coarse`) — поиск осознанным тапом по полю; десктоп —
    открыл список и сразу печатает (автофокус). Нижняя панель (bottom sheet) для телефона — не в этом этапе,
    только если реальные пользователи упрутся.
19. **shadcn Select без поиска** до готовой клавиатуры shadcn Combobox (§15.6) — принять долгом? — _Рекомендую
    принять_: поиск внутри Radix Select конфликтует с его фокусной моделью.
20. **Combobox: «Ничего не найдено» + пункт создания по умолчанию** (§9.1), этап Б? — _Рекомендую да_; пункт
    создания остаётся пунктом списка (единственный клавиатурный путь), свои тексты потребителя не трогаем.
21. **Искать ли по названию группы** (`getGroup`)? — _Рекомендую нет_: ищем по тексту опции; совпадение по
    заголовку группы вывалило бы всю группу.

Вопросы 22–28 — по связке ZenStack + TanStack Query (§16); 22 и 28 решены владельцем, 23–27 открыты:

22. **Хелпер `useOptionsFromQuery` в `@letar/forms`?** — первая рекомендация была «нет».
    ✅ **Решено владельцем 2026-09-26 иначе:** к TanStack Query привязываемся первоклассно, но **отдельным пакетом**,
    чтобы его не грузили те, кому он не нужен. Проработка (§16.9): пакет `@letar/forms-query` (`libs/forms-query`,
    имя по семейству `forms-<слой>`), зависит только от типов `forms-core` (вбандливаются, `devDependencies`), peer
    `@tanstack/react-query` обязательный; подпуть `/zenstack` с необязательным peer `@zenstackhq/tanstack-query`.
    Состав: `fromSearchQuery`, `fromSelectedQuery`, `useQueryOptions`, `useLoaderQuery`, `useInvalidateAfter`;
    `/zenstack` — `useZenStackOptions`, `useInvalidateModels`. Ядро `@letar/forms` и `forms-core` не зависят ни от
    Query, ни от ZenStack; промис-путь `loadOptions` — в ядре. Пакет не импортирует `@letar/forms`/`forms-shadcn` —
    цикла нет, работает с обоими скинами. Публикация — тег `forms-query-v*` в `publish-npm.yml`. Этапы Г (0.1.0) и
    Д (0.2.0).
23. **Проп `loading` у `Field.Select`** (справочник из `useFindMany` ещё грузится: спиннер, текст «Загрузка…» в
    списке и в триггере при непустом значении)? — _Рекомендую да, этап В_ (§16.3): сейчас поле со значением до
    ответа сервера выглядит пустым.
24. **Проп `useSelected` у Combobox** — догрузка выбранной записи через `useFindUnique` по value (подпись в форме
    редактирования, `data` для карандаша у значения и `onUpdate`)? — _Рекомендую да, этап Б, шаг 4_ (§16.4);
    `initialLabel` остаётся и имеет приоритет.
25. **`RelationConfig.fieldProps` + `data: record` в опциях `RelationFieldProvider`** — чтобы автоформы получали
    `onCreate`/`onUpdate`/`renderOption` один раз на модель? — _Рекомендую да, этап Б_ (§16.5, п. 2).
    Уточнение после пересмотра вопроса 26 (§17.5): `RelationConfig.fieldProps` — лёгкий случай, только для автоформ с
    провайдером (подписи, `renderOption`, короткий `onCreate` без окна). Справочник со своим окном, нужный и в ручных
    формах, — компонент реестра и ключ в схеме (этап Е). На одном поле оба — побеждает ключ, `relation`
    игнорируется с предупреждением.
26. **`form.fieldType` со ссылкой на компонент инстанса** (`"Select.WorkCategory"`)? — _Рекомендую нет_ (§16.5,
    п. 3): маппер работает по фиксированному `switch`; поле-справочник ставится в форму явно, в `AutoFields` —
    `exclude`. С пакетом `@letar/forms-query` вопрос не связан: пакет не знает ни о компонентах инстанса, ни о
    скинах — импортирует только типы `forms-core`, поэтому ссылка из схемы на компонент не создала бы и цикла через
    него (§16.9).
    🔄 **Решено иначе: пересмотрено владельцем 2026-09-26.** Автопривязку делаем, этап Е (§17). Новая рекомендация:
    `@meta("form.fieldType", "Select.WorkCategory")` (вопрос 39); реестр `createForm` доходит до `Form.AutoFields` и
    `Form.Field.Auto` через `FormRegistryContext` из корня инстанса; плагин пишет `form-registry-keys.ts` с union
    ключей, приложение проверяет покрытие строкой `FormRegistryCheck` (typecheck); незарегистрированный ключ — в dev
    исключение, в production базовое поле (вопрос 40). Окно, `renderOption`, тексты и валидация не автоматизируются.
    Прежний довод «фиксированный `switch`» снимается: ключ разбирается до `switch`, встроенные типы не меняются.
27. **Relation + `fieldType: "combobox"`** сейчас без опций (`field-type-mapper.tsx:374–375`) — отдавать опции
    провайдера как статичные `options` и перестать распылять служебный `relation` в поле? — _Рекомендую да,
    попутно в этапе Б_ (§16.5, п. 4).
28. **Оптимистичный режим для справочников** — поддерживать в библиотеке или только правило в доке? — первая
    рекомендация была «только доку».
    ✅ **Решено владельцем 2026-09-26: поддерживаем в библиотеке.** Проработка (§16.7): `onCreate`/`onUpdate` получают
    второй аргумент `ctx.optimistic(preview)`; поле показывает и выбирает результат сразу, по подтверждению заменяет на
    настоящий, при отказе откатывает и зовёт `onSettleError`. Временный id в значение формы не пишется (ожидающий
    выбор живёт в поле); отправка формы ждёт подтверждения через реестр ожидания формы. Строки `$optimistic` ZenStack
    — через маркер `pending` у опции; ядро флаг ZenStack не читает (его ставит `useZenStackOptions`). Этап Д.

Вопросы 29–38 — по оптимистичному режиму, источникам данных и пакету (§16.7–16.9), открыты:

29. **Контракт оптимизма:** второй аргумент `ctx.optimistic(preview)` или объединённый результат
    `Option | null | { optimistic; settled }`? — _Рекомендую `ctx`_ (§16.7): один тип результата, старые обработчики не
    меняются, код с окном читается сверху вниз, конец интерактивной фазы виден полю точно.
30. **Временный id в значении формы:** держать ожидающий выбор только в поле (форма до подтверждения хранит прежнее
    значение) или писать временный id в форму и учить потребителей его пропускать? — _Рекомендую только в поле_:
    черновик, `UrlSync`, `DirtyGuard`, валидаторы, `Form.Watch` и числовые поля остаются корректными без правок.
    Цена — зависимые поля реагируют после подтверждения.
31. **Объединение «ровно один источник» в типах Combobox сразу в этапе Г** или сначала только dev-предупреждение? —
    _Рекомендую сразу_, если прогон `typecheck:tsgo` потребителей даёт единицы поломок; иначе — предупреждение в Г,
    типы в следующем minor (Р11).
32. **Отправка во время ожидания:** ставить в очередь (кнопка `loading`, отправка после подтверждения) или
    блокировать кнопку? — _Рекомендую очередь_: пользователь не видит серую кнопку без объяснения; при отказе
    отправка отменяется, фокус — на поле.
33. **Таймаут подтверждения** 30 с по умолчанию, `settleTimeout` у поля? — _Рекомендую да_: иначе зависший запрос
    держит отправку формы бесконечно. Глобальную настройку в `createForm` — по первой просьбе.
34. **Встроенное сообщение об отказе под полем**, если приложение не передало `onSettleError`? — _Рекомендую да_: иначе
    откат выбора может пройти незамеченным. С `onSettleError` — только колбэк (тост — у приложения).
35. **`pending`-опции приложения:** видны приглушёнными, не выбираются, без карандаша; скрыты, пока свой create поля в
    полёте? — _Рекомендую да_ (§16.7).
36. **Кэш промис-пути:** в ядре только отмена, гонки, прошлые результаты и перезапрос после `onCreate`/`onUpdate`,
    кэш — через `useLoaderQuery` пакета? — _Рекомендую да_: собственный кэш ядра не узнал бы о правках из других мест.
37. **Повтор при ошибке загрузки:** без автоповторов — кнопка «Повторить», следующий ввод или повторное открытие? —
    _Рекомендую да_; сетевые повторы — дело загрузчика или TanStack (`retry`).
38. **Select без `loadOptions`**, разовая загрузка — `useOptionsLoader` в ядре, выдающий те же `fieldProps`, что и
    `useQueryOptions`? — _Рекомендую да_ (§16.8): поиск по строке на сервере — задача Combobox.

Вопросы 39–45 — по автопривязке справочников и кодогенерации (§17, этап Е); ✅ приняты владельцем с рекомендациями:

39. **Синтаксис ключа:** `@meta("form.fieldType", "Select.WorkCategory")` или отдельные `form.select`/`form.combobox`
    (вариант из ответа владельцу)? — _Рекомендую `form.fieldType`_ (§17.2): одна директива на вопрос «какой
    компонент», нет противоречивых пар, повторяет JSX `AppForm.Select.WorkCategory`, парсер плагина уже принимает.
40. **Ключа нет в реестре** (или форма не из `createForm`): в dev и тестах — исключение с понятным текстом, в
    production — базовое поле по пространству (`Select.` → `select`) и `console.error`? — _Рекомендую да_ (§17.3):
    тихий `FieldString` — ловушка, которая выглядит как успех; падать всей страницей в проде из-за одной регистрации
    не стоит.
41. **`Field.<Имя>` для `extraFields`** тем же механизмом? — _Рекомендую не в Е_: в `Field` встроенные и свои
    компоненты живут в одном пространстве, `Field.String` дублировал бы `string`. Добавить по первому запросу — код
    тот же, одно пространство в `FieldRegistryNamespace`.
42. **Заготовка компонента справочника** — nx-генератор `nx g @letar/generators:reference-select <app>
    --model=WorkCategory --kind=select` (пишет файл один раз, отказывается при существующем, печатает строку для
    `lazySelects`), а не плагин? — _Рекомендую да, после Е_, когда API этапов Б и Д устоится (§17.6, п. 2): плагин
    опубликован в npm и не должен знать раскладку монорепо, а «создать один раз» противоречит его модели «перезаписать
    всё».
43. **`relations=[…]` для `RelationFieldProvider`** — вместо генерации рантайм-хук `useZenStackRelations(client,
    formSchema)` в `@letar/forms-query/zenstack` (обходит поля формы с `fieldProps.relation`, берёт
    `client.<модель>.useFindMany`)? — _Рекомендую да, после Д_ (`forms-query` 0.3.0): всё, кроме хука, уже лежит в
    схеме; модель проверяет плагин на generate.
44. **Вторая строка опции:** вместо новой `form.optionHint` — `@meta("form.relation.descriptionField", …)` (уже
    проходит парсер), провайдер берёт его из meta поля, Select и Combobox рисуют `description` второй строкой? —
    _Рекомендую да, отдельным minor после этапа А_ (нужен `ItemText`), не в Е (§17.6, п. 5).
45. **Generic `createForm`** в этапе Е — опечатки `AppForm.Select.X` в JSX станут ошибками typecheck у потребителей?
    — _Рекомендую да_: без него `FormRegistryCheck` невозможен (индексная сигнатура стирает ключи), а опечатки сейчас
    падают только в рантайме. До релиза — прогон `typecheck:tsgo` всех потребителей `createForm` (Р16); проверочную
    строку в инстансе пишет человек (плагин не знает, где инстанс), образец — в доке (генератор `new-app` инстанс
    формы не создаёт: `createForm` есть только в его `files/PLAN.md.template`).

### 15. Поиск в `Field.Select` (этап В)

Запрос владельца: быстрый фильтр по тексту, когда вариантов много (10 и больше).

#### 15.1. Что есть сейчас

- `Field.Select` — zag select без поля ввода. Есть только typeahead по первым буквам: на триггере и на открытом
  списке, один печатный символ без Ctrl/Meta (`ZS/select.connect.mjs:182–228, 382–431`, `ZQ/typeahead.mjs:33–35`).
  JSDoc над `FieldSelect` обещает «advanced features (search, clear, custom rendering)» (`field-select.tsx:88–94`) —
  это неправда, исправляется в этапе А (§13).
- `Field.Combobox` уже умеет и async (`useQuery(search)`, `debounce` 300 мс, `minChars`; `field-combobox.tsx:247–256`),
  и статичные `options` с клиентским фильтром `contains` (`field-combobox.tsx:282, 305–309`), плюс `getGroup`,
  `getDisabled`, `onCreate`.

#### 15.2. Варианты и выбор

**(а) Поле поиска внутри выпадашки Select.** Проверено по исходникам — реализуемо на публичных частях Ark/Chakra:

- **zag предусматривает вложенный ввод.** Проп `composite` (по умолчанию `true`, `ZS/select.machine.mjs:25`;
  описание «composed with other composite widgets like tabs or combobox» — `ZS/select.types.d.ts:152–156`). При
  `composite: false` Content становится `role="dialog"`, а `role="listbox"` и `aria-activedescendant` уходят на
  отдельную часть `list` (`ZS/select.connect.mjs:372, 378, 433–440`). Chakra её экспортирует: `Select.List`
  (Chakra `components/select/select.js:37–38`, `namespace.js:2`).
- **Фильтрация коллекции.** Select перечитывает коллекцию по `collection.toString()` (`ZS/select.machine.mjs:125–127`).
  `syncCollection` сохраняет выбранные элементы через `selectedItemMap`, даже если их нет в новой коллекции
  (`ZS/select.machine.mjs:674–684` → `ZL/selection-map.mjs:4–15`): подпись выбранного значения в триггере не
  пропадает при фильтрации.
- **Подсветка.** Если подсвеченный пункт отфильтрован, `getNextValue` вернёт `null` (`ZL/list-collection.mjs:201–206`) —
  первая стрелка «пустая». Решение: при каждом изменении поиска `api.setHighlightValue(<первая доступная>)`
  (`ZS/select.connect.mjs:90–92`), при пустом результате — `clearHighlightValue()`.
- **Конфликт с клавишами listbox.** Печатные символы из редактируемого элемента Content в typeahead не забирает
  (`isEditableElement(target)` → return, `ZS/select.connect.mjs:422–425`). Но таблица клавиш исполняется **до** этой
  проверки (`:392–421`): пробел без активного typeahead превращается в Enter → `ITEM.CLICK` + `preventDefault`
  (выбрал бы пункт вместо ввода пробела), Home/End получают `preventDefault` (курсор в поле не двигается). Значит
  поле поиска гасит всплытие `keydown` для Space, Home, End и для Enter во время IME-композиции
  (`event.nativeEvent.isComposing`). ArrowUp/Down, Enter, Tab проходят к Content — это и есть нужная навигация.
- **Фокус.** При открытии Select фокусирует первый tabbable в Content (`ZS/select.machine.mjs:541–548` →
  `ZQ/initial-focus.mjs:6–16`) — поле поиска стоит первым и получает фокус без своего кода. На `pointer: coarse` —
  атрибут `data-no-autofocus` на поле (`initial-focus.mjs:13`): фокус уходит на следующий tabbable, клавиатура
  телефона не выскакивает. Закрытие → фокус на триггер (`ZS/select.machine.mjs:549–555`), как сейчас.
- **Tab.** При tabbable внутри Content Tab ходит между ними (`initial-focus.mjs:17–25`,
  `ZS/select.connect.mjs:385–390`). У `Select.List` `tabIndex: 0` (`ZS/select.connect.mjs:435`) — перекрыть
  `tabIndex={-1}`: пропсы Ark идут после пропсов zag (`ARK/select/select-list.js:10`), не-обработчики
  перезаписываются (`ZM`). Тогда Tab из поиска ведёт к кнопкам подвала/пустого состояния.
- **`closeOnSelect`** по умолчанию `true` (`ZS/select.machine.mjs:24`): выбор закрывает список, поиск сбрасывается.
- **ARIA.** Фокус в поле, а `aria-activedescendant` на List — скринридер подсветку не озвучит. Поэтому поле
  получает вручную `role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"`,
  `aria-controls=<id List>` (у List своего id нет, `ZS/select.connect.mjs:433–441` — задаём сами),
  `aria-activedescendant` = id подсвеченного пункта (формат `select:<id>:option:<value>`, `ZS/select.dom.mjs:8`;
  брать из `api.getItemProps({ item }).id`, не собирать строку) и `aria-label` из i18n. Content-диалог получает
  имя через `aria-labelledby` метки (`ZS/select.connect.mjs:380`), без метки — свой `aria-label`.
- **Готового паттерна «Select с поиском» в установленных Chakra 3.37 / Ark 5.39 нет** (ни компонента, ни хука). Есть
  ли пример в документации Chakra/Ark — **не проверено** (внешние сайты в этой сессии недоступны); `composite` и
  отдельная часть `list` — единственные признаки поддержки в коде.
- **Layout.** Content — `overflowY: auto` (`CR/select.js:54–72`): поле поиска `position: sticky; top: 0` на
  `bg.panel`, иначе уедет при прокрутке. Шрифт поля ≥ 16px — иначе iOS зумит страницу при фокусе.

**(б) Select при `searchable` рисует Combobox:**

- Кнопка-триггер превращается в поле ввода: у существующих потребителей с 10+ опциями меняется само закрытое поле.
  Пользователь может принять его за свободный текст.
- `renderValue` невозможен (в инпуте только строка, §9) — этап А для этих полей теряется.
- Смена 9→10 в рантайме = смена типа компонента: React перемонтирует Root, теряются фокус, открытое состояние и
  состояние zag; текст инпута нужно заново синхронизировать со значением (`field-combobox.tsx:260–279`).
- `value: ''` («Все категории») Combobox считает пустым (`value={currentValue ? [currentValue] : []}`,
  `field-combobox.tsx:391`) — вариант «Все» ломается, `hasEmptyOption` пришлось бы переносить.
- Уход из поля с недописанным текстом откатывает ввод (`revertInputValue`, `ZC/combobox.machine.mjs:437–443`), очистка
  чистит и текст, и значение (`:468–472`) — ещё два отличия от Select.
- Два пути рендера под одним полем: вдвое больше тестов и мест для слотов (`IndicatorGroup` Select и Combobox разные).
- Плюс: ARIA combobox готова из коробки.

**(в) Не делать поиск в Select, отправлять потребителей в Combobox** со статичными `options`. Отклонено: владелец
просит поиск именно в Select, а у Select свои плюсы — `renderValue`, `value: ''`, кнопка-триггер без клавиатуры на
телефоне.

**Выбор — (а).** Закрытое поле не меняется, `renderValue`, карандаш у значения и `value: ''` работают как есть. При
9→10 появляется или пропадает только строка поиска внутри списка, без перемонтирования. Один путь рендера — одна
копия слотов. Цена — ручная ARIA и гашение трёх клавиш (Р7), закрыто тестами 32, 36 и axe.

#### 15.3. API

```ts
// libs/forms, types/field-types.ts
export interface SelectSearchOptions<TData = unknown> {
  /** Поиск показывается, когда опций больше порога. По умолчанию 9 (то есть с 10). 0 — всегда */
  threshold?: number
  /** По умолчанию formSelection.search.placeholder — «Поиск…» */
  placeholder?: string
  /** Своё сообщение пустого результата. По умолчанию formSelection.combobox.emptyMessage — «Ничего не найдено» */
  emptyMessage?: string
  /** Свой предикат. По умолчанию contains без регистра и диакритики по getOptionText(option) */
  filter?: (option: SelectFieldOption<TData>, search: string) => boolean
}
export type SelectSearchable<TData = unknown> = boolean | 'auto' | SelectSearchOptions<TData>
// SelectFieldProps<TData>.searchable?: SelectSearchable<TData>   — по умолчанию 'auto'
// SelectFieldProps<TData>.renderEmpty?: (search: string) => ReactNode
```

- `'auto'` (по умолчанию) — поиск при числе опций > 9. `false` — выключить. `true` ≡ `{ threshold: 0 }` —
  всегда, даже при трёх опциях. Объект — `'auto'` со своими настройками.
- **Что считается.** Полный список после созданных опций и наложения правок (конвейер §6), без служебного пункта
  «+ Добавить». Отключённые опции считаются, заголовки групп — нет. Считается **нефильтрованный** список, иначе поле
  поиска исчезало бы при вводе.
- **Гистерезис.** Пока строка поиска непустая, поле поиска не исчезает, даже если опций стало ≤ порога (справочник
  перезапросился при открытом списке): иначе пользователь застрял бы в невидимом фильтре. На закрытии поиск
  сбрасывается.
- **Тексты** — i18n `formSelection.*`, резолв в `useFieldState` через `useSelectionString` (хуки в `render`
  запрещены, `field-combobox.tsx:357–358`). Новые ключи: `formSelection.search.placeholder` («Поиск…» / «Search…»),
  `formSelection.search.aria` («Поиск по списку» / «Search options»). Пустой результат — существующий
  `formSelection.combobox.emptyMessage` («Ничего не найдено», `selection-field-strings.ts:28`): одна строка на оба
  поля, без второго перевода.
- **Фильтр по умолчанию — тот же, что у Combobox.** Ark `useFilter({ sensitivity: 'base' })` (`field-combobox.tsx:282`)
  → zag `createFilter`: `Intl.Collator(locale, { usage: 'search', sensitivity: 'base' })`, NFC, поиск подстроки
  (`@zag-js+i18n-utils@1.41.2/.../dist/filter.mjs:3–36`), локаль — из `LocaleProvider` Ark
  (`@ark-ui/react/dist/providers/locale/use-filter.js:6–12`). Регистр и диакритика не учитываются; сливает ли
  `base` «ё» и «е» для `ru` — не проверено, закрыть тестом 30. **Раскладку сам по себе не учитывает** — решено добавить в этапе В (вопрос 16, решение владельца).
- Сравнивается `getOptionText` (`textValue` → строковый `label` → `String(value)`, §3), поэтому `ReactNode`-подписи и
  правки через `onUpdate` ищутся по своему тексту. Название группы в поиске не участвует (вопрос 21).

#### 15.4. Стыковка со слотами этапов А и Б

**Контракт `forms-core/uikit`:**

```ts
export interface UIKitSelectSearch {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
  ariaLabel: string
  /** value опций, прошедших фильтр. Коллекция строится по ним; выбранное и hasEmptyOption — по полному options */
  visibleValues: ReadonlySet<string>
}
// UIKitSelectProps.search?: UIKitSelectSearch   — undefined: поиска нет, поведение как сейчас
// emptyContent?: TNode переезжает из UIKitComboboxProps в UIKitSelectionSlotProps
```

Почему скин получает полный `options` + `visibleValues`, а не отфильтрованный список: `hasEmptyOption` и `selected`
(`uikit-chakra.tsx:167–171`) считаются по списку. Если «Все категории» (`''`) отфильтровать, `selected` стал бы `[]`
и поле визуально сбросилось бы посреди поиска.

**Чистые функции `forms-core`:** `resolveSearchable(searchable, count, query)` → `boolean` (порог и гистерезис),
`filterSelectionOptions(options, query, match)` — один фильтр для Select и для статичного пути Combobox
(`field-combobox.tsx:305–309` переходит на него; `match` скин передаёт свой — у Chakra `contains` из `useFilter`),
`resolveEmptyState` из §9.1. **`forms-react`:** `useSelectionSearch` — строка поиска, сброс на закрытии, итог
`resolveSearchable`. **Скин:** само поле, гашение клавиш, ARIA, автофокус, подсветка первой, sticky.

| Слот / фича (этапы А, Б)      | В режиме поиска                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderOption`                | без изменений: фильтр по тексту, отрисовка — узел                                                                                                                                                                          |
| `renderValue`                 | без изменений: триггер остаётся кнопкой, поиск — внутри списка                                                                                                                                                             |
| `EditButton` у значения       | без изменений (`IndicatorGroup`)                                                                                                                                                                                           |
| `EditButton` в пунктах, F2    | без изменений; F2 из поля поиска всплывает к Content, обработчик §7 берёт подсвеченный пункт                                                                                                                               |
| встроенный «+ Добавить»       | идёт **после** фильтра и сам не фильтруется. Поиск пуст — «+ Добавить…» → `onCreate('')`; поиск есть и точного совпадения нет (`shouldOfferCreate` по полному списку) — «+ Добавить "<поиск>"» → `onCreate(search.trim())` |
| `CreateButton`                | берёт `search` из контекста поля (§2.3) — у Select теперь настоящий текст                                                                                                                                                  |
| пусто                         | правило §9.1: сообщение (`renderEmpty` / `emptyMessage` / i18n) + пункт создания, при пустом результате он подсвечен первым                                                                                                |
| `createItem={false}`          | `renderEmpty` с `CreateButton` — в Select кнопка в пустом состоянии достижима Tab-ом                                                                                                                                       |
| `data`, `editable`, наложение | фильтр идёт после наложения (§6): подпись после правки находится поиском                                                                                                                                                   |

#### 15.5. Поведение

- Открыл список — поле поиска в фокусе (кроме тача). Ввёл текст — список сузился, первая доступная подсвечена,
  Enter выбирает её. Совпадений нет — сообщение и, при `onCreate`, пункт создания (подсвечен). Escape закрывает
  (слой dismissable zag), поиск сброшен.
- На закрытом триггере остаётся прежний typeahead zag (`ZS/select.connect.mjs:182–228`).
- `value: ''`: «Все категории» фильтруется как обычная опция, выбор не сбрасывается.
- `getGroup`: группы строятся только из оставшихся опций (`forms-core/uikit/group-options.ts:43–53`) — пустые
  группы исчезают сами; остались только опции без группы — список плоский.
- `valueType: 'number'`, `Form.UrlSync`, `onBlur` — путь значения не меняется.
- `disabled`/`readOnly` — список не открывается, поиска нет.
- **Смена числа опций в рантайме (9→10, 10→9):** тот же компонент, меняется только `search` в пропсах UIKit →
  появляется или исчезает строка поиска. Значение и фокус не трогаются, Root не перемонтируется. При открытом списке
  появление поля фокус не переносит (initial focus срабатывает только при открытии).

#### 15.6. shadcn

Поиск внутри Radix Select конфликтует с его фокусной моделью: наведение мышью переводит DOM-фокус на пункт
(`RX:877–883`), поле поиска его теряет; Content ловит любой одиночный символ для typeahead и гасит Tab
(`RX:499–501`); стрелки переводят реальный фокус на пункты (`RX:502–516`). Делать поиск поверх этого —
бороться с библиотекой. **Долг:** `forms-shadcn` принимает `searchable` в типах (паритет API), `'auto'` ничего не
делает, `true`/объект — один раз dev-предупреждение. Путь к паритету — Select с поиском на примитиве shadcn
Combobox (Popover) после его клавиатурного долга (§10); записать в план `forms-shadcn`.

#### 15.7. Async в Select — не нужен

`useQuery` в Select не добавляем. Select — конечный список, целиком известный на клиенте: подпись выбранного
значения берётся из `options`, `value: ''` работает, поиск фильтрует уже загруженное. Async тянет `debounce`,
`minChars`, загрузку, `initialLabel` — всё это уже есть в Combobox (`field-combobox.tsx:247–279`). Второй такой же
механизм в Select — два компонента, делающих одно. Если приложение само загрузило справочник (`options` из своего
запроса) — это по-прежнему Select.

Как документация разводит поля (`docs/fields.md`, `select.mdx`, страница Combobox, `form-mcp` `get_form_pattern`):

| Ситуация                                                                       | Поле                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------- |
| все варианты уже на клиенте (enum, справочник до сотен записей)                | `Select` — поиск появится сам с 10 опций           |
| варианты приходят с сервера по тексту поиска, растущий каталог, тысячи записей | `Combobox` + `useQuery`                            |
| свободный текст с подсказками                                                  | `Combobox` c `allowCustomValue` или `Autocomplete` |

В доке Select — строка «Справочник ищется на сервере? Нужен Combobox», в доке Combobox — «Все варианты уже есть на
клиенте? Хватит Select: поиск включится сам». Правило «растущий каталог → Combobox» в `.claude/rules/forms.md` уже
есть и не противоречит.

Пересмотрено с учётом ZenStack (§16.3): вывод тот же — `useQuery` в Select не нужен. Появляется только проп
`loading` у Select (справочник из `useFindMany` ещё грузится) и догрузка выбранной записи у Combobox (§16.4).

#### 15.8. Обратная совместимость

- Закрытое поле, значение, `onChange`, `UrlSync` — без изменений у всех.
- У Select с 10+ опциями в открытом списке появляется поле поиска с автофокусом. Печать после открытия фильтрует,
  а не прыгает typeahead-ом. «Префикс + Enter» даёт тот же результат (первая подходящая подсвечена), перебор
  повторным нажатием одной буквы больше не работает.
- При активном поиске Content меняет роль с `listbox` на `dialog`, listbox — это `List`. `getByRole('listbox')` и
  `getByRole('option', { name })` в e2e потребителей находят то же; e2e с `keyboard.type` после открытия — проверить
  прогоном до релиза.
- CHANGELOG: «Изменения поведения — у Select с 10+ опциями в выпадашке поле поиска; выключается
  `searchable={false}`».

#### 15.9. Этап, версии, синхронизация

**Отдельный этап В после Б, не внутри А.** Он опирается на Б (`search` и `runCreate` в контексте, `CreateButton`,
правило пустого результата §9.1) и на А (`getOptionText`, порядок конвейера опций). Он меняет видимое поведение
существующих потребителей — отдельный minor с отдельной строкой в CHANGELOG, его проще откатить или выключить.
Риски у него свои (клавиши и ARIA zag) и от А/Б не зависят.

Версии: `forms` 2.21.0, `forms-core` 0.18.0, `forms-react` 0.13.0, `forms-shadcn` 0.42.0 (только типы и
предупреждение). Шаги — §13 «Этап В». Цикл 6 групп:

1. `libs/forms`: CHANGELOG, README (пропсы `searchable` и `loading` — §16.3, если принят вопрос 23),
   `docs/fields.md` — раздел «Поиск в Select» и таблица §15.7.
2. `form-develop-app`: демо `/select-search-demo` — 9, 10 и 30 опций, группы, «Все» с `''`, `onCreate` с текстом
   поиска, переключатель числа опций в рантайме; e2e.
3. `form-docs`: `select.mdx` + `select.ru.mdx` (раздел «Поиск»), страница Combobox (строка про выбор поля).
4. `form-example`: выбор из длинного списка (например, регион) с поиском.
5. `NEW_COMPONENTS.md`.
6. `form-mcp`: `searchable` в `get_field_props`/`get_field_example`, правило выбора §15.7 в `get_form_pattern`.

### 16. ZenStack + TanStack Query

Дополнение владельца: приложения держат справочники на хуках ZenStack (`useFindMany*`/`useFindUnique*`/
`useCreate*`/`useUpdate*` поверх TanStack Query). Эта связка — основной сценарий для `options`, `onCreate`,
`onUpdate` и `useQuery`, и правила §6 должны на ней работать без сюрпризов.

✅ **Решения владельца 2026-09-26 (после первой версии §16):** оптимистичный режим поддерживаем в библиотеке
(§16.7, вопрос 28 изменён); два равноправных источника данных — хук TanStack Query и произвольный промис (§16.8);
привязка к TanStack Query — первоклассная, отдельным пакетом `@letar/forms-query` с подпутём `/zenstack` (§16.9,
вопрос 22 изменён).

#### 16.1. Как устроены хуки (проверено по исходникам)

Установлено: `@zenstackhq/tanstack-query` 3.9.5 (корневой `package.json:343`), `@tanstack/query-core` 5.103.2.
Сокращения: `ZQR/` = `node_modules/.bun/@zenstackhq+tanstack-query@3.9.5+07834b9a026b4f80/node_modules/@zenstackhq/tanstack-query/dist/`,
`ZCH/` = `node_modules/.bun/@zenstackhq+client-helpers@3.9.5+a3a44f2c05f1807a/node_modules/@zenstackhq/client-helpers/dist/`,
`TQ/` = `node_modules/.bun/@tanstack+query-core@5.103.2/node_modules/@tanstack/query-core/build/modern/`.

- **Хуки v3:** `useClientQueries(schema).<model>.useFindMany/useFindUnique/useCreate/useUpdate` (`ZQR/react.js:52,
  103–152`). Приложения часто оборачивают их в `useFindMany<Model>` — образец адаптеров
  `apps/form-develop-app/src/lib/hooks.ts`.
- **Запрос** — обычный `useQuery` TanStack с ключом ZenStack; второй аргумент хука распыляется в `useQuery`
  (`...options`, `ZQR/react.js:190–204`): можно передать `placeholderData`, `staleTime`, `enabled`.
- **Мутация по умолчанию** (без `optimisticUpdate`): в `onSuccess` сначала `await` инвалидации, потом
  пользовательский `onSuccess` (`ZQR/react.js:285–297`). Инвалидируются запросы затронутых моделей и запросы,
  читающие их вложенно (`ZCH/index.mjs:338–362`).
- **`invalidateQueries`** помечает запросы устаревшими и перезапрашивает **активные**; промис ждёт окончания
  всех перезапросов, ошибки перезапроса глотает (`TQ/queryClient.js:297–308, 324–334`). Запрос на паузе
  (офлайн) не ждётся (`:332`), `staleTime: 'static'` не перезапрашивается (`:329`).
- **`mutateAsync`** возвращает данные только после `onSuccess`/`onSettled` (`TQ/mutation.js:179–188`).
- **Итог:** `await update.mutateAsync(...)` возвращается, когда активный `useFindMany` **уже перезапрошен**. К
  моменту, когда `onUpdate`/`onCreate` отдаёт результат полю, у поля обычно уже новые `options`.
- **Оптимистичный режим** (`optimisticUpdate: true`): кэш правится сразу на `mutate`. `create` вставляет временную
  запись с чужим id (`crypto.randomUUID()` или max+1) и флагом `$optimistic` (`ZCH/index.mjs:471–505`, строки 502,
  504), `update` — копию с `$optimistic` (`:508–528`); инвалидация — на `onSettled` (`ZQR/react.js:298–317`).
  В приложениях монорепо `optimisticUpdate` не используется (поиск по `apps/` — 0 вхождений).

#### 16.2. Точное правило «мутация → рефетч → наложение»

Правило §6 не меняется («правка побеждает, пока приложение не пришлёт **другой** текст этой опции»). Ниже —
как оно ложится на хронологию ZenStack.

| # | Что произошло                                                                                                                                              | Что видит пользователь                                                                                                                                                                                                                                                                                                          |
| - | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Штатно: `await mutateAsync` → рефетч пришёл **до** резолва `onUpdate`                                                                                      | Новая подпись от приложения. При `apply` запись наложения заводится и тут же снимается прюнингом (текст приложения ≠ `baselineText`). Мигания нет: список закрыт, подпись уже новая                                                                                                                                             |
| 2 | То же при смене value (copy-on-write)                                                                                                                      | Пару миллисекунд триггер держит старую подпись из кеша выбранных zag (`ZL/selection-map.mjs:4–15`), затем `applyValue` переключает на новую запись                                                                                                                                                                              |
| 3 | Рефетч вернул **старую** подпись (реплика, HTTP-кеш), упал или стоял на паузе офлайн                                                                       | Результат `onUpdate` (текст приложения = `baselineText` → запись держится) до первой отличной подписи от приложения. Принято вопросом 5                                                                                                                                                                                         |
| 4 | Рефетча нет: `options` не из активного запроса (пропсы Server Component, `enabled: false`, другой ключ, `invalidateQueries: false`, `staleTime: 'static'`) | Результат `onUpdate` до смены данных. Для RSC — server action с `revalidatePath` или `router.refresh()` → новые пропсы → прюнинг                                                                                                                                                                                                |
| 5 | Приложение не ждёт мутацию (`mutate` без `await`) или возвращает введённое в окне, а не ответ сервера                                                      | Сразу введённое. Пришёл рефетч с текстом, отличным от `baselineText` (например сервер обрезал пробелы) → побеждает сервер. Правильно, но заметен скачок                                                                                                                                                                         |
| 6 | `optimisticUpdate` ZenStack (режим самой библиотеки — §16.7)                                                                                               | update: кэш с новой подписью уже на `mutate` → запись снимается сразу. create: на время запроса в `options` временная строка `$optimistic` с чужим id. Без маркера `pending` — выбираемый пункт с фальшивым id и дубль; с маркером — приглушённый, невыбираемый, а пока свой оптимистичный create поля в полёте — скрыт (§16.7) |
| 7 | `onCreate`: рефетч до резолва                                                                                                                              | Запись уже в списке приложения, `mergeCreatedOptions` отдаёт приоритет приложению (`creatable-options.ts:35–42`) — дубля нет                                                                                                                                                                                                    |

**Правила для приложений (в доку):**

1. Из `onUpdate`/`onCreate` возвращать **ответ сервера** — запись из `await mutateAsync(...)`, а не введённое в окне
   (строка 5 таблицы).
2. Ошибку мутации либо пробрасывать (станет unhandled rejection — политика `onCreate`), либо ловить, показывать
   тост и возвращать `null`.
3. Мгновенный отклик после окна — оптимистичный режим поля (`ctx.optimistic`, §16.7), он покрывает UI сам.
   `optimisticUpdate` ZenStack можно включать, но его строки `$optimistic` отмечать `pending: true` при маппинге
   (`useZenStackOptions` из `@letar/forms-query/zenstack` делает это сам) — тогда они видны, но не выбираются
   (строка 6).
4. `staleTime` на правило не влияет: инвалидация перезапрашивает активные запросы независимо от него. Исключение —
   `'static'` (строка 4).
5. Combobox с `useQuery`: передавать `placeholderData: keepPreviousData` вторым аргументом хука. Иначе на каждый
   новый поиск `data` пропадает до ответа и список мигает сообщением «Загрузка…» вместо прошлых результатов
   (`field-combobox.tsx:446–448`). Эту и `enabled` делает `fromSearchQuery` из `@letar/forms-query` (§16.9).

**Хелпер вроде `useOptionsFromQuery`.** Первая версия рекомендовала не делать. ✅ Владелец решил иначе
(вопрос 22): привязка к Query первоклассная — `useQueryOptions` и остальные адаптеры живут в отдельном пакете
`@letar/forms-query` (ZenStack — в его подпути `/zenstack`); ядро `@letar/forms` и `forms-core` по-прежнему не
зависят ни от TanStack Query, ни от ZenStack (§16.9).

**Тесты** (unit в `libs/forms` — без TanStack Query: «рефетч» имитируется перерендером с новыми `options` в нужный
момент относительно резолва промиса; настоящая связка — e2e):

- Z1 — новая подпись приходит до резолва `onUpdate`: итог — подпись приложения; следующая подпись от приложения
  тоже видна сразу (записи наложения не осталось).
- Z2 — «рефетч» со старой подписью: виден результат `onUpdate`; затем другая подпись — побеждает приложение.
- Z3 — «рефетч» после резолва с нормализованным текстом: сначала результат `onUpdate`, затем текст приложения.
- Z4 — copy-on-write + новый список до резолва: значение переключено на новый id, старой опции нет.
- Z5 — `onCreate` + список с новой записью до резолва: одна опция, значение выбрано.
- Z6 — опции `[]` (загрузка) → данные: выбранное значение показывается, `loading` у Select (§16.3).
- Z7 (`useSelected`) и Z8 (`RelationFieldProvider`) — в §12.
- **e2e** в `apps/form-develop-app` — там уже ZenStack v3, модель `Category` с `@@allow('all', true)`
  (`schema.zmodel:56–72`) и адаптеры `useFindManyCategory`/`useCreateCategory` (`src/lib/hooks.ts:73–82`;
  адаптера `update` для `Category` там нет — добавить). Демо на настоящих `useFindMany`/`useCreate`/
  `useUpdate`: правка категории карандашом → подпись в списке и триггере новая без перезагрузки, после `update` —
  ровно один запрос `findMany` в сети; создание из Select с поиском → запись выбрана, дубля нет.

#### 16.3. Select и «много записей из запроса» — пересмотр §15.7

- **(а) Справочник целиком из `useFindMany`** (десятки–сотни строк): для поля это обычные `options`, клиентский
  поиск Select (`searchable`) подходит. Ориентир для доки — до нескольких сотен записей, которые не растут без
  предела.
- **(б) Тысячи записей или поиск на сервере:** Combobox + `useQuery(search)` или промис `loadOptions(search)` (§16.8).

**Чего не хватает Select для (а) — состояния загрузки.** Пока `useFindMany` грузится, `options = []`: список пуст,
а у выбранного значения нет подписи. zag показывает пустую строку (нет ни в коллекции, ни в кеше выбранных,
`ZL/selection-map.mjs:4–15`), и `ValueText` рисует placeholder (`children || select.valueAsString || placeholder`,
`ARK/select/select-value-text.js:15`) — поле выглядит
пустым, хотя значение есть. Нужен проп `loading?: boolean`: спиннер в `IndicatorGroup` (как у Combobox,
`field-combobox.tsx:436`), в списке — `formSelection.combobox.loadingMessage`, в триггере при непустом значении —
тот же текст вместо placeholder. Этап В, вопрос 23. `useQuery` в Select по-прежнему не нужен: весь список
приложение и так получает снаружи через `useFindMany`, а поиск на сервере — работа Combobox.

**Как `useQuery` Combobox стыкуется с ZenStack сейчас:**

- Тип: `AsyncQueryFn<TData> = (search) => { data?: TData[]; isLoading?; error? }` (`libs/forms-react/src/lib/field/use-async-search.ts:9–19`).
  Результат хука ZenStack подходит структурно (`{ queryKey, ...useQuery() }`, `ZQR/react.js:197–203`).
- Хук вызывается в `useFieldState` на каждом рендере; до `minChars` — с пустой строкой
  (`use-async-search.ts:123, 127`), то есть запрос с `contains: ''` всё равно уходит и отдаёт первую страницу. Не нужен
  запрос без текста — `enabled: search.length > 0` во втором аргументе хука.
- Вызов хука внутри стрелки требует отключения правила хуков (`apps/driving-school/.../combobox-lesson-type.tsx:35–37`) —
  это цена API, менять не предлагаю.
- `getLabel`/`getValue` получают `unknown`, приложения приводят типы вручную (`combobox-lesson-type.tsx:47–48`),
  потому что `createField` возвращает не-generic компонент. Этап А (generic `ComboboxFieldComponent`, §2.3) это
  чинит: `TData` выводится из результата `useQuery`. Проверить вывод при порядке пропсов `useQuery` → `getLabel`
  тем же compile-only тестом (§12, п. 6).
- `debounce` 300 мс по умолчанию (`field-combobox.tsx:255`) и кеш TanStack по ключу вместе дают один запрос на
  паузу в наборе; повтор того же текста берётся из кеша.

#### 16.4. Выбранная запись вне выдачи Combobox — `useSelected` (к вопросу 7)

Вопрос 7 закрыт как «принять, кешировать последнюю выбранную». С `useFindUnique` есть штатный путь лучше —
предлагаю **дополнительный необязательный** проп, решение за владельцем (вопрос 24):

```ts
// ComboboxFieldProps<T, TData>
/**
 * Догрузка выбранной записи по value, когда её нет в текущей выдаче. Вызывается как хук на каждом рендере
 * (правила хуков): при пустом value приложение само выключает запрос через `enabled`
 */
useSelected?: (value: string) => { data?: TData | null; isLoading?: boolean }

// <Form.Field.Combobox
//   useQuery={(s) => client.workCategory.useFindMany({ where: { name: { contains: s } }, take: 20 })}
//   useSelected={(id) => client.workCategory.useFindUnique({ where: { id } }, { enabled: !!id })}
//   getLabel={(c) => c.name} getValue={(c) => c.id} />
```

- Что даёт: подпись выбранного значения в форме редактирования без ручного `initialLabel` (он остаётся для
  совместимости и имеет приоритет); `data` для `renderOption`, карандаша у значения и `onUpdate` (закрывает дыру
  вопроса 7); после правки `findUnique` той же модели инвалидируется вместе с `findMany` (`ZCH/index.mjs:345–351`) —
  подпись свежая.
- Цена: один запрос на поле с непустым значением при монтировании; TanStack дедуплицирует по ключу.
- Select такой проп не нужен: весь список у него на руках (при загрузке — `loading`, §16.3).
- Этап Б, шаг 4 (Combobox): без этого карандаш у значения вне выдачи получает опцию без `data`.
- Пара для промис-пути — `loadSelected(value, { signal })` (§16.8, этап Г); `useSelected` без хука-обёртки над
  `useFindUnique` — `fromSelectedQuery` из `@letar/forms-query` (§16.9).

#### 16.5. Схемная генерация (`zenstack-form-plugin`, `field-type-mapper.tsx`)

**Как сейчас:**

- `@meta("form.props.<ключ>", значение)` → любой UI-проп поля; вложенный путь собирается в объект
  (`setDeep`, `libs/zenstack-form-plugin/src/parser.ts:151–163`, вызов `:209–211`), не-Zod ключи уходят в
  `uiProps` (`parser.ts:80–96`). В рантайме это `fieldProps`, они распыляются в поле **после** `options`
  (`field-type-mapper.tsx:370–371`). Известные ключи директив — `parser.ts:100–109`; объектный литерал в `@meta`
  ломает `zenstack generate` (`parser.ts:125–128`, комментарий к `metaValueToPlain`).
- `@meta("form.relation.labelField"/"model")` → `fieldProps.relation` → `SchemaFieldWithRelations` берёт опции из
  `RelationFieldProvider` по модели (`field-type-mapper.tsx:500–515`). Провайдер зовёт хук приложения
  (`useQuery(queryArgs)` — обычно ZenStack `useFindMany`) и строит опции в эффекте (`relation-field-provider.tsx:111–138`).
- Пробелы: запись в опции не кладётся (только `value`/`label`/`description`, `relation-field-provider.tsx:128–134`) —
  `data` пуста; relation + `fieldType: "combobox"` опций не получает вовсе (`field-type-mapper.tsx:374–375`);
  служебный `fieldProps.relation` распыляется в поле как лишний проп.

**Рекомендация — минимальный набор:**

1. **Скалярные новые пропсы — через существующий `form.props.*`, новых директив нет.** Работают сразу:
   `@meta("form.props.searchable", false)`, `@meta("form.props.searchable.threshold", 20)` (соберётся в
   `{ threshold: 20 }`), `@meta("form.props.createItem", false)`, `@meta("form.props.createLabel", "Новая категория…")`.
   В `form-mcp` `get_directives` — добавить эти примеры.
2. **Функции** (`renderOption`, `renderValue`, `onCreate`, `onUpdate`, `useSelected`) в схему не выносим: в ZModel нет
   функций, а окно и мутации — логика приложения. Два пути:
   - **основной — компонент-справочник в `createForm`-инстансе**: опция `lazySelects: { WorkCategory: () =>
     import('./selects/work-category-select').then((m) => m.WorkCategorySelect) }` (`create-form.tsx:111`; функции
     `lazySelects(...)` в библиотеке нет, см. §17.8), внутри `useFindMany` + `useCreate`/`useUpdate` + окно; в форме
     `<AppForm.Select.WorkCategory name="categoryId" />`, в `Form.AutoFields` это поле — в `exclude` и рядом явно
     (до этапа Е; с этапа Е — ключом в схеме, §17);
   - **для автоформ — `RelationConfig.fieldProps`** (вопрос 25): `fieldProps?: Partial<SelectFieldProps>` в конфиге
     модели у `RelationFieldProvider`. Функции там допустимы: конфиг собирается в компоненте приложения, хуки
     мутаций доступны. `SchemaFieldWithRelations` добавляет их к полю. Плюс `data: record` в опциях провайдера.
     Один раз на модель — «категория с созданием и правкой во всех автоформах».
3. ~~**Не делаем:** `form.fieldType` со ссылкой на компонент инстанса (`"Select.WorkCategory"`) — маппер работает по
   фиксированному `switch` (вопрос 26).~~ **Пересмотрено владельцем 2026-09-26:** делаем, этап Е (§17).
4. **Попутно (этап Б):** relation + `fieldType: "combobox"` — отдавать опции провайдера в Combobox как статичные
   `options`; `relation` не распылять в поле (вопрос 27).

#### 16.6. Пример для доки (нейтральная модель)

```zmodel
model WorkCategory {
  id          String  @id @default(cuid())
  name        String  @meta("form.title", "Название")
  description String? @meta("form.title", "Описание") @meta("form.fieldType", "textarea")
  works       Work[]
  @@allow('all', auth() != null)
}
```

**Пример 1 — ZenStack/TanStack Query** (хук-путь, Select со всем справочником, оптимистичный режим):

```tsx
'use client'
// selects/work-category-select.tsx — справочник в extraSelects инстанса приложения
import { useZenStackOptions } from '@letar/forms-query/zenstack'

export function WorkCategorySelect(props: { name: string; label?: string }): ReactElement {
  const client = useClientQueries(schema)
  // options + loading; строки $optimistic ZenStack → pending (видны, не выбираются), data = запись
  const categories = useZenStackOptions(
    client.workCategory.useFindMany({ orderBy: { name: 'asc' } }),
    (c) => ({ label: c.name, value: c.id }),
  )
  const create = client.workCategory.useCreate()
  const update = client.workCategory.useUpdate()
  const dialog = useWorkCategoryDialog() // окно приложения: Promise + resolver, внутри — своя AppForm

  return (
    <>
      <FieldSelect
        {...props}
        {...categories.fieldProps}
        renderOption={(o) => <OptionWithHint title={o.label} hint={o.data?.description} />}
        onCreate={async (search, { optimistic }) => {
          const input = await dialog.open({ name: search })
          if (!input) { return null }
          optimistic({ label: input.name }) // окно закрыто — новая запись видна и выбрана сразу
          const c = await create.mutateAsync({ data: input }) // ответ сервера, а не input
          return { label: c.name, value: c.id, data: c }
        }}
        onUpdate={async (o, { optimistic }) => {
          const input = await dialog.open(o.data)
          if (!input) { return null }
          optimistic({ label: input.name, data: { ...o.data, ...input } })
          const c = await update.mutateAsync({ where: { id: String(o.value) }, data: input })
          return { label: c.name, value: c.id, data: c }
        }}
        onSettleError={({ preview }) => toast.error(`Не удалось сохранить «${preview.label}»`)}
      />
      {dialog.element}
    </>
  )
}
```

**Пример 2 — свой запрос без TanStack** (промис-путь Combobox, server actions; `@letar/forms-query` не нужен):

```ts
'use server'
// actions/work-categories.ts
export async function searchWorkCategories(search: string): Promise<WorkCategoryDto[]> {/* ORM, take: 20 */}
export async function getWorkCategory(id: string): Promise<WorkCategoryDto | null> {/* ... */}
export async function createWorkCategory(input: { name: string }): Promise<WorkCategoryDto> {/* ... */}
```

```tsx
<AppForm.Field.Combobox
  name="categoryId"
  label="Категория"
  loadOptions={(search) => searchWorkCategories(search)}
  loadSelected={(id) => getWorkCategory(id)}
  getLabel={(c) => c.name}
  getValue={(c) => c.id}
  onCreate={async (search, { optimistic }) => {
    optimistic({ label: search })
    const c = await createWorkCategory({ name: search })
    return { label: c.name, value: c.id, data: c } // после подтверждения поле само перезапросит поиск
  }}
  onLoadError={() => toast.error('Не удалось загрузить категории')}
/>
// Вариант с fetch — сигнал отменяет устаревший запрос по-настоящему:
// loadOptions={(s, { signal }) => fetch(`/api/work-categories?q=${encodeURIComponent(s)}`, { signal }).then((r) => r.json())}
```

- Окно — своя форма приложения на `@letar/forms` внутри Chakra Dialog; её `submit` во внешнюю форму не всплывает
  (корень формы гасит всплытие, §5). Сырой `<form>` в окне недопустим.
- Пример 1: правка и создание работают без ручной инвалидации — к возврату `mutateAsync` список уже перезапрошен
  (§16.1). Мутация через server action или процедуру ZenStack (`$procs`, без автоинвалидации — `ZQR/react.js:281`) —
  обёртка `useInvalidateModels` из `@letar/forms-query/zenstack` (§16.9).
- Пример 2: server action `AbortSignal` не принимает — сигнал только перестаёт ждать ответ, гонки закрывает номер
  запроса (§16.8). Текст ошибки server action в production стирается
  ([разбор](/.claude/docs/nextjs-server-action-thrown-error-message-stripped.md)) — сообщение в `onLoadError` своё.
- Модель, имена и тексты — нейтральные; в публичной доке без справочников приватных приложений.

#### 16.7. Оптимистичный режим (✅ решение владельца 2026-09-26, вопрос 28)

**Цель.** Окно правки или создания закрылось — пользователь сразу видит результат (новую подпись, выбранную новую
запись) и не ждёт сервер с рефетчем (сотни миллисекунд — секунды). Подтверждение приходит в фоне; при отказе поле
откатывает показанное и сообщает приложению.

**Контракт — второй аргумент обработчика, а не объединённый тип результата.**

```ts
// forms-core/uikit (creatable-options.ts, editable-options.ts)
export interface SelectionActionContext<TData = unknown> {
  /**
   * Показать результат сразу, не дожидаясь сервера. Звать, когда ввод пользователя уже принят (окно закрыто),
   * до await мутации. value у create не передают — поле заведёт временный (только для UI, в форму не пишется)
   */
  optimistic: (preview: { label: string; value?: string | number; data?: TData }) => void
}
export type CreateOptionHandler<TData = unknown> = (
  search: string,
  ctx: SelectionActionContext<TData>,
) => Promise<CreatedOption<TData> | null>
export type UpdateOptionHandler<TOption, TData = unknown> = (
  option: TOption,
  ctx: SelectionActionContext<TData>,
) => Promise<UpdatedOption<TData> | null>

export interface SettleErrorInfo<TData = unknown> {
  kind: SelectionActionKind // 'create' | 'edit'
  preview: { label: string; value: string | number; data?: TData }
  /** throw / null от обработчика после optimistic / нет ответа за settleTimeout */
  reason: 'rejected' | 'declined' | 'timeout'
  error?: unknown
}
// SelectFieldProps и ComboboxFieldProps: onSettleError?(info), settleTimeout?: number (по умолчанию 30 000)
```

Почему не `Option | null | { optimistic: Option; settled: Promise<Option | null> }`:

1. Обработчик остаётся одной async-функцией с одним типом результата: существующие `onCreate`/`onUpdate` не
   меняются (второй аргумент игнорируют), вывод `TData` тот же, объединение не надо сужать ни в библиотеке, ни в
   тестах.
2. Код с окном читается сверху вниз: `await dialog` → `optimistic(...)` → `await mutateAsync`. С объединённым типом
   объект надо вернуть до `await` мутации, а `settled` собрать руками (`mutateAsync(...).then(toOption)`); ошибки
   окна и мутации ловились бы в двух местах.
3. Поле точно знает конец интерактивной фазы — момент вызова `optimistic` — и освобождает конвейер `run` (§5).
4. Отказ — один канал: reject или `null` того же промиса.

**Фазы действия** (дополняют конвейер `run`, §5):

1. **Интерактивная** — как сейчас: `pending` поля, список закрыт, окно приложения; второе действие игнорируется.
2. **Ожидание подтверждения** — с вызова `optimistic(preview)`. `pending` поля снят, поле снова отвечает.
   - edit: запись наложения (§6) с `preview.label`/`data` и пометкой «ждёт»; value опции не меняется.
   - create: в `createdOptions` — опция `{ value: временный, label, data, pending: true }`; ставится **ожидающий
     выбор** — только в UI (ниже).
   - действие регистрируется в реестре ожидания формы (ниже).
3. **Подтверждение** — промис вернул опцию: `apply` как сейчас (§6; другой value — правило вопроса 4, замена на
   месте). Временная опция заменяется настоящей. Если ожидающий выбор всё ещё этот — `handleChange(настоящий value)`:
   одно изменение значения формы, не два.
4. **Отказ** — `null` после `optimistic`, reject или таймаут: запись наложения или временная опция удаляются,
   ожидающий выбор снимается (значение формы не менялось — откатывать нечего), вызывается `onSettleError`. Без
   `onSettleError` поле показывает под собой встроенное сообщение (`role="status"`, i18n
   `formSelection.settleError`: «Не удалось сохранить «{label}»»); сообщение исчезает при следующем действии в поле.
   Это не ошибка валидации (не в `errorMap`) и отправку не блокирует. Reject **после** `optimistic` поле ловит само —
   необработанного отказа нет; reject **до** `optimistic` — как сейчас (политика `onCreate`, §16.2, правило 2).
   Ответ, пришедший после таймаута, игнорируется: запись, если сервер её создал, появится после рефетча.

**Главное правило: временный id в значение формы не попадает.** Ожидающий выбор живёт только в состоянии поля:
zag получает `value = [временный]` (триггер и список показывают новую запись), а форма хранит прежнее значение до
подтверждения. Почему так, а не «пишем временный id и учим потребителей его пропускать»:

- значение формы читают валидаторы, черновик `useFormPersistence`, автосохранение, `Form.UrlSync`, `DirtyGuard`,
  `Form.Watch`/`DependsOn`, `onFieldChange`, аналитика форм — пришлось бы учить каждого, и следующий новый
  потребитель забудет;
- у `valueType: 'number'` строковый временный id сломал бы тип значения;
- откат при отказе тривиален — форма не менялась.

Цена (в доку): зависимые поля (`Form.Watch`, `DependsOn`, каскадные Select) реагируют после подтверждения, а не
сразу; пока ждём, ошибка валидации этого поля (например «обязательно») скрыта — поле показывает ожидание, а не
ошибку. Нужна мгновенная реакция зависимых полей — оптимистичный режим у этого поля не включать.

**Реестр ожидания на уровне формы.** Штатного места в TanStack Form нет: `canSubmit` считается только из валидации и
`isSubmitting` (`TFC/FormApi.js:1146–1147`), а `handleSubmit` сначала проверяет все поля (`:523`) и только потом
вызывает `onSubmit` со значением на этот момент (`:566–570`). Ждать внутри `onSubmit` или асинхронного валидатора
поздно: обязательное поле, чьё значение ещё не записано, провалит проверку раньше. (`TFC/` =
`node_modules/.bun/@tanstack+form-core@1.33.5/node_modules/@tanstack/form-core/dist/esm/`.) Поэтому реестр свой:

- `forms-core`: `createPendingRegistry()` — стор без React: `add(promise) → снять`, `subscribe`,
  `getSnapshot(): { count; submitQueued }`, `settleAll(): Promise<boolean>` (все подтвердились?).
- `forms-react`: поле `pending` в `DeclarativeFormContextValue` (контекст — `libs/forms-react/src/lib/context/form-context.tsx:10`);
  корни `form-simple.tsx`/`form-with-api.tsx` создают реестр и кладут в контекст; `useSelectionActionsState`
  регистрирует фазы 2–3 каждого действия.
- **Отправка.** DOM-обработчик корня (`form-simple.tsx:221–224`, `form-with-api.tsx:239–242`) вместо прямого
  `form.handleSubmit()` зовёт `submitWhenSettled()`: реестр пуст → `handleSubmit()` в том же тике (поведение без
  изменений); не пуст → `submitQueued = true`, `await settleAll()`, при успехе `handleSubmit()` (значение уже
  настоящее), при отказе — отправка отменена, фокус на поле с отказом, его сообщение видно. Повторный клик или Enter,
  пока `submitQueued`, игнорируется.
- **`Form.Button.Submit`** подписан только на `isSubmitting` (`button-submit.tsx:37–43`) → `loading` при
  `isSubmitting || submitQueued`. Во время ожидания кнопка активна: нажатие ставит отправку в очередь — лучше, чем
  серая кнопка без объяснения.
- **Программный `form.handleSubmit()`** реестр обходит. В контекст — `submit()` (тот же `submitWhenSettled`), в доке —
  «отправлять через него»; dev-предупреждение в `onSubmit`-обёртке корня (`form-simple.tsx:121`), если реестр не
  пуст. Внутри самой библиотеки прямые вызовы тоже есть — их перевести на `submit()` в том же шаге: навигация шагов
  (`libs/forms/.../form-steps/form-steps-navigation.tsx:150`, `libs/forms-react/.../steps/use-step-navigation.ts:256`,
  `libs/forms-shadcn/.../steps/form-steps-navigation.tsx:90`) и автоотправка OTP в shadcn
  (`libs/forms-shadcn/.../fields/field-otp-input.tsx:68`).
- **`DirtyGuard`**: `checkIsDirty` (`dirty-guard.tsx:188–191`) = `isDirty || pending.count > 0` — уход со страницы
  в момент подтверждения теряет выбор, это несохранённое изменение.
- Черновик, автосохранение, `UrlSync` правок не требуют: временного id в значении нет. Ожидающий выбор в черновик не
  попадает — после перезагрузки его нет, и это верно: запись не подтверждена.

**Крайние случаи.**

1. **Пользователь выбрал другое, пока create ждёт** → ожидающий выбор снят, выбор пользователя записан в форму
   сразу. Подтверждение: опция добавляется в список без выбора. Отказ: временная опция исчезает, `onSettleError`
   вызывается, встроенное сообщение — нет (выбор не пострадал).
2. **Внешняя смена значения** (`reset`, `setFieldValue`, восстановление черновика) при ожидающем выборе → как в п. 1.
3. **Два оптимистичных create подряд** → второй разрешён сразу после `optimistic` первого; ожидающий выбор — у
   последнего, первый по подтверждению попадает в список без выбора. Реестр ждёт оба, отправка — после обоих.
4. **Повторный `onUpdate` той же опции**, пока её правка ждёт, и правка опции, чей create ждёт, — запрещены: у
   опции в ожидании нет карандаша, F2 на ней игнорируется. Иначе два подтверждения спорят за её value.
5. Правка **другой** опции во время ожидания — разрешена.
6. **Размонтирование поля** при живой форме (`Form.When` скрыл поле) → его записи в реестре снимаются как
   «отменены» (не отказ): отправку не держат и не отменяют. Мутации на сервере продолжаются, результат поле
   игнорирует (`mountedRef`, §5).
7. **Размонтирование формы** → реестр уходит вместе с ней.
8. **`optimistic` вызван дважды** → действует последний вызов, dev-предупреждение; после резолва обработчика —
   игнорируется.
9. **Обработчик не вызвал `optimistic`** → поведение как сейчас, фоновой фазы нет.
10. **Отправка в очереди, подтверждение — отказ** → отправка отменена (см. «Отправка»).
11. **Подтверждённый value уже есть в списке приложения** (рефетч успел) → `mergeCreatedOptions`, дубля нет
    (§16.2, строка 7).

**Опции `pending` от приложения (ZenStack `optimisticUpdate`).** Новое поле `BaseOption.pending` (§2.2).

- Ядро `$optimistic` не читает. Маркер ставит тот, кто маппит данные: приложение (`pending: !!c.$optimistic`) или
  `useZenStackOptions` из `@letar/forms-query/zenstack` (§16.9).
- Рендер: пункт приглушён (как disabled), на месте карандаша — маленький спиннер, `data-pending`,
  `aria-disabled="true"`; в коллекции zag — disabled: не выбирается ни мышью, ни клавиатурой, typeahead и поиск
  Select его пропускают. Своя опция поля в фазе ожидания выглядит так же. Выбранное значение в ожидании — спиннер в
  `IndicatorGroup` триггера и `aria-busy="true"` на триггере. `OptionRenderState.pending` отдаёт это же своему
  `renderOption`.
- `EditButton` на опции в ожидании не рендерится (`useSelectionEditButton` → `null`), F2 игнорируется.
- Выбранное значение стало `pending` (копия ZenStack при update — тот же id) → остаётся выбранным, только приглушено.
- Пока у поля свой оптимистичный create в полёте, `pending`-опции приложения скрыты: это почти всегда та же запись
  (ZenStack вставил её в кэш той же мутацией), иначе в списке две «Кровли». В доке: оптимизм поля и
  `optimisticUpdate` ZenStack совместимы, но достаточно одного — поля.

Тесты — §12, группа O; этап — Д (§13).

#### 16.8. Два источника данных: хук и промис (✅ решение владельца 2026-09-26)

Равноправно: хук TanStack Query/ZenStack и произвольный асинхронный запрос (server action, `fetch`, SDK без
TanStack). Оба пути — в ядре `@letar/forms`; отдельный пакет (§16.9) не нужен ни одному из них, он лишь упрощает
хук-путь.

**Хук-путь (есть, не меняется):** `useQuery?: AsyncQueryFn<TData>` (`use-async-search.ts:9–19`). Оговорки для доки:
хук вызывается на каждом рендере и с `''` до `minChars` (`:123, 127`) — ставить `enabled`; против мигания —
`placeholderData: keepPreviousData`; дебаунс делает поле, отмену и гонки — TanStack по ключу запроса. Обе оговорки
закрывает `fromSearchQuery` из `@letar/forms-query`.

**Промис-путь (новый, Combobox):**

```ts
export interface LoadContext {
  /** Отменяется, когда запрос устарел (новый ввод) или поле размонтировано */
  signal: AbortSignal
}
/** Записи по строке поиска; маппинг — те же getLabel/getValue/getGroup/getDisabled, что у useQuery */
export type LoadOptionsFn<TData> = (search: string, ctx: LoadContext) => Promise<TData[]>
/** Выбранная запись по value — пара к useSelected */
export type LoadSelectedFn<TData> = (value: string, ctx: LoadContext) => Promise<TData | null>
```

`TData[]`, а не готовые опции: один маппинг на оба асинхронных пути, переход `useQuery` ↔ `loadOptions` не трогает
остальные пропсы, `TData` выводится из результата промиса, а server actions обычно и так отдают записи.

Поведение (`forms-react`, общий с `useAsyncSearch` источник поиска):

1. **Дебаунс и порог** — те же `debounce` (300) и `minChars`. Ниже `minChars` запроса нет (в отличие от хук-пути);
   `minChars: 0` — запрос с `''` при открытии (стартовая выдача).
2. **Отмена.** Свой `AbortController` на запрос; новый запрос отменяет предыдущий, размонтирование — текущий. Отказ с
   `AbortError` или при `signal.aborted` — не ошибка.
3. **Гонки.** Номер запроса: применяется только результат последнего, даже если загрузчик `signal` игнорирует
   (server actions).
4. **Загрузка.** Прошлые результаты остаются на экране со спиннером — то, что хук-путь получает через
   `keepPreviousData`, здесь по умолчанию.
5. **Ошибка.** `error` в состоянии поля; в списке — `formSelection.combobox.errorMessage` («Не удалось загрузить») и
   кнопка «Повторить» в том же месте, что пустое состояние (§9.1), доступная с клавиатуры. Прошлые результаты при
   ошибке скрыты — иначе неясно, к какому запросу они относятся. **Автоповторов нет**: повтор — кнопкой, следующим
   вводом или повторным открытием; сетевые повторы — дело загрузчика. `onLoadError?: (error: unknown) => void` —
   для лога или тоста.
6. **После подтверждённого `onCreate`/`onUpdate`** поле само перезапрашивает текущий поиск: внешнего кэша, который
   обновил бы список, здесь нет. Наложение §6 работает как в строках 1 и 3 таблицы §16.2.
7. **Кэша по строкам поиска в ядре нет** — из-за инвалидации: после правки записи в любом другом месте кэш ядра
   показывал бы старое, а узнать о правке ему неоткуда. Нужен кэш — `useLoaderQuery` из `@letar/forms-query` делает из
   того же загрузчика TanStack-запрос с ключом (кэш, дедуп, инвалидация по ключу). Исключение — `loadSelected`:
   результаты по value хранятся в экземпляре поля (иначе запрос на каждом открытии), сброс после `onUpdate` этой
   записи.
8. `loadSelected` вызывается, когда value непустой, его нет в текущих результатах и нет `initialLabel`; отмена — как в
   п. 2.

**Ровно один источник — в типах.** Сейчас «взаимоисключающие» только в JSDoc (`field-combobox.tsx:34`), при обоих
побеждает `options` (`:305` раньше `:313`). Предлагаю объединение с `?: never`:

```ts
type GetItem<TData> = { getLabel: (item: TData) => ReactNode; getValue: (item: TData) => string }
type ComboboxSource<T, TData> =
  | { options: ComboboxFieldOption<T, TData>[]; loading?: boolean; useQuery?: never; loadOptions?: never }
  | (GetItem<TData> & {
    useQuery: AsyncQueryFn<TData>
    useSelected?: (value: string) => { data?: TData | null; isLoading?: boolean }
    options?: never
    loadOptions?: never
  })
  | (GetItem<TData> & {
    loadOptions: LoadOptionsFn<TData>
    loadSelected?: LoadSelectedFn<TData>
    onLoadError?: (error: unknown) => void
    options?: never
    useQuery?: never
  })
export type ComboboxFieldProps<T = string, TData = unknown> =
  & ComboboxFieldBaseProps<T, TData>
  & ComboboxSource<T, TData>
```

- `getLabel`/`getValue` становятся обязательными для асинхронных путей (сейчас «Required when using useQuery» — только
  JSDoc, `field-combobox.tsx:54, 60`).
- `useSelected` — только с `useQuery`, `loadSelected` — только с `loadOptions`.
- Цена: `interface` → пересечение типов; `Partial<…>` в `RelationConfig.fieldProps` (§16.5) распределяется по
  объединению — проверить compile-only тестом. Места, где сейчас передают и `options`, и `useQuery`, перестанут
  компилироваться — перед релизом `typecheck:tsgo` всех потребителей (сколько таких мест — не проверено). Для JS и
  распыления `any` — dev-предупреждение при двух источниках.

**Select — без `loadOptions`.** Поиск Select — фильтр по полному списку на клиенте (§15); загрузчик по строке поиска
превратил бы Select в Combobox другого вида. Сценарий «весь список приходит из server action или `fetch`» — разовая
загрузка, а не запрос на каждый поиск. Для неё и для хук-пути — одна форма «список из любого источника»:

```ts
/** Что понимают Select и Combobox со статичными options — одинаково в Chakra и shadcn */
export interface OptionsSourceProps<TOption> {
  options: TOption[]
  loading: boolean
}

// ядро (@letar/forms): разовая загрузка промисом — отмена при смене deps и размонтировании, гонки, без кэша
export function useOptionsLoader<TOption>(
  load: (ctx: LoadContext) => Promise<TOption[]>,
  deps: DependencyList,
): { fieldProps: OptionsSourceProps<TOption>; error: unknown; reload: () => void }

// @letar/forms-query: из результата хука; /zenstack — то же с маркером $optimistic → pending
// useQueryOptions(result, map) / useZenStackOptions(result, map) → { fieldProps, error }

// <Field.Select name="regionId" {...regions.fieldProps} />
```

Ошибку разовой загрузки Select показывает приложение (`error` из хука): свой текст и повтор через `reload`.

#### 16.9. Пакет `@letar/forms-query` (✅ решение владельца 2026-09-26, вопрос 22)

Владелец: интеграция с TanStack Query — **отдельный пакет**, чтобы её не грузили те, кому она не нужна (заменяет
первую версию — подпуть `@letar/forms/query`).

**Что проверено:**

- в `@letar/forms` ни одна точка входа от TanStack Query не зависит: `exports` — `.`, `./offline`, `./i18n`,
  `./validators/ru`, `./server-errors`, `./captcha/server`, `./analytics`, `./testing` (`libs/forms/package.json:13–63`),
  `peerDependencies` без `@tanstack/react-query` (`:64–73`), поиск `@tanstack/react-query|query-core` по
  `libs/forms*/src` — 0 вхождений;
- ядро уже работает с хуками ZenStack **структурно**, без импорта: `useFormApi` (`use-form-api.ts:27–43`), типы
  `UseQueryHook`/`UseCreateHook`/`UseUpdateHook` (`types/form-types.ts:206–246`), `RelationFieldProvider`, `useQuery`
  Combobox. Поэтому хук-путь остаётся в ядре, а пакет — только адаптеры;
- `forms-core`/`forms-react` в npm не публикуются: `@letar/forms` и `@letar/forms-shadcn` держат их в
  `devDependencies` и вбандливают (`noExternal` + `dts.resolve`, `libs/forms/tsup.config.ts`,
  `libs/forms-shadcn/tsup.config.ts:22, 28`) — правило
  [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md), чек-лист «Новая внутренняя
  зависимость»;
- ключ запроса ZenStack — `['zenstack', model, operation, args, flags]` (`ZQR/common/query-key.js:12–17`); из пакета
  наружу экспортирован только `getQueryKey` (`ZQR/react.js:11`, `exports` — `./react`, `./vue`, `./svelte`);
  `invalidateQueries({ queryKey })` совпадает по префиксу (`TQ/utils.js:35–38, 95–103`); мутации процедур
  (`$procs`) ZenStack не инвалидирует (`ZQR/react.js:281`).

**Имя — `@letar/forms-query`, каталог `libs/forms-query`.** По соглашению семейства `forms-<слой>` (`forms-core`,
`forms-react`, `forms-shadcn`): префикс — экосистема форм, суффикс — с чем связывает. `query` — имя продукта
(TanStack Query) и то же слово, что в подпути `@letar/hooks/query`. `forms-tanstack-query` длиннее без выигрыша в
ясности. Тег релиза — `forms-query-v<semver>`.

**Зависимости:**

| Что                                   | Где в `package.json` пакета                                                       | Почему                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@letar/forms-core` (только типы)     | `devDependencies`; `dts.resolve: [/^@letar\//]`; рантайм-импортов нет             | контракт опций и обработчиков; если понадобится рантайм (например `mergeCreatedOptions`) — `noExternal`, как у `forms`/`forms-shadcn`                    |
| `@letar/forms`, `@letar/forms-shadcn` | **нигде**, кроме `devDependencies` для compile-only теста совместимости           | пакет не импортирует скины → нет цикла и нет привязки к Chakra; работает одинаково с обоими                                                              |
| `@tanstack/react-query >=5`           | `peerDependencies`, обязательный                                                  | `useQuery`, `useQueryClient`                                                                                                                             |
| `react`                               | `peerDependencies`                                                                | хуки                                                                                                                                                     |
| `@zenstackhq/tanstack-query >=3`      | `peerDependencies` + `peerDependenciesMeta.optional`; импорт только в `/zenstack` | обычный пользователь Query не тянет ZenStack; `/zenstack` берёт `getQueryKey` из `@zenstackhq/tanstack-query/react`, а не хардкодит префикс `'zenstack'` |

**Точки входа и состав:**

| Экспорт                                                                      | Что делает                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@letar/forms-query`: `fromSearchQuery(useHook, { minChars? })` → `useQuery` | зовёт хук `(search, queryOptions)` со вторым аргументом `{ enabled: search.length >= minChars, placeholderData: keepPreviousData }` — обе оговорки хук-пути                                                          |
| `fromSelectedQuery(useHook)` → `useSelected`                                 | `enabled: !!value`                                                                                                                                                                                                   |
| `useQueryOptions(result, map, { isPending? })` → `{ fieldProps, error }`     | `data` → опции (`data: row` сам), `loading` из `isLoading`; `isPending(row)` → `pending: true`                                                                                                                       |
| `useLoaderQuery(key, loadOptions)` → `useQuery`                              | промис-загрузчик → `useQuery({ queryKey: [...key, search], queryFn: ({ signal }) => load(search, { signal }), placeholderData, enabled })`: кэш, дедуп, инвалидация по ключу для промис-пути                         |
| `useInvalidateAfter(queryKeys)` → `(handler) => handler`                     | обёртка `onCreate`/`onUpdate`: после резолва `await queryClient.invalidateQueries(...)`, затем возврат опции — правило §16.2 «рефетч до возврата» для обычных `useMutation` и `fetch`                                |
| `@letar/forms-query/zenstack`: `useZenStackOptions(result, map)`             | `useQueryOptions` с `isPending: (row) => row.$optimistic === true` — защита от временных строк ZenStack (§16.7)                                                                                                      |
| `useInvalidateModels(models)` → `(handler) => handler`                       | для мутаций мимо хуков ZenStack (server action, процедура `$procs`): после резолва инвалидирует все запросы моделей по префиксу `getQueryKey(...)` и ждёт рефетч; вложенные чтения других моделей — не ловит, в доке |

- Хуки ZenStack сами инвалидируют после `useCreate`/`useUpdate` (§16.1) — для них обёртка не нужна; в доке это первым
  пунктом, чтобы не звали инвалидацию дважды.
- **Цикла нет:** граф — `forms-query → forms-core` (типы); `forms → forms-core`, `forms-shadcn → forms-core`; ни один
  скин не зависит от `forms-query`. Compile-only тест совместимости в `libs/forms-query` берёт `@letar/forms` и
  `@letar/forms-shadcn` как `devDependencies` — это ребро только для тестов, не для сборки.
- **Совместимость версий.** Типы `forms-core` вбандливаются и в скин, и в пакет — совпадение структурное. Разойтись
  они могут, только если меняется форма контракта опций или обработчиков; такие изменения — minor обоих пакетов
  сразу, в README пакета — таблица «`forms-query` x.y ↔ `forms` ≥ … / `forms-shadcn` ≥ …». Peer на `@letar/forms`
  не ставим: пользователь shadcn-скина не должен ставить Chakra-скин.

**Заведение и публикация:**

1. Каркас — `nx g @letar/generators:new-lib forms-query --react --description="Интеграция @letar/forms с TanStack Query"`.
   Публикационных файлов генератор не создаёт (в `libs/generators/src/generators/new-lib` нет `tsup`/`build:npm` —
   проверено поиском), их добавляют по чек-листу «Новый пакет» из npm-publish-from-monorepo: `package.publish.json`
   (`exports` `.` и `./zenstack`, peer и `peerDependenciesMeta`, без `version`), `scripts/write-publish-package-json.mjs`,
   `tsup.config.ts` (`entry: { index, zenstack }`, `external` — `react`, `@tanstack/react-query`,
   `@zenstackhq/tanstack-query/react`), таргеты `build:npm`/`publish:npm` — по образцу `libs/forms-shadcn/project.json:143–176`.
2. `package.json` пакета: `exports` `.` и `./zenstack` с условием `@letar/source` (как у `libs/forms/package.json`).
3. `.github/workflows/publish-npm.yml`: тег `'forms-query-v*.*.*'` в `on.push.tags` (`:9–12`; шаблон `forms-v*.*.*` его
   не ловит — после `forms-` должно стоять `v`) и `'@letar/forms-query'` в списке `workflow_dispatch` (`:20–22`).
   Разбор тега общий (`SHORT="${TAG%-v*.*.*}"` → `@letar/forms-query`, `:49–51`) — правок не требует. Комментарий в
   `:36` про список npm-библиотек — дополнить.
4. `nx release`: `releaseTagPattern` в `nx.json` не задан (`nx.json:172–197`), тегов `forms-v*` в локальном
   репозитории нет (`git tag`) — каким тегом фактически публиковали `@letar/forms` и совпадает ли тег `nx release`
   с `<project>-v*`, **не проверено**; до первого релиза сверить, при необходимости задать `releaseTagPattern` в
   `project.json` пакета.
5. Тест «пакет не тянет лишнего» в `libs/forms-query`: собранный `dist/index.js` не содержит
   `@zenstackhq/tanstack-query` (всё ZenStack — только в `dist/zenstack.js`); в `libs/forms` — собранный
   `dist/index.js` не содержит `@tanstack/react-query` (regex по файлу, как
   [dual-use-engine-browser-safe-import-guard](/.claude/docs/dual-use-engine-browser-safe-import-guard.md)).
6. `form-mcp`: паттерн «справочник из ZenStack/Query» с импортами из пакета; `libs/forms/README.md` — раздел
   «Интеграции» со ссылкой на пакет.

### 17. Автопривязка справочников и кодогенерация из ZModel (этап Е)

✅ **Решение владельца 2026-09-26, пересмотр вопроса 26.** Идея владельца: генератор ZenStack видит схему — привязку
поля к справочнику можно автоматизировать. Ответ координатора, принятый за основу: строковый ключ в схеме; реестр
`extraSelects`/`extraComboboxes` из `createForm` доходит до `Form.AutoFields` через контекст; плагин генерирует
типизированный список ключей. Окно создания и правки, `renderOption`, тексты и валидация не автоматизируются.
`RelationConfig.fieldProps` (вопрос 25) остаётся для лёгкого случая. Этап Е идёт **после А–Д и их не блокирует**.

#### 17.1. Что проверено по коду

- **Реестр до автоформ не доходит.** `createForm` собирает `ExtendedSelect`/`ExtendedCombobox`/`ExtendedListbox`
  (`create-form.tsx:367–381`) и кладёт их только в свойства объекта инстанса (`:406–408`). `AutoFields` — общий
  `Form.AutoFields` (`:415`), про реестр он не знает.
- **Прецедент контекста инстанса есть:** корень `ExtendedFormRoot` (`create-form.tsx:385–401`) уже оборачивает форму
  в `CaptchaContext` (`:395–398`). Корень есть у любой формы инстанса.
- **Типы реестра — индексная сигнатура:** `ExtendedFormSelect`/`ExtendedFormCombobox` = `{ [key: string]: AnyComponent }`
  (`create-form.tsx:245–251`), `createForm` не generic (`:337`). Поэтому `AppForm.Select.Опечатка` сейчас
  компилируется и падает только в рантайме.
- **Lazy готов как есть:** `createLazyComponents` (`create-form.tsx:353–355`) отдаёт компоненты уже в `Suspense` со
  `Skeleton` (`lazy-component.tsx:21, 43`). Отдельной работы для `lazySelects` не нужно.
- **Два входа маппера:** `SchemaFieldWithRelations` (`field-type-mapper.tsx:500–515`, вызов из
  `form-auto-fields.tsx:87, 93`) и `Form.Field.Auto` (`form-fields/auto/field-auto.tsx:258–275`, свой вызов
  `renderFieldByType`, опций провайдера не получает). Ключ нужно понимать в обоих.
- **Неизвестный тип молча становится текстовым полем:** явный `fieldType` имеет приоритет (`field-type-mapper.tsx:104–108`),
  `default` в `renderFieldByType` → `FieldString` без предупреждения (`:460–462`).
- **`fieldType` из схемы typecheck не проверяет вообще.** `FieldComponentType` — закрытый union
  (`forms-core/src/lib/schema/types/meta-types.ts:20–74`), но сгенерированный код пишет его в `.meta({ ui })`, а у Zod
  `GlobalMeta extends JSONSchemaMeta { [k: string]: unknown }` (`zod@4.6.5 v4/core/registries.d.ts:24–31`); расширения
  `GlobalMeta` в `libs` нет (поиск). Тип проверяется только там, где аргумент объявлен `FieldUIMeta`: `withUIMeta`
  (`with-ui-meta.ts:209`), `relationMeta`, `commonMeta` (`common-meta.ts:14`).
- **Плагин:** `form.fieldType` принимает любую строку (`parser.ts:205–206`) и пишет её как есть
  (`model-generator.ts:920–922`). Выход — файл на модель и на enum плюс `index.ts` (`generator.ts:109–128`), опции —
  `output`, `i18n`, `locales` и др. (`generator.ts:14–46`). Сгенерированные файлы импортируют только `zod/v4` и
  `@zenstackhq/zod` (`apps/form-develop-app/src/generated/form-schemas/Recipe.form.ts:4–5`) — от `@letar/forms` не
  зависят.
- **Баг плагина, который этап Е вызовет.** `generateUIMeta` пишет ключ `fieldProps` дважды, если у поля есть и
  `form.props.*`, и `form.relation.*` (`model-generator.ts:923–928`). Дубль ключа в объектном литерале — ошибка TS1117
  по спецификации; в JS побеждает последний, то есть `form.props.*` теряются. Тест есть только на `relation` отдельно
  (`model-generator.spec.ts:1153–1167`); в текущих схемах сочетания нет (поиск `form.relation` по `*.zmodel` — три поля,
  без `form.props`). **Запуском не проверено.** С ключами сочетание станет обычным (ключ + `form.props.createItem`) —
  чинить первым шагом.
- **Мульти-файловая схема:** `loadDocument(…, mergeImports = true)` вливает декларации импортированных файлов в
  `model.declarations` (`@zenstackhq/language@3.9.5 dist/index.mjs:6939, 7017–7023`), а плагин обходит именно
  `model.declarations` (`generator.ts:94–100`). Значит ключи из фрагментов `libs/*.zmodel` попадут в список приложения.
  Что CLI вызывает `loadDocument` с умолчанием `mergeImports` — **не проверено**.
- **`form-mcp`:** `get_directives` (`libs/form-mcp/src/index.ts:131–144`) берёт описания из
  `data/directive-registry.ts:24–96`; `generate_form` (`index.ts:146–166`) строит форму из списка полей, а не из схемы.
  В реестре директив неточность: `form.relation` описан как `ui: { fieldType: "combobox", relation }`
  (`directive-registry.ts:74`), а плагин пишет `fieldProps: { relation }` и `fieldType` сам не ставит
  (`model-generator.ts:926–927`, `Recipe.form.ts`).
- **Вторая строка опции уже почти есть:** у провайдера `RelationConfig.descriptionField` → `description` опции
  (`relation-field-provider.tsx:55, 133`), но Select и Combobox `description` не рисуют (поиск `.description` по
  `form-fields/selection` — только карточные поля).
- **Хуки ZenStack v3 в приложении** берутся через `useClientQueries(schema).<модель>.useFindMany`, `schema` — из
  `@/generated/schema` (`apps/form-develop-app/src/lib/hooks.ts:12–31`). Путь зависит от раскладки приложения.

#### 17.2. Синтаксис ключа: `form.fieldType` с пространством имён

| Вариант                                                          | Плюсы                                                                                                                                                                | Минусы                                                                                                                                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(а)** `@meta("form.fieldType", "Select.WorkCategory")`         | одна директива отвечает на вопрос «какой компонент»; повторяет JSX `AppForm.Select.WorkCategory`; парсер уже принимает (`parser.ts:205`); одно описание в `form-mcp` | встроенные типы и ключи в одном поле; нужен шаблонный тип в `FieldComponentType`                                                                                                       |
| **(б)** `@meta("form.select", "WorkCategory")` / `form.combobox` | ключ виден отдельно                                                                                                                                                  | два способа сказать «какой компонент» и противоречивые пары (`form.fieldType: "tags"` + `form.select`); новые ключи в `parser.ts:100–109`, `FormFieldMeta`, `FieldUIMeta` и `form-mcp` |

**Рекомендую (а)** (вопрос 39). Встроенные типы — camelCase без точки, ключи — `Пространство.Имя` с заглавной; путаницы
нет. Грамматика ключа: `^(Select|Combobox|Listbox)\.[A-Z][A-Za-z0-9]*$` — имя должно быть допустимым свойством
инстанса. `Listbox` — для симметрии с `extraListboxes`, цена нулевая. `Field.<Имя>` для `extraFields` — не в Е
(вопрос 41).

Типы в `forms-core` (`meta-types.ts`):

```ts
/** Пространства реестра createForm, на которые можно сослаться из схемы */
export type FieldRegistryNamespace = 'Select' | 'Combobox' | 'Listbox'

/** Ссылка на компонент реестра: 'Select.WorkCategory' */
export type FieldRegistryType = `${FieldRegistryNamespace}.${string}`

export type FieldComponentType = // …встроенные типы без изменений
  FieldRegistryType

/** Разбор ссылки на реестр; null — встроенный тип или неверный синтаксис */
export function parseFieldRegistryType(
  fieldType: string,
): { namespace: FieldRegistryNamespace; key: string } | null
```

`parseFieldRegistryType` — чистая функция в `forms-core` с той же регуляркой, что у плагина (одно правило в двух
местах, покрыто тестами E1 и P1). Существующие потребители union не ломаются: `SelectionFieldType` — `Extract` по
литералам (`common-meta.ts:35–38`), исчерпывающих `switch` без `default` по этому типу в `libs` нет (у
`renderFieldByType` есть `default`).

#### 17.3. Реестр в контексте и выбор компонента

- **Контекст.** Новый `FormRegistryContext` в `libs/forms/src/lib/declarative/form-registry-context.tsx`, значение —
  `{ Select, Combobox, Listbox }`: те же объекты, что свойства инстанса (`create-form.tsx:367–381`). Они создаются один
  раз на вызов `createForm`, ссылка стабильна — лишних перерисовок нет. `ExtendedFormRoot` оборачивает форму **всегда**
  (не только при `captcha`); порядок с `CaptchaContext` не важен. Хук `useFormRegistry(): FormRegistry | null`.
- **Выбор.** Новый компонент `RegistryField` вызывается до `renderFieldByType` в обоих входах: в
  `SchemaFieldWithRelations` и в `Form.Field.Auto` (перед `field-auto.tsx:262`). `renderFieldByType` остаётся чистой
  функцией без хуков — её экспортируют наружу (`declarative/index.ts:561`).

  ```tsx
  // Поле со ссылкой на реестр createForm: fieldType = 'Select.WorkCategory'
  function RegistryField({ reference, field, baseProps, fieldProps }: RegistryFieldProps) {
    const registry = useFormRegistry()
    const Component = registry?.[reference.namespace][reference.key]
    if (!Component) {
      return <RegistryFallback reference={reference} field={field} registry={registry} />
    }
    // Служебный relation в компонент не распыляем: справочник грузит данные сам
    const { relation: _relation, ...rest } = fieldProps ?? {}
    return <Component {...baseProps} {...rest} />
  }
  ```

- **Пропсы компоненту:** `name`, `label`, `placeholder`, `helperText`, `required` (у `Field.Auto` — ещё `disabled`,
  `readOnly` и остаток JSX, как сейчас), затем `fieldProps` без `relation`. Опции провайдера не передаются. Контракт
  для доки: компонент реестра принимает пропсы `Form.Field.Select`/`Form.Field.Combobox` без `options` — обычная
  обёртка так и устроена. На компиляции это не проверить: реестр типизирован `ComponentType<any>`
  (`create-form.tsx:71`).
- **Lazy** — без доработок: пока грузится чанк, виден `Skeleton`. SSR — как у ручного `<AppForm.Select.X>`; ловушка
  зависшего серверного Suspense закрыта в 2.7.1
  ([letar-forms-lazy-component-ssr-stuck-suspense](/.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md)).
- **Ключ + `form.relation.*` на одном поле:** побеждает ключ, `relation` игнорируется; плагин предупреждает при
  generate, маппер — dev-предупреждением.
- **Fallback** (вопрос 40):

  | Ситуация                                                  | dev и тесты (`NODE_ENV !== 'production'`)                                                                                                                           | production                                                                                                                                                                                 |
  | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | ключа нет в реестре                                       | исключение: «Поле `categoryId`: ключ `Select.WorkCategory` не найден в реестре createForm. Есть: `Unit`, `Status`. Добавьте его в `extraSelects` или `lazySelects`» | `console.error` один раз на ключ; базовое поле по пространству: `Select.` → `select` (с опциями провайдера, если у поля есть `relation`), `Combobox.` → `combobox`, `Listbox.` → `listbox` |
  | форма не из `createForm` (`Form` напрямую), контекста нет | исключение: «ключ реестра работает только в форме createForm-инстанса»                                                                                              | то же, что строкой выше                                                                                                                                                                    |

  Почему исключение в dev: сейчас неизвестный тип тихо становится текстовым полем. Для справочника это ⚠️ ловушка,
  которая выглядит как успех — поле есть, ввод пишет строку во внешний ключ. Почему не в prod: одна пропущенная
  регистрация не должна гасить всю страницу. `NODE_ENV=production` стоит и на staging
  ([node-env-not-production-signal](/.claude/docs/node-env-not-production-signal.md)) — там поведение как в проде, e2e
  проверяет поле по роли и кнопке создания, а не по отсутствию падения (Р13).
- **Попутно:** `default` в `renderFieldByType` (`field-type-mapper.tsx:460–462`) — dev-предупреждение на неизвестный
  встроенный тип (опечатка `"selct"`). Тот же класс тихого успеха, цена — одна строка.
- **Отладка «магии»:** `displayName` у `RegistryField` — `RegistryField(Select.WorkCategory)`, в React DevTools видно,
  откуда компонент; в тексте dev-исключения — места использования ключа из `formRegistryUsages` (§17.4).

#### 17.4. Тип ключей: что ловит typecheck, что только рантайм

Плагин видит схему, но не видит `createForm`. Связь — через сгенерированный файл и проверку в инстансе.

**Плагин** пишет `<output>/form-registry-keys.ts` всегда (пустые пространства — `[]`), без опции, и добавляет его в
`index.ts`:

```ts
// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

/** Ключи реестра createForm, на которые ссылается schema.zmodel */
export const formRegistryKeys = {
  Select: ['WorkCategory'],
  Combobox: ['Counterparty'],
  Listbox: [],
} as const

export type FormSelectKey = (typeof formRegistryKeys.Select)[number]
export type FormComboboxKey = (typeof formRegistryKeys.Combobox)[number]
export type FormListboxKey = (typeof formRegistryKeys.Listbox)[number]

/** Где используется ключ: для сообщений об ошибках и ревью */
export const formRegistryUsages = {
  'Select.WorkCategory': ['Work.categoryId', 'Estimate.categoryId'],
  'Combobox.Counterparty': ['Work.counterpartyId'],
} as const
```

Файл без импортов: плагин не начинает зависеть от `@letar/forms`, файл компилируется в любом приложении.

**`@letar/forms`: generic `createForm` и проверочный тип** (вопрос 45):

```ts
export interface ExtendedForm<
  TSelectKey extends string = string,
  TComboboxKey extends string = string,
  TListboxKey extends string = string,
> {
  Select: Record<TSelectKey, AnyComponent>
  Combobox: Record<TComboboxKey, AnyComponent>
  Listbox: Record<TListboxKey, AnyComponent>
  // …остальное без изменений
}

// createForm выводит ключи из extraSelects + lazySelects (и так же для Combobox/Listbox)

/**
 * true, если все ключи схемы есть в реестре инстанса. Иначе — объект с недостающими ключами:
 * ошибка присваивания покажет их в тексте. Индексная сигнатура (инстанс аннотирован `: ExtendedForm`)
 * — тоже ошибка, иначе проверка тихо зеленела бы.
 */
export type FormRegistryCheck<
  TForm,
  TSelectKey extends string,
  TComboboxKey extends string = never,
  TListboxKey extends string = never,
> = /* … */
```

Умолчание `string` сохраняет нынешнее поведение: аннотация `: ExtendedForm` (есть в одном приложении, поиск
`: ExtendedForm =`) компилируется. В приложении:

```ts
import type { FormComboboxKey, FormSelectKey } from '@/generated/form-schemas'

export const AppForm = createForm({
  lazySelects: {
    WorkCategory: () => import('./selects/work-category-select').then((m) => m.WorkCategorySelect),
  },
  lazyComboboxes: {
    Counterparty: () => import('./comboboxes/counterparty-combobox').then((m) => m.CounterpartyCombobox),
  },
})

// Все ключи из schema.zmodel зарегистрированы — проверяется typecheck'ом
export const appFormRegistryCheck: FormRegistryCheck<typeof AppForm, FormSelectKey, FormComboboxKey> = true
```

Почему не `extraSelects: Record<FormSelectKey, …>`: ключи разнесены по двум опциям (`extra*` и `lazy*`), ни одна
по отдельности не обязана покрывать весь список. И без generic не поймать опечатку в JSX.

| Что                                                                                     | Где ловится                                                                        |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| неверный синтаксис ключа, неизвестное пространство                                      | **generate**, ошибка плагина с `Модель.поле`                                       |
| `form.relation.model` — нет такой модели; `labelField`/`descriptionField` — не поле     | **generate**, предупреждение (старые схемы не роняем)                              |
| ключ из схемы не зарегистрирован в инстансе                                             | **typecheck** — при строке `FormRegistryCheck`                                     |
| инстанс аннотирован `: ExtendedForm` (ключи стёрты до `string`)                         | **typecheck** — `FormRegistryCheck` даёт ошибку                                    |
| опечатка `AppForm.Select.WorkCategry` в JSX                                             | **typecheck** — с generic `createForm`                                             |
| `fieldType: 'Foo.X'` в ручном `withUIMeta`/`relationMeta`                               | **typecheck** — шаблонный тип (наличие ключа — нет)                                |
| строка `FormRegistryCheck` не написана                                                  | только рантайм (dev-исключение)                                                    |
| форма не из `createForm`, но с `AutoFields` по схеме с ключами                          | только рантайм                                                                     |
| `form-registry-keys.ts` устарел (схему правили, generate не запускали)                  | только рантайм: typecheck зелёный на старом списке (Р15)                           |
| компонент не принимает пропсы поля или не подходит к типу значения (ключ на `String[]`) | только рантайм                                                                     |
| в приложении несколько инстансов `createForm` с разными реестрами                       | typecheck проверяет тот инстанс, для которого написана строка; остальные — рантайм |

#### 17.5. Граница с вопросом 25 (`RelationConfig.fieldProps`)

|                | Ключ реестра (этап Е)                                                            | `RelationConfig.fieldProps` (этап Б)                                 |
| -------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| где логика     | компонент приложения: свои хуки, окно, `useSelected`, оптимизм, `renderOption`   | конфиг модели у `RelationFieldProvider`                              |
| где работает   | `Form.AutoFields`, `Form.Field.Auto` и явный JSX `<AppForm.Select.WorkCategory>` | только автоформы с провайдером                                       |
| откуда опции   | компонент грузит сам                                                             | провайдер, один запрос на модель на форму                            |
| когда выбирать | справочник с окном создания и правки, нужен и в ручных формах                    | лёгкий случай: подписи, `renderOption`, короткий `onCreate` без окна |

Правило для доки: поле встречается и в ручных формах или у него своё окно → компонент и ключ; только автоформы и
короткие обработчики → `RelationConfig.fieldProps`. На одном поле оба — побеждает ключ (§17.3).

#### 17.6. Варианты кодогенерации из ZModel

| №  | Вариант                                                                                                           | Польза                                  | Цена, риски, отладка                                                                                                                                                                                                                                                                                                                                                                                                                                              | Владелец кода           | Решение                                                                                 |
| -- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| 1  | Список ключей `form-registry-keys.ts` + проверки на generate                                                      | высокая: ключи проверяются typecheck'ом | малая; файл без импортов, регенерируется целиком, магии нет                                                                                                                                                                                                                                                                                                                                                                                                       | плагин                  | **Е, минимум**                                                                          |
| 2  | Заготовка компонента справочника (`useFindMany`/`useCreate`/`useUpdate`, `onCreate`/`onUpdate`, пустой слот окна) | средняя: меньше рутины                  | шаблон зависит от API этапов Б/Д и от раскладки приложения (`src/<app>-form/selects/`, путь `@/generated/schema`, `useClientQueries` — `hooks.ts:12–13`); плагин опубликован в npm и про раскладку монорепо знать не должен; «создать один раз» противоречит модели плагина «перезаписать всё» (`generator.ts:109–128`, шапка `DO NOT EDIT`)                                                                                                                      | человек после генерации | **Отложить**, не в плагине: nx-генератор (вопрос 42)                                    |
| 3  | `relations=[…]` для `RelationFieldProvider` с `labelField`/`queryArgs`                                            | средняя                                 | всё, кроме хука, уже лежит в схеме (`fieldProps.relation.model/labelField`); кодоген дал бы файл с импортом клиента ZenStack по пути приложения. Лучше рантайм без файла (вопрос 43)                                                                                                                                                                                                                                                                              | —                       | **Отложить**: рантайм-адаптер в `forms-query/zenstack`                                  |
| 4  | Заготовка окна создания и правки из form-схемы модели                                                             | низкая                                  | окно — это форма модели, рантайм уже умеет: `<AppForm schema={WorkCategoryCreateFormSchema}><AppForm.AutoFields /></AppForm>` в диалоге. Кодоген дал бы копию, которая расходится со схемой                                                                                                                                                                                                                                                                       | —                       | **Не делать**; пример в доке (§16.6)                                                    |
| 5  | `@meta("form.optionHint", "description")` → вторая строка опции                                                   | средняя                                 | новая директива не нужна: `@meta("form.relation.descriptionField", "note")` уже проходит парсер (`relation.*` через `setDeep`, `parser.ts:209–214`), провайдер умеет `descriptionField` (`relation-field-provider.tsx:55, 133`). Не хватает двух вещей: провайдер берёт `descriptionField` из meta поля, если нет в конфиге; Select/Combobox рисуют `description` второй строкой                                                                                  | библиотека              | **Отложить** в отдельный minor, не `optionHint` (вопрос 44)                             |
| 6  | Полный «справочник модели»: список + форма + окно                                                                 | высокая для админок                     | это CRUD-экран, а не поле формы; тянет таблицы, пагинацию, права. Граница ответственности `@letar/forms` — поле и форма                                                                                                                                                                                                                                                                                                                                           | —                       | **Не делать** в формах; место — `libs/admin-ui` или приложение                          |
| 7  | Директивы для пропсов этапов А–Г                                                                                  | —                                       | скаляры уже идут через `form.props.*` (§16.5, п. 1): `searchable`, `searchable.threshold`, `createItem`, `createLabel`, `settleTimeout`, `minChars`. Функции (`onCreate`, `onUpdate`, `renderOption`, `renderValue`, `loadOptions`, `loadSelected`, `useSelected`, `onSettleError`) — нельзя: в `@meta` только литералы (`parser.ts:125–128`). Для полей с ключом `form.props.*` доходят до компонента через `fieldProps` — компонент обязан их распылять (§17.3) | —                       | **Новых директив нет**                                                                  |
| 8  | «Создать один раз» против регенерации                                                                             | —                                       | смешение двух режимов в одном инструменте — главный источник «магии»: непонятно, какой файл можно править                                                                                                                                                                                                                                                                                                                                                         | —                       | **Правило:** плагин — только регенерируемое; всё, что правит человек, — nx-генератор    |
| 9  | Мульти-файловая схема и фрагменты `libs/*.zmodel`                                                                 | —                                       | ключи из фрагмента попадают в список каждого приложения, которое его импортирует (§17.1), — каждое обязано зарегистрировать компонент. Это правильно: ключ во фрагменте — требование к потребителю. `formRegistryUsages` пишет `Модель.поле` без имени файла; доступно ли имя файла из AST (`$document`) — не проверено                                                                                                                                           | плагин                  | **Е**: строка в README `libs/zenstack-fragments` — ключи во фрагментах только осознанно |
| 10 | `form-mcp`: `generate_reference_select` или обновить `generate_form`                                              | низкая                                  | текстовый шаблон дублировал бы nx-генератор из п. 2; `generate_form` строит форму из списка полей, не из схемы — к ключам не относится                                                                                                                                                                                                                                                                                                                            | —                       | **Е**: только `get_directives` и `get_form_pattern` (ниже); новых инструментов нет      |

**Итог.**

- **В этапе Е (минимум):** контекст реестра, `RegistryField`, fallback, dev-предупреждение на неизвестный тип;
  `FieldRegistryType` и `parseFieldRegistryType` в `forms-core`; generic `createForm` и `FormRegistryCheck`; в плагине —
  разбор и проверка ключей, `form-registry-keys.ts`, проверка `form.relation.*` по моделям схемы, починка двойного
  `fieldProps`; в `form-mcp` — описание ключа в `get_directives` (и исправление описания `form.relation`), паттерн
  «справочник по ключу из схемы» в `get_form_pattern`.
- **Отложить:** nx-генератор заготовки справочника (после Е, когда API Б и Д устоится; вопрос 42);
  `useZenStackRelations` в `@letar/forms-query/zenstack` вместо генерации `relations=[…]` (после Д, `forms-query`
  0.3.0; вопрос 43); `descriptionField` из meta поля и вторая строка опции в Select/Combobox (вопрос 44).
- **Не делать:** заготовки в плагине, кодоген окна и «справочника модели», директивы под функции,
  `form.optionHint`, `generate_reference_select`.

#### 17.7. Правила проекта и публикация

- **Плагин** публикуется в npm тегом `zenstack-form-plugin-v*` (`.github/workflows/publish-npm.yml:9–12`),
  `dependencies: {}`, peer `@zenstackhq/sdk` и `@zenstackhq/zod` (`libs/zenstack-form-plugin/package.json`). Этап Е
  зависимостей не добавляет: сгенерированный файл без импортов, `@letar/*` плагин не импортирует. Если понадобится
  `parseFieldRegistryType` из `forms-core` — только `devDependencies` + `noExternal`
  ([npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md)); проще держать свою регулярку и сверять
  тестами E1/P1.
- **Совместимость:** плагин 4.2 + `@letar/forms` < 2.24 → ключ уходит в `default` и молча рисуется текстовым полем
  (Р14). Плагин версию форм не видит — в README плагина и CHANGELOG обоих пакетов: «ключи реестра требуют
  `@letar/forms` ≥ 2.24.0».
- **Semver:** плагин — minor 4.2.0 (новый файл в выходе, новые проверки: синтаксис ключа — ошибка, так как раньше
  ключей не было; `form.relation.*` — предупреждение, чтобы не уронить generate существующих схем). `forms` — minor:
  новые типы, generic с умолчаниями; изменение поведения — dev-предупреждение на неизвестный `fieldType` (строка в
  «Изменения поведения»).
- Формы и поля — только `@letar/forms`; комментарии в генерируемом коде — на русском (как шапка `Recipe.form.ts:7–24`);
  примеры — нейтральные `WorkCategory`/`Counterparty`.
- **Nx:** новых проектов нет; изменения — в `libs/forms`, `libs/forms-core`, `libs/zenstack-form-plugin`,
  `libs/form-mcp`, демо — в `apps/form-develop-app` (её `schema.zmodel` получает поле с ключом).

#### 17.8. Вне `libs/forms` — сообщить координатору

- `.claude/rules/forms.md`, раздел «Паттерн»: `import { createForm, lazyComboboxes, lazySelects } from '@letar/forms'` и
  `extraSelects: lazySelects({ … })` — таких функций нет (поиск по `libs/forms/src/index.ts` и `declarative/index.ts`
  — 0 вхождений). Правильно — опции `lazySelects: { … }` / `lazyComboboxes: { … }` с `.then((m) => m.X)`
  (`create-form.tsx:101–123`). Та же ошибка была в §16.5 этого плана — исправлена.
- После этапа Е — в том же файле абзац «ключ реестра в схеме»: `@meta("form.fieldType", "Select.X")` + строка
  `FormRegistryCheck` в инстансе; поле с ключом больше не нужно исключать из `AutoFields`.

## ✅ [2026-09-04] Миграция `zenstack-form-plugin` на нативные возможности ZModel

- **Инициатор:** владелец репозитория. Повод — разбор msg 1102 (`domwellbes-dev`): узкий баг
  «форма не наследует `@gte`» оказался симптомом класса, а не отдельным дефектом.
- **Приоритет:** high
- **Статус:** Закрыто целиком. Фаза 0 (spike) → решение A3 (кодоген + `ZodUtils.*` с
  типизированной обёрткой) и плоский синтаксис `@meta` (объектный литерал не проходит компилятор
  ZModel) → Фаза 1 (11 нативных атрибутов) → Фаза 2 (`@@validate`) → Фаза 3 (`@meta` как основной
  синтаксис + кодмод + broadcast потребителям) → message-i18n (v3.1.0, кастомный текст ошибки на
  нативных атрибутах) → v3.2.0 (warning на нераспознанный `@form.<key>`/`@meta("form.<key>", …)` —
  живой прецедент `@form.options` у `animatrona-tracker-dev`, `findUnknownFormDirectiveKeys`/
  `findUnknownMetaFormPaths` в `parser.ts`). Подробности каждой фазы — секции ниже и CHANGELOG
  `libs/zenstack-form-plugin`. Узкая часть (наследование 7 атрибутов) закрыта отдельно в v2.3.0 —
  см. следующий пункт, он остаётся в силе и ничему тут не мешает.

### Почему это класс дефекта, а не набор пропущенных фич

Плагин строит форму из **текста `///`-комментария**, а не из AST. Отсюда четыре независимых
следствия, три из которых уже живут в репозитории:

1. **Дрейф валидации.** До v2.3.0 генератор не читал `field.attributes` вообще ни для чего,
   кроме `@default`/`@id`/`@relation`. v2.3.0 закрыла 7 атрибутов, **11 остаются невидимыми**
   (список ниже). Поле с `@startsWith`/`@datetime`/`@trim` до сих пор даёт форму без клиентской
   валидации: ORM отвергает на `create`, пользователь узнаёт об этом после round-trip.
2. **Опечатка в директиве не диагностируется — живые случаи.** В схемах лежат 5 директив,
   которых в парсере нет: `@form.options` ×3 (`animatrona-tracker/schema/content.zmodel:32,59,180`),
   `@form.widget` ×1 (`driving-school/models/sync.zmodel:163`), `@form.multiline` ×1
   (`aboi/models/catalog.zmodel:79`). Автор написал, генератор молча пропустил, никто не заметил.
   Нативный атрибут в этой позиции дал бы ошибку линтера ZModel.

   **Закрыто частично (2026-09-04, v3.2.0):** полной замены на нативные атрибуты для
   структурных данных (`options: [{value,label}][]`) нет и не будет — `@meta` не выражает
   объектный литерал (см. ниже), поэтому «опечатка вместо нативного атрибута» здесь
   архитектурно невозможна. Вместо этого добавлена диагностика самого класса ошибки:
   `console.warn` на любой нераспознанный `<key>` в `@form.<key>`/`@meta("form.<key>", …)` —
   `findUnknownFormDirectiveKeys`/`findUnknownMetaFormPaths` (`parser.ts`). Найдено живым
   прецедентом — `animatrona-tracker-dev` наткнулся на тот же `@form.options` при разборе
   contact-request (msg 1134), сам починил свою схему на `@form.props({ options: [...] })` и
   предложил закрыть класс диагностикой, а не точечно. Подробности — CHANGELOG v3.2.0.
3. **Директивы работают и без подключённого плагина.** `apps/archetest/schema.zmodel` содержит
   2 `@form.*`, но `plugin` блока `zenstack-form-plugin` там нет и `form-schemas` не генерируются.
   Комментарий не может быть «неподключённым» — он всегда просто текст.
4. **Regex-конвертация JS→JSON тихо теряет весь `@form.props`.** `parser.ts:113-117` +
   `catch {}` на строке 138. Проверено прогоном на реальном коде парсера:

   | Вход                                     | Результат                                      |
   | ---------------------------------------- | ---------------------------------------------- |
   | `{ min: 1, max: 100 }`                   | OK                                             |
   | `{ grid: { cols: 2 } }`                  | OK                                             |
   | `{ placeholder: "https://example.com" }` | **вся директива потеряна** (`:` внутри строки) |
   | `{ hint: "user's name" }`                | **вся директива потеряна** (апостроф)          |

   Живых вхождений этих двух форм сейчас нет — это мина, а не активный баг. Но она обезврежена
   только тем, что никто ещё не написал URL или апостроф в `@form.props`.

### Что уже готово в upstream (проверено по установленным пакетам 3.9.3)

Главная находка разбора — **половина работы уже написана и поддерживается ZenStack**, наш плагин
дублирует её вручную:

- **`@zenstackhq/zod` экспортирует `ZodUtils`** с готовым маппингом всех нативных атрибутов на
  Zod: `addStringValidation`, `addNumberValidation`, `addBigIntValidation`, `addDecimalValidation`,
  `addListValidation`, `addCustomValidation` (это `@@validate`), `collectFieldRefs` (это `path`
  у `@@validate`). Подтверждено `case`-ветками в `dist/index.mjs`: покрыты все 18 полевых
  validation-атрибутов, включая 11 наших недостающих.
- Сигнатура — `(schema: z.ZodString, attributes: readonly AttributeApplication[]) => z.ZodSchema`,
  где `AttributeApplication = { name: string; args?: { name?: string; value: Expression }[] }` —
  **плоские сериализуемые данные**, их можно инлайнить литералом в сгенерированный файл.
- **`@meta`/`@@meta` — нативный аналог наших директив**, и upstream уже использует его ровно так:
  `createSchemaFactory` читает `@meta("description", "...")` и кладёт в Zod `.meta({ description })`
  (`index.mjs:688-701`). То есть «метадата из схемы → `.meta()` Zod» — санкционированный паттерн,
  а не наше изобретение.
- `@zenstackhq/sdk` экспортирует `getAttribute`/`hasAttribute` — наш `findAttribute`
  (`model-generator.ts:125`) это ручная копия.
- `@zenstackhq/zod` уже сам исключает `@computed`-поля и delegate-дискриминаторы из
  create/update-схем (`FieldIsComputed extends true ? never`). Наш генератор — нет.

### Фаза 0 — spike (обязательна до любого кода)

Две развилки, обе решаются замером, а не рассуждением. Пока они не закрыты, остальные фазы
планировать в деталях бессмысленно.

**Развилка A — откуда берётся валидация.**

| Вариант                                                                                                     | Плюс                                                                     | Минус                                                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| **A1.** Своя кодогенерация строк (как сейчас)                                                               | ноль рантайм-зависимостей                                                | свой маппинг 18 атрибутов, вечный дрейф за upstream     |
| **A2.** Рантайм `createSchemaFactory` из `SchemaDef`                                                        | всегда в синхроне с ORM by construction                                  | в клиентский бандл едет весь `SchemaDef` + `decimal.js` |
| **A3.** Гибрид: кодоген инлайнит `AttributeApplication[]` литералом, вызывает `ZodUtils.*` на старте модуля | маппинг остаётся upstream-овым; в бандле только хелперы, без `SchemaDef` | нужен рантайм-импорт `@zenstackhq/zod` в клиенте        |

**Рекомендация — A3.** Он снимает главную причину дрейфа (свой маппинг), не тащит схему в бандл
и оставляет сгенерированный файл читаемым. A1 оставить как fallback, если замер бандла провалится.

Критерии приёмки spike (делать на `form-develop-app`, он мой):

- дельта клиентского бандла для A2 и A3 в килобайтах gzip; **порог отказа — +40 KB gzip**;
- `.meta({ ui })` навешивается на результат `ZodUtils.*` без потери типов (`z.infer` тот же);
- `@letar/forms` читает `ui`-мету из такой схемы без правок в самой библиотеке;
- `Decimal`-поля: сейчас `PRISMA_TO_ZOD` мапит `Decimal → z.number()`, а `@zenstackhq/zod` —
  в `z.ZodType<Decimal>`. **Это несовместимость, а не деталь**: форма отдаёт `number`. Решение
  фиксируем в spike (скорее всего — не отдавать `Decimal` в `ZodUtils`, оставить `z.number()`
  и применять только числовые границы).

**Развилка B — синтаксис метаданных.** Проверить прогоном `nx zenstack:generate form-develop-app`,
парсится ли объектный литерал в `Any`-аргументе:

```zmodel
title String @meta("form", { title: "Название", fieldType: "textarea" })
```

Грамматика это допускает — `ObjectExpr.$container` включает `AttributeArg` (`ast.d.mts:504-507`),
`FieldInitializer.value` — произвольный `Expression`, значит вложенность и массивы тоже. Но
проверку типов на `Any` никто не проверял, а upstream в своём `description`-кейсе читает только
литерал. **Fallback, если объект не проходит** — плоские namespace-метаданные, гарантированно
рабочие, потому что именно так работает штатный `description`:

```zmodel
title String @meta("form.title", "Название") @meta("form.fieldType", "textarea")
```

Spike обязан закончиться выбором одного из двух синтаксисов, а не «оба возможны».

### Фаза 0 — результаты spike (2026-09-04, `forms-dev`)

Прогон на `apps/form-develop-app` (реальный `SchemaDef`, реальный `nx zenstack:generate`,
esbuild-бандл с теми же алиасами, что резолвит бандлер приложения, `tsgo` для проверки типов).

**Решение по развилке A — A3, с оговоркой ниже.** A1 не нужен как fallback: A3 укладывается
в бюджет с большим запасом и не имеет риска роста A2.

| Критерий                              | A2 (рантайм `createSchemaFactory`)                                                                                                                                                                                  | A3 (кодоген + `ZodUtils.*`)                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Дельта бандла (1 модель, gzip)        | **+17.9 KB** (82815 vs baseline 64935) — и это только `Recipe`; в бандл попадает **весь `SchemaDef`** (проверено — `Category`, `RecipeComponent`, `RecipeInfoAdditional` присутствуют, хотя не используются формой) | **+15.5 KB** как есть (80510 vs 64935); **+2.5 KB**, если исключить `decimal.js`-плечо (67502 vs 64935, см. ниже) |
| Масштабируемость                      | Растёт с размером **всей** схемы приложения — `driving-school` (46+ Select) при этом подходе рискует пробить порог                                                                                                  | Фиксированная стоимость независимо от размера схемы — только сам модуль `ZodUtils` + `decimal.js`                 |
| `.meta({ui})` без потери типов        | Проходит (я использую `factory.makeModelSchema` напрямую, тип сохраняется by construction)                                                                                                                          | ⚠️ **Не проходит "из коробки" — критическая находка, не входившая в бриф.** См. ниже                               |
| `@letar/forms` читает `ui` без правок | Проходит                                                                                                                                                                                                            | Проходит (после фикса типов ниже)                                                                                 |

**Критическая находка по критерию 2:** `ZodUtils.addStringValidation`/`addNumberValidation`/...
типизированы как `(schema: T, attrs) => z.ZodSchema` — **возвращаемый тип стёрт до базового
`z.ZodSchema`**, не `T`. Голый вызов `ZodUtils.addNumberValidation(z.number(), [...])` даёt
`z.infer` равный `unknown`, а не `number` — проверено принудительным несовпадением типов через
`tsgo` (`t4.ts`/`t5.ts` в scratchpad сессии): без фикса `z.infer<typeof Schema>` на портированной
форме превращается в `unknown`-поля, и вся типобезопасность формы теряется молча (не ошибка
компиляции у потребителя — а `any`-подобное поведение).

**Фикс, подтверждённый прогоном:** тонкая типизированная обёртка в кодогене, кастующая результат
обратно к исходному типу — легитимно, потому что `ZodUtils.*` (кроме `addDecimalValidation`)
только добавляет constraints/checks на существующий тип, не создаёт новый:

```ts
function withNative<T extends z.ZodTypeAny>(schema: T, apply: (s: T) => unknown): T {
  return apply(schema) as T
}
// в сгенерированном файле:
title: withNative(z.string(), (s) => ZodUtils.addStringValidation(s, [...])).meta({ ui: {...} })
```

Прогон `t5.ts` подтвердил: с обёрткой `z.infer` точно совпадает с A1 (намеренная ошибка типов
на несовместимом присвоении корректно ловится `tsgo`). Кодогенератор фазы 1 обязан использовать
эту обёртку, а не звать `ZodUtils.*` напрямую — иначе фаза 1 тихо регрессирует типобезопасность
существующих форм.

**Уточнение по бюджету бандла:** сам факт импорта `ZodUtils` (это единый namespace-объект
`__exportAll({...})`, не тришейкается по отдельным функциям) тянет весь модуль целиком, включая
`addDecimalValidation` → `decimal.js`, даже если код использует только
`addStringValidation`/`addNumberValidation`. Это даёт наблюдаемые **+15.5 KB** вместо
теоретических +2.5 KB. Всё равно далеко от порога +40 KB, поэтому решение по фазе 4 (Decimal —
не отдавать в `ZodUtils`) остаётся верным как решение о **корректности** (см. ниже), а не как
попытка сэкономить эти 13 KB — экономить их всё равно не получится, пока `ZodUtils` вообще
используется хоть для одного поля.

**Критерий 4 (Decimal) — подтверждён прогоном типов пакета.** `addDecimalValidation` трансформирует
`z.ZodString → z.ZodType<Decimal>` (реальный `.transform()`, не просто constraint) — это меняет
рантайм-тип значения (строка → объект `Decimal`), а наш `PRISMA_TO_ZOD` контрактно отдаёт
`z.number()`. Решение из брифа подтверждается: **не отдавать `Decimal`-поля в `ZodUtils` вообще**,
оставить `z.number()` и применять `@gte`/`@lte`-границы вручную (как уже делает
`extractNativeConstraints` в текущем коде v2.3.0) — не через `ZodUtils.addNumberValidation`, у
которой другая сигнатура (`z.ZodNumber`, не decimal-строка).

**Развилка B — решение: плоский namespace-синтаксис, объектный литерал не проходит.**

```
$ nx zenstack:generate (объект в @meta) → Unhandled error: Error: Unsupported attribute arg value: ObjectExpr
$ nx zenstack:generate (@meta("form.title", "…") @meta("form.fieldType", "…")) → успех
```

Грамматика ZModel формально допускает `ObjectExpr` в `Any`-аргументе (`ast.d.mts`), но
компилятор его не поддерживает на практике — упало на первом же прогоне без исключений/фича-флага.
Развилка закрыта **окончательно**, не «пока»: фаза 3 проектирует `@meta` только в плоском виде
(`@meta("form.title", "…")`, `@meta("form.fieldType", "…")`, `@meta("form.props", "…")` —
последний потребует сериализации сложных объектов в строку, отдельная забота фазы 3, не этого
spike). Подтверждено прогоном `nx zenstack:generate` — сгенерированный `schema.ts` содержит
`AttributeApplication`-записи `{ name: "@meta", args: [...] }` для каждого плоского вызова,
типобезопасно и без ошибок.

### Что это меняет для фаз 1-4

- Фаза 1 (генератор для оставшихся 11 атрибутов) — по A3 с обязательной `withNative`-обёрткой.
  Без неё — не готовить к релизу, это регрессия типов, не мелочь.
- Фаза 2 (`@@validate` → `.superRefine()` + `collectFieldRefs`) — тот же принцип обёртки
  применим и к `addCustomValidation`, не проверялось отдельно в этом spike (сигнатура тоже
  `(schema: z.ZodSchema, ...) => z.ZodSchema`), закладывать проверку типов в саму фазу 2, не
  считать закрытой автоматически.
- Фаза 3 — синтаксис `@meta` только плоский, кодмод целится в `@meta("form.title", …)`, не в
  объектный литерал.
- Ничего в фазах 1-4 не ломается находкой этого spike — она обнаружена и закрыта здесь, до
  написания продакшен-кода генератора.

**Статус: Фаза 0 закрыта.** Фазы 1-4 могут начинаться по решениям выше.

### Фаза 1 — довести валидацию до паритета с ORM (v2.4.0)

Аддитивно, `@form.*` не трогаем. По итогам развилки A.

Недостающие 11 атрибутов:

| Атрибут                                    | Zod                                             | Примечание                                                                                                             |
| ------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@startsWith` / `@endsWith` / `@contains`  | `.startsWith()` / `.endsWith()` / `.includes()` |                                                                                                                        |
| `@datetime` / `@date` / `@time(precision)` | `.datetime()` / `.date()` / `.time()`           |                                                                                                                        |
| `@url`                                     | `.url()`                                        | ключ `url` в типах есть, чтения нет                                                                                    |
| `@phone`                                   | E.164                                           | своего эквивалента у нас нет                                                                                           |
| `@trim` / `@lower` / `@upper`              | `.trim()` / `.toLowerCase()` / `.toUpperCase()` | **трансформации, не валидация** — меняют значение до сабмита, проверить, что `@letar/forms` не теряет их при `reset()` |

Плюс в этой же фазе:

- **`message` из нативного атрибута** (`@gte(18, "Только с 18 лет")`) — сейчас игнорируется даже
  там, где атрибут читается. Схема решения (переиспользует уже работающий механизм, новой
  инфраструктуры не нужно): `message` — сид для файла `defaultLocale`, как сейчас `@form.title`;
  генерируется ключ `Model.field.validation.<attr>`; прочие локали идут по merge-стратегии и
  ручные переводы не затираются; field-specific сообщение побеждает generic-шаблон из
  `ValidationTranslations` при конфликте; при выключенном i18n — пробрасывается в Zod буквально.
- **`@omit` и `@computed`** — добавить в правила исключения поля из формы (сейчас исключаются
  только `id`/`createdAt`/`updatedAt`/relation). Писать в computed-поле через форму бессмысленно,
  `@omit` — прямое указание не отдавать наружу.

⚠️ Фаза меняет поведение работающих форм: там, где валидации не было, она появится. Прецедент
v2.3.0 (7 атрибутов вышли минором) — считаем минором и здесь, но каждому потребителю нужен
пересбор `form-schemas` + просмотр диффа, не молчаливый bump.

#### Фаза 1 — результаты (2026-09-04, `forms-dev`, v2.4.0)

**Сделано:**

- 11 атрибутов из таблицы выше — реализованы через архитектуру A3 (Фаза 0 spike):
  сериализация в `NativeAttributeApplication[]` + `withNative(ZodUtils.addStringValidation(...))`
  в кодогене. `@length` на списке — отдельная ветка через `ZodUtils.addListValidation`.
- **Унификация**: заодно переведены на A3 и все 7 атрибутов из v2.3.0 (`@email`/`@length`/`@gte`/
  `@gt`/`@lte`/`@lt`/`@regex`) — избегает поддержки двух параллельных механизмов рендера. Публичный
  контракт (`@form.*`-директивы, `@form.props`-override) не изменился, изменилась только
  внутренняя структура `FormFieldMeta.nativeAttributes`.
- `@omit`/`@computed` — добавлены в правила исключения поля из формы. `$refText` формат (`'@omit'`,
  `'@computed'`, с `@`) подтверждён эмпирически двумя путями: unit-тест на мок-AST и реальный
  прогон `nx zenstack:generate` на `apps/form-develop-app` (поле с `@computed` действительно
  попало в `RecipeExcludedFields`).
- **`Decimal` остаётся вне A3** — подтверждено Фазой 0, не менялось.
- **Живая проверка в браузере** (`apps/form-develop-app` `/native-attributes-demo`): невалидный
  `slug` (не начинающийся с `recipe-`) даёт ошибку формы `Invalid string: must start with
  "recipe-"` — валидация реально приходит из `ZodUtils`, не из ручного кода. 4 e2e-теста зелёные.
- `@zenstackhq/zod` добавлен в peerDependencies плагина и **в корневой `package.json` монорепо**
  (`dependencies`) — раньше не резолвился ни у одного потребителя: пакет был только транзитивной
  зависимостью `@zenstackhq/orm`, физически лежал внутри `orm`'s собственного `node_modules` под
  изолированным bun-линковщиком и не хоистился в корень. Без явной корневой записи `tsgo`/
  Next.js-сборка потребителя выдавала `TS2307: Cannot find module '@zenstackhq/zod'` несмотря на
  успешную кодогенерацию — баг общий для любого приложения с native-атрибутами, не специфичен
  `form-develop-app`.

**НЕ сделано, сознательно отложено:**

- **`message` из нативного атрибута (i18n)** — блокер жёстче, чем казалось на этапе планирования:
  `ZodUtils.*` (пакет `@zenstackhq/zod` 3.9.3) физически **не читает** аргумент `message` ни в
  одном `case`-ветвлении (подтверждено чтением исходников `dist/index.mjs` в Фазе 0). Схема из
  плана («message как сид для `defaultLocale`») технически реализуема на стороне кодогена
  (парсинг + генерация ключа перевода), но сама Zod-ошибка от `ZodUtils.*` никогда не будет нести
  этот текст — сообщение пришлось бы подменять post-hoc через отдельный `.refine()`/кастомную
  error map поверх результата `ZodUtils.*`, что требует отдельного дизайн-решения (не аддитивная
  правка кодогена). Вынесено в самостоятельный follow-up, не блокирует остальной объём Фазы 1.
- **Транзформации (`@trim`/`@lower`/`@upper`) и `reset()` в `@letar/forms`** — генерация и
  typecheck подтверждены, но конкретно поведение `@letar/forms`' `reset()`-механизма после
  трансформации (теряется ли применённое `.trim()`/`.toLowerCase()` значение при повторном
  рендере с исходным `initialValue`, см. класс бага
  [letar-forms-post-submit-reset-stale-initialvalue](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md))
  живьём не проверялось — вне периметра `zenstack-form-plugin`, требует отдельной проверки на
  стороне `@letar/forms`.

**Статус: Фаза 1 закрыта в объёме кодогена.** `message`-i18n — отдельная задача. Фаза 2 может
начинаться.

### Фаза 2 — кросс-полевая валидация `@@validate` (v2.5.0)

Новый класс, а не ещё один атрибут: плагин **сейчас не читает `model.attributes` вообще**.

```zmodel
model Booking {
  startsAt DateTime
  endsAt   DateTime
  @@validate(endsAt > startsAt, "Дата окончания раньше начала", ["endsAt"])
}
```

- Генерируется `.superRefine()` (не цепочка `.method()`), `path` из третьего аргумента привязывает
  ошибку к конкретному полю — иначе она уйдёт в корень формы и пользователь её не увидит.
- Выражение — произвольный AST `Expression`, транслировать его самим не нужно:
  `ZodUtils.addCustomValidation` + `collectFieldRefs` делают это upstream-ом.
- `@@strict()` — сюда же: генерировать `.strict()` вместо `.strip()`-дисциплины руками
  (`.claude/rules/security.md`). ⚠️ Проверить на `form-develop-app`, что `@letar/forms` не шлёт
  служебных полей в `parse` — иначе `.strict()` начнёт валить сабмиты.

#### Фаза 2 — результаты (2026-09-04, `forms-dev`, v2.5.0)

**Сделано:**

- `@@validate(condition, message?, path?)` — генерируется `withNative(BaseSchema, (s) =>
  ZodUtils.addCustomValidation(s, [...]))`. Уточнение к спеке выше: под капотом
  `ZodUtils.addCustomValidation` вызывает `.refine()`, не `.superRefine()` (прочитано в
  исходнике `@zenstackhq/zod` — `return schema.refine((data) => Boolean(evalExpression(data,
  expr)), options)`); план ожидал `.superRefine()`, но раз это внутренний механизм upstream-
  пакета, а не нашего кодогена, разница не влияет на публичный контракт.
- `condition` сериализуется в рантайм-контракт `Expression` (`serializeExpression`,
  рекурсивный обход Langium AST по `$type`) — тот же приём инлайна данных, что
  `NativeAttributeApplication` в Фазе 1, но с рекурсивной, а не плоской формой узла.
  `MemberAccessExpr` намеренно не поддержан (не встречался, кодоген кидает явную ошибку).
- **Найдена и закрыта расходящаяся типовая форма контракта.** TS-тип `ArrayExpression`
  пакета `@zenstackhq/schema` требует поле `type` (тип элементов) помимо `items` — рантайм
  (`evalExpression`/`ExpressionUtils.isArray`) его не читает, но `tsgo`/`tsc` валят
  сгенерированный файл `TS2322` без него. Поймано **живым** forced-mismatch прогоном
  `typecheck:tsgo`, не по документации пакета — исправлено (`inferArrayExprElementType`,
  дефолт `'String'` для path-массивов).
- `path` из третьего аргумента `@@validate` действительно привязывает ошибку к полю, а не в
  корень формы — подтверждено живьём на `apps/form-develop-app` `/cross-field-validation-demo`:
  `endsAt` раньше `startsAt` даёт ошибку под полем `endsAt`, а не общей строкой формы.
- **Update-схема не получает `@@validate`.** `{Model}UpdateFormSchema` строится из внутреннего
  `{Model}BaseSchema` (до `.refine()`) через `.partial()` — у `ZodEffects` нет `.partial()`, и
  partial-payload часто физически не может удовлетворить проверке для полной модели. Осознанное
  архитектурное решение Фазы 2, не пробел.
- Живая проверка в браузере + 3 e2e-теста (`cross-field-validation-demo.spec.ts`) на
  `form-develop-app`, плюс showcase-модель `Event` в `form-example` (публичное приложение,
  собственная миграция `20260904144257_event_cross_field_validate`).
- Forced-mismatch типовая проба на `tsgo` (как в Фазе 1) подтвердила: `withNative` +
  `ZodUtils.addCustomValidation` не стирают конкретный тип `{Model}CreateForm`.

**НЕ сделано (не пробел, языковое ограничение, не решение плагина):**

- **`@@strict()` реализован в кодогене, но неприменим ни к одной `model`.** ⚠️ Разошлось с
  предположением плана выше («⚠️ Проверить на `form-develop-app`...») — до проверки не дошло,
  потому что до неё не дошло дело: живой прогон `zenstack generate` с `@@strict()` на модели
  `Booking` (`apps/form-develop-app`) остановился на этапе парсинга схемы: `attribute "@@strict"
  can only be used on type definitions`. Стандартная библиотека ZModel (`stdlib.zmodel`)
  объявляет его исключительно для `type`-определений — это ограничение самого языка, не риск
  несовместимости с `@letar/forms`, который план предполагал заранее. `ModelInfo.isStrict`/
  `hasStrictAttr`/`objectFn` в `model-generator.ts` оставлены как код (юнит-тестами покрыт на
  синтетических фикстурах, которые не идут через реальный парсер и потому не ловят это
  ограничение) — задел на случай, если ZenStack расширит область действия атрибута, не
  активная фича Фазы 2.

**Статус: Фаза 2 закрыта в объёме `@@validate`.** `@@strict()` — заблокирован языком ZModel, не
задача Фазы 2. Фаза 3 может начинаться.

### `message`-i18n — разбор блокера (2026-09-04, `forms-dev`)

Отложено в Фазе 1 как «требует отдельного дизайн-решения» (`ZodUtils.*` физически не читает
`message`). Механизм разблокировки найден и **проверен живым прогоном** (не по документации —
`node_modules/zod` не документирует эту часть API вообще), но **не реализован** — это только
разбор, объём кодогена для всех 12 native-атрибутов (11 из Фазы 1 + сообщение `@@validate` из
Фазы 2) не оценивался, реализация не начата.

**Находка:** Zod v4 хранит каждый check (`.min()`, `.max()`, `@regex` и т.д.) как объект с
`check._zod.def.error: (() => string) | undefined`. Если `undefined` — Zod использует
дефолтное сообщение по `code`/`origin`. `ZodUtils.*` никогда не передаёт `message` при вызове
методов `z.string().min(...)` и т.п. → `error` остаётся `undefined` на построенной схеме.

Ключевое — **это поле мутируемо постфактум**, без переигрывания билда схемы:

```js
const s = z.string().min(5) // ZodUtils.addStringValidation() построил именно так
const check = s._zod.def.checks[0]
check._zod.def.error = () => 'Кастомное сообщение'
s.safeParse('ab') // → issue.message === 'Кастомное сообщение'
```

Проверено на реальном Zod v4 (пакет из `node_modules`, не мок): мутация `error` на уже
построенном `ZodString` от `.min(5)` без message действительно подменяет текст в `issues[0]
.message` при повторном `safeParse`. Значит подмену можно делать **после** вызова
`ZodUtils.addStringValidation(...)`, не трогая сам upstream-вызов — аддитивная надстройка в
`withNative`, а не патч чужого пакета.

**Что остаётся сделать (не начато):**

1. Сопоставить каждый из 12 native-атрибутов с `check.def.check`-строкой Zod v4 (`'min_length'`,
   `'greater_than'`, `'string_format'` для `@email`/`@url`/`@regex` и т.п.) — по одному на
   атрибут, включая различение `@gte`/`@gt` (`inclusive`) и `@length(min,max)` (два разных
   check-объекта на одном поле, нужно матчить по `minimum`/`maximum`, не только по `check`-строке).
2. Решить конфликт **нескольких проверок одного check-объекта** — если у поля два атрибута,
   маппящихся на один и тот же Zod-check (маловероятно, но не исключено при `@length` +
   кастомном `@regex` с overlapping semantics), нужно правило приоритета.
3. i18n-слой (сид `defaultLocale`, merge-стратегия, приоритет field-specific над generic —
   исходная схема из плана Фазы 1) — сама подмена `error` даёт только literal-путь, ключ
   перевода нужно резолвить снаружи (как `withUIMeta`/`.meta({ ui })` уже делает для тайтлов).
4. `@@validate`'s `message` (Фаза 2) — отдельный случай: `.refine()` **уже** принимает `message`
   как второй аргумент `addCustomValidation` в открытую (не проигнорирован, в отличие от
   `ZodUtils.addXValidation`), поэтому для `@@validate` эта находка не нужна вообще — `message`
   там работает уже сейчас без доработок. Разбор относится только к 11 атрибутам Фазы 1.
5. **Риск версионной хрупкости.** `_zod.def.error` — недокументированное внутреннее поле Zod v4,
   не публичный API. Апгрейд Zod может переименовать/переструктурировать его без записи в
   changelog как breaking change (это internals, не public surface). Нужен canary-тест в
   `libs/zenstack-form-plugin` (не просто юнит-тест на текущей версии), который явно проверяет
   именно этот путь мутации и падает громко при апгрейде Zod, а не тихо перестаёт подменять
   сообщения.

**Рекомендация:** отдельная фаза (не довесок к текущей), с явным приоритетом от координатора —
объём (12 атрибутов × сопоставление check-типов + i18n-слой + canary-тест) сравним с Фазой 1.

**Результаты (2026-09-04, `forms-dev`, `@letar/zenstack-form-plugin` v3.1.0):** реализовано в
объёме literal-сообщений — пункты 1–2 разбора выше закрыты не мэппингом «check-тип → атрибут», а
**позиционным** сопоставлением: наш `NativeAttributeApplication[]` передаётся в `ZodUtils.*` в
том же порядке, в котором строится `schema._zod.def.checks[]`, поэтому подмену `error` можно
делать проходом по обоим массивам в лок-степе, отслеживая, сколько checks даёт каждый атрибут
(`deriveNativeCheckCount`) — правило приоритета из пункта 2 не понадобилось, коллизий на одном
check-объекте не бывает по построению.

Найден и закрыт баг вне исходного разбора: `PRISMA_TO_ZOD['Int'] === 'z.number().int()'` — сам
`.int()` пушит `number_format`-check **до** native-атрибутов, сдвигая позиционное сопоставление
только для `Int`-полей (не `Float`/`String`/`BigInt`). Фикс — `leadingEntries`-offset
(`{ count: 1 }` без message) в `applyElementNativeAttributes`, найден и подтверждён живым
end-to-end прогоном сгенерированной схемы (`form-develop-app`, поле `Recipe.rating`), не
юнит-тестами (они строят `NativeAttributeApplication` напрямую и не гоняют настоящий
`zod`/`@zenstackhq/zod`).

Пункт 5 (риск версионной хрупкости) закрыт отдельным canary-файлом
`libs/zenstack-form-plugin/src/zod-native-message-mutation.spec.ts` — дублирует (не импортирует)
рантайм-логику `applyNativeMessages`, проверяет сырой контракт `_zod.def.checks`/`_zod.def.error`
напрямую на пакетах из `node_modules`, задуман падать громко при апгрейде Zod, а не тихо
переставать подменять сообщения.

**НЕ реализовано (сознательно, задокументировано в CHANGELOG/README как явная граница объёма,
не недосмотр):**

- Пункт 3 (i18n-слой, резолюция `message` через ключ перевода, аналогично `title`/`i18nKey`) —
  работает только literal-строка.
- `Decimal`-типизированные поля — не проходят через `ZodUtils.*` вообще (отдельный механизм,
  `extractDecimalNativeConstraints`/`generateConstraints`), message для них не поддержан.
- Пункт 4 подтверждён без доработок: `@@validate` (Фаза 2) уже работает через открытый
  `options.error = message` в `addCustomValidation`, находка этой секции ему не нужна.

Тесты: 118 → 139 (`model-generator.spec.ts` + новый canary-файл), все зелёные.
`forms-coordinator-dev` предварительно одобрил переход к этой задаче сразу после Фазы 3 (msg 1121,
`forms-native-migration`) — работа выполнена без ожидания отдельного запроса приоритета.

### Фаза 3 — `@meta` как основной синтаксис, `@form.*` в deprecation (v3.0.0)

Мажор именно здесь: меняется рекомендованный контракт схемы (и, если spike выберет A2/A3, —
форма сгенерированного файла).

- Плагин читает **оба** синтаксиса. `@meta` побеждает при конфликте на одном поле.
- `@form.*` при обнаружении печатает warning с готовой заменой (`@form.title("X")` →
  `@meta("form.title", "X")`), но **не ломает сборку**.
- Кодмод `scripts/codemod-form-directives.mjs`: `@form.*` → `@meta` по `.zmodel`, идемпотентный,
  с `--dry-run`. 831 вхождение руками не переписывают.
- Полный разворот документации и материалов — отдельный раздел «Документация, скиллы, статьи»
  ниже. Он не приложение к фазе, а её половина по объёму.
- `@form.relation` — отдельный разбор: у него нет нативного аналога (это чисто UI-надстройка над
  FK). Скорее всего остаётся, но переезжает в `@meta("form.relation", {...})`.

#### Фаза 3 — результаты (2026-09-04, `forms-dev`, v3.0.0, по прямому указанию владельца «Делай

Фазу 3 целиком»)

**Сделано (код):**

- `parseMetaAttributes(attributes)` (`parser.ts`) — AST-парсер `@meta`-атрибутов поля напрямую по
  `DataFieldAttribute[]` Langium AST, минуя comment-регексы. Требует `args[0].value` —
  `StringLiteral`, начинающийся с `'form.'`; маршрутизирует по суффиксу на
  title/placeholder/description/fieldType/exclude/`props.<dotpath>`/`relation.<dotpath>`.
- `metaValueToPlain(expr)` — конвертирует `StringLiteral`/`NumberLiteral`/`BooleanLiteral`/
  `ArrayExpr` (рекурсивно) в plain-значения. **Намеренно нет ветки `ObjectExpr`** — см. находку
  ниже, объект в `@meta` ломает генерацию раньше, чем до этой функции доходит очередь.
- `mergeFormMeta(commentMeta, metaAttrMeta)` — слияние **по каждому полю метаданных отдельно**
  (`title`/`placeholder`/… через `??`, `constraints`/`props` — key-by-key spread), не объекта
  целиком. `@meta` побеждает `@form.*` на пересечении ключей.
- `warnLegacyFormDirectives` (`model-generator.ts`) — `console.warn` на каждое поле с
  comment-директивой при `nx zenstack:generate`, с готовой `@meta`-заменой. Сборка не ломается.
- `scripts/codemods/codemod-form-directives.mjs` — построчный (не AST) кодмод: Langium-грамматика
  ZModel не выставляет публичный AST для утилитных скриптов вне самого ZenStack, поэтому
  конвертер сознательно консервативен — переписывает только однозначно узнаваемые директивы,
  двусмысленное (позиционные аргументы, нераспарсенные объекты, директива не перед полем)
  оставляет как есть и печатает в блок «ТРЕБУЕТ РУЧНОЙ ПРОВЕРКИ», а не угадывает. Идемпотентен по
  ключу `@meta` на целевой строке. `--dry-run`.
- 118/118 юнит-тестов (`parser.spec.ts`, +16 новых на `parseMetaAttributes`/`mergeFormMeta`),
  `typecheck:tsgo`/`lint` зелёные.

**Находка, изменившая дизайн (не из документации — живым прогоном `zenstack generate`):**

`@meta("key", {...})` **с объектным литералом валит генерацию целиком**:
`Unsupported attribute arg value: ObjectExpr` — бросает upstream-генератор TS-схемы самого
ZenStack, ещё до того, как наш плагин получает управление. Грамматика ZModel формально пропускает
`ObjectExpr` как `Expression` (подтверждено в Фазе 0), но её реально некому обработать при
кодогене TS-схемы. Это окончательно закрыло развилку из раздела выше в пользу **только плоского**
dot-path-синтаксиса — не «пока, до появления решения», а постоянное ограничение языка/тулинга:

- `form.props.<dotpath>` вместо `form.props({...})` — вложенные объекты разворачиваются
  рекурсивно (`@form.props({ grid: { cols: 2 } })` → `@meta("form.props.grid.cols", 2)`).
- `form.relation.<dotpath>` вместо `form.relation({...})` — та же логика для `{model,
  labelField}`.
- Живо перепроверено: скаляры (строка/число/булево) и **массивы** (в т.ч. вложенные) в `@meta`
  парсятся и генерируются без проблем — блокирован только «голый» объектный литерал.

**Побочная находка при подготовке кодмода (обзор реального использования до написания
конвертера):** `Recipe.category` в `form-develop-app` держал `@form.relation("Category", "name")`
— позиционную форму, которую парсер плагина **никогда** не поддерживал (только объектный литерал
`@form.relation({...})`). Relation-select для этого поля не рендерился с момента добавления
директивы — не регрессия Фазы 3, а ранее незамеченный мёртвый код, вскрытый попутно. Исправлено
переводом на `@meta("form.relation.model", "Category") @meta("form.relation.labelField", "name")`.

**Применение кодмода — оба app'а, оба живьём провалидированы (браузер + e2e, не только
typecheck):**

- `form-develop-app`: 30 директив, 2 случая ручной проверки (обе — мёртвый позиционный
  `@form.relation`, см. выше). Новая демо-модель `MetaSyntaxDemo` (`/meta-syntax-demo`, 6 e2e-
  тестов) с полем `legacyNote`, намеренно оставленным на `@form.title`-комментарии — единственное
  поле во всей экосистеме `form-develop-app`/`form-example`, живьём демонстрирующее одновременную
  работу обоих синтаксисов и deprecation-warning в консоли `generate`.
- `form-example` (публичная витрина для внешних пользователей): 32 директивы, **0** случаев
  ручной проверки — вход чище, чем у `form-develop-app`. Сгенерированный `form-schemas/*.form.ts`
  **байт-в-байт идентичен** версии до кодмода (сверено `git diff` — не изменился ни один файл) —
  прямое подтверждение, что переход `@form.*` → `@meta` семантически нейтрален для конечного
  Zod-контракта. `Product`/`Event`-формы (`examples/zenstack`) живьём проверены в браузере:
  лейблы, `placeholder`, `Minimum 0`-constraint из `form.props.min`, cross-field `@@validate` на
  `Event` — всё рендерится как раньше. Витрина намеренно **не** содержит примера старого
  синтаксиса (в отличие от `form-develop-app`) — она показывает внешним пользователям только
  рекомендуемый `@meta`.

**Документация — Priority 0-5, сделано в этой же сессии следом (три фоновых агента параллельно на
Priority 3/4/5, остальное вручную):**

- **Priority 0** — `libs/form-mcp` `directive-registry.ts`: `DirectiveInfo` получил `metaKey`/
  `example`/`legacyExample`, `get_directives` и docs-запись `zenstack` теперь говорят про `@meta`
  как основной синтаксис. Сделано первым, как требовал план.
- **Priority 1** — `CLAUDE.md`, `.claude/rules/forms.md`, три субагента (`db-schema-assistant`,
  `form-generator`, `refactor-expert`), три command-файла (`forms-coordinator`, `forms-dev`,
  `infra/db-migrate`).
- **Priority 2** — 7 файлов skill'ов (`zenstack-helper`/`form-pipeline`/`ui-ux-audit`),
  `reference/form-directives.md` переписан целиком под `@meta`. Codex-зеркало `.agents/`
  пересобрано `sync-agent-skills.ts` (не коммитится).
- **Priority 3** — README'ы `zenstack-form-plugin` (RU+EN, версия → 3.0.0) и `libs/forms`
  (`README.md` + `docs/zenstack.md`), точечные фиксы в `.claude/docs/{forms,database,
  mcp-servers}.md`, новый обязательный `.claude/docs/zmodel-comment-directives-vs-ast.md`
  (почему `@meta`/AST и `///`/regex — два независимых парсера, не один общий).
- **Priority 4** — `apps/form-docs`: 3 MDX-гайда × RU+EN (`zenstack-plugin`, `relation-fields`,
  `mcp`), `src/app/llms.txt/route.ts`, версия → 0.6.5.
- **Priority 5** — из 14 статей `libs/forms/articles/` реально упоминали `@form.*` только 5:
  `08-zenstack-pipeline.md` (основная правка, плюс попутно найдена и убрана таблица никогда не
  существовавших директив `@form.hidden`/`@form.readonly`/`@form.order` — расхождение с реальным
  плагином), его SVG-диаграмма (2 текстовых лейбла, layout не тронут), `11-mcp-ai.md`,
  `12-open-source.md`, `benchmarks.md`, плюс `ARTICLE.md` (чек-лист) и `visuals-needed.md`.
  Остальные 9 статей `@form.*` не упоминали — трогать было нечего.

**Broadcast владельцам публичных приложений** (инструкция по `@meta`-синтаксису + кодмоду,
`topic: form-feature-request`, тред начат сообщением `forms-dev` msg id 1126):

- ✅ Доставлено сразу: `archetest-dev`, `kami-dev`.
- ✅ Доставлено после `unretire_agent` (штатный простой, не конфликт владения): `grandslamcup-dev`
  (contact-request создан автоматически, ждёт `respond_contact` со стороны получателя),
  `mandala-dev` (аналогично), `animatrona-tracker-dev` (аналогично).
- ❌ Не удалось разбудить: `label-printer-desktop-dev`, `animatrona-dev` — токены из памяти
  `agent_fixed_names_tokens.md` невалидны для `unretire_agent`. Восстановление через SQLite
  (см. `.claude/rules/agent-mail.md`) не выполнялось — оба приложения вне зоны прямого владения
  этой сессии (`forms-dev`), решать их владельцам при следующем запуске `/animatrona` /
  `/label-printer-desktop`. Тред тот же (`form-feature-request`), можно дочитать при заходе.

**Статус: Фаза 3 (код + вся запланированная документация + broadcast) закрыта.**
Документационный трек продолжается отдельными коммитами.

### Фаза 4 — миграция потребителей и удаление legacy (v4.0.0)

**Статус (2026-09-05): миграция потребителей + удаление парсера — закрыто.** По прямому указанию
владельца («переводи все приложения на новый синтаксис, я не вижу смысла передавать это
особенным агентам, обновление тривиальное») `forms-dev` мигрировал все оставшиеся приложения сам,
не через broadcast, как планировалось изначально ниже:

- Кодмодом переведены: `svoichuzhie` (25 директив), `driving-school` (104), `aboi` (30),
  `animatrona` (244), `grandslamcup` (95), `animatrona-tracker` (92) — итого 590 директив.
  `mandala` уже была мигрирована раньше (Фаза 3 spike).
- 4 поля с `options`-массивом объектов, не выражаемые кодмодом (`torrentBackend` в `animatrona`,
  `Content.category`/`Content.quality`/`Report.reason` в `animatrona-tracker`) — делегированы
  через coordinator владельцам приложений (`animatrona-dev`, `animatrona-tracker-dev`) на перевод
  в настоящий ZModel `enum` (не «оставить как легаси» — единственный правильный способ задать
  фиксированный список опций). Оба закрыли.
- Два реальных бага кодмода найдены и исправлены по ходу (не только в целевых приложениях —
  правки в самом `scripts/codemods/codemod-form-directives.mjs`): CRLF-файлы (`driving-school`)
  давали 0 конвертаций; массив объектов в `options` флаттенился в невалидный `@meta` и ронял
  `zenstack generate` для всей схемы молча — теперь явно уходит в «ТРЕБУЕТ РУЧНОЙ ПРОВЕРКИ».
  Оба бага затрагивали любого будущего потребителя кодмода, не только этих двух.
- Полный повторный dry-run по всем приложениям (включая `form-develop-app`) подтвердил 0
  оставшихся `@form.*`-директив перед удалением парсера.
- `parseFormMeta`, `findUnknownFormDirectiveKeys`, `mergeFormMeta` удалены из `parser.ts`;
  `buildMetaReplacementHint`, `warnLegacyFormDirectives` — из `model-generator.ts`.
  `extractModelInfo` больше не читает `field.comments` для form-метаданных вообще.
  `apps/form-develop-app`'s `MetaSyntaxDemo.legacyNote` (единственное живое поле на старом
  синтаксисе, оставленное намеренно как демо-прецедент) переведено на `@meta` вместе с текстом
  демо-страницы — старая формулировка «легаси продолжает работать одновременно» стала неверной.
  Тесты (`parser.spec.ts`, `model-generator.spec.ts`) переписаны на `@meta`-фикстуры, 152 → 123
  (удалены тесты самого удалённого кода, не потеря покрытия оставшегося).
  `libs/form-mcp` (`directive-registry.ts`) — поле `legacyExample` убрано, `get_directives`
  больше не упоминает legacy-синтаксис (v1.2.0).
- **Из документационного чек-листа ниже фактически закрыты:** Приоритет 0 (`form-mcp`
  registry+тесты), Приоритет 1 (`.claude/rules/forms.md`), частично Приоритет 2
  (`zenstack-helper/reference/form-directives.md`), Приоритет 3
  (`libs/zenstack-form-plugin/README.md`+`README.en.md`+`CHANGELOG.md`, этот файл).
  **НЕ закрыты были на тот момент** (осознанно, вне периметра «код + core-доки» той сессии):
  `CLAUDE.md`/`AGENTS.md`-зеркало, остальные скиллы/агенты из Приоритета 1-2 со старыми
  упоминаниями `@form.*` в промптах.
  **✅ Приоритет 4 и 5 закрыты отдельной сессией `forms-dev` 2026-09-05** (`apps/form-docs` MDX
  RU+EN, `apps/form-example`, статьи `libs/forms/articles/`) — детали в соответствующих
  подразделах ниже.

Ниже — исходный план миграции (до того, как решение делать её самостоятельно, а не через
broadcast, было принято):

- Кодмод + пересборка + просмотр диффа по каждому приложению. Порядок: сначала мои
  (`form-develop-app`, `form-example`), затем публичные, затем приватные submodule.
- **Чужие приложения не правлю сам** — broadcast с готовой командой кодмода и сроком.
- `@form.*` удаляется из парсера только после того, как во всех 11 приложениях ноль вхождений.

### Документация, скиллы, статьи (сквозной раздел)

**Принцип: доки едут в той же фазе, что и код, который меняет поведение.** Не «допишем в конце» —
иначе между релизом и правкой доков агенты и люди продолжают писать по старому образцу, а MCP
активно им это подсказывает. Аудит ниже — по факту грепа, не по памяти.

**Приоритет 0 — источники истины для агентов. Без них остальное бесполезно.**

| Файл                                                                                    | Что там                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `libs/form-mcp/src/data/directive-registry.ts`                                          | 7 захардкоженных `@form.*` — это **код**, не доки; его отдаёт `get_directives` |
| `libs/form-mcp/src/data/directive-registry.spec.ts`, `loader.spec.ts`, `server.spec.ts` | тесты реестра                                                                  |
| `libs/form-mcp/README.md`, `README.ru.md`                                               | описание инструментов                                                          |
| `libs/forms/docs/zenstack.md` (25 вхождений)                                            | единственный источник; `form-mcp` копирует `docs/` при сборке (`loader.ts:11`) |

Агент читает MCP, а не README. Пока реестр отдаёт `@form.*`, любой consumer-агент будет писать
`@form.*`, сколько бы раз ни переписали README. **Реестр обновляется первым в фазе 3, не последним.**

**Приоритет 1 — правила и инструкции репозитория (учат синтаксису напрямую).**

- `CLAUDE.md` — воркфлоу «`schema.zmodel` @form.\* → `nx zenstack:generate`» + ссылка на новый
  doc-файл в разделе «Документация» (требование самого `CLAUDE.md`).
- `AGENTS.md` — зеркало для Codex, **ведётся вручную**, само не подтянется.
- `.claude/rules/forms.md` — там прямое «**ОБЯЗАТЕЛЬНО** используй `@form.*` директивы».
- `.claude/rules/form-delegation.md` — протокол делегации, ссылается на `get_directives`.
- `.claude/agents/db-schema-assistant.md`, `form-generator.md`, `refactor-expert.md` — три
  субагента с `@form.*` в промпте.
- `.claude/commands/forms-coordinator.md`, `forms-dev.md`, `infra/db-migrate.md`.

**Приоритет 2 — скиллы (+ обязательная пересборка зеркала).**

- `.claude/skills/zenstack-helper/SKILL.md`, `reference/form-directives.md`, `reference/generated-files.md`
- `.claude/skills/form-pipeline/SKILL.md`, `reference/field-types.md`, `reference/zod-meta.md`
- `.claude/skills/ui-ux-audit/reference/ux-patterns.md`
- ⚠️ После правки — `bun scripts/sync-agent-skills.ts` (зеркало `.agents/` для Codex собирается
  скриптом, руками его не редактируют), проверка — `--check`.

**Приоритет 3 — доки библиотек и `.claude/docs/`.**

- `libs/zenstack-form-plugin/README.md`, `README.en.md`, `CHANGELOG.md`
- `libs/forms/README.md`, `libs/forms/docs/zenstack.md`
- `.claude/docs/forms.md`, `.claude/docs/database.md`, `.claude/docs/mcp-servers.md`
- `.claude/docs/external/letar-forms.md`, `.claude/docs/external/zenstack.md`
- **Новый** `.claude/docs/zmodel-comment-directives-vs-ast.md` — разбор класса ловушки
  (метаданные в `///`-комментарии не диагностируются: опечатка молчит, плагин может быть не
  подключён, regex-парсер теряет значение на `:`/`'`). Плюс ссылка из `CLAUDE.md`. Это не
  «заметка по итогам», а единственное место, где зафиксирована причина миграции для тех, кто
  придёт потом.

**Приоритет 4 — публичные приложения экосистемы — ✅ закрыто (2026-09-05, `forms-dev`).**

- `apps/form-docs` — 6 MDX-гайдов в двух языках переписаны на `@meta`:
  `zenstack-plugin.{mdx,ru.mdx}` (убран блок «Legacy syntax»), `relation-fields.{mdx,ru.mdx}`
  (убран `<details>`-блок с legacy-примером), `mcp.{mdx,ru.mdx}` (убрано поле `legacyExample` и
  формулировка «lookup по legacy-имени ради обратной совместимости» — `get_directives` этого
  поля больше не отдаёт, см. `directive-registry.ts`). `src/app/llms.txt/route.ts` уже был на
  `@meta`, правка не понадобилась.
- `apps/form-example` — `schema.zmodel` не содержал `@form.*`-директив вовсе (кодмод dry-run
  → 0 конвертаций, только `///`-комментарии enum-значений, не форм-директивы). `README.md`
  переведён на `@meta("form.*", value)`. `CHANGELOG.md` не трогали — историческая запись о
  прошлой миграции.
- `apps/form-develop-app` — демо новых возможностей уже вносились по ходу фаз 1-3, отдельного
  действия в этой сессии не требовалось.

**Приоритет 5 — статьи (`libs/forms/articles/`) — ✅ закрыто (2026-09-05, `forms-dev`).**

- `articles/08-zenstack-pipeline.md` — убраны два блока про legacy `///`-комментарий (пример +
  примечание к таблице директив). Актуальный аудит на момент правки — 2 вхождения `@form.`
  (не 31 из старой оценки — часть статьи уже была переписана раньше).
- `articles/11-mcp-ai.md` — убрано поле `legacyExample` из примера ответа `get_directives` и
  абзац про него; оставлен `@form.fieldType` только как lookup-ключ инструмента (это и сейчас
  корректно — `directive-registry.ts` использует `@form.*` как внутренний id, не как
  comment-синтаксис).
- `12-open-source.md`, `benchmarks.md`, `visuals-needed.md`, `ARTICLE.md` — повторный grep дал
  0 вхождений `@form.` (старые числа из аудита устарели, эти файлы уже не содержали упоминаний
  на момент этой сессии).
- `articles/images/08-zenstack-pipeline.svg` — при повторной проверке диаграмма уже рисует
  `@meta("form.*")`, не `@form.`; перерисовка не потребовалась (нарисованный текст, видимо,
  обновили в одну из предыдущих фаз без отметки в этом чек-листе).

**Что НЕ трогаем:** архивные `CHANGELOG_*.md`/`PLAN_COMPLETED*.md` приложений (история, не
инструкция), `dist/` (артефакты сборки), `apps/kami-e2e/test-output/` (отчёты Playwright).

### Лестница версий

| Версия    | Что                                            | Ломает?                                                  |
| --------- | ---------------------------------------------- | -------------------------------------------------------- |
| **2.3.0** | 7 атрибутов — закрыто                          | нет                                                      |
| **2.4.0** | остальные 11 + `message` + `@omit`/`@computed` | поведение форм меняется, API — нет                       |
| **2.5.0** | `@@validate` + `@@strict`                      | нет                                                      |
| **3.0.0** | `@meta` основной, `@form.*` deprecated         | да — контракт схемы (и, возможно, архитектура генерации) |
| **4.0.0** | `@form.*` удалён                               | да — старые схемы перестают работать                     |

Мажор нужен, но не сразу: 2.4.0/2.5.0 — аддитивные и дают весь выигрыш по валидации, не трогая
ни одной схемы. Начинать с 3.0.0 нельзя, пока spike не закрыт.

### Потребители (14 приложений, 831 вхождение `@form.*`)

`@form.title` 355 · `@form.exclude` 152 · `@form.fieldType` 139 · `@form.placeholder` 81 ·
`@form.props` 59 · `@form.description` 37 · `@form.relation` 3 · несуществующие 5.

- **Мои (экосистема):** `form-develop-app`, `form-example` — на них spike и обкатка.
- **Публичные:** `animatrona`, `animatrona-tracker`, `archetest`, `grandslamcup`, `kami`,
  `label-printer-desktop`, `mandala`.
- **Приватные submodule:** `aboi`, `domwellbes`, `driving-school`, `dsperevod`, `studio`,
  `svoichuzhie` — только через broadcast их агентам, прямых правок не делаю.

### Что НЕ делаем

- Не переносим в `@meta` то, у чего нет смысла в схеме БД (layout формы, порядок шагов визарда) —
  это остаётся в коде приложения.
- Не заводим свой парсер выражений для `@@validate` — берём `ZodUtils.addCustomValidation`.
- Не делаем миграцию одним PR на 14 приложений: кодмод по приложению + просмотр диффа.
- Не трогаем `@form.props` для UI-пропсов (`showValue`, `count`, `layout`) в фазах 1-2 — они
  не дублируют ничего нативного, их очередь только в фазе 3.

## ✅ [2026-09-04] `zenstack-form-plugin` не наследует нативные ZModel-атрибуты валидации — закрыто

- **Запросил:** domwellbes-dev
- **Приоритет:** normal
- **Описание:** Генератор (`libs/zenstack-form-plugin`) не читает нативные ZModel-атрибуты
  `@email`/`@length`/`@gte`/`@gt`/`@lte`/`@lt`/`@regex` (официальный ZenStack input-validation,
  уходит в runtime write-валидацию ORM через `@zenstackhq/zod`) — `field.attributes` используется
  только для `@default`/`id`/`relation` (`model-generator.ts:78,137-138`). Все `.min()/.max()/
  .email()/...` в сгенерированной `<Model>CreateFormSchema` берутся исключительно из своей
  комментарий-директивы `@form.props({...})` (`parser.ts:107`). Поле с нативным атрибутом без
  параллельного `@form.props` — тихий дрейф: ORM валидирует на `create`/`update`, форма
  пропускает до сабмита, ошибка прилетает только с сервера после round-trip.
- **Решение координатора (расширено после повторного разбора):** это не только пробел в
  генераторе — README и `zenstack-helper` skill учат `@form.props({min, max, ...})` как
  **основной** способ задать constraint, ни разу не упоминая нативные ZModel-атрибуты.
  Задача расширена на разворот документации, не только код:
  1. Код — наследуем шесть частых атрибутов (`@email`, `@length(min,max)`, `@gte`/`@gt`/`@lte`/
     `@lt`, `@regex`), `@form.props` остаётся источником истины при явном конфликте (обратная
     совместимость для 29+ существующих мест).
  2. `libs/zenstack-form-plugin/README.md` + `.claude/skills/zenstack-helper/reference/
     form-directives.md` — переписать: нативные атрибуты — рекомендуемый путь, `@form.props`
     для constraints — escape hatch для намеренных расхождений клиент/сервер, а не основной
     механизм. UI-пропсы (`showValue`, `layout`, ...) в `@form.props` остаются как есть.
  3. Заметка для авторов существующих `@form.props`-constraints — какие теперь избыточны
     (не гейт, не принудительная миграция).
  4. **Три конкретных случая**, где `@form.props` осознанно побеждает нативный атрибут (не
     только «уже так написано») — задокументировать явно, не одной строкой «обратная
     совместимость»:
     - общая библиотечная схема (`@letar/zenstack-fragments` и т.п.) с per-consumer
       переопределением в конкретном приложении;
     - валидация до нормализации ≠ после (нативный атрибут описывает хранимый формат,
       `@form.props` — формат, который реально печатает пользователь, до transform);
     - осознанный staged rollout нового серверного ограничения — форма временно мягче, пока
       `@form.props` явно не уберут.
       Заметка про вычистку избыточных `@form.props` (п.3) относится только к дрейфу, не
       подпадающему ни под один из трёх случаев.
  5. **После того как п.1-3 в main и form-schemas пересобраны** — вычистить дубли в экосистемных
     демо (`apps/form-develop-app/schema.zmodel`, `apps/form-example/schema.zmodel`): убрать
     `@form.props`-ключ там, где он совпадает со значением нативного атрибута на том же поле и
     не подпадает ни под один из трёх случаев из п.4. Не трогать `label-printer-desktop`/
     `mandala` и приватные submodule напрямую — это чужие приложения; координатор разошлёт им
     broadcast с той же инструкцией после того, как экосистемные демо готовы (14+15 occurrences
     из известных 29, плюс неизвестное число в приватных submodule).
- **Реализовано (п.1, код):** `model-generator.ts` — `extractNativeConstraints()` читает
  `@email`/`@length`/`@gte`/`@gt`/`@lte`/`@lt`/`@regex` из `field.attributes` (AST, `$refText` с
  `@`, как у `@default`), мержит в `formMeta.constraints` с приоритетом уже распарсенного
  `@form.props` (`{ ...native, ...explicit }`). `@gt`/`@lt` — новые ключи `exclusiveMin`/
  `exclusiveMax` в `ZodConstraints` (Zod `.min()`/`.max()` включительны, семантически
  соответствуют только `@gte`/`@lte`) → генерируются как `.gt()`/`.lt()`. `parser.ts` —
  `exclusiveMin`/`exclusiveMax` добавлены в `ZOD_CONSTRAINT_NAMES`, чтобы `@form.props` тоже мог
  их явно переопределять. 6 новых тестов в `model-generator.spec.ts` (наследование каждого
  атрибута, конфликт ключа с `@form.props`, объединение разных ключей без конфликта,
  `.gt()`/`.lt()` в сгенерированном коде) — 85/85 зелёных, `typecheck:tsgo`/`lint` чистые.
- **Реализовано (п.2-4, документация):** `libs/zenstack-form-plugin/README.md` и
  `.claude/skills/zenstack-helper/reference/form-directives.md` — секция про `@form.props`
  переписана: таблица маппинга нативных атрибутов на Zod-constraints, `@form.props` явно назван
  escape hatch с тремя описанными случаями (per-consumer override общей схемы, валидация
  до/после нормализации, staged rollout серверного ограничения), пример `portions` заменён на
  `@gte(1) @lte(100)` с `@form.props` только для UI-пропса. Заметка про вычистку избыточных
  ключей — есть, без гейта.
- **П.5 (чистка демо) — проверено, изменений не потребовалось.** В `apps/form-develop-app/
  schema.zmodel` и `apps/form-example/schema.zmodel` найдено всего 4 вхождения `@form.props`
  (не 14+15, как предполагалось в исходной оценке) — ни одно не дублирует нативный атрибут:
  `portions`/`price` используют `@form.props({min/max})` **без** параллельного `@gte`/`@lte`
  (сам тихий дрейф, не дубль — добавление нативных атрибутов сюда было бы миграцией существующих
  мест, что явно не требовалось), `rating` в обоих — чистые UI-пропсы (`count`, `allowHalf`).
  Пересборка `form-schemas`/e2e не потребовалась — файлы не менялись.
- **Версия:** `@letar/zenstack-form-plugin` v2.3.0, `CHANGELOG.md`.
- **Статус:** закрыто, ответ отправлен `forms-coordinator-dev` (thread `1102`). Broadcast
  консьюмерам (`label-printer-desktop`, `mandala`, приватные submodule) — на координаторе.

## ✅ [2026-09-04] `Form.When` — потеря фокуса при скрытии условного блока — закрыто

- **Запросил:** studio-dev (ui-coordinator-dev нашёл аналогичный баг в `libs/ui/CookieBanner`,
  спросил, применим ли тот же класс к `libs/forms` — см. тред `ui-cookie-banner-focus-fix`)
- **Приоритет:** normal
- **Описание:** `FormWhenContent` (`libs/forms/src/lib/declarative/form-when.tsx`) размонтировал
  `children` при `shouldRender → false` без переноса фокуса. Если `document.activeElement` был
  внутри скрываемого блока — фокус падал на `<body>`, клавиатурный/скринридер-пользователь терял
  место в форме.
- **Чем отличается от `CookieBanner`:** там при разворачивании панели цель детерминирована
  (первый интерактивный элемент новой панели, мгновенно доступен через ref в момент mount). Здесь
  задача обратная — скрытие, а не появление: скрываемый DOM-узел удаляется в том же commit, где
  нужно решить, куда переносить фокус, поэтому нет DOM-таргета, который переживёт удаление.
- **Фикс:** постоянный невидимый фокусируемый якорь (`<span tabIndex={-1}>`, визуально скрыт CSS,
  помечен `data-form-when-focus-anchor`), рендерящийся в `FormWhenContent` **независимо** от
  `shouldRender` — не размонтируется вместе с блоком. Факт «фокус был внутри блока перед
  скрытием» отслеживается непрерывно через `document`-level `focusin` (обновляет `wasFocusInsideRef`
  каждый раз, когда фокус реально переходит на новый элемент), а НЕ через `focusout` на
  контейнере — снятие сфокусированного узла с DOM само по себе синхронно генерирует blur/focusout,
  неотличимый от «пользователь ушёл сам». При транзиции `shouldRender: true → false`, если
  `wasFocusInsideRef.current` истинен — фокус переводится на якорь; если ложен (фокус был снаружи,
  например на другом кликнутом контроле) — ничего не трогаем.
- **Проверено:** `libs/forms/src/lib/declarative/form-when.spec.tsx` — новый describe
  «a11y: перенос фокуса при скрытии условного блока», два кейса (реалистичный сценарий через
  `Form.Watch`, меняющий условие изнутри самого скрываемого поля; и негативный кейс — фокус вне
  блока не трогается). `npx vitest run src/lib/declarative/form-when.spec.tsx` — 19/19 зелёные.
- **Аналоги в других скинах/фреймворках:** `forms-shadcn`/`forms-vue`/`forms-angular` не имеют
  собственной реализации `Form.When` — фикс затрагивает только `libs/forms` (React/Chakra).
- **Версия:** v2.8.2, `CHANGELOG.md`.
- **Статус:** закрыто, ответ отправлен `forms-coordinator-dev`.

## ✅ [2026-08-26] `react-hooks/rules-of-hooks` ложно валил `forms-vue`/`forms-vue-shadcn` — закрыто

`nx run @letar/forms-vue:lint` (и `forms-vue-shadcn`) падал 74 ошибками `react-hooks/rules-of-hooks`
на Vue composables (`useAppFormContext`, `useFormGroup`, `useMaskField` и т.п.), вызываемых внутри
Vue `setup()` — статический анализ принимал их за React Hook по конвенции имени `use*`.

- **Причина:** централизованный фикс от 2026-08-19 (регистрация `eslint-plugin-react-hooks` в
  корневом `eslint.config.mjs`, см.
  [eslint-flat-react-typescript-missing-react-hooks-plugin.md](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md))
  зарегистрировал правило для **всех** `**/*.ts`/`**/*.tsx` монорепо без ограничения по проекту —
  раньше плагин вообще не резолвился, поэтому ложные срабатывания на этих двух Vue-либах не были
  видны никому. Существующий `.oxlintrc.json`-override в обеих либах не спасал: он настраивает
  только `oxlint`, а `nx lint` для проектов с `eslint.config.mjs` дополнительно гоняет отдельную
  ESLint-команду поверх `dependsOn: [oxlint]`.
- **Фикс:** override в `libs/forms-vue/eslint.config.mjs` и `libs/forms-vue-shadcn/eslint.config.mjs`
  (после `...baseConfig` — поздний объект в flat config перекрывает правило для совпадающих
  файлов), отключающий `react-hooks/rules-of-hooks`/`exhaustive-deps` только для этих двух
  проектов. Остальной монорепо и корневой `eslint.config.mjs` не тронуты.
- Версии/CHANGELOG обеих либ не менялись — правка только конфигурации линтера, публичный код и
  API не затронуты.
- Проверено: `nx run @letar/forms-vue:lint --skip-nx-cache` и
  `nx run @letar/forms-vue-shadcn:lint --skip-nx-cache` — зелёные (`git status` подтверждает, что
  изменены только два `eslint.config.mjs`).
- `libs/forms-angular` использует тот же паттерн (`export default [...baseConfig]`, без override)
  и потенциально подвержена тому же классу бага, но сейчас в нём нет функций `use*` — открытая
  находка, не задача (см. ниже).

**[2026-08-26] Проверка `forms-angular` — превентивный override решено не добавлять.** Файловый
грепом по `libs/forms-angular/src` (`export function use*`/`export const use*`, а также любые
вызовы `use[A-Z]\w*(`) не нашёл ни одной функции `use*` — только упоминание в комментарии про
Vue-версию. Причина не только «пока нет», но и структурная: Angular-конвенция для переиспользуемой
логики — DI-сервисы (`*.service.ts`, `inject(Service)`), не композиции по имени `use*`, как в
React/Vue. Файлы `forms-angular` называются `*.component.ts`/`*.service.ts`/plain-утилиты
(`pin-input-utils.ts`, `zod-validator.ts`) — не `use-*.ts`, как в `forms-react`/`forms-vue`. Риск
ниже, чем был у Vue: там `use*` — стандартная конвенция экосистемы (composables), которую баг и
поймал. Override не добавлен; если позже в `forms-angular` появится функция `use*` (маловероятно,
но не исключено) — применить тот же паттерн, что в `forms-vue/eslint.config.mjs`.

## ✅ [2026-08-19] DataGrid — редактирование enum/boolean-колонок — закрыто

Задача не из backlog: `EditableCell` в `field-data-grid.tsx` рендерил текстовый/числовой `<Input>`
для любого `fieldType`, включая `enum`/`boolean` — не было ветвления, которое уже есть в соседнем
`EditingCell` (`TableEditor`, `table-cell.tsx`).

- **Реализация:** перенесено ветвление из `table-cell.tsx` — `NativeSelect.Root` для enum
  (`enumValues` проброшен новым пропом `EditableCell.enumValues`, источник — `resolved?.enumValues`
  в `FieldDataGrid`), нативный `<input type="checkbox">` для boolean, коммит на `onChange`.
  `table-cell.tsx` не менялся.
- Версия: `@letar/forms` 2.6.1 → 2.7.0.
- Проверено: `nx test @letar/forms -- field-data-grid.spec.tsx` (9/9), `typecheck:tsgo`, `lint` —
  зелёные.

## ✅ [2026-08-19] Дедуп коэрсии значения ячейки таблицы `TableEditor`/`DataGrid` — закрыто

Задача на аудит (не из backlog): проверить `field-data-grid.tsx` (`EditableCell`) на устойчивость
к тому же классу бага, что чинили в `TableEditor` в v2.6.0 (клавиатурная навигация теряла значение
из-за размонтирования `<Input>` без нативного `blur`), и оценить дедуп общей логики.

- **Вывод по багу:** сейчас не воспроизводится — `DataGrid` не имеет внешней клавиатурной
  навигации между ячейками (нет аналога `use-table-navigation.ts`), коммит идёт только изнутри
  инпута. Если такую навигацию добавят — использовать `commitEditingCellRef`
  (`TableEditorContextValue`), уже существующий паттерн из `table-cell.tsx`. Не заводил ref
  заранее в `DataGrid` — сейчас его некому вызывать, был бы мёртвый код.
- **Дедуп:** `Number(localValue) || 0` дублировался в трёх местах `table-cell.tsx` и двух местах
  `field-data-grid.tsx`. Вынесен в `useEditableCellValue`
  (`libs/forms/src/lib/declarative/form-fields/table/use-editable-cell-value.ts`).
- Версия: `@letar/forms` 2.6.0 → 2.6.1. Публичный контракт не менялся.
- Проверено: `nx test @letar/forms` (изолированно по затронутым спекам — зелёные; полный прогон
  имеет 1 неродственный флейк на `field-rich-text.spec.tsx` под нагрузкой, не связан с этим
  изменением), `typecheck:tsgo`, `lint` — зелёные.

## ✅ [2026-08-19] Дедуп enum/boolean-разметки ячейки `TableEditor`/`DataGrid` — аудит, без изменений

Задача на аудит (не из backlog): после переноса ветвления enum/boolean в `EditableCell`
(предыдущая запись) оценить, стоит ли вынести сам `NativeSelect`/`<input type="checkbox">` в общий
презентационный компонент (`EditingCell` в `table-cell.tsx` и `EditableCell` в
`field-data-grid.tsx` теперь рендерят почти одинаковый JSX).

- **Вывод: не выносить.** Совпадает только форма разметки, семантика вокруг неё расходится по
  четырём независимым осям:
  - **Фокус.** `EditingCell` получает `ref` от родителя и ставит фокус через `useEffect`
    (`ref.current.focus()`) — фокус-менеджмент общий с текстовым `Input` той же ячейки.
    `EditableCell` использует `autoFocus` напрямую, ref ему не нужен.
  - **Коммит.** `EditingCell` вызывает `onChange` (обновляет форму сразу) и отдельно `onBlur`
    (выходит из режима правки) — оба нужны, потому что `TableEditor` поддерживает клавиатурную
    навигацию между ячейками (`commitEditingCellRef`, см. предыдущую запись). `EditableCell`
    коммитит и закрывает редактирование одним `onSave` на `onChange` — у `DataGrid` такой
    навигации нет.
  - **Обёртка.** `EditingCell` сам рендерит `<Table.Cell>` (используется вне `flexRender`).
    `EditableCell` рендерится изнутри `cell: ({ row, getValue }) => ...` TanStack Table — ячейку
    уже создал `flexRender`, обёртка была бы лишней и сломала бы разметку.
  - **Стили.** `size="sm"` + `borderColor` от `hasError` в `TableEditor` против `size="xs"` без
    состояния ошибки в `DataGrid` (у `DataGrid` нет `field.state.meta.errors` на уровне ячейки).
  - Общий компонент пришлось бы параметризовать по всем четырём осям (options для фокуса, два
    колбэка вместо одного, флаг «оборачивать в Table.Cell», размер+error-проп) — получившийся
    интерфейс был бы не короче, чем сами 20–25 строк JSX, которые он заменяет. Для чекбокса это
    уже явно зафиксировано соседним комментарием в `table-cell.tsx`: «слишком простой для
    отдельного компонента» — тот же принцип, применённый к enum-ветке.
- Публичный API `Form.Field.TableEditor`/`Form.Field.DataGrid` не менялся. Код не менялся.

---

## ✅ [2026-08-17] Дублирующиеся версии `@tiptap/core` в forms-vue/forms-vue-shadcn — закрыто

Побочная находка предыдущей сессии: `typecheck:tsgo forms-vue` падал на 17 ошибок в
`rich-text-actions.ts`/`use-rich-text-field.ts`. Причина — `@tiptap/vue-3` был пинён точной
`3.29.2` (корневой `package.json` + devDependencies `forms-vue`/`forms-vue-shadcn`), а
`@tiptap/starter-kit`/`@tiptap/extension-placeholder` резолвились в `3.30.1` — два экземпляра
`@tiptap/core` в одном `node_modules` ломали структурную совместимость типов `Node`/`Mark`.

- **Фикс:** `@tiptap/vue-3` поднят до `3.30.1` (существующий релиз, peer-зависимость на
  `@tiptap/core@3.30.1`) — в корневом `package.json`, `forms-vue`, `forms-vue-shadcn`. Заодно
  выровнены пины `forms-angular` (активного конфликта не было, но `^3.29.2` расходился с
  реальным резолвом `3.30.1`).
- Проверено: `typecheck:tsgo` + `nx test` на всех трёх либах — зелёные (`forms-vue`: 17 ошибок → 0).
- Версии: `forms-vue` 0.15.1 → 0.15.2, `forms-vue-shadcn` 0.16.0 → 0.16.1, `forms-angular`
  0.1.3 → 0.1.4.

---

## ✅ [2026-08-17] Дедуп `use-table-columns.ts` (резолв колонок из schema) — закрыто

Продолжение находки выше: `mapZodType`/`findFieldByPath`/`getArrayElementFields`/
`fieldInfoToColumn`/`mergeColumns`/`camelToTitle` дублировались почти дословно в четырёх местах —
`@letar/forms`, `@letar/forms-shadcn` (оба — React `useMemo`-хук), `@letar/forms-angular` и
`@letar/forms-vue` (оба — обычная функция `resolveTableColumns`). У `forms-vue` все шесть имён,
плюс сама функция — часть публичного API пакета (реэкспорт из `src/core.ts`), сохранены поимённо.

- **Дедуп:** `resolveTableColumns()` + вспомогательные `mapZodType`/`camelToTitle`/
  `fieldInfoToColumn`/`mergeColumns`/`getArrayElementFields` — все в `@letar/forms-core/table`
  (`table-columns.ts`), framework-free (только `traverseSchema` из `@letar/forms-core/schema`).
  `forms`/`forms-shadcn` оборачивают в `useMemo` (React-специфика), `forms-angular`/`forms-vue` —
  тонкий реэкспорт без обёртки (headless, вызывается напрямую в `computed()`/render-замыкании).
- Версии: `@letar/forms-core` 0.8.0 → 0.9.0, `@letar/forms` 2.5.1 → 2.5.2, `@letar/forms-shadcn`
  0.33.1 → 0.33.2, `@letar/forms-angular` 0.1.2 → 0.1.3, `@letar/forms-vue` 0.15.0 → 0.15.1 —
  везде внутренний рефакторинг, публичные контракты не менялись.
- Проверено: `typecheck:tsgo` + `nx test` на всех пяти либах (`forms-vue` — типовые ошибки в
  `rich-text-actions.ts`/`use-rich-text-field.ts` от дублирующихся версий `@tiptap/core` в
  lockfile, не связаны с этим изменением, не трогал).

---

## ✅ [2026-08-17] Дедуп `tableFeatures()` DataGrid + тесты `field-data-grid.tsx` — закрыто

Две находки по итогам миграции `@tanstack/react-table`/`table-core` v8→v9 (см. `2.5.0` в
CHANGELOG): `fieldDataGridFeatures = tableFeatures({...stockFeatures, ...})` дублировался почти
дословно в `@letar/forms`, `@letar/forms-shadcn` и `@letar/forms-angular`, а `field-data-grid.tsx`
(самый большой и самый рискованный файл миграции — drag-drop колонок, resize, виртуализация) был
единственным из четырёх мигрированных без `.spec.tsx`.

- **Дедуп:** `createDataGridTableFeatures()` в `@letar/forms-core/table` (`table-features.ts`),
  построена на `@tanstack/table-core` (framework-agnostic, тот же пакет уже был прямой
  зависимостью `@letar/forms-angular`) — три потребителя заменили инлайновый `tableFeatures(...)`
  на вызов фабрики; Angular передаёт `coreReactivityFeature: storeReactivityBindings()` вторым
  аргументом (headless-специфика, React/shadcn его не используют).
- **Тесты:** `libs/forms/src/lib/declarative/form-fields/table/field-data-grid.spec.tsx` — рендер,
  сортировка по клику на заголовок, текстовый фильтр (`filterFns`-регистрация через `'auto'`),
  пагинация, `rowSelection` (indeterminate на чекбоксе «выбрать всё», bulk-удаление),
  `virtualized` не падает при рендере. 8 тестов, за образец взят
  `libs/forms-shadcn/src/lib/fields/field-data-grid.spec.tsx`.
- Версии: `@letar/forms-core` 0.7.0 → 0.8.0 (новый публичный экспорт), `@letar/forms` 2.5.0 →
  2.5.1, `@letar/forms-shadcn` 0.33.0 → 0.33.1, `@letar/forms-angular` 0.1.1 → 0.1.2 (все —
  внутренний рефакторинг, публичный контракт `Form.Field.DataGrid` не менялся).

---

## ✅ [2026-08-13] Фаза 9: паритет Vue-полей (61/61) — разворот решения Фазы 7.8 — закрыта

(Гигиена 2026-09-04: заголовок держал устаревшие маркер 🔄 и число 57/57 из момента постановки
задачи — фактическое закрытие 61/61 задокументировано ниже по тексту, см. «Фаза 9 полностью
закрыта».)

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

### ⏸️ [2026-09-05] `Form.ActiveFilterChips`/`useActiveFilterChips` — вынос вёрстки чипов активных фильтров — отложено (от letar-dev)

- **Запросил:** `letar-dev` (по итогам сессии, где `getActiveUrlSyncFields` уже был использован для
  демо-компонента `ActiveFilterChips` в `apps/form-develop-app/src/app/filters-state-demo/page.tsx:142-179`).
- **Вопрос:** стоит ли поднять саму вёрстку (HStack + Tag.Root/Tag.Label + Button с
  `aria-label="Сбросить <field>"`, ~40 строк) из демо в `libs/forms` как готовый компонент, чтобы
  будущие потребители (первый вероятный — фасетные фильтры каталога domwellbes,
  materials/works, см. `faceted-catalog-pitfalls.md §5`) не копировали её руками.
- **Решение: не выносить сейчас.** У паттерна пока **один** потребитель — сама демо-страница
  форм-библиотеки, которая существует для иллюстрации `getActiveUrlSyncFields`, а не как реальное
  приложение с фильтрами. Второго реального потребителя (domwellbes или любой другой каталог)
  ещё не появилось: заявка на него — предположение, не подтверждённый запрос. Извлечение компонента
  без второго потребителя означает угадывать API вслепую (набор пропсов, что кастомизируется —
  цвет тега, иконка крестика, лейбл поля vs имя поля) — типичная мёртвая абстракция, которую потом
  придётся либо ломать, либо обрастать флагами под первого же реального клиента.
- **Что сделано вместо этого:** оставлена данная запись как справка на будущее + сам хелпер
  `getActiveUrlSyncFields` (см. запись ниже, ✅ закрыта) уже даёт весь нужный **данные**-контракт
  (`{ field, value }[]`), поэтому вынос вёрстки остаётся чисто UI-задачей, не требующей менять
  логику.
- **Если/когда появится второй реальный потребитель** — согласовать API с уже существующими
  соседями в том же файле (`use-form-url-sync.ts`: `FormUrlSync`/`useFormUrlSync`/
  `getActiveUrlSyncFields`) и `useActiveFiltersCount` (`use-active-filters-count.ts`) для
  консистентности натуринга (`use*` для хука без вёрстки, `Form.*` для renderless/UI-компонента).
  Учесть: `@letar/forms` — Chakra-скин, `Tag.Root`/`Button` — специфика этого скина; аналог для
  `forms-shadcn`/`forms-vue`/`forms-vue-shadcn`/`forms-angular` заводить отдельно и только когда
  для них паттерн реально запросят — паритет полей у них история про поля форм, не про этот
  вспомогательный UX-паттерн.

### ✅ [2026-09-05] `getActiveUrlSyncFields` — публичный diff-хелпер для `useFormUrlSync` (от letar-dev) — закрыто

- **Запросил:** `letar-dev`
- **Приоритет:** low (сам инициатор пометил как неспешное)
- **Описание:** экспортировать приватный `isDefaultValue` (`libs/forms/src/lib/declarative/use-form-url-sync.ts:227`,
  сейчас используется только внутри `subscribe`-замыкания `FormUrlSync` на строке 167) и добавить
  тонкую обёртку поверх него —
  `getActiveUrlSyncFields<TData extends object>(values: TData, fields: (keyof TData & string)[], defaults: TData): Array<{ field: keyof TData & string; value: unknown }>`.
  Контекст — «Заповедь №18 студии» (`.claude/private/WEBSTUDIO.md`): UX-паттерн URL-фильтров
  требует видимую кнопку «Сбросить все» только когда хотя бы один фильтр активен, плюс убор
  отдельного значения через ✕ на чипе — сейчас этот diff каждый потребитель вынужден был бы
  пересчитывать сам на месте вызова, что противоречит «Заповеди №6» (единый источник истины для
  производного состояния). Предполагаемый первый потребитель — фасетные фильтры каталога
  domwellbes (см. `faceted-catalog-pitfalls.md §5`), но заявка не привязана к конкретному
  приложению.
- **Оценка координатора:** тривиальный фикс (маленький файл, чистый экспорт + обёртка,
  без изменения поведения) — подпадает под «Можешь править библиотеки напрямую для мелких
  фиксов» из `forms-coordinator`, делегация `forms-dev` не обязательна.
- **Статус:** ✅ готово — v2.10.0 (`libs/forms/src/lib/declarative/use-form-url-sync.ts`).
  `isDefaultValue` экспортирован, `getActiveUrlSyncFields` реализована ровно по предложенной
  сигнатуре и переиспользует его напрямую (не дублирует дифф). Реализовано координатором сразу,
  без делегации `forms-dev` — фикс оказался тривиальным, как и планировалось. 6 новых тестов в
  `use-form-url-sync.spec.ts`. README (новый раздел «URL Sync фильтров»), CHANGELOG — обновлены.

### ✅ [2026-08-26] Сообщённый баг TS2739 в `field-type-mapper.tsx` при `persistence` — не подтвердился, закрыто

- **Запросил:** `aboi-dev`, сообщил о `tsgo`-ошибке `TS2739` («missing displayValue, emptyValue»
  для `EditIntentFieldProps`) в `field-type-mapper.tsx:433,440` при добавлении
  `<Form persistence={{...}}>` в `apps/aboi` `gift-form.tsx`, обошёл через `useFormRef()`+
  `onFieldChange` вместо `persistence`.
- **Расследование:** изолированный `nx typecheck:tsgo forms` — чисто; повторный
  `nx typecheck:tsgo aboi --skip-nx-cache` с реально добавленным `persistence` (несколько
  вариантов конфига) на той же схеме/форме — `TS2739` ни разу не воспроизвёлся. Код ветки
  `case 'editIntent'` при ручном разборе типов не содержит несоответствия; `useFormPersistence`/
  `FormPersistenceConfig` структурно не связаны с этой веткой ни по коду, ни по типам.
- **Вывод:** вероятно транзиентная нестыковка инкрементального `tsgo --build` — коммит
  `feat(forms): Form.Field.EditIntent` (`61f2fd38`) и коммит с `gift-form.tsx` в `aboi`
  разошлись всего на 3 минуты. Задокументировано как корроборирующий случай в
  [tsgo-stray-declarations.md](../../.claude/docs/tsgo-stray-declarations.md). `aboi-dev`
  уведомлён через agent-mail, решение — оставлять обходной путь или вернуться к `persistence` —
  за владельцем aboi.

### ✅ [2026-08-26] `Field.Select` — meta `ui.options` теряется через `.nullable().optional()` — закрыто

- **Запросил:** `aboi-dev`, найдено при добавлении nullable enum-поля `Product.mood` (§11.8 R3.4
  `apps/aboi/PLAN.md`). Письмо в agent-mail `forms-coordinator-dev` не доставлено — адресат
  оказался retired на момент отправки, поэтому запись сразу здесь.
- **Проблема:** `Form.Field.Select` без явного `options` берёт список из `resolved.options`
  (`libs/forms/src/lib/declarative/form-fields/selection/field-select.tsx`, `useFieldState`:
  `const sourceOptions = componentProps.options ?? resolved.options ?? []`). Если поле в
  сгенерированной схеме обёрнуто в `.nullable().optional()` (стандартный вывод
  `@letar/zenstack-form-plugin` для nullable enum-поля модели), `resolved.options` приходит
  пустым массивом.
- **Репро:** `apps/aboi/src/generated/form-schemas/Product.form.ts`:
  `mood: ProductMoodFormSchema.nullable().optional()`, где `ProductMoodFormSchema` (из
  `enums/ProductMood.form.ts`) несёт валидный `.meta({ui:{options:[...]}})`. Рендер —
  `<AboiForm.Field.Select name="mood" label="Настроение" />` без `options` prop.
- **Root cause:** Zod v4 хранит `.meta()` в глобальном registry, ключуясь по идентичности
  объекта схемы (`registry._map.get(schema)`), а не разворачивая обёртки — `ZodOptional`/
  `ZodNullable` создают новый объект схемы, и `.meta()` на нём не видит мету внутренней
  enum-схемы. `getSchemaAtPath` (`schema-meta.ts`) до фикса намеренно возвращал схему **до**
  финального unwrap ради случая `z.string().default('x').meta(...)`, где мета висит на самой
  обёртке — но это же решение ломало nullable/optional-случай, где мета висит на внутренней
  схеме.
- **Статус:** ✅ исправлено 2026-08-26 (`@letar/forms-core` 0.9.2 → 0.9.3). `getFieldMeta`
  (`schema-meta.ts`) и `getUIMeta` внутри `traverseSchema` (`schema-traversal.ts`, используется
  `FromSchema`/`AutoFields`) теперь пробуют `.meta()` сначала на схеме как есть, и только если
  там пусто — на схеме, развёрнутой через `unwrapSchemaWithRequired`. Порядок проверки сохраняет
  уже работавший `.default().meta()`-случай. Регресс-тесты — новый `schema-meta.spec.ts` (не
  существовал раньше отдельным файлом для этого хука) + кейс в `schema-traversal.spec.ts`.
  Обход в aboi (явные `options` через `ProductMoodLabels`) можно снять отдельным заходом aboi-dev,
  не блокирует закрытие этой записи.

### ✅ [2026-08-25] `Field.Checkbox` — кликабельная область ~20px вместо 44×44 — закрыто

- **Запросил:** `domwellbes-dev`, найдено полным touch-target sweep публичных страниц (MU1,
  задача №73 `PLAN_INDEX.md`).
- **Проблема:** `chakraUIKit.Checkbox` (`libs/forms/src/lib/declarative/form-fields/base/uikit-chakra.tsx:124-140`)
  рендерит `Checkbox.Root` без `minH` — `getBoundingClientRect()` живого поля даёт `{height: 20}`
  вместо продуктового минимума 44×44 CSS px (WCAG 2.5.5, стандарт domwellbes §4.2
  `PLAN_PUBLIC_MOBILE.md`). Подробности и полная переписка — сообщение `domwellbes-dev` →
  `forms-coordinator-dev` в agent-mail, `topic: form-feature-request`.
- **Статус:** ✅ исправлено 2026-08-26 (v2.7.8). `minH="2.75rem"` + `alignItems="center"` на
  `Checkbox.Root` (то же значение, что уже использует `libs/ui/src/lib/touch-link.tsx`). Только
  `Checkbox.Root` затронут — в этом адаптере нет `Radio.Root` того же паттерна (радиогруппа
  реализована иначе, `field-radio-group.tsx`), проверка «тот же паттерн у Radio.Root» из
  предложенного фикса неактуальна. Регресс-тест — `field-checkbox.spec.tsx`, блок
  «touch target (WCAG 2.5.5)».

### 🟡 [2026-08-23] `EditIntentValue<T>` — явная замена значения без передачи старого — частично закрыто

- **Запросил:** владелец монорепо (Kami), исходный контракт:
  `{ isEdited: boolean; value: ValueType }`; первый consumer — OAuth/OIDC/API keys в
  [`apps/driving-school/PLAN_AUTH.md`](../../apps/driving-school/PLAN_AUTH.md).
- **Приоритет:** high — общий класс edit-форм, где сохранённое значение нельзя или не нужно
  возвращать клиенту.
- **Проблема:** API key/Client Secret нельзя читать повторно, а визуальную маску вроде
  `********7Kp2` нельзя отправлять как новое значение. TanStack `isDirty` здесь недостаточен:
  это техническое состояние формы, а серверу нужен явный intent «оставить» либо «заменить».

**Целевой framework-free контракт:**

```typescript
export type EditIntentValue<T> =
  | { isEdited: false; value: null }
  | { isEdited: true; value: T }
```

`value` присутствует в обеих ветках и стабильно сериализуется в JSON/Server Action. `null` при
`isEdited: false` означает «не изменять»; маска, прежний plaintext и encrypted blob в form state
не попадают. Это discriminated union: `true` без валидного `value` и `false` с непустым `value`
должны отклоняться схемой.

```tsx
const ApiKeyEditSchema = z.object({
  apiKey: editIntentValueSchema(z.string().min(20)),
}).strip()

<Form.Field.EditIntent
  name="apiKey"
  displayValue="************P9x4"
  editLabel="Заменить ключ"
  cancelLabel="Оставить текущий"
  sensitive
>
  <Form.Field.Password name="apiKey.value" autoComplete="new-password" />
</Form.Field.EditIntent>
```

Рабочие имена до API review: `EditIntentValue<T>`, `editIntentValueSchema()` и
`Form.Field.EditIntent`. Не называть компонент `Editable`: `Form.Field.Editable` уже означает
inline-редактирование текста. Если `ReplaceValue` окажется яснее, переименовать согласованно до
первого релиза, не публиковать два синонимичных API.

**Поведение:**

- edit mode стартует как `{ isEdited: false, value: null }` и показывает только безопасный
  `displayValue`/статус «настроено»;
- «Заменить» атомарно выставляет `isEdited: true`, создаёт `value` из `emptyValue` и переводит
  фокус в дочернее поле;
- «Отмена» очищает ввод, удаляет его из DOM и возвращает `{ isEdited: false, value: null }`;
- create mode стартует с `{ isEdited: true, value: emptyValue }`;
- `isEdited` — пользовательский intent, а не производная от `isDirty`: старый secret намеренно
  неизвестен клиенту и сравнить значения нельзя;
- после успешного submit/reset поле получает новый безопасный hint и возвращается в read mode;
- server action обновляет значение только при `isEdited: true`, повторно валидирует `T` и
  выполняет replace-only операцию; при `false` значение не меняется;
- server fixture отдельно отклоняет UI-маски (`********…`) как новое значение: клиентская схема
  не является security boundary;
- server error нового значения привязывается к `${name}.value`, ошибка intent — к `${name}`.

**Безопасность:**

- `sensitive` по умолчанию `true`; opt-out допустим только для несекретного составного значения;
- sensitive `value` автоматически исключается из persistence/localStorage, URL sync, offline
  queue, form history, analytics, devtools/`DebugValues`, comparison и recovery drafts;
- значение не попадает в label/helper/error/toast/log, data/aria attributes или RSC props;
  `displayValue` — отдельный безопасный prop и никогда не копируется в `value`;
- сохранённый secret нельзя reveal/copy: компонент управляет только вводом нового значения;
- cancel, submit и unmount очищают внутренний sensitive state.

**Архитектура и паритет:**

- `@letar/forms-core`: тип, Zod v4 helper с `.strip()` в обеих object-ветках и чистые helpers;
- `@letar/forms-react`: headless intent/focus contract без Chakra/shadcn imports;
- `@letar/forms` и `@letar/forms-shadcn`: одинаковый value contract, разные skins;
- Angular/Vue adapters используют тот же core payload; UI-порт входит в parity-матрицы;
- `FromSchema`/`AutoFields` распознают meta `fieldType: 'editIntent'` только с явно заданным
  inner field — по произвольному object union секретность не угадывать.

**Definition of Done:**

- [x] schema tests: обе валидные ветки, `false + value`, `true + null`, невалидное `T`, strip
      неизвестных ключей и JSON round-trip — `edit-intent-value.spec.ts` (`@letar/forms-core`);
- [x] UI tests (базовый набор): view → edit → cancel, create mode, focus — Chakra
      `field-edit-intent.spec.tsx` (7 тестов) и shadcn `field-edit-intent.spec.tsx` (5 тестов).
      **Не сделано:** disabled/loading state, reset после success, nested server error
      (`${name}.value` ошибка сервера), keyboard/screen-reader-names — отдельная задача;
- [x] security-инфраструктура — **частично реализовано (2026-09-04)**. Общий framework-free
      redaction-слой: `@letar/forms-core/security` → `getAtPath`/`redactAtPaths`/`omitAtPaths`/
      `isKeyOrAncestorOfSensitivePath` (dot-путь, работает и с вложенным `${name}.value`,
      0.10.0 → 0.11.0, тесты — `sensitive-path-utils.spec.ts`, 16 тестов) + реестр
      `SensitiveFieldsProvider`/`useRegisterSensitiveField`/`useSensitiveFieldPaths`
      (`@letar/forms-react`, `useSyncExternalStore`, 0.4.0 → 0.5.0, тесты —
      `sensitive-fields-context.spec.tsx`, 6 тестов). Провайдер монтируется в `Form`/`FormRoot`
      (`@letar/forms`, 2.8.2 → 2.9.0) автоматически — потребителю ничего включать не нужно.
      `useEditIntentField` получил `sensitive?: boolean` (`@default true`) и регистрирует
      `${fullPath}.value` сам; оба скина (`@letar/forms` и `@letar/forms-shadcn` 0.34.0 → 0.35.0)
      пробрасывают `componentProps.sensitive ?? true`. Подключены три потребителя:
      `Form.DebugValues` (маскирует плейсхолдером, тест — `form-debug-values.spec.tsx`),
      `useFormPersistence`/`useFormFeatures` (вырезает из снимка перед `localStorage`, тест —
      `use-form-features-sensitive-persistence.spec.tsx`, интеграционный, через реальный `<Form>`
      + ввод текста), `Form.UrlSync` (пропускает чувствительные поля из whitelist,
      defense-in-depth). **Не сделано:** analytics adapters и offline queue — тот же реестр,
      но не подключён; `forms-shadcn` не имеет собственного `FormRoot`-эквивалента (это
      fields-only скин), поэтому монтирование провайдера там появится только вместе с ним.
      Mask-as-input rejection — ответственность server fixture (уже задокументирована в
      «Поведении» выше), не клиента;
- [x] **2026-09-04:** `useEditIntentField` (`@letar/forms-react` 0.5.0 → 0.5.1) — локальная
      `getByPath` (дублировала `getAtPath` из `@letar/forms-core/security`, добавленную тем же
      релизом security-слоя) удалена, использует общую утилиту. Чистый рефакторинг, 97/97 тестов
      `forms-react` + `typecheck:tsgo` `forms-react`/`forms` зелёные;
- [x] generic tests: `string` API key и object `ValueType` — оба покрыты в
      `edit-intent-value.spec.ts` (`editIntentValueSchema(z.object({...}).strip())`);
- [x] `@letar/forms-core/edit-intent` (тип + `editIntentValueSchema`/`emptyEditIntentValue`/
      `startEditIntentValue`, 0.9.3 → 0.10.0), `@letar/forms-react` `useEditIntentField`
      (headless view/edit/focus-контракт, 0.3.3 → 0.4.0), `Form.Field.EditIntent` в
      `@letar/forms` (Chakra, 2.7.8 → 2.8.0) и `@letar/forms-shadcn` (0.33.6 → 0.34.0) — одна
      headless-логика, разная вёрстка. `FromSchema`/`AutoFields` — `fieldType: 'editIntent'`
      только с явным `fieldProps.innerField`/`displayValue` (без автоугадывания, как и
      требовалось);
  - [x] **2026-09-08:** unified contract-тесты поверх обоих скинов — Chakra уже имел блок
        `describe('submit', ...)` (`{isEdited: false, value: null}` / `{isEdited: true,
        value: "..."}`), shadcn получил зеркальную секцию «итоговый контракт значения
        (эквивалент submit)». Не общий helper (`forms-shadcn` — поле-only скин без
        `createForm()`/кнопки submit) — вместо этого `TestForm` (`@letar/forms-react/testing`,
        0.6.0 → 0.6.1) получил `onFormReady?: (form) => void`, тесты читают `form.state.values`
        напрямую. Оба набора теперь проверяют один и тот же контракт, разными механизмами
        получения итогового значения — большего единообразия без полноценного `createForm()`
        в shadcn-скине не добиться;
  - [ ] **Не сделано:** `forms-vue`/`forms-vue-shadcn`/`forms-angular` parity;
  - [x] **2026-09-08:** интерактивные демо во всех трёх потребительских приложениях —
        `apps/form-develop-app/src/app/edit-intent-demo/page.tsx` (edit mode + create mode,
        ссылка с главной), `apps/form-docs` `content/docs/fields/specialized.mdx`/`.ru.mdx`
        (новая секция «EditIntent» + `<SkinCodeFile>`, читает демо-файл с диска на сборке),
        `apps/form-example/src/app/examples/edit-intent/page.tsx` (+ пункт навигации). Проверено
        живьём в браузере на всех трёх (edit→cancel/replace/submit-цикл, RU/EN версии доков).
- [x] `docs/fields.md` (таблица + детальный раздел), `CHANGELOG.md` и версии всех четырёх
      пакетов обновлены вместе с реализацией.
- [x] **2026-09-04:** `README.md` библиотеки — добавлен `Form.Field.EditIntent` в пример
      «56 Field компонентов» (комментарий поясняет назначение: секрет, который сервер не
      возвращает повторно).
- [x] **2026-09-04 (проверено, отдельного действия не требовалось):** `form-mcp` —
      `buildFieldRegistry` (`libs/form-mcp/src/data/field-registry.ts`) парсит `details` из
      H2-секции `docs/fields.md` автоматически по совпадению `Form.Field.<Имя>` в заголовке —
      секция «`## Form.Field.EditIntent — Замена значения без передачи старого`» уже присутствует
      с момента реализации фичи, значит `get_field_props`/`get_field_example` уже отдают полный
      `details` без отдельного кода в `form-mcp`. Ложно числилось как «не сделано» — источник
      этой строки не проверялся против реального механизма генерации реестра.
  - [x] **2026-09-19:** строка «`form-docs`/`form-example` демо — не сделано» была устаревшей:
        демо во всех трёх приложениях сделаны 2026-09-08 (см. выше). Удалена как противоречащая.

**Отложено (решение владельца 2026-09-19 — «оставить на потом», в работу не брать):**

- [ ] **Паритет `forms-vue`/`forms-vue-shadcn`/`forms-angular`.** Приложений в `apps/` на этих
      пакетах нет — нужны только для публичной дистрибуции. Ущерб от пропуска: матрицы паритета
      заявляют «61/61 полей», а `EditIntent` в них не входит. Вернуться, если публикация Vue и
      Angular станет приоритетом.
- [ ] **Реестр чувствительных полей не подключён к analytics-адаптерам и offline-очереди.**
      Перед работой проверить: шлют ли они значения полей сейчас. Если шлют — секрет из
      `EditIntent` может туда попасть, тогда пункт поднимается до high.
- [ ] **Пробелы UI-тестов `EditIntent`:** disabled/loading, reset после success, серверная
      ошибка на `${name}.value`, клавиатура и подписи для скринридера. Делать вместе с пунктом
      про analytics/offline.

### ✅ [2026-08-20] Баг: Form.Field.TableEditor застревает в нераскрытом Suspense-boundary (закрыт v2.7.1, от form-example)

- **Запросил:** repo-dev
- **Приоритет:** high
- **Описание:** на `apps/form-example/src/app/examples/table-editor/page.tsx` весь контент
  `Form.Field.TableEditor` (с `selectable`) остаётся в неразвёрнутом React-стриминг-плейсхолдере —
  реальная разметка сидит в осиротевшем `<div hidden id="S:0">` в конце `<body>`, а на месте поля
  в форме стоит нераскрытый `<template id="B:0">`. Все чекбоксы имеют нулевой bounding rect и
  `offsetParent: null`, при этом вычисленные CSS-стили корректны и в консоли нет ни одной ошибки.
  Причина 5 падающих e2e-тестов в `table-editor.spec.ts` (§18.7 M2, паттерн Б). Полный разбор,
  что проверено и исключено (нет `next/dynamic`/`ssr:false`/PPR, не дубль responsive-DOM) — в
  теле сообщения agent-mail, thread `form-example-table-editor-suspense-bug`.
- **Статус:** ✅ исправлено 2026-08-20 (v2.7.1). Причина — не специфична `TableEditor`:
  `createLazyComponent` (общая инфраструктура ленивой загрузки, использует и `DataGrid`, и
  `RichText`, и `extraSelects`/`extraComboboxes`/`extraListboxes` из `createForm`) монтировал
  `<Suspense>` сразу, в том числе на сервере. React стримит содержимое такого boundary в скрытый
  `<div hidden id="S:N">`, а раскрытие делает через `$RC`/`$RB`/`$RV` reveal-script, батчащий swap
  через `requestAnimationFrame` — в скрытой/фоновой вкладке (типично для headless e2e) rAF не
  тикает, boundary виснет навсегда. Подтверждено эмпирически: `document.visibilityState` в
  тестовой вкладке был `hidden`, ручной `requestAnimationFrame` не срабатывал за 2с. Воспроизвёл и
  на `Form.Field.DataGrid` — тот же паттерн, та же причина.
  Фикс — `LazyWrapper` монтирует `<Suspense>` только после клиентского маунта (гейт `mounted`),
  сервер отдаёт только `Skeleton`. Разбор — `.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md`.
  Регресс-тест — `lazy-component.spec.tsx`. Уведомление `forms-coordinator-dev` отправлено.
  **Дополнение 2026-08-20:** тот же паттерн, БЕЗ mounted-гейта, независимо реализован в
  `libs/forms-shadcn` (сестринский пакет, не переиспользует `createLazyComponent` из
  `@letar/forms`) — `field-data-grid.tsx` и `field-rich-text.tsx`. Исправлено тем же способом
  (mounted-гейт перед `<Suspense>`), регресс-тесты через `renderToString` добавлены в
  `field-data-grid.spec.tsx`/`field-rich-text.spec.tsx`. Версия `@letar/forms-shadcn` 0.33.3.
  **Дедуп закрыт (2026-08-20):** общая логика (mounted-гейт + `<Suspense>`) вынесена в
  `createLazyComponent` (`@letar/forms-react`, новый подпуть `lib/lazy/`, `fallback` передаётся
  снаружи как `ReactNode` — слой не знает UI-библиотек). `@letar/forms` (Chakra) теперь тонкая
  обёртка с `Skeleton`-fallback (2.7.1 → 2.7.2), `FieldDataGrid`/`FieldRichText` в
  `@letar/forms-shadcn` вызывают тот же хелпер напрямую со своим div-fallback (0.33.3 → 0.33.4).
  `@letar/forms-react` 0.3.0 → 0.3.1. `typecheck:tsgo`/`lint`/`test` зелёные на всех трёх
  пакетах (722 теста).

### ✅ [2026-08-19] UX: NumberInput не очищал ведущий 0 при фокусе (закрыт v2.5.3, select-on-focus в `field-number*.tsx`)

- **Запросил:** владелец монорепо (Kami), обнаружено вручную в форме тарифа перевозчика
  domwellbes (`create-carrier-tariff-form.tsx`, поле «Минимальный заказ»).
- **Приоритет:** medium
- **Описание:** `FieldNumber` и `FieldNumberInput` (`libs/forms/src/lib/declarative/form-fields/number/field-number.tsx`,
  `field-number-input.tsx`) рендерят пустое числовое поле как `"0"`. При попытке ввести новое
  значение без ручного выделения (Ctrl+A/triple-click) получалась конкатенация вроде `"01500"` —
  стандартное, но неудобное поведение нативного `<input type=number>`. Готового пропа в zag.js
  NumberInput (Chakra UI v3) для авто-очистки/select-on-focus нет — проверено через `get_component_props`.
- **Фикс:** `onFocus={(e) => e.currentTarget.select()}` на `NumberInput.Input` в обоих компонентах
  (select-on-focus — минимально спорный паттерн, не ломает `clampValueOnBlur`/`spinOnPress`).
  Тесты на новое поведение добавлены в `field-number.spec.tsx` и `field-number-input.spec.tsx`.
- **Статус:** ✅ исправлено напрямую (тривиальный локальный фикс, без делегации).

### ✅ [2026-08-19] Баг: Field.Date отдаёт string в onSubmit даже при z.coerce.date() (закрыт v2.6.0, уточнён v2.14.17, от domwellbes)

- **Запросил:** domwellbes-relay
- **Приоритет:** high
- **Описание:** `FieldDate` (`libs/forms/src/lib/declarative/form-fields/datetime/field-date.tsx`)
  хранит и отдаёт значение поля как строку (`YYYY-MM-DD`) независимо от объявленной Zod-схемы —
  `field.handleChange` кладёт в state `e.target.value` без приведения к `Date`. Если схема поля —
  `z.coerce.date()`, TS-тип поля выводится как `Date` (`z.infer`), а фактическое рантайм-значение
  остаётся строкой — `values.someDate.toISOString()` падает в рантайме, `typecheck:tsgo` не ловит
  расхождение. Разбор — [letar-forms-field-date-runtime-string.md](/.claude/docs/letar-forms-field-date-runtime-string.md).
  Workaround-пример — `apps/domwellbes/src/app/(admin)/admin/logistics/carriers/[id]/_components/create-carrier-tariff-form.tsx`.
- **Предлагаемый фикс:** либо `FieldDate` приводит значение к `Date` при коммите, когда схема
  поля — coerce-дата (тип и рантайм синхронизированы), либо документация/типизация компонента
  явно фиксируют, что значение всегда `string`.
- **Статус:** ✅ исправлено 2026-08-19 (v2.6.0). `onChange` теперь коммитит `new Date(raw)`
  (или `undefined` при пустом значении) вместо сырой строки из `<input type=date>` — рантайм
  синхронизирован с выведенным TS-типом (`Date`). Уведомление `domwellbes-relay` отправлено.
  **Уточнение (v2.14.17, проверено по коду 2026-09-19):** `Date` коммитится только когда схема реально
  требует его (`constraints.schemaType === 'date'`, флаг `requiresDateValue` в `field-date.tsx`),
  иначе строка `YYYY-MM-DD` — иначе ломались схемы без `z.date()`.

### ✅ [2026-08-19] Баг: пост-сабмит reset(dataToSubmit) перетирает поле stale initialValue (закрыт v2.6.0, от domwellbes)

- **Запросил:** domwellbes-relay
- **Приоритет:** normal
- **Описание:** `FormSimple`/`FormWithApi` после успешного `onSubmit` вызывает
  `formApi.reset(dataToSubmit)` (`libs/forms/src/lib/declarative/form-root/form-simple.tsx:148`,
  `form-with-api.tsx:160`), что снимает `state.isTouched`. Guard в `FormApi.update()`
  (`@tanstack/form-core`) пропускает перезапись `state.values` новым `defaultValues` только при
  `!isTouched` — сразу после `reset()` он снят. Если следующий ре-рендер родителя пересчитывает
  проп `initialValue` как статический дефолт (не как то, что реально было отправлено), форма
  перетирает поле обратно к дефолту. Бьёт по любому полю, не только по конкретному типу. Разбор —
  [letar-forms-post-submit-reset-stale-initialvalue.md](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md).
  Найдено на `warehouseId` в `apps/domwellbes/.../create-delivery-form.tsx` (некритичный
  косметический баг, `PLAN_LOGISTICS.md` §6 L4.5).
- **Предлагаемый фикс:** после `reset(dataToSubmit)` игнорировать одно следующее расхождение
  входящего `initialValue`, пока форма не была повторно touched, либо не трогать
  `options.defaultValues` при сбросе dirty-состояния, либо явно задокументировать контракт
  «`initialValue` должен отражать реально отправленные данные» в `libs/forms/README.md`.
- **Статус:** ✅ исправлено 2026-08-19 (v2.6.0). Добавлен `usePostSubmitResetGuard`
  (`libs/forms/src/lib/declarative/form-root/use-post-submit-reset-guard.ts`), подключён в
  `FormSimple`/`FormWithApi` — запоминает отправленное значение и восстанавливает его, если
  следующий рендер откатил `state.values` к чужому `initialValue` (ровно один раз, без
  ремонта формы). Регресс-тест — `post-submit-reset-stale-initialvalue.spec.tsx`. Уведомление
  `domwellbes-relay` отправлено.

### ✅ [2026-08-18] Баг: TableEditor теряет введённое значение при Tab/Enter/Escape/стрелках (закрыт v2.6.0, от aboi)

- **Запросил:** aboi-dev
- **Приоритет:** high
- **Статус:** ✅ исправлено 2026-08-19 (v2.6.0). Добавлен `commitEditingCellRef` в
  `TableEditorContextValue` — `EditingCell` регистрирует функцию коммита текущего значения,
  `use-table-navigation.ts` вызывает её перед сменой ячейки на Tab/Enter/стрелках (`Escape`
  намеренно без коммита — это отмена, не сохранение, симметрично `field-data-grid.tsx`).
  Регресс-тесты — `table-keyboard-commit.spec.tsx`. Уведомление `aboi-dev` отправлено.

  (Гигиена 2026-09-04: убран осиротевший черновик-анализ отчёта aboi-dev, дублировавший уже
  зафиксированную выше причину/фикс — сам оригинальный репорт остался в agent-mail, треде
  `forms-bug-tableeditor-keyboard-commit`.)

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

## ✅ Фаза 11: `@letar/forms-angular` — полный порт до 61/61, тем же путём что Vue (Фаза 9) — закрыта

(Гигиена 2026-09-04: заголовок не был помечен ✅, хотя закрытие 61/61 задокументировано ниже,
см. Stage J «Фаза 11 закрыта, 61/61».)

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

### Stage E: +8 полей семейства «выбор» (Select, CascadingSelect, Combobox, Autocomplete, Listbox, RadioCard, SegmentedGroup, ImageChoice) — done [2026-08-14]

Пятый этап — зеркало `libs/forms-vue/src/lib/fields/field-{select,cascading-select,combobox,
autocomplete,listbox,radio-card,segmented-group,image-choice}.ts`. `forms-core` снова не
потребовал ни одной правки: `groupOptions`/`getOptionLabel` (`@letar/forms-core/uikit`)
переиспользованы напрямую для группировки опций `FieldListboxComponent`, как и в Vue-версии.

`FieldSelectComponent` — единственное поле стадии на чистом `[formControl]="ctrl"`; контракт
совпадает с уже существующим `FieldNativeSelectComponent` (headless-скин без CSS/UIKit разводит их
по пропсам, не по разметке — оба нативный `<select>`), разница только в опциональной пустой
`<option>` из `resolvedPlaceholder()`, которую `NativeSelect` не рендерит.

Самое нетривиальное поле — `FieldCascadingSelectComponent`: единственное во всём Angular-порте,
которому нужно значение ДРУГОГО поля формы (`dependsOn`). Vue-версия читает его через
`form.useStore(selector)` — `@tanstack/vue-form` даёт полностью реактивный snapshot всех значений
формы, у Angular `FormGroup` такого нет. Вместо правки `FormRootService` (вне скоупа Stage E) —
подписка на `formRoot.form.valueChanges`: `FormGroup.addControl` сам вызывает
`updateValueAndValidity()` (эмитит `valueChanges` по умолчанию), поэтому одна подписка на value
changes всей формы ловит и «поле-родитель ещё не смонтировано на момент конструирования этого
поля» (порядок конструкторов content-projected детей не гарантирован), и «родитель сменил
значение» — без ручного опроса графа полей. Disable-состояние переключается через
`ctrl.disable()`/`ctrl.enable()`, не `[attr.disabled]` — смешивать нативный атрибут с
`[formControl]` Angular считает ошибкой конфигурации формы (консольное предупреждение).

`FieldListboxComponent` (single/multiple) и `FieldImageChoiceComponent` (single/multiple) держат
`string | string[]` целиком в одном `FormControl` — тот же принцип, что Stage D. Кнопки-опции
(`role="option"`/`"checkbox"`/`"radio"`) без нативного `ControlValueAccessor`, поэтому синк —
`effect()` + `ctrl.events.subscribe()`, как у `FieldDateRangeComponent`/`FieldRadioCardComponent`/
`FieldSegmentedGroupComponent`. `FieldComboboxComponent` — то же самое, но по другой причине:
инпут показывает текст поиска/подпись выбранной опции, а контрол хранит `value` опции — два разных
значения не могут делить один `FormControlDirective`. `FieldAutocompleteComponent` — единственное
из «текстовых» полей стадии на прямом `[formControl]`, поскольку у него значение контрола ВСЕГДА
совпадает с введённым текстом (подсказки — чисто визуальный оверлей, не источник другого значения).

Текущий счёт: **41/61** (33 из Этапа 1–2 + Stage A/B/C/D + Stage E). Тесты —
`app-form.stage-e.spec.ts` (8 тестов: Select — placeholder-опция и submit, CascadingSelect —
список городов зависит от страны + disable пока родитель пуст + сброс значения при смене
родителя, Combobox — фильтрация по подстроке и выбор по клику, Autocomplete — произвольный текст

- подсказки, Listbox — multi-selection в массив, RadioCard — одиночный выбор карточкой,
  SegmentedGroup — одиночный выбор сегментом, ImageChoice — одиночный выбор карточкой с
  изображением), host-компонент `testing/stage-e-host.component.ts`.
  `nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный (55/55 тестов
  всего пакета).

### Stage F: +2 поля (CheckboxCard, Tags) — done [2026-08-14]

Шестой этап — зеркало `libs/forms-vue/src/lib/fields/field-{checkbox-card,tags}.ts`. Без новых
приёмов сверх уже найденных в Stage A/D/E: `forms-core` снова не потребовал ни одной правки.

`FieldCheckboxCardComponent` — тот же `signal` + `effect()`/`ctrl.events.subscribe()`, что
`FieldRadioCardComponent` (Stage E), но значение `string[]` и `role="checkbox"` на каждой
карточке вместо `role="radio"` в `role="radiogroup"` — карточки независимы, поэтому обёртка
`role="group"`, не `role="radiogroup"`.

`FieldTagsComponent` — черновик ввода в отдельном `signal('')`, не связанном с `FormControl` (сам
`<input>` не поле формы — только источник текста для следующего тега); список тегов — тот же
синхронизируемый `signal<string[]>`, что у остальных полей с составным/множественным значением.
Enter добавляет тег из черновика (проверка `minTagLength`/`maxTags`/дубликатов), Backspace на
пустом черновике удаляет последний тег.

Текущий счёт: **43/61** (33 из Этапа 1–2 + Stage A/B/C/D + Stage E + Stage F). Тесты —
`app-form.stage-f.spec.ts` (2 теста: CheckboxCard — множественный выбор карточками, повторный
клик снимает выбор; Tags — Enter добавляет тег, Backspace на пустом черновике удаляет последний),
host-компонент `testing/stage-f-host.component.ts`.
`nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный (57/57 тестов
всего пакета).

### Stage G: +8 полей категории "special" — PinInput, OTPInput, ColorPicker, FileUpload, Address, City, Signature, CreditCard — done [2026-08-14]

Седьмой, самый архитектурно тяжёлый этап Фазы 11 — зеркало
`libs/forms-vue/src/lib/fields/field-{pin-input,otp-input,color-picker,file-upload,address,city,
signature,credit-card}.ts`. `forms-core` снова не потребовал ни одной правки.

`FieldPinInputComponent`/`FieldOtpInputComponent` — N ячеек `<input maxlength="1">`, общая
клавиатурная логика (Backspace/стрелки/paste) вынесена в `core/pin-input-utils.ts`
(`splitPinChars`/`PIN_INPUT_PATTERNS`). OTP добавляет таймер повторной отправки
(`signal`+`setInterval`+`ngOnDestroy`) и `autoSubmit` через
`elementRef.nativeElement.closest('form')?.requestSubmit()` — Angular-эквивалент вызова
`form.handleSubmit()` (TanStack Form API в Vue-composable, для которого у `FormRootService` нет
прямого аналога).

`FieldColorPickerComponent`/`FieldFileUploadComponent` — без новых архитектурных приёмов: то же
Vue-идиоматичное упрощение (нативный `<input type="color">` вместо Ark UI `ColorPicker.Root`) и
переиспользование `processFileWithSecurity` (`@letar/forms-core/security`) без порта.

`FieldAddressComponent`/`FieldCityComponent` — общий контроллер подсказок
`createAddressSuggestions()` (`core/address-suggestions.ts`), Angular-эквивалент Vue composable
`useAddressSuggestions`; `createDaDataProvider`/`AddressProvider` (`@letar/forms-core/address`)
framework-agnostic, порт не потребовался. Единственная находка, специфичная для Angular:
`createAddressSuggestions()` вызывается один раз как инициализатор поля класса, а Angular
заполняет `@Input()` (`minChars`/`debounceMs`) только ПОСЛЕ возврата из конструктора — захват
`this.debounceMs` по значению в момент создания контроллера навсегда зафиксировал бы дефолт
(`300`), даже если шаблон передал `[debounceMs]="0"`. Опции контроллера принимают
`getMinChars`/`getDebounceMs` как геттеры, читаемые лениво в момент вызова (`handleInput`), когда
Angular уже применил биндинг — без этого фикса тест `FieldAddressComponent`/`FieldCityComponent` с
`debounceMs: 0` падал (провайдер не вызывался в течение таймаута теста). Click-outside — через
`document.addEventListener('mousedown', …)` + `DestroyRef.onDestroy()`, регистрируется из
`ngAfterViewInit` (не конструктора — `@ViewChild`-ref контейнера ещё не существует до первого
рендера DOM).

`FieldSignatureComponent` — canvas-подпись (рисование мышью/тачем + typed-режим),
`@ViewChild('canvasEl')` + `ngAfterViewInit` для 2D-контекста (тот же паттерн, что
`DocumentFieldBase`). Экспорт в PNG/SVG data URI — чистые функции, 1:1 порт из
`use-signature-field.ts` (Vue). В jsdom `canvas.getContext('2d')` обычно возвращает `null` — тест
ограничен регистрацией контрола и базовым рендером кнопки очистки, не полноценным рисованием (тот
же выбор, что у React/Vue-тестов этого поля).

`FieldCreditCardComponent` — составное значение `{ number, expiry, cvc }` в одном `FormControl`
(тот же принцип, что `FieldDateRangeComponent`, Stage E). Форматтеры/валидаторы — 1:1
переиспользование `@letar/forms-core/credit-card`. Иконка бренда карты (SVG, Simple Icons) не
портирована — Vue строит её через `h()` (`card-brand-icon.ts`), Angular-эквивалент потребовал бы
набора inline-SVG шаблонов без явной пользы для headless-пруфа; вместо иконки — `data-brand`/
текстовая подпись, вся логика определения бренда и валидации полнофункциональна.

Текущий счёт: **51/61** (33 из Этапа 1–2 + Stage A/B/C/D + Stage E + Stage F + Stage G). Тесты —
`app-form.stage-g.spec.ts` (9 тестов: рендер всех восьми контролов, PinInput — склейка значения,
OTP — таймер + resend, ColorPicker — выбор свотча, FileUpload — добавление/удаление файла,
Signature — рисование + очистка, Address — подсказки + выбор, City — извлечение города из данных
провайдера, CreditCard — составное значение + определение бренда), host-компонент
`testing/stage-g-host.component.ts`.
`nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный (66/66 тестов
всего пакета).

### Stage H: +3 поля — PasswordStrength, Editable, RichText — done [2026-08-14]

Восьмой этап Фазы 11 — зеркало
`libs/forms-vue/src/lib/fields/field-{password-strength,editable,rich-text}.ts`. `forms-core`
снова не потребовал ни одной правки.

`FieldPasswordStrengthComponent`/`FieldEditableComponent` — без новых архитектурных приёмов: тот
же `signal` + `effect()`/`ctrl.events.subscribe()`, что у остальных полей с собственным
UI-состоянием сверх `FormControl` (Stage D/F). Логика расчёта силы пароля
(`checkRequirement`/`calculateStrength`/`getStrengthLabel`) — 1:1 порт Vue-версии, не вынесена в
`forms-core` (единственный потребитель в каждом скине). Находка, специфичная для Angular:
`defaultVisible`/`activationMode` читаются в `ngOnInit()`, а не в конструкторе — Angular
присваивает `@Input()`-поля между конструктором и `ngOnInit()`, в отличие от Vue `setup()`,
получающего уже заполненные `props`.

**`FieldRichTextComponent` — самое архитектурно интересное поле стадии: ленивая загрузка тяжёлого
peer-dep в Angular.** WYSIWYG-редактор на Tiptap (`@tiptap/*`) нужен только этому полю — остальные
text-поля не обязаны его резолвить, та же цель, что `createLazyField`/`defineAsyncComponent` в
`@letar/forms-vue` и `React.lazy`/`Form.Captcha` в React-скине. Реализация
(`field-rich-text-impl.component.ts`) вынесена из тонкой обёртки (`field-rich-text.component.ts`)
и подгружается явным `import()` в `ngAfterViewInit()`; компонент монтируется вручную через
`ViewContainerRef.createComponent()` (Ivy не требует `NgModule`/`ComponentFactoryResolver` для
standalone-компонентов) + `ComponentRef.setInput()` — единственный API, который и присваивает
значение `@Input()`-полю, и вызывает `ngOnChanges()` на созданном экземпляре (обычное
`ref.instance.x = y` этого не делает, а на `ngOnChanges` держится реактивность `FieldBase.meta`).

Рассмотрели и отклонили `@defer` (Angular 17+ встроенный примитив ленивой загрузки блока
шаблона): это трансформация **шаблонного компилятора** потребителя (его Angular CLI/esbuild
находит компонент, использованный внутри блока, и вырезает его импорт из eager-чанка на этапе
сборки), а не самой библиотеки — `forms-angular` раздаётся как сырой TS-исходник
(`customConditions: ["@letar/source"]`), и какой инструмент в итоге компилирует этот файл, решает
потребитель. Код-сплиттинг библиотечного поля не должен зависеть от того, включил ли и как
настроил `@defer`-трансформ конкретный потребитель. Явный `import()` — рантайм-примитив
ES-модулей, переносимый под любой бандлер; ровно то же обещание («резолвится лениво»), но не
завязанное на чужую конфигурацию сборки.

Сама реализация редактора использует `@tiptap/core` напрямую, не `@tiptap/vue-3`/`@tiptap/react`
— у Tiptap нет официального Angular-биндинга. `Editor` из `@tiptap/core` framework-agnostic:
монтирует `contenteditable`-DOM сам, получив `element` (DOM-узел) в конструктор — обёрточный
компонент пакета не нужен. Активность кнопок тулбара не эмитится реактивно самим Tiptap —
`onTransaction` инкрементирует сигнал-«тик» (`editorTick`), от которого читает `isActive()` в
шаблоне (тот же приём, что `hasError`/`errorMessage` в `FieldBase`: `ctrl.events.subscribe()`,
а не `computed` напрямую от `control()`). Синхронизация с внешними изменениями `FormControl.value`
(программный reset формы) — подписка на `ctrl.valueChanges`, порт `watch(options.getValue, ...)`
из `use-rich-text-field.ts` (Vue): пропускается, если содержимое фактически не изменилось (не
тревожит курсор).

Реальный Tiptap-редактор рендерится и тестируется в jsdom без моков — тот же прецедент, что уже
подтверждён для `@tiptap/vue-3` в `forms-vue` (`app-form.stage5b.spec.ts`). `@tiptap/core`,
`@tiptap/extension-placeholder`, `@tiptap/starter-kit` добавлены в `peerDependencies`/
`devDependencies` `libs/forms-angular/package.json`, `bun install` слинковал их в
`libs/forms-angular/node_modules/@tiptap/` (не хоистятся в корневой `node_modules` — вслед за
`@tiptap/vue-3`/`starter-kit`, которые несут свой `@tiptap/core` вложенным транзитивно).

Текущий счёт: **54/61** (33 из Этапа 1–2 + Stage A/B/C/D + Stage E + Stage F + Stage G + Stage H).
Тесты — `app-form.stage-h.spec.ts` (4 теста: рендер всех трёх контролов включая ленивую загрузку
RichText, PasswordStrength — метр силы + чеклист требований + переключатель видимости, Editable —
клик→инпут→Enter-коммит→submit, повторный заход→Escape отменяет черновик, RichText — тулбар +
`contenteditable` + клик по "B" переключает bold), host-компонент `testing/stage-h-host.component.ts`.
`nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный (70/70 тестов
всего пакета).

### Stage I: +4 поля survey/table категорий — Likert, MatrixChoice, TableEditor, DataGrid — done [2026-08-14]

Девятый этап Фазы 11 — зеркало `libs/forms-vue/src/lib/fields/field-{likert,matrix-choice,
table-editor,data-grid}.ts`. `forms-core` снова не потребовал ни одной правки.

`FieldLikertComponent`/`FieldMatrixChoiceComponent` — один `FormControl` на весь вопрос/матрицу
(`number` и `Record<string, string | string[]>` соответственно) — логика 1:1 порт Vue-версии, без
новых архитектурных приёмов (тот же `signal` + `effect()`/`ctrl.events.subscribe()`, что у
остальных полей с составным значением, Stage D/F).

`FieldTableEditorComponent`/`FieldDataGridComponent` — **упрощение относительно React/Vue-версий**:
один `FormControl` на весь массив строк целиком (тот же принцип, что `FieldTagsComponent`, Stage F,
уже применяет к `string[]`), а не отдельный `FormControl`/`form.Field` на каждую ячейку. Add/remove/
move строк и правка ячейки — `ctrl.setValue([...новый массив])`; отдельного `FormArray` не
заводится. Резолв колонок из Zod-схемы (`resolveTableColumns`, `src/lib/core/table-columns.ts`) —
точный порт одноимённого модуля `@letar/forms-vue`: framework-free код (только `traverseSchema`/
`getZodConstraints` из `@letar/forms-core`), но скопирован вручную — `@letar/forms-vue` не публикует
этот файл через свои `exports` (внутренний модуль пакета). DOM `FieldTableEditorComponent`/
`FieldMatrixChoiceComponent` — `<tr>` строго прямые дети `<tbody>`, без `<div>`-обёрток внутри
строки/ячейки: известный баг Chakra-версии `TableEditor` (sortable-строки, невалидный HTML) — этот
класс ошибки в Angular-порте исключён структурой шаблона, не отдельной проверкой.

**`FieldDataGridComponent` — решение не лениво грузить `@tanstack/table-core`, в отличие от
`FieldRichTextComponent` (Stage H, Tiptap).** `@tanstack/table-core` — framework-agnostic ядро без
собственных `dependencies` в своём `package.json` (только `devDependencies` для сборки самого
пакета), на порядок легче ProseMirror-стека, который тянет Tiptap. Тот же движок уже подключён
**статически** (не лениво) в `@tanstack/vue-table`/`@tanstack/react-table` — оба скина
`@letar/forms`, использующие тот же `@letar/forms-core`, не считают нужным откладывать загрузку
именно этой зависимости; вводить асимметрию только в Angular-порте не было причины.
`@tanstack/table-core` добавлен в `peerDependencies`/`devDependencies` `package.json`
(`^8.21.3`, версия синхронизирована с `@tanstack/vue-table`/`@tanstack/react-table`, уже в репо).

Технически `createTable()` (API `table-core`, не хук, framework-agnostic сборка таблицы) вызывается
напрямую — официального Angular-адаптера нет, в отличие от `useVueTable`/`useReactTable`. Инстанс
пересобирается **целиком** внутри `computed()` при каждом изменении `rows`/`sorting`/
`columnFilters`/`rowSelectionState`/`pagination` — состояние держат Angular-сигналы снаружи, а не
мутируемый `table` между рендерами (тот же принцип управления состоянием, что применяет
`@tanstack/svelte-table`: `onSortingChange`/`onColumnFiltersChange`/`onRowSelectionChange`/
`onPaginationChange` только обновляют сигнал, `state` передаётся в `createTable()` контролируемо).
Заголовки/фильтр-инпуты/пагинация рендерятся напрямую из `resolvedColumns()` (`@Input()`), не через
`table.getHeaderGroups()` — `table-core` используется только как чистый движок
сортировки/фильтрации/пагинации (`table.getRowModel().rows`), без `flexRender`-подобного слоя
рендер-функций колонок: в Angular таких общепринятых адаптеров для `table-core` нет, а сам
headless-пруф не ставит целью его написать. CSV-экспорт (`Blob`+`URL.createObjectURL`) — порт
`exportDataGridCsv` (`@letar/forms-vue`).

Текущий счёт: **58/61** (33 из Этапа 1–2 + Stage A/B/C/D + Stage E + Stage F + Stage G + Stage H +
Stage I). Тесты — `app-form.stage-i.spec.ts` (5 тестов: рендер контролов всех четырёх полей, Likert
— клик по точке коммитит значение при submit, MatrixChoice — клик по radio-ячейке пишет составное
значение строки, TableEditor — добавление строки + инлайн-редактирование ячейки + проверка DOM
`<tr>`/`<td>` без обёрток, DataGrid — текстовый фильтр сужает строки + чекбокс включает
bulk-панель), host-компонент `testing/stage-i-host.component.ts`.
`nx run-many -t lint typecheck:tsgo test --projects=@letar/forms-angular` зелёный (75/75 тестов
всего пакета).

### Stage J: +3 поля — Auto, Calculated, MaskedInput — done [2026-08-14] — **Фаза 11 закрыта, 61/61**

Последний этап полного порта. Зеркало
`libs/forms-vue/src/lib/fields/field-{auto,calculated,masked-input}.ts`:

- **`FieldAutoComponent`** — единственный компонент в Stage J, НЕ наследующий `FieldBase`: он не
  регистрирует собственный `FormControl`, а определяет тип поля по `zodType` (`traverseSchema`,
  `@letar/forms-core/schema`) и рендерит один из уже существующих `Field*`-компонентов через
  `@switch` в шаблоне — тот же принцип диспетчеризации, что у Vue-версии
  (`h(FieldInput/FieldNumber/...)` в render-функции), выраженный декларативно, поскольку Angular не
  умеет рендерить компонент динамически по строковому имени без `NgComponentOutlet`.
  string/number/boolean/date/enum, `useTextareaForLongStrings`+`textareaThreshold` для длинных
  строк, `booleanAsSwitch` для чекбокс/свитч — 1:1 с Vue.
- **`FieldCalculatedComponent`** — читает значения ВСЕЙ формы через `formRoot.form.valueChanges`,
  тот же приём, что уже решал задачу «прочитать значение другого поля формы» в
  `FieldCascadingSelectComponent` (Stage E). `name` опционален (как в Vue) — без него поле чисто
  отображает вычисленную сводку, не уходит в submit; если задан — вычисленное значение пишется в
  форму через `formRoot.registerField()`.
- **`FieldMaskedInputComponent`** — наследует `DocumentFieldBase` (Stage B) вместо отдельного
  движка масок: тот же `MaskController` (`@letar/forms-core/mask`), что уже используют 10
  документных полей, `mask`/`formatMode`/`maxLength` переобъявлены как `@Input()` вместо констант
  класса конкретного документа, `validateDocument()` всегда возвращает `undefined` (контрольной
  суммы у универсальной маски нет, ошибка валидности целиком идёт из Zod-подсхемы формы). Ни одной
  правки в `document-field-base.ts` — 10 уже работающих документных полей не затронуты.
  `formatDescription` обязателен (WCAG 3.3.2 — формат ввода должен быть известен до начала ввода).

Финальная сверка: `mcp__form-mcp__list_fields` вернул 61 запись, построчно сопоставлены с полным
списком экспортов `libs/forms-angular/src/index.ts` — совпадение 1:1, расхождений не найдено (ни
пропущенных, ни лишних экспортов).

Текущий счёт: **61/61 — Фаза 11 закрыта.** Тесты — `app-form.stage-j.spec.ts` (9 тестов: FieldAuto
на пяти Zod-типах — строка/textarea/number/boolean/enum с камелкейс-подписями опций,
FieldCalculated — пересчёт `quantity × price` при изменении зависимости + значение в submit,
FieldMaskedInput — маска "999-999" группирует ввод той же маской, что `FieldDepartmentCodeComponent`
(Stage B) + `formatDescription`/`aria-describedby` видны до начала ввода), host-компонент
`testing/stage-j-host.component.ts`. `nx run-many -t lint typecheck:tsgo test
--projects=@letar/forms-angular` зелёный (84/84 тестов всего пакета). README `@letar/forms-angular`
обновлён — статус "proof-of-concept" снят, шапка "✅ Полный порт — 61/61" (по аналогии с
`forms-vue`/`forms-vue-shadcn`).

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

### ✅ [2026-08-11] Рассинхрон источников истины по числу полей: form-mcp/docs/fields.md (49) vs реальность (56) (закрыт 2026-08-12)

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

### ✅ [2026-08-12] `formatPhoneNumber` теряет цифру при вводе номера с `8` (закрыт v2.0.4)

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

### ✅ [2026-08-09] Checkbox: клик по label/тексту не переключает состояние (не баг, закрыто без правок; от svoichuzhie)

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

### Исправлено в v0.6.0 (`@letar/forms-react`) / v0.12.0 (`@letar/forms-core`), 2026-09-08

- [x] **`FormI18nProvider.setupZodErrorMap` требовал `t` от приложения** — без next-intl (или
      аналога) сообщения об ошибках Zod ПОСЛЕ неудачного сабмита оставались на английском
      дефолте, даже когда constraint hints уже переводились одним `locale`. Найдено на
      `domwellbes` (Form.Steps пилот, форма дома). Фикс — встроенный ru/en словарь-fallback
      (`createBuiltinTranslateFunction`,
      [libs/forms-core/src/lib/i18n/builtin-error-translations.ts](/libs/forms-core/src/lib/i18n/builtin-error-translations.ts)):
      `t` приложения пробуется первым, встроенный словарь по `locale` — fallback. Разбор двух
      независимых механизмов i18n (constraint hints vs ошибки после сабмита) —
      [.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).

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

**Последнее обновление:** 2026-09-14 — фикс флаки-таймаута `field-signature.spec.tsx` (мок Canvas
2D API в `vitest.setup.ts`, 2.14.9), детали в `PLAN_COMPLETED.md`. Аудит сестринских библиотек в
тот же день — см. ниже.

### Аудит Canvas 2D моков в сестринских библиотеках форм-экосистемы (2026-09-14)

Проверка, не подвержены ли `forms-shadcn`/`forms-vue`/`forms-vue-shadcn`/`forms-angular` тому же
классу флаки (нативный `.node`-аддон пакета `canvas`, peer dependency jsdom, переинициализация в
каждом spec-файле при test isolation):

- **`forms-vue`, `forms-vue-shadcn`, `forms-angular`** — уже защищены. Их `useSignatureField`/
  `FieldSignatureComponent` реально вызывает `canvas.getContext('2d')`, но соответствующие
  spec-файлы (`app-form.stage5.spec.ts` × 2, `app-form.stage-g.spec.ts`) держат собственный
  `beforeEach`-стаб `HTMLCanvasElement.prototype.getContext`/`toDataURL` — нативный аддон там
  не грузится вовсе. Правки не требуются.
- **`forms-shadcn`** — был уязвим: `FieldSignature` вызывает `canvas.getContext('2d')` уже в
  `useEffect` при монтировании (`initCanvas`), а `field-signature.spec.tsx` (5 тестов) не имел
  никакого мока — каждый тест грузил настоящий нативный аддон (подтверждено эмпирически:
  `jsdom.getContext('2d')` в изолированном Node-прогоне вернул реальный `CanvasRenderingContext2D`,
  не `null`). 3 прогона `nx test forms-shadcn --skip-nx-cache` подряд не воспроизвели таймаут
  (53 spec-файла — меньше, чем 109 у `libs/forms`, где баг проявлялся не при каждом прогоне), но
  механизм идентичен. Фикс применён превентивно — тот же мок Canvas 2D API, что в
  `libs/forms/vitest.setup.ts`, скопирован в `libs/forms-shadcn/vitest.setup.ts`. Прогон
  `field-signature.spec.tsx` изолированно ускорился с ~5с до ~2.9с (полный прогон библиотеки —
  без изменений, время съедает создание jsdom-окружения на 53 файла, не сам canvas-мок).
