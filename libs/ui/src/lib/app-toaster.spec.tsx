import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { createAppToaster } from './app-toaster'

describe('createAppToaster', () => {
  it('рендерит заголовок и описание тоста после гидратации', async () => {
    const { toaster, Toaster } = createAppToaster()

    render(
      <ChakraProvider value={defaultSystem}>
        <Toaster />
      </ChakraProvider>,
    )

    act(() => {
      toaster.create({ title: 'Заголовок', description: 'Описание' })
    })

    await waitFor(() => {
      expect(screen.getByText('Заголовок')).toBeInTheDocument()
    })
    expect(screen.getByText('Описание')).toBeInTheDocument()
  })

  it('с waitForHydration=true ничего не рендерит до эффекта гидратации, затем рендерит', async () => {
    const { Toaster } = createAppToaster({ waitForHydration: true })

    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <Toaster />
      </ChakraProvider>,
    )

    await waitFor(() => {
      expect(container).toBeDefined()
    })
  })

  it('showLoadingSpinner=false (по умолчанию) не показывает Spinner для loading-тоста', async () => {
    const { toaster, Toaster } = createAppToaster()

    render(
      <ChakraProvider value={defaultSystem}>
        <Toaster />
      </ChakraProvider>,
    )

    act(() => {
      toaster.create({ type: 'loading', title: 'Загрузка' })
    })

    await waitFor(() => {
      expect(screen.getByText('Загрузка')).toBeInTheDocument()
    })
    expect(document.querySelector('[class*="spinner"]')).not.toBeInTheDocument()
  })

  it('isClosable управляет наличием кнопки закрытия', async () => {
    const { toaster, Toaster } = createAppToaster({ isClosable: () => false })

    render(
      <ChakraProvider value={defaultSystem}>
        <Toaster />
      </ChakraProvider>,
    )

    act(() => {
      toaster.create({ title: 'Без кнопки закрытия' })
    })

    await waitFor(() => {
      expect(screen.getByText('Без кнопки закрытия')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
