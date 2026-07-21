# Changelog (Архив до 2026-04-14)

> Продолжение основного CHANGELOG.md
> Версии: 3.30.0 — 0.1.0

## [3.30.0] — 2026-04-14

### Fixed — таймер счетовода зависал при овертайме

- **Симптом:** если счетовод пропустил момент и нажал «Стоп» когда таймер уже ушёл в минус, кнопка «Выступление окончено» не появлялась (она рендерилась только при `!timer.isRunning`). В панике пользователи переходили в классический режим и случайно завершали матч.
- **Решение:** кнопка теперь всегда видна при **овертайме** (`isOvertime`), независимо от статуса таймера. В обычном режиме поведение не изменилось.
- **Лейбл:** при `isOvertime && timer.isRunning` кнопка называется «⚠ Форс-завершить (таймер идёт)» — сервер корректно обрабатывает завершение при работающем таймере.

### Fixed — isPending зависал навсегда при сетевой ошибке

- Добавлен авто-таймаут 8 сек: если ответ от сервера не пришёл, `isPending` сбрасывается и отображается ошибка «Нет ответа от сервера».

### Added — ручной ввод времени при овертайме

- В диалоге «Жёлтая карточка» добавлена кнопка «✏ Своё время» с полем ввода в формате `М:СС` (например `3:05`). Позволяет зафиксировать точное время в нештатной ситуации.

### Changed — классический режим (`?mode=classic`) удалён

- `ScorerPage` (`score/page.tsx`) больше не поддерживает `?mode=classic`. Wizard — единственный интерфейс счетовода. Это предотвращает случайное завершение матча через устаревший классический UI, который не имел подтверждения для кнопки «Завершить матч».

### Added — оффлайн-данные загружаются автоматически

- `OfflineStatusBar` при монтировании автоматически сохраняет снэпшот матча в IndexedDB. Кнопка «Сохранить оффлайн» удалена — предзагрузка всегда происходит при входе на страницу счетовода.

### Added — оптимистичный стоп таймера

- `StepPerforming`: нажатие кнопки «Стоп» мгновенно переключает UI (локальный флаг `localTimerStopped`), не дожидаясь ответа сервера. При оффлайне операция ставится в очередь синхронизации.

### Added — операции STOP_TIMER, END_PERFORMANCE в оффлайн-очередь

- `ScorerOperationType` расширен типами `STOP_TIMER` и `END_PERFORMANCE`.
- Sync API `/api/match/[id]/sync` умеет обрабатывать эти операции при восстановлении связи.

## [3.29.0] — 2026-04-10

### Fixed — постеры: команды налезали друг на друга

- **Симптом:** после v3.28.0 постер анонса начал приходить с картинкой, но названия команд налезали друг на друга сверху (флекс-row ломался).
- **Причина:** satori (SVG renderer для постеров) не всегда корректно считает `flex: 1` + `maxWidth` — колонки с командами получали нулевую ширину и коллапсировались. Плюс не было `wordBreak` на длинные названия.
- **Решение:** переписал layout команд в `announcement-poster.tsx` и `result-poster.tsx` с жёсткими ширинами (`width: 440px` / `460px`), `justifyContent: 'space-between'`, `wordBreak: 'break-word'`. На каждом flex-контейнере явно указан `display: 'flex'` (satori требует этого для всех элементов с >1 ребёнком).

### Added — диагностическое логирование webhook

- **Симптом (частично):** первые POST от Telegram Cloud начали приходить на `tg-in.letar.best` (IP `91.108.5.20`, 200 ответов), но `TelegramReaction` в БД не появляются. Нужен более детальный лог чтобы понять — приходят `message_reaction_count` updates или что-то другое, и если приходят — находит ли handler `TelegramMessage` в БД по `chatId+messageId`.
- **`webhook/route.ts`:** добавлен `console.log('[telegram-webhook] update received:', ...)` в начале POST — список ключей update верхнего уровня, первые 80 символов текста сообщения, chat.id и message_id для реакций, количество эмодзи.
- **`handleReactionCount`:** логируется отдельно случай «реакция для несуществующего message» (chatId/messageId не совпали с сохранённым в `TelegramMessage`) и случай «найдена и будет upsert-нута» (с списком эмодзи и счётчиков).
- После того как причина будет установлена — детальные логи можно убрать.

## [3.28.0] — 2026-04-10

### Fixed — постеры Telegram не содержали картинки

- **Симптом:** анонсы матчей приходили в Telegram как обычное текстовое сообщение без постера (satori → PNG), хотя код `sendMatchAnnouncement` пытается сгенерировать постер и отправить его через `sendPhoto`.
- **Причина:** `renderPoster()` в `lib/telegram/poster/render.ts` при каждом вызове делал runtime fetch на `https://fonts.googleapis.com/css2?family=Noto+Sans&subset=cyrillic` чтобы получить URL TTF файла, а затем на `fonts.gstatic.com` за самим шрифтом. **Google Fonts CDN недоступен с РФ-хостинга s2** (та же проблема что с api.telegram.org — провайдер ДЦ режет соединения). Обработчик ошибки возвращал `new ArrayBuffer(0)` (пустой шрифт), satori падал или рендерил некорректно, sharp не мог конвертировать SVG в PNG → `generateAnnouncementPoster().catch(() => null)` → `poster = null` → код шёл по ветке `sendMessage` без картинки. В логах контейнера: `Не удалось загрузить шрифт, используется fallback`.
- **Решение:** положить шрифт в репо как статический asset, читать с диска. Никакого runtime fetch.
  - `public/fonts/NotoSans-Regular.ttf` (558 KB, weight 400)
  - `public/fonts/NotoSans-Bold.ttf` (558 KB, weight 700)
  - Шрифты покрывают latin + cyrillic (основной subset Noto Sans).
  - `render.ts`: новая функция `loadFonts()` с in-memory кэшем (загружает один раз за жизнь процесса). Поиск с fallback по 3 путям (`cwd/public/fonts`, `cwd/apps/grandslamcup/public/fonts`, абсолютный `/app/apps/grandslamcup/public/fonts`) — работает и в dev (`nx dev` из корня или из app), и в prod Docker standalone (CMD из `/app`).
  - Удалена асинхронная функция `loadFont()` с Google Fonts fetch и её fallback на пустой ArrayBuffer.
- **Влияние:** фиксит постеры анонса, результата, расписания и итогов тура — все используют общий `renderPoster()`.

## [3.27.0] — 2026-04-10

### Fixed — входящие Telegram webhook через reverse-proxy

- **Диагностика:** после v3.23.1 (прокси для ИСХОДЯЩИХ через `tg-proxy.letar.best`) бот мог отправлять сообщения, но `getWebhookInfo` показал `last_error_message: "Connection timed out"`. То есть Telegram Cloud не мог достучаться до `grandslamcup.letar.best:443` с IP своих датацентров (149.154.x, 91.108.x). curl тот же URL с mail сервера и с самого s2 работает (405/200), ufw/iptables пусты. Это классическая блокировка IP диапазонов Telegram на уровне провайдера ДЦ s2.
- **Последствия:** не работали реакции (`message_reaction_count` updates не доходили), не работала привязка Telegram в профиле (бот не получал `/start link_<userId>`), `/start` в личке бота тоже игнорировался.
- **Решение:** reverse-proxy входящих webhook через mail сервер (193.37.68.73), тот же хост что уже проксирует исходящие через `tg-proxy.letar.best`. Новый поддомен `tg-in.letar.best` с Let's Encrypt сертификатом, nginx location `^/grandslamcup/[^/]+/?$` → `rewrite ^ /api/telegram/webhook break; proxy_pass https://grandslamcup.letar.best;`. Заголовок `X-Telegram-Bot-Api-Secret-Token` прокидывается прозрачно.
  - **Двойная защита:** (1) случайный 64-символьный hex-секрет в URL (path-based — без знания URL никто не попадёт в location, все остальные пути → 404); (2) `TELEGRAM_WEBHOOK_SECRET` в HTTP-заголовке, который handler проверяет через `validateSecret`.
  - `settings.action.ts`: `webhookUrl` теперь читается из `process.env.TELEGRAM_WEBHOOK_URL` (с фоллбэком на прямой `${siteUrl}/api/telegram/webhook` для локальной разработки).
  - `.env.docker` (и /sync-env на s2): добавлены `TELEGRAM_WEBHOOK_URL=https://tg-in.letar.best/grandslamcup/<64-hex>` и `TELEGRAM_WEBHOOK_SECRET=<random>`.
- **Инфра:** конфиг nginx добавлен в `/root/nginx-proxy-manager/data/nginx/custom/http.conf` на mail сервере. После деплоя нужно зайти в `/admin/settings` и нажать «Установить webhook» — Telegram получит новый URL и начнёт доставлять updates через reverse-proxy.

## [3.26.0] — 2026-04-10

### Added — Фаза 6 Группа C: Wizard интерфейс счетовода (задача 14)

**11-шаговый пошаговый workflow для скорера** — `apps/grandslamcup/src/app/match/[id]/score/_components/wizard/`. Счётовод видит только текущий шаг пайплайна, без перегруженного dashboard'а. Ключевое архитектурное решение: wizard state **вычисляемый** через `computeWizardStep(match, matchState)` — нет локальной state machine, любое SSE обновление автоматически переключает wizard на нужный шаг.

- **Schema migration `add_victory_poem`** — добавлено `Match.victoryPoemPlayerId` + relation `victoryPoemPlayer Player?`
- **Server actions** (`match-lifecycle.action.ts`, `jury.action.ts`):
  - `setFirstHalfStartTeamAction(matchId, side)` — сохранение результата жеребьёвки
  - `setVictoryPoemAction(matchId, playerId)` — сохранение победного стиха + финализация матча
  - `assignManualJudgeAction(matchId, name)` — ручное назначение судьи в слот (без QR)
