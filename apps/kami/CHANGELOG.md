# Changelog

Все значимые изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [0.33.35] - 2026-09-06

### Added

- Подключён гейт сырых UI-цветов/теней/transition `theme:check` (`@letar/theme-check`, встроен в
  `lint`) — как у domwellbes/studio/aboi/pravda. `themePrefix` указан на конкретный файл
  `src/app/_components/theme-provider.tsx` (роль `src/theme/` у kami играет он один, отдельного
  каталога темы нет). Первый прогон — 132 находки: 12 исправлены по существу
  (`transitionProperty`+именованный duration-токен вместо raw `Ns`; дублированный HEX
  Matrix-палитры в CSS-градиенте `projects/page.tsx` → `var(--chakra-colors-fg-*)`), остальные —
  allowlist по трём известным классам плюс новый четвёртый (Canvas 2D — аудио-визуализаторы,
  `MatrixRain`: рисующий код не резолвит CSS-переменные темы).

## [0.33.34] - 2026-09-06

### Fixed

- Корневой `layout.tsx` вызывал `getSession()`+`isAdmin()` безусловно (`await headers()` внутри —
  Dynamic API), форсируя динамический рендеринг всего дерева `[locale]/*` независимо от
  `setRequestLocale` в конкретной странице. `UserProvider` переписан на клиентский `useSession()`
  (тот же паттерн, что уже использовал `AuthButton`) — серверный проброс сессии в layout был
  мёртвым кодом, единственный потребитель контекста (`OnlyFor`) нигде не применялся. Результат:
  `/`, `/about`, `/403`, `/consulting`, `/cv`, `/skills`, `/privacy`, `/terms`, `/offline`,
  `/audio` вернулись к SSG (`nx build kami` — `●` вместо `ƒ`).

## [0.33.33] - 2026-09-06

### Added

- Фаза 10: публичная `/links` объединяет `Link` и `UploadedFile` (файлы, не аудио) в одном
  списке — новый чип-фильтр по типу (`Всё`/`Ссылки`/`Файлы`, `?type=`). Оба источника малы
  (личная коллекция), поэтому объединение и пагинация происходят в памяти после двух отдельных
  запросов — без промежуточной общей модели `SavedItem`. Карточка файла ведёт на `/api/files/...`
  и показывает иконку вместо favicon.

## [0.33.32] - 2026-09-06

### Added

- Фаза 10: Web Share Target теперь принимает файлы, не только ссылки — `manifest.ts`
  (`enctype: 'multipart/form-data'`, `params.files` с `image/*`/`application/pdf`/`audio/*`).
  Расшаренный `audio/*` идёт в тот же пайплайн, что и ручная загрузка через `/admin/audio`
  (ID3-теги, обложка, slug); остальные типы — в `UploadedFile`/`/admin/files`. Логика сохранения
  вынесена в переиспользуемые `saveAudioFile()`/`saveUploadedFile()` — используются и штатными
  аплоадерами (`/api/audio/upload`, `/api/arbitrary-upload`), и роутом `/share`, без дублирования.
- `UploadedFile` получил `category`/`tags` (тот же паттерн, что у `Link`) и inline-редактирование
  в `/admin/files`, тем же UX, что и `/admin/links` — новый server action
  `updateFileClassificationAction`.
- Офлайн-очередь Share Target (см. предыдущий релиз) обновлена под multipart — IndexedDB хранит
  файлы как `Blob`, повторная отправка при восстановлении сети пересобирает `FormData`.

## [0.33.31] - 2026-09-06

### Added

- Фаза 10: офлайн-очередь для Web Share Target — POST `/share/`, до которого сеть не доехала,
  сохраняется в IndexedDB (`kami-share-queue`) внутри Service Worker (`sw.template.js`) и
  автоматически досылается, когда подключение вернётся: через Background Sync API
  (`sync`-событие с тегом `kami-sync-share-queue`), при активации новой версии SW и
  opportunistic-флашем при любой успешной навигации (fallback для браузеров без Background
  Sync, например Firefox for Android). Пользователю в офлайне отдаётся inline-страница
  подтверждения вместо ошибки сети. Реализация без npm-зависимостей — сырой `indexedDB` API,
  так как `sw.template.js` раздаётся как статика в обход сборки.

## [0.33.30] - 2026-09-06

### Added

