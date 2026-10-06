import { describe, expect, it } from 'vitest'
import { diffLines, displayTitle, nextVersionInput, revertInput } from './versions'

const current = { id: 'v2', title: 'Заметка', body: 'один\nдва' }

describe('nextVersionInput', () => {
  it('первая версия заметки не имеет родителя', () => {
    expect(nextVersionInput(null, { title: 'Т', body: 'текст' }, 'phone')).toEqual({
      parentId: null,
      title: 'Т',
      body: 'текст',
      deviceId: 'phone',
    })
  })

  it('правка ссылается на текущую версию как на родителя', () => {
    const input = nextVersionInput(current, { title: 'Заметка', body: 'один\nдва\nтри' })
    expect(input).toMatchObject({ parentId: 'v2', body: 'один\nдва\nтри' })
  })

  it('без изменений новая версия не создаётся', () => {
    expect(nextVersionInput(current, { title: 'Заметка', body: 'один\nдва' })).toBeNull()
  })

  it('изменение только заголовка тоже считается правкой', () => {
    expect(nextVersionInput(current, { title: 'Другое', body: 'один\nдва' })).not.toBeNull()
  })

  it('пустая первая заметка не сохраняется', () => {
    expect(nextVersionInput(null, { title: '  ', body: '\n ' })).toBeNull()
  })

  it('перевод строк CRLF и LF не считается правкой', () => {
    expect(nextVersionInput(current, { title: 'Заметка', body: 'один\r\nдва' })).toBeNull()
  })
})

describe('revertInput', () => {
  const old = { id: 'v1', title: 'Старое', body: 'один' }

  it('откат — новая версия со старым текстом, родитель — текущая версия', () => {
    expect(revertInput(current, old)).toEqual({
      parentId: 'v2',
      title: 'Старое',
      body: 'один',
      deviceId: null,
    })
  })

  it('откат на текущую версию ничего не делает', () => {
    expect(revertInput(current, current)).toBeNull()
  })

  it('откат на версию с тем же текстом ничего не делает', () => {
    expect(revertInput(current, { id: 'v0', title: 'Заметка', body: 'один\nдва' })).toBeNull()
  })
})

describe('diffLines', () => {
  it('одинаковый текст — только общие строки', () => {
    expect(diffLines('а\nб', 'а\nб')).toEqual([
      { type: 'same', text: 'а' },
      { type: 'same', text: 'б' },
    ])
  })

  it('добавленная и удалённая строки', () => {
    expect(diffLines('а\nб\nв', 'а\nв\nг')).toEqual([
      { type: 'same', text: 'а' },
      { type: 'del', text: 'б' },
      { type: 'same', text: 'в' },
      { type: 'add', text: 'г' },
    ])
  })

  it('замена строки — удаление, затем добавление', () => {
    expect(diffLines('а', 'б')).toEqual([
      { type: 'del', text: 'а' },
      { type: 'add', text: 'б' },
    ])
  })

  it('пустой старый текст — всё добавлено', () => {
    expect(diffLines('', 'а\nб')).toEqual([
      { type: 'add', text: 'а' },
      { type: 'add', text: 'б' },
    ])
  })

  it('пустой новый текст — всё удалено', () => {
    expect(diffLines('а', '')).toEqual([{ type: 'del', text: 'а' }])
  })
})

describe('displayTitle', () => {
  it('берёт заголовок, если он есть', () => {
    expect(displayTitle({ title: ' Мысли ', body: 'текст' })).toBe('Мысли')
  })

  it('без заголовка — первая непустая строка без markdown-решёток', () => {
    expect(displayTitle({ title: '', body: '\n## Идея про сайт\nдальше' })).toBe('Идея про сайт')
  })

  it('пустая заметка', () => {
    expect(displayTitle({ title: '', body: '' })).toBe('Без названия')
  })

  it('длинную строку обрезает', () => {
    expect(displayTitle({ title: '', body: 'я'.repeat(200) })).toHaveLength(80)
  })
})
