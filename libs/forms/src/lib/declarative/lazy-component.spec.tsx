import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createLazyComponent } from './lazy-component'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}

// Регресс-тест: см. комментарий в lazy-component.tsx — до фикса Suspense монтировался сразу,
// и на сервере рендерился настоящий SSR-стриминг boundary (`$RC`/`$RB`/`$RV`), чьё раскрытие на
// клиенте зависит от requestAnimationFrame. В скрытой/фоновой вкладке (типично для headless
// e2e-окружения) rAF не тикает — boundary виснет в неразвёрнутом placeholder навсегда, реальная
// разметка лежит в осиротевшем hidden-узле. Гейт `mounted` убирает Suspense с сервера полностью:
// ленивый импорт запускается и раскрывается только на клиенте, обычным React-коммитом.
describe('createLazyComponent', () => {
  it('не создаёт Suspense-boundary на сервере — SSR отдаёт только Skeleton', () => {
    const LazyProbe = createLazyComponent(
      () => Promise.resolve({ default: () => <div data-testid="real-content">real</div> }),
      '77px',
    )

    const html = renderToString(
      <TestWrapper>
        <LazyProbe />
      </TestWrapper>,
    )

    // Никакого содержимого ленивого компонента и никакого Suspense-плейсхолдера — только Skeleton.
    expect(html).not.toContain('real-content')
    expect(html).toContain('chakra-skeleton')
  })

  it('на клиенте после маунта раскрывает ленивый компонент', async () => {
    const LazyProbe = createLazyComponent(
      () => Promise.resolve({ default: () => <div data-testid="real-content">real</div> }),
    )

    render(
      <TestWrapper>
        <LazyProbe />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('real-content')).toBeInTheDocument()
    })
  })
})