- Фаза 10: `/admin/links/tags` — массовое переименование/удаление категорий и меток сразу у
  всех ссылок. Категория/метки остались свободными строками в `Link` (без отдельного
  справочника) — список и счётчики считаются "на лету" из текущих значений. Переименование
  категории — обычный `updateMany` (scalar-поле); переименование/удаление метки — построчный
  проход в транзакции (`String[]`-массив, `updateMany` не умеет менять элемент внутри массива).
  Ссылка на страницу — из `/admin/links`, без отдельного пункта в сайдбаре.

## [0.33.29] - 2026-09-06

### Added

- Фаза 10: favicon-превью в карточке ссылки — `/admin/links` и публичная `/links` (сервис Google
  `s2/favicons`, всегда возвращает иконку, даже дефолтную для незнакомых доменов — fallback на
  ошибку загрузки не нужен).
- Фаза 10: inline-редактирование категории/меток прямо в строке таблицы `/admin/links` — клик по
  бейджам открывает два `Input` (категория, метки через запятую) + Сохранить/Отмена, без перехода
  на отдельную страницу. Новый server action `updateLinkClassificationAction` (Zod + `.strip()`).

## [0.33.28] - 2026-09-06

### Added

- Фаза 10: публичная страница `/links` — витрина сохранённых ссылок с фильтром по
  категории/метке (клик по чипу) и полнотекстовым поиском по заголовку/описанию/URL, обе формы
  работают без JS (обычные GET-ссылки/форма). Пагинация тем же размером страницы, что в
  `/admin/links`.

### Changed

- Модель `Link` была полностью приватной (`@@allow('all', ...ADMIN)`) — для публичной витрины
  разделена на `@@allow('read', true)` + `@@allow('create,update,delete', ...ADMIN)`: теперь
  любая сохранённая ссылка читаема без авторизации, пишет по-прежнему только владелец.

## [0.33.27] - 2026-09-06

### Changed

- Фаза 9.8: проведена оценка `wavesurfer.js` v7 и `audiomotion-analyzer` v4 как альтернатив
  кастомным визуализаторам (Фазы 6, 9.1–9.3, 9.5). Решение — не подключать: обе библиотеки
  заменили бы уже реализованные, отлаженные и переиспользуемые между несколькими фазами
  визуализации (спектрограмма с авторской цветовой схемой, Matrix Rain с 16 языковыми рецептами)
  на типовые готовые решения без реального выигрыша, ценой полного рефактора `AudioPlayer` и
  потери визуальной идентичности сайта. Пакеты не устанавливались, изменений в коде нет.

## [0.33.26] - 2026-09-06

### Added

- Фаза 9.7: VJ live-coding режим на Hydra (`hydra-synth`) на странице аудиотрека — кнопка
  "VJ-режим" рядом с "Визуализация" (Фаза 9.6). Текстовый редактор кода (Ctrl+Enter — применить),
  3 стартовых пресета, аудио-реактивность через `window.a.fft[0..3]` (сами вычисляем из общего
  `AnalyserNode`, без обращения к микрофону — `detectAudio: false` у Hydra не создаёт свой
  аудио-источник), автосохранение кода в `localStorage`, сворачиваемая подсказка по синтаксису.
  Собственный `requestAnimationFrame`-луп вместо `autoLoop: true` пакета — у него нет способа
  остановить внутренний рендер-цикл снаружи, что привело бы к утечке после закрытия компонента.
  Полноценная инструкция + публичная страница `/audio/vj-guide` не реализованы — требуют
  внешнего автора (см. PLAN.md). Ambient-типы — `src/types/hydra-synth.d.ts`.
  Live-проверка в браузере не выполнена (пустая dev-БД `AudioFile`, нет OAuth под рукой) —
  подтверждено только `nx typecheck:tsgo`/`nx lint`.

## [0.33.25] - 2026-09-06

### Added

- Фаза 9.6: fullscreen-визуализация Butterchurn (WebGL-порт WinAmp Milkdrop 2) на странице
  аудиотрека — кнопка "Визуализация" рядом с переключателем вида (Фаза 9.5). Подключается к
  общему `AnalyserNode` через `connectAudio()` (не пробрасывает FFT вручную), случайный стартовый
  пресет + циклическая смена кнопкой, реальный Fullscreen API с auto-close по `fullscreenchange`,
  `next/dynamic({ ssr: false })` — WebGL-бандл с ~100 пресетами грузится только по клику.
  Ambient-типы для `butterchurn`/`butterchurn-presets` (пакеты без `.d.ts`) — `src/types/butterchurn.d.ts`.
  Live-проверка в браузере не выполнена (пустая dev-БД `AudioFile`, нет OAuth под рукой) —
  подтверждено только `nx typecheck:tsgo`/`nx lint`.

