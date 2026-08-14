import { beforeEach, describe, expect, it } from 'vitest'
import { getHostLock, releaseHostLock, tryAcquireHostLock } from './host-lock'

/**
 * Ключевой сценарий — тот, что реально произошёл 2026-08-14 на s3: deploy(kami) и
 * e2e(form-example) стартовали одновременно, потому что у деплоя и e2e были раздельные
 * guard'ы, каждый видел только свою историю пустой. Здесь оба обязаны видеть друг друга.
 */
describe('host-lock', () => {
  beforeEach(() => {
    releaseHostLock()
  })

  it('свободный хост отдаёт лок', () => {
    expect(tryAcquireHostLock('deploy', 'kami')).toBe(true)
    expect(getHostLock()).toMatchObject({ kind: 'deploy', label: 'kami' })
  })

  it('деплой блокирует e2e на том же хосте', () => {
    expect(tryAcquireHostLock('deploy', 'kami')).toBe(true)
    expect(tryAcquireHostLock('e2e', 'form-example')).toBe(false)
    expect(getHostLock()).toMatchObject({ kind: 'deploy', label: 'kami' })
  })

  it('e2e блокирует деплой на том же хосте', () => {
    expect(tryAcquireHostLock('e2e', 'form-example')).toBe(true)
    expect(tryAcquireHostLock('deploy', 'kami')).toBe(false)
  })

  it('после release хост снова свободен', () => {
    tryAcquireHostLock('deploy', 'kami')
    releaseHostLock()
    expect(getHostLock()).toBeNull()
    expect(tryAcquireHostLock('e2e', 'form-example')).toBe(true)
  })

  it('release идемпотентен', () => {
    releaseHostLock()
    releaseHostLock()
    expect(getHostLock()).toBeNull()
  })
})
