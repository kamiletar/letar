'use client'

import { IconButton, type IconButtonProps } from '@chakra-ui/react'

import { Pressable } from './pressable'

export interface ExternalLinkProps extends Omit<IconButtonProps, 'asChild'> {
  href: string
  children: React.ReactNode
}

/**
 * Иконка-ссылка для внешних ресурсов (соцсети, email, GitHub).
 * Квадратная кнопка-иконка с ripple-эффектом.
 * Открывает ссылку в новой вкладке с rel="noopener noreferrer".
 *
 * @example
 * ```tsx
 * <ExternalLink href="https://vk.com/example" aria-label="ВКонтакте" size="lg">
 *   <FaVk />
 * </ExternalLink>
 * ```
 */
export function ExternalLink({ href, children, borderRadius = 'full', ...props }: ExternalLinkProps) {
  return (
    <Pressable borderRadius={borderRadius} display="inline-flex">
      <IconButton asChild variant="ghost" {...props}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      </IconButton>
    </Pressable>
  )
}
