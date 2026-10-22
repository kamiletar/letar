# @letar/forms 3.0: тяжёлые поля подключаются, ядро не тянет optional peer

С 3.0.0 `RichText`, `DataGrid`, `TableEditor` и перетаскивание в списках живут в подпутях
(`@letar/forms/rich-text`, `/data-grid`, `/table-editor`, `/sortable`). Обязательных peer-зависимостей
шесть, остальные optional. Переход для потребителей — `libs/forms/docs/MIGRATION-3.md`.

## Что держит схему

- **Ключ в `extraFields` = имя поля.** По нему `AppForm.Field.<Имя>` и автоформа (`fieldType: 'richText'`)
  находят компонент: `createForm({ extraFields: { RichText: FieldRichText } })`. Другое имя ключа — поле для
  автоформы «не зарегистрировано».
- **`AppForm.Field` без индексной сигнатуры.** Незарегистрированное поле — ошибка typecheck. Если строгий тип
  вдруг пропал и компилируется любое имя, значит инстанс стёрт аннотацией `ExtendedForm` (`const F: ExtendedForm
  = createForm(…)`): тип надо оставлять выведенным. Встроенные поля перечислены в `create-form.tsx` явно,
  новое встроенное поле добавляется туда, иначе оно пропадёт из `AppForm.Field`
  (тест `набор ключей AppForm.Field совпадает с Form.Field`).
- **`createLazyComponent<T>` теряет типы пропсов** (`ComponentType<any>`). Параметр задаётся через
  `import type { X as XImpl }` и `createLazyComponent<typeof XImpl>`; рантайм-импорт остаётся ленивым.
  Без этого `AppForm.Field.RichText` даёт TS7006 в колбэках пропсов.

## Правило целостности

`scripts/check-npm-package-integrity.mjs` (`checkOptionalPeers`): чанки, достижимые из корневого entry и
«ядерных» subpath-entry, не импортируют optional peer. Разрешённые исключения — `optionalPeerEntries` у пакета в
`scripts/data/npm-published-packages.json` (subpath-ы тяжёлых полей). Новый тяжёлый импорт в ядре красит
`--build`, а не только smoke. Smoke `vite-app` собирается без `@tiptap` и `@dnd-kit`.

## Ловушки, на которые уже наступили

- Предупреждение «`richText` не зарегистрирован» проверяет `process.env.NODE_ENV`; в
  `eslint.config.mjs` такие файлы перечислены в allowlist. Прод/staging эта проверка не различает
  ([node-env-not-production-signal](/.claude/docs/node-env-not-production-signal.md)); здесь это допустимо,
  потому что решение — «шуметь в консоли или нет», а не безопасность.
- Спеки самих тяжёлых полей подключают поле тестовым `createForm({ extraFields })`: в ядре его больше нет,
  `Form.Field.RichText` в тесте — `undefined`.
- Реестр `form-mcp` строится из `fields.md`: поля остаются в таблице, а подпуть и строка регистрации заданы в
  `PLUGGABLE_FIELDS` (`libs/form-mcp/src/data/field-registry.ts`). Страж `field-code-parity` знает про этот список.
