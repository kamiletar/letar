import { describe, expect, it } from 'vitest'
import { SCALE_PROTOTYPES } from './scale-prototypes'

describe('scale-prototypes', () => {
  it('все поля заполнены на обоих языках', () => {
    for (const p of SCALE_PROTOTYPES) {
      expect(p.group, 'group').toBeTruthy()
      expect(p.groupEn, `groupEn для ${p.group}`).toBeTruthy()
      expect(p.prototype, `prototype для ${p.group}`).toBeTruthy()
      expect(p.prototypeEn, `prototypeEn для ${p.group}`).toBeTruthy()
      expect(p.source, `source для ${p.group}`).toBeTruthy()
      expect(p.shortLabel, `shortLabel для ${p.group}`).toBeTruthy()
    }
  })

  it('DOI без префикса и без пробелов — страница подставляет его в ссылку', () => {
    for (const p of SCALE_PROTOTYPES) {
      expect(p.doi, `DOI для ${p.group}`).toMatch(/^10\.\S+$/)
      expect(p.doi.startsWith('https://'), `DOI для ${p.group} не должен быть URL`).toBe(false)
    }
  })

  it('группы не дублируются — group используется как React key', () => {
    const groups = SCALE_PROTOTYPES.map((p) => p.group)
    expect(new Set(groups).size).toBe(groups.length)
    const groupsEn = SCALE_PROTOTYPES.map((p) => p.groupEn)
    expect(new Set(groupsEn).size).toBe(groupsEn.length)
  })
})
