import type { CapabilityId } from '@miniapps/protocol'
import { MiniAppError } from '@miniapps/protocol'
import type { MiniAppManifest } from './schema.js'
import { manifestSchema, capabilityIdSchema } from './schema.js'

type NormalizedRuntime = Exclude<MiniAppManifest['runtime'], 'node'>

interface NormalizedMiniAppManifest extends Omit<MiniAppManifest, 'runtime'> {
  runtime: NormalizedRuntime
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  manifest?: MiniAppManifest
}

export function validateManifest(data: unknown): ValidationResult {
  const result = manifestSchema.safeParse(data)

  if (result.success) {
    const manifest = normalizeManifestCapabilities(result.data)
    const effectiveCapabilities = manifest.requiredCapabilities
    const permissionCapabilities = Object.keys(manifest.permissions)
    const missingPermissions = effectiveCapabilities.filter(
      (cap) => !permissionCapabilities.includes(cap),
    )

    if (missingPermissions.length > 0) {
      return {
        valid: false,
        errors: missingPermissions.map(
          (cap) => `Capability "${cap}" is in requiredCapabilities but has no permission entry`,
        ),
      }
    }

    const extraPermissions = permissionCapabilities.filter(
      (cap) => !effectiveCapabilities.includes(cap as CapabilityId),
    )

    if (extraPermissions.length > 0) {
      return {
        valid: false,
        errors: extraPermissions.map(
          (cap) => `Permission "${cap}" is declared but capability is not in requiredCapabilities`,
        ),
      }
    }

    const providerProxyProviders = manifest.runtime?.providerProxy?.providers ?? []
    if (providerProxyProviders.length > 0 && !effectiveCapabilities.includes('providerProxy.call')) {
      return {
        valid: false,
        errors: ['runtime.providerProxy.providers requires capability "providerProxy.call"'],
      }
    }

    return { valid: true, errors: [], manifest }
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    }),
  }
}

export function assertCapabilityAllowed(manifest: MiniAppManifest, capability: CapabilityId): void {
  const normalized = normalizeManifestCapabilities(manifest)
  if (!normalized.requiredCapabilities.includes(capability)) {
    throw new MiniAppError(
      'MANIFEST_VIOLATION',
      `Capability "${capability}" is not declared in the mini-app manifest "${manifest.id}"`,
    )
  }
}

function normalizeManifestCapabilities(manifest: MiniAppManifest): NormalizedMiniAppManifest {
  const runtimeConfig = normalizeRuntime(manifest.runtime)
  const runtimeCapabilities = runtimeConfig?.capabilities ?? []
  const capabilities = runtimeCapabilities.length > 0
    ? runtimeCapabilities
    : manifest.requiredCapabilities
  return {
    ...manifest,
    requiredCapabilities: capabilities,
    runtime: {
      ...runtimeConfig,
      capabilities,
    },
  }
}

function normalizeRuntime(
  runtime: MiniAppManifest['runtime'],
): NormalizedRuntime {
  if (!runtime || runtime === 'node') {
    return { engine: 'node', capabilities: [] }
  }
  return runtime
}