## [0.33.24] - 2026-09-06

### Fixed

- Убран забытый отладочный `console.log(fontSize)` из `MatrixRain` — единственная причина
  оставшегося lint-warning в этом файле. Заодно отмечен выполненным пункт Фазы 6 "Matrix Rain:
  мультиязычные рецепты" — фактически уже реализован (16 языков/письменностей в `RECIPES`,
  случайное назначение рецепта на столбец), просто не был отмечен в `PLAN.md`.

## [0.33.23] - 2026-09-06

### Added

- Сид-данные `SocialPlatform` (Telegram/VK/Facebook) — `upsert` по `type`, `enabled: false` и
  `config: {}` изначально, второй прогон сида не перетирает то, что потом настроят в админке
  (пустой `update: {}`). Закрывает пункт Фазы 7 Этап 2.

### Fixed

- Фаза 8 плана ("Который час?" в отдельное приложение) отмечена выполненной — фактически была
  сделана в прошлой сессии (см. `CHANGELOG.md` записи v0.7.0/позже "Removed"), просто не
  зафиксирована в `PLAN.md`. Кода/ссылок на `whatHour` в kami не осталось — сверено грепом.

## [0.33.22] - 2026-09-06

### Added

- Фаза 9.5 плана (v1): переключаемый вид "Постер + волна трека" на странице аудио —
  `PosterSonogramSlider`. Обложка и полная офлайн-сонограмма трека (Фаза 9.2) стоят в ряд и
  сдвигаются единой формулой `translateX`, синхронной с `currentTime` — активный момент всегда
  по центру, перемотка через drag прямо по сонограмме (pointer events).
  - Упрощения: высота 320px (не весь экран), доп. переключаемый вид, а не замена основной
    раскладки страницы; вместо честной виртуализации canvas — потолок общей ширины трека
    (`MAX_TRACK_WIDTH=12000px`), для длинных треков `pxPerSecond` уменьшается вместо роста
    ширины canvas без предела.
  - Live-проверка не выполнена — dev-БД без записей `AudioFile`, загрузка тестового аудио требует
    входа через реальный OAuth. Проверено: `nx lint`/`nx typecheck:tsgo` зелёные, dev-сервер
    компилируется без ошибок.

## [0.33.21] - 2026-09-06

### Added

- Фаза 10 плана (первый слайс): раздел "Ссылки" — сохранение через Android Web Share Target.
  - `POST /share` — обрабатывает `share_target` из `manifest.ts` (`title`/`text`/`url`), извлекает
    URL из `text` регэкспом если Android не передал `url` отдельно, best-effort подтягивает
    `<title>` страницы если title не пришёл. Только для владельца (ADMIN) — иначе редирект на вход.
  - `proxy.ts` — `/share` исключён из `next-intl` middleware (аналогично `/api/`), иначе Android
    получал бы 307-редирект на `/ru/share` и терял POST-тело.
  - Модель `Link` в `schema/links.zmodel` — `url`/`title`/`description`/`category`/`tags` (плоские
    поля по образцу `LearningItem`, без отдельных моделей категорий/меток), `read: Boolean`.
  - `/admin/links` — список сохранённых ссылок, переключение "прочитано", удаление.
  - Не сделано в этом слайсе (см. PLAN.md): офлайн-очередь на случай шаринга без сети, приём
    файлов через тот же Share Target, объединение с `UploadedFile`, раздел "Видео", admin CRUD
    категорий/тегов, полноценная форма редактирования метки (сейчас только просмотр/удаление).

## [0.33.20] - 2026-09-06

### Added

- Фаза 9.2 плана: статичная сонограмма всего трека до старта воспроизведения
  (`useOfflineSpectrogram` — офлайн-анализ через `OfflineAudioContext`/`AnalyserNode` с
  suspend/resume по 300 точкам). После первого play естественно сменяется живым рендером.

