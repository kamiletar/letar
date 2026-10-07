import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applySyncResults,
  attachUploads,
  coverSource,
  discardPending,
  isLocalId,
  keepMine,
  listPendingDeletes,
  loadPending,
  mergePoems,
  pendingBlobKeys,
  type PendingChange,
  type ReaderPoem,
  recordDelete,
  recordSave,
  savePending,
  syncSnapshot,
  toWireChanges,
} from './poems-store'

const NOW = '2026-10-07T13:00:00.000Z'

const poems: ReaderPoem[] = [
  { id: '1', title: 'Первое', text: 'строка\nвторая', published: true, updatedAt: '2026-10-01T10:00:00.000Z' },
  { id: '2', title: 'Черновик', text: 'ещё', published: false, updatedAt: '2026-10-02T10:00:00.000Z' },
]

const draft = (title: string, text: string, published = true) => ({ title, text, published })

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('recordSave', () => {
  it('новое стихотворение получает локальный id и попадает в очередь как create', () => {
    const { pending, id } = recordSave([], poems, null, draft('  Новое ', 'текст  \n\n'), NOW)
    expect(isLocalId(id)).toBe(true)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ kind: 'create', title: 'Новое', text: 'текст', baseUpdatedAt: null })
  })

  it('правка стиха с сайта запоминает, от какой версии правили', () => {
    const { pending } = recordSave([], poems, '1', draft('Первое', 'другой текст'), NOW)
    expect(pending[0]).toMatchObject({ kind: 'update', id: '1', baseUpdatedAt: poems[0]!.updatedAt })
  })

  it('правка без изменений очередь не пополняет', () => {
    const { pending } = recordSave([], poems, '1', draft('Первое', 'строка\nвторая'), NOW)
    expect(pending).toEqual([])
  })

  it('повторная правка обновляет запись и сохраняет исходную базу', () => {
    const first = recordSave([], poems, '1', draft('Первое', 'раз'), NOW).pending
    const second = recordSave(first, poems, '1', draft('Первое', 'два'), '2026-10-07T13:05:00.000Z').pending
    expect(second).toHaveLength(1)
    expect(second[0]).toMatchObject({ text: 'два', baseUpdatedAt: poems[0]!.updatedAt })
  })

  it('возврат текста к серверному убирает правку из очереди', () => {
    const first = recordSave([], poems, '1', draft('Первое', 'раз'), NOW).pending
    const back = recordSave(first, poems, '1', draft('Первое', 'строка\nвторая'), NOW).pending
    expect(back).toEqual([])
  })

  it('правка нового стиха остаётся create', () => {
    const created = recordSave([], poems, null, draft('Новое', 'а'), NOW)
    const edited = recordSave(created.pending, poems, created.id, draft('Новое', 'б'), NOW).pending
    expect(edited).toHaveLength(1)
    expect(edited[0]).toMatchObject({ kind: 'create', text: 'б' })
  })
})

describe('recordDelete / discardPending', () => {
  it('удаление стиха с сайта ставит delete и скрывает его', () => {
    const pending = recordDelete([], poems, '1', NOW)
    expect(pending[0]).toMatchObject({ kind: 'delete', id: '1' })
    expect(mergePoems(poems, pending).map((poem) => poem.id)).toEqual(['2'])
    expect(listPendingDeletes(poems, pending).map((poem) => poem.id)).toEqual(['1'])
  })

  it('«вернуть» убирает delete из очереди', () => {
    const pending = discardPending(recordDelete([], poems, '1', NOW), '1')
    expect(mergePoems(poems, pending)).toHaveLength(2)
  })

  it('удаление ещё не отправленного нового стиха просто выбрасывает его', () => {
    const created = recordSave([], poems, null, draft('Новое', 'а'), NOW)
    expect(recordDelete(created.pending, poems, created.id, NOW)).toEqual([])
  })
})

