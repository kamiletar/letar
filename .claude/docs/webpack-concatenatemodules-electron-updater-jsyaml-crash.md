# webpack `concatenateModules` ломает `electron-updater` (через `js-yaml`) только в production-сборке

## Симптом

Собранный `--mode production` инсталлятор Electron-приложения падает **сразу при запуске**
(модальное окно `A JavaScript error occurred in the main process`):

```
Uncaught Exception:
TypeError: Cannot set properties of undefined (setting 'options')
    at e.exports (...\app.asar\app\background.js:...)
```

Стектрейс — цепочка вложенных `webpack_require` без единой строки прикладного кода: падение
происходит на этапе **загрузки модулей**, до старта `app.whenReady()`.

⚠️ **Ловушка, которая выглядит как успех:** `nx dev`/`electron .` (dev-сборка webpack) не
воспроизводит баг вообще — только собранный `--mode production` бандл, то есть только реально
установленная у пользователя версия.

## Причина

Минифицированный стектрейс указывает на `js-yaml`'s `lib/type.js`:

```js
e.exports = function (e, t) {
  ...
  this.options = t, // ← падает здесь: this === undefined
  ...
}
```

`this === undefined` возможен только если функция-конструктор вызвана **без `new`** в strict
mode. `js-yaml` (транзитивная зависимость `electron-updater` → `builder-util-runtime`) внутри
себя использует циклические CommonJS require между `schema.js` и `type.js`. Webpack'овский
`optimization.concatenateModules` (scope hoisting/module concatenation, **включён по умолчанию
в `mode: 'production'`**) переупорядочивает/схлопывает такие модули таким образом, что ссылка
на конструктор `Type`, захваченная одним модулем до завершения инициализации другого, оказывается
не той функцией — и вызов происходит некорректно.

`electron-updater` в этом сценарии не является `externals` в webpack-конфиге (см. ниже, почему
это не тривиально) — весь его код, включая `js-yaml`, бандлится вместе с main-процессом.

## Почему нельзя просто `externals: { 'electron-updater': 'commonjs electron-updater' }`

У Electron-приложений в этом монорепо (`kami-key-the`, `animatrona`, `label-printer-desktop`)
`electron-builder.yml` **не включает `node_modules` в пакет** (`files: ['!node_modules/**/*']`) —
весь код main-процесса, кроме явно экстернализированных нативных модулей (`koffi`, `ntsuspend`
и т.п., доставленных через `extraResources`), обязан быть забандлен webpack'ом. Экстернализация
`electron-updater` потребовала бы отдельного `extraResources`-копирования всего его дерева
зависимостей (`js-yaml`, `builder-util-runtime`, `lazy-val`, `semver`, ...) — хрупко, по
аналогии с существующим workaround для `koffi`.

## Фикс

Отключить scope hoisting в `main/webpack.config.js` приложения, использующего
`electron-updater`:

```js
module.exports = {
  // ...
  optimization: {
    concatenateModules: false,
  },
}
```

Не влияет на размер бандла заметно (в `kami-key-the` — 274 KiB что до, что после), поскольку
затрагивает только межмодульную оптимизацию вызовов, не минификацию.

## Затронутые приложения

Нашли и починили в `kami-key-the` (2026-09-15, v1.7.5).