## [0.33.19] - 2026-09-06

### Added

- Фаза 9.3 плана: waveform-пики на seekbar аудиоплеера (`useAudioPeaks` + `AudioWaveform`) —
  сыгранная часть трека подсвечивается зелёным, оставшаяся — серым, hover показывает время.

## [0.33.18] - 2026-09-06

### Changed

- Фаза 9.1 плана: поменяны местами `AudioSpectrogram` (теперь фон страницы на весь экран) и
  `AudioSpectrumVisualizer` (теперь внутри `Card.Body`, высота ~100px). Матрица получила цвет
  по Y-позиции символа (эквалайзер: голубой вверху → зелёный внизу) вместо фиксированного цвета.

## [0.33.17] - 2026-09-04

### Added

- Кнопка fullscreen у `AudioPlayer` (Фаза 9.4 плана) — `Maximize`/`Minimize` рядом с громкостью,
  `document.documentElement.requestFullscreen()`, скрытие `header`/`footer` через CSS
  `:fullscreen` в `global.css`, синхронизация иконки на `fullscreenchange` (в т.ч. выход по Esc).

## [0.33.16] - 2026-09-02

### Fixed

- `robots.ts` разрешал индексацию на staging (`kami-stage.s3.letar.best`) — гейт строился из
  хардкод-константы без проверки боевого домена. Переведено на `@letar/seo`
  (`isProductionDomain()`), `NEXT_PUBLIC_BASE_URL` добавлена в compose-файлы и
  `.env.staging.enc`/`.env.docker.enc` — тот же паттерн, что и в `pravda`/`aira-web`
  (§33 `PLAN-INFRA-2.md`).

## [0.33.15] - 2026-09-02

### Added

- `public/llms.txt` — карта публичных разделов для LLM-агентов (llmstxt.org), см.
  [.claude/docs/llms-txt-pattern.md](../../.claude/docs/llms-txt-pattern.md).

## [Unreleased]

## [0.33.14] — 2026-09-01

### Fixed

- `Card.Body` вокруг `Table.Root` в `admin/users/page.tsx` не имел `overflowX="auto"` — на узких
  экранах скроллилась вся страница вместо локального горизонтального скролла таблицы. Тот же
  класс бага, что нашли и починили в domwellbes (61 место), образец фикса —
  `apps/domwellbes/src/app/(admin)/admin/projects/[id]/_components/schedule-gantt.tsx`. Остальные
  15 мест с `Table.Root` в `apps/kami` уже оборачивают таблицу в `<Box overflowX="auto">` — ложных
  срабатываний не найдено.

## [0.33.13] — 2026-08-28

### Changed

- `/api/audio/upload` и `/api/arbitrary-upload` переведены на общую библиотеку
  `@letar/upload-validation` (валидация MIME/размера, безопасная генерация имени файла,
  сохранение/удаление на диске) — убрана дублировавшаяся ручная реализация. Разбор
  дефекта, который эта библиотека закрывает превентивно (небезопасное имя файла в `join()`) —
  `libs/upload-validation/README.md`.

## [0.33.12] — 2026-08-25

### Fixed

- `OptimizedImage` (`next/image` с `priority`) переведён на `preload`+`fetchPriority="high"` — в
  Next.js 16 `priority` больше не выставляет `fetchpriority="high"` сам по себе. Разбор —
  `apps/domwellbes/PLAN_PUBLIC_MOBILE.md` §12.24.

## [0.33.10] — 2026-08-25

### Fixed

- `SlotPicker` (виджет выбора времени консультации) на первом кадре показывал «Нет доступных
  слотов» вместо загрузки — `useTransition().isPending` синхронно `false` до первого тика
  эффекта, вызывающего `startTransition`. Фикс — отдельный флаг `hasLoadedOnce`. Разбор
  паттерна — [.claude/docs/react-use-transition-initial-pending-race.md](/.claude/docs/react-use-transition-initial-pending-race.md).

## [0.33.9] — 2026-08-25

### Fixed

- Подсказки валидации форм (`z.string().min/max`) показывались на английском —
  `FormI18nProvider` из `@letar/forms` не был подключён. Новый `FormI18nWrapper`
  (`src/app/_components/form-i18n-wrapper.tsx`) внутри `NextIntlClientProvider` — локаль через
  `useLocale()`, следует текущей локали интерфейса. Разбор класса бага —
  [.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).

