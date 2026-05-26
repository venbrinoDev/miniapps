import { describe, it, expect } from 'vitest'
import { MiniAppError, ERROR_MESSAGES } from '../errors.js'

describe('MiniAppError', () => {
  it('creates error with default message', () => {
    const err = new MiniAppError('NO_DEVICE')
    expect(err.code).toBe('NO_DEVICE')
    expect(err.message).toBe(ERROR_MESSAGES.NO_DEVICE)
    expect(err.name).toBe('MiniAppError')
  })

  it('creates error with custom message', () => {
    const err = new MiniAppError('TIMEOUT', 'Custom timeout')
    expect(err.code).toBe('TIMEOUT')
    expect(err.message).toBe('Custom timeout')
  })

  it('creates error with requestId', () => {
    const err = new MiniAppError('HOST_ERROR', undefined, 'req-123')
    expect(err.requestId).toBe('req-123')
  })

  it('serializes to JSON', () => {
    const err = new MiniAppError('USER_DENIED', 'Denied by user', 'req-456')
    const json = err.toJSON()
    expect(json.code).toBe('USER_DENIED')
    expect(json.message).toBe('Denied by user')
    expect(json.requestId).toBe('req-456')
  })

  it('has all error codes defined', () => {
    const codes = [
      'NO_DEVICE',
      'NOT_PAIRED',
      'CAPABILITY_UNAVAILABLE',
      'MANIFEST_VIOLATION',
      'USER_DENIED',
      'TIMEOUT',
      'HOST_ERROR',
    ]
    for (const code of codes) {
      expect(ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]).toBeDefined()
    }
  })
})
