import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter a valid email address')
    .max(254, 'Email must be 254 characters or fewer')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be 5000 characters or fewer'),
  turnstileToken: z.string().min(1, 'Verification failed. Please try again.'),
})

export type ContactInput = z.infer<typeof contactSchema>

/** Maps the first issue per field to its message. Uses `issues`, stable across Zod majors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
