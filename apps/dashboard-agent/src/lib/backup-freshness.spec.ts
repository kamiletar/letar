/**
 * Тесты проверки свежести бэкапов (Maddy + acme-dns).
 *
 * Проверяется поведение, от которого зависит, узнаем ли мы о молчаливо вставшем бэкапе:
 * выбор самого свежего файла, порог устаревания и дебаунс алерта. Файловая система —
 * настоящая (временный каталог), потому что именно её поведение мы и проверяем; замокан
 * только внешний канал алертов и файл состояния.
 */

import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDashboardAlert = vi.fn(async () => Promise.resolve())
let fakeState: { alerted: boolean } = { alerted: false }

vi.mock('./dashboard-alert', () => ({
  postDashboardAlert: (...args: unknown[]) => postDashboardAlert(...(args as [])),
}))

vi.mock('./json-state-file', () => ({
  loadJsonState: () => fakeState,
  saveJsonState: (_path: string, state: { alerted: boolean }) => {
    fakeState = state
  },
}))

const { acmeDnsTarget, ageInHours, findNewestBackupFile, maddyTarget, runFreshnessCheck } = await import(
  './backup-freshness'
)

/** Кладёт файл с заданным возрастом в часах */
function writeBackupFile(dir: string, name: string, ageHours: number): void {
  const filepath = path.join(dir, name)
  writeFileSync(filepath, 'test')
  const mtime = new Date(Date.now() - ageHours * 60 * 60 * 1000)
  utimesSync(filepath, mtime, mtime)
}

function makeTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'freshness-'))
}

function targetFor(dir: string, maxAgeHours = 30) {
  return {
    jobId: 'test-check',
    label: 'Тест',
    backupDir: dir,
    statePath: path.join(dir, 'state.json'),
    maxAgeHours,
    filenamePattern: /^acme-dns_.*\.tar\.gz$/,
    hint: 'Подсказка.',
  }
}

describe('ageInHours', () => {
  it('считает разницу в часах', () => {
    const now = Date.UTC(2026, 7, 7, 12, 0, 0)
    expect(ageInHours(now - 90 * 60 * 1000, now)).toBeCloseTo(1.5)
    expect(ageInHours(now, now)).toBe(0)
  })
})

