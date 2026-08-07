import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { UmamiScript } from './umami-script'

// React 19 хостит <script async src=...> как Resource в document.head (не в container рендера)
// и не убирает его оттуда между тестами — искать нужно по уникальному атрибуту, не первый script.
describe('UmamiScript', () => {
  const originalScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
  const originalWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
    delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  })

  afterEach(() => {
    if (originalScriptUrl === undefined) {
      delete process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
    } else {
      process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = originalScriptUrl
    }
    if (originalWebsiteId === undefined) {
      delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
    } else {
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = originalWebsiteId
    }
  })

  it('рендерит скрипт с явными props scriptUrl/websiteId', () => {
    const { container } = render(
      <UmamiScript scriptUrl="https://stats.letar.best/script.js" websiteId="explicit-id" />,
    )

    const script = document.head.querySelector('script[data-website-id="explicit-id"]')
    expect(script).not.toBeNull()
    expect(script).toHaveAttribute('src', 'https://stats.letar.best/script.js')
    expect(script).toHaveAttribute('async')
  })

  it('падает обратно на process.env.NEXT_PUBLIC_UMAMI_*, если props не переданы', () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = 'https://stats.letar.best/env-script.js'
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = 'env-id'

    const { container } = render(<UmamiScript />)

    const script = document.head.querySelector('script[data-website-id="env-id"]')
    expect(script).not.toBeNull()
    expect(script).toHaveAttribute('src', 'https://stats.letar.best/env-script.js')
  })

  it('props имеют приоритет над env-переменными', () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = 'https://stats.letar.best/env-script.js'
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = 'env-id'

    const { container } = render(
      <UmamiScript scriptUrl="https://stats.letar.best/prop-script.js" websiteId="prop-id" />,
    )

    const script = document.head.querySelector('script[data-website-id="prop-id"]')
    expect(script).not.toBeNull()
    expect(script).toHaveAttribute('src', 'https://stats.letar.best/prop-script.js')
  })

  it('возвращает null, если нет url (ни props, ни env)', () => {
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = 'env-id'

    const { container } = render(<UmamiScript />)

    expect(container).toBeEmptyDOMElement()
  })

  it('возвращает null, если нет id (ни props, ни env)', () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = 'https://stats.letar.best/env-script.js'

    const { container } = render(<UmamiScript />)

    expect(container).toBeEmptyDOMElement()
  })

  it('возвращает null, если hasConsent === false, даже при наличии url/id', () => {
    const { container } = render(
      <UmamiScript
        scriptUrl="https://stats.letar.best/script.js"
        websiteId="explicit-id"
        hasConsent={false}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('рендерится, если hasConsent === true', () => {
    const { container } = render(
      <UmamiScript
        scriptUrl="https://stats.letar.best/script.js"
        websiteId="explicit-id"
        hasConsent
      />,
    )

    expect(document.head.querySelector('script[data-website-id="explicit-id"]')).not.toBeNull()
  })

  it('рендерится, если hasConsent === undefined (обратная совместимость)', () => {
    const { container } = render(
      <UmamiScript scriptUrl="https://stats.letar.best/script.js" websiteId="explicit-id" />,
    )

    expect(document.head.querySelector('script[data-website-id="explicit-id"]')).not.toBeNull()
  })
})
