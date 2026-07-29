const TOKEN_ENV = 'SYNTH_MENTOR_TOKEN'

/**
 * Локальный инструмент одного пользователя: если токен не задан в окружении — считаем,
 * что сервер работает в доверенном dev-контуре, и не требуем заголовок (иначе локальная
 * разработка ломается на пустом месте). На публичном деплое студии стоит задать
 * SYNTH_MENTOR_TOKEN, чтобы канал команд ментора не был открытой дверью для чужих
 * визитёров витрины — иначе кто угодно может слать highlight_param/load_patch в чужую сессию.
 */
export function isAuthorizedMentorRequest(request: Request): boolean {
  const expected = process.env[TOKEN_ENV]
  if (!expected) {
    return true
  }
  const header = request.headers.get('authorization')
  return header === `Bearer ${expected}`
}
