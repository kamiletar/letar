# `nx dev`/`nx graph` иногда падает на «race condition» в `@nx/playwright/plugin` — лечится ретраем, не флагом

Найдено 2026-09-08 в сессии по `animatrona-tracker` при проверке интерактивности вкладок. Не
специфично для `animatrona-tracker` — упавший плагин грузил конфиг совсем другого приложения
(`mandala-e2e`), затронутого только потому, что оно есть в общем графе Nx.

## Симптом

```
NX Failed to process project graph.
An error occurred while processing files for the @nx/playwright/plugin plugin (Defined at nx.json#plugins[...]).
  - Cannot require() ES Module .../apps/mandala-e2e/playwright.config.ts because it is not yet
    fully loaded. This is probably being caused by a circular dependency, which leads to
    a race condition if the module is simultaneously dynamically import()-ed via Promise.all()
  - Unexpected module status 0
```

Строка «probably being caused by a circular dependency» — это стандартный текст Node.js для
`ERR_REQUIRE_CYCLE_MODULE`/статуса ESM-модуля, а не диагностика конкретно этого репозитория.
Циклической зависимости в `mandala-e2e` разбирать не пришлось — см. ниже, почему.

## Что НЕ помогло

`NX_PREFER_NODE_STRIP_TYPES=false` (флаг, который подсказывает сам Nx в сообщениях об ошибках
загрузки TS-конфигов) — ошибка повторилась один в один с флагом выставленным.

## Что помогло

Простой повторный запуск той же команды (`nx dev animatrona-tracker`) без каких-либо флагов и
без правок кода. Прошёл со второго раза.

## Почему это не баг конкретного приложения

`@nx/playwright/plugin` при построении графа параллельно грузит (`Promise.all`) конфиги
`playwright.config.ts` **всех** проектов с этим плагином, не только целевого. Упавший файл
(`apps/mandala-e2e/playwright.config.ts`) не имеет отношения к `animatrona-tracker` — он попал в
падение просто потому, что оба проекта числятся в одном воркспейсе и оба матчатся плагином.
Гонка — в самом Node.js/esbuild-загрузчике ESM-модулей при параллельном `import()`/`require()`
одного и того же файла из нескольких воркеров/потоков построения графа, а не в коде проекта,
который упомянут в трейсе. Разбирать `mandala-e2e` на предмет циклических импортов в такой
ситуации — ложный след.

## Как отличить от настоящей проблемы

- Если ошибка **не воспроизводится стабильно** (следующий запуск той же команды без изменений
  проходит) — это гонка построения графа, а не поломанный конфиг. Ретрай — корректное и
  достаточное действие.
- Если ошибка повторяется **каждый раз** на одном и том же файле — тогда стоит проверить реальные
  циклические импорты в этом `playwright.config.ts` (обычно через общий `libs/*` барель), это уже
  не гонка, а настоящая структурная проблема.

## Смежные документы

Тот же класс «графовое построение Nx падает не из-за целевого проекта, а из-за постороннего
конфига в общем воркспейсе», что и
[nx-vitest-plugin-worker-oom-shared-machine.md](/.claude/docs/nx-vitest-plugin-worker-oom-shared-machine.md)
(там — OOM у `@nx/vitest`-воркера от безусловного сканирования всего репозитория) и
[nx-temp-build-dir-breaks-project-graph.md](/.claude/docs/nx-temp-build-dir-breaks-project-graph.md)
(там — временный distDir ломает граф у всех параллельных агентов). Разница здесь: причина не
конфигурационная и не воспроизводимая детерминированно — обычная гонка загрузчика модулей,
закрывается повторным запуском.
