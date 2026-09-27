'use client'

import { Box, Button, HStack, IconButton, Input, Popover, Portal, VStack } from '@chakra-ui/react'
import { useLinkPopoverString, useToolbarString } from '@letar/forms-react'
import type { Editor } from '@tiptap/react'
import { type ReactElement, useCallback, useState } from 'react'
import { LuLink, LuUnlink } from 'react-icons/lu'

/**
 * Props для LinkPopover
 */
interface LinkPopoverProps {
  editor: Editor
  disabled?: boolean
}

/**
 * Component для добавления/удаления ссылок в RichText редакторе
 *
 * Использует Popover instead of window.prompt для лучшего UX и тестируемости.
 */
export function LinkPopover({ editor, disabled }: LinkPopoverProps): ReactElement {
  const [url, setUrl] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const isActive = editor.isActive('link')
  // Без noProviderLocale: контракт Chakra-скина без FormI18nProvider — английский (см. field-rich-text-impl.tsx).
  const linkAddLabel = useToolbarString('formToolbar.linkAdd')
  const linkRemoveLabel = useToolbarString('formToolbar.linkRemove')
  const placeholderLabel = useLinkPopoverString('formLinkPopover.placeholder')
  const removeLabel = useLinkPopoverString('formLinkPopover.remove')
  const cancelLabel = useLinkPopoverString('formLinkPopover.cancel')
  const applyLabel = useLinkPopoverString('formLinkPopover.apply')

  const handleOpen = useCallback(() => {
    if (isActive) {
      // Если link активна — удаляем её
      editor.chain().focus().unsetLink().run()
    } else {
      // Получаем текущий URL if present
      const currentUrl = editor.getAttributes('link').href ?? ''
      setUrl(currentUrl)
      setIsOpen(true)
    }
  }, [editor, isActive])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setUrl('')
  }, [])

  const handleSubmit = useCallback(() => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    handleClose()
  }, [editor, url, handleClose])

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run()
    handleClose()
  }, [editor, handleClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleSubmit, handleClose],
  )

  return (
    <Popover.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Popover.Trigger asChild>
        <IconButton
          aria-label={isActive ? linkRemoveLabel : linkAddLabel}
          size="sm"
          variant={isActive ? 'solid' : 'ghost'}
          colorPalette={isActive ? 'brand' : undefined}
          onClick={handleOpen}
          disabled={disabled}
        >
          {isActive ? <LuUnlink /> : <LuLink />}
        </IconButton>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content width="300px">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body p={3}>
              <VStack gap={3} align="stretch">
                <Box>
                  <Input
                    placeholder={placeholderLabel}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="sm"
                    autoFocus
                  />
                </Box>
                <HStack gap={2} justify="flex-end">
                  {editor.isActive('link') && (
                    <Button size="sm" variant="ghost" colorPalette="red" onClick={handleRemove}>
                      {removeLabel}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleClose}>
                    {cancelLabel}
                  </Button>
                  <Button size="sm" colorPalette="brand" onClick={handleSubmit} disabled={!url.trim()}>
                    {applyLabel}
                  </Button>
                </HStack>
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
