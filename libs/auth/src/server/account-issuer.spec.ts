import { describe, expect, it } from 'vitest'
import { withCredentialAccountIssuer } from './account-issuer'

const call = (hooks: ReturnType<typeof withCredentialAccountIssuer>, account: Record<string, unknown>) =>
  hooks.account!.create!.before!(account as never, null)

describe('withCredentialAccountIssuer', () => {
  it('проставляет issuer credential-аккаунту без него', async () => {
    const result = await call(withCredentialAccountIssuer(), { providerId: 'credential', accountId: 'u1' })
    expect(result).toEqual({ data: { providerId: 'credential', accountId: 'u1', issuer: 'local:credential' } })
  })

  it('не трогает соц-аккаунт и уже заданный issuer', async () => {
    const hooks = withCredentialAccountIssuer()
    expect(await call(hooks, { providerId: 'google' })).toBeUndefined()
    expect(await call(hooks, { providerId: 'credential', issuer: 'x' })).toBeUndefined()
  })

  it('сохраняет чужие хуки и учитывает результат прежнего before', async () => {
    let userCreated = false
    const hooks = withCredentialAccountIssuer({
      user: { create: { after: async () => void (userCreated = true) } },
      account: { create: { before: async (a) => ({ data: { ...a, scope: 's' } }) } },
    })
    expect(hooks.user?.create?.after).toBeDefined()
    expect(await call(hooks, { providerId: 'credential' })).toEqual({
      data: { providerId: 'credential', scope: 's', issuer: 'local:credential' },
    })
    expect(userCreated).toBe(false)
  })

  it('уважает отказ прежнего before', async () => {
    const hooks = withCredentialAccountIssuer({ account: { create: { before: async () => false } } })
    expect(await call(hooks, { providerId: 'credential' })).toBe(false)
  })
})
