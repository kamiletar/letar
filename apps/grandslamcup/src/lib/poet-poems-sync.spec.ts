import { beforeEach, describe, expect, it, vi } from 'vitest'

const poemDb = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const deleteFile = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({ prisma: { poem: poemDb } }))
vi.mock('@letar/upload-validation', () => ({ deleteFileFromDisk: deleteFile }))

import { applyPoemChanges, SyncRequestSchema } from './poet-poems-sync'

const PLAYER = 'player-1'
const T0 = new Date('2026-10-01T10:00:00.000Z')
const T1 = new Date('2026-10-02T10:00:00.000Z')

function row(overrides: Record<string, unknown> = {}) {
  return { id: 'p1', title: 'Первое', text: 'текст', published: true, updatedAt: T0, playerId: PLAYER, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  poemDb.findUnique.mockResolvedValue(null)
  deleteFile.mockResolvedValue(undefined)
})

describe('SyncRequestSchema', () => {
  it('отбрасывает лишние поля и не принимает пустой текст', () => {
    const ok = SyncRequestSchema.safeParse({
      changes: [{ kind: 'create', id: 'a', title: 'T', text: 'x', published: false, playerId: 'чужой' }],
    })
    expect(ok.success).toBe(true)
    expect(ok.success && 'playerId' in ok.data.changes[0]!).toBe(false)

    const empty = SyncRequestSchema.safeParse({
      changes: [{ kind: 'create', id: 'a', title: 'T', text: '', published: false }],
    })
    expect(empty.success).toBe(false)
  })
})

describe('обложка в правках', () => {
  const base = { kind: 'update' as const, id: 'p1', title: 'Первое', text: 'текст', published: true }
  const parse = (coverImage: unknown) =>
    SyncRequestSchema.safeParse({ changes: [{ ...base, baseUpdatedAt: T0.toISOString(), coverImage }] }).success

  it('принимает только свежезагруженный файл из временной папки или null', () => {
    expect(parse('poems/temp/1700000000-abc.jpg')).toBe(true)
    expect(parse(null)).toBe(true)
    expect(parse(undefined)).toBe(true)
    expect(parse('poems/temp/../../etc/passwd')).toBe(false)
    expect(parse('poems/temp/..')).toBe(false)
    expect(parse('poems/чужой-id/x.jpg')).toBe(false)
    expect(parse('https://evil.example/x.jpg')).toBe(false)
  })

  it('смена обложки без правки текста применяется и удаляет прежний файл', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ coverImage: 'poems/p1/old.jpg' }))
    poemDb.update.mockResolvedValue(row({ coverImage: 'poems/temp/new.jpg', updatedAt: T1 }))

    const [result] = await applyPoemChanges(PLAYER, [
      { ...base, baseUpdatedAt: T0.toISOString(), coverImage: 'poems/temp/new.jpg' },
    ])

    expect(result).toMatchObject({ status: 'ok', poem: { coverImage: 'poems/temp/new.jpg' } })
    expect(poemDb.update.mock.calls[0]![0].data).toMatchObject({ coverImage: 'poems/temp/new.jpg' })
    expect(deleteFile).toHaveBeenCalledWith('poems/p1/old.jpg')
  })

  it('null убирает обложку; без поля обложка не трогается', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ coverImage: 'poems/p1/old.jpg' }))
    poemDb.update.mockResolvedValue(row({ coverImage: null, updatedAt: T1 }))
    await applyPoemChanges(PLAYER, [{ ...base, baseUpdatedAt: T0.toISOString(), coverImage: null }])
    expect(poemDb.update.mock.calls[0]![0].data).toMatchObject({ coverImage: null })

    poemDb.findUnique.mockResolvedValueOnce(row({ coverImage: 'poems/p1/old.jpg' }))
    poemDb.update.mockResolvedValue(row({ text: 'другой', updatedAt: T1 }))
    await applyPoemChanges(PLAYER, [{ ...base, text: 'другой', baseUpdatedAt: T0.toISOString() }])
    expect(poemDb.update.mock.calls[1]![0].data).not.toHaveProperty('coverImage')
    expect(deleteFile).toHaveBeenCalledTimes(1)
  })

  it('повтор после потерянного ответа не пишет второй раз; сбой удаления файла правку не отменяет', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ coverImage: 'poems/temp/new.jpg', updatedAt: T1 }))
    const [again] = await applyPoemChanges(PLAYER, [
      { ...base, baseUpdatedAt: T0.toISOString(), coverImage: 'poems/temp/new.jpg' },
    ])
    expect(again).toMatchObject({ status: 'ok' })
    expect(poemDb.update).not.toHaveBeenCalled()

    deleteFile.mockRejectedValueOnce(new Error('диск'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    poemDb.findUnique.mockResolvedValueOnce(row({ coverImage: 'poems/p1/old.jpg' }))
    poemDb.update.mockResolvedValue(row({ coverImage: null, updatedAt: T1 }))
    const [removed] = await applyPoemChanges(PLAYER, [{ ...base, baseUpdatedAt: T0.toISOString(), coverImage: null }])
    expect(removed).toMatchObject({ status: 'ok' })
  })

  it('create с обложкой записывает её', async () => {
    poemDb.findFirst.mockResolvedValue(null)
    poemDb.create.mockResolvedValue(row({ id: 'srv', coverImage: 'poems/temp/new.jpg' }))
    await applyPoemChanges(PLAYER, [
      { kind: 'create', id: 'local-1', title: 'Новое', text: 'т', published: false, coverImage: 'poems/temp/new.jpg' },
    ])
    expect(poemDb.create.mock.calls[0]![0].data).toMatchObject({ coverImage: 'poems/temp/new.jpg' })
  })
})

