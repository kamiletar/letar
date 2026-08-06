'use client'

import { createToaster, Portal, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react'

/**
 * Toaster instance для использования в приложении
 * Использование:
 * import { toaster } from '@/app/_components/ui/toaster';
 * toaster.success({ title: 'Успех!', description: 'Операция выполнена' });
 */
export const toaster: ReturnType<typeof createToaster> = createToaster({
  placement: 'top-end',
  pauseOnPageIdle: true,
  max: 3,
})

/**
 * Toaster Provider компонент
 * Добавить в root layout для отображения уведомлений
 */
export function Toaster() {
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
