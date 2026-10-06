import { describe, expect, it } from 'vitest'
import { enqueue, markSynced, type OutboxItem } from './outbox'

const item = (patch: Partial<OutboxItem> = {}): OutboxItem => ({
  localId: 'l1',
  noteId: 'n1',
  baseVersionId: 'v1',
  title: 'Т',
  body: 'текст',
  deviceId: 'phone',
  queuedAt: 100,
  ...patch,
})

describe('enqueue', () => {
  it('добавляет правку в пустую очередь', () => {
    expect(enqueue([], item())).toEqual([item()])
  })

  it('правки одной заметки склеиваются: остаётся последний текст и самая первая база', () => {
    const queue = enqueue(
      [item({ body: 'раз', baseVersionId: 'v1', queuedAt: 100 })],
      item({ body: 'раз два', baseVersionId: 'v1', queuedAt: 200 }),
    )
    expect(queue).toEqual([item({ body: 'раз два', baseVersionId: 'v1', queuedAt: 100 })])
  })

  it('склейка сохраняет базу первой правки, даже если у новой она другая', () => {
    const queue = enqueue([item({ baseVersionId: 'v1' })], item({ baseVersionId: 'v9', body: 'другое' }))
    expect(queue[0]).toMatchObject({ baseVersionId: 'v1', body: 'другое' })
  })

  it('новая заметка без noteId склеивается по localId', () => {
    const first = item({ noteId: null, baseVersionId: null, body: 'а' })
    const queue = enqueue([first], item({ noteId: null, baseVersionId: null, body: 'аб' }))
    expect(queue).toHaveLength(1)
    expect(queue[0].body).toBe('аб')
  })

  it('разные заметки идут отдельными элементами в порядке постановки', () => {
    const queue = enqueue([item()], item({ localId: 'l2', noteId: 'n2' }))
    expect(queue.map((i) => i.noteId)).toEqual(['n1', 'n2'])
  })

  it('не меняет исходный массив', () => {
    const original = [item()]
    enqueue(original, item({ body: 'новое' }))
    expect(original[0].body).toBe('текст')
  })
})

describe('markSynced', () => {
  const sent = item({ body: 'отправлено' })

  it('убирает отправленный элемент, если за время отправки его не меняли', () => {
    expect(markSynced([sent], sent, { noteId: 'n1', versionId: 'v2' })).toEqual([])
  })

  it('если текст менялся во время отправки, элемент остаётся с новой базой', () => {
    const edited = item({ body: 'отправлено и дописано' })
    expect(markSynced([edited], sent, { noteId: 'n1', versionId: 'v2' })).toEqual([
      { ...edited, baseVersionId: 'v2' },
    ])
  })

  it('новая заметка получает id с сервера', () => {
    const created = item({ noteId: null, baseVersionId: null })
    const edited = { ...created, body: 'дописано' }
    expect(markSynced([edited], created, { noteId: 'n7', versionId: 'v1' })).toEqual([
      { ...edited, noteId: 'n7', baseVersionId: 'v1' },
    ])
  })

  it('версия не создавалась (текст не менялся) — база остаётся прежней', () => {
    const edited = item({ body: 'другое' })
    expect(markSynced([edited], sent, { noteId: 'n1', versionId: null })).toEqual([edited])
  })

  it('чужие элементы очереди не трогает', () => {
    const other = item({ localId: 'l2', noteId: 'n2' })
    expect(markSynced([sent, other], sent, { noteId: 'n1', versionId: 'v2' })).toEqual([other])
  })
})
