import { z } from 'zod/v4'

/**
 * Schema для формы входа в Dashboard
 */
export const SignInSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strip()

export type SignInFormData = z.infer<typeof SignInSchema>
