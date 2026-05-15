'use client'

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog'
import { formatBytes } from '@/lib/format'
import { Badge, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LuTrash2, LuTriangleAlert } from 'react-icons/lu'

interface OldUploadsInfo {
  appName: string
  daysOld: number
  filesCount: number
  totalSize: number
}

interface CleanResult {
  success: boolean
  dryRun: boolean
  message: string
  filesCount: number
  totalSize: number
  files?: string[]
}

async function fetchOldUploadsInfo(appName: string, daysOld: number): Promise<OldUploadsInfo> {
  const res = await fetch(`/api/apps/${appName}/clean-uploads?daysOld=${daysOld}`)
  if (!res.ok) {
    throw new Error('Failed to fetch info')
  }
  return res.json()
}

async function cleanUploads(appName: string, daysOld: number, dryRun: boolean): Promise<CleanResult> {
  const res = await fetch(`/api/apps/${appName}/clean-uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daysOld, dryRun }),
  })
  if (!res.ok) {
    throw new Error('Failed to clean uploads')
  }
  return res.json()
}

interface CleanUploadsButtonProps {
  appName: string
  daysOld?: number
}

export function CleanUploadsButton({ appName, daysOld = 1 }: CleanUploadsButtonProps) {
  const [open, setOpen] = useState(false)
  const [previewData, setPreviewData] = useState<CleanResult | null>(null)
  const queryClient = useQueryClient()

  const { data: info } = useQuery({
    queryKey: ['old-uploads', appName, daysOld],
    queryFn: () => fetchOldUploadsInfo(appName, daysOld),
    refetchInterval: 60000,
  })

  const previewMutation = useMutation({
    mutationFn: () => cleanUploads(appName, daysOld, true),
    onSuccess: (data) => {
      setPreviewData(data)
    },
  })

  const cleanMutation = useMutation({
    mutationFn: () => cleanUploads(appName, daysOld, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['old-uploads', appName] })
      queryClient.invalidateQueries({ queryKey: ['app-storage', appName] })
      setOpen(false)
      setPreviewData(null)
    },
  })

  const handleOpen = () => {
    setOpen(true)
    previewMutation.mutate()
  }

  const handleClose = () => {
    setOpen(false)
    setPreviewData(null)
  }

  const handleClean = () => {
    cleanMutation.mutate()
  }

  if (!info || info.filesCount === 0) {
    return (
      <Button size="sm" variant="ghost" disabled colorPalette="gray">
        <Icon mr={1}>
          <LuTrash2 />
        </Icon>
        No temp files
      </Button>
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => (e.open ? handleOpen() : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" colorPalette="red">
          <Icon mr={1}>
            <LuTrash2 />
          </Icon>
          Clean {info.filesCount} temp files ({formatBytes(info.totalSize)})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <HStack>
              <Icon color="red.400">
                <LuTriangleAlert />
              </Icon>
              <Text>Clean Temporary Files</Text>
            </HStack>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack align="stretch" gap={4}>
            <Text>
              This will delete temporary files older than <strong>{daysOld} day(s)</strong> from temp/cache folders.
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Only files in temp, tmp, cache, .cache directories will be deleted.
            </Text>

            {previewMutation.isPending && <Text color="fg.muted">Scanning files...</Text>}

            {previewData && (
              <VStack align="stretch" gap={2} bg="bg.muted" p={4} rounded="md">
                <HStack justify="space-between">
                  <Text color="fg.muted">Files to delete:</Text>
                  <Badge colorPalette="red">{previewData.filesCount}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text color="fg.muted">Space to free:</Text>
                  <Badge colorPalette="green">{formatBytes(previewData.totalSize)}</Badge>
                </HStack>
                {previewData.files && previewData.files.length > 0 && (
                  <VStack align="stretch" gap={1} mt={2} maxH="200px" overflowY="auto">
                    <Text fontSize="xs" color="fg.muted">
                      Sample files:
                    </Text>
                    {previewData.files.map((file, idx) => (
                      <Text key={idx} fontSize="xs" fontFamily="mono" color="fg.muted" lineClamp={1}>
                        {file.split('/').pop()}
                      </Text>
                    ))}
                    {previewData.filesCount > 20 && (
                      <Text fontSize="xs" color="fg.muted">
                        ...and {previewData.filesCount - 20} more files
                      </Text>
                    )}
                  </VStack>
                )}
              </VStack>
            )}

            <Text color="red.300" fontSize="sm">
              This action cannot be undone!
            </Text>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <HStack gap={2}>
            <DialogCloseTrigger asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogCloseTrigger>
            <Button
              colorPalette="red"
              onClick={handleClean}
              loading={cleanMutation.isPending}
              disabled={!previewData || previewData.filesCount === 0}
            >
              <Icon mr={1}>
                <LuTrash2 />
              </Icon>
              Delete {previewData?.filesCount || 0} files
            </Button>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
