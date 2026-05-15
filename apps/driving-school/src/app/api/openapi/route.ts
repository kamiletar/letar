import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/generated/openapi.yaml')
    const fileContents = fs.readFileSync(filePath, 'utf8')

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600', // Кэшируем на 1 час
      },
    })
  } catch (error) {
    console.error('Error reading OpenAPI spec:', error)
    return NextResponse.json({ error: 'OpenAPI specification not found' }, { status: 404 })
  }
}