## [0.33.6] - 2026-08-21

### Changed

- **`prisma/seed.ts`** — переведён на `@letar/seed-utils` (`runSeed`): общий helper вместо
  ручного `main().catch().finally()`, чтобы не повторять баг маскировки кода выхода (см.
  `.claude/docs/seed-scripts.md`).

## [0.33.4] - 2026-08-20

### Changed

- **`useReducedMotion`** (`src/app/_hooks/use-reduced-motion.ts`) удалён — дублировал
  `useMediaQuery(breakpoints.prefersReducedMotion)` из `@letar/hooks` (обнаружено при аудите
  дублей по монорепо). Единственный потребитель, `matrix-rain.tsx`, переключён на общий хук.

## [0.33.3] - 2026-08-13

### Fixed

- **Клавиатурный фокус мог прятаться под sticky-шапкой** (WCAG 2.4.11 Focus Not Obscured) —
  найдено при аудите sticky-шапок по монорепо (образец бага — `domwellbes`): у `html` не было
  `scroll-padding-top`, а шапка (`SkipLink` на `#main-content`, TOC блога) переносится между
  мобильным и десктопным блоком с разной высотой. Подключён общий `HeaderScrollPadding` из
  `@letar/ui` (`cssVar="--kami-header-h"`).

## [0.33.1] - 2026-07-28

### Fixed

- **Портфолио отдавало мёртвые demo-ссылки.** `prisma/seed.ts` — карточки проектов «Premium Rosstil» и «IMOT» указывали `demoUrl` на decommissioned `https://premium.rosstil.ru/` и `https://imot.letar.best` (оба приложения выведены из эксплуатации 2026-07-05). `demoUrl` убран у обеих карточек, описание/технологии оставлены как история портфолио. Найдено при повторном аудите хвостов decommission (`apps/dashboard-agent/PLAN.md`).

## [0.31.1] - 2026-07-12

### Fixed

- **Превентивный фикс `ERR_DLOPEN_FAILED: libvips-cpp.so`** — после прод-инцидента в `mandala`
  (см. корневой `PLAN.md` Сессия №70/№71) добавлен `outputFileTracingIncludes` в
  `next.config.js`: Next.js standalone tracer не подхватывает `.so`-файл, который `sharp`
  грузит через `dlopen()`. Глоб `./node_modules/.bun/@img+sharp-libvips-*/**/*.so*` без
  привязки к версии переживёт апдейт `sharp`/`bun.lock`.

## [0.31.0] - 2026-06-06

### Added

- Загрузка файлов произвольного формата (exe, zip, pdf и т.д.) через /admin/files
- Модель `UploadedFile` в БД (макс. 500MB, хранение в uploads/files/)
- API route POST/DELETE `/api/arbitrary-upload`
- Пункт «Файлы» в сайдбаре админ-панели

## [0.30.2] - 2026-04-04

### Added

- Контент 10 проектов и 28 навыков

### Changed

- React startYear обновлён на 2016

### Fixed

- force-dynamic для Keystatic API роутов
- Исправление URL

## [0.29.0] - 2026-03-21

### Added

- ConfirmDialog компонент (`useConfirmDialog` хук) — замена browser `confirm()`
- Error boundaries: глобальный `error.tsx` и admin `error.tsx`
- Responsive admin sidebar — Drawer на mobile с hamburger-кнопкой
- Empty state для AudioTable

### Changed

- Расширены semantic tokens: `bg.subtle`, `bg.panel`, `bg.code`, `border`, `border.subtle`
- Хардкод цветов заменён на semantic tokens (~15 файлов) — корректный dark mode
- Auth формы: error/success алерты с dark mode поддержкой
- Chat компоненты: semantic tokens вместо `white`/`purple.500`/`gray.200`
- Blog: MDX content, comments, page — semantic tokens
- Admin sidebar: semantic tokens + `aria-current="page"`
- Admin таблицы: `overflowX="auto"` обёртка (12 таблиц)
- Touch targets: `size="xs"` → `size="sm"` на кнопках в audio/images таблицах
- `colorPalette="purple"` → `"fg"` (бренд) в admin формах и uploaders
- `w="80px"/"140px"` → `minW` в images-table
- `width="150px"` → responsive в image-uploader
- Image uploader: keyboard accessible (`role="button"`, `tabIndex`, `onKeyDown`)
- Icon buttons: добавлены `aria-label` в audio/images таблицах

