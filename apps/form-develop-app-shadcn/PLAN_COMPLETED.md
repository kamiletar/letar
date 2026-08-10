# Form Develop App (shadcn) — выполненные задачи

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
