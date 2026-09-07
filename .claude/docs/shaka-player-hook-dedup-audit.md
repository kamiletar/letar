# useShakaPlayer — аудит дублирования между animatrona/animatrona-tracker/video-player-react (2026-09-08)

## Вопрос

После дедупа `use-keyboard-shortcuts.ts` и `getShakaFrameRate`/`FRAME_STEP_COUNT` между
`animatrona` и `animatrona-tracker` (CHANGELOG v0.11.16/v0.11.17) встал следующий кандидат —
инициализация самого Shaka Player. На вид те же три места:

1. `apps/animatrona-tracker/.../_hooks/use-shaka-player.ts`
2. `libs/video-player-react/src/hooks/useShakaPlayer.ts`
3. `apps/animatrona/renderer/.../_hooks/useShakaPlayer.ts`

## Вывод: живых реализаций не три, а две — и они расходятся по реальным осям

Грепом по фактическим вызовам (`useShakaPlayer(`), а не только по существованию файла:

| Файл                                           | Кем реально вызывается                    |
| ---------------------------------------------- | ----------------------------------------- |
| `apps/animatrona/.../_hooks/useShakaPlayer.ts` | **никем** — dead code, см. ниже           |
| `libs/video-player-react/useShakaPlayer.ts`    | `animatrona-folder-player` (единственный) |
| `apps/animatrona-tracker/use-shaka-player.ts`  | `TrackerVideoPlayer` (единственный)       |

### `apps/animatrona` — локальная копия оказалась мёртвым кодом

`VideoPlayer.tsx` (animatrona) не создаёт video-элемент и не вызывает `useShakaPlayer` вовсе.
С момента перехода на persistent-video-архитектуру (`GlobalVideoProvider.tsx` — video/audio
элементы создаются один раз на весь жизненный цикл приложения и переживают навигацию между
страницами, чтобы не пересоздавать `MediaSource`/не терять позицию воспроизведения) вся
инициализация Shaka переехала в сам `GlobalVideoProvider.tsx` инлайном. Локальный
`_hooks/useShakaPlayer.ts` остался экспортированным из `_hooks/index.ts`, но не имел ни одного
вызывающего — сравни с CHANGELOG_2026_09_07.md/PLAN_COMPLETED-4.md, где зафиксирован сам переход
на `GlobalVideoProvider`, но не зафиксировано удаление старого хука.

**Действие:** файл и его экспорт из `_hooks/index.ts` удалены как confirmed dead code (не часть
дедупа — отдельная, но смежная находка того же аудита).

### `libs/video-player-react` vs `apps/animatrona-tracker` — два живых потребителя с разными осями

| Ось                           | `useShakaPlayer` (lib, потребитель — folder-player)                                                                                                                                                   | `use-shaka-player.ts` (tracker)                                                                                                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Загрузка модуля Shaka         | принимает готовый `Shaka` пропом — вызывающий делает `import()` сам, до рендера хука                                                                                                                  | делает `import('shaka-player')` внутри себя, отдельным эффектом, хранит как state                                                                                                                                                                                            |
| Состояние play/pause/time/vol | **не хранит** — отдаёт только `isVideoReady`/`isLoading`/`reload()`, вызывающий сам вешает `timeupdate`/`play`/`pause`/`volumechange` и держит состояние в соседнем `usePlayerState` (тоже общий хук) | хранит **все** сам: `isPlaying`/`currentTime`/`duration`/`volume`/`isMuted` — единый источник истины внутри хука                                                                                                                                                             |
| Раздельные аудиодорожки       | `audioRef` + `usesSeparateAudioRef`, синхронизация громкости/времени/скорости при готовности                                                                                                          | не поддерживает — `usesSeparateAudio` только мьютит `video`, синхронизацию отдельной дорожки делает **другой** хук (`use-audio-sync.ts`) снаружи                                                                                                                             |
| Первый кадр / скрытие лоадера | нет — `isLoading` снимается сразу по `onVideoReady` (после `player.load()`)                                                                                                                           | `waitForFirstFrame()` — ждёт реальный декодированный кадр (`requestVideoFrameCallback` с фолбэком на `timeupdate`), плюс переключает `isLoading` повторно по `waiting`/`canplay` после первого кадра — это то, что тестировщик видит как «крутилка не мигает раньше времени» |
| Блокировка autoplay           | не детектирует                                                                                                                                                                                        | ловит `NotAllowedError` из `video.play()`, выставляет `isVideoBlocked` — обязательный UX тrekера (`AutoplayBlockedOverlay`)                                                                                                                                                  |
| Покадровая перемотка          | нет                                                                                                                                                                                                   | `stepFrame()` поверх `playerRef` + `getShakaFrameRate` (уже общая утилита, см. v0.11.17)                                                                                                                                                                                     |
| `reload()`                    | есть — используется в будущих/альтернативных сценариях библиотеки                                                                                                                                     | нет — эпизод/URL меняется, компонент ремонтится через `key`/route, ре-инициализация — обычный cleanup+эффект                                                                                                                                                                 |

