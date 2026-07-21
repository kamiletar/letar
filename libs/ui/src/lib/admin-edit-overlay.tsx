'use client'

import { IconButton, type IconButtonProps } from '@chakra-ui/react'
import NextLink from 'next/link'
import { PiPencilSimple } from 'react-icons/pi'

export interface AdminEditOverlayProps extends Omit<IconButtonProps, 'aria-label' | 'asChild' | 'children'> {
  /** Куда ведёт кнопка (обычно `/admin/[slug]`) */
  href: string
  'aria-label'?: string
}

/**
 * Иконка-карандаш поверх карточки, ведущая в раздел редактирования.
 *
 * Размести внутри `Box position="relative"` рядом (не внутри!) с анкором карточки —
 * вложенные `<a>` невалидны в HTML, поэтому если вся карточка обёрнута в `Link`/`NextLink`,
 * эта кнопка должна быть sibling-элементом, а не child анкора.
 *
 * @example
 * ```tsx
 * <Box position="relative">
 *   {isAdmin && <AdminEditOverlay href={`/admin/${slug}`} colorPalette="brand" />}
 *   <Link asChild><NextLink href={`/item/${slug}`}>...карточка...</NextLink></Link>
 * </Box>
 * ```
 */
export function AdminEditOverlay(
  { href, 'aria-label': ariaLabel = 'Редактировать', ...props }: AdminEditOverlayProps,
) {
  return (
    <IconButton
      aria-label={ariaLabel}
      asChild
      size="sm"
      position="absolute"
      top={3}
      right={3}
      zIndex={2}
      shadow="md"
      {...props}
    >
      <NextLink href={href}>
        <PiPencilSimple />
      </NextLink>
    </IconButton>
  )
}
