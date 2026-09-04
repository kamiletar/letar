import { describe, expect, it, vi } from 'vitest'
import { resolveSlugOutcome } from './resolve-slug'

interface Entity {
  id: string
  title: string
}

interface GoneInfo {
  title: string
  deletedAt: Date
}

describe('resolveSlugOutcome', () => {
  it('возвращает found, если сущность найдена по текущему слагу', async () => {
    const entity: Entity = { id: '1', title: 'Дом' }
    const findCurrent = vi.fn().mockResolvedValue(entity)

    const outcome = await resolveSlugOutcome<Entity, GoneInfo>({ slug: 'dom', findCurrent })

    expect(outcome).toEqual({ kind: 'found', entity })
  })

  it('не зовёт findPreviousRedirect/findGone, если сущность уже найдена', async () => {
    const findCurrent = vi.fn().mockResolvedValue({ id: '1', title: 'Дом' })
    const findPreviousRedirect = vi.fn()
    const findGone = vi.fn()

    await resolveSlugOutcome<Entity, GoneInfo>({ slug: 'dom', findCurrent, findPreviousRedirect, findGone })

    expect(findPreviousRedirect).not.toHaveBeenCalled()
    expect(findGone).not.toHaveBeenCalled()
  })

  it('возвращает redirect, если слаг найден в истории переименований', async () => {
    const findCurrent = vi.fn().mockResolvedValue(null)
    const findPreviousRedirect = vi.fn().mockResolvedValue({ currentSlug: 'novy-dom' })

    const outcome = await resolveSlugOutcome<Entity, GoneInfo>({
      slug: 'stary-dom',
      findCurrent,
      findPreviousRedirect,
    })

    expect(outcome).toEqual({ kind: 'redirect', to: 'novy-dom' })
  })

  it('не зовёт findGone, если редирект уже найден', async () => {
    const findCurrent = vi.fn().mockResolvedValue(null)
    const findPreviousRedirect = vi.fn().mockResolvedValue({ currentSlug: 'novy-dom' })
    const findGone = vi.fn()

    await resolveSlugOutcome<Entity, GoneInfo>({ slug: 'stary-dom', findCurrent, findPreviousRedirect, findGone })

    expect(findGone).not.toHaveBeenCalled()
  })

  it('возвращает gone, если сущность найдена в архиве удалённых', async () => {
    const findCurrent = vi.fn().mockResolvedValue(null)
    const findPreviousRedirect = vi.fn().mockResolvedValue(null)
    const goneInfo: GoneInfo = { title: 'Дом', deletedAt: new Date('2026-01-01') }
    const findGone = vi.fn().mockResolvedValue(goneInfo)

    const outcome = await resolveSlugOutcome<Entity, GoneInfo>({
      slug: 'snesyonny-dom',
      findCurrent,
      findPreviousRedirect,
      findGone,
    })

    expect(outcome).toEqual({ kind: 'gone', info: goneInfo })
  })

  it('возвращает not-found, если ни один источник ничего не дал', async () => {
    const findCurrent = vi.fn().mockResolvedValue(null)
    const findPreviousRedirect = vi.fn().mockResolvedValue(null)
    const findGone = vi.fn().mockResolvedValue(null)

    const outcome = await resolveSlugOutcome<Entity, GoneInfo>({
      slug: 'nikogda-ne-bylo',
      findCurrent,
      findPreviousRedirect,
      findGone,
    })

    expect(outcome).toEqual({ kind: 'not-found' })
  })

  it('работает без findPreviousRedirect/findGone вовсе — возвращает not-found', async () => {
    const findCurrent = vi.fn().mockResolvedValue(null)

    const outcome = await resolveSlugOutcome<Entity, GoneInfo>({ slug: 'x', findCurrent })

    expect(outcome).toEqual({ kind: 'not-found' })
  })
})
