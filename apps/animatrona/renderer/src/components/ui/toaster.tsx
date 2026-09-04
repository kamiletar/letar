'use client'

import { createAppToaster } from '@letar/ui'

/**
 * Toaster singleton для показа уведомлений
 */
export const { toaster, Toaster } = createAppToaster({
  toasterOptions: { placement: 'bottom-end', pauseOnPageIdle: true },
  showLoadingSpinner: true,
  showActionButton: true,
  isClosable: (toast) => Boolean(toast.closable),
})
