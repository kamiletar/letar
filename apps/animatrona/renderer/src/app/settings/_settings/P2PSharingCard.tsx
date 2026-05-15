'use client'

/**
 * Карточка настроек P2P Sharing (IPFS)
 *
 * Включает:
 * - Статус IPFS ноды
 * - Публикация библиотеки
 * - Подписки на библиотеки других пользователей
 * - Автообновление подписок
 */

import { Card, Heading, HStack, Icon, Separator, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { LuSettings } from 'react-icons/lu'

import {
  IpfsAuditSection,
  IpfsStatusSection,
  PeerSyncSection,
  PublishingSection,
  RemotePinningSection,
  SchedulerSection,
  SubscriptionsSection,
} from './p2p-sharing'
import { useP2PSharing } from './use-p2p-sharing'

/**
 * Основная карточка P2P Sharing
 */
export function P2PSharingCard() {
  const {
    ipfs,
    startIpfs,
    stopIpfs,
    publisher,
    updatePublisherConfig,
    publishLibrary,
    refreshPublisher,
    subscriptions,
    addSubscription,
    removeSubscription,
    refreshSubscription,
    refreshAllSubscriptions,
    scheduler,
    updateSchedulerConfig,
    startScheduler,
    stopScheduler,
    checkNow,
    remotePin,
    updatePinataConfig,
    testPinataAuth,
    refreshRemotePins,
    refreshRemoteStats,
  } = useP2PSharing()

  const queryClient = useQueryClient()
  const ipfsRunning = ipfs.status?.isRunning ?? false

  /** Инвалидировать кэш и обновить счётчик аниме после регенерации */
  const handleRegenerateComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['animes'] })
    void refreshPublisher()
  }, [queryClient, refreshPublisher])

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuSettings} color="purple.400" boxSize={5} />
          <Heading size="md">P2P Sharing</Heading>
        </HStack>
        <Text fontSize="sm" color="fg.subtle" mt={1}>
          Делитесь вашей библиотекой и подписывайтесь на библиотеки других пользователей через IPFS
        </Text>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={6}>
          {/* IPFS Статус */}
          <IpfsStatusSection ipfs={ipfs} onStart={startIpfs} onStop={stopIpfs} />

          <Separator />

          {/* Sync pin-серверов из tracker API */}
          <PeerSyncSection />

          <Separator />

          {/* Публикация */}
          <PublishingSection
            publisher={publisher}
            ipfsRunning={ipfsRunning}
            onUpdateConfig={updatePublisherConfig}
            onPublish={publishLibrary}
            onRegenerateComplete={handleRegenerateComplete}
          />

          <Separator />

          {/* Подписки */}
          <SubscriptionsSection
            subscriptions={subscriptions}
            ipfsRunning={ipfsRunning}
            onAdd={addSubscription}
            onRemove={removeSubscription}
            onRefresh={refreshSubscription}
            onRefreshAll={refreshAllSubscriptions}
          />

          <Separator />

          {/* Планировщик */}
          <SchedulerSection
            scheduler={scheduler}
            ipfsRunning={ipfsRunning}
            onUpdateConfig={updateSchedulerConfig}
            onStart={startScheduler}
            onStop={stopScheduler}
            onCheckNow={checkNow}
          />

          <Separator />

          {/* Аудит хранилища */}
          <IpfsAuditSection />

          <Separator />

          {/* Remote Pinning (Pinata) */}
          <RemotePinningSection
            remotePin={remotePin}
            onUpdateConfig={updatePinataConfig}
            onTestAuth={testPinataAuth}
            onRefreshPins={refreshRemotePins}
            onRefreshStats={refreshRemoteStats}
          />
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
