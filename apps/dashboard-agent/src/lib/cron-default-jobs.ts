/**
 * Дефолтный каталог cron-задач dashboard-agent (данные, без логики).
 * Логика загрузки/мержа/сохранения — в `cron-config.ts`.
 */

import type { CronJob } from './cron-types'

/**
 * Дефолтные задачи для ВСЕХ серверов
 * Фильтруются по текущему серверу при загрузке
 *
 * ⚠️ `schedule` здесь — только НАЧАЛЬНОЕ значение при первом создании задачи (когда её ещё нет
 * в `cron-jobs.json`). После этого расписание живёт исключительно в UI дашборда
 * (`PATCH /api/cron/jobs/:id`), правка `schedule` здесь на уже существующую задачу на прод НЕ
 * доедет — `loadAllCronJobs()` ниже сознательно не сверяет это поле (решение владельца,
 * 2026-09-03, PLAN-INFRA.md §56: синхронизация создавала риск тихого отката осознанных
 * прод-правок через UI — см. инцидент с `s2-database-backup` ниже). Меняешь `schedule` тут —
 * это документация «как было заведено изначально», не команда на прод; реальный сдвиг делай
 * через UI.
 */
export const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: 'nginx-backup-s2',
    name: 'Nginx Backup S2',
    app: 'dashboard-agent',
    endpoint: '/api/nginx/backup',
    schedule: '0 3 * * *',
    description: 'Автоматический бэкап Nginx Proxy Manager на s2 (data + SSL сертификаты)',
    enabled: true,
    server: 's2',
  },
  {
    id: 's2-database-backup',
    name: 'Database Backup (s2)',
    app: 'dashboard-agent',
    endpoint: '/api/database/backup',
    // ⚠️ `0 4`, а не `0 2`: до 2026-08-07 здесь стояло `0 2 * * *`, но на проде задача давно
    // выполняется в 4:00 — расписание сдвинули через API/UI, а обратно в git оно не попало
    // (`0 4 * * *` не встречается ни в одном коммите). Код разъезжался с фактом минимум с
    // 2026-07-10 и вводил в заблуждение всех, кто его читал. Приведено к реальному значению.
    // Разъезд возможен потому, что merge при старте не синхронизирует `schedule` — PLAN-INFRA.md §56.
    // В 3:00 идут бэкап nginx и чистка логов, в 3:30 — acme-dns, так что 4:00 разводит их по времени.
    schedule: '0 4 * * *',
    description: 'Автоматический бэкап всех БД на s2 из APP_CONFIG (см. database.ts)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'driving-school-cleanup-api-logs',
    name: 'API Logs Cleanup',
    app: 'driving-school',
    endpoint: '/api/cron/cleanup-api-logs',
    schedule: '0 3 * * *',
    description: 'Удаление API логов старше 30 дней',
    enabled: true,
  },
  {
    id: 'time-notifications',
    name: 'Milestone Notifications (time)',
    app: 'time',
    endpoint: '/api/cron/notifications',
    // Собственный комментарий эндпоинта: «Вызывается cron-задачей каждую минуту» — уведомления
    // о вехах (month/week/day/hour/5min) требуют минутной гранулярности для '5min'-подписки.
    schedule: '* * * * *',
    description: 'Отправка уведомлений о приближении вех обратного отсчёта подписчикам',
    enabled: true,
    server: 's2',
  },
  {
    id: 'svoichuzhie-cleanup',
    name: 'Stale Order Cleanup (svoichuzhie)',
    app: 'svoichuzhie',
    endpoint: '/api/cron/cleanup',
    // Порог зависания — 2 часа (route.ts: STALE_HOURS), часовой прогон достаточен.
    schedule: '0 * * * *',
    description: 'Отмена PENDING заказов мерча старше 2 часов и восстановление стока',
    enabled: true,
    server: 's2',
  },
  {
    id: 'driving-school-reminders',
    name: 'Reminders (driving-school)',
    app: 'driving-school',
    endpoint: '/api/cron/reminders',
    description:
      'Правила напоминаний: истекающие документы, просроченные платежи, неактивные ученики, предстоящий экзамен, занятие завтра',
    schedule: '0 * * * *',
    enabled: true,
    server: 's2',
  },
  {
    id: 'dsperevod-email-health-check',
    name: 'Email Health Check (dsperevod)',
    app: 'dsperevod',
    endpoint: '/api/cron/email-health-check',
    schedule: '0 */6 * * *',
    description: 'Проверка SMTP-транспорта (Яндекс) — уведомления менеджеру о заявках зависят от него',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-approve-referrals',
    name: 'Approve Referrals (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/approve-referrals',
    // Мигрирован со старого паттерна (внешний crontab, "Authorization: Bearer") на
    // verifyCronSecret() — раньше расписание 0 3 * * * жило только в комментарии
    // .env.docker.example, не факт, что crontab был когда-либо реально настроен на сервере.
    schedule: '0 3 * * *',
    description: 'Переводит реферальные earnings из PENDING в APPROVED по истечении pendingUntil',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-birthday-promo',
    name: 'Birthday Promo (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/birthday-promo',
    schedule: '0 8 * * *',
    description: 'Промокод на скидку клиентам, у которых день рождения через 14 дней (PLAN.md §8)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-abandoned-cart',
    name: 'Abandoned Cart (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/abandoned-cart',
    // Порог брошенности — 24 часа (lib/abandoned-cart.ts), часовой прогон ловит корзину
    // почти сразу как она пересекает порог, дедуп через Cart.abandonedEmailSentAt.
    schedule: '0 * * * *',
    description: 'Письмо клиентам с непустой корзиной, не тронутой 24 часа (§R.3 PLAN_MARKETING.md)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-review-request',
    name: 'Review Request (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/review-request',
    // Порог — 3 дня после deliveredAt (lib/review-request.ts), суточный прогон достаточен.
    schedule: '0 9 * * *',
    description: 'Письмо с просьбой оставить отзыв через 3 дня после доставки (§R.1 PLAN_MARKETING.md)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-activation-reminder',
    name: 'Activation Reminder (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/activation-reminder',
    // Должно прийти раньше посылки, пока ожидание на пике (lib/activation-reminder.ts) —
    // часовой прогон, как у abandoned-cart, не суточный.
    schedule: '0 * * * *',
    description: 'Письмо «как активировать постер» сразу после отгрузки (§R.2 PLAN_MARKETING.md)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'email-canary-check',
    name: 'Email Canary Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/email-canary-check',
    // Раз в час, а не каждые 15 минут. Прежняя частота давала 96 писем в сутки в оба ящика —
    // избыточно для проверки «ходит ли почта вообще», и сама по себе спам-признак: одинаковые
    // письма каждые 15 минут. Порог алерта снижен с 3 до 2, поэтому время до уведомления
    // выросло не в 4 раза, а с 45 минут до 2 часов — для этого класса аварий приемлемо (§62).
    schedule: '0 * * * *',
    description:
      'Канареечный round-trip доставки email (Этап 0.7): SMTP-отправка через canary@letar.best + IMAP-проверка внутренней и внешней ноги',
    enabled: true,
    server: 's2',
    // Дефолтный DEFAULT_TIMEOUT_MS (60с) короче собственного бюджета проверки: internal/external
    // ноги идут параллельно, каждая ждёт письмо до 105с (waitForCanaryMessage: POLL_TIMEOUT_MS 90с +
    // hard deadline 15с — см. apps/dashboard-agent/src/lib/email-canary.ts). Раннер обрывал HTTP-запрос
    // раньше, чем проверка успевала закончиться сама, и это выглядело как провал ("This operation
    // was aborted"), хотя внутри письмо могло дойти вовремя. 130с — 105с ноги + запас на отправку
    // письма и сетевые издержки.
    timeoutMs: 130_000,
  },
  {
    id: 'domwellbes-email-canary-check',
    name: 'Email Canary Check (domwellbes)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/domwellbes-email-canary-check',
    // Смещено на :15, чтобы не бить одновременно с общей email-canary-check (:00) — разные
    // ноги проверки, но обе идут через один и тот же mail.letar.best.
    schedule: '15 * * * *',
    description: 'Канареечный round-trip доставки email domwellbes (найдено при разборе жалобы на логин '
      + '05.09.2026): отправка через РЕАЛЬНЫЙ SMTP-аккаунт приложения (noreply@domwellbes.ru) на служебный '
      + 'ящик canary-domwellbes@letar.best + IMAP-проверка получения — lib/domwellbes-email-canary.ts',
    enabled: true,
    server: 's2',
    // Тот же бюджет, что у email-canary-check: одна нога вместо двух, но тот же waitForCanaryMessage
    // (POLL_TIMEOUT_MS 90с + hard deadline 15с) — берём с тем же запасом.
    timeoutMs: 130_000,
  },
  {
    id: 'maddy-backup-freshness-check',
    name: 'Maddy Backup Freshness Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/backup-freshness-check',
    schedule: '0 */6 * * *',
    description:
      'Проверка свежести бэкапа Maddy (Этап 0.3): алерт BACKUP_FAILED, если самый новый maddy_*.tar.gz в /home/deploy/letar/backups/maddy старше 30ч — урок инцидента 2026-07-28 (26 дней простоя незамеченными)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'acme-dns-backup-s2',
    name: 'acme-dns Backup S2',
    app: 'dashboard-agent',
    endpoint: '/api/acme-dns/backup',
    schedule: '30 3 * * *',
    description:
      'Бэкап acme-dns на s2 (база выданных поддоменов + файл аккаунтов lego). От сервиса зависит продление ВСЕХ сертификатов зоны, а файл аккаунтов невосстановим — PLAN-INFRA.md §48',
    enabled: true,
    server: 's2',
  },
  {
    id: 'acme-dns-backup-freshness-check',
    name: 'acme-dns Backup Freshness Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/acme-dns-backup-freshness-check',
    schedule: '15 */6 * * *',
    description:
      'Проверка свежести бэкапа acme-dns (§48): алерт BACKUP_FAILED, если самый новый acme-dns_*.tar.gz старше 30ч. Сам бэкап делает агент, но молчаливый отказ tar/прав на файл аккаунтов выглядел бы как «всё хорошо» до ближайшего продления сертификата',
    enabled: true,
    server: 's2',
  },
  {
    id: 'traefik-backup-s3',
    name: 'Traefik Secrets Backup S3',
    app: 'dashboard-agent',
    endpoint: '/api/traefik/backup',
    schedule: '45 3 * * *',
    description:
      'Бэкап секретов Traefik на s3 (три per-name аккаунта acme-dns + acme.json + basicAuth). Заведён после переезда s3 на Traefik: до него на s3 действительно нечего было бэкапить, теперь там лежит невосстановимое — PLAN-INFRA.md §48 M2',
    enabled: true,
    server: 's3',
  },
  {
    id: 'traefik-backup-freshness-check',
    name: 'Traefik Backup Freshness Check (s3)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/traefik-backup-freshness-check',
    schedule: '30 */6 * * *',
    description:
      'Проверка свежести бэкапа Traefik на s3: алерт BACKUP_FAILED, если самый новый traefik_*.tar.gz старше 30ч. Отдельно от acme-dns-проверки — другой сервер, и свежий архив на s2 не должен закрывать отсутствие архива на s3',
    enabled: true,
    server: 's3',
  },
  {
    id: 'account-issuer-null-check',
    name: 'Account.issuer NULL Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/account-issuer-check',
    schedule: '0 4 * * *',
    description: 'Ежедневная проверка NULL-регрессии Account.issuer (better-auth 1.7, PLAN.md §71 п.3.2): '
      + 'алерт AUTH_ACCOUNT_ISSUER_NULL, если в БД любого из приложений с моделью Account найдена '
      + 'хотя бы одна строка с issuer = NULL — sign-up/reset-password для такого аккаунта вернёт 500',
    enabled: true,
    server: 's2',
  },
  {
    id: 'login-canary-check',
    name: 'Login Canary Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/login-canary-check',
    // Раз в 30 минут — вход ломается резче, чем NULL накапливается: не суточный, но и не
    // ежеминутный, чтобы не создавать реальные сессии канареечным аккаунтам слишком часто.
    schedule: '*/30 * * * *',
    description: 'Синтетическая проверка входа (PLAN.md §71 п.3.3): POST /api/auth/sign-in/email '
      + 'канареечными учётными данными на каждое приложение с credential-входом. Ловит любую поломку '
      + 'входа (не только NULL issuer) — рассинхрон OAuth-клиента, истёкший секрет, сломанный '
      + 'password-хеш, частичный сид',
    enabled: true,
    server: 's2',
  },
  {
    id: 'health-check',
    name: 'Health Check (CPU/память/диск/контейнеры/БД)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/health-check',
    schedule: '*/5 * * * *',
    description:
      'Проверка порогов CPU/память/диск (по умолчанию 90%), Docker-контейнеров (down/restarting) и доступности БД — алерты CPU_HIGH/MEMORY_HIGH/DISK_HIGH/CONTAINER_DOWN/CONTAINER_RESTARTED/DATABASE_DOWN (Backlog «Алерты при превышении порогов», P2, эти типы существовали в DashboardAlertType с самого начала, но никогда не вызывались)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'docker-prune',
    name: 'Docker Prune (dangling-образы + builder-кэш)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/docker-prune',
    schedule: '0 4 * * *',
    description:
      'Ежедневная безопасная чистка Docker: `pruneImages` без `-a` удаляет только dangling-образы (осиротевшие слои после того, как `deploy-affected.sh` переставил тег `:latest`/`:staging` на новый билд), `pruneBuilder` без фильтров — только неиспользуемый build-кэш. Не трогает ничего, на что есть тег или ссылка контейнера — SHA-теги для отката (последние 3, retention в deploy-affected.sh) не задевает. Без этой задачи dangling-слои копились неограниченно: диск s2 дошёл до 91% (см. `health-check.ts` — DISK_HIGH дедуп по mount вместо fs).',
    enabled: true,
    server: 's2',
  },
  {
    id: 'next-cache-cleanup-s2',
    name: 'Next.js Build Cache Cleanup (s2)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/next-cache-cleanup',
    schedule: '30 4 * * *',
    description: 'Удаляет `apps/<app>/.next/cache` в чекауте репозитория для приложений, не пересобиравшихся '
      + '≥2 дня (NEXT_CACHE_CLEANUP_DAYS, по BUILD_ID/mtime `.next`) — Next.js документирует этот каталог как '
      + 'безопасный к удалению в любой момент, следующий `next build` пересоберёт его с нуля. Отдельно от '
      + '`docker-prune` (тот чистит Docker build cache, это — host-чекаут): замер s2 2026-08-28 показал ~34GB '
      + 'суммарно по всем приложениям, часть не трогалась месяцами (выведенные из эксплуатации приложения).',
    enabled: true,
    server: 's2',
  },
  {
    id: 'next-cache-cleanup-s3',
    name: 'Next.js Build Cache Cleanup (s3)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/next-cache-cleanup',
    schedule: '30 4 * * *',
    description: 'То же самое, что next-cache-cleanup-s2, но для staging-чекаута на s3 — deploy-affected.sh '
      + '--staging тоже пересобирает `.next` при каждом staging-деплое.',
    enabled: true,
    server: 's3',
  },
  {
    id: 'nx-cache-cleanup-s2',
    name: 'Nx Cache Cleanup (s2)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/nx-cache-cleanup',
    schedule: '40 4 * * *',
    description: 'Удаляет записи `.nx/cache/<hash>` в чекауте репозитория старше NX_CACHE_CLEANUP_DAYS '
      + '(mtime, по умолчанию 2 дня) — отдельный от `.next/cache` источник места. Найдено при разборе '
      + 'инцидента 2026-09-06 (диск s2 100%): `.nx/cache` занимал 64GB, больше, чем Docker images и build '
      + 'cache вместе взятые, и для него не было ни разовой, ни плановой чистки вовсе.',
    enabled: true,
    server: 's2',
  },
  {
    id: 'nx-cache-cleanup-s3',
    name: 'Nx Cache Cleanup (s3)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/nx-cache-cleanup',
    schedule: '40 4 * * *',
    description: 'То же самое, что nx-cache-cleanup-s2, но для staging-чекаута на s3.',
    enabled: true,
    server: 's3',
  },
  {
    id: 'staging-idle-shutdown',
    name: 'Staging Idle Shutdown (s3)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/staging-idle-shutdown',
    schedule: '20 * * * *',
    description: 'Гасит staging-контейнеры (app+db), не пересоздававшиеся ≥24ч (STAGING_IDLE_SHUTDOWN_HOURS) — деплой '
      + 'пересоздаёт только `app`, возраст его контейнера ≈ время последнего использования (деплой всегда идёт '
      + 'перед e2e). `docker stop`, не `rm` — volume остаётся, следующий деплой просто стартует контейнер заново. '
      + 'До 16 постоянных staging-инстансов на s3 держали ~6.5Gi RSS месяцами без пользы — см. '
      + '.claude/docs/s3-staging-host-memory-pressure.md',
    enabled: true,
    server: 's3',
  },
  {
    id: 'log-scan',
    name: 'Log Scan (сканирование логов контейнеров на ошибки)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/log-scan',
    schedule: '*/10 * * * *',
    description:
      'Сканирует хвост логов запущенных контейнеров на строки с ошибками (error/exception/fatal/panic и т.п.), алертит CRON_FAILED по новым находкам с курсором per-контейнер, чтобы не повторять уже виденные строки (Backlog «Улучшения сбора метрик»)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-deliver-crm-reminders',
    name: 'CRM Reminder Delivery (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/deliver-crm-reminders',
    schedule: '*/5 * * * *',
    description: 'Клейм и доставка due-напоминаний менеджеров в постоянный in-app inbox (ROADMAP_M7.md, задача №41)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-deliver-project-message-notifications',
    name: 'Project Message Notification Delivery (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/deliver-project-message-notifications',
    schedule: '*/5 * * * *',
    description:
      'Клейм и email-доставка уведомлений клиенту о новых CLIENT_VISIBLE сообщениях чата проекта (ROADMAP_M8.md §M8B.2)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-poll-rfq-email-replies',
    name: 'RFQ Email Reply Poll (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/poll-rfq-email-replies',
    schedule: '*/5 * * * *',
    description:
      'IMAP-поллинг технического ящика rfq@domwellbes.ru — приём ответов перевозчиков на запросы цены (PLAN_LOGISTICS_L9_L11.md §12.4)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-expire-rfqs',
    name: 'RFQ Expiry (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/expire-rfqs',
    schedule: '0 * * * *',
    description: 'Автозакрытие просроченных запросов ставок перевозчикам (PLAN_LOGISTICS_L9_L11.md §12.8, волна L10)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-expire-project-changes',
    name: 'Project Change Expiry (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/expire-project-changes',
    schedule: '0 * * * *',
    description:
      'Эскалация просроченных допсоглашений (client не ответил до responseDueAt) — снимает CHANGE_HOLD (ROADMAP_M8.md §M8B.1)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-release-unpaid-orders',
    name: 'Unpaid Order Reservation Release (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/release-unpaid-orders',
    schedule: '0 * * * *',
    description: 'Снятие резерва склада с неоплаченных розничных заказов по таймауту (PLAN_SHOP_RETAIL.md §3.7, R3)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-cleanup-personal-data',
    name: 'Personal Data Retention Cleanup (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/cleanup-personal-data',
    schedule: '0 3 * * *',
    description:
      'Удаление персональных данных по истечении сроков хранения (152-ФЗ, ROADMAP.md М3) — тот же паттерн, что driving-school:cleanup-api-logs',
    enabled: true,
    server: 's2',
  },
  {
    id: 'domwellbes-anonymize-archived-clients',
    name: 'Archived Client Anonymization (domwellbes)',
    app: 'domwellbes',
    endpoint: '/api/cron/anonymize-archived-clients',
    schedule: '0 4 * * *',
    description:
      'Автоанонимизация ПДн клиентского логина после 3-летнего grace period с архивации клиента, при отсутствии блокеров (152-ФЗ, ROADMAP_M8.md §M8B.3) — ручной путь — кнопка в /admin/clients/[id]',
    enabled: true,
    server: 's2',
  },
  {
    id: 'jobs-observer-check',
    name: 'Jobs Observer Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/jobs-observer-check',
    schedule: '*/15 * * * *',
    description:
      'Наблюдатель за @letar/jobs-задачами тиража §75 (dashboard, driving-school, dsperevod, aboi, time, svoichuzhie): опрашивает /api/jobs/status каждого приложения, алертит CRON_FAILED на autoSchedule:false (забытый JOBS_ENABLED — находка пилота 13.08.2026) и на пропущенный тик задачи',
    enabled: true,
    server: 's2',
  },
]

