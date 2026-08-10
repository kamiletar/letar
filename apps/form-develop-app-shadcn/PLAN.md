# Form Develop App (shadcn) — план разработки

## Статус

Dev-харнесс для `@letar/forms-shadcn` (Фаза 7.3, `libs/forms/PLAN.md` §7.3). Каркас Chakra от
генератора заменён на Tailwind 4 + shadcn CSS-переменные (`src/app/globals.css`) — Chakra и
Tailwind 4 не уживаются в одном глобальном стиле. Демо-страница синхронизирована с полями
`@letar/forms-shadcn`: 33 из 56 (v0.14.0), продолжаем к паритету с `@letar/forms`.

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

## Фаза 2 — Продолжение к паритету (приоритет координатора) — в работе

Приоритет от `QuietRidge` (тред `forms-phase7-3-shadcn`): Signature → FileUpload → Steps → Table →
RichText.

- [x] `FieldSignature` — демо-поле с `width={320} height={120}`, живая проверка в Chromium (draw
      mode через настоящий `MouseEvent` `dispatchEvent`, typed mode, очистка) — детали в
      `libs/forms/PLAN.md` §7.3

## Бэклог

- [ ] `createForm()`/`Form`-root для `@letar/forms-shadcn` (если понадобится за пределами этого
      харнесса) — отдельная задача, зафиксирована в `libs/forms/PLAN.md` §7.3
- [ ] E2E-тесты (по аналогии с `form-develop-app-e2e`), если харнесс станет постоянным
      регрессионным гейтом, а не только визуальной песочницей
- [ ] Демо для оставшихся 24 полей паритета по мере их добавления в `forms-shadcn`
