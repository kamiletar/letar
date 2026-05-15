'use client'

import { useState } from 'react'

/**
 * Skip link для доступности — позволяет перейти к основному контенту
 */
export function SkipLink() {
  const [focused, setFocused] = useState(false)

  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: focused ? '0' : '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        backgroundColor: '#8b3dff',
        color: 'white',
        borderRadius: '0 0 8px 8px',
        zIndex: 1000,
        textDecoration: 'none',
        fontWeight: 500,
        transition: 'top 0.2s ease',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      Перейти к содержимому
    </a>
  )
}
