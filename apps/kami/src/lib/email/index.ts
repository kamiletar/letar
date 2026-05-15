/**
 * Email сервис для Kami
 *
 * Бизнес-уведомления для заявок на найм и консалтинг.
 * Аутентификационные письма отправляются через @letar/email напрямую.
 */

export {
  sendConsultingRequestNotification,
  sendHireRequestNotification,
  type ConsultingRequestEmailData,
  type HireRequestEmailData,
} from './email-service'
