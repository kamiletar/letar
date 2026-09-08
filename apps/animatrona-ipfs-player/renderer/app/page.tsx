'use client'

import { Box, Button, Container, Heading, HStack, IconButton, Input, Separator, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'

interface TrackerRow {
  id: string
  name: string
  url: string
  description: string | null
}

interface OpenedRelease {
  directoryCid: string
  name: string
  episodesCount: number
}

export default function HomePage() {
  const [trackers, setTrackers] = useState<TrackerRow[]>([])
  const [trackerName, setTrackerName] = useState('')
  const [trackerUrl, setTrackerUrl] = useState('')
  const [cidInput, setCidInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [openedRelease, setOpenedRelease] = useState<OpenedRelease | null>(null)

  const reloadTrackers = () => {
    window.electronAPI.tracker.list().then(setTrackers)
  }

  useEffect(() => {
    reloadTrackers()
  }, [])

  const handleAddTracker = async () => {
    setError(null)
    if (!trackerName.trim() || !trackerUrl.trim()) {
      return
    }
    try {
      await window.electronAPI.tracker.add({ name: trackerName.trim(), url: trackerUrl.trim() })
      setTrackerName('')
      setTrackerUrl('')
      reloadTrackers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить трекер')
    }
  }

  const handleRemoveTracker = async (id: string) => {
    await window.electronAPI.tracker.remove(id)
    reloadTrackers()
  }

  const handleOpenByCid = async () => {
    const directoryCid = cidInput.trim()
    if (!directoryCid || opening) {
      return
    }
    setError(null)
    setOpening(true)
    try {
      const { manifest, episodes } = await window.electronAPI.manifest.openByCid(directoryCid)
      setOpenedRelease({ directoryCid, name: manifest.name, episodesCount: episodes.length })
      await window.electronAPI.recentRelease.open({
        directoryCid,
        name: manifest.name,
        posterCid: manifest.posterCid ?? null,
        episodesCount: episodes.length,
      })
    } catch (err) {
      setOpenedRelease(null)
      setError(err instanceof Error ? err.message : 'Не удалось открыть раздачу по CID')
    } finally {
      setOpening(false)
    }
  }

  return (
    <Container maxW="container.md" py={12}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="xl">Animatrona IPFS Player</Heading>
          <Text color="fg.muted" mt={1}>
            Просмотр IPFS-раздач аниме по CID — без импорта и кодирования
          </Text>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Посмотреть по CID
          </Heading>
          <HStack>
            <Input
              placeholder="CID директории раздачи"
              value={cidInput}
              onChange={(e) => setCidInput(e.target.value)}
            />
            <Button onClick={handleOpenByCid} loading={opening}>
              Открыть
            </Button>
          </HStack>
          {opening && (
            <Text color="fg.muted" fontSize="sm" mt={2}>
              Запускаю IPFS-узел и читаю манифест — при первом запуске это может занять минуту…
            </Text>
          )}
          {openedRelease && (
            <Box mt={3} borderWidth="1px" borderRadius="md" p={3}>
              <Text fontWeight="medium">{openedRelease.name}</Text>
              <Text fontSize="sm" color="fg.muted">
                {openedRelease.episodesCount} эп. · {openedRelease.directoryCid}
              </Text>
            </Box>
          )}
        </Box>

        <Separator />

        <Box>
          <Heading size="md" mb={3}>
            Трекеры
          </Heading>
          <VStack align="stretch" gap={2} mb={4}>
            {trackers.length === 0 && <Text color="fg.muted">Трекеров пока нет — добавь адрес ниже.</Text>}
            {trackers.map((tracker) => (
              <HStack key={tracker.id} justify="space-between" borderWidth="1px" borderRadius="md" p={3}>
                <Box>
                  <Text fontWeight="medium">{tracker.name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {tracker.url}
                  </Text>
                </Box>
                <IconButton
                  aria-label="Удалить трекер"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleRemoveTracker(tracker.id)}
                >
                  <LuTrash2 />
                </IconButton>
              </HStack>
            ))}
          </VStack>

          <HStack>
            <Input placeholder="Название" value={trackerName} onChange={(e) => setTrackerName(e.target.value)} />
            <Input placeholder="URL трекера" value={trackerUrl} onChange={(e) => setTrackerUrl(e.target.value)} />
            <Button onClick={handleAddTracker}>Добавить</Button>
          </HStack>
        </Box>

        {error && (
          <Text color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}
      </VStack>
    </Container>
  )
}
