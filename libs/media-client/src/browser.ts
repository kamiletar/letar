/** Загружает файл чанками TUS. Повторный вызов продолжает с подтверждённого сервером смещения. */
export async function uploadAudioFile(options: {
  file: File
  audioId: string
  tusUrl: string
  uploadToken: string
  signal?: AbortSignal
  onProgress(percent: number): void
}) {
  const { file, audioId, tusUrl, uploadToken, signal, onProgress } = options
  const url = `${tusUrl}/${encodeURIComponent(audioId)}`
  const headers = { 'X-Upload-Token': uploadToken, 'Tus-Resumable': '1.0.0' }
  let head = await fetch(url, { method: 'HEAD', headers, signal, cache: 'no-store' })
  if (head.status === 404) {
    const created = await fetch(`${tusUrl}?audioId=${encodeURIComponent(audioId)}`, {
      method: 'POST',
      headers: { ...headers, 'Upload-Length': String(file.size) },
      signal,
    })
    if (!created.ok && created.status !== 409) { throw new Error('Не удалось начать передачу файла') }
    head = await fetch(url, { method: 'HEAD', headers, signal, cache: 'no-store' })
  }
  if (!head.ok) { throw new Error('Не удалось продолжить загрузку. Начните её заново') }
  let offset = Number(head.headers.get('Upload-Offset'))
  if (
    !Number.isSafeInteger(offset) || offset < 0 || offset > file.size
    || Number(head.headers.get('Upload-Length')) !== file.size
  ) {
    throw new Error('Сервер вернул неверное смещение загрузки')
  }
  onProgress(Math.floor(offset / file.size * 100))
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + 2 * 1024 ** 2)
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(offset) },
      body: chunk,
      signal,
    })
    if (!response.ok) { throw new Error('Передача прервалась. Нажмите «Продолжить загрузку»') }
    const next = Number(response.headers.get('Upload-Offset'))
    if (next !== offset + chunk.size) { throw new Error('Сервер не подтвердил передачу файла') }
    offset = next
    onProgress(Math.floor(offset / file.size * 100))
  }
}
