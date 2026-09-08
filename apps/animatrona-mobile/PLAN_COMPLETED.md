# Выполненные задачи — Animatrona Mobile

Детальное описание всех реализованных фич.

## Версия 0.7.12

### Заведено unit-тестирование — vitest, 26 тестов на api/client.ts (2026-09-08)

Приложение не имело ни одного unit-теста. Задача — по прецеденту `animatrona-tv` (там за
соседнюю сессию завели vitest, 22 теста в 4 файлах, коммит `febd0b19`).

Добавлены `vitest.config.mts` (alias `@` → `src`, `environment: 'node'`, `globals: true`,
`clearMocks`/`restoreMocks: true`) и `vitest/globals` в `compilerOptions.types` `tsconfig.json`.
Отдельный target `test` в `project.json` не нужен — Nx подхватывает его инференс-плагином
`@nx/vitest` по одному факту наличия `vitest.config.*` в каталоге приложения (см. `nx.json`).

`src/api/client.ts` в этом приложении — не тонкая обёртка над shared-клиентом (как у
`animatrona-tv`), а полноценный слой:

- `getAdapter()` — переиспользует `cachedAdapter`, пока не сменился `activeServerId`
  (`useServersStore`), пересоздаёт через `createAdapter()` при смене.
- `withCacheFallback()` — общая обёртка для `getLibrary`/`getAnimeDetails`: успех обновляет кэш
  (`@/services/cache`) и отмечает сервер доступным (`useOfflineStore.setServerReachable`),
  сетевая ошибка (`isNetworkError` из `@letar/animatrona-shared`) отмечает недоступным и
  подставляет кэш, отсутствие кэша при ЛЮБОЙ ошибке пробрасывает исходную ошибку.
- `getLibrary()` — при `options.search` кэш не участвует вообще (обходит `withCacheFallback`
  целиком, идёт прямо к адаптеру) — результаты поиска зависят от запроса, кэшировать нечего.
- `getLastWatched()` — свой вариант фоллбэка: при не-сетевой ошибке возвращает `null` без
  обращения к кэшу (не бросает, в отличие от `withCacheFallback`).
- `saveProgress()` — отмечает сервер доступным/недоступным по результату, но БЕЗ
  кэш-фоллбэка — всегда пробрасывает ошибку.
- `getEpisodeVideoUrl`/`getEpisodeAudioUrl`/`getDownloadedSubtitlePaths` — приоритет
  скачанного файла (`useDownloadsStore`) над серверным адаптером.

`useServersStore`/`useOfflineStore`/`useDownloadsStore` и `@/services/cache` замоканы через
`vi.mock` — реальные Zustand-сторы и AsyncStorage не участвуют.

⚠️ **Грабля, найденная и обойдённая в процессе:** `withCacheFallback` вызывает
`setCache(data).catch(() => undefined)` без `await`. Если замокать `setCachedLibrary` и
аналоги голым `vi.fn()` (без `mockResolvedValue`), он по умолчанию возвращает `undefined`, а не
`Promise` — `.catch()` на `undefined` падает синхронно ДО `return`, и весь успешный путь
ошибочно проваливается в catch-ветку `withCacheFallback` (тест получает `undefined`/кэш вместо
реального результата, хотя адаптер отработал успешно). Фикс — дефолтные `mockResolvedValue`
для всех `setCached*`/`getCached*` в `beforeEach`, как в реальной реализации `services/cache.ts`.

**Проверка:** `nx test`/`nx lint`/`nx typecheck:tsgo animatrona-mobile` — все зелёные (26/26
тестов). Коммит `1fbabf82`.

## Версия 0.7.11

### Снят локальный пин react-native/@react-native/* (2026-09-08)

