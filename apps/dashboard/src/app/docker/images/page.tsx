'use client'

import { pruneImages, removeImage } from '@/app/_actions/docker-actions'
import { DockerNav } from '@/app/_components/docker/DockerNav'
import { ImageList } from '@/app/_components/docker/ImageList'
import { Header } from '@/app/_components/layout/Header'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatBytes } from '@/lib/format'
import { Box, Button, Heading, HStack, Spinner, Text } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface DockerImage {
  id: string
  repoTags: string[] | null
  repoDigests: string[] | null
  created: number
  size: number
  virtualSize: number
  containers: number
}

interface ImagesResponse {
  success: boolean
  count: number
  totalSize: number
  images: DockerImage[]
}

async function fetchImages(serverId: string | null) {
  const params = new URLSearchParams()
  if (serverId) {
    params.set('serverId', serverId)
  }
  const url = params.size > 0 ? `/api/docker/images?${params}` : '/api/docker/images'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch images')
  }
  const data = await res.json()
  return data as ImagesResponse
}

export default function ImagesPage() {
  const queryClient = useQueryClient()
  const { selectedServerId } = useServerContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ['docker-images', selectedServerId],
    queryFn: () => fetchImages(selectedServerId),
    refetchInterval: 10000,
  })

  // Mutation for pruning images (только для локального сервера)
  const pruneMutation = useMutation({
    mutationFn: async () => {
      const result = await pruneImages()
      if (!result.success) {
        throw new Error(result.error || 'Failed to prune images')
      }
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['docker-images', selectedServerId] })
      toaster.create({
        title: 'Images pruned successfully',
        description: `Deleted ${'deleted' in result ? (result as { deleted: number }).deleted : 0} images, reclaimed ${
          formatBytes(
            'spaceReclaimed' in result ? (result as { spaceReclaimed: number }).spaceReclaimed : 0,
          )
        }`,
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to prune images',
        description: error.message,
        type: 'error',
      })
    },
  })

  // Mutation for removing a single image (только для локального сервера)
  const removeMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const result = await removeImage(imageId, true)
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove image')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-images', selectedServerId] })
      toaster.create({
        title: 'Image removed',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to remove image',
        description: error.message,
        type: 'error',
      })
    },
  })

  // Операции с образами доступны только для локального сервера
  const isRemote = !!selectedServerId

  if (isLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="xl" colorPalette="brand" />
        <Text mt="4" color="fg.muted">
          Loading images...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p="8">
        <Text color="red.500">Failed to load images</Text>
      </Box>
    )
  }

  const unusedImages = data?.images.filter((img) => (img.containers || 0) === 0).length || 0

  return (
    <>
      <Header />
      <Box p="8">
        <DockerNav />
        <HStack justify="space-between" mb="6">
          <Heading>Docker Images</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['docker-images', selectedServerId] })}
            >
              Refresh
            </Button>
            {!isRemote && (
              <Button
                size="sm"
                colorPalette="red"
                onClick={() => pruneMutation.mutate()}
                loading={pruneMutation.isPending}
                disabled={unusedImages === 0}
              >
                Prune Unused Images
              </Button>
            )}
          </HStack>
        </HStack>

        {/* Statistics */}
        <HStack gap="6" mb="6" fontSize="sm">
          <Box>
            <Text color="fg.muted">Total Images</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {data?.count || 0}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Unused Images</Text>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              {unusedImages}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Total Size</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {formatBytes(data?.totalSize || 0)}
            </Text>
          </Box>
        </HStack>

        {/* Images table */}
        {data?.images && data.images.length > 0
          ? (
            <Box bg="bg.subtle" borderRadius="lg" p="4">
              <ImageList
                images={data.images}
                onRemove={isRemote ? undefined : (imageId) => removeMutation.mutate(imageId)}
              />
            </Box>
          )
          : (
            <Box textAlign="center" py="12">
              <Text color="fg.muted">No images found</Text>
            </Box>
          )}
      </Box>
    </>
  )
}
