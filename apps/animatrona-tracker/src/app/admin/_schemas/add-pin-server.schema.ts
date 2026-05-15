import { z } from 'zod/v4'

/** Схема формы добавления пин-сервера */
export const AddPinServerSchema = z
  .object({
    /** Название сервера */
    name: z
      .string()
      .min(1, 'Обязательное поле')
      .meta({ ui: { title: 'Название', placeholder: 'kubo-s1' } }),
    /** URL API сервера */
    apiUrl: z
      .string()
      .min(1, 'Обязательное поле')
      .url('Некорректный URL')
      .meta({ ui: { title: 'API URL', placeholder: 'http://localhost:5001' } }),
    /** Peer ID (необязательно) */
    peerId: z
      .string()
      .optional()
      .default('')
      .meta({ ui: { title: 'Peer ID', placeholder: '12D3KooW...' } }),
    /** Auth Token (необязательно) */
    authSecret: z
      .string()
      .optional()
      .default('')
      .meta({ ui: { title: 'Auth Token', placeholder: 'Bearer-токен для Kubo API' } }),
    /** Ёмкость в GB (необязательно) */
    capacityGb: z
      .number()
      .min(0)
      .optional()
      .meta({ ui: { title: 'Ёмкость (GB)', placeholder: '100' } }),
  })
  .strip()