describe('mergePoems', () => {
  it('новые стихи идут первыми, правка накладывается на серверный текст', () => {
    const created = recordSave([], poems, null, draft('Новое', 'а'), NOW)
    const edited = recordSave(created.pending, poems, '2', draft('Черновик', 'правка', false), NOW)
    const merged = mergePoems(poems, edited.pending)
    expect(merged.map((poem) => poem.title)).toEqual(['Новое', 'Первое', 'Черновик'])
    expect(merged[2]).toMatchObject({ text: 'правка', pending: 'update' })
    expect(merged[0]).toMatchObject({ pending: 'create' })
  })

  it('правка стиха, пропавшего с сайта, показывается как новый стих', () => {
    const change: PendingChange = {
      id: 'gone',
      kind: 'update',
      title: 'Исчез',
      text: 'т',
      published: true,
      baseUpdatedAt: NOW,
      editedAt: NOW,
      conflict: null,
    }
    expect(mergePoems(poems, [change])[0]).toMatchObject({ id: 'gone', pending: 'create' })
  })
})

describe('toWireChanges', () => {
  it('не отправляет правки с неразрешённым конфликтом', () => {
    const pending = recordSave([], poems, '1', draft('Первое', 'раз'), NOW).pending
    const conflicted = applySyncResults(pending, { '1': NOW }, [{ id: '1', status: 'conflict', server: poems[0] }])
    expect(toWireChanges(conflicted.pending)).toEqual([])
  })

  it('update без базы уходит как create', () => {
    const change: PendingChange = {
      id: 'x',
      kind: 'update',
      title: 'Т',
      text: 'т',
      published: true,
      baseUpdatedAt: null,
      editedAt: NOW,
      conflict: null,
    }
    expect(toWireChanges([change])[0]).toMatchObject({ kind: 'create' })
  })
})

describe('applySyncResults', () => {
  it('успешная отправка убирает правку и сообщает серверный id нового стиха', () => {
    const created = recordSave([], poems, null, draft('Новое', 'а'), NOW)
    const server = { id: 'srv', title: 'Новое', text: 'а', published: true, updatedAt: NOW }
    const applied = applySyncResults(created.pending, { [created.id]: NOW }, [
      { id: created.id, status: 'ok', poem: server },
    ])
    expect(applied.pending).toEqual([])
    expect(applied.idMap).toEqual({ [created.id]: 'srv' })
  })

  it('если стих правили, пока шёл запрос, правка остаётся — от свежей серверной версии', () => {
    const first = recordSave([], poems, '1', draft('Первое', 'раз'), NOW)
    const edited = recordSave(first.pending, poems, '1', draft('Первое', 'два'), '2026-10-07T13:00:05.000Z').pending
    const server = { ...poems[0]!, text: 'раз', updatedAt: '2026-10-07T13:00:02.000Z' }
    const applied = applySyncResults(edited, { '1': NOW }, [{ id: '1', status: 'ok', poem: server }])
    expect(applied.pending).toHaveLength(1)
    expect(applied.pending[0]).toMatchObject({ text: 'два', baseUpdatedAt: server.updatedAt })
  })

  it('конфликт сохраняет версию с сайта; «оставить мою» снимает его и меняет базу', () => {
    const pending = recordSave([], poems, '1', draft('Первое', 'моё'), NOW).pending
    const serverVersion = { ...poems[0]!, text: 'чужое', updatedAt: '2026-10-07T12:30:00.000Z' }
    const conflicted = applySyncResults(pending, { '1': NOW }, [{ id: '1', status: 'conflict', server: serverVersion }])
    expect(conflicted.pending[0]!.conflict).toMatchObject({ text: 'чужое' })

    const mine = keepMine(conflicted.pending, '1')
    expect(mine[0]).toMatchObject({ conflict: null, baseUpdatedAt: serverVersion.updatedAt, text: 'моё' })
  })

  it('«missing»: правка становится новым стихом, а удаление считается выполненным', () => {
    const edit = recordSave([], poems, '1', draft('Первое', 'моё'), NOW).pending
    expect(applySyncResults(edit, { '1': NOW }, [{ id: '1', status: 'missing' }]).pending[0]).toMatchObject({
      kind: 'create',
      baseUpdatedAt: null,
    })

    const del = recordDelete([], poems, '2', NOW)
    expect(applySyncResults(del, { '2': NOW }, [{ id: '2', status: 'missing' }]).pending).toEqual([])
  })

  it('ошибка оставляет правку в очереди', () => {
    const pending = recordSave([], poems, '1', draft('Первое', 'моё'), NOW).pending
    expect(applySyncResults(pending, { '1': NOW }, [{ id: '1', status: 'error' }]).pending).toEqual(pending)
  })
})