Задача от координатора экосистемы Animatrona (письмо #1408): `react-native`,
`@react-native/codegen`, `@react-native/gradle-plugin` пинились локально на `0.87.0`, тогда как
корневой `package.json` уже стоял на `0.87.1` — тот же класс проблемы, что дважды чинили раньше в
каскаде RN 0.87 (`react`, `react-native-gesture-handler`): локальный пин перекрывает корневой
через bun workspace resolution, `metro.config.js` тянул `@react-native/metro-config` из корня, а
сам `react-native` — из приложения, разные версии.

Три строки заменены на `"*"` — версия резолвится только из корня, как у `animatrona-tv`.
`bun install --force` потребовался, потому что обычный прогон не пронул устаревшие isolated-копии
`0.87.0` в `node_modules/.bun` (см. `.claude/docs/bun-install-stale-isolated-cache.md`) — проверено
symlink'ами (`node_modules/react-native`, `node_modules/@react-native/{codegen,gradle-plugin}`),
все резолвятся в `0.87.1`.

**Проверка:** `typecheck:tsgo` зелёный, `nx lint` зелёный. Сборка debug APK (`react-native bundle`

- `gradlew assembleDebug`) прошла чисто — ловушки со смешанным резолвом (`TS2719`, «Tried to
  register two views»), которые уже возникали в прошлом каскаде, не воспроизвелись.

Заодно поймана и обойдена независимая проблема сборки: ninja падал на `armeabi-v7a` из-за
превышения лимита длины пути Windows (260 символов) на сгенерированном codegen-объекте
`react-native-gesture-handler` — воспроизводится и на `0.87.0`, не связано с версией RN (тот же
класс, что в `.claude/docs/android-agp9-windows-toolchain-pitfalls.md`). Обход в сессии — разовый
`subst X: C:\web\letar` (сессионный, не сохраняется); постоянного фикса (короче путь репо либо
отключить `armeabi-v7a`) не делалось — вне объёма задачи, занесено в `PLAN.md` открытым вопросом.

Коммит `df74f51c`.

## Версия 0.7.10

### 4 предупреждения `react-hooks/exhaustive-deps` в плеере закрыты (2026-09-08)

Первый прогон ESLint (после того как для приложения вообще завели `eslint.config.mjs`, см.
версию 0.7.8 ниже) дал 4 предупреждения, все в плеере — там, где порядок эффектов завязан на
жизненный цикл ExoPlayer, поэтому решались индивидуально, не пакетным добавлением в массив
зависимостей:

- **`usePictureInPicture.ts:128`** (подписка на `AppState` для авто-входа в PiP при
  сворачивании) — `enterPipMode` нестабилен: дефолт `aspectRatio = [16, 9]` в деструктуризации
  опций пересоздаёт массив каждый рендер, из-за чего сама функция каждый раз новая. Добавление
  её в зависимости резавязывало бы `AppState`-подписку на каждый рендер. Фикс — тот же
  ref-паттерн, что уже применялся для `onPipAction` (`onPipActionRef`): завёл `enterPipModeRef`,
  обновляемый в отдельном `useEffect` без массива зависимостей, вызов — через `.current()`.
- **`PlayerScreen.tsx:223`** (синхронизация `isPlaying` → нативное состояние PiP-кнопок) —
  ESLint не принимал member-expression `pip.updatePlaybackState` как достаточную зависимость и
  требовал весь `pip` (новый объект на каждый рендер — хук возвращает объектный литерал).
  Фикс — деструктурировать `const { updatePlaybackState } = pip` и зависеть напрямую от
  идентификатора; сама функция стабильна, потому что `useCallback` внутри хука зависит только
  от `isPipAvailable`, которое не меняется после монтирования (вычисляется один раз в
  `useState(() => ...)`).
- **`PlayerScreen.tsx:424`** (эффект `getAnimeDetails` — загрузка данных эпизода) — не хватало
  `applyViewingModeToEpisode`, `preferredAudioIndex`, `preferredSubtitleIndex`, `viewingMode`.
  `applyViewingModeToEpisode` добавлен в зависимости без риска — у него пустой массив
  зависимостей в своём `useCallback`, стабилен всю жизнь компонента. Остальные три — состояния
  из zustand-стора настроек плеера, меняющиеся при обычном пользовательском действии (смена
  аудиодорожки/субтитров/режима просмотра во время воспроизведения); внутри эффекта они читаются
  как значение на момент загрузки эпизода, а не как триггер. Включение их в зависимости
  перезапускало бы весь `getAnimeDetails`-fetch и сбрасывало бы видео на каждый такой клик —
  оставлены осознанно вне массива с `eslint-disable-next-line react-hooks/exhaustive-deps` и
  комментарием-обоснованием прямо в коде.
- **`PlayerScreen.tsx:575`** (`selectExternalAudio`) — `episodeId`, используемый в
  `getEpisodeAudioUrl(episodeId, ...)`, отсутствовал в зависимостях `useCallback`. Это настоящий
  пропуск (не намеренное решение), исправлен добавлением обычной зависимости — `useCallback`-deps
  не запускают ничего автоматически, риска рестарта эффекта на кадре здесь нет в принципе
  (функция вызывается только по явному действию пользователя в меню аудиодорожек).

`nx lint`/`nx typecheck:tsgo`/`nx run-many -t format --projects=animatrona-mobile` — все зелёные,
0 предупреждений. ⚠️ **Не проверено на реальном устройстве** — в среде сессии не было
подключённого Android (`adb devices` пусто). Открытый вопрос остаётся в `PLAN.md`: нужна ручная
проверка PiP (вход/выход), паузы/возобновления, перемотки, переключения аудиодорожки и субтитров.

Коммит: `acd36a33` (fix). ⚠️ Побочная находка сессии — во время работы параллельная сессия того
же приложения (тот же фиксированный agent-mail identity `animatrona-mobile-dev`, использованный
последовательно в двух независимых запусках) закоммитила свою работу (единый dev-логгер,
коммит `3292bbb9`) и её коммит случайно захватил уже отредактированные к тому моменту в рабочем
дереве куски `PLAN.md`/`CHANGELOG.md` этой сессии (текст об exhaustive-deps). Содержимое не
потеряно и корректно, просто распределено по коммитам не так, как задумывалось — сообщение
`3292bbb9` не упоминает exhaustive-deps, хотя его дифф содержит эти правки. Не критично и не
требует правки задним числом (`.claude/rules/git.md` — не переписывать историю без явного
решения владельца), но стоит иметь в виду как ещё один пример гонки за общий рабочий каталог,
описанной в `.claude/docs/git-multi-agent-incidents.md`.

## Версия 0.7.8

### ESLint заведён — до этого не запускался для приложения вообще (2026-09-08)

Не «настроен неудачно», а отсутствовал в графе Nx. У приложения не было `eslint.config.*`,
поэтому `@nx/eslint/plugin` (`nx.json`, `targetName: "lint"`) не порождал inferred-таргет,
а блок в `project.json` состоял из одних `options` без `executor`:

```json
"lint": { "options": { "args": ["**/*.{ts,tsx}"] } }
```

Это добавка к inferred-таргету, которого нет. `nx lint animatrona-mobile` падал с
«Cannot find configuration for task», `nx show projects --with-target lint` приложение не
показывал. Практическое следствие: обязательный шаг чек-листа перед коммитом молча не выполнял
ничего — проверка шла только через `typecheck:tsgo` и ручной `oxlint`. Класс бага —
`.claude/docs/nx-target-without-executor-silent-noop.md`.

#### Почему конфиг не на пять строк: три находки

1. **Пресет `@react-native/eslint-config/flat` подключить нельзя** — он тянет
   `eslint-plugin-eslint-comments@3.2.0`, зовущий удалённый в ESLint 10 `context.getSourceCode()`.
   Это не «одно правило сломалось»: падает загрузка правила → падает линт всего файла → ноль
   полезной работы на любом прогоне.
2. **`eslint-plugin-react-native@5.0.0` несовместим так же** (`lib/util/Components.js`). Выпали
   именно RN-специфичные проверки: `no-unused-styles`, `no-inline-styles`, `no-color-literals`,
   `split-platform-components`, `no-single-element-style-arrays`. Лечится только апстримом.
3. **`@react-native/eslint-plugin` (`no-deep-imports`) работает**, но не резолвится голым
   импортом: под изолированной установкой bun это транзитивная зависимость
   `@react-native/eslint-config`, в корневом `node_modules` её нет. Обход — `createRequire` от
   entry-файла пакета-родителя.

Сигнал был виден заранее и не в логе ESLint, а в `bun scripts/check-all.mjs --group=deps`:
`@react-native/eslint-config требует eslint@^8.0.0 || ^9.0.0, установлен 10.9.1`. Проверка
`peer-deps` имеет уровень «отчёт», поэтому строка годами лежала в фоновом шуме.

#### Что получилось

`apps/animatrona-mobile/eslint.config.mjs`: `nx.configs['flat/react-typescript']` (16 правил
`react/*`) + корневой `eslint.config.mjs` (оттуда приезжает `eslint-plugin-react-hooks`) +
глобалы рантайма RN, переписанные руками из `@react-native/eslint-config/shared.js` +
`@react-native/no-deep-imports` + игноры `android/**`, `ios/**`, `dist/**`, `build/**`,
`.bundle/**`, `vendor/**`.

В `project.json` мёртвый блок заменён на связку как у `animatrona-tracker`: таргет `oxlint` +
`"lint": { "dependsOn": ["oxlint"] }`, сам `eslint .` приезжает inferred-таргетом.

#### Как проверялось, что линт не пустышка

Намеренно не по «Successfully ran target» — ровно та ловушка, из-за которой проблема и жила:

- `eslint . -f json` → **85 файлов** (48 ts, 32 tsx, 4 js, 1 mjs), 5.8 с, 2 задачи в графе;
- `nx show projects --with-target lint` теперь показывает `animatrona-mobile`;
- позитивный тест конкретного RN-правила: временный файл с
  `import { Text } from 'react-native/Libraries/Text/Text'` даёт
  `error @react-native/no-deep-imports`.

#### Находки линта: 2 закрыто, 13 в долг

Закрыты как мёртвый код:

- `timeTextStyle` в `SeekBar.tsx` — `useAnimatedStyle`, ни к чему не применённый; worklet
  пересчитывался на каждом кадре drag впустую;
- состояние `searching` в `LibraryScreen.tsx` — писалось в трёх местах, не читалось нигде.
  Индикатора поиска на экране нет, два лишних ре-рендера на запрос уходили в никуда. Ветка
  `else if (searchQuery)` оставлена с комментарием: полноэкранный лоадер во время поиска не
  показывается намеренно, он сбрасывает фокус с поля ввода.

Остальные 13 (9 × `no-console`, 4 × `react-hooks/exhaustive-deps`) занесены в `PLAN.md` долгом
с пофайловым списком. Правила не глушились: `no-console` требует логгера под `__DEV__` (простая
замена на `warn` засыпет LogBox, а лог версии бандла в `index.js` предписан `CLAUDE.md`
приложения), `exhaustive-deps` — все четыре в плеере, где эффекты завязаны на жизненный цикл
ExoPlayer, разбирать по одному с проверкой на устройстве.

#### Смежное

- `animatrona-tv` — та же дыра, но чужая зона. Владелец (`animatrona-tv-dev`) параллельно
  стартовал сессию по tv и попросил его файлы не трогать; отлаженный конфиг и фикс `project.json`
  переданы письмом (тред `rn-eslint-config`, координатор в копии).
- Разбор вынесен в `.claude/docs/react-native-eslint-flat-config-eslint10.md` + строка в индексе
  корневого `CLAUDE.md`.
- Ориентир «образец — соседний `animatrona-mobile-ui`» из прежней формулировки задачи оказался
  ложным: этот проект живёт в `apps/animatrona/mobile-ui`, к React Native отношения не имеет,
  RN-специфики в его конфиге нет.

---

## Версия 0.7.7

### 4 копии `formatTime` сведены к `formatDuration` из общей библиотеки (2026-09-08)

Задача от координатора экосистемы Animatrona (письмо #1403): `formatTime` был скопирован в
`SeekBar.tsx:25`, `AnimeScreen.tsx:39`, `PlayerScreen.tsx:661` и `GestureOverlay.tsx:59`. Все
заменены на `formatDuration` из `@letar/animatrona-shared` — библиотека уже была в зависимостях,
новых пакетов не добавлялось.

Копия в `PlayerScreen.tsx` оказалась **мёртвым кодом**: объявлена и ни разу не вызывалась —
просто удалена, без импорта взамен. Пятая точка, которую координатор не назвал:
`ResumeOverlay.tsx` уже пользовался `formatDuration`, то есть правильный паттерн в приложении
существовал, а четыре копии с ним разошлись.

**Побочно починены два бага, которых задача не касалась.** Три копии из четырёх были `mm:ss`
**без часов** — фильм на 1 час 35 минут показывался в полосе перемотки как `95:30`, теперь
`1:35:30`. И битая длительность (`NaN`/`Infinity`) рендерилась как `NaN:NaN`, общая функция
отдаёт `--`. Формулировка координатора «без смены видимого поведения» была неверна, ему это
отписано отдельно — важно для той же задачи в других приложениях экосистемы.

### Второй пункт той же задачи отклонён: `useDebounce` из `@letar/hooks`

Координатор предлагал заменить ручной debounce в `LibraryScreen.tsx:88` (6 строк на
`setTimeout`) хуком из `@letar/hooks`. Отклонено: у библиотеки в `package.json` только барабанный
экспорт `.`, подпутей нет, поэтому импорт одного хука затягивает в граф модулей Metro весь
`src/index.ts` — browser-хуки (`localStorage`, `ServiceWorker`, `EventSource`, `matchMedia`) и
блок TanStack Query. `@tanstack/react-query` в зависимостях мобильного приложения нет, а Metro
резолвит все статические импорты графа до всякого tree-shaking — сборка бандла упала бы.

Цена вопроса — либо тянуть react-query в RN-бандл ради шести строк, либо сначала заводить
подпуть-экспорт `@letar/hooks/utility` в библиотеке с ~20 потребителями (зона
`ui-coordinator-dev`, не этого приложения). Вернуться к пункту имеет смысл только если подпути в
`@letar/hooks` появятся по другой причине.

**Проверка:** `typecheck:tsgo` зелёный, `oxlint` по `src/` чистый. ESLint на момент сессии для
приложения не существовал вовсе — это и было найдено здесь (см. версию 0.7.8); после того как
конфиг завели, `nx lint animatrona-mobile` на этом коде зелёный.

Коммиты `8ea8509b`, `14449de4`.

### Побочные находки сессии

Обе оказались реальными и закрыты отдельными сессиями в тот же день:

- **`react-native` разъехался между корнем и приложениями** — корень `0.87.1`, оба RN-приложения
  пинили `0.87.0`, в дереве лежало 4 физические копии. Передано координатору, закрыто в 0.7.11.
- **ESLint не запускался для приложения вообще** — нет `eslint.config.*`, поэтому
  `@nx/eslint/plugin` не заводил inferred-таргет, а блок `"lint"` в `project.json` был только
  `options` без `executor`, то есть добавкой к несуществующему таргету. Закрыто в 0.7.8, и
  оттуда же выросла проверка покрытия lint по всему графу Nx (9 дыр в монорепо).

## Версия 0.7.6

### react-native 0.87.0 — тест на реальном устройстве пройден (2026-08-25)

Закрыт открытый вопрос из v0.7.5. Устройство — Redmi Note 8 Pro. Приложение собралось,
установилось, запустилось без JS-ошибок; тач-хендлинг и переключение вкладок Desktop/Tracker на
экране подключения проверены вживую (`adb shell input tap` + скриншоты). PiP/remote-control не
проверялись — нет подключённого Desktop/Tracker-сервера для реального видеопотока в этой сессии.

По пути вскрыт и исправлен целый класс несовместимостей RN 0.87 в самой Android-сборке — ни одна
из них не ловилась typecheck'ом, все проявлялись только на реальной сборке/устройстве:

- **`metro.config.js`**: кастомный `resolveRequest` для singleton-пакетов (react/react-native и
  т.п.) резолвил через `require.resolve(moduleName, {paths})` — Node-резолвер строго проверяет
  `exports` в `package.json`, а react-native 0.87 не экспортирует
  `./src/private/featureflags/ReactNativeFeatureFlags`, используемый транзитивно. Фикс — подмена
  `context.originModulePath` на файл внутри `node_modules` приложения и делегирование
  `context.resolveRequest` (собственный, нестрогий резолвер Metro).
- **Gradle 8.13 → 9.4.1** — AGP, который тянет RN 0.87, требует минимум 9.4.1. Задета и
  `animatrona-tv` (тот же Gradle wrapper), не только `animatrona-mobile`.
- **AGP 8.7.3 → 9.2.1, Kotlin Gradle Plugin → 2.2.0.** AGP 9.0+ несёт встроенную поддержку Kotlin
  и конфликтует с явным плагином `org.jetbrains.kotlin.android` (`Cannot add extension with name
  'kotlin', as there is an extension already registered with that name`). Официальный временный
  обход — `android.builtInKotlin=false` + `android.newDsl=false` в `gradle.properties` (уберут в
  AGP 10 — тогда потребуется полная миграция на встроенный Kotlin во всех трёх Android-модулях:
  `:app`, `exoplayer-ass`, `exoplayer-sync`).
- **`libs/exoplayer-ass`, `libs/exoplayer-sync`**: `kotlinOptions { jvmTarget = "17" }` заменён на
  `kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }` — старый API помечен
  `DeprecationLevel.ERROR` в связке AGP 9.2.1/Kotlin 2.2.0 и валит сборку `.gradle.kts`-скрипта
  целиком (не просто warning).
- **`react-native-worklets` 0.8.1→0.12.1, `react-native-reanimated` 4.3.0→4.6.0,
  `react-native-screens` 4.25.2→4.27.0** — все три декларировали явную несовместимость с RN 0.87
  (worklets/reanimated — через `assertMinimalReactNativeVersionTask`, screens — ошибкой
  компиляции Kotlin в собственном коде библиотеки).
- **`react-native-gesture-handler`**: стабильный 3.2.1 использует внутренний Android API
  `ReactViewGroup.getZIndexMappedChildIndex`, удалённый в RN 0.87 (`Unresolved reference`).
  Исправления есть только в nightly-канале — поставлен `3.3.0-nightly-20260824-5de6d2358`
  (временно, до релиза stable с поддержкой 0.87).
- Убран локальный пин `react-native-gesture-handler: ^2.31.0` из
  `apps/animatrona-mobile/package.json` — перекрывал корневую (уже обновлённую) версию через bun
  workspace resolution, тот же класс проблемы, что уже чинили для `react`
  ([feedback_root_only_dependency_versions] в памяти). Дополнительно потребовался
  `bun install --force` — обычный `bun install` не чистит устаревшие изолированные копии пакета в
  `node_modules/.bun`, символическая ссылка продолжала указывать на старую версию.
- **Windows**: `:app:buildCMakeDebug[armeabi-v7a]` падал на `ninja: Filename longer than 260
  characters` — старый `ninja.exe` из NDK-тулчейна (bundled с cmake 3.22.1) не поддерживает
  длинные пути даже при системном `LongPathsEnabled=1` (нет манифеста `longPathAware`). Обход —
  `subst X: C:\web\letar` и сборка из `X:\apps\animatrona-mobile\android` вместо `C:\web\letar\...`.

## Версия 0.7.5

### Бамп react-native 0.85.0 → 0.87.0

Зелёный свет от координатора GrayMill (сообщение #387, thread `cascade-rn-087-migration`) после
снятия блокера версии `react` (§ Версия 0.7.4 ниже). Синхронно подняты корневой `package.json`
(`react-native`, `@react-native/babel-preset|eslint-config|metro-config|typescript-config` —
`0.87.0`, `react-native-gesture-handler` `3.0.1`→`3.2.1`) и `apps/animatrona-mobile/package.json`
(`react-native`/`@react-native/codegen`/`@react-native/gradle-plugin` — `0.87.0`). Код был уже
мигрирован под 0.87 API заранее (§ Версия 0.7.4), поэтому typecheck `animatrona-mobile` прошёл
сразу же зелёным.

`animatrona-tv` (typecheck) упал на `TS2719` в `libs/exoplayer-ass`/`libs/exoplayer-sync` — эти
общие либы теперь резолвят типы `react-native@0.87.0`, а `animatrona-tv` всё ещё сидит на
`0.84.1`. Ожидаемо, зафиксировано координатором заранее — `animatrona-tv-dev` должна синхронно
поднять свой пин.

⚠️ **Тест на реальном устройстве не пройден** — в сессии, где сделан бамп, не было подключённого
Android-устройства (`adb devices` вернул пустой список). Тач-хендлинг/жесты/PiP/remote-control
обязательно проверить перед релизом (см. `CLAUDE.md`) — см. открытый вопрос в `PLAN.md`.

## Версия 0.7.4

### Миграция типов под react-native 0.87 API (без апдейта версии)

Задача от координатора Animatrona (GrayMill, thread `cascade-rn-087-migration`) — подготовить
код к будущему апдейту `react-native`, не поднимая саму версию (см. `PLAN.md` § «Открытые
задачи» за полным разбором находок).

- `libs/exoplayer-ass`/`libs/exoplayer-sync`: глубокие импорты `Libraries/Types/CodegenTypes` и
  `Libraries/Utilities/codegenNativeCommands` заменены на публичные `CodegenTypes`/
  `codegenNativeCommands` из корня `'react-native'` — доступны и в 0.85, и в 0.87 (коммиты
  `69e4a723`, `c868c822`). `UIManager.getViewManagerConfig(...).Commands` явно приведён к
  `{ Commands: Record<string, number> }` — в 0.87 эта типизация пропала из `Object`.
- `usePictureInPicture.ts`/`useRemoteControl.ts`: `NativeEventEmitter.addListener`
  перетипизирован под сигнатуру 0.87 `(...args: readonly Object[]) => unknown`, приведение
  события внутри колбэка (коммит `e4264c23`).
- Заодно найдены и починены 2 доп. breaking change 0.87, не входившие в исходную задачу:
  `StatusBar` потерял `backgroundColor`/`translucent` (Android теперь всегда edge-to-edge);
  реф `Animated.View` в `SeekBar.tsx` больше не даёт типизированный `measureInWindow` через
  `View` — заменён на узкий локальный интерфейс + `as never` (паттерн уже использовался в
  `exoplayer-sync/index.tsx`).
- Устаревшая devDependency `@types/react-native@^0.73.0` в обеих либах убрана — конфликтовала
  с bundled-типами RN 0.87 (собственные типы есть с 0.71+, community-пакет больше не нужен).
- Найден и задокументирован отдельный блокер апдейта версии: 4 разные версии `react`
  одновременно в дереве монорепо (корень `^19.2.8` vs `animatrona-mobile`/`animatrona-tv`
  `19.2.3`, плюс транзитивные peer у RN-экосистемы) — репо-широкая унификация вне скоупа
  одного приложения, передана координатору.

Все правки обратно совместимы с текущей 0.85 — `animatrona-mobile`, `exoplayer-ass`,
`exoplayer-sync`, `animatrona-tv` все зелёные на typecheck.

**2026-08-19/20: блокер версии `react` снят.** Владелец решил через GrayMill (сообщение #383) —
версии shared-зависимостей только в корневом `package.json`. Убран `"react": "19.2.3"` из
`package.json` (`animatrona-tv` синхронно, отдельной сессией, коммит `7e95b5ae`). 4 копии в
`node_modules/.bun` после обычного `bun install` оказались непрочищенным кешем изолированных
установок, а не реальным разъездом версий — `bun.lock` уже резолвил единственную `react@19.2.8`.
`bun install --force` схлопнул кеш до одной копии, typecheck обоих приложений зелёный.

---

## Версия 0.2.1

### Resume Overlay и UX улучшения

- **Resume Overlay** — видео не загружается до выбора пользователя "Продолжить" или "Сначала"
- **Кнопка "Продолжить просмотр"** в AnimeScreen — автоматический переход на сохранённую позицию последнего эпизода
- `useWatchProgress`: добавлена опция `skipResumePrompt` для пропуска диалога при внешнем `startTime`
- PlayerScreen: логика отложенного рендеринга видео через `userMadeResumeDecision`

---

## Версия 0.2.0

### VLC-style жесты и улучшение плеера

| Фича                              | Статус | Примечания                         |
| --------------------------------- | ------ | ---------------------------------- |
| **Масштаб видео (contain/cover)** | ✅     | JS-based вычисление размеров       |
| **Сикбар (прогресс-бар)**         | ✅     | Динамическая ширина через onLayout |
| **Блокировка экрана**             | ✅     | Упрощена до кнопки разблокировки   |
| **ASS субтитры**                  | ✅     | libass через JNI, fontScale=1.5    |
| **SRT субтитры**                  | ✅     | JS парсинг                         |
| **Double tap ±10 сек**            | ✅     | PanResponder                       |
| **Свайп громкость (справа)**      | ✅     | react-native-volume-manager        |
| **Свайп яркость (слева)**         | ✅     | react-native-screen-brightness     |
| **Свайп перемотка**               | ✅     | Горизонтальный свайп               |
| **Long press = 2x**               | ✅     | Ускорение при удержании            |
| **Тап = показ контролов**         | ✅     | С задержкой для double tap         |

### Улучшения синхронизации

- Улучшена синхронизация видео и аудиодорожек
- Исправлена навигация между экранами
- Обновлён файловый плеер

---

## Версия 0.1.0

### Фаза 1: Инфраструктура ✅

- React Native проект с TypeScript
- Nx интеграция (project.json)
- Metro bundler для монорепо
- Тёмная тема Tamagui (purple accent)
- React Navigation 7.x с типизацией
- Zustand store с AsyncStorage persistence

### Фаза 2: Библиотека ✅

- **LibraryScreen** с FlatList (2-колоночная сетка)
- Поиск с debounce
- Фильтры по статусу просмотра
- Сортировка (название, год, рейтинг, прогресс)
- Pull-to-refresh
- Карточка "Продолжить просмотр"

### Фаза 3: Детали аниме ✅

- **AnimeScreen** с blur header
- SectionList по сезонам со sticky headers
- Прогресс эпизодов с индикаторами
- Жанры, описание, метаданные

### Фаза 4: Видеоплеер ✅

- **PlayerScreen** с react-native-video (ExoPlayer)
- Выбор аудиодорожек (TrackSelector)
- Выбор субтитров (VTT через нативный TextTrack)
- Fullscreen/Landscape + immersive mode
- Автосохранение прогресса
- Wake lock

### Фаза 5: Жесты ✅

- GestureLayer с react-native-gesture-handler
- Double-tap ±10 сек с ripple эффектом
- Swipe громкость (левая зона)
- Swipe яркость (правая зона)
- Seek свайп (центральная зона)
- Индикаторы с Reanimated анимациями

### Фаза 6: Дополнительные фичи ✅

- SkipChapterButton (OP/ED)
- NextEpisodeOverlay с countdown
- SpeedSelector (0.5x - 2x)
- OfflineIndicator
- PiP режим (usePictureInPicture + PipModule)
- ChapterMarkers на прогресс-баре

### Нативные модули

#### libs/exoplayer-ass

- Kotlin JNI wrapper для libass
- C++ мост к libass с alpha compositing
- React Native компонент NativeAssView
- Интеграция с CMake и FFmpeg Kit

#### libs/exoplayer-sync

- SyncVideoView с MergingMediaSource
- Синхронизация видео + внешняя аудиодорожка

### API клиент

- Типизированные API функции для Mobile Server
- Поддержка локальных файлов и IPFS (CID)
- Конвертация субтитров ASS → VTT на сервере

### Экраны

| Экран         | Описание                       |
| ------------- | ------------------------------ |
| ConnectScreen | QR сканер, ручной ввод URL     |
| LibraryScreen | Библиотека с фильтрами/поиском |
| AnimeScreen   | Детали аниме, список эпизодов  |
| PlayerScreen  | Видеоплеер со всеми контролами |

### Хуки

| Хук                 | Назначение                      |
| ------------------- | ------------------------------- |
| useNetworkStatus    | Отслеживание состояния сети     |
| useBrightness       | Управление яркостью экрана      |
| useWakeLock         | Предотвращение засыпания экрана |
| usePlayerGestures   | Обработка жестов плеера         |
| usePictureInPicture | Picture-in-Picture режим        |
| useSystemVolume     | Нативная громкость устройства   |
| useLockScreen       | Блокировка экрана плеера        |

---

## Версия 0.5.5

### Phase 9: React Native 0.84 + реструктуризация зависимостей

#### 9.1 Реструктуризация зависимостей

- [x] **Pure JS зависимости перенесены в корневой package.json** — zustand, @react-navigation/_, @tamagui/_, lucide-react-native, @babel/runtime, babel-plugin-module-resolver
- [x] **Нативные модули перенесены в корневой package.json** — async-storage, blob-util, gesture-handler, safe-area-context, svg, video
- [x] **Autolinking через react-native.config.js** — нативные модули объявлены явно для autolinking (Gradle не сканирует корневой package.json)
- [x] **Transitive devDeps убраны** — hermes-compiler, @react-native/community-cli-plugin, @react-native/babel-plugin-codegen приходят через react-native
- [x] **Минимальный локальный package.json** — только react, react-native, @react-native/codegen, @react-native/gradle-plugin (нужны для Gradle file paths)

#### 9.2 Обновление React Native 0.83.2 → 0.84.1

- [x] **Hermes V1** — новый JS-движок по умолчанию (~10-15% улучшение TTI)
- [x] **Android SDK 36** — compileSdkVersion, targetSdkVersion, buildToolsVersion
- [x] **Kotlin 2.1.20** — обновлён с 2.0.21
- [x] **AsyncStorage v3** — обновлён с v2, добавлен local_repo Maven для shared_storage артефакта
- [x] **Обновлены нативные модули** — safe-area-context 5.7.0, svg 15.15.3, blob-util 0.24.7, CLI 20.1.2
- [x] **APK собирается успешно** — debug 77 MB, все нативные модули совместимы

#### 9.3 Deprecation warnings

- [x] `currentActivity` → `reactApplicationContext.getCurrentActivity()` в BrightnessModule, PipModule
- [x] `TurboReactPackage` → `BaseReactPackage` в TurboModulesPackage
- [x] `ReactNativeHost` → убран, используется `ReactHost` + `loadReactNative()` (RN 0.84 template)

---

## Версия 0.5.0–0.5.4

### Phase 8: Баг-фиксы и polish

#### 8.1 Критичные баги плеера (v0.5.1)

- [x] **Wake Lock** — реализован через `setKeepScreenOn` в `BrightnessModule` (FLAG_KEEP_SCREEN_ON)
- [x] **Прогресс не обновляется при возврате** — заменён `useEffect` на `useFocusEffect` в AnimeScreen
- [x] **Частота сохранения прогресса** — `SAVE_INTERVAL_MS = 30_000` (1 раз в 30 сек)
- [x] **Регулировка скорости** — добавлен `rate` prop в стек: SyncVideoViewNativeComponent → SyncVideoView.kt → SyncVideoViewManager.kt → SyncVideoPlayer → PlayerScreen
- [x] **Субтитры не совпадают с видео** — обёрнуты в общий `View style={videoStyle}`, субтитры относительно видео-контейнера

#### 8.2 PiP (v0.5.2)

- [x] **PiP показывает интерфейс плеера** — при входе в PiP все модалки закрываются через `useEffect`

#### 8.3 Оффлайн (v0.5.4)

- [x] **Нельзя открыть библиотеку оффлайн** — `fetchApiWithCache` пробует кэш при ЛЮБОЙ ошибке; `cachePostersForLibrary` читает `isServerReachable` из store; `posterMap` в deps `renderAnimeItem`
- [x] **Загрузка прерывается** — `task.progress()` всегда регистрируется; `NO_PROGRESS_TIMEOUT` увеличен до 5 минут для IPFS DHT-поиска

#### 8.4 UI/UX polish (v0.5.2)

- [x] **Иконки на главной монохромные** — `⚙️`→`<Settings2>`, `📥`→`<Download>`, `▶`→`<Play>` (lucide-react-native)
- [x] **Экран ошибки** — кнопка "Повторить" с `RotateCcw` иконкой; `retryCount` state для повторной загрузки
- [x] **UTF символы** — заменены на lucide иконки (⬇→Download, ✓→Check, ▶→Play)

#### 8.5 Умные переходы между эпизодами (v0.5.3)

- [x] **Автопереход при пропуске эндинга** — если endTime главы ≈ конец видео (≤10 сек), показывает NextEpisodeOverlay
- [x] **Пометка серии просмотренной** — определяет главу эндинга по ключевым словам и вызывает `saveProgressToServer` с `completed: true`
- [x] **Предзагрузка следующего эпизода** — за 3 минуты до конца HEAD-запросы для прогрева DNS/IPFS gateway

#### 8.6 Режим просмотра (v0.5.3)

- [x] **Предпочтения аудио/субтитров** — `viewingMode: 'original' | 'dubbed' | null` в `playerSettings` store, персистится в AsyncStorage
- [x] **Применяется автоматически** при загрузке нового эпизода
- [x] **Кнопка Languages** — в левой VLC-группе, фиолетовая когда режим активен

---

## Версия 0.5.0

### Phase 7: Release и оптимизация

- [x] **Signed release APK** — автоматическая подпись через `assembleRelease`, APK 38 MB (vs 85 MB debug)
- [x] **Strip debug symbols из libass.so** — arm64-v8a: 21 MB → 3.5 MB (-83%), armeabi-v7a: 17 MB → 2.6 MB (-85%)

### Phase 6: React Native 0.83 + New Architecture

- [x] **Upgrade RN 0.80.3 → 0.83.2** — React 19.2.4, Gradle 8.13, New Architecture enabled
- [x] **react-native-reanimated удалён** — заменён на стандартный `Animated` API (`FadeView`/`ZoomFadeView`)
- [x] **TurboModules миграция** — 6 модулей с TypeScript specs в `specs/`, Kotlin extends `Native*Spec`
- [x] **Fabric Components** — SyncVideoView, AssSubtitleView с `codegenNativeCommands`
- [x] **Metro resolver для bun monorepo** — deep imports `react-native/Libraries/...` resolve к единой копии
- [x] **Очистка legacy кода** — удалены 6 `*Package.kt`, все `NativeModules.*` вызовы

---

## Версия 0.4.0–0.4.2

### Phase 5: Фоновое скачивание (v0.4.0)

- [x] **Android Foreground Service для загрузок** — `DownloadService.kt`, notification с прогрессом, `foregroundServiceType=dataSync`
- [x] **Баг-фикс зависания загрузки на 100%** — watchdog таймеры для зависания и отсутствия прогресса

### Прогресс просмотра в списке эпизодов (v0.4.2)

- [x] Загрузка прогресса из AsyncStorage для всех эпизодов
- [x] Прогресс-бар для незавершённых (1-89%), зелёная точка для завершённых (≥90%)

### Баг-фиксы (v0.4.1)

- [x] Краш при нажатии аппаратных кнопок громкости и Назад
- [x] PiP при паузе — видео не сворачивается если на паузе

---

## Версия 0.3.0–0.3.4

### Phase 4: Оффлайн (v0.3.0–v0.3.1)

- [x] Кэширование данных библиотеки (AsyncStorage, fetchApiWithCache)
- [x] Offline store (isServerReachable, mode online/offline)
- [x] Download Manager (очередь FIFO, видео + аудио + субтитры)
- [x] Кэш постеров (react-native-blob-util, file:// URI)
- [x] Оффлайн воспроизведение (file:// URI)
- [x] Синхронизация прогресса при восстановлении связи
- [x] Управление хранилищем (визуальная полоса, очистка кэша)

### Phase 3: Polish (v0.3.1–v0.3.4)

- [x] Кумулятивный мульти-тап ±10/20/30 с иконками lucide
- [x] Горизонтальный свайп перемотка с индикатором
- [x] Pinch to zoom (масштабирование щипком)
- [x] Улучшение UI overlay (SVG градиенты, scale анимация)
- [x] PiP (Picture-in-Picture)

### Phase 2: Анимационные фичи (v0.3.0)

- [x] Skip Intro/Outro кнопка (chapters из API)
- [x] Next Episode overlay (за 30 сек до конца)
- [x] Убран react-native-reanimated (несовместим с APK)
- [x] Нативный BrightnessModule и VolumeModule
- [x] VLC-style нижние контролы плеера
- [x] Навигация между эпизодами (Prev/Next)

### VLC-style жесты — полная таблица (v0.2.0–v0.3.4)

| Фича                                | Версия |
| ----------------------------------- | ------ |
| Масштаб видео (contain/cover)       | v0.2.0 |
| Сикбар (прогресс-бар)               | v0.2.0 |
| Блокировка экрана                   | v0.2.0 |
| ASS субтитры (libass JNI)           | v0.2.0 |
| SRT субтитры (JS парсинг)           | v0.2.0 |
| Multi-tap ±10/20/30 сек             | v0.3.1 |
| Горизонтальный свайп перемотка      | v0.3.1 |
| Свайп громкость (справа)            | v0.2.0 |
| Свайп яркость (слева)               | v0.2.0 |
| Long press = 2x                     | v0.2.0 |
| Тап = показ контролов               | v0.2.0 |
| Автоскрытие контролов (4 сек)       | v0.2.0 |
| Landscape UI                        | v0.2.0 |
| VLC-style нижние контролы           | v0.3.0 |
| Убран reanimated                    | v0.3.0 |
| Настройки плеера (размер субтитров) | v0.3.4 |
| Haptic feedback (HapticsModule)     | v0.3.4 |

---

**Последнее обновление:** 2026-03-02
