import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TurnstileProvider } from './turnstile'

type Params = Record<string, (...args: unknown[]) => void> & { sitekey: string; theme: string; size: string }

const SCRIPT_SELECTOR = 'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'

function installTurnstile() {
  const renderWidget = vi.fn((_container: HTMLElement, _params: Params) => 'widget-1')
  const remove = vi.fn()
  ;(window as unknown as { turnstile?: unknown }).turnstile = { render: renderWidget, remove }
  return { render: renderWidget, remove }
}

/** Скрипт «загрузился»: на странице появился `window.turnstile`, тег получил событие load */
async function finishLoading(): Promise<ReturnType<typeof installTurnstile>> {
  const api = installTurnstile()
  const script = document.querySelector(SCRIPT_SELECTOR)
  await act(async () => {
    script?.dispatchEvent(new Event('load'))
  })
  return api
}

beforeEach(() => {
  document.head.querySelectorAll(SCRIPT_SELECTOR).forEach((node) => node.remove())
  delete (window as unknown as { turnstile?: unknown }).turnstile
})

afterEach(() => {
  delete (window as unknown as { turnstile?: unknown }).turnstile
})

describe('TurnstileProvider (без @marsidev/react-turnstile)', () => {
  it('добавляет скрипт с render=explicit один раз, сколько бы виджетов ни было', () => {
    render(
      <>
        <TurnstileProvider siteKey="k1" onSuccess={vi.fn()} />
        <TurnstileProvider siteKey="k2" onSuccess={vi.fn()} />
      </>,
    )

    const scripts = document.head.querySelectorAll(SCRIPT_SELECTOR)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('src')).toContain('render=explicit')
  })

  it('после загрузки скрипта вызывает turnstile.render с sitekey и темой, токен уходит наверх', async () => {
    const onSuccess = vi.fn()
    render(<TurnstileProvider siteKey="site-key" theme="dark" size="compact" language="ru" onSuccess={onSuccess} />)

    const api = await finishLoading()

    expect(api.render).toHaveBeenCalledTimes(1)
    const [container, params] = api.render.mock.calls[0]
    expect(container).toBeInstanceOf(HTMLElement)
    expect(params.sitekey).toBe('site-key')
    expect(params.theme).toBe('dark')
    expect(params.size).toBe('compact')

    params.callback('token-123')
    expect(onSuccess).toHaveBeenCalledWith('token-123')
  })

  it('error-callback и expired-callback доходят до onError и onExpire', async () => {
    const onError = vi.fn()
    const onExpire = vi.fn()
    render(<TurnstileProvider siteKey="k" onSuccess={vi.fn()} onError={onError} onExpire={onExpire} />)

    const api = await finishLoading()
    const params = api.render.mock.calls[0][1]

    params['error-callback']('300030')
    params['expired-callback']()
    expect(onError).toHaveBeenCalledWith('300030')
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('скрипт уже загружен — render сразу, без нового тега', async () => {
    const api = installTurnstile()
    render(<TurnstileProvider siteKey="k" onSuccess={vi.fn()} />)
    await act(async () => {})

    expect(api.render).toHaveBeenCalledTimes(1)
    expect(document.head.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(0)
  })

  it('при размонтировании снимает виджет через turnstile.remove', async () => {
    const view = render(<TurnstileProvider siteKey="k" onSuccess={vi.fn()} />)
    const api = await finishLoading()

    view.unmount()
    expect(api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('размонтирование до загрузки скрипта: виджет не рисуется', async () => {
    const view = render(<TurnstileProvider siteKey="k" onSuccess={vi.fn()} />)
    view.unmount()
    const api = await finishLoading()

    expect(api.render).not.toHaveBeenCalled()
  })

  it('новые колбэки родителя не пересоздают виджет, но получают токен', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<TurnstileProvider siteKey="k" onSuccess={first} />)
    const api = await finishLoading()

    view.rerender(<TurnstileProvider siteKey="k" onSuccess={second} />)
    expect(api.render).toHaveBeenCalledTimes(1)

    api.render.mock.calls[0][1].callback('t')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('t')
  })

  it('ошибка загрузки скрипта идёт в onError, тег убран — можно повторить', async () => {
    const onError = vi.fn()
    render(<TurnstileProvider siteKey="k" onSuccess={vi.fn()} onError={onError} />)

    await act(async () => {
      document.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('error'))
    })

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(document.head.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(0)
  })
})
