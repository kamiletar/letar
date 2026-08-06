'use client'

/**
 * Компонент загрузки логотипа команды.
 * Квадратная зона: показывает текущий логотип или плейсхолдер.
 * Клик → file input → POST на /api/upload/team-logo.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Circle, Flex, Spinner, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { LuCamera, LuUsers } from 'react-icons/lu'

interface TeamLogoUploaderProps {
  teamId: string
  currentLogo?: string | null
  /** Размер квадрата (в пикселях) */
  size?: number
}

export function TeamLogoUploader({ teamId, currentLogo, size = 160 }: TeamLogoUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    // Валидация на клиенте
    if (!file.type.startsWith('image/')) {
      toaster.error({ title: 'Файл должен быть изображением' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toaster.error({ title: 'Максимальный размер 5 МБ' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('teamId', teamId)

      const res = await fetch('/api/upload/team-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        toaster.error({ title: data.error ?? 'Ошибка загрузки' })
        return
      }

      toaster.success({ title: 'Логотип обновлён' })
      router.refresh()
    } catch {
      toaster.error({ title: 'Ошибка загрузки' })
    } finally {
      setUploading(false)
      // Сбрасываем input чтобы можно было загрузить тот же файл повторно
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const logoUrl = currentLogo ? (currentLogo.startsWith('http') ? currentLogo : `/api/files/${currentLogo}`) : null

  return (
    <VStack gap={2}>
      <Box
        position="relative"
        w={`${size}px`}
        h={`${size}px`}
        borderRadius="xl"
        overflow="hidden"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={uploading ? 'brand.solid' : 'border'}
        cursor={uploading ? 'wait' : 'pointer'}
        _hover={{ borderColor: 'brand.solid', '& .overlay': { opacity: 1 } }}
        transition="border-color 0.15s"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {/* Текущий логотип или плейсхолдер */}
        {logoUrl
          ? <Image src={logoUrl} alt="Логотип команды" fill sizes={`${size}px`} style={{ objectFit: 'cover' }} />
          : (
            <Flex align="center" justify="center" h="full" bg="bg.subtle">
              <Circle size={16} bg="brand.subtle" color="brand.solid">
                <LuUsers size={32} />
              </Circle>
            </Flex>
          )}

        {/* Overlay при наведении */}
        <Flex
          className="overlay"
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="blackAlpha.600"
          opacity={uploading ? 1 : 0}
          transition="opacity 0.2s"
        >
          {uploading ? <Spinner color="white" size="lg" /> : (
            <VStack gap={1}>
              <LuCamera size={24} color="white" />
              <Text fontSize="xs" color="white" fontWeight="medium">
                {logoUrl ? 'Заменить' : 'Загрузить'}
              </Text>
            </VStack>
          )}
        </Flex>

        {/* Скрытый file input */}
        <Box position="absolute" opacity={0} pointerEvents="none" asChild>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
        </Box>
      </Box>
      <Text fontSize="xs" color="fg.muted">
        Логотип команды
      </Text>
    </VStack>
  )
}
