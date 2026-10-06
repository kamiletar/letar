/** Правка, ждущая отправки на сервер. Живёт в IndexedDB, пока нет сети */
export interface OutboxItem {
  /** Постоянный id черновика на устройстве: у новой заметки ещё нет серверного id */
  localId: string
  noteId: string | null
  /** Версия, которую устройство видело на сервере в момент первой правки */
  baseVersionId: string | null
  title: string
  body: string
  deviceId: string | null
  queuedAt: number
}

export interface SyncResult {
  noteId: string | null
  versionId: string | null
}

function isSame(a: OutboxItem, b: OutboxItem): boolean {
  return a.localId === b.localId
}

/**
 * Ставит правку в очередь. Правки одной заметки склеиваются: остаётся последний текст,
 * а база и время постановки — от первой правки, ведь именно от неё сервер считает ветку.
 */
export function enqueue(queue: OutboxItem[], item: OutboxItem): OutboxItem[] {
  const index = queue.findIndex((queued) => isSame(queued, item))
  if (index === -1) {
    return [...queue, item]
  }
  const first = queue[index]
  const merged: OutboxItem = {
    ...item,
    noteId: first.noteId ?? item.noteId,
    baseVersionId: first.baseVersionId,
    queuedAt: first.queuedAt,
  }
  return queue.map((queued, i) => (i === index ? merged : queued))
}

/**
 * Отмечает успешную отправку `sent`. Если пока шла отправка текст дописали,
 * элемент остаётся в очереди, но уже с новой базой и серверным id.
 */
export function markSynced(queue: OutboxItem[], sent: OutboxItem, result: SyncResult): OutboxItem[] {
  return queue.flatMap((queued) => {
    if (!isSame(queued, sent)) {
      return [queued]
    }
    const unchanged = queued.title === sent.title && queued.body === sent.body
    if (unchanged) {
      return []
    }
    return [{
      ...queued,
      noteId: result.noteId ?? queued.noteId,
      baseVersionId: result.versionId ?? queued.baseVersionId,
    }]
  })
}
