import { type CeremonyState, formatBootBar } from './entry-ceremony'

/**
 * DOM-слой церемонии входа (KM-030, KM-039). Находит размеченные сервером элементы и переносит на них
 * состояние модели: только `opacity`, `transform` и `clip-path`, раскладка не меняется.
 * Серверная разметка уже стоит на финальных местах; до начала часов её скрывает CSS по
 * `html[data-kami-entry]`, а по завершении инлайновые стили снимаются.
 */

export interface LogLineConfig {
  key: string
  label: string
  /** Статус после точек; пусто — строка остаётся голой подписью (заголовок `kami.os`). */
  ok: string
}

export interface LogConfig {
  lines: LogLineConfig[]
  themes: { dark: string; light: string }
}

export interface LetterPoint {
  /** Центр буквы в координатах холста. */
  x: number
  y: number
  /** Высота буквы: от неё зависит увеличение ловца при прилёте. */
  size: number
}

const q = <T extends Element>(root: ParentNode, selector: string) => [...root.querySelectorAll<T>(selector)]
const byIndex = (a: Element, b: Element) =>
  Number(a.getAttribute('data-entry-index') ?? 0) - Number(b.getAttribute('data-entry-index') ?? 0)

/** Пишет стиль только при изменении: кадр не трогает DOM зря. */
function setStyle(element: HTMLElement, name: 'opacity' | 'transform' | 'clipPath' | 'visibility', value: string) {
  if (element.style[name] !== value) { element.style[name] = value }
}

export function createEntryDom(root: ParentNode, theme: string | undefined) {
  const letters = q<HTMLElement>(root, '[data-entry-letter]').sort(byIndex)
  const menu = q<HTMLElement>(root, '[data-entry-menu]').sort(byIndex)
  const role = root.querySelector<HTMLElement>('[data-entry-role]')
  const cursor = root.querySelector<HTMLElement>('[data-entry-cursor]')
  const log = root.querySelector<HTMLElement>('[data-entry-log]')
  const corner = q<HTMLElement>(root, '[data-entry-corner]')

  let config: LogConfig | null = null
  try {
    config = log ? JSON.parse(log.getAttribute('data-entry-log-config') ?? 'null') : null
  } catch {
    config = null
  }
  const lines = (config?.lines ?? []).map((line) => {
    const element = document.createElement('div')
    return {
      ...line,
      ok: line.key === 'theme' && config ? (theme === 'dark' ? config.themes.dark : config.themes.light) : line.ok,
      element,
      text: '',
    }
  })
  // Полоса загрузки: последняя строка лога, печатается блоками по расписанию.
  const bar = document.createElement('div')
  bar.setAttribute('data-entry-bar', '')
  let barText = ''
  const lineCursor = document.createElement('span')
  lineCursor.setAttribute('data-entry-line-cursor', '')
  lineCursor.textContent = '▌'
  if (log) { log.replaceChildren(...lines.map((line) => line.element), bar) }

  function applyLog(state: CeremonyState) {
    if (!log) { return }
    setStyle(log, 'opacity', String(Math.round(state.log.opacity * 1000) / 1000))
    setStyle(log, 'transform', `translateY(${(-state.log.leave * 28).toFixed(1)}px)`)
    let last = -1
    lines.forEach((line, index) => {
      const progress = state.bootLines.find((item) => item.key === line.key)
      if (!progress || progress.visible <= 0) {
        if (line.text !== '') {
          line.element.textContent = ''
          line.text = ''
        }
        return
      }
      last = index
      let text = line.label.slice(0, Math.ceil(progress.visible * line.label.length))
      // Строка без статуса (заголовок `kami.os`) остаётся голой подписью.
      if (progress.visible >= 1 && line.ok) {
        text += ' …'
        if (progress.status === 'ok') { text += ` ${line.ok}` }
      }
      if (text !== line.text) {
        line.element.textContent = text
        line.text = text
      }
    })
    // Полоса появляется, когда началась первая строка, и идёт по времени boot-фазы.
    const nextBar = last >= 0 ? formatBootBar(state.bootProgress) : ''
    if (nextBar !== barText) {
      bar.textContent = nextBar
      barText = nextBar
    }
    // Курсор один: на последней начатой строке, пока лог на экране.
    const holder = last >= 0 && state.log.opacity > 0 ? lines[last].element : null
    if (holder && lineCursor.parentElement !== holder) { holder.append(lineCursor) }
    if (!holder) { lineCursor.remove() }
  }

  function applyRole(state: CeremonyState) {
    if (!role) { return }
    const progress = state.role
    setStyle(role, 'opacity', progress > 0 ? '1' : '0')
    setStyle(role, 'clipPath', `inset(0 ${((1 - progress) * 100).toFixed(2)}% 0 0)`)
    if (cursor) {
      const typing = progress > 0 && progress < 1
      setStyle(cursor, 'opacity', typing ? '1' : '0')
      setStyle(cursor, 'transform', `translateX(${(progress * 100).toFixed(2)}%)`)
    }
  }

  return {
    counts: { letters: letters.length || 4, menu: menu.length || 5 },
    hasLog: Boolean(log && lines.length),
    apply(state: CeremonyState) {
      letters.forEach((letter, i) => {
        const value = state.nameLetters[i] ?? 1
        setStyle(letter, 'opacity', String(Math.round(value * 1000) / 1000))
        setStyle(letter, 'transform', `scale(${(.96 + .04 * value).toFixed(4)})`)
      })
      applyRole(state)
      menu.forEach((item, i) => {
        const value = state.menuItems[i] ?? 1
        setStyle(item, 'opacity', String(Math.round(value * 1000) / 1000))
        setStyle(item, 'transform', `translateY(${((1 - value) * 8).toFixed(2)}px)`)
      })
      applyLog(state)
      corner.forEach((item) => {
        // Значки в углу не должны получать фокус и касания, пока вход скрывает их.
        setStyle(item, 'visibility', state.corner > 0 ? 'visible' : 'hidden')
        setStyle(item, 'opacity', String(Math.round(state.corner * 1000) / 1000))
      })
    },
    /** Центры букв имени относительно хоста холста; вызывается на resize, не на кадре. */
    measureLetters(host: DOMRect): LetterPoint[] {
      return letters.map((letter) => {
        const box = letter.getBoundingClientRect()
        return { x: box.left - host.left + box.width / 2, y: box.top - host.top + box.height / 2, size: box.height }
      })
    },
    /** Возвращает серверную разметку в естественное состояние. */
    clear() {
      for (
        const element of [
          ...letters,
          ...menu,
          ...corner,
          ...(role ? [role] : []),
          ...(cursor ? [cursor] : []),
          ...(log ? [log] : []),
        ]
      ) {
        element.style.removeProperty('opacity')
        element.style.removeProperty('visibility')
        element.style.removeProperty('transform')
        element.style.removeProperty('clip-path')
      }
      // Курсор роли по умолчанию скрыт серверным стилем; снятие инлайна не должно его показать.
      if (cursor) { cursor.style.opacity = '0' }
      lineCursor.remove()
      for (const line of lines) {
        line.element.textContent = ''
        line.text = ''
      }
      bar.textContent = ''
      barText = ''
    },
  }
}

export type EntryDom = ReturnType<typeof createEntryDom>
