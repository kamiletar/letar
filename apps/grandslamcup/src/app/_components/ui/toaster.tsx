'use client'

import { createAppToaster } from '@letar/ui'

export const { toaster, Toaster: AppToaster } = createAppToaster({
  toasterOptions: { placement: 'bottom-end', pauseOnPageIdle: true },
  withPortal: false,
  insetInline: undefined,
  rootProps: { minW: '300px', maxW: '400px' },
})
