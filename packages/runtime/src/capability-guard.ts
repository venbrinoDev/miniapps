import type { CapabilityId } from '@miniapps/protocol'
import { MiniAppError } from '@miniapps/protocol'
import type { MiniAppManifest } from '@miniapps/manifest'
import { assertCapabilityAllowed } from '@miniapps/manifest'

export class CapabilityGuard {
  constructor(private manifest: MiniAppManifest) {}

  check(capability: CapabilityId): void {
    assertCapabilityAllowed(this.manifest, capability)
  }

  checkHostCapability(capability: CapabilityId, hostCapabilities: CapabilityId[]): void {
    this.check(capability)
    if (!hostCapabilities.includes(capability)) {
      throw new MiniAppError(
        'CAPABILITY_UNAVAILABLE',
        `Host does not support capability "${capability}"`,
      )
    }
  }
}
