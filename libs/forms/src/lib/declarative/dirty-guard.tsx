'use client'

import { useRouter } from 'next/navigation'
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDeclarativeForm } from './form-context'

/**
 * Props for DirtyGuard component
 */
export interface DirtyGuardProps {
  /**
   * Message to show in browser's native beforeunload dialog
   * Note: Most modern browsers ignore custom messages and show their own
   */
  message?: string
  /**
   * Title for the confirmation dialog
   * @default "Unsaved changes"
   */
  dialogTitle?: string
  /**
   * Description for the confirmation dialog
   * @default "You have unsaved changes. Are you sure you want to leave this page?"
   */
  dialogDescription?: string
  /**
   * Text for the confirm button
   * @default "Leave"
   */
  confirmText?: string
  /**
   * Text for the cancel button
   * @default "Stay"
   */
  cancelText?: string
  /**
   * Whether to enable the guard (default: true)
   * Can be used to conditionally disable the guard
   */
  enabled?: boolean
  /**
   * Callback when user attempts to leave with unsaved changes
   * Return false to allow navigation without confirmation
   */
  onBlock?: () => boolean | void
}

/**
 * Form.DirtyGuard - Prevent accidental navigation when form has unsaved changes
 *
 * Shows browser's native confirmation dialog when user tries to:
 * - Close the tab/window
 * - Refresh the page
 *
 * Shows custom dialog for in-app navigation:
 * - Clicking on Next.js Link components
 * - Clicking on anchor tags with internal hrefs
 *
 * @example Basic usage
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.DirtyGuard />
 *   <Form.Field.String name="title" />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 *
 * @example With custom messages
 * ```tsx
 * <Form.DirtyGuard
 *   dialogTitle="Leaving?"
 *   dialogDescription="Data will be lost!"
 *   confirmText="Yes, leave"
 *   cancelText="No, stay"
 * />
 * ```
 */
export function DirtyGuard({
  message = 'You have unsaved changes. Are you sure you want to leave?',
  dialogTitle = 'Unsaved changes',
  dialogDescription = 'You have unsaved changes. Are you sure you want to leave this page?',
  confirmText = 'Leave',
  cancelText = 'Stay',
  enabled = true,
  onBlock,
}: DirtyGuardProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const pendingHref = useRef<string | null>(null)

  // Check isDirty
  const checkIsDirty = useCallback(() => {
    const state = form.state
    return state.isDirty
  }, [form])

  // Handler for beforeunload (tab close, refresh)
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
      if (checkIsDirty()) {
        const shouldBlock = onBlock?.()
        if (shouldBlock === false) {
          return undefined
        }

        event.preventDefault()
        event.returnValue = message
        return message
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, message, onBlock, checkIsDirty])

  // Intercept clicks on internal links
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleClick = (event: MouseEvent) => {
      // Check if form is dirty
      if (!checkIsDirty()) {
        return
      }

      // Find closest anchor or element with data-href
      const target = event.target as HTMLElement
      const anchor = target.closest('a')

      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href) {
        return
      }

      // Skip external links and special protocols
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return
      }

      // Skip if target="_blank"
      if (anchor.target === '_blank') {
        return
      }

      // Skip if Ctrl/Cmd is held (open in new tab)
      if (event.ctrlKey || event.metaKey) {
        return
      }

      // Call onBlock callback
      const shouldBlock = onBlock?.()
      if (shouldBlock === false) {
        return
      }

      // Prevent navigation and show dialog
      event.preventDefault()
      event.stopPropagation()
      pendingHref.current = href
      setShowDialog(true)
    }

    // Use capture to intercept before Next.js
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [enabled, onBlock, checkIsDirty])

  // Confirm navigation
  const handleConfirm = useCallback(() => {
    setShowDialog(false)
    if (pendingHref.current) {
      // Reset dirty state before navigation to avoid re-triggering
      form.reset()
      router.push(pendingHref.current)
      pendingHref.current = null
    }
  }, [form, router])

  // Cancel navigation
  const handleCancel = useCallback(() => {
    setShowDialog(false)
    pendingHref.current = null
  }, [])

  // Render confirmation dialog
  if (!showDialog) {
    return null
  }

  // Simple inline dialog (no dependency on Chakra Dialog)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--chakra-colors-bg-panel, white)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--chakra-colors-fg, inherit)',
          }}
        >
          {dialogTitle}
        </h2>
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '0.875rem',
            color: 'var(--chakra-colors-fg-muted, #666)',
          }}
        >
          {dialogDescription}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--chakra-colors-border, #e2e8f0)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--chakra-colors-red-500, #e53e3e)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
