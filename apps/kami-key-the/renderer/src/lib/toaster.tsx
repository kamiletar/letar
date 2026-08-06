/**
 * Глобальный toaster для уведомлений
 */

import { createToaster, Portal, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react'

export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
})

export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline="4">
        {(toast) => (
          <Toast.Root width="sm">
            <Toast.Indicator />
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
