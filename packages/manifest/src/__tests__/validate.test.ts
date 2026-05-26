import { describe, it, expect } from 'vitest'
import { validateManifest, assertCapabilityAllowed } from '../validate.js'

describe('validateManifest', () => {
  const validManifest = {
    id: 'test-app',
    name: 'Test App',
    version: '1.0.0',
    runtime: 'node',
    entry: 'src/index.ts',
    requiredCapabilities: ['biometric.authenticate', 'camera.scanQr'],
    permissions: {
      'biometric.authenticate': { reason: 'Verify identity' },
      'camera.scanQr': { reason: 'Scan QR code' },
    },
  }

  it('accepts a valid manifest', () => {
    const result = validateManifest(validManifest)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.manifest).toBeDefined()
    expect(result.manifest!.id).toBe('test-app')
  })

  it('rejects missing id', () => {
    const result = validateManifest({ ...validManifest, id: undefined })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects empty id', () => {
    const result = validateManifest({ ...validManifest, id: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid id format', () => {
    const result = validateManifest({ ...validManifest, id: 'INVALID_ID!' })
    expect(result.valid).toBe(false)
  })

  it('rejects missing name', () => {
    const result = validateManifest({ ...validManifest, name: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid version format', () => {
    const result = validateManifest({ ...validManifest, version: '1.0' })
    expect(result.valid).toBe(false)
  })

  it('accepts valid semver', () => {
    const result = validateManifest({ ...validManifest, version: '2.3.14' })
    expect(result.valid).toBe(true)
  })

  it('rejects missing entry', () => {
    const result = validateManifest({ ...validManifest, entry: '' })
    expect(result.valid).toBe(false)
  })

  it('accepts empty requiredCapabilities', () => {
    const result = validateManifest({ ...validManifest, requiredCapabilities: [], permissions: {} })
    expect(result.valid).toBe(true)
  })

  it('rejects unknown capability', () => {
    const result = validateManifest({
      ...validManifest,
      requiredCapabilities: ['biometric.authenticate', 'bluetooth.scan'],
    })
    expect(result.valid).toBe(false)
  })

  it('rejects capability in requiredCapabilities but not in permissions', () => {
    const result = validateManifest({
      ...validManifest,
      requiredCapabilities: ['biometric.authenticate', 'camera.scanQr', 'gps.getCurrentPosition'],
      permissions: {
        'biometric.authenticate': { reason: 'Verify identity' },
        'camera.scanQr': { reason: 'Scan QR' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('gps.getCurrentPosition')
  })

  it('rejects permission without corresponding requiredCapability', () => {
    const result = validateManifest({
      ...validManifest,
      permissions: {
        'biometric.authenticate': { reason: 'Verify identity' },
        'camera.scanQr': { reason: 'Scan QR' },
        'gps.getCurrentPosition': { reason: 'Get location' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('gps.getCurrentPosition')
    expect(result.errors[0]).toContain('not in requiredCapabilities')
  })

  it('rejects permission with empty reason', () => {
    const result = validateManifest({
      ...validManifest,
      permissions: {
        'biometric.authenticate': { reason: '' },
        'camera.scanQr': { reason: 'Scan QR' },
      },
    })
    expect(result.valid).toBe(false)
  })

  it('accepts optional timeout', () => {
    const result = validateManifest({ ...validManifest, timeout: 5000 })
    expect(result.valid).toBe(true)
    expect(result.manifest!.timeout).toBe(5000)
  })

  it('defaults runtime to node', () => {
    const result = validateManifest(validManifest)
    expect(result.valid).toBe(true)
    expect(result.manifest!.runtime).toBe('node')
  })

  it('accepts manifests without permissions when no capabilities are declared', () => {
    const result = validateManifest({
      ...validManifest,
      requiredCapabilities: [],
      permissions: {},
    })
    expect(result.valid).toBe(true)
  })
})

describe('assertCapabilityAllowed', () => {
  const manifest = {
    id: 'test-app',
    name: 'Test',
    version: '1.0.0',
    runtime: 'node' as const,
    entry: 'src/index.ts',
    requiredCapabilities: ['biometric.authenticate'] as const,
    permissions: {
      'biometric.authenticate': { reason: 'Auth' },
    },
  }

  it('does not throw for declared capability', () => {
    expect(() => assertCapabilityAllowed(manifest as any, 'biometric.authenticate')).not.toThrow()
  })

  it('throws MANIFEST_VIOLATION for undeclared capability', () => {
    try {
      assertCapabilityAllowed(manifest as any, 'camera.scanQr')
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe('MANIFEST_VIOLATION')
    }
  })
})
