# Таргет без executor + непокрытый плагин = `nx:noop`, то есть зелёный ноль

⚠️ Ловушка того же класса, что
[nx-convert-to-inferred-scope-regression](/.claude/docs/nx-convert-to-inferred-scope-regression.md):
проверка отвечает «всё на месте», хотя работа не делается.

## Механизм

В монорепо принят гибрид: `project.json` объявляет таргет **без `executor`**, только с
дополнениями, а сам executor приходит от inferred-таргета плагина:

```json
"test": {
  "options": { "config": "vitest.config.ts" }
}
```

Такой таргет **сам по себе нерабочий** — он лишь дополняет то, что создаёт плагин
(`@nx/vitest` с `testTargetName: "test"`). Пока путь проекта покрыт `include` плагина в
`nx.json`, всё сходится: Nx мержит `executor` + `command` от плагина с `options.config` из
`project.json`.

**Если покрытие пропало — Nx не ругается.** Он подставляет таргету `executor: "nx:noop"`.
Команда отрабатывает, печатает `Successfully ran target test` и возвращает 0:

```
NX  Successfully ran target test for project @letar/theme-check
Run duration: 21ms
```

21 мс, ноль запущенных тестов, зелёный результат. `nx run-many -t test` проходит по такому
проекту молча.

## Почему `nx show projects --with-target test` это не ловит

Самая естественная проверка охвата — и именно она врёт:

```bash
nx show projects --with-target test   # мёртвый проект здесь ЕСТЬ
```

Ключ таргета в конфигурации присутствует, поэтому проект попадает в список. `noop` — это
свойство _executor_, а не наличия таргета. Список до и после правки может совпасть в точности,
а тесты при этом либо все идут, либо все молчат.

**Проверять надо карту `проект → executor`**, а не список имён:

```bash
nx graph --file=graph.json
# затем сверить graph.nodes[*].data.targets.test.executor до и после
```

Критерий приёмки для правок охвата: ни один проект не потерял executor и не стал `nx:noop`;
смежные таргеты (`test-ci`, `vitest:test`) не изменились.

## Найденный случай (2026-08-28)

Второй блок `@nx/vitest` в `nx.json` перечислял ~75 путей вида `apps/aboi/**/*` руками.
Перечисление отставало от репозитория: пять проектов с реальными тестами в него не попали.

| Проект                   | Было                     | Тестов молчало |
| ------------------------ | ------------------------ | -------------- |
| `@letar/theme-check`     | `test` → `nx:noop`       | 6              |
| `@letar/icon-generator`  | `test` → `nx:noop`       | 3              |
| `@letar/eager-jsx-check` | `test` → `nx:noop`       | 14             |
| `@letar/file-scan`       | `test` → `nx:noop`       | 15             |
| `@letar/cdek`            | таргета `test` нет вовсе | 50             |

Итого 88 тестов не запускалось. `libs/file-scan` был заведён в тот же день и родился уже
мёртвым — то есть отставание списка не историческое, а воспроизводится на каждом новом проекте,
заведённом вручную.

Фикс — глобы вместо перечисления (`nx.json`, коммит `97545497`):

```json
"include": [
  "apps/*/{vite,vitest}.config.*",
  "libs/*/{vite,vitest}.config.*"
]
```

Два уровня вложенности вместо `**/*` заодно делают недостижимыми конфиги из build-артефактов
(`libs/*/out-tsc/spec/vitest.config.d.ts`, `**/standalone/apps/...`) — структурно, а не только
фильтром `.nxignore` (см.
[nx-temp-build-dir-breaks-project-graph](/.claude/docs/nx-temp-build-dir-breaks-project-graph.md)).

`{vite,vitest}` — не украшение: глоб самого плагина `**/{vite,vitest}.config.{js,ts,mjs,mts,cjs,cts}`,
и три библиотеки (`hooks`, `image-upload`, `query-provider`) держат оба файла рядом.

## Кого это НЕ касается

Проекты из генераторов `@letar/generators:new-app` / `new-lib` объявляют таргет целиком, со
своим `executor`, и от `include` не зависят вообще. Поэтому гипотеза «новое приложение не
попадёт в список» на практике бьёт только по проектам, заведённым вручную по старому образцу.

⚠️ Но и лечить этим нельзя: executor `@nx/vitest:test`, который штампуют оба генератора,
**объявлен устаревшим и будет удалён в Nx v24** — Nx сам предлагает обратную миграцию
(`nx g @nx/vitest:convert-to-inferred`). Попытка перевести три мёртвых проекта на явный
`@nx/vitest:test` в этой же сессии провалилась и была откачена: помимо депрекейта, executor
требует `tsconfig.json` в корне проекта, которого у `.mjs`-библиотек нет
(`Unable to load libs/theme-check/tsconfig.json`).
