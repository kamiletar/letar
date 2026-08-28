/**
 * Регрессия: имя файла строится из `originalName`, который приходит из
 * multipart-заголовка и полностью контролируется клиентом. Результат попадает
 * в `join()` при записи на диск и в поле `path` записи File.
 *
 * Тот же класс дефекта чинили независимо в driving-school, mandala (a18f21a6) и
 * grandslamcup (0ce94356) — ровно причина, по которой утилита вынесена сюда.
 */

import { join, resolve, sep } from 'path'
import { describe, expect, it } from 'vitest'
import { generateFilename } from './save-file'

/** Корень загрузок, как его строит `ensureUploadDir`. */
const UPLOADS_ROOT = resolve(join('/srv/app', 'uploads', 'avatars'))

/** Имена файлов, которыми пытаются вырваться из каталога загрузок. */
const HOSTILE_NAMES = [
  'a.b/../../../../etc/cron.d/evil',
  'evil./../../../../../../tmp/pwned',
  'a./etc/passwd',
  'a./subdir/nested/file',
  'a.\\..\\..\\windows\\system32\\evil',
  'a./..%2f..%2fevil',
  'a.jpg\0.php',
]

/** Проверка, что записанный файл остаётся непосредственно внутри корня. */
function staysInsideRoot(filename: string): boolean {
  const target = resolve(join(UPLOADS_ROOT, filename))
  const rel = target.slice(UPLOADS_ROOT.length + 1)
  return target.startsWith(UPLOADS_ROOT + sep) && !rel.includes(sep)
}

/**
 * Положительный контроль — прежняя, уязвимая реализация.
 * Нужна, чтобы доказать: проверка `staysInsideRoot` действительно ловит дефект,
 * а зелёный тест ниже не «зелёный по построению».
 */
function generateFilenameVulnerable(originalName: string): string {
  const extension = originalName.split('.').pop() || 'bin'
  return `${Date.now()}-abc123.${extension}`
}

describe('generateFilename', () => {
  it('сохраняет расширение обычного файла', () => {
    expect(generateFilename('photo.JPG')).toMatch(/^\d+-[a-z0-9]+\.jpg$/)
  })

  it('подставляет bin, когда после очистки расширение пустое', () => {
    // Имя без точки целиком считается расширением — это давнее поведение,
    // менять его не задача этой правки.
    expect(generateFilename('trailing.')).toMatch(/\.bin$/)
    expect(generateFilename('archive.///')).toMatch(/\.bin$/)
  })

  it.each(HOSTILE_NAMES)('не выпускает файл за пределы каталога: %s', (hostile) => {
    const filename = generateFilename(hostile)

    expect(filename).not.toContain('/')
    expect(filename).not.toContain('\\')
    expect(filename).not.toContain('\0')
    expect(staysInsideRoot(filename)).toBe(true)
  })

  it('положительный контроль: прежняя реализация проверку не проходит', () => {
    // Хотя бы одно враждебное имя должно пробивать проверку на старом коде,
    // иначе тест выше ничего не доказывает.
    const escaping = HOSTILE_NAMES.filter((name) => !staysInsideRoot(generateFilenameVulnerable(name)))

    expect(escaping.length).toBeGreaterThan(0)
  })
})