- **11 step-компонентов** wizard:
  1. **START_MATCH** — большая кнопка + проверка составов
  2. **SELECT_JURY** — QR-код + 5 слотов с цветами + диалог ручного назначения
  3. **COIN_FLIP** — две карточки команд + кнопка жеребьёвки
  4. **PERFORMER_PICK** — ожидание тренера + fallback ручного выбора
  5. **TEXT_VOTING** / **DELIVERY_VOTING** — общий компонент `step-voting.tsx`: имя выступающего, таймер, `ScorerVoteInput` блоки 1-5, кнопка force-complete через 30 сек
  6. **PAIR_RESULTS** — разбор пары с отброшенными min/max + победитель
  7. **HALF_SUMMARY** — сводная таблица + топ-3
  8. **INTERMISSION** — перерыв с таймером
  9. **VICTORY_POEM** — выбор поэта команды-победителя
  10. **MATCH_FINISHED** — финальный счёт + MVP + ссылки
- **`WizardHeader`** — тонкая шапка с компактным счётом, текущим шагом, статусом SSE и кнопкой возврата в классический режим
- **`computeWizardStep.ts`** — чистая функция определения шага из состояния матча (testable)

**Стратегия отката:** `/match/[id]/score?token=xxx&mode=classic` → возврат к старому `scorer-client.tsx` (не трогался). Wizard по умолчанию. После стабилизации можно убрать query parameter.

**Что отложено (не в этой задаче):**

- Анимация coin flip — только CSS transition подсветки
- Keyboard shortcuts — отдельная задача
- Кнопка «Назад» — строгий forward-only workflow (подтверждён пользователем)
- Удаление legacy `scorer-client.tsx` — оставлен для `?mode=classic`

## [3.25.0] — 2026-04-10

### Added — Telegram интеграция допиливание

- **Telegram Mini App — нативный UX в `/match/[id]/audience`:**
  - Загрузка `telegram-web-app.js` через новый `audience/layout.tsx` (`Script strategy="beforeInteractive"`) — `window.Telegram.WebApp` теперь доступен даже при открытии страницы вне «webApp» кнопки.
  - Хук `useTelegramWebApp` расширен: возвращает `initData`, `telegramUserId`, `hapticImpact`, `hapticNotification`. Новый хук `useTelegramMainButton` управляет нативной MainButton Telegram (текст, видимость, прогресс, клик).
  - `audience-vote-form.tsx`: внутри Mini App используется большая нативная Telegram MainButton «Отправить оценку» (с прогресс-индикатором при отправке), вне Telegram — обычная HTML-кнопка. Каждый клик по оценке (1-5) даёт лёгкую тактильную отдачу `impactOccurred('light')`. Успех/ошибка отправки → `notificationOccurred('success'|'error')`.
- **HMAC-валидация Telegram initData (защита от накрутки):**
  - Новый модуль `lib/telegram/verify-init-data.ts`. Проверяет подлинность initData по официальной схеме Telegram (HMAC SHA-256 с secret key = `HMAC("WebAppData", botToken)`), плюс защита от replay через `auth_date < 24h`.
  - `submitAudienceVoteAction` принимает опциональный `telegramInitData`. При его наличии валидирует и привязывает голос к Telegram-userId через детерминированный `sessionToken = "tg:<userId>"` — один человек больше не может проголосовать дважды переоткрытием Mini App.
- **Привязка Telegram-аккаунта в `/profile`:**
  - Цепочка `/start link_<userId>` существовала только на стороне webhook — UI на сайте отсутствовал. Теперь:
  - `profile/_actions/telegram-link.action.ts`: `getTelegramLinkUrlAction` (получает username бота через `bot.api.getMe()` с in-memory кэшем, генерит `t.me/<bot>?start=link_<userId>`), `unlinkTelegramAction` (очищает `User.telegramChatId`).
  - Новый компонент `telegram-link-section.tsx` на странице `/profile` — кнопка «Привязать Telegram», статус «Привязан» с chatId, кнопка «Отвязать», «Я уже привязал» (refresh).
- **Аналитика реакций — новая страница `/admin/telegram`:**
  - Реакции подписчиков на сообщения бота (`TelegramReaction`) уже копились в БД через webhook (`message_reaction_count`), но UI отсутствовал.
  - Страница показывает 100 последних сообщений: дата, тип (с цветной меткой), матч (link на админку), эмодзи + счётчики реакций, всего реакций.
  - Сводка сверху: количество сообщений и суммарных реакций по каждому типу (анонс/результат/итог тайма/расписание/итоги тура/голосование).
  - Добавлен пункт «Telegram» (иконка LuSend) в `admin-sidebar.tsx`.

## [3.24.0] — 2026-04-10

### Added — Фаза 6, Группа B (UX счетовода / ведущего / тренера)

- **B7 — Кабинеты счетовода и ведущего в user-dropdown.** `/api/auth/me` теперь возвращает `isScorer`/`isPresenter` (проверяет есть ли хоть один `Match.scorerUserId`/`presenterUserId === user.id`). `UserMenu` показывает пункты «Кабинет счетовода» / «Кабинет ведущего» только для пользователей с назначениями.
  - Новые страницы `/my/scorer-matches` и `/my/presenter-matches` — списки матчей в секциях «🔴 Сейчас идёт» / «Предстоящие» / «Прошедшие», каждый матч ведёт в свой интерфейс (`/match/[id]/score` или `/match/[id]/presenter`).
  - Shared-компонент `my-matches-list.tsx` для переиспользования таблицы.

- **B8 — Полный ручной контроль счетовода.**
  - `forceCompleteVotingAction(matchId, dimension)` — завершает голосование с неполным жюри. Гибкий подсчёт: 5+ голосов → стандартный отброс min/max, 3-4 → отброс min/max, 1-2 → простая сумма, 0 → ошибка.
  - `updatePerformanceScoresAction(performanceId, dimension, scores)` — редактирование оценок уже завершённого выступления, пересчитывает adjusted + totalScore + общий счёт матча.
  - Кнопка «Завершить с неполным жюри» в `vote-panel.tsx` во время фаз голосования.
  - Новый диалог `score-editor-dialog.tsx` (✏ рядом с каждым выступлением в истории) — редактирование оценок блоками 1-5 по каждому судье для ТЕКСТА и ПОДАЧИ раздельно.

- **B9 — Быстрый ввод оценок блоками 1-5.** Новый компонент `scorer-vote-input.tsx`: 5 колонок (по одному судье), в каждой блоки 1-5 с цветом судьи (`JUDGE_COLORS`). Клик = оценка, вызывает существующий `enterManualVoteAction`. Колонка блокируется и становится полупрозрачной когда судья проголосовал через свой интерфейс. Показывается в `vote-panel.tsx` во время `TEXT_VOTING`/`DELIVERY_VOTING`.

- **B10 — Полноэкранный таймер ведущего.** Новый компонент `fullscreen-timer.tsx`: `position:fixed inset:0 bg:black`, цифры через `clamp(6rem, 30vw, 40rem)` — максимально заполняют ширину viewport, видно из зала. Обратный отсчёт 3:00 → 0:00 → «+» с красным цветом для превышения. Крупные кнопки старт/стоп/сброс (`size=2xl`). Кнопка «Таймер на весь экран» в `presenter-client.tsx`, выход по ESC или кнопке «Выйти». Вибрация на 2:30 и 3:00 сохранена.

- **B12 — Счетовод заявляет состав за команду.**
  - Новый server action `submitScorerLineupAction` в `match/[id]/score/_actions/scorer-lineup.action.ts`. Access control: `match.scorerUserId === currentUser.id || isAdmin`. В отличие от `submitMatchLineupAction` coach — **не проверяет** 6-часовое окно (счетовод работает во время матча).
  - Новый диалог `scorer-lineup-dialog.tsx` — чекбоксы из roster команды, 5-8 игроков, проверка отстранений.
  - В `scorer-client.tsx` секция «Составы команд» с двумя карточками (home/away). Статус: зелёный если состав заявлен, оранжевый если пустой. Кнопка «Заявить состав» / «Изменить состав».
  - `page.tsx` теперь загружает `roster` (полный активный состав через `playerTeamSeason`) для обеих команд в дополнение к существующим `lineups`.

- **B13 — EditTeamButton в кабинете тренера.** В `/coach/page.tsx` рядом с именем команды появилась кнопка «Редактировать команду» — видна только для `coach.role === 'COACH'` (не ASSISTANT_COACH). Показывает description команды под заголовком. Переиспользует существующий диалог `EditTeamButton` без изменений.

### Cancelled

- **B11 — «Ведущий работает без скорера»** — отменено. Скорер всегда присутствует на матче. Ведущий имеет узкоспециализированный интерфейс только для себя (таймер, жеребьёвка, отвод судей, подсказки залу). Улучшения интерфейса ведущего пойдут отдельной задачей, не через дублирование функционала скорера.

## [3.23.1] — 2026-04-10

### Fixed

- **Telegram-бот: «Network request for sendMessage failed!»** в админке `/admin/settings`. С РФ-хостинга s2 `api.telegram.org` нестабилен — все вызовы grammy `bot.api.*` падали на сетевом уровне (TypeError: fetch failed) до получения ответа от Telegram. Решение: проксируем через `tg-proxy.letar.best` (тот же прокси на mail сервере, что использует `apps/kami`).
  - `src/lib/telegram/bot.ts`: `new Bot(token, { client: { apiRoot } })` — grammy подставляет `apiRoot` вместо `https://api.telegram.org` для всех `bot.api.*` вызовов (sendMessage/sendPhoto/setWebhook и т.д.). Это автоматически чинит и `senders.ts`, и `senders-personal.ts`.
  - `src/app/admin/settings/_actions/settings.action.ts`: 3 прямых `fetch('https://api.telegram.org/...')` (setupTelegramWebhookAction, deleteTelegramWebhookAction, getWebhookInfoAction) заменены на `${TELEGRAM_API}/...` с фоллбэком на `https://api.telegram.org`.
  - `.env.docker`: добавлена `TELEGRAM_API_ROOT=https://tg-proxy.letar.best`. Без переменной поведение прежнее (прямой `api.telegram.org`) — для локальной разработки фикс прозрачен.

