# Animatrona main/: два независимых механизма резолва `@letar/*` — держать в синхроне вручную

## Симптом

`nx run animatrona-main:build` (esbuild) падает на новом импорте:

```
Could not resolve "@letar/electron-storage"
```

при этом `nx run animatrona:build` (webpack, упаковка electron-builder) собирается без единой
жалобы — импорт тот же файл, тот же символ.

## Причина

`apps/animatrona/main/` собирается двумя параллельными тулчейнами на одни и те же исходники
(`main.ts`, `preload/index.ts`), и у каждого свой независимый список алиасов на `@letar/*`-либы:

1. **`animatrona:build`** (`apps/animatrona/project.json`, top-level Nx-проект) — вызывает
   `webpack --config main/webpack.config.js` напрямую. Резолвит монорепо-либы через
   `resolve.alias` в [webpack.config.js](/apps/animatrona/main/webpack.config.js). `ts-loader`
   стоит с `transpileOnly: true` — типы не проверяет, только транспилирует. Это реальная сборка
   для electron-builder.
2. **`animatrona-main`** (`apps/animatrona/main/project.json`, отдельный Nx-проект) —
   `@nx/esbuild:esbuild`, используется `nx dev animatrona-main`/`nx build animatrona-main`.
   Резолвит те же либы через `compilerOptions.paths` в
   [main/tsconfig.json](/apps/animatrona/main/tsconfig.json).

Два списка алиасов физически не связаны — ничто не мешает добавить путь в один файл и забыть
про второй. Симптом асимметричен: webpack-алиас без tsconfig-path ломает только
`animatrona-main:build` (esbuild этого пути не видит); обратное — tsconfig-path без
webpack-алиаса — сломает упаковочную сборку `animatrona:build`, ту, что реально уходит
пользователю.

## Прецедент

2026-08-26: `@letar/electron-storage` был добавлен в `resolve.alias` webpack.config.js, но не
в `paths` tsconfig.json. Ошибка была полностью замаскирована — в той же сессии чинили 38
TS-ошибок node16/nodenext-резолюции в других файлах `main/`, и `Could not resolve` тонуло среди
них. Как только TS-ошибки исчезли, esbuild сразу же упал именно на этом импорте — по факту
единственная причина, по которой рассинхрон вообще нашли. Если бы TS-ошибок не было изначально,
пропавший алиас мог тихо сломать `animatrona-main:build` при первом же запуске `nx dev
animatrona-main` после мержа — не сразу, а в произвольный следующий момент.

## Как не наступить снова

Добавил новый `@letar/*`-импорт в `apps/animatrona/main/**` — проверь оба места:

- [ ] `apps/animatrona/main/webpack.config.js` → `resolve.alias['@letar/<lib>']`
- [ ] `apps/animatrona/main/tsconfig.json` → `compilerOptions.paths['@letar/<lib>']`

Оба указывают на один и тот же `libs/<lib>/src/index.ts`, разница только в форме пути
(webpack — `path.resolve(__dirname, ...)`, tsconfig — относительный от `main/`). Прогонять
обе сборки перед коммитом, а не только ту, что запускал в dev: `nx run animatrona:build` и
`nx run animatrona-main:build`.
