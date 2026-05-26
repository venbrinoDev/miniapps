import type { CapabilityId } from '@miniapps/protocol'

export interface HostEntry {
  socketId: string
  deviceId: string
  userId: string
  capabilities: CapabilityId[]
  connectedAt: Date
}

export class HostRegistry {
  private hosts = new Map<string, HostEntry>()
  private deviceToSocket = new Map<string, string>()

  register(entry: HostEntry): void {
    const previousSocketId = this.deviceToSocket.get(entry.deviceId)
    if (previousSocketId && previousSocketId !== entry.socketId) {
      this.hosts.delete(previousSocketId)
    }
    this.hosts.set(entry.socketId, entry)
    this.deviceToSocket.set(entry.deviceId, entry.socketId)
  }

  unregister(socketId: string): void {
    const host = this.hosts.get(socketId)
    if (host) {
      this.deviceToSocket.delete(host.deviceId)
    }
    this.hosts.delete(socketId)
  }

  getBySocketId(socketId: string): HostEntry | undefined {
    return this.hosts.get(socketId)
  }

  getByDeviceId(deviceId: string): HostEntry | undefined {
    const socketId = this.deviceToSocket.get(deviceId)
    return socketId ? this.hosts.get(socketId) : undefined
  }

  updateCapabilities(socketId: string, capabilities: CapabilityId[]): void {
    const host = this.hosts.get(socketId)
    if (host) {
      host.capabilities = capabilities
    }
  }

  getAll(): HostEntry[] {
    return [...this.hosts.values()]
  }

  getAllByUserId(userId: string): HostEntry[] {
    return this.getAll()
      .filter((host) => host.userId === userId)
      .sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime())
  }
}
