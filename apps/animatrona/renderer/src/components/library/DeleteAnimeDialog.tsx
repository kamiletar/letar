'use client'

import { Box, Button, CloseButton, Dialog, HStack, Icon, Portal, Text, VStack } from '@chakra-ui/react'
import { LuTrash2, LuTriangleAlert } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'
import { useDeleteAnimeWithFiles } from '@/lib/hooks/use-delete-anime'

interface DeleteAnimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anime: {
    id: string
    name: string
    episodeCount: number
  }
  onDeleted?: () => void
}

/**
 * Диалог подтверждения удаления аниме
 *
 * IPFS-first архитектура: контент хранится в IPFS, а не на диске.
 * При удалении аниме автоматически удаляется контент из IPFS.
 */
export function DeleteAnimeDialog({ open, onOpenChange, anime, onDeleted }: DeleteAnimeDialogProps) {
  const { deleteAnime, isDeleting } = useDeleteAnimeWithFiles()

  const handleDelete = async () => {
    const result = await deleteAnime({
      animeId: anime.id,
      deleteFromIpfs: true,
    })

    if (result.success) {
      toaster.success({
        title: 'Аниме удалено',
        description: result.deletedCids > 0 ? `Удалено ${result.deletedCids} блоков из IPFS` : 'Удалено из библиотеки',
      })
      onOpenChange(false)
      onDeleted?.()
    } else {
      toaster.error({
        title: 'Ошибка удаления',
        description: result.errors.join('\n'),
      })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <HStack>
                  <Icon as={LuTriangleAlert} color="red.500" />
                  <Text>Удалить аниме?</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Box p={4} bg="bg.subtle" borderRadius="md">
                  <Text fontWeight="bold" fontSize="lg">
                    {anime.name}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    {anime.episodeCount} эпизодов
                  </Text>
                </Box>

                <Box p={3} bg="red.subtle" borderRadius="md">
                  <Text fontSize="sm" color="red.fg">
                    Аниме будет удалено из библиотеки и контент будет удалён из IPFS.
                  </Text>
                </Box>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleDelete} disabled={isDeleting} loading={isDeleting}>
                  <Icon as={LuTrash2} mr={2} />
                  Удалить
                </Button>
              </HStack>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
