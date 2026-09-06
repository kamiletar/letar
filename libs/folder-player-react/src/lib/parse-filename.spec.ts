import { describe, expect, it } from 'vitest'
import { parseEpisodeInfo, parseEpisodeNumber } from './parse-filename'

describe('parseEpisodeInfo', () => {
  describe('S01E01 формат', () => {
    it('S01E01', () => {
      expect(parseEpisodeInfo('S01E01 - Episode Name.mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('S02E13', () => {
      expect(parseEpisodeInfo('Anime S02E13.mkv')).toEqual({ number: 13, type: 'regular' })
    })
  })

  describe('Номер в начале строки', () => {
    it('01_Name — номер в начале', () => {
      expect(parseEpisodeInfo('01_Phi_Brain_TV_2_[ru_&_jp].mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('01.Name — номер в начале с точкой', () => {
      expect(parseEpisodeInfo('01.Episode Name.mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('01v2_Name — версия после номера', () => {
      expect(parseEpisodeInfo('01v2_Anime [1080p].mkv')).toEqual({ number: 1, type: 'regular' })
    })
  })

  describe('[SubGroup] формат', () => {
    it('[Group] Title - 01 [Quality].mkv', () => {
      expect(parseEpisodeInfo('[Group] Anime - 01 [1080p].mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('[Group] Title - 00 [Quality].mkv — нулевой эпизод (пролог)', () => {
      expect(parseEpisodeInfo('[DeadLine] One-Punch Man TV3 - 00 [Soer] [1080p].mkv')).toEqual({
        number: 0,
        type: 'regular',
      })
    })

    it('[Group] Title - 01 (Year) [Quality].mkv — год ПОСЛЕ номера', () => {
      // Это проблемный кейс, который нужно было исправить
      expect(parseEpisodeInfo('[SubsPlus+] Yofukashi no Uta 2 - 01 (2025) [WEB-DL 1080p x264 AAC].mkv')).toEqual({
        number: 1,
        type: 'regular',
      })
    })

    it('[Group] Title 2 - 10 (2025) [Quality].mkv — двузначный номер с годом после', () => {
      expect(parseEpisodeInfo('[SubsPlus+] Yofukashi no Uta 2 - 10 (2025) [WEB-DL 1080p x264 AAC].mkv')).toEqual({
        number: 10,
        type: 'regular',
      })
    })

    it('[Group] Title 2 - 12 (2025) [Quality].mkv — ещё один двузначный', () => {
      expect(parseEpisodeInfo('[SubsPlus+] Yofukashi no Uta 2 - 12 (2025) [WEB-DL 1080p x264 AAC].mkv')).toEqual({
        number: 12,
        type: 'regular',
      })
    })
  })

  describe('[NN] формат', () => {
    it('][01][ — формат [SubGroup][Anime][01][Quality]', () => {
      expect(parseEpisodeInfo('[SubGroup][Anime][01][1080p].mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('[01] — простой формат', () => {
      expect(parseEpisodeInfo('Anime [01].mkv')).toEqual({ number: 1, type: 'regular' })
    })
  })

  describe('Episode/Ep формат', () => {
    it('Episode 01', () => {
      expect(parseEpisodeInfo('Anime Episode 01.mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('Ep01', () => {
      expect(parseEpisodeInfo('Anime Ep01.mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('Ep.05', () => {
      expect(parseEpisodeInfo('Anime Ep.05.mkv')).toEqual({ number: 5, type: 'regular' })
    })
  })

  describe('OVA/Special формат', () => {
    it('OVA 01', () => {
      expect(parseEpisodeInfo('Anime OVA 01.mkv')).toEqual({ number: 1, type: 'ova' })
    })

    it('OVA01 — без пробела', () => {
      expect(parseEpisodeInfo('Anime OVA01.mkv')).toEqual({ number: 1, type: 'ova' })
    })

    it('Special 02', () => {
      expect(parseEpisodeInfo('Anime Special 02.mkv')).toEqual({ number: 2, type: 'ova' })
    })

    it('SP01', () => {
      expect(parseEpisodeInfo('Anime SP01.mkv')).toEqual({ number: 1, type: 'ova' })
    })

    it('][OVA1][ — OVA в скобках', () => {
      expect(parseEpisodeInfo('[Group][Anime][OVA1][1080p].mkv')).toEqual({ number: 1, type: 'ova' })
    })
  })

  describe('Суффикс в конце имени', () => {
    it('Name_01 — подчёркивание', () => {
      expect(parseEpisodeInfo('Anime_01.mkv')).toEqual({ number: 1, type: 'regular' })
    })

    it('Name-01 — дефис', () => {
      expect(parseEpisodeInfo('Anime-01.mkv')).toEqual({ number: 1, type: 'regular' })
    })
  })

  describe('Без расширения', () => {
    it('Работает без расширения', () => {
      expect(parseEpisodeInfo('[Group] Anime - 05')).toEqual({ number: 5, type: 'regular' })
    })
  })

  describe('Нет номера эпизода', () => {
    it('Возвращает null если нет номера', () => {
      expect(parseEpisodeInfo('Anime Movie.mkv')).toBeNull()
    })
  })
})

describe('parseEpisodeNumber', () => {
  it('Возвращает только номер', () => {
    expect(parseEpisodeNumber('[Group] Anime - 05 [1080p].mkv')).toBe(5)
  })

  it('Возвращает null если нет номера', () => {
    expect(parseEpisodeNumber('Anime Movie.mkv')).toBeNull()
  })
})
