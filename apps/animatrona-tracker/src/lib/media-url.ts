/**
 * Media URL хелперы для трекера
 *
 * В отличие от web (прокси /api/ipfs/), трекер использует
 * прямой доступ к IPFS gateway через nginx с кэшированием.
 */

import { createMediaUrlHelpers, type MediaUrlHelpers } from '@letar/animatrona-utils'
import { useMemo } from 'react'

import { getIpfsUrl } from './ipfs'
import { useIpfsGateway } from './use-ipfs-gateway'

const helpers = createMediaUrlHelpers((cid) => getIpfsUrl(cid))

export const { toPlayerUrl, getVideoUrl, getAudioUrl, getSubtitleUrl, getFontUrls } = helpers

/**
 * Клиентский хук — media URL хелперы с учётом кастомного IPFS gateway пользователя
 * (`User.customGateway`, настраивается в /profile).
 */
export function useMediaUrlHelpers(): MediaUrlHelpers {
  const { getIpfsUrl: getIpfsUrlWithGateway } = useIpfsGateway()
  return useMemo(
    () => createMediaUrlHelpers((cid) => getIpfsUrlWithGateway(cid)),
    [getIpfsUrlWithGateway],
  )
}
