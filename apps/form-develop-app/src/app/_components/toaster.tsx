'use client'

import { createAppToaster } from '@letar/ui'

export const { toaster, Toaster } = createAppToaster({
  toasterOptions: { placement: 'bottom', pauseOnPageIdle: true },
  showLoadingSpinner: true,
  showActionButton: true,
  isClosable: (toast) => Boolean(toast.meta?.closable),
})
