# Animatrona Mobile — План развития

## Черновик (новые баги/идеи)

- [x] **Экран гаснет во время просмотра видео** — подключён `useWakeLock({ enabled: isPlaying })` в PlayerScreen (f1d9fa1d0)
- [x] **Субтитры смещены при первом рендере** — субтитры рендерятся только после `videoLoaded`, когда videoStyle корректен (f1d9fa1d0)

- [ ] **Вернуть обратную связь на тапы (haptic)** — удалён `react-native-haptic-feedback`, но `NativeHapticsModule` (TurboModule) уже есть. Нужно подключить `Haptics.light()` / `Haptics.medium()` в кнопки плеера, жесты, тапы по карточкам
- [ ] **QR-сканер на ConnectScreen** — сейчас только ручной ввод адреса, нужна кнопка «Сканировать QR-код» для подключения к Desktop/Tracker
- [ ] **Синхронизировать React 19.2.3 → 19.2.5** — в animatrona-mobile/package.json отличается от корня
- [ ] **Покадровая перемотка на паузе** — при паузе кнопки +/- 5 кадров. ExoPlayer: `player.seekTo()` с `SeekParameters.EXACT` или `player.seekToNext/PreviousMediaItem()` на уровне кадров

## Текущая версия: 0.7.3

---

## Фаза 8 (план) — Локальный плеер папок

**Идея:** аналог desktop folder mode (`apps/animatrona/renderer/src/app/player/_hooks/useFolderPlayer.ts`), но
**полностью локальный** — папка на самом телефоне/SD-карте, без обращения к Desktop и без mobile-server API.
Отдельный от библиотеки режим просмотра, в БД/прогресс сервера ничего не пишет.

> Уточнено с пользователем 2026-07-29: не режим внутри библиотеки (не навигация по сезонам/эпизодам одного
> тайтла), а именно произвольная папка на диске устройства + сразу воспроизведение видеофайлов из неё.

### Почему нельзя перенести 1-в-1

Desktop-реализация завязана на Electron main-процесс: нативный `dialog.showOpenDialog({openDirectory})`,
`fs.readdir` по абсолютному пути, кастомный `media://` протокол с `createReadStream` и whitelist
(`main/protocols/allowed-paths.ts`). На Android нет прямого доступа к произвольному пути — только
Storage Access Framework (SAF): пользователь выбирает дерево через `ACTION_OPEN_DOCUMENT_TREE`, приложение
получает persistable `content://` URI и работает с ним через `DocumentFile`/`ContentResolver`, а не `fs`.
Это архитектурно другой набор API — нужен новый нативный модуль, а не HTTP-эндпоинт от Desktop
(mobile-server сейчас отдаёт только `/api/library`, `/api/media`, `/api/progress`, `/api/subtitles`,
`/api/ipfs` — ничего про произвольные папки нет, см. `apps/animatrona/main/services/mobile-server/routes/`).

### Точка входа

- [ ] Кнопка «Локальные файлы» / отдельный пункт навигации → FolderPickerScreen (не смешивать с LibraryScreen)

### Выбор и сканирование папки (Android SAF)

- [ ] TurboModule: выбор дерева папки через `ACTION_OPEN_DOCUMENT_TREE`, сохранение persistable
      URI-permission (`ContentResolver.takePersistableUriPermission`)
- [ ] TurboModule: рекурсивный обход дерева через `DocumentFile`, фильтр по видео-расширениям
      (`.mkv/.mp4/.avi/.webm/.mov/.wmv/.flv/.m4v` — тот же список, что в desktop `fs.handlers.ts`)
- [ ] Парсинг номера эпизода из имени файла — на desktop живёт только в `apps/animatrona` (не в
      `libs/`), для мобильного либо продублировать, либо вынести общую логику в `@letar/animatrona-shared`
- [ ] Список эпизодов/бонус-видео (OP/ED/PV), сортировка — аналог `FolderEpisode`/`isBonusVideo()`

### Внешние субтитры

- [ ] Сопоставление `.ass/.srt/.vtt` в той же папке с эпизодом по номеру (аналог desktop
      `external-subtitle-scanner.ts`) — `NativeAssView`/`SrtSubtitleView` уже умеют рендерить эти форматы,
      нужен только локальный источник вместо `getSubtitleUrlFromCid`
- [ ] Шрифты для ASS — desktop подтягивает их из папки; на мобильном уточнить, откуда брать
      (`getDownloadedFontDir` сейчас рассчитан на офлайн-скачанный контент из библиотеки)

### Воспроизведение — требует spike перед реализацией

- [ ] Проверить, что `SyncVideoView`/ExoPlayer воспроизводит `content://` URI напрямую (ExoPlayer
      поддерживает `ContentDataSource` из коробки, но нужно подтвердить на текущей версии
      `libs/exoplayer-sync`) — риск: SAF-права, буферизация по Range на `content://`
- [ ] Отдельный вариант `PlayerScreen` без `episodeId`/`animeId` (новый route с `source: 'folder'`,
      `fileUri` вместо серверных ID) — текущий экран жёстко завязан на `getEpisodeVideoUrl(episodeId)`
