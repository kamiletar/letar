/**
 * Глобальный toaster для уведомлений
 */

import { createAppToaster } from '@letar/ui'

export const { toaster, Toaster } = createAppToaster({
  toasterOptions: { placement: 'bottom-end', pauseOnPageIdle: true },
  insetInline: '4',
  rootProps: { width: 'sm' },
  isClosable: (toast) => Boolean(toast.closable),
})
