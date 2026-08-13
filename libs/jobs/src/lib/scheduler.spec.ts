import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createJobScheduler } from './scheduler'
import type { JobDefinition, JobOverrideRecord } from './types'

// Имена обязаны начинаться с "mock" — только такие переменные vitest поднимает вместе
// с самим вызовом vi.mock() при хойстинге (см. https://vitest.dev/api/vi.html#vi-mock).
const mockBoss = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  unschedule: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue('worker-id'),
  send: vi.fn().mockResolvedValue('run-id-123'),
  getDb: vi.fn(() => ({ executeSql: vi.fn().mockResolvedValue({ rows: [] }) })),
}

vi.mock('pg-boss', () => ({
  // Конструктор, явно возвращающий объект, переопределяет `this` — валидный JS, и не
  // требует отдельного `class`-биндинга снаружи фабрики (тот не хойстится вместе с vi.mock).
  PgBoss: function MockPgBossCtor() {
    return mockBoss
  },
}))

function job(overrides: Partial<JobDefinition> = {}): JobDefinition {
  return {
    id: 'demo-job',
    name: 'Demo Job',
    description: 'Тестовая задача',
    schedule: '0 3 * * *',
    handler: async () => {},
    ...overrides,
  }
}

describe('createJobScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBoss.getDb.mockReturnValue({ executeSql: vi.fn().mockResolvedValue({ rows: [] }) })
  })

  it('start(): создаёт очередь, ставит расписание и регистрирует воркер для включённой задачи', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })

    await scheduler.start()

    expect(mockBoss.start).toHaveBeenCalledOnce()
    expect(mockBoss.createQueue).toHaveBeenCalledWith('demo-job', { retryLimit: 0, retryDelay: 0 })
    expect(mockBoss.schedule).toHaveBeenCalledWith('demo-job', '0 3 * * *', undefined, {
      tz: 'Europe/Moscow',
    })
    expect(mockBoss.unschedule).not.toHaveBeenCalled()
    expect(mockBoss.work).toHaveBeenCalledWith('demo-job', expect.any(Function))
  })

  it('start(): выключенная задача снимается с расписания вместо schedule()', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job({ enabled: false })],
      overrides: [],
    })

    await scheduler.start()

    expect(mockBoss.schedule).not.toHaveBeenCalled()
    expect(mockBoss.unschedule).toHaveBeenCalledWith('demo-job')
    // Воркер регистрируется всё равно — на случай ручного "запустить сейчас" через runNow()
    expect(mockBoss.work).toHaveBeenCalledWith('demo-job', expect.any(Function))
  })

  it('start(): оверрайд расписания из БД побеждает значение из кода', async () => {
    const overrides: JobOverrideRecord[] = [{ jobId: 'demo-job', schedule: '0 7 * * *', enabled: null }]
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides,
    })

    await scheduler.start()

    expect(mockBoss.schedule).toHaveBeenCalledWith('demo-job', '0 7 * * *', undefined, {
      tz: 'Europe/Moscow',
    })
  })

  it('runNow(): ставит задачу в очередь немедленно через boss.send()', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    const runId = await scheduler.runNow('demo-job')

    expect(mockBoss.send).toHaveBeenCalledWith('demo-job', {})
    expect(runId).toBe('run-id-123')
  })

  it('runNow(): падает с понятной ошибкой для id вне реестра', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    await expect(scheduler.runNow('unknown-job')).rejects.toThrow('неизвестная задача "unknown-job"')
    expect(mockBoss.send).not.toHaveBeenCalled()
  })

  it('stop(): без предварительного start() ничего не делает (idempotent no-op)', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })

    await scheduler.stop()

    expect(mockBoss.stop).not.toHaveBeenCalled()
  })

  it('stop(): после start() вызывает graceful boss.stop()', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    await scheduler.stop()

    expect(mockBoss.stop).toHaveBeenCalledWith({ graceful: true })
  })

  it('getStatuses(): без прогонов в БД — lastRunAt/lastRunState пусты, nextRunAt посчитан', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    const [status] = await scheduler.getStatuses()

    expect(status.lastRunAt).toBeNull()
    expect(status.lastRunState).toBeNull()
    expect(status.nextRunAt).toBeInstanceOf(Date)
    expect(status.autoSchedule).toBe(true)
    expect(status.hasOverride).toBe(false)
  })

  it('getStatuses(): выключенная задача не получает nextRunAt', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job({ enabled: false })],
      overrides: [],
    })
    await scheduler.start()

    const [status] = await scheduler.getStatuses()

    expect(status.nextRunAt).toBeNull()
    expect(status.enabled).toBe(false)
  })

  it('getStatuses(): читает последний запуск из pgboss.job и вычисляет длительность', async () => {
    const createdOn = new Date('2026-08-12T03:00:00Z')
    const completedOn = new Date('2026-08-12T03:00:05Z')
    mockBoss.getDb.mockReturnValue({
      executeSql: vi.fn().mockResolvedValue({
        rows: [{ state: 'completed', createdOn, completedOn, output: null }],
      }),
    })

    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    const [status] = await scheduler.getStatuses()

    expect(status.lastRunState).toBe('completed')
    expect(status.lastRunAt).toEqual(createdOn)
    expect(status.lastRunDurationMs).toBe(5000)
    expect(status.lastRunError).toBeNull()
  })

  it('getStatuses(): для упавшей задачи достаёт message из output', async () => {
    const createdOn = new Date('2026-08-12T03:00:00Z')
    mockBoss.getDb.mockReturnValue({
      executeSql: vi.fn().mockResolvedValue({
        rows: [{ state: 'failed', createdOn, completedOn: null, output: { message: 'ECONNREFUSED' } }],
      }),
    })

    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    const [status] = await scheduler.getStatuses()

    expect(status.lastRunState).toBe('failed')
    expect(status.lastRunError).toBe('ECONNREFUSED')
    expect(status.lastRunDurationMs).toBeNull()
  })

  it('несколько задач в реестре обрабатываются независимо', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job({ id: 'job-a' }), job({ id: 'job-b', enabled: false })],
      overrides: [],
    })

    await scheduler.start()

    expect(mockBoss.schedule).toHaveBeenCalledTimes(1)
    expect(mockBoss.schedule).toHaveBeenCalledWith('job-a', expect.any(String), undefined, expect.any(Object))
    expect(mockBoss.unschedule).toHaveBeenCalledWith('job-b')
    expect(mockBoss.createQueue).toHaveBeenCalledTimes(2)
  })

  it('autoSchedule=false: очередь и воркер регистрируются, но schedule()/unschedule() не вызываются', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job(), job({ id: 'job-disabled', enabled: false })],
      overrides: [],
      autoSchedule: false,
    })

    await scheduler.start()

    expect(mockBoss.createQueue).toHaveBeenCalledTimes(2)
    expect(mockBoss.work).toHaveBeenCalledTimes(2)
    expect(mockBoss.schedule).not.toHaveBeenCalled()
    expect(mockBoss.unschedule).not.toHaveBeenCalled()
  })

  it('autoSchedule=false: runNow() всё равно работает — ручной запуск не зависит от автотика', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
      autoSchedule: false,
    })
    await scheduler.start()

    const runId = await scheduler.runNow('demo-job')

    expect(runId).toBe('run-id-123')
  })

  it('autoSchedule=false: getStatuses() не обещает следующий запуск — тикать нечему', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
      autoSchedule: false,
    })
    await scheduler.start()

    const [status] = await scheduler.getStatuses()

    // Раньше nextRunAt считался из cron-выражения независимо от автотика — админка показывала
    // время, в которое ничего не произойдёт. Именно это скрыло невыставленный JOBS_ENABLED
    // на проде (13.08.2026): «Следующий запуск 19:25» при мёртвом расписании.
    expect(status.nextRunAt).toBeNull()
    expect(status.autoSchedule).toBe(false)
  })

  it('setOverride(): применяет новое расписание сразу, без рестарта процесса', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()
    mockBoss.schedule.mockClear()

    await scheduler.setOverride('demo-job', { schedule: '0 6 * * *', enabled: null })

    expect(mockBoss.schedule).toHaveBeenCalledWith('demo-job', '0 6 * * *', undefined, {
      tz: 'Europe/Moscow',
    })

    const [status] = await scheduler.getStatuses()
    expect(status.schedule).toBe('0 6 * * *')
    expect(status.hasOverride).toBe(true)
  })

  it('setOverride(): enabled=false снимает задачу с расписания сразу', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()
    mockBoss.unschedule.mockClear()

    await scheduler.setOverride('demo-job', { schedule: null, enabled: false })

    expect(mockBoss.unschedule).toHaveBeenCalledWith('demo-job')
    const [status] = await scheduler.getStatuses()
    expect(status.enabled).toBe(false)
  })

  it('setOverride(): до start() не трогает pg-boss, но обновляет эффективное состояние', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })

    await scheduler.setOverride('demo-job', { schedule: '0 6 * * *', enabled: null })

    expect(mockBoss.schedule).not.toHaveBeenCalled()
  })

  it('setOverride(): падает с понятной ошибкой для id вне реестра', async () => {
    const scheduler = createJobScheduler({
      connectionString: 'postgres://test',
      jobs: [job()],
      overrides: [],
    })
    await scheduler.start()

    await expect(scheduler.setOverride('unknown-job', { schedule: null, enabled: false })).rejects.toThrow(
      'неизвестная задача "unknown-job"',
    )
  })
})
