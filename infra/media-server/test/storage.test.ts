/**
 * `videoUrls` — публичный контракт вебхука video.ready (libs/media-client): ключи ответа
 * (`320p`/`720p`/`1080p`/`poster`) не должны меняться при рефакторинге RENDITIONS/config.
 */
import { describe, expect, test } from 'bun:test'
import { videoUrls } from '../src/storage.ts'

describe('videoUrls', () => {
  test('собирает URL из RENDITIONS/POSTER_FILE и config.publicUrl', () => {
    const urls = videoUrls('svoichuzhie', 'vid123')

    expect(urls).toEqual({
      '320p': 'https://media.letar.best/v/svoichuzhie/vid123/320p.mp4',
      '720p': 'https://media.letar.best/v/svoichuzhie/vid123/720p.mp4',
      '1080p': 'https://media.letar.best/v/svoichuzhie/vid123/1080p.mp4',
      poster: 'https://media.letar.best/v/svoichuzhie/vid123/poster.jpg',
    })
  })
})
