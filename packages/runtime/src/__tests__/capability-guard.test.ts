import { describe, it, expect } from 'vitest'
import { CapabilityGuard } from '../capability-guard.js'
import type { MiniAppManifest } from '@miniapps/manifest'

describe('CapabilityGuard', () => {
  const manifest: MiniAppManifest = {
    id: 'test-app',
    name: 'Test',
    version: '1.0.0',
    runtime: 'node',
    entry: 'src/index.ts',
    requiredCapabilities: ['biometric.authenticate', 'camera.scanQr'],
    permissions: {
      'biometric.authenticate': { reason: 'Auth' },
      'camera.scanQr': { reason: 'Scan' },
    },
  }

  it('passes for declared capability', () => {
    const guard = new CapabilityGuard(manifest)
    expect(() => guard.check('biometric.authenticate')).not.toThrow()
  })

  it('throws MANIFEST_VIOLATION for undeclared capability', () => {
    const guard = new CapabilityGuard(manifest)
    try {
      guard.check('gps.getCurrentPosition')
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe('MANIFEST_VIOLATION')
    }
  })

  it('checkHostCapability passes when host supports capability', () => {
    const guard = new CapabilityGuard(manifest)
    expect(() =>
      guard.checkHostCapability('biometric.authenticate', ['biometric.authenticate', 'camera.scanQr']),
    ).not.toThrow()
  })

  it('checkHostCapability throws CAPABILITY_UNAVAILABLE when host lacks capability', () => {
    const guard = new CapabilityGuard(manifest)
    try {
      guard.checkHostCapability('biometric.authenticate', ['camera.scanQr'])
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe('CAPABILITY_UNAVAILABLE')
    }
  })

  it('checkHostCapability throws MANIFEST_VIOLATION before checking host', () => {
    const guard = new CapabilityGuard(manifest)
    try {
      guard.checkHostCapability('storage.pickFile', ['storage.pickFile'])
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).toBe('MANIFEST_VIOLATION')
    }
  })
})
