import { randomBytes } from 'crypto'

export function generateId() {
  return randomBytes(8).toString('hex')
}

export function generateToken() {
  return randomBytes(16).toString('hex')
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}
