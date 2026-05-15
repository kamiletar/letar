/**
 * Health check endpoint
 * Используется для проверки работоспособности сервиса
 */
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
