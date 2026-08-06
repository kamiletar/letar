// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { createMediaUrlHelpers } from './media-url'

const toPlayerUrl = (cid: string) => `https://gateway.test/ipfs/${cid}`

describe('createMediaUrlHelpers', () => {
  it('toPlayerUrl — прокидывает переданную функцию как есть', () => {
    const helpers = createMediaUrlHelpers(toPlayerUrl)
    expect(helpers.toPlayerUrl('CID1')).toBe('https://gateway.test/ipfs/CID1')
  })

  it('getVideoUrl — строит URL из video.cid', () => {
    const helpers = createMediaUrlHelpers(toPlayerUrl)
    expect(helpers.getVideoUrl({ cid: 'VIDEO_CID' })).toBe('https://gateway.test/ipfs/VIDEO_CID')
  })

  describe('getAudioUrl', () => {
    it('возвращает URL, если cid присутствует', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getAudioUrl({ cid: 'AUDIO_CID' })).toBe('https://gateway.test/ipfs/AUDIO_CID')
    })

    it('возвращает null, если cid отсутствует', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getAudioUrl({})).toBeNull()
    })

    it('возвращает null, если cid явно null', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getAudioUrl({ cid: null })).toBeNull()
    })
  })

  describe('getSubtitleUrl', () => {
    it('возвращает URL, если cid присутствует', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getSubtitleUrl({ cid: 'SUB_CID' })).toBe('https://gateway.test/ipfs/SUB_CID')
    })

    it('возвращает null, если cid отсутствует', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getSubtitleUrl({})).toBeNull()
    })
  })

  describe('getFontUrls', () => {
    it('возвращает пустой массив, если fonts не переданы', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getFontUrls()).toEqual([])
    })

    it('возвращает пустой массив для пустого массива fonts', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      expect(helpers.getFontUrls([])).toEqual([])
    })

    it('фильтрует записи без cid и строит URL только для валидных', () => {
      const helpers = createMediaUrlHelpers(toPlayerUrl)
      const result = helpers.getFontUrls([{ cid: 'FONT1' }, { cid: null }, {}, { cid: 'FONT2' }])
      expect(result).toEqual(['https://gateway.test/ipfs/FONT1', 'https://gateway.test/ipfs/FONT2'])
    })
  })

  it('каждый вызов create возвращает независимый набор хелперов, использующих переданный toPlayerUrl', () => {
    const other = createMediaUrlHelpers((cid) => `custom://${cid}`)
    expect(other.getVideoUrl({ cid: 'X' })).toBe('custom://X')
  })
})
