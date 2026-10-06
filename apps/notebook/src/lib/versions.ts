/** Содержимое версии, которое сравниваем и копируем при откате */
export interface VersionContent {
  title: string
  body: string
}

export interface VersionRef extends VersionContent {
  id: string
}

/** Данные для создания новой версии (id и время проставит база) */
export interface NewVersionInput extends VersionContent {
  parentId: string | null
  deviceId: string | null
}

export type DiffLine = { type: 'same' | 'add' | 'del'; text: string }

/** Переводы строк приводим к LF: правка с телефона и с компьютера не должна выглядеть изменением */
function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function sameContent(a: VersionContent, b: VersionContent): boolean {
  return a.title.trim() === b.title.trim() && normalize(a.body) === normalize(b.body)
}

/**
 * Новая версия по правке. Возвращает `null`, если создавать нечего:
 * текст не менялся или первая заметка пустая.
 */
export function nextVersionInput(
  current: VersionRef | null,
  draft: VersionContent,
  deviceId: string | null = null,
): NewVersionInput | null {
  if (current === null) {
    if (draft.title.trim() === '' && draft.body.trim() === '') {
      return null
    }
  } else if (sameContent(current, draft)) {
    return null
  }
  return {
    parentId: current?.id ?? null,
    title: draft.title.trim(),
    body: normalize(draft.body),
    deviceId,
  }
}

/**
 * Откат: старые версии не трогаем, создаём новую со старым текстом.
 * Родитель — текущая версия, поэтому история остаётся линейной и ничего не теряется.
 */
export function revertInput(current: VersionRef, target: VersionRef): NewVersionInput | null {
  if (target.id === current.id || sameContent(current, target)) {
    return null
  }
  return nextVersionInput(current, target)
}

/** Построчное сравнение двух текстов (наибольшая общая подпоследовательность) */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText === '' ? [] : normalize(oldText).split('\n')
  const b = newText === '' ? [] : normalize(newText).split('\n')

  // lcs[i][j] — длина общей подпоследовательности хвостов a[i..] и b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: 'del', text: a[i++] })
    } else {
      result.push({ type: 'add', text: b[j++] })
    }
  }
  while (i < a.length) {
    result.push({ type: 'del', text: a[i++] })
  }
  while (j < b.length) {
    result.push({ type: 'add', text: b[j++] })
  }
  return result
}

const TITLE_MAX = 80

/** Название для списка: заголовок, иначе первая непустая строка текста без `#` */
export function displayTitle({ title, body }: VersionContent): string {
  const own = title.trim()
  const line = own || normalize(body).split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean)
  return (line ?? 'Без названия').slice(0, TITLE_MAX)
}
