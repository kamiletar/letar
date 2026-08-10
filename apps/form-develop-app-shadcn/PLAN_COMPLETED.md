# Form Develop App (shadcn) — выполненные задачи

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
