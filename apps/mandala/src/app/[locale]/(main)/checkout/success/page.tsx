import { Suspense } from 'react'

import { SuccessContent } from './_components/success-content'

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
