# Миграция с @nx/next composePlugins/withNx на голый next.config

`@nx/next` версии 23.x печатает при каждом билде два deprecation-варнинга — `composePlugins()` и
`withNx()` будут убраны в Nx v24. Все 21 `next.config.*` монорепо (2026-09-01) переведены на
голый конфиг без обёртки.

## Почему не «просто убрать обёртку»

`withNx` — не только источник варнинга. Он инжектит `transpilePackages` для транзитивных
workspace-либ через граф зависимостей Nx + алиасы tsconfig, и без него webpack (`next build
--webpack`, прод-сборка почти всех приложений монорепо) не транспилирует TS-код из `libs/*`:
падает `Module parse failed: Unexpected token` на первом же `interface`/`export type` внутри либы.

Заявление депрекейшн-варнинга «Next.js transpiles workspace libraries automatically» не
применяется в этом монорепо: автоматическая транспиляция монорепо-пакетов у Next.js опирается на
резолв через `node_modules`-симлинки (yarn/pnpm/npm workspaces). Здесь используется bun
**изолированная** установка + `@letar/*`-алиасы через `paths` в **app-level** `tsconfig.json` (не
в корневом `tsconfig.base.json`) — Next.js не видит в этом «workspace-пакет», транспиляция не
включается сама по себе.

## Фикс: явный `transpilePackages`

Для каждого приложения — список алиасов `@letar/*` из его `tsconfig.json` (`compilerOptions.paths`,
без подпутей типа `/client`/`/server` — только базовое имя пакета). Это тот же набор, который
`withNx` вычислял бы через граф зависимостей Nx, если бы у него получилось найти `paths` (не
получалось: `readTsConfigPaths()` внутри `@nx/next` читает только корневой tsconfig, где `paths`
нет).

```js
const nextConfig = {
  transpilePackages: ['@letar/analytics', '@letar/ui', '@letar/glitchtip' /* ... */],
  // остальной конфиг без изменений
}
```

Next резолвит имена из `transpilePackages` через тот же алиас `paths`, даже когда пакета физически
нет в `node_modules` — проверено сборкой (пусто в `node_modules/@letar/*`, но билд проходит).
Лишние записи (пакет объявлен в `paths`, но не импортируется) безвредны — Next не резолвит их
eagerly.

## Композиция плагинов без composePlugins

`composePlugins(a, b, c)(config)` применял плагины **слева направо**, скармливая результат
предыдущего следующему: `c(b(a(config)))`. При удалении `withNx` из списка остальные применяются
в том же относительном порядке простой вложенной композицией:

```js
// было: composePlugins(withNx, withMDX, withSerwist)(nextConfig)
// стало:
export default withSerwist(withMDX(nextConfig))
```

## Пре-существующий баг, найденный попутно (не следствие этой миграции)

`animatrona-landing` и `aira-web` импортируют `@letar/github-releases`, который реэкспортирует
`@letar/format-utils` (`libs/github-releases/src/index.ts`) — но `@letar/format-utils` не
прописан в `paths` их `tsconfig.json`, поэтому модуль не резолвится вообще (`Module not found`),
не только не транспилируется. Баг воспроизведён и на исходном (до миграции) конфиге через
`git show HEAD:...` — не связан с уходом от `withNx`. Тот же класс ошибки, что и прежний
прецедент `SortablePhotoGrid`/`@letar/format-utils` в aboi/aprel8008 (см.
[deploy-coordination.md](/.claude/rules/deploy-coordination.md) п.4) — там уже исправлено
добавлением алиаса в `tsconfig.json`, здесь — нет.