**✅ 2026-09-15: `animatrona` — баг воспроизведён и починен (v0.55.74).** Полный
`electron-builder` прогон (`build:win`) слишком тяжёл для быстрой проверки гипотезы (renderer +
mobile-ui + установщик), поэтому воспроизведено точечно: собран изолированный webpack-бандл с
тем же `main/webpack.config.js` (та же `mode: 'production'`, тот же `optimization`), но с
единственным entry-файлом `import { autoUpdater } from 'electron-updater'` — тот же
`TypeError: Cannot set properties of undefined (setting 'options')` воспроизвёлся при запуске
бандла и под `node`, и под голым `electron.exe <bundle.js>` (js-yaml — чистый JS, живой Electron
API для самого краша не нужен). После `optimization.concatenateModules: false` в
`apps/animatrona/main/webpack.config.js` тот же тест зелёный: под `electron.exe` штатно доходит
до `autoUpdater` (падение на `app.getVersion()` под голым `node` — ожидаемо, `electron.app`
недоступен вне живого Electron-рантайма, это не тот баг). Полный `build:win`/установленный
инсталлятор после фикса не прогонялся (тяжело, риск фикса минимален — не влияет на размер
бандла) — при следующем реальном релизе `animatrona` стоит один раз проверить живым запуском
`win-unpacked/*.exe` для полной уверенности.

**✅ 2026-09-15: `label-printer-desktop` — баг воспроизведён и починен (v0.5.14).** Тот же паттерн
(top-level `import { autoUpdater } from 'electron-updater'` в
`main/services/updater.service.ts`, `electron-updater` не в `externals` webpack-конфига). Полный
GUI-уровневый `build:win` собрать не удалось — независимая, несвязанная с этим багом поломка
`next build` на composite tsconfig-проекте (`TS6305`/`TS6307`/`TS6059` вокруг
`tsconfig.spec.json`/`out-tsc`, не устранялась в рамках этой правки). Вместо изолированного
тест-бандла (как у `animatrona` выше) использована другая headless-техника из раздела
«GUI-уровень» `.claude/rules/electron.md`: собран **настоящий** main-бандл приложения
(`NODE_ENV=production npx webpack --config main/webpack.config.js`, без изменений в конфиге), а
затем `require('../app/background.js')` напрямую внутри `electron scripts/verify-*.cjs` (headless,
без создания окна). Тот же `TypeError: Cannot set properties of undefined (setting 'options')`
воспроизвёлся на этапе `require`, до `app.whenReady()` — то есть баг ловится и на полном
прикладном бандле, не только на изолированном entry-файле. После `concatenateModules: false` в
`apps/label-printer-desktop/main/webpack.config.js` тот же `require` проходит без исключения (то,
что происходит следом — нет `template.db`/standalone renderer-сервера рядом с `electron.exe` в
headless-контексте — ожидаемо и к этому багу отношения не имеет). Размер бандла не изменился
(2.58 MiB → 2.56 MiB). Полный `win-unpacked/*.exe` (после починки независимой `next build`
проблемы) не прогонялся — риск фикса минимален (тот же паттерн, что уже дважды подтверждён),
но стоит проверить один раз перед следующим релизом.

Проверка в общем случае — либо собрать `--mode production` и запустить `win-unpacked/*.exe` (не
`nx dev`), либо дешевле — headless-вариант: изолированный тест-бандл с единственным entry
`import { autoUpdater } from 'electron-updater'` **или** прямой `require()` уже собранного
`app/background.js` внутри `electron scripts/verify-*.cjs` (оба варианта не требуют полной сборки
renderer/installer, см. `.claude/rules/electron.md` § «GUI-уровень»).

## Диагностика в общем случае

Если минифицированный prod-only краш «Cannot set properties of undefined» указывает на чужую
библиотеку без единой строки прикладного кода в стектреке:

1. Найти byte-offset(ы) в стектрейсе (`file.js:1:XXXXX`) — production-бандл обычно однострочный.
2. `content.slice(offset - 150, offset + 150)` по собранному файлу — минифицированный код вокруг
   падения обычно узнаваем (в данном случае — буквально текст ошибки js-yaml
   `'Unknown option "'+t+'" is met...'`).
3. Если это библиотечный конструктор и падение — `this === undefined`, первый подозреваемый —
   `optimization.concatenateModules` при циклических CJS-зависимостях внутри библиотеки.
4. Дешёвый тест гипотезы — временно поставить `concatenateModules: false` и пересобрать
   production-бандл, сравнить.
