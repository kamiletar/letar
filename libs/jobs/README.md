# @letar/jobs

Периодические задачи (крон) внутри приложения — планировщик поверх [pg-boss](https://timgit.github.io/pg-boss/)
и БД самого приложения. Не HTTP-ручки, дёргаемые внешним агентом — задача исполняется в том же
процессе, где её код и данные.

Архитектурное решение и почему не остались на прежней схеме (`dashboard-agent` дёргает
`/api/cron/*` по расписанию) — [PLAN-INFRA.md §75](/PLAN-INFRA.md).

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { createJobScheduler, defineJob } from '@letar/jobs'
```

## API

### `defineJob(job: JobDefinition): JobDefinition`

Регистрирует декларацию задачи — тонкая обёртка с валидацией `id` (обязателен kebab-case,
используется как имя очереди pg-boss). Каждая задача приложения обязана идти через неё, а не
через голый литерал.

```typescript
export const closeStaleTimers = defineJob({
  id: 'close-stale-timers',
  name: 'Close Stale Timers',
  description: 'Закрывает зависшие активные записи TimeEntry по отсечке бездействия 20 мин',
  schedule: '*/5 * * * *',
  handler: async (ctx) => {
    await closeStaleTimeEntries(prisma, new Date())
  },
})
```

### `createJobScheduler(options: JobSchedulerOptions): JobScheduler`

```typescript
const scheduler = createJobScheduler({
  connectionString: process.env.DATABASE_URL!,
  jobs: Object.values(jobs), // реестр приложения, src/jobs/index.ts
  overrides: await prisma.jobOverride.findMany(),
})

await scheduler.start() // instrumentation.ts — один раз на процесс
```

- `start()` — поднимает pg-boss (сам создаёт и мигрирует свою схему `pgboss` в БД приложения),
  создаёт очередь на каждую задачу, ставит cron-расписание (или снимает его, если задача
  выключена) и регистрирует обработчик.
- `stop()` — graceful shutdown, для `SIGTERM`.
- `runNow(jobId)` — ставит задачу в очередь немедленно, для кнопки «Запустить сейчас» в админке.
- `getStatuses()` — снимок состояния всех задач реестра (последний запуск, следующий запуск,
  ошибка) — источник для UI-компонента админки и для `/api/jobs/status`, который опрашивает
  `dashboard-agent` в режиме наблюдателя.

### `mergeJobsWithOverrides(definitions, overrides): EffectiveJob[]`

Чистая функция слияния — код задаёт дефолты, `JobOverride` (модель в `schema.zmodel`
приложения, правки через админку) их перекрывает. **Источник истины по составу задач — код**:
если id убрали из реестра, задача пропадает из эффективного списка, даже если для неё остался
оверрайд в БД. Экспортирована отдельно ради теста без поднятия pg-boss; `createJobScheduler`
вызывает её сама.

## Модель `JobOverride`

Библиотека не создаёт эту модель сама — каждое приложение держит свою в `schema.zmodel`,
конвенция полей:

```zmodel
model JobOverride {
  id       String  @id @default(cuid())
  jobId    String  @unique
  schedule String?
  enabled  Boolean?
  updatedAt DateTime @updatedAt

  @@allow('all', auth().isOwner)
}
```

`null` в `schedule`/`enabled` означает «оверрайда нет, использовать значение из кода».

## Команды

```bash
nx test jobs
nx lint jobs
nx typecheck:tsgo jobs
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/jobs` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/jobs` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
