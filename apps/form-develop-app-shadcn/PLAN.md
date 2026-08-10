# Form Develop App (shadcn) — план разработки

## Статус

Dev-харнесс для `@letar/forms-shadcn` (Фаза 7.3, Шаг 5, `libs/forms/PLAN.md`). Каркас Chakra от
генератора заменён на Tailwind 4 + shadcn CSS-переменные (`src/app/globals.css`) — Chakra и
Tailwind 4 не уживаются в одном глобальном стиле.

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

## Бэклог

- [ ] `createForm()`/`Form`-root для `@letar/forms-shadcn` (если понадобится за пределами этого
      харнесса) — отдельная задача, не Шаг 5
- [ ] E2E-тесты (по аналогии с `form-develop-app-e2e`), если харнесс станет постоянным
      регрессионным гейтом, а не только визуальной песочницей
