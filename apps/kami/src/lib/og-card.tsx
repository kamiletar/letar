import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OG_SIZE = { width: 1200, height: 630 }

/** Карточка превью ссылки: фото слева на чёрном, справа «KAMI» и строка на языке локали. */
export async function renderOgCard(line: string) {
  const [font, photo] = await Promise.all([
    readFile(join(process.cwd(), 'src/app/fonts/JetBrainsMono-500.ttf')),
    readFile(join(process.cwd(), 'src/assets/site/portrait-og.jpg')),
  ])
  const photoSrc = `data:image/jpeg;base64,${photo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#000',
          color: '#f4f4f5',
          fontFamily: 'JetBrains Mono',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori не работает с next/image */}
        <img src={photoSrc} width={630} height={630} alt="" style={{ width: 630, height: 630 }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '0 56px',
          }}
        >
          <div style={{ fontSize: 112, lineHeight: 1.1 }}>KAMI</div>
          <div style={{ fontSize: 38, lineHeight: 1.3, marginTop: 28, color: '#a1a1aa' }}>{line}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{
        name: 'JetBrains Mono',
        data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer,
        weight: 500,
        style: 'normal',
      }],
    },
  )
}
