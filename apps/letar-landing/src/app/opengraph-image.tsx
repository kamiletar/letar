import { SocialImage } from '@/app/_components/social-image'
import { ImageResponse } from 'next/og'

export const alt = 'Letar — проекты, сайты, приложения и open source'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Open Graph-карточка для соцсетей и мессенджеров */
export default function OpenGraphImage() {
  return new ImageResponse(<SocialImage />, size)
}
