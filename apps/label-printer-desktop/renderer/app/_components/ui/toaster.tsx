'use client'

import { createToaster, Portal, Spinner, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export const toaster: ReturnType<typeof createToaster> = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
  max: 5,
})

export const Toaster = () => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            {/* Spinner для loading, иначе стандартный индикатор */}
            {toast.type === 'loading' ? <Spinner size="sm" color="blue.solid" /> : <Toast.Indicator />}

            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>

            {/* Кнопка действия, если указана */}
            {toast.action && <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>}

            {/* Кнопка закрытия */}
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