### Fixed

- Hero: `gray.950` → `gray.900` (совместимость Chakra v3)
- Consulting form: `gray.500` → `fg.muted`
- Projects page: `color="white"` → `fg.contrast`
- Admin layout: `gray.50/gray.900` → `bg.subtle`, responsive padding

## [0.28.0] - 2026-03-21

### Added

- Кросс-постинг блог-постов в соцсети (Фаза 7, Этап 1)
- Модели SocialPlatform и CrossPost в schema.zmodel
- Сервисы публикации: Telegram (через прокси) и VK (прямой API)
- Server Actions: publishPost, retryPost, getPostPublications, getEnabledPlatforms
- Админ-панель /admin/social — управление платформами
- Админ-панель /admin/social/logs — логи публикаций с фильтрами по статусу
- Кнопка «Опубликовать в соцсети» на странице блог-поста (только для админов)
- Пункт «Соцсети» в сайдбаре админки
- Facebook кросс-постинг через Graph API v21.0 (через прокси)

## [0.27.0] - 2026-03-21

### Changed

- Quiz: незалогиненные пользователи видят результаты сразу (client-side подсчёт), вместо блокирующего auth gate
- Баннер с предложением регистрации под результатами — объясняет зачем периодически проходить тест
- Ответы гостей сохраняются в sessionStorage, автосабмит на сервер после логина

### Removed

- Состояние `auth_gate` — заменено на показ результатов с баннером

## [0.25.1] - 2026-03-21

### Removed

- Страница «Который час?» — перенесена в отдельное приложение `time`
- Навигационная ссылка whatHour из хедера
- Переводы whatHour (ru/en)
- Маршрут what-hour из sitemap

## [0.26.0] - 2026-03-21

### Added

- Стратифицированная выборка вопросов: каждая порция из 50 вопросов содержит пропорциональное представительство всех 13 шкал с гарантией минимум 1 вопроса на шкалу
- Секция «Порционное прохождение и стратификация» на странице /quiz/for-professionals

### Changed

- Убрана кнопка досрочного завершения порции — тест завершается автоматически после последнего вопроса в порции
- Валидация сабмита: min(1) ответ вместо min(10), проверка на пустые ответы на клиенте

## [0.23.0] - 2026-03-20

### Added

- 3 новые шкалы личности: BAR (Переменчивый Маятник / Биполярный), PAG (Упрямый Партизан / Пассивно-агрессивный), DPR (Задумчивый Философ / Депрессивный)
- 290 новых вопросов (1666–1955): BAR-фокусированные (100), PAG (100), DPR (80), дифференциальные BOR↔BAR (10)
- BAR/PAG/DPR скоринг для всех 1665 существующих вопросов
- Точная формула нормализации TZ v2 (actual_max по пройденным вопросам вместо answered×3)
- Индикаторы достоверности шкал (insufficient/low/moderate/high)
- Кризисный блок с телефоном доверия 8-800-2000-122 при BAR/DPR/BOR ≥ 60%
- BAR-фильтр: предупреждения при BAR ≥ 40%, BOR+BAR ≥ 40%, DPR+BAR комбинации
- Дисклеймер с чекбоксом «Я ознакомился и согласен» перед тестом
- Сокращённый дисклеймер в подвале результатов
- «Светлые стороны» — развёрнутые позитивные профили для 13 типов
- «Взаимодействия типов» — 45 пар с динамикой, сильными сторонами, рисками, советами
- 3 модификатора настроения (BAR, PAG, DPR) для парных взаимодействий
- Страница /quiz/for-professionals — руководство для клинических психологов

### Changed

- Radar chart: 13 осей (вместо 10), уменьшен шрифт подписей
- Формат подписей: «Прилагательное Существительное» (Бдительный Страж, Переменчивый Маятник и т.д.)
- Топ-3 карточки: цветовое выделение ≥ 40%/60%, блок whenHigh при высоком балле
- Описания шкал обновлены на основе рекомендаций клинического психолога

## [0.22.0] - 2026-03-19

### Added

- UserProvider — контекст пользователя на верхнем уровне (layout.tsx)
  - Серверная сессия + isAdmin передаются через React Context
  - useUser() хук для клиентских компонентов (без запросов к БД)
  - OnlyFor компонент теперь использует useUser() вместо useSession()
