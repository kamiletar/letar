import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMediaInfoText, parsePostFields, parseRutrackerPage, parseTitle } from '../rutracker-parser'

// Хелпер для загрузки HTML-фикстур
function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')
}

describe('parseTitle', () => {
  it('парсит стандартный заголовок аниме-раздачи', () => {
    const result = parseTitle(
      'Тетрадь Смерти / Death Note [TV] [37 из 37] [RUS(ext), JAP+Sub] [2006, психологический триллер, мистика, BDRip] [1080p]'
    )

    expect(result.nameRu).toBe('Тетрадь Смерти')
    expect(result.nameOriginal).toBe('Death Note')
    expect(result.type).toBe('TV')
    expect(result.episodeInfo).toBe('37 из 37')
    expect(result.episodeCount).toBe(37)
    expect(result.languages).toEqual(['RUS(ext)', 'JAP+Sub'])
    expect(result.year).toBe(2006)
    expect(result.genres).toContain('психологический триллер')
    expect(result.genres).toContain('мистика')
    expect(result.sourceType).toBe('BDRip')
    expect(result.resolution).toBe('1080p')
  })

  it('парсит заголовок с 720p и WEB-DL', () => {
    const result = parseTitle(
      'Эрго Прокси / Ergo Proxy [TV] [23 из 23] [RUS, JAP] [2006, научная фантастика, киберпанк, WEB-DL] [720p]'
    )

    expect(result.nameRu).toBe('Эрго Прокси')
    expect(result.nameOriginal).toBe('Ergo Proxy')
    expect(result.resolution).toBe('720p')
    expect(result.sourceType).toBe('WEB-DL')
    expect(result.episodeCount).toBe(23)
  })

  it('парсит заголовок с эпизодами 13+1', () => {
    const result = parseTitle(
      'Стальной алхимик / Fullmetal Alchemist [TV+Special] [13+1 из 13+1] [RUS] [2003, приключения, BDRip] [1080p]'
    )

    expect(result.type).toBe('TV+Special')
    expect(result.episodeInfo).toBe('13+1 из 13+1')
    expect(result.episodeCount).toBe(14)
  })

  it('парсит заголовок фильма без эпизодов', () => {
    const result = parseTitle('Акира / Akira [Movie] [RUS, JAP] [1988, научная фантастика, BDRip] [1080p]')

    expect(result.nameRu).toBe('Акира')
    expect(result.nameOriginal).toBe('Akira')
    expect(result.type).toBe('Movie')
    expect(result.episodeInfo).toBeUndefined()
    expect(result.year).toBe(1988)
  })

  it('парсит заголовок только с русским названием', () => {
    const result = parseTitle('Невероятное аниме [OVA] [3 из 3] [2020, комедия, WEB-DL] [1080p]')

    expect(result.nameRu).toBe('Невероятное аниме')
    expect(result.nameOriginal).toBe('Невероятное аниме')
    expect(result.type).toBe('OVA')
  })

  it('убирает <wbr> теги', () => {
    const result = parseTitle('Тетрадь<wbr> Смерти / Death<wbr> Note [TV] [2006, триллер, BDRip] [1080p]')

    expect(result.nameRu).toBe('Тетрадь Смерти')
    expect(result.nameOriginal).toBe('Death Note')
  })
})

describe('parseMediaInfoText', () => {
  it('парсит стандартный вывод MediaInfo', () => {
    const text = `
General
Complete name                            : video.mkv
Format                                   : Matroska

Video
Format                                   : AVC
Width                                    : 1 920 pixels
Height                                   : 1 080 pixels
Bit rate                                 : 6 500 kb/s
Frame rate                               : 23.976 fps
Bit depth                                : 10 bits

Audio #1
Format                                   : FLAC
Channel(s)                               : 2 channels
Language                                 : Japanese
Bit rate                                 : 800 kb/s

Audio #2
Format                                   : AC-3
Channel(s)                               : 6 channels
Language                                 : Russian
Bit rate                                 : 448 kb/s
    `

    const result = parseMediaInfoText(text)

    expect(result).toBeDefined()
    expect(result!.videoCodec).toBe('x264')
    expect(result!.width).toBe(1920)
    expect(result!.height).toBe(1080)
    expect(result!.videoBitrate).toBe(6500)
    expect(result!.fps).toBe(23.976)
    expect(result!.bitDepth).toBe(10)
    expect(result!.audioTracks).toHaveLength(2)
    expect(result!.audioTracks[0]).toEqual({
      codec: 'FLAC',
      channels: '2.0',
      language: 'Japanese',
      bitrate: 800,
    })
    expect(result!.audioTracks[1]).toEqual({
      codec: 'AC3',
      channels: '5.1',
      language: 'Russian',
      bitrate: 448,
    })
  })

  it('парсит HEVC видео', () => {
    const text = `
Video
Format                                   : HEVC
Width                                    : 3 840 pixels
Height                                   : 2 160 pixels
Bit rate                                 : 12.5 Mb/s
Frame rate                               : 24.000 fps
Bit depth                                : 10 bits
    `

    const result = parseMediaInfoText(text)

    expect(result!.videoCodec).toBe('HEVC')
    expect(result!.width).toBe(3840)
    expect(result!.height).toBe(2160)
    expect(result!.videoBitrate).toBe(12500)
  })

  it('возвращает undefined для пустого текста', () => {
    expect(parseMediaInfoText('')).toBeUndefined()
    expect(parseMediaInfoText('какой-то рандомный текст')).toBeUndefined()
  })
})

