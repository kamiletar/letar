# Vite dev + `@letar/ui` barrel-импорт → `process is not defined`

**Коротко:** `@letar/ui` — общий barrel-файл (`libs/ui/src/index.ts`), реэкспортирующий всё сразу.
Любой импорт из него (даже одного компонента, например `Tooltip`) затягивает в Vite-пребандл весь
модуль целиком, включая куски, зависящие от `next/link`/`next/image`/`next/navigation`. Эти модули
читают `process.env.*` на верхнем уровне при загрузке — под Vite dev в браузере/Electron renderer'е
(`contextIsolation: true`, `nodeIntegration: false`) глобального `process` нет, падает
`ReferenceError: process is not defined` ещё до рендера приложения.

Найдено в `kami-key-the` (`apps/kami-key-the`, редизайн v1.8.0) при попытке импортировать
`Tooltip` из `@letar/ui` в `renderer/src/shell/title-bar.tsx`.

## Механизм

1. `import { Tooltip } from '@letar/ui'` резолвится в `libs/ui/src/index.ts`.
2. Это barrel — `export * from './lib/tooltip'`, `export * from './lib/app-link'`, и так далее для
   всех компонентов либы, часть которых обёрнута вокруг `next/link`/`next/image`.
3. Vite дев-сервер пребандлит зависимости через esbuild (`node_modules/.vite/deps/*`) — единицей
   пребандла становится **весь импортированный модуль**, а не отдельные именованные экспорты
   (tree-shaking на этом этапе не применяется, он только на продакшен-сборке).
4. `node_modules/.vite/deps/next_*.js` (сгенерированный чанк) содержит код, читающий
   `process.env.NODE_ENV` при инициализации модуля (typical Next.js/webpack-паттерн).
5. В браузере Vite обычно сам шимит `process.env` через `define` в `vite.config`, но Electron
   renderer с `contextIsolation: true` не даёт `window.process` — а Vite polyfill в некоторых
   конфигурациях (или при отсутствии явного `define: { 'process.env': {} }`) не покрывает этот путь
   до конца, и ошибка всплывает именно в момент выполнения пребандленного чанка.

## Симптом

```
Uncaught ReferenceError: process is not defined
    at node_modules/.vite/deps/next_navigation.js
```

Падает **до** рендера React-дерева — белый экран, ни одного компонента не отрисовывается. Не
воспроизводится в проде (`nx build`): там реальный tree-shaking делает мёртвый код мёртвым, и путь
до `next/*` не попадает в бандл вовсе (см. `apps/kami-key-the/apps/kami-key-the/app/renderer` — grep
`next/navigation` даёт пусто).

## Временный обход (применён)

`renderer/index.html`, до загрузки модулей:

```html
<script>
  // Временный шим — Vite dev-пребандл @letar/ui тянет next/* модули, читающие process.env
  // при загрузке (см. .claude/docs/vite-dev-letar-ui-barrel-process-undefined.md).
  // Корневой фикс — подпути-экспорты в @letar/ui, не здесь.
  window.process = window.process || { env: {} }
</script>
```

Работает, потому что `next/*`-модули в этом сценарии только _читают_ `process.env.NODE_ENV` (не
пишут, не ветвятся критично на значении) — пустого объекта достаточно, чтобы чтение не бросало.

⚠️ **Это заплатка конкретного потребителя, не решение проблемы.** Она ничего не делает для других
приложений, импортирующих `@letar/ui` под Vite (dev), и не убирает сам факт затягивания `next/*` в
non-Next-приложение.

## Корневой фикс — вне объёма этой сессии

`libs/ui/package.json` — завести подпути-экспорты (`./tooltip`, `./app-toaster`, и т.д.) вместо
одного barrel `.`, чтобы потребитель без Next.js (Electron-приложение, как `kami-key-the`) мог
импортировать конкретный компонент, не утягивая весь `next/*`-хвост. Владелец либы —
`ui-coordinator-dev` (Agent Mail). Похожий, но не идентичный класс проблемы уже разбирался для
`@letar/hooks` — см. [lib-consumer-missing-lib-dom.md](/.claude/docs/lib-consumer-missing-lib-dom.md)
(там барабанный реэкспорт тянет `window`/`StorageEvent`, здесь — `process`, но причина одна и та же:
barrel-экспорт не даёт потребителю выбрать только нужный кусок).

## Как отличить от других причин белого экрана

- Ошибка **только** в dev (`nx dev`/Vite dev-сервер), прод-сборка не задета — если белый экран есть
  и в собранном приложении, причина другая.
- Текст ошибки именно `process is not defined`, не `window is not defined` (это другой класс —
  SSR-специфичный, здесь неприменим, чистый client-side Vite dev).
- Симптом появляется сразу после **добавления** нового импорта из `@letar/ui` в файл, который
  раньше её не импортировал — не при правке существующего кода.

## См. также

- [electron-window-controls-overlay-pattern.md](/.claude/docs/electron-window-controls-overlay-pattern.md) —
  другая находка того же редизайна
- [lib-consumer-missing-lib-dom.md](/.claude/docs/lib-consumer-missing-lib-dom.md) — тот же класс
  бага (barrel тянет лишнее), другая зависимость (`window`/DOM, не `process`)
- [lib-entry-points.md](/.claude/docs/lib-entry-points.md) — общий паттерн подпутей-экспортов
  (`./server`/`./client`) для похожих случаев в других либах
