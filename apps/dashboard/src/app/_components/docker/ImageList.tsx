'use client'

import { formatBytes, formatRelativeTime } from '@/lib/format'
import { Badge, Button, Table, Text } from '@chakra-ui/react'

interface DockerImage {
  id: string
  repoTags: string[] | null
  repoDigests: string[] | null
  created: number
  size: number
  virtualSize: number
  containers: number
}

interface ImageListProps {
  images: DockerImage[]
  onRemove?: (imageId: string) => void
}

export function ImageList({ images, onRemove }: ImageListProps) {
  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Repository</Table.ColumnHeader>
          <Table.ColumnHeader>Tag</Table.ColumnHeader>
          <Table.ColumnHeader>Image ID</Table.ColumnHeader>
          <Table.ColumnHeader>Created</Table.ColumnHeader>
          <Table.ColumnHeader>Size</Table.ColumnHeader>
          <Table.ColumnHeader>Containers</Table.ColumnHeader>
          <Table.ColumnHeader>Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {images.map((image) => {
          const repoTag = image.repoTags?.[0] || '<none>:<none>'
          const [repo, tag] = repoTag.split(':')
          const shortId = image.id.replace('sha256:', '').substring(0, 12)
          const isUsed = (image.containers || 0) > 0

          return (
            <Table.Row key={image.id}>
              <Table.Cell>
                <Text fontWeight="medium" fontFamily="mono" fontSize="sm">
                  {repo}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge colorPalette="blue" size="sm">
                  {tag}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                  {shortId}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatRelativeTime(image.created)}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatBytes(image.size)}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge colorPalette={isUsed ? 'green' : 'gray'} size="sm" variant={isUsed ? 'solid' : 'outline'}>
                  {image.containers || 0}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {!isUsed && onRemove && (
                  <Button size="xs" variant="outline" colorPalette="red" onClick={() => onRemove(image.id)}>
                    Remove
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}