describe('обложки', () => {
  const withCover: ReaderPoem[] = [{ ...poems[0]!, coverImage: 'poems/temp/old.jpg' }, poems[1]!]
  const photo = (key = 'pending:1-a') => ({ kind: 'set' as const, blobKey: key })

  it('выбор фото без правки текста ставит правку в очередь', () => {
    const { pending } = recordSave([], poems, '1', { ...draft('Первое', 'строка\nвторая'), cover: photo() }, NOW)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ kind: 'update', cover: { kind: 'set', blobKey: 'pending:1-a' } })
  })

  it('новый стих с фото: оно в create, «убрать» у нового ничего не значит', () => {
    const { pending } = recordSave([], poems, null, { ...draft('Новое', 'а'), cover: photo() }, NOW)
    expect(pending[0]).toMatchObject({ kind: 'create', cover: { kind: 'set' } })

    const none = recordSave([], poems, null, { ...draft('Новое', 'а'), cover: { kind: 'remove' } }, NOW)
    expect(none.pending[0]!.cover).toBeUndefined()
  })

  it('убрать можно только обложку, которая есть на сайте', () => {
    const noCover = recordSave([], poems, '1', { ...draft('Первое', 'строка\nвторая'), cover: { kind: 'remove' } }, NOW)
    expect(noCover.pending).toEqual([])

    const removed = recordSave(
      [],
      withCover,
      '1',
      { ...draft('Первое', 'строка\nвторая'), cover: { kind: 'remove' } },
      NOW,
    )
    expect(removed.pending[0]).toMatchObject({ kind: 'update', cover: { kind: 'remove' } })
  })

  it('повторная правка текста сохраняет уже загруженное фото', () => {
    const first = recordSave([], poems, '1', { ...draft('Первое', 'раз'), cover: photo() }, NOW).pending
    const uploaded = attachUploads(first, { '1': { blobKey: 'pending:1-a', path: 'poems/temp/new.jpg' } })
    const again = recordSave(uploaded, poems, '1', { ...draft('Первое', 'два'), cover: photo() }, NOW).pending
    expect(again[0]!.cover).toEqual({ kind: 'set', blobKey: 'pending:1-a', uploaded: 'poems/temp/new.jpg' })

    const replaced = recordSave(uploaded, poems, '1', { ...draft('Первое', 'два'), cover: photo('pending:2-b') }, NOW)
    expect(replaced.pending[0]!.cover).toEqual({ kind: 'set', blobKey: 'pending:2-b' })
  })

  it('отмена всех правок (в том числе обложки) убирает запись из очереди', () => {
    const first = recordSave([], poems, '1', { ...draft('Первое', 'строка\nвторая'), cover: photo() }, NOW).pending
    const back = recordSave(first, poems, '1', draft('Первое', 'строка\nвторая'), NOW).pending
    expect(back).toEqual([])
  })

  it('mergePoems показывает фото с телефона и скрытую обложку', () => {
    const set = recordSave([], withCover, '1', { ...draft('Первое', 'строка\nвторая'), cover: photo() }, NOW).pending
    expect(coverSource(mergePoems(withCover, set)[0]!)).toEqual({ blobKey: 'pending:1-a', path: null })

    const removed =
      recordSave([], withCover, '1', { ...draft('Первое', 'строка\nвторая'), cover: { kind: 'remove' } }, NOW)
        .pending
    expect(coverSource(mergePoems(withCover, removed)[0]!)).toEqual({ blobKey: null, path: null })
    expect(coverSource(mergePoems(withCover, [])[0]!)).toEqual({ blobKey: null, path: 'poems/temp/old.jpg' })
  })

  it('на сервер уходит только загруженное фото; удаление — null', () => {
    const set = recordSave([], poems, '1', { ...draft('Первое', 'раз'), cover: photo() }, NOW).pending
    expect(toWireChanges(set)[0]).not.toHaveProperty('coverImage')

    const uploaded = attachUploads(set, { '1': { blobKey: 'pending:1-a', path: 'poems/temp/new.jpg' } })
    expect(toWireChanges(uploaded)[0]).toMatchObject({ coverImage: 'poems/temp/new.jpg' })

    const removed =
      recordSave([], withCover, '1', { ...draft('Первое', 'строка\nвторая'), cover: { kind: 'remove' } }, NOW)
        .pending
    expect(toWireChanges(removed)[0]).toMatchObject({ coverImage: null })
  })

  it('результат загрузки игнорируется, если фото успели заменить; потерянное фото снимается с правки', () => {
    const set = recordSave([], poems, '1', { ...draft('Первое', 'раз'), cover: photo('pending:2-b') }, NOW).pending
    expect(attachUploads(set, { '1': { blobKey: 'pending:1-a', path: 'poems/temp/x.jpg' } })).toEqual(set)
    expect(attachUploads(set, { '1': { blobKey: 'pending:2-b', path: null } })[0]!.cover).toBeUndefined()
  })

  it('доехавшие текст и фото очищают очередь; фото без загрузки остаётся в ней', () => {
    const set = recordSave([], poems, '1', { ...draft('Первое', 'раз'), cover: photo() }, NOW).pending
    const serverNoCover = { ...poems[0]!, text: 'раз', updatedAt: '2026-10-07T13:00:02.000Z', coverImage: null }

    // фото ещё не загружено: правка остаётся, но уже только про фото и от свежей версии
    const kept = applySyncResults(set, { '1': NOW }, [{ id: '1', status: 'ok', poem: serverNoCover }])
    expect(kept.pending).toHaveLength(1)
    expect(kept.pending[0]).toMatchObject({
      baseUpdatedAt: serverNoCover.updatedAt,
      cover: { kind: 'set', blobKey: 'pending:1-a' },
    })

    // фото загружено и привязано
    const uploaded = attachUploads(set, { '1': { blobKey: 'pending:1-a', path: 'poems/temp/new.jpg' } })
    const done = applySyncResults(uploaded, { '1': NOW }, [
      { id: '1', status: 'ok', poem: { ...serverNoCover, coverImage: 'poems/temp/new.jpg' } },
    ])
    expect(done.pending).toEqual([])
    expect(pendingBlobKeys(done.pending)).toEqual([])
  })

  it('удаление стиха выбрасывает фото из очереди', () => {
    const set = recordSave([], poems, '1', { ...draft('Первое', 'раз'), cover: photo() }, NOW).pending
    expect(pendingBlobKeys(set)).toEqual(['pending:1-a'])
    expect(pendingBlobKeys(recordDelete(set, poems, '1', NOW))).toEqual([])
  })
})

describe('очередь в localStorage', () => {
  it('сохраняется и читается', () => {
    const pending = recordSave([], poems, '1', draft('Первое', 'моё'), NOW).pending
    expect(savePending(pending)).toBe(true)
    expect(loadPending()).toEqual(pending)
  })

  it('битые записи отбрасываются', () => {
    localStorage.setItem('grandslamcup-reader-pending', JSON.stringify([{ id: 1 }, 'мусор']))
    expect(loadPending()).toEqual([])
  })
})

describe('syncSnapshot с очередью', () => {
  it('отправляет правки POST-ом и возвращает итоги', async () => {
    const pending = recordSave([], poems, '1', draft('Первое', 'моё'), NOW).pending
    const body = { poetName: 'Поэт', syncedAt: NOW, poems, results: [{ id: '1', status: 'ok', poem: poems[0] }] }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await syncSnapshot(pending)

    expect(fetchMock).toHaveBeenCalledWith('/api/poet/poems', expect.objectContaining({ method: 'POST' }))
    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(sentBody.changes).toHaveLength(1)
    expect(result).toMatchObject({ status: 'ok', sent: { '1': NOW } })
  })
})
