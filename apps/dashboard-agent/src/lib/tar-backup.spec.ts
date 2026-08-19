import { existsSync } from 'fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTarBackup, listTarBackups } from './tar-backup'

/**
 * Тесты общего механизма tar-бэкапов.
 *
 * Писались перед выносом (2026-08-08): в агенте уже лежали две почти идентичные реализации
 * (`acme-dns-backup.ts`, `nginx-backup.ts`) **без единого теста**, и добавление третьей под
 * секреты Traefik превратило бы дублирование в системное. Тесты здесь — условие, при котором
 * те две можно будет мигрировать на общий код без риска: сейчас их поведение ничем не
 * зафиксировано.
 */
describe('createTarBackup', () => {
  let root: string
  let backupsDir: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'tar-backup-'))
    backupsDir = path.join(root, 'backups')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function makeSource(name: string, content = 'secret'): Promise<string> {
    const file = path.join(root, name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
    return file
  }

  /**
   * Подставной архиватор: пишет файл с gzip-сигнатурой и запоминает, что ему передали.
   * Настоящий `tar` в тестах не зовём — он платформенная зависимость и на Windows подвешивает
   * процесс. Проверяем логику вокруг него, а не сам tar.
   */
  function fakeArchiver() {
    const calls: { filepath: string; sourcePaths: string[] }[] = []
    const archive = async (filepath: string, sourcePaths: string[]) => {
      calls.push({ filepath, sourcePaths })
      await writeFile(filepath, Buffer.from([0x1f, 0x8b, 0x08, 0x00]))
      return { ok: true as const }
    }
    return { calls, archive }
  }

  it('создаёт архив и возвращает его размер', async () => {
    const source = await makeSource('a.json')
    const { archive } = fakeArchiver()

    const result = await createTarBackup({
      prefix: 'traefik',
      type: 'manual',
      sources: [{ label: 'файл аккаунтов', path: source }],
      backupsDir,
      archive,
    })

    expect(result.success).toBe(true)
    expect(result.file).toMatch(/^traefik_manual_.*\.tar\.gz$/)
    expect(result.size).toBeGreaterThan(0)
    expect(existsSync(path.join(backupsDir, result.file!))).toBe(true)
  })

  it('передаёт архиватору ВСЕ источники, а не только первый', async () => {
    const first = await makeSource('first.json')
    const second = await makeSource('nested/second.json')
    const { calls, archive } = fakeArchiver()

    await createTarBackup({
      prefix: 'traefik',
      type: 'manual',
      sources: [{ label: 'первый', path: first }, { label: 'второй', path: second }],
      backupsDir,
      archive,
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].sourcePaths).toEqual([first, second])
  })

  it('не оставляет файл архива, если архиватор упал', async () => {
    const source = await makeSource('a.json')

    const result = await createTarBackup({
      prefix: 'traefik',
      type: 'auto',
      sources: [{ label: 'a', path: source }],
      backupsDir,
      archive: async (filepath) => {
        // Архиватор успел создать файл и оборвался — типичный случай нехватки места
        await writeFile(filepath, 'обрывок')
        return { ok: false, stderr: 'no space left on device' }
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('no space left')
    expect(await readdir(backupsDir)).toEqual([])
  })

  // Главный инвариант: молчаливо неполный архив опаснее отсутствующего — он выглядит как защита.
  it('отказывается делать частичный архив, если хоть один источник отсутствует', async () => {
    const present = await makeSource('present.json')

    const result = await createTarBackup({
      prefix: 'traefik',
      type: 'auto',
      sources: [
        { label: 'есть', path: present },
        { label: 'нет', path: path.join(root, 'missing.json'), hint: 'проверить монтирование' },
      ],
      backupsDir,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('нет')
    expect(result.error).toContain('проверить монтирование')
    // Файл не должен появиться даже пустым
    expect(existsSync(backupsDir) ? await readdir(backupsDir) : []).toEqual([])
  })

  // Архив содержит секреты; tar создаёт файл по umask, то есть читаемым для всех.
  //
  // ⚠️ Проверка пропускается на Windows, и это не «тест неудобный». `chmod` в Windows управляет
  // только флагом «только для чтения» — POSIX-биты там не реализованы, `stat().mode` вернёт
  // 0o666 независимо от того, что мы просили. Утверждение осмысленно ровно на той платформе, где
  // работает агент (Linux), там же оно и проверяется в CI. Ослаблять утверждение до «как получится»
  // нельзя: права на файле с секретами — то, ради чего этот вызов и существует.
  //
  // 640, не 600: группа каталога `backups/` тоже должна читать файл — иначе Resilio Sync,
  // работающий на хосте под непривилегированным `deploy`, не может забрать архив в оффсайт-копию
  // (найдено 2026-08-19 — nginx/acme-dns бэкапы годами не покидали сервер молча).
  it.skipIf(process.platform === 'win32')(
    'выставляет права 640 и группу каталога бэкапов на созданный архив',
    async () => {
      const source = await makeSource('a.json')

      const { archive } = fakeArchiver()
      const result = await createTarBackup({
        prefix: 'traefik',
        type: 'manual',
        sources: [{ label: 'a', path: source }],
        backupsDir,
        archive,
      })

      const dirStats = await stat(backupsDir)
      const fileStats = await stat(path.join(backupsDir, result.file!))
      expect(fileStats.mode & 0o777).toBe(0o640)
      expect(fileStats.gid).toBe(dirStats.gid)
    },
  )

  it('ротация удаляет лишние auto-бэкапы и не трогает manual', async () => {
    await mkdir(backupsDir, { recursive: true })
    // Старые архивы: 3 auto + 1 manual при лимите 2
    for (
      const name of [
        'traefik_auto_2026-01-01.tar.gz',
        'traefik_auto_2026-01-02.tar.gz',
        'traefik_manual_2026-01-01.tar.gz',
      ]
    ) {
      await writeFile(path.join(backupsDir, name), 'x')
    }
    const source = await makeSource('a.json')
    const { archive } = fakeArchiver()

    await createTarBackup({
      prefix: 'traefik',
      type: 'auto',
      sources: [{ label: 'a', path: source }],
      backupsDir,
      maxAutoBackups: 2,
      archive,
    })

    const files = await readdir(backupsDir)
    const auto = files.filter((f) => f.includes('_auto_'))
    expect(auto).toHaveLength(2)
    // Самый старый auto удалён, свежий остался
    expect(auto).not.toContain('traefik_auto_2026-01-01.tar.gz')
    // Ручной бэкап ротация не трогает
    expect(files).toContain('traefik_manual_2026-01-01.tar.gz')
  })

  it('кладёт архив под именем вида <prefix>_<type>_<время> в указанный каталог', async () => {
    const source = await makeSource('a.json')
    const { calls, archive } = fakeArchiver()

    const result = await createTarBackup({
      prefix: 'traefik',
      type: 'auto',
      sources: [{ label: 'a', path: source }],
      backupsDir,
      archive,
    })

    expect(result.file).toMatch(/^traefik_auto_\d{4}-\d{2}-\d{2}/)
    expect(calls[0].filepath).toBe(path.join(backupsDir, result.file!))
    // gzip-сигнатура — файл на месте и это он
    const bytes = await readFile(calls[0].filepath)
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b])
  })
})

describe('listTarBackups', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'tar-backup-list-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('возвращает пустой список, если каталога нет', async () => {
    const list = await listTarBackups('traefik', path.join(root, 'нет-такого'))
    expect(list).toEqual([])
  })

  it('различает manual и auto и игнорирует чужие файлы', async () => {
    await mkdir(root, { recursive: true })
    await writeFile(path.join(root, 'traefik_auto_2026-01-02.tar.gz'), 'x')
    await writeFile(path.join(root, 'traefik_manual_2026-01-01.tar.gz'), 'x')
    await writeFile(path.join(root, 'acme-dns_auto_2026-01-01.tar.gz'), 'x') // чужой префикс
    await writeFile(path.join(root, 'readme.txt'), 'x')

    const list = await listTarBackups('traefik', root)

    expect(list).toHaveLength(2)
    expect(list.map((b) => b.type).sort()).toEqual(['auto', 'manual'])
  })
})
