import { createHash } from 'node:crypto'

export function hashIp(ip: string, salt: string): string {
  if (!salt) throw new Error('IP_HASH_SALT is not set')
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
