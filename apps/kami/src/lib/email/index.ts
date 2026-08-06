/**
 * Email сервис для Kami
 *
 * Бизнес-уведомления для заявок на найм и консалтинг.
 * Аутентификационные письма отправляются через @letar/email напрямую.
 */

export {
  type ConsultingRequestEmailData,
  type HireRequestEmailData,
  sendConsultingRequestNotification,
  sendHireRequestNotification,
} from './email-service'
