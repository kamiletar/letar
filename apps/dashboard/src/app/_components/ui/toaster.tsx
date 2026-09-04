'use client'

import { createToaster, Portal, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react'
import { useSyncExternalStore } from 'react'

export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
  max: 5,
})

// Определение «смонтировано на клиенте» — источник истины не в React-состоянии, а в самом факте
// гидратации (внешняя по отношению к рендеру система). useSyncExternalStore с getServerSnapshot,
// отличным от getSnapshot, — штатный способ получить это без setState в эффекте
// (react/set-state-in-effect, oxlint 1.81).
const subscribeNoop = () => () => {}
const useHasMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false)

export const Toaster = () => {
  const mounted = useHasMounted()

  if (!mounted) {
    return null
  }

  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            <Toast.Indicator />
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
