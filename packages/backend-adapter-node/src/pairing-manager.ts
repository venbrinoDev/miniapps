import type { CapabilityId } from '@miniapps/protocol'

export interface PairingRecord {
  sessionId: string
  userId: string
  deviceId: string
  clientSocketId: string
  hostSocketId: string
  capabilities: CapabilityId[]
  pairedAt: Date
}

export class PairingManager {
  private pairings = new Map<string, PairingRecord>()

  set(pairing: PairingRecord): void {
    this.pairings.set(pairing.sessionId, pairing)
  }

  getBySessionId(sessionId: string): PairingRecord | undefined {
    return this.pairings.get(sessionId)
  }

  getByClientSocketId(clientSocketId: string): PairingRecord | undefined {
    return [...this.pairings.values()].find((pairing) => pairing.clientSocketId === clientSocketId)
  }

  getAllByHostSocketId(hostSocketId: string): PairingRecord[] {
    return [...this.pairings.values()].filter((pairing) => pairing.hostSocketId === hostSocketId)
  }

  deleteBySessionId(sessionId: string): PairingRecord | undefined {
    const pairing = this.pairings.get(sessionId)
    if (pairing) {
      this.pairings.delete(sessionId)
    }
    return pairing
  }

  deleteByClientSocketId(clientSocketId: string): PairingRecord | undefined {
    const pairing = this.getByClientSocketId(clientSocketId)
    return pairing ? this.deleteBySessionId(pairing.sessionId) : undefined
  }

  deleteByHostSocketId(hostSocketId: string): PairingRecord[] {
    const removed = this.getAllByHostSocketId(hostSocketId)
    for (const pairing of removed) {
      this.pairings.delete(pairing.sessionId)
    }
    return removed
  }

  updateCapabilities(hostSocketId: string, capabilities: CapabilityId[]): PairingRecord[] {
    const updated: PairingRecord[] = []
    for (const pairing of this.pairings.values()) {
      if (pairing.hostSocketId !== hostSocketId) {
        continue
      }
      pairing.capabilities = capabilities
      updated.push({ ...pairing, capabilities: [...capabilities] })
    }
    return updated
  }
}
