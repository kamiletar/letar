'use client'

import { createAppToaster } from '@letar/ui'

export const { toaster, Toaster } = createAppToaster({
  toasterOptions: { placement: 'bottom-end', pauseOnPageIdle: true, max: 5 },
  waitForHydration: true,
  showLoadingSpinner: true,
  showActionButton: true,
  isClosable: (toast) => Boolean(toast.closable),
})
