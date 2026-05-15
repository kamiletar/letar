import { z } from 'zod/v4'

// Типы услуг (NativeSelect требует title)
export const serviceTypeOptions = [
  { value: 'architecture', title: 'Архитектура' },
  { value: 'code-review', title: 'Код-ревью' },
  { value: 'audit', title: 'Технический аудит' },
  { value: 'mentoring', title: 'Менторинг' },
]

// Типы проектов (NativeSelect требует title)
export const projectTypeOptions = [
  { value: 'web', title: 'Web-приложение' },
  { value: 'mobile', title: 'Мобильное приложение' },
  { value: 'desktop', title: 'Desktop-приложение' },
  { value: 'other', title: 'Другое' },
]

// Бюджет
export const budgetOptions = [
  { value: 'under-1k', title: 'До $1,000' },
  { value: '1k-5k', title: '$1,000 - $5,000' },
  { value: '5k-10k', title: '$5,000 - $10,000' },
  { value: 'over-10k', title: 'Более $10,000' },
  { value: 'discuss', title: 'Обсудим' },
]

// Сроки
export const timelineOptions = [
  { value: 'asap', title: 'Как можно скорее' },
  { value: '1-week', title: 'В течение недели' },
  { value: '1-month', title: 'В течение месяца' },
  { value: 'flexible', title: 'Гибкие сроки' },
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
