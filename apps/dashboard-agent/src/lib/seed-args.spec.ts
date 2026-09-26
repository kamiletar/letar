import { describe, expect, it } from 'vitest'
import { parseSeedArgs } from './seed-args'

describe('parseSeedArgs', () => {
  it('не передано или null — пустой список без ошибки, seed не нужен', () => {
    expect(parseSeedArgs(undefined, false)).toEqual({ ok: true, args: [] })
    expect(parseSeedArgs(null, false)).toEqual({ ok: true, args: [] })
    expect(parseSeedArgs([], false)).toEqual({ ok: true, args: [] })
  })

  it('--sync-texts и --dry-run вместе с seed: true — допустимы', () => {
    expect(parseSeedArgs(['--sync-texts'], true)).toEqual({ ok: true, args: ['--sync-texts'] })
    expect(parseSeedArgs(['--sync-texts', '--dry-run'], true)).toEqual({
      ok: true,
      args: ['--sync-texts', '--dry-run'],
    })
  })

  it('дубли схлопываются', () => {
    expect(parseSeedArgs(['--sync-texts', '--sync-texts'], true)).toEqual({ ok: true, args: ['--sync-texts'] })
  })

  it('значение вне белого списка — отказ (в том числе попытка инъекции)', () => {
    for (const bad of ['--fresh', '--sync-texts; rm -rf /', '--sync-texts --fresh', '', 42, {}]) {
      expect(parseSeedArgs([bad], true).ok).toBe(false)
    }
  })

  it('не массив — отказ', () => {
    expect(parseSeedArgs('--sync-texts', true).ok).toBe(false)
  })

  it('seedArgs без seed: true — отказ', () => {
    const r = parseSeedArgs(['--sync-texts'], false)
    expect(r).toEqual({ ok: false, error: 'seedArgs требует seed: true' })
  })

  it('--dry-run без --sync-texts — отказ', () => {
    expect(parseSeedArgs(['--dry-run'], true).ok).toBe(false)
  })
})
