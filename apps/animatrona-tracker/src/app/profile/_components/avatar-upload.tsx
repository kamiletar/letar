'use client'

import { Box, Image, Spinner } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuCamera } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { uploadAvatarAction } from '../_actions/avatar.action'

interface AvatarUploadProps {
  name: string | null
  email: string
  image: string | null
}

/** Аватар профиля с загрузкой фото по клику — буква на цветном круге как fallback */
export function AvatarUpload({ name, email, image }: AvatarUploadProps) {
  const [currentImage, setCurrentImage] = useState(image)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadAvatarAction(formData)
      if (!result.success) {
        toaster.error({ title: 'Ошибка загрузки', description: result.error })
        return
      }
      setCurrentImage(result.url)
      toaster.success({ title: 'Аватар обновлён' })
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Box
      position="relative"
      w={16}
      h={16}
      borderRadius="full"
      overflow="hidden"
      cursor="pointer"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Загрузить аватар"
    >
      {currentImage
        ? <Image src={currentImage} alt="" w="100%" h="100%" objectFit="cover" />
        : (
          <Box
            w="100%"
            h="100%"
            bg="brand.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="2xl"
            fontWeight="bold"
          >
            {name?.[0] || email[0].toUpperCase()}
          </Box>
        )}

      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.600"
        display="flex"
        alignItems="center"
        justifyContent="center"
        opacity={isUploading ? 1 : 0}
        transitionProperty="opacity"
        transitionDuration="0.15s"
        _hover={{ opacity: 1 }}
      >
        {isUploading ? <Spinner size="sm" color="white" /> : <LuCamera color="white" size={20} />}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={isUploading}
        style={{ display: 'none' }}
      />
    </Box>
  )
}
