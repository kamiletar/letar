import { nextVersionInput, type VersionContent } from './versions'

/** Версия с данными, нужными для поиска веток */
export interface BranchVersion extends VersionContent {
  id: string
  parentId: string | null
  /** Вторая голова, слитая в эту версию */
  mergedFromId: string | null
}

export interface BranchInput extends VersionContent {
  parentId: string | null
  deviceId: string | null
}

export interface MergeInput extends BranchInput {
  mergedFromId: string
}

/**
 * «Головы» истории: версии, на которые никто не ссылается ни как на родителя, ни как на слитую ветку.
 * Одна голова — история линейная, больше — есть непримирённые ветки.
 */
export function findHeads<T extends Pick<BranchVersion, 'id' | 'parentId' | 'mergedFromId'>>(versions: T[]): T[] {
  const referenced = new Set<string>()
  for (const version of versions) {
    if (version.parentId) {
      referenced.add(version.parentId)
    }
    if (version.mergedFromId) {
      referenced.add(version.mergedFromId)
    }
  }
  return versions.filter((version) => !referenced.has(version.id))
}

/**
 * Правка от устаревшей версии: сохраняем её как ветку от той версии, которую видело устройство.
 * Текущая версия заметки при этом не меняется.
 */
export function branchInput(
  base: (VersionContent & { id: string }) | null,
  draft: VersionContent,
  deviceId: string | null = null,
): BranchInput | null {
  return nextVersionInput(base, draft, deviceId)
}

/** Слияние двух голов: новая версия с текстом, который выбрал владелец. Родитель — основная голова */
export function mergeInput(
  main: Pick<BranchVersion, 'id'>,
  other: Pick<BranchVersion, 'id'>,
  content: VersionContent,
): MergeInput | null {
  if (main.id === other.id) {
    return null
  }
  return {
    parentId: main.id,
    mergedFromId: other.id,
    title: content.title.trim(),
    body: content.body.replace(/\r\n?/g, '\n'),
    deviceId: null,
  }
}
