'use client'

/**
 * Страница импорта — объединяет все подстраницы в табы
 *
 * Табы: Rutracker, CID, Торренты, Очередь, Тест профилей
 * Привязка к URL через ?tab= параметр
 * Кнопка "Импорт видео" — дубль с библиотеки для быстрого доступа
 */

import { Box, Button, Icon, Spinner, Tabs } from '@chakra-ui/react'
import nextDynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { LuArrowUpDown, LuDatabase, LuDownload, LuFlaskConical, LuImport, LuListVideo } from 'react-icons/lu'

import { Header } from '@/components/layout'

// Dynamic import для визарда — загружается только при открытии
const ImportWizardDialog = nextDynamic(
  () => import('@/components/import/ImportWizardDialog').then((mod) => mod.ImportWizardDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> },
)

import { ImportCidContentEmbedded } from '../import-cid/page'
import { ImportRutrackerContent } from '../import-rutracker/page'
import { TestEncodingContent } from '../test-encoding/page'
import { TorrentsContent } from '../torrents/page'
import { TranscodeContent } from '../transcode/page'

const TABS = [
  { value: 'rutracker', label: 'Rutracker', icon: LuDatabase },
  { value: 'cid', label: 'CID', icon: LuDownload },
  { value: 'torrents', label: 'Торренты', icon: LuArrowUpDown },
  { value: 'queue', label: 'Очередь', icon: LuListVideo },
  { value: 'test', label: 'Тест профилей', icon: LuFlaskConical },
] as const

/** Контент с табами — обёрнут в Suspense для useSearchParams */
function ImportTabsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'rutracker'

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(details) => router.push(`/import?tab=${details.value}`)}
      variant="line"
      lazyMount
    >
      <Tabs.List>
        {TABS.map(({ value, label, icon: TabIcon }) => (
          <Tabs.Trigger key={value} value={value}>
            <Icon fontSize="sm">
              <TabIcon />
            </Icon>
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="rutracker">
        <ImportRutrackerContent />
      </Tabs.Content>

      <Tabs.Content value="cid">
        <Suspense
          fallback={
            <Box py={8} textAlign="center" color="fg.muted">
              Загрузка...
            </Box>
          }
        >
          <ImportCidContentEmbedded />
        </Suspense>
      </Tabs.Content>

      <Tabs.Content value="torrents">
        <TorrentsContent />
      </Tabs.Content>

      <Tabs.Content value="queue">
        <TranscodeContent />
      </Tabs.Content>

      <Tabs.Content value="test">
        <TestEncodingContent />
      </Tabs.Content>
    </Tabs.Root>
  )
}

export default function ImportPage() {
  const [isImportOpen, setIsImportOpen] = useState(false)

  return (
    <Box>
      <Header title="Импорт" />
      <Box px={4} py={2}>
        {/* Кнопка "Импорт видео" — дубль с библиотеки */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button colorPalette="purple" size="sm" onClick={() => setIsImportOpen(true)}>
            <Icon as={LuImport} mr={2} />
            Импорт видео
          </Button>
        </Box>

        <Suspense
          fallback={
            <Box py={8} textAlign="center" color="fg.muted">
              Загрузка...
            </Box>
          }
        >
          <ImportTabsContent />
        </Suspense>
      </Box>

      {/* Визард импорта видео — условный рендер */}
      {isImportOpen && <ImportWizardDialog open={isImportOpen} onOpenChange={setIsImportOpen} />}
    </Box>
  )
}