Ключевое отличие архитектур — **где живёт состояние воспроизведения**. Lib-хук осознанно тонкий
(только init/load/cleanup), а состояние play/pause/time вынесено в компонент + `usePlayerState`
(этим же паттерном пользуется `animatrona-folder-player` и раньше пользовался `animatrona` до
перехода на persistent video). Хук трекера — самодостаточный, включает и state, и первый-кадр,
и autoplay-block, потому что `TrackerVideoPlayer` — веб-страница без persistent-video-слоя,
которой не нужна отдельная композиция из трёх хуков ради того же результата.

## Оценка стоимости слияния

Свести к одному хуку значило бы одно из двух:

- **Расширить lib-хук** до модели тrekера (внутреннее состояние, первый-кадр, autoplay-block,
  self-contained динамический импорт Shaka) — но тогда единственный сегодняшний потребитель
  (`animatrona-folder-player`) остаётся с невостребованными полями, а его собственная модель
  «состояние снаружи + `usePlayerState`» либо дублируется параллельно новым внутренним
  состоянием хука (два источника истины на одни и те же события), либо требует рефакторинга
  `folder-player`, ничем не мотивированного для этого приложения.
- **Перевести тrekер на lib-модель** — вынести play/pause/time/volume в `usePlayerState` (уже
  общий хук, конфликта нет) и первый-кадр/autoplay-block — в сам компонент/отдельный небольшой
  хук снаружи `useShakaPlayer`. Технически возможно, но `TrackerVideoPlayer` — боевой продакшен-
  компонент показа контента конечным пользователям (не Electron, где по `.claude/rules/electron.md`
  и так честно написано «GUI нельзя проверить в сендбоксе» — здесь веб-приложение можно бы было
  проверить, но объём связанного состояния большой: `isVideoBlocked`/`setIsVideoBlocked`,
  `error`, `stepFrame` завязаны на 6+ мест в `tracker-video-player.tsx`, `use-audio-sync.ts`,
  `use-chapter-nav.ts`, `use-watch-progress.ts`). Риск регресса в реальном плеере ради устранения
  ~40 строк совпадающего boilerplate (создание `<video>`, `Shaka.polyfill.installAll()`,
  `isBrowserSupported()`, `new Shaka.Player()`, `attach`, обработчик `error`, `player.load()` с
  игнором `LOAD_INTERRUPTED`/7002, `unload()+destroy()+remove()` в cleanup) непропорционален
  выгоде — тот же класс решения, что и в
  [header-drawer-dedup-audit.md](/.claude/docs/header-drawer-dedup-audit.md): общая форма на
  уровне «это Shaka Player init», а не переиспользуемый паттерн с одинаковым API.

## Решение: не сводить

`libs/video-player-react/useShakaPlayer.ts` и `apps/animatrona-tracker/use-shaka-player.ts`
остаются раздельными реализациями — расхождение в модели владения состоянием (снаружи хука vs
внутри), в наборе фич (raw video init vs init+first-frame+autoplay-block+state) и в риске
(единственный staging/e2e для тrekера — живой просмотр видео) реальное, не косметическое.

**Единственное фактическое изменение по итогам аудита** — удаление подтверждённо мёртвого кода:
`apps/animatrona/renderer/src/components/player/_hooks/useShakaPlayer.ts` (и его экспорт из
`_hooks/index.ts`), не имевшего ни одного вызывающего с момента перехода `animatrona` на
persistent-video архитектуру (`GlobalVideoProvider.tsx`).

### Побочная находка вне текущего скоупа

`apps/animatrona/renderer/.../_hooks/useAudioSync.ts` — та же ситуация, что и у удалённого
`useShakaPlayer.ts`: не вызывается нигде (`GlobalVideoProvider.tsx` делает синхронизацию
раздельных аудиодорожек инлайном). Не тронут в рамках этого аудита — задача была про
`useShakaPlayer`, а `useAudioSync` требует отдельной проверки (убедиться, что это точно
дублирующий мёртвый код, а не код для будущего/альтернативного сценария).
