# `main/` Electron-приложения может не типизироваться вовсе, несмотря на зелёный `typecheck:tsgo`

## Симптом

`typecheck:tsgo <app>` зелёный, `lint` зелёный, но код в `main/` (Electron main-процесс) может
годами копить настоящие ошибки типов — они просто никогда не проверяются.

## Механизм

У Nextron-приложений (`animatrona`, `label-printer-desktop`) `main/` явно стоит в `exclude`
корневого `tsconfig.json` — main-процесс Electron не должен попадать в Next.js typecheck
рендерера (разные `lib`, разное окружение). `typecheck:tsgo` гоняет `tsgo --noEmit` **только**
по этому корневому конфигу — значит `main/` из-под него выпадает целиком.

Спасительный путь выглядит логично, но не работает: `tsconfig.spec.json` включает
`main/**/*.ts` в свой `include` (обязателен для vitest/oxc, см.
[unit-testing.md § «Особый случай — Electron-приложения»](/.claude/docs/unit-testing.md)), а
корневой `tsconfig.json` через `references: [{ path: "./tsconfig.spec.json" }]` как будто должен
её подтягивать. **Не подтягивает** — `tsc/tsgo --noEmit` не читает `references` вообще, их
собирает только режим `--build` (`tsc -b`), а этот режим не вызывает ни один nx-таргет в
репозитории. `references` тут существуют исключительно для редиректа типов IDE/языкового
сервера, не для CLI-прогона typecheck.

Итог: `main/` не проверяется ни при разработке (ни один таргет его не гоняет), ни в CI (то же
самое). Единственная проверка, которая реально касалась `main/` до фикса — `lint` (ESLint
ловит только синтаксические/стилевые проблемы, не типы) и ручная сборка/смоук-тест.

## Как обнаружить

```bash
grep -n '"main"' apps/<app>/tsconfig.json          # main/ в exclude?
grep -n "typecheck:main" apps/<app>/project.json   # отдельный таргет уже есть?
```

Если первая команда находит `"main"`, а вторая — ничего, `main/` не типизируется.

## Фикс — по образцу `apps/animatrona/main/tsconfig.json`

1. Завести `apps/<app>/main/tsconfig.json` — **standalone**, без `extends`/`composite`, без
   `references` откуда-либо (иначе рискуешь TS6305-ловушкой из
   [tsgo-tsc-stale-project-reference-redirect](/.claude/docs/tsgo-tsc-stale-project-reference-redirect.md)/
   [tsconfig-preset-rootdir-outdir-cascade](/.claude/docs/tsconfig-preset-rootdir-outdir-cascade.md)).
   `lib` — без `"DOM"` (main-процесс — Node, не браузер; см. отдельную ловушку
   [electron-main-fetch-json-unknown-type](/.claude/docs/electron-main-fetch-json-unknown-type.md),
   если main/ делает HTTP-запросы). `paths` — только реально используемые в `main/`
   `@letar/*`-пакеты (не копировать весь набор из корневого `tsconfig.json` — main/ обычно
   использует куда более узкое подмножество, чем renderer). `include: ["**/*.ts",
   "../shared/**/*.ts"]` (если `shared/` — сосед `main/`, а не часть корневого `include`; если
   уже включён в корневой `tsconfig.json`, `main/tsconfig.json` его не дублирует).

2. Добавить в `apps/<app>/project.json`:

   ```json
   "typecheck:main": {
     "command": "tsgo --project apps/<app>/main/tsconfig.json --noEmit"
   },
   "typecheck:tsgo": {
     "dependsOn": ["zenstack:generate", "typecheck:main"],
     "command": "tsgo --project apps/<app>/tsconfig.json --noEmit"
   }
   ```

   `dependsOn` у `zenstack:generate` — только если `main/` реально импортирует
   сгенерированный Prisma-клиент (у `animatrona` — да, напрямую; у `label-printer-desktop` —
   нет, там своя HTTP-прослойка, см. [electron-main-fetch-json-unknown-type](/.claude/docs/electron-main-fetch-json-unknown-type.md)).

3. Прогнать и почитать вывод — первый прогон почти наверняка найдёт реальные, годами
   невидимые ошибки типов (найдено 26 на `label-printer-desktop`, 2026-09-17). Не гасить их
   заглушками — почти все правятся приведением объявленного типа к фактическому поведению без
   изменения рантайма.

4. Проверить, что таргет реально ловит ошибки: временно внести синтетическую ошибку типа в
   любой файл `main/`, прогнать `typecheck:main`, убедиться в падении, откатить.

## Где встретилось

`apps/animatrona` уже имела `typecheck:main` (образец). `apps/label-printer-desktop` — фикс
2026-09-17, разбор находок — `apps/label-printer-desktop/PLAN_COMPLETED.md`.

`apps/poster-microtext-desktop` — обратный случай: там `main/**/*.ts` **включён** в корневой
`tsconfig.json`, поэтому `typecheck:tsgo` уже покрывает `main/` без отдельного таргета — это не
баг, а другая (валидная) архитектура. Прежде чем заводить `main/tsconfig.json` для нового
Electron-приложения — сначала проверь, не покрыт ли `main/` уже корневым конфигом.
