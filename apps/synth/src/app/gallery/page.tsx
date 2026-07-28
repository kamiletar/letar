import type { Patch } from '@/lib/patch/schema'
import { PatchSchema } from '@/lib/patch/schema'
import type { Metadata } from 'next'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GalleryClient } from '../_components/gallery/gallery-client'

export const metadata: Metadata = {
  title: 'Витрина патчей — Synth',
  robots: { index: true, follow: true },
}

// Читает опубликованные патчи из apps/synth/patches/ (см. patches/README.md) — статические JSON,
// отслеживаемые Git; читаем на сервере, чтобы не тащить fs в клиентский бандл.
function loadPublicPatches(): Patch[] {
  const dir = join(process.cwd(), 'patches')
  let files: string[]
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const patches: Patch[] = []
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf-8')
      patches.push(PatchSchema.parse(JSON.parse(raw)))
    } catch {
      // пропускаем битые/неполные файлы — не роняем всю витрину из-за одного плохого JSON
    }
  }
  return patches
}

export default function GalleryPage() {
  const patches = loadPublicPatches()
  return <GalleryClient patches={patches} />
}