describe('findNewestBackupFile', () => {
  it('возвращает самый свежий файл, подходящий под паттерн', () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto_old.tar.gz', 48)
    writeBackupFile(dir, 'acme-dns_auto_new.tar.gz', 2)

    const newest = findNewestBackupFile(dir, /^acme-dns_.*\.tar\.gz$/)

    expect(newest?.name).toBe('acme-dns_auto_new.tar.gz')
    rmSync(dir, { recursive: true, force: true })
  })

  it('игнорирует чужие файлы в том же каталоге', () => {
    const dir = makeTempDir()
    // Свежий чужой архив не должен маскировать отсутствие своего — иначе проверка
    // молча зазеленеет от соседнего бэкапа
    writeBackupFile(dir, 'nginx_auto_new.tar.gz', 1)
    writeBackupFile(dir, 'acme-dns_auto_old.tar.gz', 100)

    const newest = findNewestBackupFile(dir, /^acme-dns_.*\.tar\.gz$/)

    expect(newest?.name).toBe('acme-dns_auto_old.tar.gz')
    rmSync(dir, { recursive: true, force: true })
  })

  it('возвращает null, когда подходящих файлов нет', () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'nginx_auto_new.tar.gz', 1)

    expect(findNewestBackupFile(dir, /^acme-dns_.*\.tar\.gz$/)).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('runFreshnessCheck', () => {
  beforeEach(() => {
    postDashboardAlert.mockClear()
    fakeState = { alerted: false }
  })

  it('свежий бэкап — не stale, алерта нет', async () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto_fresh.tar.gz', 3)

    const result = await runFreshnessCheck(targetFor(dir))

    expect(result.stale).toBe(false)
    expect(result.alerted).toBe(false)
    expect(result.newestFile).toBe('acme-dns_auto_fresh.tar.gz')
    expect(postDashboardAlert).not.toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  })

  it('устаревший бэкап — stale и алерт', async () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto_stale.tar.gz', 50)

    const result = await runFreshnessCheck(targetFor(dir))

    expect(result.stale).toBe(true)
    expect(result.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    rmSync(dir, { recursive: true, force: true })
  })

  it('повторный прогон при том же провале не шлёт второй алерт (дебаунс)', async () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto_stale.tar.gz', 50)

    await runFreshnessCheck(targetFor(dir))
    postDashboardAlert.mockClear()
    const second = await runFreshnessCheck(targetFor(dir))

    expect(second.stale).toBe(true)
    expect(second.alerted).toBe(false)
    expect(postDashboardAlert).not.toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  })

  it('появление свежего файла сбрасывает дебаунс — следующий провал снова алертит', async () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto_stale.tar.gz', 50)
    await runFreshnessCheck(targetFor(dir))

    writeBackupFile(dir, 'acme-dns_auto_fresh.tar.gz', 1)
    await runFreshnessCheck(targetFor(dir))
    expect(fakeState.alerted).toBe(false)

    rmSync(path.join(dir, 'acme-dns_auto_fresh.tar.gz'))
    postDashboardAlert.mockClear()
    const third = await runFreshnessCheck(targetFor(dir))

    expect(third.alerted).toBe(true)
    expect(postDashboardAlert).toHaveBeenCalledTimes(1)
    rmSync(dir, { recursive: true, force: true })
  })

  it('пустой каталог — алерт «файлов не найдено»', async () => {
    const dir = makeTempDir()

    const result = await runFreshnessCheck(targetFor(dir))

    expect(result.stale).toBe(true)
    expect(result.alerted).toBe(true)
    expect(result.newestFile).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })

  it('отсутствующий каталог — провал без алерта: бэкап мог ещё ни разу не отработать', async () => {
    const dir = path.join(tmpdir(), 'freshness-missing-dir-that-does-not-exist')

    const result = await runFreshnessCheck(targetFor(dir))

    expect(result.stale).toBe(true)
    expect(result.alerted).toBe(false)
    expect(result.error).toContain('не найдена')
    expect(postDashboardAlert).not.toHaveBeenCalled()
  })

  it('порог берётся из цели, а не из константы', async () => {
    const dir = makeTempDir()
    writeBackupFile(dir, 'acme-dns_auto.tar.gz', 10)

    expect((await runFreshnessCheck(targetFor(dir, 30))).stale).toBe(false)
    fakeState = { alerted: false }
    expect((await runFreshnessCheck(targetFor(dir, 5))).stale).toBe(true)

    rmSync(dir, { recursive: true, force: true })
  })
})

describe('предустановленные цели', () => {
  it('Maddy и acme-dns различаются каталогом, паттерном и файлом состояния', () => {
    const maddy = maddyTarget()
    const acme = acmeDnsTarget()

    expect(maddy.backupDir).not.toBe(acme.backupDir)
    expect(maddy.statePath).not.toBe(acme.statePath)
    expect(maddy.filenamePattern.test('maddy_2026-08-07.tar.gz')).toBe(true)
    expect(maddy.filenamePattern.test('acme-dns_auto_2026-08-07.tar.gz')).toBe(false)
    expect(acme.filenamePattern.test('acme-dns_auto_2026-08-07.tar.gz')).toBe(true)
    expect(acme.filenamePattern.test('maddy_2026-08-07.tar.gz')).toBe(false)
  })

  it('переменные окружения читаются при вызове, а не при импорте модуля', () => {
    const before = acmeDnsTarget().backupDir
    process.env.ACME_DNS_BACKUP_DIR = '/tmp/custom-acme-backups'

    expect(acmeDnsTarget().backupDir).toBe('/tmp/custom-acme-backups')
    expect(acmeDnsTarget().backupDir).not.toBe(before)

    delete process.env.ACME_DNS_BACKUP_DIR
  })
})

describe('каталог бэкапов acme-dns', () => {
  it('вложен отдельно, чтобы проверка не путала его с бэкапами nginx в общей папке', () => {
    mkdirSync(path.join(tmpdir(), 'freshness-noop'), { recursive: true })
    expect(acmeDnsTarget().backupDir).toContain('backups/acme-dns')
    expect(maddyTarget().backupDir).toContain('backups/maddy')
  })
})
