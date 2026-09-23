/**
 * Клавиатурная доступность Dropzone: Tab ставит фокус на зону, Enter/Space открывают тот же
 * диалог выбора файла, что и клик мышью (PLAN_OPEN_QUESTIONS.md domwellbes, задача про bulk-импорт
 * CSV/XLSX через Dropzone).
 */

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Dropzone } from './dropzone'

describe('Dropzone', () => {
  it('доступна с клавиатуры: role="button", tabIndex=0', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    expect(zone.tabIndex).toBe(0)
  })

  it('Enter открывает системный диалог выбора файла (клик по скрытому input)', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(zone, { key: 'Enter' })

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('Space открывает системный диалог выбора файла', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(zone, { key: ' ' })

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('отключённая зона не реагирует на Enter и не попадает в Tab-последовательность', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={() => {}} disabled />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    expect(zone.tabIndex).toBe(-1)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    fireEvent.keyDown(zone, { key: 'Enter' })
    expect(clickSpy).not.toHaveBeenCalled()
  })
})

describe('Dropzone — фильтрация по accept при drop', () => {
  const dropFiles = (zone: HTMLElement, files: File[]) => {
    fireEvent.drop(zone, { dataTransfer: { files } })
  }

  it('отклоняет файл неподходящего формата: onFilesSelected не вызван, onRejected вызван с причиной', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept="image/*" />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const pdfFile = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' })

    dropFiles(zone, [pdfFile])

    expect(onFilesSelected).not.toHaveBeenCalled()
    expect(onRejected).toHaveBeenCalledWith([pdfFile], 'Неподдерживаемый формат файла')
  })

  it('пропускает файл, совпадающий с accept', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept="image/*" />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const imageFile = new File(['fake'], 'photo.png', { type: 'image/png' })

    dropFiles(zone, [imageFile])

    expect(onRejected).not.toHaveBeenCalled()
    expect(onFilesSelected).toHaveBeenCalledTimes(1)
    const passed = onFilesSelected.mock.calls[0][0] as FileList
    expect(passed.length).toBe(1)
    expect(passed[0]).toBe(imageFile)
  })

  it('при смешанном drop пропускает только подходящие файлы, остальные — в onRejected', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept="image/*" multiple />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const imageFile = new File(['fake'], 'photo.png', { type: 'image/png' })
    const textFile = new File(['plain'], 'notes.txt', { type: 'text/plain' })

    dropFiles(zone, [imageFile, textFile])

    expect(onRejected).toHaveBeenCalledWith([textFile], 'Неподдерживаемый формат файла')
    const passed = onFilesSelected.mock.calls[0][0] as FileList
    expect(passed.length).toBe(1)
    expect(passed[0]).toBe(imageFile)
  })

  it('расширение из accept (.csv,.xlsx) матчится по имени файла, а не по MIME', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept=".csv,.xlsx,.xls" />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    // Некоторые браузеры/ОС не определяют MIME для xlsx — но расширение матчится всё равно
    const xlsxFile = new File(['fake'], 'прайс.xlsx', { type: '' })

    dropFiles(zone, [xlsxFile])

    expect(onRejected).not.toHaveBeenCalled()
    expect(onFilesSelected).toHaveBeenCalledTimes(1)
  })

  it('accept="*/*" пропускает файл любого формата', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept="*/*" />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const anyFile = new File(['fake'], 'archive.zip', { type: 'application/zip' })

    dropFiles(zone, [anyFile])

    expect(onRejected).not.toHaveBeenCalled()
    expect(onFilesSelected).toHaveBeenCalledTimes(1)
  })

  it('без onRejected отклонённый файл просто не передаётся в onFilesSelected', () => {
    const onFilesSelected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} accept="image/*" />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const pdfFile = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' })

    expect(() => dropFiles(zone, [pdfFile])).not.toThrow()
    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('отключённая зона игнорирует drop независимо от accept', () => {
    const onFilesSelected = vi.fn()
    const onRejected = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dropzone onFilesSelected={onFilesSelected} onRejected={onRejected} accept="image/*" disabled />
      </ChakraProvider>,
    )
    const zone = screen.getByRole('button')
    const imageFile = new File(['fake'], 'photo.png', { type: 'image/png' })

    dropFiles(zone, [imageFile])

    expect(onFilesSelected).not.toHaveBeenCalled()
    expect(onRejected).not.toHaveBeenCalled()
  })
})
