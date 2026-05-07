import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from '@/config/env.js'

const SECRET_PREFIX = 'enc:v1:'
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16
const KEY_BYTES = 32

function decodeConfiguredKey(raw: string): Buffer {
  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length === KEY_BYTES) {
    return decoded
  }

  throw new Error('CONNECTOR_TOKEN_ENCRYPTION_KEY must be 32 bytes as base64 or 64 hex chars')
}

function getEncryptionKey(): Buffer {
  if (env.CONNECTOR_TOKEN_ENCRYPTION_KEY) {
    return decodeConfiguredKey(env.CONNECTOR_TOKEN_ENCRYPTION_KEY)
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('CONNECTOR_TOKEN_ENCRYPTION_KEY is required in production')
  }

  return createHash('sha256')
    .update(`${env.JWT_SECRET}:connector-token-encryption`)
    .digest()
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(SECRET_PREFIX)
}

export function encryptSecret(plaintext: string): string {
  if (isEncryptedSecret(plaintext)) return plaintext

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  })
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${SECRET_PREFIX}${[
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')}`
}

export function decryptSecret(storedValue: string): string {
  if (!isEncryptedSecret(storedValue)) {
    return storedValue
  }

  const encryptedPayload = storedValue.slice(SECRET_PREFIX.length)
  const [ivText, authTagText, ciphertextText] = encryptedPayload.split(':')
  if (!ivText || !authTagText || !ciphertextText) {
    throw new Error('Encrypted secret payload is malformed')
  }

  const iv = Buffer.from(ivText, 'base64url')
  const authTag = Buffer.from(authTagText, 'base64url')
  const ciphertext = Buffer.from(ciphertextText, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  })

  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