## [3.23.0] — 2026-04-10

### Fixed — Фаза 6, Группа A (критические production-баги)

- **Страница поэта в админке падает** (`/admin/players/[id]`): убрано `pendingUserId: true` из `include` — это скалярное поле, а не relation, Prisma ломался на runtime. Скаляр подгружается автоматически.
- **404 на кнопке «Редактировать матч»** в `/admin/matches`: ссылка вела на несуществующий `/admin/matches/[id]/edit`. Удалена из desktop- и mobile-вариантов таблицы. Редактирование матча остаётся через `EditScoresButton` на детальной странице.
- **Протокол матча `/match/[id]/protocol` крашился** в Next.js 16: Server Component не может иметь inline `onClick={() => window.print()}`. Кнопка печати вынесена в client-компонент `_components/print-button.tsx`. Добавлен `error.tsx` для будущей диагностики.
- **Модал «Карточка» в интерфейсе счетовода появлялся за пределами экрана**: использовалась устаревшая плоская структура `<DialogRoot><DialogContent>`. Переписано на корректный Chakra UI v3 compound: `Dialog.Root → Portal → Dialog.Backdrop → Dialog.Positioner → Dialog.Content`. Теперь модал центрируется даже на мобильном viewport.
- **Push-подписка: неинформативная ошибка «Не удалось подписаться»**: клиент игнорировал HTTP-статус ответов `/api/push/vapid-key` и `/api/push/subscribe`. Добавлены проверки `res.ok`, откат браузерной подписки при ошибке сервера, детальные сообщения в toaster. Серверный route обёрнут в try/catch, возвращает осмысленные 401/500 с текстом ошибки.
- **Статусы прошедших матчей показывались как «Запланирован»** (1 марта СПб): функция `getDisplayStatus` существовала в `lib/match-status.ts`, но **нигде не использовалась в UI** — везде рендерился сырой `match.status`. Заменено на `getDisplayStatus(match)` в 6 местах:
  - `admin/matches/_components/matches-client.tsx` (desktop + mobile таблицы)
  - `admin/matches/[id]/_components/match-hero-admin.tsx`
  - `(public)/matches/[id]/page.tsx`
  - `(public)/[citySlug]/matches/[id]/page.tsx`
  - `_components/match-card.tsx` (карточка на главной, в расписании, профиле команды)
  - `(public)/matches/[id]/opengraph-image.tsx` (OG-картинки теперь показывают «Прошёл» для несостоявшихся)
  - Таблица матчей в `coach/matches/page.tsx`

  Локальные дубли `STATUS_LABEL`/`STATUS_COLOR` в `matches-client.tsx` и `coach/matches/page.tsx` удалены в пользу общих `matchStatusLabels`/`matchStatusColors` из `match-status.ts` — теперь поддерживаются `CANCELLED` и `PAST_SCHEDULED`.

## [3.22.1] — 2026-04-10

### Fixed

- После логина через Ключницу пользователь возвращается на страницу, с которой нажал «Войти» (а не на главную). `signInWithLetarAuth()` без аргумента автоматически подставляет `window.location.pathname + search`, а страница `/sign-in` читает `?returnTo=` с фоллбэком на `/`. Кнопки «Войти» в `public-header.tsx` и `mobile-drawer.tsx` теперь работают корректно без изменений — дефолт хелпера срабатывает из текущего URL.

## [3.22.0] — 2026-04-10

### Added

- **Telegram-бот v2 — 8 новых фич:**
  - **Система цветов судей + очередь (F8):** 5 цветов (красный, синий, зелёный, жёлтый, фиолетовый), полноэкранный цвет на телефоне судьи, очередь ожидания 6+, автозамена при отводе, блокировка повторной регистрации отведённых
  - **Inline-кнопки (F1):** grammy InlineKeyboard вместо текстовых ссылок — "Подробнее", "Где играют", "Полный протокол"
  - **Автопубликация (F2):** 3 флага в настройках — автоанонс при заполнении составов, автоитог тайма, авторезультат
  - **Постер расписания (F4):** satori→PNG карточка с матчами недели, группировка по дням
  - **Итоги тура (F5):** автоопределение завершения всех матчей тура → пост с результатами, MVP, топ-3
  - **Telegram Mini App (F3):** WebApp кнопка "Голосовать" в Telegram при старте матча, хук useTelegramWebApp
  - **Личные сообщения тренерам (F6):** webhook для /start link\_{userId}, привязка Telegram, cron напоминания о составах
  - **Аналитика реакций (F7):** TelegramMessage/TelegramReaction модели, трекинг message_id, webhook для реакций

### Changed

- Отвод судьи теперь по цвету ("Отвести Красного!") вместо номера
- Панель жюри: цветные бейджи + секция очереди
- Прогресс голосования: цветные индикаторы

## [3.21.0] — 2026-04-10

### Added

