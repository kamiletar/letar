import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Через сутки удаляет незавершённые исходники и надгробия с уже истёкшими upload-токенами. */
export async function sweepAudioUploads(dataPath: string, now = Date.now()) {
  const root = join(dataPath, 'private-audio')
  const apps = await readdir(root, { withFileTypes: true }).catch(() => [])
  for (const app of apps) {
    if (!app.isDirectory()) { continue }
    for (const item of await readdir(join(root, app.name), { withFileTypes: true })) {
      if (!item.isDirectory()) { continue }
      const dir = join(root, app.name, item.name)
      const deleted = await stat(join(dir, 'deleted')).catch(() => null)
      if (deleted && now - deleted.mtimeMs > 48 * 3600 * 1000) {
        await rm(dir, { recursive: true, force: true })
        continue
      }
      if (await stat(join(dir, 'ready.json')).catch(() => null)) { continue }
      try {
        const state = JSON.parse(await readFile(join(dir, 'upload.json'), 'utf8')) as { expires: number }
        if (Number.isSafeInteger(state.expires) && state.expires < now / 1000) {
          await writeFile(join(dir, 'error'), 'Upload expired')
          for (const file of ['source', 'audio.m4a']) { await rm(join(dir, file), { force: true }) }
        }
      } catch { /* Повреждённые метаданные не дают права удалять файл. */ }
    }
  }
}