describe('parseRutrackerPage — Death Note (полная раздача)', () => {
  const html = loadFixture('death-note-tv.html')
  const url = 'https://rutracker.org/forum/viewtopic.php?t=4501198'

  it('извлекает topicId из URL', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.topicId).toBe(4501198)
  })

  it('парсит названия из заголовка', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.nameRu).toBe('Тетрадь Смерти')
    expect(result.nameOriginal).toBe('Death Note')
  })

  it('парсит тип и эпизоды', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.type).toBe('TV')
    expect(result.episodeCount).toBe(37)
    expect(result.resolution).toBe('1080p')
  })

  it('парсит поля из тела поста', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.country).toBe('Япония')
    expect(result.year).toBe(2006)
    expect(result.director).toBe('Араки Тэцуро')
    expect(result.studio).toBe('Madhouse')
    expect(result.genres).toContain('психологический триллер')
  })

  it('парсит озвучки и субтитры', () => {
    const result = parseRutrackerPage(html, url)

    const dubs = result.dubGroups.filter((g) => g.type === 'dub')
    const subs = result.dubGroups.filter((g) => g.type === 'sub')

    expect(dubs).toHaveLength(3)
    expect(dubs[0].name).toBe('MC Entertainment')
    expect(dubs[1].name).toBe('2x2')
    expect(dubs[2].name).toBe('AniDUB')
    expect(dubs[2].details).toBe('FAN')

    expect(subs).toHaveLength(2)
    expect(subs[0].name).toBe('Нотка')
    expect(subs[1].name).toBe('HorribleSubs')
  })

  it('парсит внешние ссылки', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.externalLinks.shikimoriUrl).toBe('https://shikimori.one/animes/z1535-death-note')
    expect(result.externalLinks.shikimoriId).toBe(1535)
    expect(result.externalLinks.malUrl).toBe('https://myanimelist.net/anime/1535/Death_Note')
    expect(result.externalLinks.malId).toBe(1535)
    expect(result.externalLinks.anidbUrl).toBe('https://anidb.net/anime/4563')
  })

  it('парсит MediaInfo', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.mediaInfo).toBeDefined()
    expect(result.mediaInfo!.videoCodec).toBe('x264')
    expect(result.mediaInfo!.width).toBe(1920)
    expect(result.mediaInfo!.height).toBe(1080)
    expect(result.mediaInfo!.audioTracks).toHaveLength(2)
  })

  it('извлекает магнет-ссылку', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.magnetLink).toContain('magnet:?xt=urn:btih:')
    expect(result.magnetLink).toContain('AABBCCDD')
  })

  it('извлекает постер (var.postImg)', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.posterUrl).toBe('https://static.rutracker.cc/posters/death-note.jpg')
  })

  it('извлекает размер раздачи', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.sizeText).toBe('51.2 GB')
  })

  it('извлекает список файлов', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.fileList).toBeDefined()
    expect(result.fileList).toHaveLength(3)
    expect(result.fileList![0]).toContain('Death Note - 01')
  })
})

describe('parseRutrackerPage — Ergo Proxy (минимальная раздача)', () => {
  const html = loadFixture('ergo-proxy-minimal.html')
  const url = 'https://rutracker.org/forum/viewtopic.php?t=9876543'

  it('парсит базовые поля', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.topicId).toBe(9876543)
    expect(result.nameRu).toBe('Эрго Прокси')
    expect(result.nameOriginal).toBe('Ergo Proxy')
    expect(result.resolution).toBe('720p')
  })

  it('извлекает постер (img.postImg)', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.posterUrl).toBe('https://i.postimg.cc/ergo-proxy.jpg')
  })

  it('обрабатывает отсутствие MediaInfo', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.mediaInfo).toBeUndefined()
  })

  it('обрабатывает отсутствие списка файлов', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.fileList).toBeUndefined()
  })

  it('парсит Shikimori ссылку с числовым ID (без z-префикса)', () => {
    const result = parseRutrackerPage(html, url)
    expect(result.externalLinks.shikimoriId).toBe(790)
  })
})

describe('parsePostFields', () => {
  it('парсит ключ-значение из span.post-b', () => {
    const cheerio = require('cheerio')
    const $ = cheerio.load(`
      <div class="post_body">
        <span class="post-b">Страна</span>: Япония<br>
        <span class="post-b">Год</span>: 2006<br>
      </div>
    `)

    const fields = parsePostFields($, $('div.post_body').first())

    expect(fields['Страна']).toBe('Япония')
    expect(fields['Год']).toBe('2006')
  })
})
