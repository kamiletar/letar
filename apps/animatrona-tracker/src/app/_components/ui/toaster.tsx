'use client'

import { createAppToaster } from '@letar/ui'

/**
 * Toaster instance для использования в приложении
 * Использование:
 * import { toaster } from '@/app/_components/ui/toaster';
 * toaster.success({ title: 'Успех!', description: 'Операция выполнена' });
 */
export const { toaster, Toaster } = createAppToaster({
  toasterOptions: { placement: 'top-end', pauseOnPageIdle: true, max: 3 },
})
