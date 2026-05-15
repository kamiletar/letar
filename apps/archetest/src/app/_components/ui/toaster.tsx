'use client'

import { createToaster, Toast, Toaster } from '@chakra-ui/react'

export const toaster: ReturnType<typeof createToaster> = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
})

export function AppToaster() {
  return (
    <Toaster toaster={toaster}>
      {(toast) => (
        <Toast.Root minW="300px" maxW="400px">
          {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
          {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
          <Toast.CloseTrigger />
        </Toast.Root>
      )}
    </Toaster>
  )
}
