/**
 * Тесты для opfs-utils.
 */

import {
  ALLOWED_MIME_TYPES,
  AUDIO_DIR,
  generateId,
  getFileNameWithoutExtension,
  MAX_FILE_SIZE,
  METADATA_FILE,
  MIME_TO_EXTENSION,
} from '../opfs-utils'

// Эти функции требуют OPFS API, которое недоступно в jsdom.
// Тестируем только чистые функции и константы.

describe('opfs-utils constants', () => {
  describe('AUDIO_DIR', () => {
    it('должен быть строкой', () => {
      expect(typeof AUDIO_DIR).toBe('string')
      expect(AUDIO_DIR).toBe('mandala-audio')
    })
  })

  describe('METADATA_FILE', () => {
    it('должен быть metadata.json', () => {
      expect(METADATA_FILE).toBe('metadata.json')
    })
  })

  describe('ALLOWED_MIME_TYPES', () => {
    it('должен содержать MP3', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/mpeg')
    })

    it('должен содержать WAV', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/wav')
    })

    it('должен содержать OGG', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/ogg')
    })

    it('должен содержать M4A форматы', () => {
      expect(ALLOWED_MIME_TYPES).toContain('audio/mp4')
      expect(ALLOWED_MIME_TYPES).toContain('audio/x-m4a')
    })

    it('должен иметь 5 поддерживаемых типов', () => {
      expect(ALLOWED_MIME_TYPES).toHaveLength(5)
    })
  })

  describe('MAX_FILE_SIZE', () => {
    it('должен быть 100 МБ', () => {
      expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024)
    })
  })

  describe('MIME_TO_EXTENSION', () => {
    it('должен маппить audio/mpeg на mp3', () => {
      expect(MIME_TO_EXTENSION['audio/mpeg']).toBe('mp3')
    })

    it('должен маппить audio/wav на wav', () => {
      expect(MIME_TO_EXTENSION['audio/wav']).toBe('wav')
    })

    it('должен маппить audio/ogg на ogg', () => {
      expect(MIME_TO_EXTENSION['audio/ogg']).toBe('ogg')
    })

    it('должен маппить audio/mp4 на m4a', () => {
      expect(MIME_TO_EXTENSION['audio/mp4']).toBe('m4a')
    })

    it('должен маппить audio/x-m4a на m4a', () => {
      expect(MIME_TO_EXTENSION['audio/x-m4a']).toBe('m4a')
    })

    it('должен вернуть undefined для неизвестного типа', () => {
      expect(MIME_TO_EXTENSION['audio/unknown']).toBeUndefined()
    })
  })
})

describe('generateId', () => {
  it('должен генерировать строку', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('должен генерировать уникальные ID', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })

  it('должен генерировать валидный UUID формат', () => {
    const id = generateId()
    // UUID формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
    expect(id).toMatch(uuidRegex)
  })
})

describe('getFileNameWithoutExtension', () => {
  it('должен убрать расширение .mp3', () => {
    expect(getFileNameWithoutExtension('song.mp3')).toBe('song')
  })

  it('должен убрать расширение .wav', () => {
    expect(getFileNameWithoutExtension('audio.wav')).toBe('audio')
  })

  it('должен обработать имя с несколькими точками', () => {
    expect(getFileNameWithoutExtension('my.song.file.ogg')).toBe('my.song.file')
  })

  it('должен вернуть имя как есть если нет расширения', () => {
    expect(getFileNameWithoutExtension('filename')).toBe('filename')
  })

  it('должен обработать имя начинающееся с точки', () => {
    // .hidden — это имя файла, не расширение
    expect(getFileNameWithoutExtension('.hidden')).toBe('.hidden')
  })

  it('должен обработать пустую строку', () => {
    expect(getFileNameWithoutExtension('')).toBe('')
  })

  it('должен обработать файл с очень длинным расширением', () => {
    expect(getFileNameWithoutExtension('file.longextension')).toBe('file')
  })

  it('должен обработать кириллическое имя', () => {
    expect(getFileNameWithoutExtension('музыка.mp3')).toBe('музыка')
  })

  it('должен обработать имя с пробелами', () => {
    expect(getFileNameWithoutExtension('my song.mp3')).toBe('my song')
  })
})

// Тесты для функций работающих с OPFS API требуют мокирования браузерного API
// Эти тесты можно добавить при использовании happy-dom или playwright

describe('OPFS functions (integration)', () => {
  describe('getAudioDirectory', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('saveFile', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('readFile', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('deleteFile', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('loadMetadata', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('saveMetadata', () => {
    it.skip('требует OPFS API (недоступно в jsdom)', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })

  describe('validateAudioFile', () => {
    it.skip('требует AudioContext API', () => {
      // Для интеграционных тестов нужен браузерный контекст
    })
  })
})