- 1665 вопросов квиза в production БД (100 из seed + 1565 из MD файлов)
- Сохранение ответов квиза в sessionStorage (защита от потери при ошибке)
- Автозавершение теста после ответа на последний вопрос

### Fixed

- Подсветка активного пункта меню — зелёный фон вместо невидимого fg.50
- Белый экран на /quiz при отсутствии вопросов — fallback UI
- Seed overflow: Date.now() % 2_000_000_000 (Int range)
- Лидерборд: аватар не наезжает на текст (flexShrink + overflow)
- Обработка ошибок сети при сабмите квиза (404 после деплоя)

### Changed

- SZD тип: "Одинокий" → "Самодостаточный" / "Self-Reliant"
- Контейнер результатов квиза расширен до 6xl, две колонки на lg+

## [0.16.1] - 2026-03-18

### Fixed

- Кнопка админки в Header — добавлена видимая иконка ⚙ рядом с аватаром (для админов)
- Исправлен `isAdmin()` — cookieCache Better Auth не включал roles, теперь fallback на БД

## [0.14.1] - 2026-02-01

### Added

- Поле `startYear` в модели Skill — год начала практики для автоматического расчёта опыта
- Переключатель режима ввода опыта в форме навыка: "Указать лет" / "Указать год начала"
- Автоматический расчёт количества лет опыта на публичной странице /skills

### Changed

- Обновлена форма /admin/skills/new с выбором способа ввода опыта
- Список навыков в админке показывает год начала рядом с количеством лет

## [0.14.0] - 2026-02-01

### Added

- Admin Learning CRUD — страницы создания и редактирования элементов обучения
  - `/admin/learning/new` — создание нового LearningItem
  - `/admin/learning/[id]` — редактирование существующего LearningItem
  - Server Actions: createLearningItemAction, updateLearningItemAction, deleteLearningItemAction
- Admin Skills CRUD — полная админка для управления навыками
  - `/admin/skills` — список навыков с пагинацией
  - `/admin/skills/new` — создание нового навыка
  - `/admin/skills/[id]` — редактирование навыка
  - `/admin/skills/categories` — список категорий навыков
  - `/admin/skills/categories/new` — создание категории
  - `/admin/skills/categories/[id]` — редактирование категории
  - Server Actions: createSkillAction, updateSkillAction, deleteSkillAction, createSkillCategoryAction, updateSkillCategoryAction, deleteSkillCategoryAction
- Добавлен пункт "Навыки" в sidebar админ-панели

## [0.13.1] - 2026-01-22

### Fixed

- Исправлена провалившаяся миграция 0_init в production БД
- Добавлены недостающие paths в tsconfig.json для workspace библиотек (@letar/chakra-provider, @letar/yandex-metrika, @letar/forms)
- Исправлена ошибка module resolution при сборке с Turbopack

## [0.13.0] - 2026-01-03

### Added

- Подключен zenstack-form-plugin для генерации форм
- Better Auth organizations — командные опросы

### Changed

- Консолидация labels + UI токены
- Рефакторинг HireForm на step-компоненты
- Унификация админ-панели
- Унификация констант и motion хуков

### Fixed

- Улучшена i18n консистентность
- Исправлены проблемы безопасности

## [0.12.0] - 2026-01-01

### Changed

- **BREAKING**: Замена Serwist на ручной Service Worker
  - Удалены зависимости `@serwist/next` и `serwist`
  - Удалён `src/sw.ts` (Serwist-based)
  - Добавлен `public/sw.template.js` (ручной SW)
  - Добавлен `scripts/update-sw-version.mjs` (генерация sw.js с версией)
  - Обновлён `project.json` (target `update-sw-version`, `build` зависит от него)

### Fixed

- Совместимость с Turbopack в Next.js 16+ (Serwist не поддерживает Turbopack)

## [0.11.0] - 2026-01-01

### Changed

- **BREAKING**: Миграция с Auth.js на Better Auth
  - Схема БД: `emailVerified` теперь Boolean (было DateTime)
  - Таблица `VerificationToken` переименована в `Verification`
  - Поля Account/Session переименованы в camelCase

### Added

