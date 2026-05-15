'use client'

import type { ReactElement } from 'react'

/**
 * Loading state for API-integrated forms.
 * Displayed while data is loading in edit mode.
 * Does not render children to avoid context errors in Field components.
 */
export function FormLoadingState(): ReactElement {
  return (
    <div style={{ opacity: 0.5, padding: '1rem' }}>
      <p>Loading form data...</p>
    </div>
  )
}
