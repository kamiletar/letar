/**
 * Ключи браузерного хранилища — общие для полного квиза и экспресса.
 * Экспресс передаёт результат в аккаунт через тот же PENDING_QUIZ_KEY, что читает
 * QuizContainer на главной: после входа сервер пересчитывает баллы из ответов.
 */

/** sessionStorage: отложенный сабмит ответов после логина (квиз и экспресс) */
export const PENDING_QUIZ_KEY = 'quiz_pending'

/** localStorage: гостевой результат экспресса (баллы + ответы, без отправки на сервер) */
export const EXPRESS_RESULT_KEY = 'archetest_express_result'
