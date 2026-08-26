'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  HStack,
  Input,
  Progress,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuCheck, LuFile, LuFilm, LuFolderOpen, LuPlay, LuStar, LuZap } from 'react-icons/lu'

import { Header } from '@/components/layout'
import { ComparePlayer } from '@/components/player'
import { useFindManyEncodingProfile } from '@/lib/hooks'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

interface FileInfo {
  path: string
  resolution: string
  fps: string
  codec: string
  bitDepth: number
  duration: number
  durationStr: string
  fileSize: number // размер файла в байтах
}

interface EncodingJob {
  profileId: string
  profileName: string
  status: 'pending' | 'encoding' | 'done' | 'error'
  progress: number
  outputPath?: string
  error?: string
  outputSize?: number // размер выходного файла в байтах
  encodingTime?: number // время кодирования в секундах
}

/**
 * Wizard для тестирования профилей кодирования
 */
/** Контент страницы без Header — для встраивания в табы */
export function TestEncodingContent() {
  const router = useRouter()

  // Шаг wizard'а (1-4)
  const [step, setStep] = useState(1)

  // Шаг 1: Выбор файла
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [isProbing, setIsProbing] = useState(false)

  // Шаг 1: Настройки сэмпла
  const [sampleStart, setSampleStart] = useState(0)
  const [sampleDuration, setSampleDuration] = useState(300) // 5 минут

  // Шаг 2: Выбор профилей
  const { data: profiles } = useFindManyEncodingProfile({
    orderBy: [{ isBuiltIn: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
  })
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])

  // Параллельное кодирование (RTX 5080 поддерживает Dual Encoders)
  const [parallelEncoding, setParallelEncoding] = useState(2)

  // Шаг 3: Процесс кодирования
  const [jobs, setJobs] = useState<EncodingJob[]>([])
  const [isEncoding, setIsEncoding] = useState(false)

  // Шаг 4: Сравнение
  const [compareVideos, setCompareVideos] = useState<{ a: string; b: string; labelA: string; labelB: string } | null>(
    null,
  )

  // Выбрать файл
  const handleSelectFile = async () => {
    const filePath = await window.electronAPI?.dialog.selectFile([
      { name: 'Video', extensions: ['mkv', 'mp4', 'avi', 'mov', 'webm'] },
    ])

    if (!filePath) {
      return
    }

    setIsProbing(true)
    try {
      // Получаем информацию о файле параллельно
      const [probeResult, statResult] = await Promise.all([
        window.electronAPI?.ffmpeg.probe(filePath),
        window.electronAPI?.fs.stat(filePath),
      ])

      if (probeResult?.success && probeResult.data) {
        const video = probeResult.data.videoTracks?.[0]
        const duration = probeResult.data.duration || 0

        setFileInfo({
          path: filePath,
          resolution: video ? `${video.width}×${video.height}` : 'N/A',
          fps: video?.fps ? `${video.fps.toFixed(2)} fps` : 'N/A',
          codec: video?.codec || 'N/A',
          bitDepth: video?.bitDepth || 8,
          duration,
          durationStr: formatDuration(duration),
          fileSize: statResult?.size || 0,
        })
      }
    } finally {
      setIsProbing(false)
    }
  }

  // Форматирование времени
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Форматирование размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // Форматирование битрейта
  const formatBitrate = (bytes: number, seconds: number) => {
    if (seconds <= 0) {
      return 'N/A'
    }
    const mbps = (bytes * 8) / (seconds * 1000000)
    return `${mbps.toFixed(1)} Mbps`
  }

  // Вычисление процента сжатия относительно оригинала
  const getCompressionPercent = (outputSize: number) => {
    if (!fileInfo || fileInfo.fileSize <= 0 || fileInfo.duration <= 0) {
      return null
    }
    // Пропорционально: ожидаемый размер сэмпла = fileSize * (sampleDuration / totalDuration)
    const expectedSampleSize = fileInfo.fileSize * (sampleDuration / fileInfo.duration)
    return ((outputSize / expectedSampleSize) * 100).toFixed(0)
  }

  // Toggle выбор профиля
  const toggleProfile = (id: string) => {
    setSelectedProfiles((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(0, 4)))
  }

  // Начать кодирование
  const startEncoding = async () => {
    if (!fileInfo || selectedProfiles.length < 2) {
      return
    }

    const selectedProfilesData = profiles?.filter((p) => selectedProfiles.includes(p.id)) || []

    // Создать jobs
    const newJobs: EncodingJob[] = selectedProfilesData.map((p) => ({
      profileId: p.id,
      profileName: p.name,
      status: 'pending',
      progress: 0,
    }))

    setJobs(newJobs)
    setIsEncoding(true)
    setStep(3)

    // Получить папку для output
    const appPath = await window.electronAPI?.app.getPath('temp')
    const outputDir = `${appPath}/animatrona-samples`

    // Подписаться на события прогресса
    const unsubscribe = window.electronAPI?.ffmpeg.onProgress((data) => {
      if (data.type === 'sample') {
        setJobs((prev) =>
          prev.map((job) => {
            if (job.profileName === data.profileName) {
              return { ...job, progress: data.percent || 0 }
            }
            return job
          })
        )
      }
    })

    // Функция кодирования одного профиля
    const encodeProfile = async (profile: (typeof selectedProfilesData)[0]) => {
      const outputPath = `${outputDir}/${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_sample.mkv`

      setJobs((prev) => prev.map((job) => (job.profileId === profile.id ? { ...job, status: 'encoding' } : job)))

      try {
        const result = await window.electronAPI?.ffmpeg.encodeSample({
          inputPath: fileInfo.path,
          outputPath,
          profile: {
            id: profile.id,
            name: profile.name,
            codec: profile.codec as 'AV1' | 'H264' | 'HEVC',
            useGpu: profile.useGpu,
            rateControl: profile.rateControl as 'VBR' | 'CONSTQP' | 'CQ',
            cq: profile.cq,
            maxBitrate: profile.maxBitrate,
            preset: profile.preset,
            tune: profile.tune as 'NONE' | 'HQ' | 'UHQ' | 'ULL' | 'LL',
            multipass: profile.multipass as 'DISABLED' | 'QRES' | 'FULLRES',
            spatialAq: profile.spatialAq,
            temporalAq: profile.temporalAq,
            aqStrength: profile.aqStrength,
            lookahead: profile.lookahead,
            lookaheadLevel: profile.lookaheadLevel,
            gopSize: profile.gopSize,
            bRefMode: profile.bRefMode as 'DISABLED' | 'EACH' | 'MIDDLE',
            force10Bit: profile.force10Bit,
            temporalFilter: profile.temporalFilter,
          },
          startTime: sampleStart,
          duration: sampleDuration,
          sourceBitDepth: fileInfo.bitDepth,
        })

        if (result?.success) {
          setJobs((prev) =>
            prev.map((job) =>
              job.profileId === profile.id
                ? {
                  ...job,
                  status: 'done',
                  progress: 100,
                  outputPath: result.outputPath,
                  outputSize: result.outputSize,
                  encodingTime: result.encodingTime,
                }
                : job
            )
          )
        } else {
          setJobs((prev) =>
            prev.map((job) =>
              job.profileId === profile.id ? { ...job, status: 'error', error: result?.error || 'Unknown error' } : job
            )
          )
        }
      } catch (err) {
        setJobs((prev) =>
          prev.map((job) => (job.profileId === profile.id ? { ...job, status: 'error', error: String(err) } : job))
        )
      }
    }

    // Кодировать batch-ами (parallelEncoding = количество параллельных потоков)
    // RTX 5080 с Dual Encoders поддерживает 2 потока одновременно
    for (let i = 0; i < selectedProfilesData.length; i += parallelEncoding) {
      const batch = selectedProfilesData.slice(i, i + parallelEncoding)
      await Promise.all(batch.map((profile) => encodeProfile(profile)))
    }

    unsubscribe?.()
    setIsEncoding(false)
  }

  // Открыть сравнение
  const openCompare = (jobA: EncodingJob, jobB: EncodingJob) => {
    if (!jobA.outputPath || !jobB.outputPath) {
      return
    }

    setCompareVideos({
      a: `media://${jobA.outputPath}`,
      b: `media://${jobB.outputPath}`,
      labelA: jobA.profileName,
      labelB: jobB.profileName,
    })
    setStep(4)
  }

  // Проверить можно ли перейти дальше
  const canProceed = () => {
    switch (step) {
      case 1:
        return fileInfo !== null
      case 2:
        return selectedProfiles.length >= 2
      case 3:
        return jobs.every((j) => j.status === 'done' || j.status === 'error')
      default:
        return false
    }
  }

  // Completed jobs для step 3
  const completedJobs = jobs.filter((j) => j.status === 'done')

  return (
    <Box p={6}>
      <VStack gap={6} align="stretch" maxW="900px" mx="auto">
        {/* Шаги */}
        <HStack justify="center" gap={8}>
          {[1, 2, 3, 4].map((s) => (
            <HStack key={s} gap={2}>
              <Box
                w={8}
                h={8}
                borderRadius="full"
                bg={step >= s ? 'purple.500' : 'bg.subtle'}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {step > s
                  ? <LuCheck size={20} color="var(--chakra-colors-white)" />
                  : <Text fontWeight="bold">{s}</Text>}
              </Box>
              <Text fontSize="sm" color={step >= s ? 'fg' : 'fg.subtle'}>
                {s === 1 && 'Файл'}
                {s === 2 && 'Профили'}
                {s === 3 && 'Кодирование'}
                {s === 4 && 'Сравнение'}
              </Text>
            </HStack>
          ))}
        </HStack>

        {/* Шаг 1: Выбор файла */}
        {step === 1 && (
          <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
            <Card.Header>
              <HStack gap={3}>
                <LuFile size={20} color="var(--chakra-colors-purple-400)" />
                <Heading size="md">Выберите исходный файл</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <VStack gap={6} align="stretch">
                <HStack>
                  <Box flex={1} p={3} bg="bg.subtle" borderRadius="md" color={fileInfo ? 'fg' : 'fg.subtle'}>
                    {fileInfo?.path || 'Файл не выбран'}
                  </Box>
                  <Button onClick={handleSelectFile} disabled={isProbing}>
                    {isProbing
                      ? <Spinner size="sm" mr={2} />
                      : <LuFolderOpen size={16} style={{ marginRight: 8 }} />}
                    Выбрать
                  </Button>
                </HStack>

                {fileInfo && (
                  <Box p={4} bg="bg.subtle" borderRadius="md">
                    <Heading size="sm" mb={3}>
                      Информация о файле
                    </Heading>
                    <HStack gap={4} flexWrap="wrap">
                      <Badge colorPalette="blue">{fileInfo.resolution}</Badge>
                      <Badge colorPalette="green">{fileInfo.fps}</Badge>
                      <Badge colorPalette="purple">{fileInfo.codec}</Badge>
                      <Badge colorPalette="orange">{fileInfo.bitDepth}-bit</Badge>
                      <Badge colorPalette="gray">{fileInfo.durationStr}</Badge>
                    </HStack>
                  </Box>
                )}

                {fileInfo && (
                  <Box>
                    <Heading size="sm" mb={3}>
                      Настройки сэмпла
                    </Heading>
                    <HStack gap={4}>
                      <Box flex={1}>
                        <Text fontSize="sm" color="fg.muted" mb={1}>
                          Начало (секунды)
                        </Text>
                        <Input
                          type="number"
                          value={sampleStart}
                          onChange={(e) => setSampleStart(Number(e.target.value))}
                          min={0}
                          max={fileInfo.duration - sampleDuration}
                        />
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" color="fg.muted" mb={1}>
                          Длительность (секунды)
                        </Text>
                        <Input
                          type="number"
                          value={sampleDuration}
                          onChange={(e) => setSampleDuration(Number(e.target.value))}
                          min={10}
                          max={600}
                        />
                      </Box>
                    </HStack>
                    <Text fontSize="xs" color="fg.subtle" mt={2}>
                      Рекомендуется 300 секунд (5 минут) для точного сравнения
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Шаг 2: Выбор профилей */}
        {step === 2 && (
          <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
            <Card.Header>
              <HStack gap={3}>
                <LuFilm size={20} color="var(--chakra-colors-purple-400)" />
                <Heading size="md">Выберите профили для сравнения (2-4)</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                {profiles?.map((profile) => (
                  <HStack
                    key={profile.id}
                    p={3}
                    bg={selectedProfiles.includes(profile.id) ? 'purple.900' : 'bg.subtle'}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => toggleProfile(profile.id)}
                    _hover={{ bg: selectedProfiles.includes(profile.id) ? 'purple.800' : 'bg.subtle' }}
                  >
                    <Checkbox.Root
                      checked={selectedProfiles.includes(profile.id)}
                      onCheckedChange={() => toggleProfile(profile.id)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                    <HStack gap={3} flex={1}>
                      {profile.isDefault && <LuStar size={16} color="var(--chakra-colors-yellow-400)" />}
                      <Box>
                        <HStack gap={2}>
                          <Text fontWeight="medium">{profile.name}</Text>
                          {profile.isBuiltIn && (
                            <Badge size="sm" colorPalette="purple" variant="subtle">
                              Встроенный
                            </Badge>
                          )}
                        </HStack>
                        <HStack gap={2} mt={1}>
                          <Badge size="xs" variant="outline">
                            CQ:{profile.cq}
                          </Badge>
                          <Badge size="xs" variant="outline">
                            {profile.preset}
                          </Badge>
                          {profile.tune !== 'NONE' && (
                            <Badge size="xs" variant="outline">
                              {profile.tune.toLowerCase()}
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    </HStack>
                  </HStack>
                ))}

                <Text fontSize="sm" color="fg.subtle" mt={2}>
                  Выбрано: {selectedProfiles.length}/4 профилей
                  {selectedProfiles.length < 2 && ' (минимум 2)'}
                </Text>

                {/* Настройка параллельного кодирования */}
                <Box p={4} bg="bg.subtle" borderRadius="md" mt={4}>
                  <HStack gap={3} mb={3}>
                    <LuZap size={20} color="var(--chakra-colors-yellow-400)" />
                    <Text fontWeight="medium">Параллельное кодирование</Text>
                  </HStack>
                  <HStack gap={4}>
                    <Button
                      size="sm"
                      variant={parallelEncoding === 1 ? 'solid' : 'outline'}
                      colorPalette={parallelEncoding === 1 ? 'purple' : 'gray'}
                      onClick={() => setParallelEncoding(1)}
                    >
                      1 поток
                    </Button>
                    <Button
                      size="sm"
                      variant={parallelEncoding === 2 ? 'solid' : 'outline'}
                      colorPalette={parallelEncoding === 2 ? 'purple' : 'gray'}
                      onClick={() => setParallelEncoding(2)}
                    >
                      2 потока (Dual Encoders)
                    </Button>
                  </HStack>
                  <Text fontSize="xs" color="fg.subtle" mt={2}>
                    RTX 5080 поддерживает 2 параллельных NVENC потока
                  </Text>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Шаг 3: Кодирование */}
        {step === 3 && (
          <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
            <Card.Header>
              <HStack gap={3} justify="space-between" w="full">
                <HStack gap={3}>
                  <LuPlay size={20} color="var(--chakra-colors-purple-400)" />
                  <Heading size="md">Кодирование сэмплов</Heading>
                </HStack>
                {parallelEncoding === 2 && (
                  <Badge colorPalette="yellow" variant="subtle">
                    <LuZap size={16} style={{ marginRight: 4 }} />
                    Dual Encoders
                  </Badge>
                )}
              </HStack>
            </Card.Header>
            <Card.Body>
              <VStack gap={4} align="stretch">
                {jobs.map((job) => (
                  <Box key={job.profileId} p={4} bg="bg.subtle" borderRadius="md">
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="medium">{job.profileName}</Text>
                      <Badge
                        colorPalette={job.status === 'done'
                          ? 'green'
                          : job.status === 'error'
                          ? 'red'
                          : job.status === 'encoding'
                          ? 'purple'
                          : 'gray'}
                      >
                        {job.status === 'pending' && 'Ожидание'}
                        {job.status === 'encoding' && 'Кодирование...'}
                        {job.status === 'done' && 'Готово'}
                        {job.status === 'error' && 'Ошибка'}
                      </Badge>
                    </HStack>
                    <Progress.Root value={job.progress}>
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>

                    {/* Метрики после завершения */}
                    {job.status === 'done' && job.outputSize && (
                      <HStack gap={4} mt={3} flexWrap="wrap">
                        <HStack gap={1}>
                          <Text fontSize="sm" color="fg.muted">
                            📦
                          </Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {formatFileSize(job.outputSize)}
                          </Text>
                        </HStack>
                        {job.encodingTime && (
                          <HStack gap={1}>
                            <Text fontSize="sm" color="fg.muted">
                              ⏱
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">
                              {Math.round(job.encodingTime)}s
                            </Text>
                          </HStack>
                        )}
                        <HStack gap={1}>
                          <Text fontSize="sm" color="fg.muted">
                            📊
                          </Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {formatBitrate(job.outputSize, sampleDuration)}
                          </Text>
                        </HStack>
                        {getCompressionPercent(job.outputSize) && (
                          <HStack gap={1}>
                            <Text fontSize="sm" color="fg.muted">
                              📉
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color={Number(getCompressionPercent(job.outputSize)) < 50 ? 'green.400' : 'yellow.400'}
                            >
                              {getCompressionPercent(job.outputSize)}% от ориг.
                            </Text>
                          </HStack>
                        )}
                      </HStack>
                    )}

                    {job.error && (
                      <Text fontSize="sm" color="red.400" mt={2}>
                        {job.error}
                      </Text>
                    )}
                  </Box>
                ))}

                {completedJobs.length >= 2 && !isEncoding && (
                  <Box mt={4}>
                    <Heading size="sm" mb={3}>
                      Сравнить результаты
                    </Heading>
                    <HStack gap={2} flexWrap="wrap">
                      {completedJobs.map((jobA, i) =>
                        completedJobs.slice(i + 1).map((jobB) => (
                          <Button
                            key={`${jobA.profileId}-${jobB.profileId}`}
                            size="sm"
                            variant="outline"
                            onClick={() => openCompare(jobA, jobB)}
                          >
                            {jobA.profileName} vs {jobB.profileName}
                          </Button>
                        ))
                      )}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Шаг 4: Сравнение */}
        {step === 4 && compareVideos && (
          <VStack gap={4} align="stretch">
            <HStack justify="space-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                <LuArrowLeft size={16} style={{ marginRight: 8 }} />
                Назад к результатам
              </Button>
            </HStack>

            <ComparePlayer
              videoA={compareVideos.a}
              videoB={compareVideos.b}
              labelA={compareVideos.labelA}
              labelB={compareVideos.labelB}
            />
          </VStack>
        )}

        {/* Навигация */}
        {step < 4 && (
          <HStack justify="space-between" pt={4}>
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? router.push('/settings') : setStep(step - 1))}
              disabled={isEncoding}
            >
              <LuArrowLeft size={16} style={{ marginRight: 8 }} />
              {step === 1 ? 'К настройкам' : 'Назад'}
            </Button>

            {step === 2
              ? (
                <Button colorPalette="purple" onClick={startEncoding} disabled={!canProceed() || isEncoding}>
                  <LuPlay size={16} style={{ marginRight: 8 }} />
                  Начать кодирование
                </Button>
              )
              : step < 3
              ? (
                <Button colorPalette="purple" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                  Далее
                  <LuArrowRight size={16} style={{ marginLeft: 8 }} />
                </Button>
              )
              : null}
          </HStack>
        )}
      </VStack>
    </Box>
  )
}

/** Страница-обёртка для прямого роутинга */
export default function TestEncodingPage() {
  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Тестирование профилей" />
      <TestEncodingContent />
    </Box>
  )
}
