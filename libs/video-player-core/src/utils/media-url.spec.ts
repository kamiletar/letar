import { describe, expect, it } from 'vitest'
import {
  extractCidFromUrl,
  getAudioUrl,
  getFontUrl,
  getMediaUrls,
  getSubtitleUrl,
  getVideoUrl,
  isIpfsUrl,
  toMediaUrl,
  toPlayableUrl,
} from './media-url'

describe('toMediaUrl', () => {
  it('возвращает null для отсутствующего пути', () => {
    expect(toMediaUrl(null)).toBeNull()
    expect(toMediaUrl(undefined)).toBeNull()
    expect(toMediaUrl('')).toBeNull()
  })

  it('оставляет уже media:// URL без изменений', () => {
    expect(toMediaUrl('media://C:/Users/test/poster.webp')).toBe('media://C:/Users/test/poster.webp')
  })

  it('конвертирует file:/// URL (тройной слэш) в media://', () => {
    expect(toMediaUrl('file:///C:/Users/test/poster.webp')).toBe('media://C:/Users/test/poster.webp')
  })

  it('конвертирует file:// URL (двойной слэш) в media://', () => {
    expect(toMediaUrl('file://C:/Users/test/poster.webp')).toBe('media://C:/Users/test/poster.webp')
  })

  it('конвертирует обычный путь без file:// префикса', () => {
    expect(toMediaUrl('C:/Users/test/poster.webp')).toBe('media://C:/Users/test/poster.webp')
  })
})

describe('toPlayableUrl', () => {
  it('приоритизирует IPFS CID над путём', () => {
    expect(toPlayableUrl({ cid: 'QmTest123', path: '/path/to/file.mp4' })).toBe('http://localhost:8765/ipfs/QmTest123')
  })

  it('использует путь, если CID отсутствует', () => {
    expect(toPlayableUrl({ path: '/path/to/file.mp4' })).toBe('media:///path/to/file.mp4')
  })

  it('возвращает уже готовый http(s) URL без изменений', () => {
    expect(toPlayableUrl({ path: 'http://example.com/video.mp4' })).toBe('http://example.com/video.mp4')
    expect(toPlayableUrl({ path: 'https://example.com/video.mp4' })).toBe('https://example.com/video.mp4')
  })

  it('возвращает уже готовый media:// URL без изменений', () => {
    expect(toPlayableUrl({ path: 'media://C:/video.mp4' })).toBe('media://C:/video.mp4')
  })

  it('нормализует Windows-обратные слэши в прямые', () => {
    expect(toPlayableUrl({ path: 'C:\\Users\\test\\video.mp4' })).toBe('media://C:/Users/test/video.mp4')
  })

  it('возвращает null, если нет ни cid, ни path', () => {
    expect(toPlayableUrl({})).toBeNull()
    expect(toPlayableUrl({ cid: null, path: null })).toBeNull()
  })

  it('игнорирует пустую строку cid и использует path', () => {
    expect(toPlayableUrl({ cid: '', path: '/a/b.mp4' })).toBe('media:///a/b.mp4')
  })
})

describe('getVideoUrl / getAudioUrl / getSubtitleUrl / getFontUrl', () => {
  it('getVideoUrl строит URL из transcodedCid/transcodedPath', () => {
    expect(getVideoUrl({ transcodedCid: 'QmVideo', transcodedPath: null })).toBe('http://localhost:8765/ipfs/QmVideo')
    expect(getVideoUrl({ transcodedPath: '/v.mp4' })).toBe('media:///v.mp4')
    expect(getVideoUrl({})).toBeNull()
  })

  it('getAudioUrl строит URL из transcodedCid/transcodedPath', () => {
    expect(getAudioUrl({ transcodedCid: 'QmAudio' })).toBe('http://localhost:8765/ipfs/QmAudio')
    expect(getAudioUrl({ transcodedPath: '/a.mp3' })).toBe('media:///a.mp3')
  })

  it('getSubtitleUrl строит URL из fileCid/filePath', () => {
    expect(getSubtitleUrl({ fileCid: 'QmSub' })).toBe('http://localhost:8765/ipfs/QmSub')
    expect(getSubtitleUrl({ filePath: '/sub.srt' })).toBe('media:///sub.srt')
  })

  it('getFontUrl строит URL из fileCid/filePath', () => {
    expect(getFontUrl({ fileCid: 'QmFont' })).toBe('http://localhost:8765/ipfs/QmFont')
    expect(getFontUrl({ filePath: '/font.ttf' })).toBe('media:///font.ttf')
  })
})

describe('getMediaUrls', () => {
  it('строит массив URL и отфильтровывает null', () => {
    expect(
      getMediaUrls([
        { cid: 'Qm1' },
        { path: '/x.mp4' },
        { cid: null, path: null },
      ]),
    ).toEqual(['http://localhost:8765/ipfs/Qm1', 'media:///x.mp4'])
  })

  it('возвращает пустой массив для пустого входа', () => {
    expect(getMediaUrls([])).toEqual([])
  })
})

describe('isIpfsUrl', () => {
  it('распознаёт IPFS URL', () => {
    expect(isIpfsUrl('http://localhost:8765/ipfs/QmTest')).toBe(true)
  })

  it('не распознаёт обычный URL как IPFS', () => {
    expect(isIpfsUrl('http://example.com/video.mp4')).toBe(false)
    expect(isIpfsUrl('media:///path/to/file.mp4')).toBe(false)
  })
})

describe('extractCidFromUrl', () => {
  it('извлекает CID из IPFS URL', () => {
    expect(extractCidFromUrl('http://localhost:8765/ipfs/QmTest123')).toBe('QmTest123')
  })

  it('извлекает CID, останавливаясь на следующем слэше', () => {
    expect(extractCidFromUrl('http://localhost:8765/ipfs/QmTest123/subpath')).toBe('QmTest123')
  })

  it('возвращает null, если CID не найден', () => {
    expect(extractCidFromUrl('http://example.com/video.mp4')).toBeNull()
  })
})
