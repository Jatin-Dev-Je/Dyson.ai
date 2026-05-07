import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/infra/secret-box.js'

describe('secret-box', () => {
  it('encrypts and decrypts connector secrets', () => {
    const encrypted = encryptSecret('xoxb-test-token')

    expect(encrypted).not.toBe('xoxb-test-token')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    expect(decryptSecret(encrypted)).toBe('xoxb-test-token')
  })

  it('does not double-encrypt an already encrypted secret', () => {
    const encrypted = encryptSecret('github-installation-token')

    expect(encryptSecret(encrypted)).toBe(encrypted)
  })

  it('returns legacy plaintext values for backwards-compatible reads', () => {
    expect(decryptSecret('legacy-token')).toBe('legacy-token')
  })
})
