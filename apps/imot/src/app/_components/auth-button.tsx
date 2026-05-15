'use client'

import { Button, type ButtonProps } from '@chakra-ui/react'
import { type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

interface AuthButtonProps extends Omit<ButtonProps, 'children'> {
  provider: 'google' | 'yandex' | 'telegram'
  icon: ReactNode
  children: string
}

/**
 * Кнопка для OAuth провайдеров с состоянием загрузки
 * Использует useFormStatus для автоматического отслеживания pending состояния server action
 *
 * @example
 * <form action={serverAction}>
 *   <AuthButton provider="google" icon={<RiGoogleFill />}>
 *     Войти через Google
 *   </AuthButton>
 * </form>
 */
export function AuthButton({ provider, icon, children, ...props }: AuthButtonProps) {
  const { pending } = useFormStatus()

  // Цветовая схема для каждого провайдера
  const getColorPalette = () => {
    switch (provider) {
      case 'google':
        return 'red'
      case 'yandex':
        return 'red'
      case 'telegram':
        return 'blue'
      default:
        return 'gray'
    }
  }

  return (
    <Button
      width="full"
      size="lg"
      colorPalette={getColorPalette()}
      variant="outline"
      loading={pending}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'md',
      }}
      {...props}
    >
      {icon}
      {children}
    </Button>
  )
}