- **Мобильная админка — карточки вместо таблиц (задача #32):**
  - 3 shared-компонента: `AdminResponsiveList`, `AdminCard`, `AdminActionsMenu`
  - 14 админских таблиц переведены на карточки для mobile (< md breakpoint)
  - Action-кнопки → выпадающее меню `⋮` на mobile
  - Шапка: «КБС Админ» на mobile, имя пользователя скрыто

### Fixed

- Overflow search/filter баров на Teams и Players (`minW="200px"` → `minW="0"`)
- Dropdown фильтры: `w="200px"` → `w={{ base: '100%', sm: '200px' }}`
- Кнопки в шапке Moderation: HStack → Flex wrap

## [3.20.0] — 2026-04-10

### Added

- **Перекрёстная таблица (head-to-head matrix):**
  - Матрица результатов всех матчей между командами лиги на странице standings
  - Цветовая индикация: зелёный (победа), красный (поражение), серый (ничья)
  - Sticky первый столбец с названиями команд, горизонтальный скролл на мобиле
  - Клик по ячейке → переход на страницу матча
  - Переключатель "Таблица / Перекрёстная" (SegmentGroup) с сохранением в URL (?view=cross)
  - Работает на обеих standings страницах (глобальная и городская)

- **Аналитика судейства (post-match):**
  - Секция "Статистика судейства" на странице завершённого матча
  - Per-judge таблица: ср. балл, мин, макс, σ (std dev), отклонение от среднего (%)
  - Подсветка выбросов: σ < 0.3 (одинаковые оценки всем) или σ > 1.5 (хаотичные)
  - "Спорные выступления" — разброс 3+ баллов между судьями
  - Группировка по таймам (отдельное жюри для каждого тайма)

## [3.19.0] — 2026-04-10

### Improved (Real-time скоринг — полировка)

- **Audience votes → SSE push:** зрительские голоса транслируются через SSE на проектор в реальном времени (вместо polling), виджет "Мнение зала" на live-display
- **Server-side judge timeout:** голоса судей после 45 сек отклоняются сервером (клиентский таймаут 30 сек остаётся как UI warning)
- **Анимации на проекторе:** flash-эффект (scale + brightness) при обновлении счёта, плавные transitions между фазами
- **Coach → Scorer сигналы:** кнопка "Запросить паузу" у тренера, toast-уведомление у скорера через SSE event `coach:signal`
- **3 новых SSE event types:** `audience:voted`, `coach:signal`, `vote:timeout`

## [3.18.0] — 2026-04-10

### Added

- **Модерация заявок "Это я" — улучшенный UI (#10):**
  - Диалог подтверждения при одобрении/отклонении с аватаркой поэта и данными пользователя
  - Поле причины отказа (необязательное) при отклонении
  - Текстовые метки на кнопках "Принять" на desktop

- **График динамики баллов (#11):**
  - Линейный график recharts на профиле поэта (между stat-cards и лучшими выступлениями)
  - Скользящее среднее (3 матча) пунктирной линией
  - Tooltip с деталями: матч, текст/подача/итого, среднее
  - Референ-линия средней за все матчи

- **Таблица истории соперников (#11):**
  - Группировка по оппонентам: кол-во встреч, W/D/L, средний балл vs соперника
  - Сортировка по количеству встреч

- **Push-уведомления о матчах (#20):**
  - Модель `PushSubscription` в schema.zmodel + миграция
  - API: `POST /api/push/subscribe`, `DELETE /api/push/subscribe`, `GET /api/push/vapid-key`
  - Cron endpoint: `GET /api/push/match-reminder` — push о матчах на завтра
  - `src/lib/push-notifications.ts` — web-push обёртка (sendPushToAll, sendPushToUser)
  - Кнопка подписки `PushSubscribeButton` в хедере (только для авторизованных)

- **Постеры для Telegram (#24):**
  - `src/lib/telegram/poster/` — генерация PNG через satori + sharp
  - Постер анонса: команды, VS, дата, стадион, градиентный фон
  - Постер результата: счёт, цветовая индикация победителя, MVP
  - `sendMatchAnnouncement` и `sendMatchResult` автоматически отправляют `sendPhoto` с постером

## [3.17.0] — 2026-04-09

### Added

- **Товарищеские матчи — workflow «Тренер → Соперник → Админ»:**
  - Новый enum `FriendlyRequestStatus` (CHALLENGE_SENT → ACCEPTED → APPROVED)
  - Тренер-соперник теперь принимает/отклоняет вызов перед модерацией админа
  - Поля `respondedById`, `respondedAt`, `declineReason` в FriendlyMatchRequest
  - Секция «Входящие вызовы» в кабинете тренера с кнопками «Принять» / «Отклонить»
  - Диалог отклонения с причиной отказа (необязательно)
  - Админ видит только принятые соперником заявки (статус ACCEPTED)
  - Обновлённые фильтры модерации: CHALLENGE_SENT, ACCEPTED, DECLINED, APPROVED, REJECTED

## [3.16.0] — 2026-04-09

### Refactored (Глубокий рефакторинг)

**Type Safety:**

- `isUserAdmin()` / `getUserRoles()` хелпер — убраны 4 unsafe каста сессии
- `parseSocialLinks()` — типобезопасный парсинг JSON, убраны 9 кастов
- `adminGuard()` wrapper — убран бойлерплейт из 79 server actions (20 файлов, -280 строк)

**Дедупликация global/city страниц:**

- `StandingsContent` — общий компонент, standings pages 366+389 → 280 shared (-475 строк)
- `PlayerRatingTable` — unified с `showDetailedStats` проп, 195+234 → 1 (-155 строк)
- `NewsContent` — общий компонент, news pages 108+118 → 100 shared (-37 строк)

**Decomposition оставшихся файлов:**

- `admin/matches/[id]/page.tsx` 681 → 364 (+hero, performances-table, compute-match-data)
- `coach/roster/roster-client.tsx` 425 → 235 (+EditPlayerCoachDialog)
- `[citySlug]/page.tsx` 462 → 210 (+city-upcoming-matches, city-recent-results, city-mini-standings)

## [3.15.0] — 2026-04-09

### Refactored (DRY)

- **STATUS_MAP** → `lib/match-status.ts` (4 файла → 1)
- **ActionResult** → `lib/types.ts` (7 action-файлов → 1 shared тип с conditional generic)
- **EmptyState** → `_components/empty-state.tsx` (12 файлов → 1 компонент)
- **DataTableWrapper** → `_components/data-table-wrapper.tsx` (11 файлов → 1 компонент)
- **Prisma includes** → `lib/prisma-includes.ts` (15 файлов: MATCH_TEAMS_NAME, MATCH_TEAMS_NAME_SLUG)

## [3.14.1] — 2026-04-09

### Refactored (Декомпозиция)

- **lib/telegram.ts** (699 строк) → `lib/telegram/` директория (11 файлов: bot, format, helpers, match-data, messages/\*, senders, index)
- **roster-admin-client.tsx** (774 строк) → 4 файла + 2 shared компонента (`IsPlayingToggle`, `RemovePlayerDialog` используются и в admin, и в coach)
- **scorer.action.ts** (515 строк) → 5 файлов по доменам (lifecycle, voting, rounds, cards, jury) + barrel re-export
- **public-header.tsx** (517 строк) → `_components/header/` (6 файлов: nav-config, desktop-nav, mobile-drawer, user-menu, use-user-meta, index)
- **players/[slug]/page.tsx** (635 строк) → 6 компонентов + `_lib/compute-player-stats.ts` (тестируемая чистая функция)
- **matches/[id]/page.tsx** (569 строк) → 3 компонента (lineups, mvp-card, half-results)
- Все barrel re-exports сохраняют обратную совместимость импортов

## [3.14.0] — 2026-04-09

### Added (Задача 24 — Telegram-бот)

- **Модель TelegramConfig** — глобальные настройки бота (токен, вкл/выкл) в БД
- **City.telegramChatId** — у каждого города свой Telegram-канал
- **lib/telegram.ts** — клиент grammY + 5 типов сообщений:
  - Анонс матча (афиша с составами, ведущий, счетовод, ссылки на профили)
  - Промежуточный итог тайма (баллы, лучший игрок)
  - Финальный результат (счёт по таймам, MVP, карточки)
  - Еженедельное расписание ("Матчи на этой неделе")
  - Утреннее напоминание ("Матч сегодня")
- **Товарищеские матчи** — другой заголовок "⚽ Товарищеский матч"
- **Дебютанты** — метка 🆕 для поэтов, выступающих впервые
- **/admin/settings** — страница настроек Telegram (токен, тест, вкл/выкл)
- **Пункт "Настройки"** в навигации админки (LuSettings)
- **telegramChatId** в форму редактирования города
- **Кнопки публикации** на странице матча в админке:
  - "Анонс в Telegram" (SCHEDULED/LIVE)
  - "Итог тайма" (LIVE, выбор 1/2 тайм)
  - "Результат в Telegram" (FINISHED)
- **API routes для cron**:
  - `/api/telegram/weekly` — еженедельное расписание (понедельник 10:00)
  - `/api/telegram/today` — напоминание о матчах (ежедневно 09:00)

## [3.13.0] — 2026-04-09

### Added (Задача 25 — PWA оффлайн-счетовод)

- **PWA Manifest** (`manifest.ts`) — приложение устанавливается как PWA
- **Service Worker** (Serwist) — precache app shell, Background Sync для Chromium
- **IndexedDB store** (`lib/offline/scorer-offline-store.ts`) — хранение snapshot матча + очередь операций
- **Sync Queue** (`lib/offline/scorer-sync-queue.ts`) — очередь с Background Sync (Chromium) + fallback для Safari
- **Sync API** (`/api/match/[id]/sync`) — batch endpoint для синхронизации оффлайн-операций
- **Offline Status Bar** в скорере — онлайн/оффлайн badge, pending count, кнопка "Синхронизировать", предзагрузка
- **Автосинк** — автоматическая синхронизация при восстановлении связи
- **Build**: `--webpack` для Serwist (Turbopack не поддерживает SW)

### Changed

- Обновлена документация `.claude/docs/pwa-offline.md` — добавлены актуальные best practices 2026

## [3.12.0] — 2026-04-09

### Added (Задача 25 — ревизия пайплайна матча)

- **Админка матчей**: фильтры по городу и статусу (dropdown-ы), увеличен лимит до 100 матчей
- **Ручное редактирование оценок**: кнопка карандаш в `/admin/matches/[id]` → inline-edit 5 оценок × текст/подача → автопересчёт adjusted/total
- **Ручное редактирование счёта**: action `updateMatchScoreAction` для ручной корректировки итога матча
- **Ведущий — жеребьёвка**: кнопка "Подбросить" → случайный выбор первой команды, SSE broadcast `coin:flipped`
- **Ведущий — toggle отвода судьи**: переключатель разрешения/запрета отвода, одобрение запроса тренера
- **Судья — изменение голоса**: кнопка "Изменить оценку" после голосования, upsert вместо create (можно менять до подсчёта)
- **Судья — cookie-блокировка**: fingerprint проверка блокирует повторную регистрацию в том же тайме
- **Проектор — экран перерыва**: автоматически при IDLE без выступления → "Перерыв" + ссылки для донатов + "Оставить подарок на баре"

## [3.11.0] — 2026-04-09

### Changed (Задача 25 — ревизия интерфейса тренера)

- **Без лимита игроков**: убран MAX_PLAYERS = 8, теперь минимум 5 без верхнего предела
- **Расширенные статусы**: доступен / играл в 1-м тайме / играл в обоих / замена
- **Группировка**: основной состав отдельно от запасных, подсказка "Ещё не выступали"
- **Счётчик замен**: badge "Замены: 0/2" во 2-м тайме, лимит 2 замены запасными
- **Отвод судьи**: кнопка в интерфейсе тренера → запрос ведущему через SSE
- **SSE расширение**: `judgeRecusalAllowed` в MatchLiveState, `sessionId` для судей
- Визуальные улучшения: затемнение выбывших, цветовая индикация готовности

## [3.10.0] — 2026-04-09

### Added (Задача 15 — реестр дисквалифицированных поэтов)

- **Модель**: поле `untilEndOfSeason` в `PlayerSuspension` для сезонных дисквалификаций
- **Страница `/admin/suspensions`** — управление дисциплиной: список, создание, деактивация отстранений
- **Диалог создания**: поиск поэта, выбор сезона, причина (плагиат, красная, жёлтые)
- **Кнопка «Плагиат»** в деталях матча `/admin/matches/[id]` — обнуление оценок до минимальных (все 1) + дисквалификация до конца сезона
- **Страница деталей матча** `/admin/matches/[id]` — таблица выступлений с оценками, карточками, кнопкой дисквалификации
- **Пункт «Дисциплина»** в sidebar админки
- **Публичная страница**: причина «Чтение чужих стихов» (PLAGIARISM), отображение «До конца сезона»
- **Lineup validation**: текст «дисквалифицирован до конца сезона» для сезонных бана

### Fixed

- Все ESLint warnings и errors во всём проекте (curly, no-explicit-any, no-unused-vars, no-console, no-img-element)

## [3.9.0] — 2026-04-09

### Added (Задача 35 — привязка поэт↔пользователь из админки)

- **Страница модерации заявок** (`/admin/moderation/claims`) — одобрение/отклонение заявок "Это я" (pendingUserId)
- **Блок привязки на странице поэта** (`/admin/players/[id]`) — привязать по email, отвязать, одобрить/отклонить pending
- **Блок привязки на странице пользователя** (`/admin/users/[id]`) — поиск поэта по имени (debounce), привязка/отвязка
- **Кнопка "Привязка профилей"** на странице модерации с badge-счётчиком pending заявок
- Server actions: `approveClaimAction`, `rejectClaimAction`, `searchUnlinkedPlayersAction`, `linkPlayerToUserByIdAction`

## [3.4.0] — 2026-04-08

### Changed (Группа I — фотографии)

- **Лимит загрузки** увеличен до 15 МБ (было 5-10 МБ) во всех endpoints
- **Серверный ресайз** через sharp — изображения автоматически уменьшаются до 1920px
- **Аватары поэтов** — кроп 400x400 на сервере (center crop)
- **Клиентский кроп** для аватаров — `react-easy-crop` (круглый, aspect 1:1, zoom 1-3x)
- `EntityPhotoUploader` интегрирован с кроп-диалогом (для player), прямая загрузка для venue

## [3.3.0] — 2026-04-08

### Added (Группа H — личный кабинет поэта)

- **Кабинет поэта** (`/poet`) — полноценный раздел для авторизованных поэтов
  - `requirePoet()` / `requirePoetAction()` в `lib/roles.ts`
  - Layout с sidebar (Дашборд, Мои стихи, Профиль)
  - Дашборд: моя команда, статистика выступлений, ближайшие матчи, последние стихи
  - Профиль: редактирование bio, фото, социальных ссылок + ссылка на Ключницу
- **Стихотворения** — модель Poem (title, slug, text, coverImage, published)
  - CRUD: создание, редактирование, удаление с подтверждением
  - `/poet/poems` — список с badges статуса (Опубликовано / Черновик)
  - `/poet/poems/create` — форма создания
  - `/poet/poems/[id]/edit` — форма редактирования
- **Публичные страницы стихов**
  - `/[citySlug]/players/[slug]/poems/[poemSlug]` — текст стиха с обложкой и SEO
  - Секция "Стихи" на профиле поэта (ссылки на опубликованные)

## [3.2.0] — 2026-04-08

### Added (Группа E — кабинет тренера)

- **Заявка состава на матч** (`/coach/matches/[id]/lineup`)
  - Выбор 5-8 игроков чекбоксами, роли, счётчик, предзаполнение если заявка уже подана
  - Предупреждения: < 6 часов (disabled), < 24 часов (жёлтое)
- **CTA "Заявить состав"** на дашборде тренера — кнопка на карточках матчей без заявки
- **Создание матча организатором** (`/admin/matches/create`)
  - Форма: тип (REGULAR/FRIENDLY), команды, сезон/тур, площадка, дата
  - Фильтрация команд по сезону, автоопределение лиги
  - Server action `createMatchAction()` с Zod-валидацией
  - Кнопка "Создать матч" на странице матчей в админке

## [3.1.0] — 2026-04-08

### Added (Группа D — кликабельность и навигация)

- **TopLoader** — красный прогресс-бар при навигации (`@letar/ui`)
- **loading.tsx** — спиннеры для `/match`, `/profile`, `/sign-in`
- **LIVE матчи** — отдельная секция "Сейчас идёт" в расписании (featured карточки, не попадают в "прошедшие")
- **Кликабельные имена** — аудит и исправление:
  - Кабинет тренера: имена игроков → ссылки на профили, "Показать всех" вместо обрезки
  - Roster: имена в таблице → ссылки
  - Публичная страница матча: MVP, поэты, составы → ссылки на профили

## [3.0.0] — 2026-04-08

### Added (Группа C — расширенная статистика)

- **Профиль поэта** — расширенная статистика
  - Карточки (🟡🔴) за текущий сезон в hero-секции
  - "Тридцатки" — кол-во максимальных баллов (30)
  - Процент побед в раундах (N/M, X%)
  - Среднее время выступления (M:SS)
  - Метка "Дебют" для первого выступления
- **Таблица рейтинга поэтов** — расширена
  - Новые колонки: "Всего" (суммарный балл) и "Лучший" (макс. за выступление)
  - Сортировка по суммарному баллу (вместо среднего)
  - Подсветка тридцатки жёлтым цветом
- **Страница команды** — карточки за сезон
  - Badge жёлтых/красных карточек
  - Предупреждение при приближении к лимиту дисквалификации (5 жёлтых)
- **Кабинет тренера** — блок статистики
  - W/D/L запись и очки из Standings
  - Средний балл команды за сезон
  - Топ-3 перформера (мин. 3 выступления)

## [2.9.0] — 2026-04-08

### Changed (Группа B — рефакторинг ролей)

- **Рефакторинг PlayerRole** — удалены PLAYING_COACH и PRODUCER из enum
  - Новая модель: PLAYER, COACH, ASSISTANT_COACH + поле `isPlaying: Boolean` на PlayerTeamSeason
  - Единый маппинг `lib/player-role-labels.ts` — `getRoleLabel(role, isPlaying)`, `getRoleColor(role)`
  - Обновлены 15 файлов: admin, coach, public, API endpoints
- **Scorer/Presenter на матче** — добавлены `scorerUserId`, `presenterUserId` на модели Match (для отображения в афише)

### Added

- **Кнопки редактирования на публичных страницах**
  - `EditPlayerButton` — расширен для тренеров/замов (prop `canEdit` с серверной проверкой)
  - `EditTeamButton` — новый компонент на странице команды (admin + тренер/зам)
  - API `/api/teams/update-profile` — обновление описания и ссылок команды
  - `lib/edit-permissions.ts` — серверные проверки `canEditPlayer()`, `canEditTeam()`
- **Кнопка "Это я"** на профиле поэта — заявка на привязку с модерацией (pendingUserId)
  - API `/api/players/claim-profile` — создаёт pending заявку (не мгновенная привязка)
  - Подтверждение: тренер/организатор/админ через модерацию

## [2.8.0] — 2026-04-08

### Fixed (Группа A — фидбек от пользователей)

- **Баг 1:** Тренер теперь может редактировать профили всех игроков команды, даже с привязанной учёткой
- **Баг 2:** `ASSISTANT_COACH` отображается как "Зам. тренера" — единый маппинг `lib/player-role-labels.ts`
- **Баг 5:** Команды из другого города → redirect на правильный URL (вместо 404)
- **Баг 6:** Отступ логотипа от шапки на мобиле (responsive `pt`)
- **Баг 7:** Прошедшие матчи в SCHEDULED → псевдостатус "Прошёл (нет результатов)" через `lib/match-status.ts`

### Added

- Enum `CANCELLED` в MatchStatus
- Утилита `lib/match-status.ts` — `getDisplayStatus()`, `isMatchPast()`, `isMatchUpcoming()`
- Утилита `lib/player-role-labels.ts` — `getRoleLabel()`, `playerRoleLabels`
- Nx target `update-sw-version` в project.json

## [2.7.1] — 2026-04-08

### Fixed

- **PWA иконки** — сгенерированы icon-192.png, icon-512.png и maskable варианты из logo.svg (были 404)
- **Service Worker** — добавлен nx target `update-sw-version`, sw.js генерируется из sw.template.js при сборке
- **Error boundaries** — добавлены error.tsx для `/match` и `/profile` (раньше ошибки в этих роутах не перехватывались)
- **Server Actions обработка ошибок** — добавлен try/catch в 28 функций (10 файлов): donate, photos, news, stages, ratings, coach, coach-match, presenter, update-profile, bracket

## [2.7.0] — 2026-04-08

### Fixed

- **Мобильная доступность админки и кабинета тренера**
  - 17 таблиц: `overflowX="auto"` — горизонтальный скролл вместо обрезки контента
  - Matches: 7 мелких ссылок → выпадающее меню `Menu.Root`, колонка "Площадка" скрыта на мобиле
  - Roster admin: убраны фиксированные ширины колонок (w="180px" → minW="140px")
  - Touch targets: кнопки edit/delete увеличены до 44×44px (WCAG 2.1 AA)
  - Moderation: скрытие Роль/Подал/Дата на мобиле (8→5 колонок)
  - Layouts: padding `p={6}` → `p={{ base: 3, md: 6 }}`
  - Диалоги: responsive `maxW={{ base: "calc(100vw - 32px)", sm: "lg" }}`
  - Формы: Telegram/VK поля стекаются на мобиле
  - Dark theme: `border.muted`/`border.subtle` gray.800→gray.700 (видимые рамки полей ввода)

## [2.6.0] — 2026-04-05

### Added

- **Управление пользователями** — админ-панель
  - Страница `/admin/users` — список всех зарегистрированных пользователей
  - Поиск по имени и email (клиентская фильтрация)
  - Отображение ролей (ADMIN, Поэт) и назначенных городов в виде бейджей
  - Страница `/admin/users/[id]` — детальный просмотр и управление
  - Назначение/снятие роли ADMIN (с защитой от самодемотирования)
  - Назначение организатора города (CityOrganizer) через NativeSelect
  - Удаление назначения организатора с подтверждением
  - Пункт "Пользователи" в сайдбаре админки (иконка LuShieldCheck)

## [2.5.0] — 2026-04-05

### Added

- **Товарищеские матчи** — полная поддержка
  - Enum `MatchType` (REGULAR, FRIENDLY) + поле `matchType` на модели Match
  - `tourId` и `leagueId` теперь опциональны (товарищеские не привязаны к туру)
  - `seasonId` — прямая привязка товарищеских матчей к сезону
  - Бейдж "Товарищеский" (purple) на MatchCard
  - Товарищеские матчи не влияют на таблицу standings
  - Расписание показывает товарищеские в отдельной группе
  - Миграция `add_match_type_and_friendly_support`

### Fixed

- **Ближайшие матчи** — добавлен фильтр по дате (`scheduledAt >= now`)
  - Прошедшие матчи в статусе SCHEDULED больше не отображаются как "ближайшие"

## [2.4.0] — 2026-04-05

### Added

- **Загрузка фото** — команды, поэты, стадионы
  - `lib/upload/` — утилиты (saveFileToDisk, validateFile, generateFilename) по паттерну driving-school
  - API `/api/upload/team-logo` — загрузка логотипа команды (ADMIN + Coach)
  - API `/api/upload/entity-photo` — универсальный upload для player/venue (ADMIN + Coach для игроков)
  - `TeamLogoUploader` — клиентский компонент (dashed border, overlay, hover)
  - `EntityPhotoUploader` — универсальный компонент загрузки фото
  - Admin: uploaders в формах редактирования команд и стадионов
  - Coach: team logo на дашборде, фото игроков в roster (миниатюра 36px с upload)
  - Публичные карточки команд: logo вместо Circle-инициала (с fallback)

## [2.3.0] — 2026-04-05

### Changed

- **Редизайн публичных страниц** — визуальная идентичность и полиш
  - Расширена тема: 4 новых keyframe-анимации (`slideInLeft`, `scaleIn`, `shimmer`, `glowPulse`), 5 stagger-классов
  - **Hero-блок города**: dot pattern overlay, второй декоративный круг (accent), увеличенные размеры (5xl заголовок, lg кнопки), staggered fade-in, badge активного сезона
  - **Таблица standings**: тёмные заголовки с brand-полоской, zebra striping, hover-эффект на строках, медали (🥇🥈🥉), green left border для лидера, bold brand-цвет очков
  - **MatchCard**: hover lift (-2px + lg shadow), увеличенный счёт (2xl-3xl), gradient top border для LIVE + glow пульсация, иконки даты/venue, ▸/◂ индикаторы победителя, `featured` вариант для ближайшего матча
  - **Header**: высота 14→16, pill badge city selector с ChevronDown, active nav → bottom underline вместо bg, shadow-sm
  - **Footer**: 3 колонки (лого+описание / навигация / социальные), тёмный bg (gray.900), gradient top border, кнопки-pills для Telegram/Поддержать
  - **SectionHeading** — новый компонент с brand-полоской слева
  - **Landing (city selector)**: dot pattern, третий декоративный круг (accent)
  - **Empty state**: Circle с иконкой, кнопка "Расписание"

## [2.1.1] — 2026-04-04

### Added

- Социальные ссылки в профилях игроков
- Chakra Tooltip для интерактивных элементов

### Changed

- Скрыта навигация на главной странице

## [2.1.0] — 2026-04-04

### Добавлено

- **Swiss Bracket визуализация** — дерево W-L путей команд (CS2 Major стиль)
  - `src/lib/swiss-bracket.ts` — логика вычисления W-L записей из матчей, группировка по раундам
  - Автоматическое определение раундов по количеству сыгранных игр каждой команды
  - **Desktop (lg+):** CSS Grid 5 колонок × 10 строк + SVG L-коннекторы (winner зелёный, loser красный пунктир)
  - **Mobile (base-md):** Tabs по раундам + вертикальный список W-L групп
  - Компоненты: `SwissBracket`, `SwissBracketDesktop`, `SwissBracketMobile`, `SwissGroupCard`, `SwissMatchCard`
  - W-L группы с цветовой индикацией (зелёный → серый → красный)
  - Бейджи "В плей-офф" (3W) и "Вылет" (3L) для терминальных узлов
  - Фиксированная раскладка 16 команд (`SWISS_16_LAYOUT`, `SWISS_16_CONNECTORS`)
  - Карточки матчей: компактный формат "Команда1 259:255 Команда2", кликабельные
  - Сводка: "В плей-офф: N/8, Вылетели: N/8"

### Изменено

- **Страница bracket** — автоматический выбор Swiss vs DE
  - SWISS сезон без BracketSlot → SwissBracket
  - Есть BracketSlot → TournamentBracket (DE)
  - Оба → Swiss сверху + DE снизу
- **Redirect `/[citySlug]/bracket`** — приоритет SWISS сезонов с матчами
- Обновлены обе страницы bracket: city-filtered и global

## [2.0.0] — 2026-04-04

### Добавлено

- **City-Based Routing** — разделение контента по городам (СПб, Москва)
  - Корневая `/` — страница выбора города (splash с карточками)
  - `[citySlug]/layout.tsx` — валидация города, CityProvider context
  - `[citySlug]/page.tsx` — главная города с матчами и таблицей
  - Все страницы перенесены под `/[citySlug]/`: standings, schedule, teams, players, venues, matches, bracket
  - Глобальные страницы без города: `/news`, `/rules`, `/donate`
  - `src/lib/city.ts` — кэшированные хелперы `getCityBySlug`, `getCities`
  - `CityProvider` React context для client-компонентов
  - Header и Footer city-aware (парсят citySlug из pathname)
  - Все запросы фильтруются по `cityId`
  - SeasonSelector показывает только сезоны текущего города

### Изменено

- **BREAKING:** Все публичные URL теперь включают город (`/spb/standings`, `/moscow/teams`)
- `PublicHeader` — разделение на city-scoped и global навигацию
- `PublicFooter` — вынесен в отдельный client-компонент
- `MatchCard` — опциональный `citySlug` prop для city-aware ссылок

## [1.9.0] — 2026-04-03

### Добавлено

- **Tournament Bracket UI** — визуализация турнирной сетки Double Elimination
  - **Desktop (lg+):** CSS Grid layout + SVG коннекторы между матчами
  - **Mobile (base-md):** SegmentGroup (Верхняя/Нижняя/Финал) + round tabs + вертикальный список
  - Компоненты: `TournamentBracket`, `BracketMatchCard`, `BracketSectionDesktop`, `BracketMobile`, `BracketConnectors`
  - 4 визуальных состояния карточки: TBD (dashed), SCHEDULED, LIVE (pulsing), FINISHED (winner green)
  - L-образные SVG-коннекторы с измерением DOM-позиций через `useBracketPositions`
  - Клик на матч → переход к деталям
  - Cross-section drops отображаются текстовыми бейджами (→ LB R4 #1)
  - Публичный action `getBracketDataAction` с расширенными includes (homeTeam/awayTeam)
  - Переписаны обе страницы: публичная `/bracket/[seasonSlug]` и admin `/admin/seasons/[id]/bracket`

## [1.7.0] — 2026-04-03

### Добавлено

- **Mobile UX аудит** (Фаза 4.6)
  - Hamburger menu для публичной навигации: кнопка-гамбургер → Drawer с 9 пунктами, иконки, touch-friendly (48px min height)
  - Drawer навигация для админки: гамбургер в `AdminHeader` (видна на `base`, скрыта на `md`), 12 пунктов навигации с иконками
  - Drawer навигация для кабинета тренера: гамбургер в `CoachHeader`, 4 пункта навигации
  - Admin sidebar скрыт на мобильных (`display: none` на `base`)
  - Touch targets увеличены: icon-кнопки в таблицах (cities, venues, teams, seasons, news, donate) получили `minW/minH="44px"` (WCAG)
  - `loading.tsx` для public (Spinner) и coach (Skeleton)
  - `error.tsx` для кабинета тренера

### Изменено

- `PublicHeader`: мобильная строка ссылок заменена на Drawer
- `AdminHeader`: добавлена кнопка-гамбургер для мобильных
- `AdminSidebar`: `display={{ base: 'none', md: 'block' }}`
- `CoachHeader`: добавлена кнопка-гамбургер для мобильных
- `CoachSidebar`: экспортирован `coachNavItems` для переиспользования в drawer

## [1.6.0] — 2026-04-03

### Добавлено

- **Карточки в live scoring** (Фаза 3.7)
  - Server action `issueCardAction`: выдача жёлтой/красной с валидацией по правилам формата
  - Автоматическая красная при 2 жёлтых за матч (Москва/SWISS)
  - Создание `PlayerSuspension` при красной карточке
  - Дисквалификация команды при 5 жёлтых за сезон (СПб/ROUND_ROBIN)
  - SSE event `card:issued` для real-time уведомлений
  - `CardDialog` — UI для скорера: выбор типа, причины, комментарий, результат с предупреждениями
  - Кнопка карточки в истории выступлений vote-panel
- **Автопродвижение в сетке DE** (Фаза 3.8)
  - `bracket-advance.ts`: `advanceWinner()` — победитель → следующий слот, проигравший → нижняя сетка
  - Автосоздание матча когда оба источника слота заполнены
  - Hook в `finishMatchAction()` для автоматического продвижения
  - Фикс `generatePlayoffBracketAction`: резолвинг sourceSlot1Id/sourceSlot2Id/loserGoesToId
- **Swiss standings** (Фаза 3.9)
  - W-L формат таблицы для SWISS сезонов (вместо И/В/Н/П/О)
  - Колонки: W (зелёный), L (красный), Заб, Разн (+/-)
  - Badge "Швейцарская система" для визуального отличия
  - Сортировка по W desc, затем по разнице очков

## [1.5.0] — 2026-04-03

### Добавлено

- **Seed v2 — миграция из Telegram** (замена устаревшего Tilda-seed)
  - Скрипт `scripts/migrate/seed-v2.ts`: полная перезагрузка БД из `spb-clean.json` + `moscow-clean.json`
  - 2 города (СПб + Москва), 5 сезонов (СПб С1/С2/С3 + Москва С1/С2)
  - 97 площадок с адресами, 46 команд, 1136 игроков
  - 99 матчей с результатами (из 142, остальные без пары команд)
  - Восстановление пар команд из ростеров (для матчей без home/away)
  - 6 лиг (включая ВЛ + 1Л для СПб С2)
  - 2335 PlayerTeamSeason привязок из ростеров
  - 50 Standings записей (пересчёт из матчей)
  - Обогащение профилей игроков из bio (Telegram-экстракция)
  - Москва С2 — формат SWISS

### Изменено

- БД полностью перезагружена из Telegram-данных (вместо Tilda HTML)

## [1.4.0] — 2026-04-03

### Добавлено

- **Миграция данных с Tilda** — итерация 1 (СПб Сезон 1 + Сезон 2)
  - Краулер `scripts/migrate/crawl.ts`: скачивание HTML страниц с grandslamcup.ru
  - Экстрактор `scripts/migrate/extract.ts`: парсинг расписания, перекрёстных таблиц, составов команд, результатов С1, индивидуальных зачётов поэтов
  - Seed `scripts/migrate/seed.ts`: загрузка в PostgreSQL через pg pool (raw SQL, идемпотентный)
  - Nx target `migrate:seed` для запуска миграции
  - **Загружено:** 1 город, 30 стадионов, 2 сезона, 3 лиги, 23 команды, 29 TeamSeason, 83 матча (45 С1 + 38 С2)
  - Типы данных `scripts/migrate/types.ts`

### Известные ограничения

- Игроки не загружены (парсинг составов требует доработки для одно-словных имён)
- 3 матча С2 пропущены из-за несовпадения регистра в названиях команд
- Москва и подробные данные по раундам — ожидают данных от организатора
- Адреса стадионов отсутствуют (на Tilda только названия)

## [1.3.0] — 2026-04-03

### Добавлено

- **Новостная лента** — обзоры матчей и новости турнира
  - Модель `NewsPost`: markdown контент, обложка, связь с матчем, публикация
  - Admin CRUD: `/admin/news` — создание/редактирование/удаление новостей
  - Markdown-редактор в админке с автогенерацией slug
  - Публичная лента `/news` — карточки с обложкой, excerpt, датой
  - Детальная `/news/[slug]` — markdown рендеринг через react-markdown + remark-gfm
  - Связанные матчи: badge "Обзор: Команда А — Команда Б" со ссылкой
- **Донаты** — ссылки на внешние сервисы поддержки
  - Модель `DonateLink`: название, URL, описание, порядок, active
  - Admin CRUD: `/admin/donate` — управление ссылками
  - Публичная `/donate` — карточки со ссылками на Boosty, перевод на карту и т.д.
- **PWA** — Progressive Web App
  - TypeScript manifest (`src/app/manifest.ts`)
  - Service Worker (`public/sw.template.js`): Network First + offline fallback
  - Прекеширование: главная, таблицы, расписание, команды, новости, правила
  - Кеширование фото матчей (`/api/files/*`)
  - Version injection через `scripts/update-sw-version.mjs`
  - Страница `/offline` — при отсутствии сети
  - `ServiceWorkerRegistration` компонент в layout
- Пункты "Новости" и "Поддержать" в публичной навигации
- Пункты "Новости" и "Донаты" в admin sidebar

### Изменено

- Модель `Match`: relation `newsPosts`
- Модель `User`: relation `newsPosts`
- Public header: 2 новых пункта навигации
- Admin sidebar: 2 новых пункта
- Root layout: ServiceWorkerRegistration

## [1.2.0] — 2026-04-03

### Добавлено

- **Универсальная турнирная модель** — поддержка Round-Robin (СПб) и Швейцарской системы + DE плей-офф (Москва)
  - Enum `TournamentFormat` (ROUND_ROBIN, SWISS)
  - Enum `StageType` (GROUP, PLAYOFF_UPPER, PLAYOFF_LOWER, GRAND_FINAL)
  - Настройки формата в Season: `format`, `maxSubstitutions`, `drawAllowed`, `homeVenuesEnabled`, `showLiveScore`
- **Швейцарская система** (`lib/swiss.ts`)
  - Генерация пар по W-L записи с проверкой повторов
  - Поддержка bye (проход без боя при нечётном числе)
  - Action `generateSwissRoundAction` — автоматическая генерация раунда
- **Double Elimination плей-офф** (`lib/bracket.ts`)
  - Генерация полной DE-сетки на 16 команд
  - Верхняя сетка (WB R1-R4), нижняя (LB R1-R7), гранд-финал
  - Модели `Stage` и `BracketSlot` с self-references для навигации
- **Обновлённая система карточек** (`lib/cards.ts`)
  - Новые причины: PERFORMANCE, UNSANCTIONED_DISS, INSULT, AGGRESSION
  - 2 жёлтых за матч = красная (Москва)
  - 5 жёлтых за сезон: пропуск матча (Москва) или дисквалификация (СПб)
  - Модель `PlayerSuspension` для отстранений
- **Заместитель тренера** — роль `ASSISTANT_COACH` в PlayerRole
- **Тай-брейк** — поле `hasTiebreak` в Match (11-я пара при ничьей)
- **Админка этапов** (`/admin/seasons/[id]/stages`)
  - Создание этапов для швейцарки
  - Генерация раундов швейцарки
  - Генерация сетки DE плей-офф
- **Визуализация сетки** (`/admin/seasons/[id]/bracket`)
  - Верхняя/нижняя сетка по раундам
  - Команды, результаты, статусы матчей
- **Публичная сетка** (`/bracket/[seasonSlug]`)
  - Визуализация для зрителей

### Изменено

- Season: 6 новых полей настройки формата
- Match: поле `hasTiebreak`
- Round: связь со `Stage` (nullable, обратная совместимость)
- CardReason: 4 новых причины
- PlayerRole: `ASSISTANT_COACH`
- `requireCoach()`: поддержка ASSISTANT_COACH

## [1.1.0] — 2026-04-03

### Добавлено

- **Фотографии матчей** — загрузка, галерея, lightbox
  - Модель `MatchPhoto`: path, caption, order, uploadedBy
  - API `/api/upload` — загрузка с drag & drop (FormData, max 10MB)
  - API `/api/files/[...path]` — сервинг из `uploads/` с кэшированием
  - Компонент `PhotoUploader` — drag & drop, множественная загрузка, preview, подписи
  - Компонент `PhotoGallery` — responsive сетка + lightbox (навигация, удаление)
  - Админ: `/admin/matches/[id]/photos` — загрузка + управление (удаление, подписи)
  - Тренер: `/coach/matches/[id]/photos` — загрузка фото к матчам своей команды
  - Публичная страница матча: секция "Фото" с галереей
  - Ссылка "Фото" в админской таблице матчей

### Изменено

- Модель `Match`: relation `photos MatchPhoto[]`
- Модель `User`: relation `uploadedPhotos MatchPhoto[]`
- Enum `ImageCategory` добавлен (MATCH, TEAM, PLAYER, VENUE, OTHER)
- Публичная страница матча: загрузка и отображение фото

## [1.0.0] — 2026-04-03

### Добавлено

- **Управление составом тренером** — тренер может добавлять/убирать игроков через кабинет
  - Кнопка "Добавить игрока" → форма с именем, городом, контактами, ролью
  - Кнопка "Убрать" → мгновенное удаление из активного состава (soft delete)
  - Заявки на добавление нового игрока → модерация организатором
  - Счётчик заявок "на модерации" в странице состава
- **Трансферы** — запрос перехода игрока из другой команды
  - Трансферное окно: toggle в настройках сезона (админ)
  - Поиск игроков из других команд (только при открытом окне)
  - Подача заявки на трансфер с комментарием → модерация
  - Проверка дубликатов заявок
  - Страница `/coach/transfers` — статус окна, поиск, список заявок
- **Админ-модерация** (`/admin/moderation`) — единая страница заявок
  - Таблица: тип, игрок, команда, роль, подавший, статус, дата
  - Фильтры: ожидающие / одобренные / отклонённые / все
  - Одобрение: автосоздание Player + PlayerTeamSeason (новый игрок) или Transfer + обновление членства (трансфер)
  - Отклонение: обязательный комментарий
  - Автогенерация slug при создании нового игрока
- Пункт "Заявки" в admin sidebar
- Пункт "Трансферы" в coach sidebar
- API: `/api/coach/applications`, `/api/coach/available-players`

### Изменено

- Модель `Season`: поле `transferWindowOpen Boolean`
- Новые enum: `ApplicationStatus`, `RosterAppType`
- Новая модель: `RosterApplication` (заявки на состав/трансфер)
- Relations: User, Player, TeamSeason → RosterApplication
- Страница состава тренера: кнопки управления + badge заявок
- Настройки сезона: toggle трансферного окна с Badge статуса

## [0.9.0] — 2026-04-03

### Добавлено

- **Личный зачёт поэтов** — расширенные рейтинги с фильтрами
  - Фильтры по сезону, городу, команде на `/players`
  - Минимум 3 выступления для рейтинга, медали топ-3
  - Средний балл за текст и подачу отдельно
  - Профиль поэта: тренд, лучшие выступления, статистика по сезонам
  - Admin: кнопка пересчёта `PlayerRating` в сезонах
- **Экран проектора** (`/match/[id]/live`) — полноэкранный дисплей для зала
  - Тёмный фон, крупный шрифт, SSE (role=public), fullscreen по клику
  - Текущая пара, фаза голосования, реалтайм счёт
- **Зрительское голосование** (`/match/[id]/audience`) — народное жюри
  - Модель `AudienceVote` (текст 1-5, подача 1-5, не влияет на результат)
  - Mobile-first UI с кнопками голосования
  - API `/api/match/[id]/audience-stats` для статистики зала
- **Защита от повторных судей** — cookie fingerprint (30 дней)
  - Поле `fingerprint` в `JudgeSession`
  - Предупреждение скореру при дублировании устройства
  - Admin → Аналитика: статистика судей, повторные устройства, разброс оценок
- **Протокол матча** (`/match/[id]/protocol`) — print-friendly страница
  - Раунды, составы, MVP, подписи. Ctrl+P → PDF
- **iCal-экспорт** (`/api/schedule/ical`) — .ics файл с расписанием
  - Фильтры по сезону и команде
  - Кнопка "Добавить в календарь" на `/schedule`

### Изменено

- Модель `JudgeSession`: поле `fingerprint String?`
- Модель `AudienceVote`: новая модель + relations в Match и PlayerPerformance
- Admin sidebar: пункт "Аналитика"
- Admin matches: ссылки "Проектор" и "Протокол"

## [0.8.0] — 2026-04-03

### Добавлено

- **Кабинет тренера** (`/coach`) — дашборд с профилем команды, составом, ближайшими матчами
  - Авторизация через OIDC: User → Player → PlayerTeamSeason (COACH/PLAYING_COACH)
  - Страница состава `/coach/roster` — полный список игроков команды
  - Страница матчей `/coach/matches` — история и статус заявок
  - Server actions: обновление профиля, подача заявки на матч (5-8 игроков, мин за 6 часов)
- **Экран тренера на матче** (`/match/[id]/coach?token=xxx`) — mobile-first управление
  - Token-based auth (как скорер/ведущий) — `homeCoachToken` / `awayCoachToken`
  - SSE подписка для обновлений счёта в реальном времени
  - Список игроков с цветовыми статусами и кнопкой "Выпустить"
  - Замены во 2-м тайме (макс 2)
  - Read-only счёт и результаты раундов
- **Страницы стадионов** (`/venues`) — список площадок + Яндекс.Карты
  - Карта с маркерами всех стадионов, автоцентрирование
  - Карточки стадионов с городом, адресом, домашними командами
  - Детальная страница `/venues/[slug]` — описание, карта, домашние команды, последние матчи
  - Yandex Maps JS API v3 (client component с lazy loading)
- Ссылки на скорер/ведущий/тренер в админской таблице матчей
- Навигация "Стадионы" в публичном header

### Изменено

- Модель `Match`: добавлены `homeCoachToken`, `awayCoachToken` (String, unique, auto-cuid)
- SSE endpoint: валидация coach-токена
- `use-match-sse.ts`: роль `'coach'` в union type
- `roles.ts`: `requireCoach()`, `requireCoachAction()`, `CoachContext` type

## [0.7.1] — 2026-04-03

### Добавлено

- **OG-карточка матча** (`opengraph-image.tsx`) — динамически генерируемое изображение 1200x630
  - Счёт матча (крупный моноширинный шрифт)
  - Названия команд
  - MVP матча с баллами (жёлтый акцент)
  - Стадион и дата
  - Статус (ЗАВЕРШЁН / LIVE / ЗАПЛАНИРОВАН)
  - Брендинг Grand Slam Cup
- OG metadata для страниц матчей, команд и поэтов (title, description, openGraph)
- При вставке ссылки в Telegram/VK — красивый превью с результатом

## [0.7.0] — 2026-04-03

### Добавлено

- **Публичная часть сайта** — 8 страниц с полной навигацией
  - Главная `/` — герой-блок, ближайшие матчи, таблица активного сезона (топ-5), последние результаты
  - Таблица `/standings` — турнирная таблица с расчётом на лету из матчей, фильтр по сезону, группировка по лигам
  - Расписание `/schedule` — список матчей по турам, фильтр по сезону
  - Матч `/matches/[id]` — статус, счёт, результаты поэт-по-поэту (текст/подача/итого), составы, MVP матча
  - Команды `/teams` — карточки с названием, городом, стадионом, лигой
  - Команда `/teams/[slug]` — профиль, статистика (И/В/Н/П/очки), состав, календарь матчей
  - Поэты `/players` — рейтинг по среднему баллу (матчей, средний, лучший)
  - Поэт `/players/[slug]` — био, статистика, таблица всех выступлений, история команд
- **Route group `(public)`** — общий layout с навигацией и футером
- **PublicHeader** — навигация: Главная, Таблица, Расписание, Команды, Поэты (responsive, sticky)
- **MatchCard** — переиспользуемая карточка матча (главная, расписание, профиль команды)
- **MVP матча** — `findMatchMVP()` в `scoring.ts`, показывается на странице завершённого матча
- Metadata для всех публичных страниц (SEO)

### Изменено

- Старая заглушка `page.tsx` удалена, заменена полноценной главной в route group `(public)`

## [0.6.0] — 2026-04-03

### Добавлено

- **Экран ведущего `/match/[id]/presenter`** — mobile-first UI для управления матчем со сцены
  - Компактный счёт матча (команды, тайм, раунд)
  - Управление голосованием: "▶ Голосуем за ТЕКСТ" → "▶ Голосуем за ПОДАЧУ" → "→ Следующий поэт"
  - Отображение результатов с именными оценками судей для озвучивания
  - Прогресс голосования: "Анна ✓, Дмитрий ✓, ожидание: Олег..."
- **Таймер выступления (3 минуты)** — синхронизирован через SSE между ведущим и скорером
  - Цветовая индикация: зелёный → жёлтый (2:30) → красный (3:00)
  - Вибрация телефона: короткая на 2:30, длинная на 3:00
  - Сохранение `durationSec` в `PlayerPerformance`
  - Read-only отображение на экране скорера
- **Отмена голосования** — ведущий может отменить текущее голосование
  - Удаление голосов из БД, откат фазы (TEXT_VOTING → IDLE, DELIVERY_VOTING → TEXT_COMPLETE)
  - Автоматический сброс экранов судей через SSE
- **Таймаут судей** — визуальная подсветка на экранах ведущего и скорера
  - Если судья не голосует >30 секунд → красная подсветка + иконка часов
- Новые SSE события: `timer:started`, `timer:stopped`, `timer:reset`, `voting:cancelled`
- `TimerState` и `votingOpenedAt` в in-memory состоянии матча

### Изменено

- `broadcastState` теперь передаёт `timer` и `votingOpenedAt` клиентам
- `broadcastState` экспортирован из `scorer.action.ts` — переиспользуется в `judge.action.ts` и `presenter.action.ts`
- VoteButtons на экране судьи используют `key` с `votingOpenedAt` для сброса после отмены
- JuryPanel скорера показывает таймаут неголосовавших судей

## [0.5.0] — 2026-04-03

### Добавлено

- **Live Match Scoring Phase 1 (MVP)** — замена Google Таблиц для судейства матчей
- SSE инфраструктура: `match-sse-manager.ts`, `match-state.ts`, `/api/match/[id]/sse` endpoint, `use-match-sse` хук
- Алгоритм подсчёта: `scoring.ts` — drop max/min, sum 3 middle (0-15 per dimension, max 30)
- 2 новые модели БД: `JudgeSession`, `JudgeVote` + enum `VoteDimension`
- Экран скорера (`/match/[id]/score`): QR-регистрация жюри, управление раундами, голосование, результаты
- Экран судьи (`/match/[id]/judge`): регистрация по QR, кнопки 1-5 (mobile-first), ожидание между голосованиями
- Voting state machine: IDLE → TEXT_VOTING → TEXT_COMPLETE → DELIVERY_VOTING → DELIVERY_COMPLETE → ROUND_COMPLETE
- Зависимость `qrcode.react` для QR-рендеринга

## [0.4.0] — 2026-04-03

### Изменено

- Формы переписаны на декларативный `<Form>` API из `@letar/forms`
- Списки переписаны на TanStack Query (`useQuery` + `invalidateQueries`)
- ZenStack form plugin: `@form.*` директивы генерируют Zod схемы с `.meta({ ui })`
- API роуты для админки: GET `/api/admin/{cities,venues,seasons,teams}`
- Справочники (города, площадки) загружаются через `useQuery` в формах
- `onFieldChange` для автогенерации slug из кириллицы при создании
- `transliterate.ts` вынесен в отдельную утилиту
- Подключены `@letar/query-provider` и `@letar/forms`

## [0.3.0] — 2026-04-02

### Добавлено

- Админ-панель с sidebar навигацией и дашбордом статистики
- lib/roles.ts: хелперы isAdmin, requireAdmin, requireAdminAction
- CRUD городов: список, создание, редактирование, удаление
- CRUD площадок: список, создание, редактирование, удаление + привязка к городу
- CRUD сезонов: список, создание, редактирование + лиги внутри сезона
- CRUD команд: список, создание, редактирование, удаление + привязка к стадиону
- Списки поэтов и матчей (read-only)
- Компонент DeleteDialog с подтверждением удаления
- Автогенерация slug из кириллицы (транслитерация)
- Error boundary + loading skeleton для админки

## [0.2.0] — 2026-04-02

### Добавлено

- Полная доменная модель данных (schema.zmodel):
  - Справочники: City, Venue, CityOrganizer
  - Турнирная структура: Season, League, Round, Tour
  - Участники: Team, Player, TeamSeason, PlayerTeamSeason, Transfer
  - Матчи и результаты: Match, MatchLineup, PlayerPerformance, Card
  - Кэшированные данные: Standings, PlayerRating
- 7 новых enum'ов: SeasonStatus, MatchStatus, LineupStatus, PlayerRole, CardType, CardReason, HalfStartTeam
- Роли организатора и тренера через доменные модели (не через UserRole) — один человек может быть организатором, тренером и игроком одновременно
- Токены доступа для скорера/ведущего (доступ по ссылке без регистрации)
- Access control: публичный read, admin CRUD
- Int[] массивы для оценок жюри (PostgreSQL native arrays)

## [0.1.0] — 2026-04-02

### Добавлено

- Инициализация проекта Next.js 16 + Chakra UI v3
- Авторизация через Ключницу (auth.letar.best) по OIDC
- PostgreSQL + ZenStack с минимальной схемой (User, Account, Session, Verification)
- Тема с поддержкой тёмной/светлой темы (brand: красный #FF0000, accent: синий #0051FF)
- Favicon из SVG логотипа
- Umami аналитика
- Страница входа через Ключницу
- Заглушка главной страницы
- Регистрация в инфраструктуре деплоя (s2, deploy-affected.sh, dashboard seed)
