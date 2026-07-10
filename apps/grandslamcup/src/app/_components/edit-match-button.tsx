'use client'

/**
 * Кнопка "Редактировать" на странице матча.
 * Показывается админам и организаторам города (canEdit передаётся с сервера).
 * Позволяет загрузить постер матча.
 */

import { useSession } from '@/lib/auth-client'
import { Box, Button, Dialog, Flex, Image, Portal, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LuImage, LuPencil, LuTrash2, LuUpload } from 'react-icons/lu'

interface EditMatchButtonProps {
  matchId: string
  posterUrl: string | null
  /** Серверная проверка прав — admin или организатор города */
  canEdit: boolean
}

export function EditMatchButton({ matchId, posterUrl, canEdit }: EditMatchButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(posterUrl ? `/api/files/${posterUrl}` : null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Ctrl+V — вставка изображения из буфера обмена
  // Хук должен вызываться безусловно (rules-of-hooks), guard внутри callback
  useEffect(() => {
    if (!open) return
    function handlePaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      if (item) {
        const file = item.getAsFile()
        if (file) {
          // Загрузка постера из буфера обмена
          setUploading(true)
          const fd = new FormData()
          fd.append('file', file)
          fd.append('matchId', matchId)
          fetch('/api/upload/match-poster', { method: 'POST', body: fd })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                setPreview(data.url)
                router.refresh()
              } else {
                alert(data.error || 'Ошибка загрузки')
              }
            })
            .finally(() => setUploading(false))
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [open, matchId, router])

  if (!session?.user || !canEdit) return null

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('matchId', matchId)

      const res = await fetch('/api/upload/match-poster', { method: 'POST', body: fd })
      const data = await res.json()

      if (data.success) {
        setPreview(data.url)
        router.refresh()
      } else {
        alert(data.error || 'Ошибка загрузки')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleUpload(file)
  }

  async function handleRemovePoster() {
    // Очистка posterUrl через прямой вызов (простой PUT не нужен — используем тот же upload endpoint)
    setUploading(true)
    try {
      // Удаляем постер через отдельный запрос
      const res = await fetch('/api/upload/match-poster', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      if (res.ok) {
        setPreview(null)
        router.refresh()
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        color="whiteAlpha.600"
        _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
        onClick={() => setOpen(true)}
      >
        <LuPencil size={14} />
        <Text display={{ base: 'none', sm: 'inline' }}>Редактировать</Text>
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => !e.open && setOpen(false)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="md">
              <Dialog.Header>
                <Dialog.Title>Постер матча</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Текущий постер или зона загрузки */}
                  {preview ? (
                    <Box position="relative">
                      <Image src={preview} alt="Постер матча" borderRadius="lg" maxH="400px" mx="auto" />
                      <Flex position="absolute" top={2} right={2} gap={1}>
                        <Button
                          size="xs"
                          colorPalette="brand"
                          onClick={() => fileRef.current?.click()}
                          loading={uploading}
                        >
                          <LuUpload size={12} />
                          Заменить
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="subtle"
                          onClick={handleRemovePoster}
                          loading={uploading}
                        >
                          <LuTrash2 size={12} />
                        </Button>
                      </Flex>
                    </Box>
                  ) : (
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      borderWidth="2px"
                      borderStyle="dashed"
                      borderColor="border"
                      borderRadius="lg"
                      p={8}
                      cursor="pointer"
                      _hover={{ borderColor: 'brand.solid', bg: 'bg.subtle' }}
                      transition="all 0.2s"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <LuImage size={32} />
                      <Text mt={2} fontSize="sm" color="fg.muted">
                        Нажмите, перетащите или Ctrl+V
                      </Text>
                      <Text fontSize="xs" color="fg.subtle">
                        JPG, PNG, WebP — до 5 МБ
                      </Text>
                    </Flex>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Закрыть
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
