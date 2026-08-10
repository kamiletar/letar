import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldFileUpload } from './field-file-upload'

function makeFile(name: string, content = 'content'): File {
  return new File([content], name, { type: 'text/plain' })
}

describe('FieldFileUpload (shadcn)', () => {
  it('button-вариант показывает кнопку с текстом', () => {
    render(
      <TestForm defaultValues={{ file: [] }}>
        <FieldFileUpload name="file" label="Файл" buttonText="Выбрать" />
      </TestForm>,
    )

    expect(screen.getByRole('button', { name: /выбрать/i })).toBeInTheDocument()
  })

  it('выбор файла через скрытый input показывает его в списке', () => {
    render(
      <TestForm defaultValues={{ file: [] }}>
        <FieldFileUpload name="file" label="Файл" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('report.txt')] } })

    expect(screen.getByText('report.txt')).toBeInTheDocument()
  })

  it('dropzone-вариант показывает подпись зоны', () => {
    render(
      <TestForm defaultValues={{ file: [] }}>
        <FieldFileUpload name="file" label="Файл" variant="dropzone" dropzoneLabel="Кинь сюда" />
      </TestForm>,
    )

    expect(screen.getByText('Кинь сюда')).toBeInTheDocument()
  })

  it('clearable=false скрывает кнопку удаления файла', () => {
    render(
      <TestForm defaultValues={{ file: [] }}>
        <FieldFileUpload name="file" label="Файл" clearable={false} />
      </TestForm>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('report.txt')] } })

    expect(screen.queryByRole('button', { name: /удалить report.txt/i })).not.toBeInTheDocument()
  })

  it('клик по кнопке удаления убирает файл из списка', () => {
    render(
      <TestForm defaultValues={{ file: [] }}>
        <FieldFileUpload name="file" label="Файл" />
      </TestForm>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('report.txt')] } })
    expect(screen.getByText('report.txt')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /удалить report.txt/i }))
    expect(screen.queryByText('report.txt')).not.toBeInTheDocument()
  })
})
