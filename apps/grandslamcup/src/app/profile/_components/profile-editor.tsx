'use client'

/**
 * Редактор профиля — имя + аватар.
 * Переиспользует паттерн EntityPhotoUploader для загрузки фото.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { updateProfile } from '@/app/profile/_actions/update-profile.action'
import { Box, Circle, Flex, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { LuCamera, LuCheck, LuPencil, LuUserRound, LuX } from 'react-icons/lu'

interface ProfileEditorProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export function ProfileEditor({ user }: ProfileEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = user.image ? (user.image.startsWith('http') ? user.image : `/api/files/${user.image}`) : null

  async function handleSave() {
    if (!name.trim() || name.trim().length < 2) {
      toaster.error({ title: 'Имя должно быть не менее 2 символов' })
      return
    }
    setSaving(true)
    try {
      const result = await updateProfile({ name: name.trim() })
      if (result.error) {
        toaster.error({ title: result.error })
      } else {
        toaster.success({ title: 'Имя обновлено' })
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

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

      const res = await fetch('/api/upload/user-avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        toaster.error({ title: data.error ?? 'Ошибка загрузки' })
        return
      }
      toaster.success({ title: 'Фото обновлено' })
      router.refresh()
    } catch {
      toaster.error({ title: 'Ошибка загрузки' })
    } finally {
      setUploading(false)
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  return (
    <VStack gap={6} align="center" maxW="400px" mx="auto">
      {/* Аватар */}
      <Box
        position="relative"
        w="120px"
        h="120px"
        borderRadius="full"
        overflow="hidden"
        borderWidth="3px"
        borderStyle={avatarUrl ? 'solid' : 'dashed'}
        borderColor={uploading ? 'brand.solid' : 'border'}
        cursor={uploading ? 'wait' : 'pointer'}
        _hover={{ borderColor: 'brand.solid', '& .overlay': { opacity: 1 } }}
        transition="border-color 0.15s"
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {avatarUrl
          ? <Image src={avatarUrl} alt="Аватар" fill sizes="120px" style={{ objectFit: 'cover' }} />
          : (
            <Flex align="center" justify="center" h="full" bg="bg.subtle">
              <LuUserRound size={48} color="var(--chakra-colors-fg-muted)" />
            </Flex>
          )}

        {/* Overlay */}
        <Flex
          className="overlay"
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="blackAlpha.600"
          opacity={uploading ? 1 : 0}
          transition="opacity 0.2s"
          borderRadius="full"
        >
          {uploading ? <Spinner color="white" size="md" /> : (
            <VStack gap={0}>
              <LuCamera size={20} color="white" />
              <Text fontSize="xs" color="white" fontWeight="medium">
                {avatarUrl ? 'Заменить' : 'Загрузить'}
              </Text>
            </VStack>
          )}
        </Flex>

        <Box position="absolute" opacity={0} pointerEvents="none" asChild>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} />
        </Box>
      </Box>

      {/* Имя */}
      <VStack gap={2} w="full">
        {editing
          ? (
            <Flex gap={2} w="full" align="center">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                size="lg"
                textAlign="center"
                autoFocus
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave()
                  }
                  if (e.key === 'Escape') {
                    setName(user.name ?? '')
                    setEditing(false)
                  }
                }}
              />
              <Circle
                size={10}
                bg="brand.solid"
                color="white"
                cursor={saving ? 'wait' : 'pointer'}
                onClick={handleSave}
                _hover={{ bg: 'brand.700' }}
              >
                {saving ? <Spinner size="xs" /> : <LuCheck size={18} />}
              </Circle>
              <Circle
                size={10}
                bg="bg.subtle"
                cursor="pointer"
                onClick={() => {
                  setName(user.name ?? '')
                  setEditing(false)
                }}
                _hover={{ bg: 'bg.muted' }}
              >
                <LuX size={18} />
              </Circle>
            </Flex>
          )
          : (
            <Flex
              align="center"
              gap={2}
              cursor="pointer"
              onClick={() => setEditing(true)}
              _hover={{ color: 'brand.solid' }}
            >
              <Text fontSize="xl" fontWeight="bold">
                {user.name || 'Без имени'}
              </Text>
              <LuPencil size={16} />
            </Flex>
          )}

        <Text fontSize="sm" color="fg.muted">
          {user.email}
        </Text>
      </VStack>
    </VStack>
  )
}
