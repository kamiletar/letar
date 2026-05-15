import { getSession } from '@/lib/auth'
import { autoDetectMapping, getFieldsForType, type ImportDataType, parseExcelFile } from '@/lib/excel'
import { NextResponse } from 'next/server'

// POST /api/import/parse
// Body: FormData с file и type
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const dataType = formData.get('type') as ImportDataType | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 })
    }

    if (!dataType || !['students', 'instructors'].includes(dataType)) {
      return NextResponse.json(
        { error: 'Некорректный тип данных. Допустимые значения: students, instructors' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
    ]

    const validExtensions = ['.xlsx', '.xls', '.csv', '.ods']
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат файла. Загрузите файл .xlsx, .ods или .csv' },
        { status: 400 }
      )
    }

    // Читаем файл
    const buffer = await file.arrayBuffer()

    // Парсим заголовки
    const { headers, rows } = parseExcelFile(buffer)

    if (headers.length === 0) {
      return NextResponse.json({ error: 'Файл пустой или не содержит заголовков' }, { status: 400 })
    }

    // Автоопределяем маппинг
    const suggestedMapping = autoDetectMapping(headers, dataType)

    // Получаем поля системы
    const systemFields = getFieldsForType(dataType)

    return NextResponse.json({
      success: true,
      headers,
      rowCount: rows.length,
      suggestedMapping,
      systemFields,
      // Возвращаем первые 5 строк для предпросмотра
      preview: rows.slice(0, 5),
    })
  } catch (error) {
    console.error('Ошибка парсинга файла:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка чтения файла' }, { status: 500 })
  }
}