describe('applyPoemChanges: update', () => {
  const change = {
    kind: 'update' as const,
    id: 'p1',
    title: 'Первое',
    text: 'новый',
    published: true,
    baseUpdatedAt: T0.toISOString(),
  }

  it('применяет правку, если стих на сайте не менялся', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row())
    poemDb.update.mockResolvedValue(row({ text: 'новый', updatedAt: T1 }))

    const [result] = await applyPoemChanges(PLAYER, [change])

    expect(result).toMatchObject({ status: 'ok', poem: { text: 'новый', updatedAt: T1.toISOString() } })
    // название не менялось — slug не трогаем
    expect(poemDb.update.mock.calls[0]![0].data).not.toHaveProperty('slug')
  })

  it('конфликт, если на сайте стих изменили: ничего не пишет и отдаёт серверную версию', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ text: 'чужая правка', updatedAt: T1 }))

    const [result] = await applyPoemChanges(PLAYER, [change])

    expect(result).toMatchObject({ status: 'conflict', server: { text: 'чужая правка' } })
    expect(poemDb.update).not.toHaveBeenCalled()
  })

  it('повтор после потерянного ответа — успех без второй записи', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ text: 'новый', updatedAt: T1 }))

    const [result] = await applyPoemChanges(PLAYER, [change])

    expect(result).toMatchObject({ status: 'ok' })
    expect(poemDb.update).not.toHaveBeenCalled()
  })

  it('чужой и несуществующий стих — missing', async () => {
    poemDb.findUnique.mockResolvedValueOnce(row({ playerId: 'другой' }))
    expect((await applyPoemChanges(PLAYER, [change]))[0]).toMatchObject({ status: 'missing' })

    poemDb.findUnique.mockResolvedValueOnce(null)
    expect((await applyPoemChanges(PLAYER, [change]))[0]).toMatchObject({ status: 'missing' })
    expect(poemDb.update).not.toHaveBeenCalled()
  })

  it('смена названия меняет slug', async () => {
    poemDb.findUnique
      .mockResolvedValueOnce(row()) // сам стих
      .mockResolvedValueOnce(null) // slug свободен
    poemDb.update.mockResolvedValue(row({ title: 'Другое', text: 'новый', updatedAt: T1 }))

    await applyPoemChanges(PLAYER, [{ ...change, title: 'Другое' }])

    expect(poemDb.update.mock.calls[0]![0].data).toMatchObject({ slug: 'drugoe' })
  })
})

describe('applyPoemChanges: create и delete', () => {
  const create = { kind: 'create' as const, id: 'local-1', title: 'Новое', text: 'текст', published: false }

  it('создаёт стих поэта', async () => {
    poemDb.findFirst.mockResolvedValue(null)
    poemDb.create.mockResolvedValue(row({ id: 'srv', title: 'Новое', published: false }))

    const [result] = await applyPoemChanges(PLAYER, [create])

    expect(result).toMatchObject({ id: 'local-1', status: 'ok', poem: { id: 'srv' } })
    expect(poemDb.create.mock.calls[0]![0].data).toMatchObject({ playerId: PLAYER, title: 'Новое', published: false })
  })

  it('повтор create после потерянного ответа не плодит дубль', async () => {
    poemDb.findFirst.mockResolvedValue(row({ id: 'srv', title: 'Новое' }))

    const [result] = await applyPoemChanges(PLAYER, [create])

    expect(result).toMatchObject({ status: 'ok', poem: { id: 'srv' } })
    expect(poemDb.create).not.toHaveBeenCalled()
  })

  it('удаляет свой стих; уже удалённый — успех; чужой — missing', async () => {
    poemDb.findUnique.mockResolvedValueOnce({ id: 'p1', playerId: PLAYER })
    expect((await applyPoemChanges(PLAYER, [{ kind: 'delete', id: 'p1' }]))[0]).toMatchObject({ status: 'ok' })
    expect(poemDb.delete).toHaveBeenCalledTimes(1)

    poemDb.findUnique.mockResolvedValueOnce(null)
    expect((await applyPoemChanges(PLAYER, [{ kind: 'delete', id: 'p1' }]))[0]).toMatchObject({ status: 'ok' })

    poemDb.findUnique.mockResolvedValueOnce({ id: 'p1', playerId: 'другой' })
    expect((await applyPoemChanges(PLAYER, [{ kind: 'delete', id: 'p1' }]))[0]).toMatchObject({ status: 'missing' })
    expect(poemDb.delete).toHaveBeenCalledTimes(1)
  })

  it('сбой одной правки не останавливает остальные', async () => {
    poemDb.findFirst.mockRejectedValueOnce(new Error('БД упала')).mockResolvedValueOnce(null)
    poemDb.create.mockResolvedValue(row({ id: 'srv2' }))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const results = await applyPoemChanges(PLAYER, [create, { ...create, id: 'local-2', title: 'Второе' }])

    expect(results.map((result) => result.status)).toEqual(['error', 'ok'])
  })
})
