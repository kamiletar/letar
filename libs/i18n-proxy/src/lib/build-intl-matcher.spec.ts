import { describe, expect, it } from 'vitest'

import { buildIntlMatcher } from './build-intl-matcher'

describe('buildIntlMatcher', () => {
  it('без опций даёт matcher только с исключением статики по точке в пути', () => {
    expect(buildIntlMatcher()).toEqual(['/((?!.*\\..*).*)', '/'])
  })

  it('добавляет excludePrefixes и metadataRoutes в один negative lookahead', () => {
    const matcher = buildIntlMatcher({
      excludePrefixes: ['api', '_next/static', '_next/image'],
      metadataRoutes: ['icon', 'apple-icon', 'opengraph-image', 'twitter-image'],
    })

    expect(matcher).toEqual([
      '/((?!api|_next/static|_next/image|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)',
      '/',
    ])
  })

  it('воспроизводит буквальный matcher apps/studio/src/proxy.ts', () => {
    const matcher = buildIntlMatcher({
      excludePrefixes: ['api', '_next/static', '_next/image'],
      metadataRoutes: ['icon', 'apple-icon', 'opengraph-image', 'twitter-image'],
    })

    expect(matcher[0]).toBe(
      '/((?!api|_next/static|_next/image|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)',
    )
  })
})
