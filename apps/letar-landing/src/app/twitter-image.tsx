import { SocialImage } from '@/app/_components/social-image'
import { ImageResponse } from 'next/og'

export const alt = 'Letar — проекты, сайты, приложения и open source'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Большая карточка для публикаций в X/Twitter */
export default function TwitterImage() {
  return new ImageResponse(<SocialImage />, size)
}
