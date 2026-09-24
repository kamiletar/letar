// @vitest-environment node
// Серверная ветка Emotion включается только без `document` — см. emotion-registry.spec.tsx.
import { Box, createSystem, defaultConfig } from '@chakra-ui/react'
import { ServerInsertedHTMLContext } from 'next/dist/shared/lib/server-inserted-html.shared-runtime'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'

import { DarkOnlyChakraProvider } from './dark-only-chakra-provider'

function render(children: ReactNode) {
  const callbacks: Array<() => ReactNode> = []
  const html = renderToString(
    <ServerInsertedHTMLContext.Provider value={(callback) => callbacks.push(callback)}>
      <DarkOnlyChakraProvider value={createSystem(defaultConfig)}>{children}</DarkOnlyChakraProvider>
    </ServerInsertedHTMLContext.Provider>,
  )
  const inserted = () => renderToString(<>{callbacks.map((callback) => callback())}</>)
  return { html, inserted }
}

describe('DarkOnlyChakraProvider', () => {
  it('стили Emotion не попадают в разметку — реестр стоит снаружи', () => {
    const { html, inserted } = render(<Box color="red.500">текст</Box>)
    expect(html).not.toMatch(/<style[^>]*data-emotion/)
    expect(html).toContain('текст')
    expect(inserted()).toMatch(/<style data-emotion="css [^"]+"/)
  })

  it('рендерится без value — берётся defaultSystem', () => {
    const html = renderToString(
      <ServerInsertedHTMLContext.Provider value={() => {}}>
        <DarkOnlyChakraProvider>
          <Box>текст</Box>
        </DarkOnlyChakraProvider>
      </ServerInsertedHTMLContext.Provider>,
    )
    expect(html).toContain('текст')
  })
})