/**
 * Задачи, выводимые из эксплуатации через репозиторий (PLAN-INFRA.md §56). `loadAllCronJobs()`
 * добавляет недостающие дефолты, но никогда не удаляет записи — задача, убранная из
 * `DEFAULT_CRON_JOBS`, раньше продолжала жить на проде вечно (DELETE-ручки у API агента нет).
 * Перечисли сюда `id` задачи, которую нужно снять — она будет удалена из `cron-jobs.json`
 * при следующей загрузке конфигурации на каждом сервере, где она встретится. Держать здесь
 * долго не нужно: после того как задача реально пропала со всех серверов, id можно убрать
 * из этого списка (или оставить — повторная фильтрация над уже пустым множеством безвредна).
 */
export const RETIRED_JOB_IDS: string[] = [
  // Пилот @letar/jobs (PLAN-INFRA §75) — 6 задач studio переехали из HTTP-ручек
  // /api/cron/* (удалены из кода studio) в планировщик поверх pg-boss внутри самого
  // приложения. ⚠️ ПОРЯДОК ДЕПЛОЯ ВАЖЕН: этот список не должен уйти на прод раньше, чем
  // studio задеплоена с новым планировщиком и `JOBS_ENABLED=true` — иначе есть окно, где
  // задачи не выполняет никто. Деплоить студию и dashboard-agent в одном окне, студию
  // первой (её роуты `/api/cron/*` уже удалены — старые вызовы агента будут получать 404
  // до этого момента, если деплой dashboard-agent случайно окажется раньше).
  'studio-send-reminders',
  'studio-recurring-invoices',
  'studio-close-stale-timers',
  'studio-check-budget-alerts',
  'studio-biweekly-hourly-invoices',
  'studio-check-long-timers',
  // Тот же переезд на @letar/jobs, но для dashboard (коммит `8ebecdfe`) — задачи убраны из
  // DEFAULT_CRON_JOBS, но этого недостаточно: loadAllCronJobs() никогда не удаляет запись
  // из живого cron-jobs.json сама по себе, только через этот список. Без этой правки
  // s2-pageview-count продолжал дёргать удалённую HTTP-ручку /api/cron/pageview-count
  // каждые 10 минут и падал 404 (обнаружено по алерту GlitchTip 2026-09-03 14:20).
  'dashboard-heartbeat',
  's2-pageview-count',
  's2-ssl-check',
]
