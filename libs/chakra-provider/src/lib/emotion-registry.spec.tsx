// @vitest-environment node
// Серверная ветка Emotion включается только без `document`: под jsdom стили ушли бы в `document.head`,
// и тест не увидел бы инлайн-`<style>`, ради которого реестр существует.
import { Box, ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ServerInsertedHTMLContext } from 'next/dist/shared/lib/server-inserted-html.shared-runtime'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'

import { EmotionRegistry } from './emotion-registry'

function renderWithRegistry(children: ReactNode, withRegistry = true) {
  const callbacks: Array<() => ReactNode> = []
  const tree = <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
  const html = renderToString(
    <ServerInsertedHTMLContext.Provider value={(callback) => callbacks.push(callback)}>
      {withRegistry ? <EmotionRegistry>{tree}</EmotionRegistry> : tree}
    </ServerInsertedHTMLContext.Provider>,
  )
  const inserted = () => renderToString(<>{callbacks.map((callback) => callback())}</>)
  return { html, inserted }
}

describe('EmotionRegistry', () => {
  it('без реестра Chakra рендерит инлайн-<style> в разметке — исходная причина #418', () => {
    const { html } = renderWithRegistry(<Box color="red.500">текст</Box>, false)
    expect(html).toMatch(/<style data-emotion="css [^"]+"/)
  })

  it('с реестром разметка не содержит <style>, стили уходят в useServerInsertedHTML', () => {
    const { html, inserted } = renderWithRegistry(<Box color="red.500">текст</Box>)
    expect(html).not.toContain('<style')
    expect(html).toContain('текст')

    const styles = inserted()
    const className = html.match(/class="(css-[^" ]+)/)?.[1]
    expect(className).toBeDefined()
    expect(styles).toMatch(/<style data-emotion="css [^"]+"/)
    expect(styles).toContain(`.${className}`)
    // Глобальные стили Chakra (preflight, globalCss) идут отдельными тегами с суффиксом -global
    expect(styles).toContain('data-emotion="css-global ')
  })

  it('повторный flush не дублирует уже отданные стили', () => {
    const { inserted } = renderWithRegistry(<Box color="red.500">текст</Box>)
    expect(inserted()).toContain('<style')
    expect(inserted()).toBe('')
  })
})
