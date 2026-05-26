import type { CapabilityId } from '@miniapps/protocol'
import { MiniAppError } from '@miniapps/protocol'
import type { MiniAppManifest } from './schema.js'
import { manifestSchema } from './schema.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  manifest?: MiniAppManifest
}

export function validateManifest(data: unknown): ValidationResult {
  const result = manifestSchema.safeParse(data)

  if (result.success) {
    const manifest = result.data
    const permissionCapabilities = Object.keys(manifest.permissions)
    const missingPermissions = manifest.requiredCapabilities.filter(
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
      (cap) => !manifest.requiredCapabilities.includes(cap as any),
    )

    if (extraPermissions.length > 0) {
      return {
        valid: false,
        errors: extraPermissions.map(
          (cap) => `Permission "${cap}" is declared but capability is not in requiredCapabilities`,
        ),
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
  if (!manifest.requiredCapabilities.includes(capability)) {
    throw new MiniAppError(
      'MANIFEST_VIOLATION',
      `Capability "${capability}" is not declared in the mini-app manifest`,
    )
  }
}