- [ ] Прогресс просмотра — только локально (Zustand/AsyncStorage), `saveProgressToServer`/
      `queueProgressSync` не вызывать (нет `animeId`/`episodeId` для API)

### История папок

- [ ] «Недавние папки» — аналог desktop `useFolderHistory.ts` (лимит записей, TTL), но в Zustand persist
      вместо localStorage; SAF-permission на старую папку может протухнуть — обрабатывать переоткрытие

### Вне скоупа v1

- Импорт локальной папки в библиотеку (аналог desktop `ImportWizardDialog`) — на телефоне нет
  соответствующего хранилища/транскодинга, не нужен
- Встроенные субтитры/аудио из контейнера (не внешние файлы) — на desktop это тоже TODO-заглушка
  (`useFolderModeUI.tsx:228`), на мобильном не приоритет для первой версии
- iOS — SAF специфичен для Android; на iOS другой API (`UIDocumentPicker` + security-scoped bookmarks),
  вне скоупа (проект Android-only, min SDK 24)

---

## Открытые задачи

- [ ] **Обновить react-native 0.85.0 → 0.87.0** (свой пин в `package.json`, отдельный от
      корневого `package.json` монорепо)

  Обнаружено при попытке поднять корневой `react-native` до 0.86.2 в рамках общего
  deps-update (2026-07-30): корень и `animatrona-mobile` держат **разные** версии
  react-native одновременно в дереве (bun хостит обе копии рядом). TS увидел два разных
  номинальных модуля `react-native/Libraries/StyleSheet/StyleSheetTypes` и упал на
  `SyncVideoPlayer.tsx`/`NativeAssView.tsx` (`ViewStyle`/`experimental_backgroundSize`
  несовместимы между копиями 0.85.0 и 0.86.2). Корневой пин откатили обратно на 0.85.3,
  чтобы не блокировать остальной апдейт зависимостей.

  **2026-08-19: повторная попытка, до 0.87.0, синхронно и в мобильном, и в корне (включая
  `@react-native/babel-preset|eslint-config|metro-config|typescript-config` и
  `react-native-gesture-handler` 3.0.1→3.2.1).** Синхронный бамп убрал прежний конфликт
  дублирующихся номинальных типов между разными версиями — но вскрыл **настоящие breaking
  changes RN 0.87**, не решаемые версионной синхронизацией:

  - `react-native/Libraries/Types/CodegenTypes` и
    `react-native/Libraries/Utilities/codegenNativeCommands` — пути codegen-типов переехали
    в 0.87; оба `libs/exoplayer-ass/src/AssSubtitleViewNativeComponent.ts` и
    `libs/exoplayer-sync/src/SyncVideoViewNativeComponent.ts` импортируют их напрямую по
    старому пути (`TS2307`).
  - `UIManager.getViewManagerConfig(...).Commands` — типизация `.Commands` пропала из
    возвращаемого типа (`Object`); используется в `libs/exoplayer-ass/src/index.tsx` и
    `libs/exoplayer-sync/src/index.tsx` для вызова команд `loadContent`/`setFrameSize`/
    `dispatchViewManagerCommand` (`TS2339`).
  - `NativeEventEmitter.addListener` в новых тайпингах требует
    `(...args: readonly Object[]) => unknown` — старые типизированные колбэки в
    `usePictureInPicture.ts`, `useRemoteControl.ts` (события `onPipAction`, `onKeyEvent` и
    т.п.) больше не проходят (`TS2345`).
  - Остаточный `ViewStyle`/`DimensionValue` `TS2719` («two different types with this name
    exist, but they are unrelated») даже при ОДНОЙ версии `0.87.0` в обоих package.json —
    похоже на две физические копии пакета в дереве bun из-за разных peer-зависимостей
    (`react-native-video`/`vision-camera` и т.п.), не выяснено до конца.

  Откачено обратно на 0.85.0/0.85.3 в этой же сессии — typecheck `animatrona-mobile` и
  `animatrona-tv` оба зелёные на откате. **Следующая попытка = не бамп версии, а миграция**:
  править codegen-импорты и типизацию команд в обеих `libs/exoplayer-*`, перетипизировать
  event-колбэки в hooks, только после этого пробовать версию — и обязательно тестировать
  тач-хендлинг/жесты на реальном устройстве (см. `CLAUDE.md`).

  Заодно `animatrona-tv` сидит на ещё более старом отдельном пине (`0.84.1` в своём
  `package.json`, но фактически резолвится через корневой `0.85.3`/`react-native-gesture-handler
  3.0.1`) — та же проблема разъезда версий. Апдейтить его код нельзя из сессии
  `animatrona-mobile` (правило `CLAUDE.md`) — координировать через GrayMill.

### Требуют проверки на устройстве

- [x] **Кнопка блокировки экрана** — проверено на устройстве ✓
- [x] **Мульти-сервер (v0.6.0)** — проверено на устройстве ✓
- [x] **Франшизы + поиск (v0.7.0)** — проверено на устройстве ✓

### Заблокированные

- [x] **ASS субтитры (NativeAssView)** — работают ✓
- [x] **Синхронизация viewing mode с Desktop** — реализовано ✓

---

> Завершённые фазы: [PLAN_COMPLETED.md](PLAN_COMPLETED.md)

**Последнее обновление:** 2026-05-29