- Плагин `emailVerification` — автоматическая отправка email при регистрации
- Плагин `magicLink` — вход по ссылке без пароля
- Плагин `genericOAuth` — для Yandex OAuth
- Cookie caching для сессий (5 минут)
- Rate limiting для auth endpoints

### Removed

- Кастомные страницы verify-email/magic-link (Better Auth обрабатывает внутри)
- Устаревшие action файлы: verify-login.action.ts, verify-magic-link.action.ts, verify-email.action.ts

## [0.10.0] - 2025-12-23

### Added

- Telegram Login Widget с HMAC-SHA256 верификацией
- Email сервис (Nodemailer + Yandex SMTP / Mailhog для dev)
- Страница verify-email с авто-логином после верификации
- Server action для верификации токена

## [0.9.0] - 2025-12-23

### Added

- Полная авторизация с базой данных (OAuth + email/password)
- Регистрация и вход по email/password
- Интеграция с PostgreSQL через Prisma

## [0.8.0] - 2025-12-23

### Added

- RSS-фид для блога
- JSON-LD структурированная разметка
- Auth.js v5 с GitHub OAuth

## [0.7.0] - 2025-12-23

### Added

- Страница CV/Резюме (`/cv`)
- Страница "Который час?" (`/time`)
- Обновлён стек технологий в CV

## [0.6.0] - 2025-12-08

### Added

- Блог с Keystatic CMS и Markdoc рендерингом
- humans.txt

## [0.5.0] - 2025-12-08

### Added

- Страница проектов (`/projects`)
- SEO мета-теги
- Sitemap и robots.txt

## [0.4.0] - 2025-12-08

### Added

- База данных Prisma + ZenStack:
  - Модели: SkillCategory, Skill, Project, HireRequest
  - Сиды с начальными данными (навыки, проекты)
  - Nx targets для работы с БД
- Страница навыков (`/skills`):
  - Категории с иконками
  - Карточки навыков с уровнями и опытом
  - Бейджи Featured для ключевых навыков
  - Локализация RU/EN
- E2E тесты для страницы навыков

## [0.3.0] - 2025-12-08

### Added

- Страница "О себе" (`/about`):
  - Hero секция с заголовком и описанием
  - Статистика (7+ лет опыта, 30+ проектов, 50+ технологий)
  - Карточки "Чем занимаюсь" (Архитектура, Разработка, Менторинг)
  - Технологический стек в чипсах
  - CTA кнопка на страницу навыков
- Компоненты:
  - `StatCard` — карточка статистики
  - `FeatureCard` — карточка функциональности
- E2E тесты для страницы "О себе" (RU/EN)
- Установлен `lucide-react` для иконок

## [0.2.0] - 2025-12-08

### Added

- Chakra UI v3 с кастомной темой:
  - Изумрудно-золотая цветовая палитра (Matrix стиль)
  - Поддержка светлой/тёмной/системной темы
  - ThemeSwitcher компонент
- Header компонент:
  - Логотип и основная навигация
  - LanguageSwitcher (RU/EN dropdown)
  - ThemeSwitcher (light/dark/system)
  - MobileMenu (hamburger drawer)
- Footer компонент:
  - Ссылки на социальные сети (GitHub, Telegram, LinkedIn, Email)
  - Копирайт с годом
- Matrix Rain эффект:
  - Canvas-анимация с падающими символами
  - Катакана + цифры + латиница
  - Настраиваемые параметры (цвет, скорость, размер)
- Hero-секция:
  - Интеграция Matrix Rain как фона
  - CTA кнопки (Познакомиться, Позвать на работу)
  - Анимированный индикатор скролла
- E2E тесты (Playwright):
  - Навигация по сайту
  - Переключение языка
  - Проверка основных компонентов

## [0.1.0] - 2025-12-08

### Added

- Техническое задание (TZ.md) с полным описанием проекта
- Интернационализация (i18n) с next-intl:
  - Поддержка русского и английского языков
  - Структура локализации: routing, request, navigation
  - Базовые переводы для всех секций сайта
  - Middleware для автоматического определения локали
- Конфигурация проекта:
  - trailingSlash для SEO-friendly URL
  - Порт 3005 для dev-сервера
  - Интеграция с Nx монорепо

### Infrastructure

- Домен: kami.letar.best
- CMS: Keystatic (Git-based)
- Аналитика: Yandex Metrica
- База данных: PostgreSQL (shared)
