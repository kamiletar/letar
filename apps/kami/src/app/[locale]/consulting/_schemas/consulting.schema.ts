import { z } from 'zod/v4'

// Типы услуг
export const serviceTypeOptions = [
  { value: 'architecture', label: 'Архитектура' },
  { value: 'code-review', label: 'Код-ревью' },
  { value: 'audit', label: 'Технический аудит' },
  { value: 'mentoring', label: 'Менторинг' },
]

// Типы проектов
export const projectTypeOptions = [
  { value: 'web', label: 'Web-приложение' },
  { value: 'mobile', label: 'Мобильное приложение' },
  { value: 'desktop', label: 'Desktop-приложение' },
  { value: 'other', label: 'Другое' },
]

// Бюджет
export const budgetOptions = [
  { value: 'under-1k', label: 'До $1,000' },
  { value: '1k-5k', label: '$1,000 - $5,000' },
  { value: '5k-10k', label: '$5,000 - $10,000' },
  { value: 'over-10k', label: 'Более $10,000' },
  { value: 'discuss', label: 'Обсудим' },
]

// Сроки
export const timelineOptions = [
  { value: 'asap', label: 'Как можно скорее' },
  { value: '1-week', label: 'В течение недели' },
  { value: '1-month', label: 'В течение месяца' },
  { value: 'flexible', label: 'Гибкие сроки' },
]

// Zod схема формы заявки на консультацию
export const ConsultingRequestSchema = z
  .object({
    // Контактные данные
    name: z.string().min(2, 'Минимум 2 символа'),
    email: z.string().email('Введите корректный email'),
    telegram: z.string().optional(),
    company: z.string().optional(),

    // Детали запроса
    serviceType: z.string().optional(),
    projectType: z.string().optional(),
    description: z.string().min(10, 'Опишите вашу задачу подробнее'),
    budget: z.string().optional(),
    timeline: z.string().optional(),

    // Предпочтительное время (ISO string)
    preferredTime: z.string().optional(),
  })
  .strip()

export type ConsultingRequestData = z.infer<typeof ConsultingRequestSchema>

// Дефолтные значения
export const defaultConsultingRequestValues: ConsultingRequestData = {
  name: '',
  email: '',
  telegram: '',
  company: '',
  serviceType: '',
  projectType: '',
  description: '',
  budget: '',
  timeline: '',
  preferredTime: '',
}
