/**
 * Media URL хелперы для трекера
 *
 * В отличие от web (прокси /api/ipfs/), трекер использует
 * прямой доступ к IPFS gateway через nginx с кэшированием.
 */

import { createMediaUrlHelpers } from '@letar/animatrona-utils'

import { getIpfsUrl } from './ipfs'

const helpers = createMediaUrlHelpers((cid) => getIpfsUrl(cid))

export const { toPlayerUrl, getVideoUrl, getAudioUrl, getSubtitleUrl, getFontUrls } = helpers
