import { getSession } from '@/lib/auth'
import {
  generateTemplate,
  getTemplateFileName,
  getTemplateMimeType,
  type ImportDataType,
  type TemplateFormat,
} from '@/lib/excel'
import { NextResponse } from 'next/server'

// GET /api/import/template?type=students|instructors&format=xlsx|ods
export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') as ImportDataType | null
    const format = (searchParams.get('format') || 'xlsx') as TemplateFormat

    if (!dataType || !['students', 'instructors'].includes(dataType)) {
      return NextResponse.json(
        { error: 'Некорректный тип данных. Допустимые значения: students, instructors' },
        { status: 400 }
      )
    }

    if (!['xlsx', 'ods'].includes(format)) {
      return NextResponse.json({ error: 'Некорректный формат. Допустимые значения: xlsx, ods' }, { status: 400 })
    }

    // Генерируем шаблон
    const buffer = generateTemplate(dataType, format)
    const fileName = getTemplateFileName(dataType, format)
    const mimeType = getTemplateMimeType(format)

    // Возвращаем файл
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('Ошибка генерации шаблона:', error)
    return NextResponse.json({ error: 'Ошибка генерации шаблона' }, { status: 500 })
  }
}
