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

Нашли и починили в `kami-key-the` (2026-09-15, v1.7.5). На момент фикса **не проверены** два
других приложения с тем же паттерном (top-level `import { autoUpdater } from 'electron-updater'`
в `main/`, webpack-бандлинг без `concatenateModules: false`) — потенциально та же скрытая мина:

- `apps/animatrona/main/updater.ts` + `apps/animatrona/main/webpack.config.js`
- `apps/label-printer-desktop/main/services/updater.service.ts` +
  `apps/label-printer-desktop/main/webpack.config.js`

Проверка — собрать `--mode production`, запустить собранный `win-unpacked/*.exe` (не `nx dev`) и
убедиться, что процесс не падает сразу при старте.

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
