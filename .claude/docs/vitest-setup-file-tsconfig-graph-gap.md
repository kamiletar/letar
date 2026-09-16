# Vitest 4/Vite 8: `vitest.setup.ts` вне графа `references` валит ВСЕ тесты библиотеки разом

Тот же механизм, что в [tsgo-tsc-stale-project-reference-redirect](/.claude/docs/tsgo-tsc-stale-project-reference-redirect.md)
(«резолвер идёт по графу project references, не просто ищет ближайший файл по glob»), бьёт и по
`nx test`/`vitest` — с другим внешним видом ошибки и другим порогом срабатывания.

## Симптом

В Vite 8 резолвер tsconfig для setup-файла (`vitest.setup.ts`/`vitest.setup.tsx`, подключаемого
через `test.setupFiles` в `vitest.config.ts`) стал строгим — если файл физически не покрыт
действующим tsconfig-конфигом, транспиляция падает с `[TSCONFIG_ERROR] Tsconfig not found`.
Setup-файл грузится первым, до любого теста, поэтому падает **вся** библиотека разом, а не один
спек. Раньше (более старые версии Vite) резолвер был мягче и такой ошибки не давал — поэтому
баг мог годами лежать незамеченным в библиотеке, которую давно не трогали.

## Три конкретные причины под одним симптомом

Найдено и исправлено 2026-08-18 у 5 библиотек (разбор с примерами — `PLAN-INFRA.md §87`):

1. **Файл существует, но не в `include`.** `libs/forms-vue`, `libs/forms-angular`,
   `libs/forms-vue-shadcn` — `vitest.setup.ts` физически лежал на диске, но не был перечислен в
   массиве `include` их `tsconfig.spec.json`.
2. **`include` верный, но конфиг не в графе `references`.** `libs/ui` — `tsconfig.spec.json`
   был написан правильно (setup-файл в `include`), но solution-style `tsconfig.json` библиотеки
   (тот, что с `"files": [], "include": []` и `references`) ссылался в `references` только на
   `tsconfig.lib.json`, не на `tsconfig.spec.json`. Раз `tsconfig.spec.json` не в графе, он для
   резолвера не существует, даже физически лежа рядом и содержа верный `include`.
3. **Нет отдельного `tsconfig.spec.json` вовсе.** `libs/animatrona-ui` — нестандартная
   структура, один общий `tsconfig.json` без разделения на lib/spec, и единственный конфиг
   включал только `src/**/*.ts(x)`, а `vitest.setup.tsx` лежит в корне библиотеки, вне `src/`.

## Чек-лист для ручной настройки библиотеки (не через генератор)

Setup-файл должен одновременно удовлетворять двум условиям:

- (а) быть в `include` **правильного** tsconfig — `tsconfig.spec.json`, если у библиотеки есть
  разделение lib/spec, иначе единственного `tsconfig.json`;
- (б) если библиотека использует solution-style `tsconfig.json` с `references` — этот
  `tsconfig.spec.json` обязан быть в массиве `references`, иначе резолвер его не увидит даже
  при полностью верном `include`.

Пропуск любого из двух условий даёт один и тот же симптом — `[TSCONFIG_ERROR] Tsconfig not
found` при запуске `nx test <lib>`, все тесты красные разом.

✅ **Библиотеки, заведённые генератором `nx g @letar/generators:new-lib`, этому не подвержены** —
шаблон `tsconfig.spec.json.template` уже включает `vitest.setup.ts` в `include`, а
`tsconfig.json.template` уже ссылается на `./tsconfig.spec.json` в `references`. Баг актуален
только для библиотек, заведённых руками или до появления этих шаблонов в генераторе — как
образец правильной настройки можно смотреть `libs/forms` или `libs/admin-ui`.
